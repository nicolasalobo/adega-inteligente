-- Keep the local cellar identifier distinct from the public.cellars.cellar_id column.
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
