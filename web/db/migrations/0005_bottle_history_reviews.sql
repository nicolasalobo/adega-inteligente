alter table public.bottles
  add column removal_reason text;
alter table public.bottles add constraint bottles_id_cellar_id_unique unique (id, cellar_id);

create table public.bottle_movements (
  id uuid primary key default gen_random_uuid(),
  cellar_id uuid not null references public.cellars(id) on delete cascade,
  bottle_id uuid not null,
  movement_type text not null check (movement_type in ('move', 'remove')),
  from_shelf_id uuid,
  from_row integer,
  from_column integer,
  to_shelf_id uuid,
  to_row integer,
  to_column integer,
  reason text,
  actor_id uuid not null references neon_auth."user"(id),
  created_at timestamptz not null default now(),
  foreign key (bottle_id, cellar_id) references public.bottles(id, cellar_id) on delete cascade,
  check ((movement_type = 'move' and to_shelf_id is not null and to_row is not null and to_column is not null)
      or (movement_type = 'remove' and to_shelf_id is null and to_row is null and to_column is null))
);

create index bottle_movements_cellar_created_idx on public.bottle_movements(cellar_id, created_at desc);
create index bottle_movements_bottle_created_idx on public.bottle_movements(bottle_id, created_at desc);

alter table public.bottle_movements enable row level security;
create policy "Owners read bottle movements" on public.bottle_movements for select to authenticated
  using (exists (select 1 from public.cellars c where c.id = cellar_id and c.owner_id = (select auth.uid())));
grant select on public.bottle_movements to authenticated;

create table public.bottle_reviews (
  id uuid primary key default gen_random_uuid(),
  cellar_id uuid not null references public.cellars(id) on delete cascade,
  bottle_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bottle_id, cellar_id) references public.bottles(id, cellar_id) on delete cascade,
  constraint bottle_reviews_one_per_bottle unique (bottle_id)
);

alter table public.bottle_reviews enable row level security;
create policy "Owners manage bottle reviews" on public.bottle_reviews for all to authenticated
  using (exists (select 1 from public.cellars c where c.id = cellar_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cellars c where c.id = cellar_id and c.owner_id = (select auth.uid())));
grant select, insert, update on public.bottle_reviews to authenticated;

create or replace function public.move_bottle(p_cellar_id uuid, p_bottle_id uuid, p_shelf_id uuid, p_row integer, p_column integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_bottle public.bottles%rowtype;
begin
  if v_user_id is null or not exists (select 1 from public.cellars c where c.id=p_cellar_id and c.owner_id=v_user_id) then
    raise exception 'Cellar not found for this user' using errcode='42501';
  end if;
  select * into v_bottle from public.bottles where id=p_bottle_id and cellar_id=p_cellar_id and status='active' for update;
  if not found then raise exception 'Active bottle not found' using errcode='23503'; end if;
  update public.bottles set shelf_id=p_shelf_id, row_number=p_row, column_number=p_column
    where id=p_bottle_id and cellar_id=p_cellar_id;
  insert into public.bottle_movements(cellar_id,bottle_id,movement_type,from_shelf_id,from_row,from_column,to_shelf_id,to_row,to_column,actor_id)
    values(p_cellar_id,p_bottle_id,'move',v_bottle.shelf_id,v_bottle.row_number,v_bottle.column_number,p_shelf_id,p_row,p_column,v_user_id);
end $$;

create or replace function public.remove_bottle(p_cellar_id uuid, p_bottle_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_bottle public.bottles%rowtype;
begin
  if v_user_id is null or not exists (select 1 from public.cellars c where c.id=p_cellar_id and c.owner_id=v_user_id) then
    raise exception 'Cellar not found for this user' using errcode='42501';
  end if;
  select * into v_bottle from public.bottles where id=p_bottle_id and cellar_id=p_cellar_id and status='active' for update;
  if not found then raise exception 'Active bottle not found' using errcode='23503'; end if;
  update public.bottles set status='removed', removed_at=now(), removal_reason=nullif(btrim(p_reason),'')
    where id=p_bottle_id and cellar_id=p_cellar_id;
  insert into public.bottle_movements(cellar_id,bottle_id,movement_type,from_shelf_id,from_row,from_column,reason,actor_id)
    values(p_cellar_id,p_bottle_id,'remove',v_bottle.shelf_id,v_bottle.row_number,v_bottle.column_number,nullif(btrim(p_reason),''),v_user_id);
end $$;

revoke all on function public.move_bottle(uuid,uuid,uuid,integer,integer) from public, anonymous;
revoke all on function public.remove_bottle(uuid,uuid,text) from public, anonymous;
grant execute on function public.move_bottle(uuid,uuid,uuid,integer,integer) to authenticated;
grant execute on function public.remove_bottle(uuid,uuid,text) to authenticated;

-- Lock both bottles in a stable order and swap within one transaction. The
-- position trigger validates each destination when a bottle becomes active.
create or replace function public.swap_bottles(p_cellar_id uuid, p_first uuid, p_second uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  a public.bottles%rowtype;
  b public.bottles%rowtype;
begin
  if v_user is null or not exists (select 1 from public.cellars c where c.id=p_cellar_id and c.owner_id=v_user) then
    raise exception 'Cellar not found for this user' using errcode='42501';
  end if;
  if p_first = p_second then raise exception 'Choose two different bottles' using errcode='23514'; end if;
  perform 1 from public.bottles where cellar_id=p_cellar_id and id in (p_first,p_second) order by id for update;
  select * into a from public.bottles where id=p_first and cellar_id=p_cellar_id and status='active';
  if not found then raise exception 'Active bottle not found' using errcode='23503'; end if;
  select * into b from public.bottles where id=p_second and cellar_id=p_cellar_id and status='active';
  if not found then raise exception 'Active bottle not found' using errcode='23503'; end if;
  update public.bottles set status='removed', removed_at=now() where id=a.id;
  update public.bottles set shelf_id=a.shelf_id,row_number=a.row_number,column_number=a.column_number where id=b.id;
  update public.bottles set status='active',removed_at=null,shelf_id=b.shelf_id,row_number=b.row_number,column_number=b.column_number where id=a.id;
  insert into public.bottle_movements(cellar_id,bottle_id,movement_type,from_shelf_id,from_row,from_column,to_shelf_id,to_row,to_column,actor_id)
  values (p_cellar_id,a.id,'move',a.shelf_id,a.row_number,a.column_number,b.shelf_id,b.row_number,b.column_number,v_user),
         (p_cellar_id,b.id,'move',b.shelf_id,b.row_number,b.column_number,a.shelf_id,a.row_number,a.column_number,v_user);
end $$;
revoke all on function public.swap_bottles(uuid,uuid,uuid) from public, anonymous;
grant execute on function public.swap_bottles(uuid,uuid,uuid) to authenticated;
