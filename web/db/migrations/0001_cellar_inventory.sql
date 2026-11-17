-- Core manual cellar inventory. Photo recognition and provider integrations are intentionally out of scope.

create table public.cellars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references neon_auth."user" (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  constraint cellars_id_owner_id_unique unique (id, owner_id)
);

create unique index cellars_one_per_owner_idx on public.cellars (owner_id);

create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  cellar_id uuid not null references public.cellars (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  row_count integer not null check (row_count between 1 and 20),
  column_count integer not null check (column_count between 1 and 20),
  organization text not null default 'free' check (organization in ('free', 'structured')),
  rule_criterion text check (rule_criterion in ('country', 'region', 'grape', 'vintage', 'custom')),
  rule_axis text check (rule_axis in ('row', 'column')),
  rule_values text[],
  created_at timestamptz not null default now(),
  constraint shelves_rule_fields_consistent check (
    (organization = 'free' and rule_criterion is null and rule_axis is null and rule_values is null)
    or
    (organization = 'structured' and rule_criterion is not null and rule_axis is not null and rule_values is not null and cardinality(rule_values) > 0)
  ),
  constraint shelves_id_cellar_id_unique unique (id, cellar_id)
);

create index shelves_cellar_id_idx on public.shelves (cellar_id);

create table public.wines (
  id uuid primary key default gen_random_uuid(),
  cellar_id uuid not null references public.cellars (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  producer text not null check (length(btrim(producer)) > 0),
  vintage text,
  country text,
  region text,
  grapes text[] not null default '{}',
  custom_value text,
  name_key text generated always as (lower(btrim(name))) stored,
  producer_key text generated always as (lower(btrim(producer))) stored,
  vintage_key text generated always as (coalesce(vintage, '')) stored,
  created_at timestamptz not null default now(),
  constraint wines_id_cellar_id_unique unique (id, cellar_id),
  constraint wines_identity_per_cellar_unique unique (cellar_id, name_key, producer_key, vintage_key)
);

create table public.bottles (
  id uuid primary key default gen_random_uuid(),
  cellar_id uuid not null references public.cellars (id) on delete cascade,
  wine_id uuid not null,
  shelf_id uuid not null,
  row_number integer not null check (row_number > 0),
  column_number integer not null check (column_number > 0),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint bottles_wine_same_cellar_fkey
    foreign key (wine_id, cellar_id) references public.wines (id, cellar_id) on delete restrict,
  constraint bottles_shelf_same_cellar_fkey
    foreign key (shelf_id, cellar_id) references public.shelves (id, cellar_id) on delete restrict,
  constraint bottles_removed_at_consistent check (
    (status = 'active' and removed_at is null) or (status = 'removed' and removed_at is not null)
  )
);

-- The database, rather than a browser check, arbitrates simultaneous claims for a physical slot.
create unique index bottles_one_active_per_position_idx
  on public.bottles (shelf_id, row_number, column_number)
  where status = 'active';

create index bottles_cellar_status_idx on public.bottles (cellar_id, status);
create index bottles_wine_cellar_idx on public.bottles (wine_id, cellar_id);

create or replace function public.validate_shelf_rule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
begin
  if new.organization = 'structured' then
    expected_count := case new.rule_axis
      when 'row' then new.row_count
      when 'column' then new.column_count
      else 0
    end;

    if new.rule_values is null
      or cardinality(new.rule_values) <> expected_count
      or exists (
        select 1 from unnest(new.rule_values) as rule_value(value)
        where nullif(btrim(rule_value.value), '') is null
      ) then
      raise exception 'Structured shelf rules need one non-empty value per %', new.rule_axis
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger shelves_validate_rule_before_write
  before insert or update on public.shelves
  for each row execute function public.validate_shelf_rule();

create or replace function public.validate_bottle_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shelf_row public.shelves%rowtype;
  wine_row public.wines%rowtype;
  expected_value text;
  actual_value text;
  rule_index integer;
begin
  select * into shelf_row
  from public.shelves
  where id = new.shelf_id and cellar_id = new.cellar_id;

  if not found then
    raise exception 'Shelf does not belong to this cellar' using errcode = '23503';
  end if;

  if new.row_number > shelf_row.row_count or new.column_number > shelf_row.column_count then
    raise exception 'Bottle position is outside the shelf dimensions' using errcode = '23514';
  end if;

  if new.status = 'active' and shelf_row.organization = 'structured' then
    select * into wine_row
    from public.wines
    where id = new.wine_id and cellar_id = new.cellar_id;

    if not found then
      raise exception 'Wine does not belong to this cellar' using errcode = '23503';
    end if;

    rule_index := case shelf_row.rule_axis
      when 'row' then new.row_number
      when 'column' then new.column_number
      else 0
    end;
    expected_value := shelf_row.rule_values[rule_index];

    if shelf_row.rule_criterion = 'grape' then
      if not exists (
        select 1
        from unnest(wine_row.grapes) as wine_grape(value)
        where lower(btrim(wine_grape.value)) = lower(btrim(expected_value))
      ) then
        raise exception 'Wine grape does not match this shelf position' using errcode = '23514';
      end if;
    else
      actual_value := case shelf_row.rule_criterion
        when 'country' then wine_row.country
        when 'region' then wine_row.region
        when 'vintage' then wine_row.vintage
        when 'custom' then wine_row.custom_value
        else null
      end;

      if actual_value is null or lower(btrim(actual_value)) <> lower(btrim(expected_value)) then
        raise exception 'Wine does not match this shelf position rule' using errcode = '23514';
      end if;
    end if;
  end if;

  if new.status = 'removed' and new.removed_at is null then
    new.removed_at := now();
  elsif new.status = 'active' then
    new.removed_at := null;
  end if;

  return new;
end;
$$;

create trigger bottles_validate_position_before_write
  before insert or update on public.bottles
  for each row execute function public.validate_bottle_position();

-- The definer role can resolve auth.uid() from Neon’s managed auth schema.
-- This function validates ownership explicitly before writing any row.
create or replace function public.register_wine_bottles(
  p_cellar_id uuid,
  p_shelf_id uuid,
  p_wine jsonb,
  p_positions jsonb
)
returns table (wine_id uuid, bottle_ids uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_cellar_id uuid;
  shelf_row public.shelves%rowtype;
  name_value text;
  producer_value text;
  vintage_value text;
  country_value text;
  region_value text;
  custom_value text;
  grapes_value text[];
  position_count integer;
  distinct_position_count integer;
  position_payload jsonb;
  registered_wine_id uuid;
  registered_bottle_ids uuid[];
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select c.id into v_cellar_id
  from public.cellars as c
  where c.id = p_cellar_id and c.owner_id = current_user_id;

  if v_cellar_id is null then
    raise exception 'Cellar not found for this user' using errcode = '42501';
  end if;

  select s.* into shelf_row
  from public.shelves as s
  where s.id = p_shelf_id and s.cellar_id = v_cellar_id;

  if not found then
    raise exception 'Shelf not found in this cellar' using errcode = '23503';
  end if;

  if jsonb_typeof(p_wine) <> 'object' or jsonb_typeof(p_positions) <> 'array' then
    raise exception 'Wine must be an object and positions must be an array' using errcode = '22023';
  end if;

  select count(*) into position_count from jsonb_array_elements(p_positions);
  select count(distinct ((position.value ->> 'row') || ':' || (position.value ->> 'column')))
    into distinct_position_count
  from jsonb_array_elements(p_positions) as position(value);

  if position_count < 1 or position_count > 50 or position_count <> distinct_position_count then
    raise exception 'Provide between 1 and 50 distinct positions' using errcode = '22023';
  end if;

  for position_payload in select value from jsonb_array_elements(p_positions)
  loop
    if coalesce((position_payload ->> 'row')::integer, 0) < 1
      or coalesce((position_payload ->> 'row')::integer, 0) > shelf_row.row_count
      or coalesce((position_payload ->> 'column')::integer, 0) < 1
      or coalesce((position_payload ->> 'column')::integer, 0) > shelf_row.column_count then
      raise exception 'Bottle position is outside the shelf dimensions' using errcode = '23514';
    end if;
  end loop;

  name_value := nullif(btrim(p_wine ->> 'name'), '');
  producer_value := nullif(btrim(p_wine ->> 'producer'), '');
  vintage_value := nullif(btrim(p_wine ->> 'vintage'), '');
  country_value := nullif(btrim(p_wine ->> 'country'), '');
  region_value := nullif(btrim(p_wine ->> 'region'), '');
  custom_value := nullif(btrim(p_wine ->> 'custom_value'), '');

  if name_value is null or producer_value is null then
    raise exception 'Wine name and producer are required' using errcode = '23514';
  end if;

  select coalesce(array_agg(distinct btrim(grape.value)), '{}'::text[])
    into grapes_value
  from jsonb_array_elements_text(
    case when jsonb_typeof(p_wine -> 'grapes') = 'array' then p_wine -> 'grapes' else '[]'::jsonb end
  ) as grape(value)
  where length(btrim(grape.value)) > 0;

  insert into public.wines (cellar_id, name, producer, vintage, country, region, grapes, custom_value)
  values (v_cellar_id, name_value, producer_value, vintage_value, country_value, region_value, grapes_value, custom_value)
  on conflict (cellar_id, name_key, producer_key, vintage_key) do nothing
  returning id into registered_wine_id;

  if registered_wine_id is null then
    select w.id into registered_wine_id
    from public.wines as w
    where w.cellar_id = v_cellar_id
      and w.name_key = lower(name_value)
      and w.producer_key = lower(producer_value)
      and w.vintage_key = coalesce(vintage_value, '');
  end if;

  if registered_wine_id is null then
    raise exception 'Could not resolve the wine record' using errcode = '23503';
  end if;

  with inserted_bottles as (
    insert into public.bottles (cellar_id, wine_id, shelf_id, row_number, column_number)
    select
      v_cellar_id,
      registered_wine_id,
      p_shelf_id,
      (position.value ->> 'row')::integer,
      (position.value ->> 'column')::integer
    from jsonb_array_elements(p_positions) as position(value)
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into registered_bottle_ids from inserted_bottles;

  return query select registered_wine_id, registered_bottle_ids;
end;
$$;

revoke all on function public.register_wine_bottles(uuid, uuid, jsonb, jsonb) from public, anonymous;
grant execute on function public.register_wine_bottles(uuid, uuid, jsonb, jsonb) to authenticated;

alter table public.cellars enable row level security;
alter table public.shelves enable row level security;
alter table public.wines enable row level security;
alter table public.bottles enable row level security;

create policy "Owners manage their cellar"
  on public.cellars for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners manage their shelves"
  on public.shelves for all to authenticated
  using (
    exists (
      select 1 from public.cellars
      where public.cellars.id = public.shelves.cellar_id
        and public.cellars.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.cellars
      where public.cellars.id = public.shelves.cellar_id
        and public.cellars.owner_id = (select auth.uid())
    )
  );

create policy "Owners manage their wines"
  on public.wines for all to authenticated
  using (
    exists (
      select 1 from public.cellars
      where public.cellars.id = public.wines.cellar_id
        and public.cellars.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.cellars
      where public.cellars.id = public.wines.cellar_id
        and public.cellars.owner_id = (select auth.uid())
    )
  );

create policy "Owners manage their bottles"
  on public.bottles for all to authenticated
  using (
    exists (
      select 1 from public.cellars
      where public.cellars.id = public.bottles.cellar_id
        and public.cellars.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.cellars
      where public.cellars.id = public.bottles.cellar_id
        and public.cellars.owner_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.cellars, public.shelves, public.wines to authenticated;
grant update (name) on public.cellars to authenticated;
grant select, insert on public.bottles to authenticated;
