-- Keep an atomic exchange distinguishable from a one-bottle move in the audit trail.
alter table public.bottle_movements
  drop constraint bottle_movements_movement_type_check,
  drop constraint bottle_movements_check;

alter table public.bottle_movements
  add constraint bottle_movements_movement_type_check
    check (movement_type in ('move', 'swap', 'remove')),
  add constraint bottle_movements_check
    check (
      (movement_type in ('move', 'swap') and to_shelf_id is not null and to_row is not null and to_column is not null)
      or (movement_type = 'remove' and to_shelf_id is null and to_row is null and to_column is null)
    );

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
  values (p_cellar_id,a.id,'swap',a.shelf_id,a.row_number,a.column_number,b.shelf_id,b.row_number,b.column_number,v_user),
         (p_cellar_id,b.id,'swap',b.shelf_id,b.row_number,b.column_number,a.shelf_id,a.row_number,a.column_number,v_user);
end $$;
