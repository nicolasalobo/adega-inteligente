-- User-confirmed barcode associations are scoped to a cellar and a wine record.
-- One EAN may resolve to multiple vintages; it is not a vintage identifier.

create or replace function public.is_valid_ean13(p_ean13 text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  idx integer;
  weighted_total integer := 0;
begin
  if p_ean13 is null or p_ean13 !~ '^[0-9]{13}$' then
    return false;
  end if;

  for idx in 1..12 loop
    weighted_total := weighted_total + substring(p_ean13 from idx for 1)::integer
      * case when idx % 2 = 0 then 3 else 1 end;
  end loop;

  return (10 - (weighted_total % 10)) % 10 = substring(p_ean13 from 13 for 1)::integer;
end;
$$;
revoke all on function public.is_valid_ean13(text) from public, anonymous;
grant execute on function public.is_valid_ean13(text) to authenticated;

create table public.wine_barcodes (
  id uuid primary key default gen_random_uuid(),
  cellar_id uuid not null references public.cellars(id) on delete cascade,
  wine_id uuid not null,
  ean13 text not null check (public.is_valid_ean13(ean13)),
  source_provider text not null default 'user'
    check (source_provider in ('user', 'open_food_facts', 'wineapi', 'web')),
  source_url text check (source_url is null or (source_url like 'https://%' and length(source_url) <= 1000)),
  confirmed_by uuid not null references neon_auth."user"(id),
  confirmed_at timestamptz not null default now(),
  constraint wine_barcodes_wine_same_cellar_fkey
    foreign key (wine_id, cellar_id) references public.wines(id, cellar_id) on delete cascade,
  constraint wine_barcodes_per_wine_unique unique (cellar_id, ean13, wine_id)
);

create index wine_barcodes_cellar_ean_idx on public.wine_barcodes(cellar_id, ean13);
alter table public.wine_barcodes enable row level security;
create policy "Owners read barcode associations" on public.wine_barcodes for select to authenticated
  using (exists (
    select 1 from public.cellars c
    where c.id = wine_barcodes.cellar_id and c.owner_id = (select auth.uid())
  ));
revoke all on public.wine_barcodes from public, anonymous;
grant select on public.wine_barcodes to authenticated;

-- The existing register RPC and the barcode link commit or roll back together.
create or replace function public.register_wine_bottles_with_barcode(
  p_cellar_id uuid,
  p_shelf_id uuid,
  p_wine jsonb,
  p_positions jsonb,
  p_ean13 text default null,
  p_source_provider text default 'user',
  p_source_url text default null
)
returns table (wine_id uuid, bottle_ids uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wine_id uuid;
  v_bottle_ids uuid[];
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_ean13 is not null and not public.is_valid_ean13(p_ean13) then
    raise exception 'A valid EAN-13 is required' using errcode = '22023';
  end if;
  if p_source_provider not in ('user', 'open_food_facts', 'wineapi', 'web') then
    raise exception 'Unsupported barcode source' using errcode = '22023';
  end if;
  if p_source_url is not null and (p_source_url !~ '^https://' or length(p_source_url) > 1000) then
    raise exception 'Source URL must be a short HTTPS URL' using errcode = '22023';
  end if;

  select registered.wine_id, registered.bottle_ids
    into v_wine_id, v_bottle_ids
  from public.register_wine_bottles(p_cellar_id, p_shelf_id, p_wine, p_positions) as registered;

  if p_ean13 is not null then
    insert into public.wine_barcodes(cellar_id, wine_id, ean13, source_provider, source_url, confirmed_by)
    values (p_cellar_id, v_wine_id, p_ean13, p_source_provider, p_source_url, v_user_id)
    on conflict on constraint wine_barcodes_per_wine_unique do update
      set source_provider = excluded.source_provider,
          source_url = excluded.source_url,
          confirmed_by = excluded.confirmed_by,
          confirmed_at = now();
  end if;

  return query select v_wine_id, v_bottle_ids;
end;
$$;
revoke all on function public.register_wine_bottles_with_barcode(uuid, uuid, jsonb, jsonb, text, text, text) from public, anonymous;
grant execute on function public.register_wine_bottles_with_barcode(uuid, uuid, jsonb, jsonb, text, text, text) to authenticated;

-- A durable, per-user fixed-window quota prevents repeated requests across instances.
create table public.identification_rate_limits (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  photo_count integer not null default 0 check (photo_count >= 0),
  ai_count integer not null default 0 check (ai_count >= 0)
);
alter table public.identification_rate_limits enable row level security;
revoke all on public.identification_rate_limits from public, anonymous, authenticated;

create or replace function public._consume_identification_quota(p_request_type text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_consumed boolean := false;
begin
  if v_user_id is null then return false; end if;
  if p_request_type not in ('barcode', 'photo', 'ai') then return false; end if;

  insert into public.identification_rate_limits as current_usage
    (user_id, window_started_at, request_count, photo_count, ai_count)
  values (v_user_id, v_now, 1, case when p_request_type = 'photo' then 1 else 0 end, case when p_request_type = 'ai' then 1 else 0 end)
  on conflict (user_id) do update set
    window_started_at = case
      when current_usage.window_started_at <= v_now - interval '1 hour' then v_now
      else current_usage.window_started_at
    end,
    request_count = case
      when current_usage.window_started_at <= v_now - interval '1 hour' then 1
      else current_usage.request_count + 1
    end,
    photo_count = case
      when current_usage.window_started_at <= v_now - interval '1 hour' then case when p_request_type = 'photo' then 1 else 0 end
      else current_usage.photo_count + case when p_request_type = 'photo' then 1 else 0 end
    end,
    ai_count = case
      when current_usage.window_started_at <= v_now - interval '1 hour' then case when p_request_type = 'ai' then 1 else 0 end
      else current_usage.ai_count + case when p_request_type = 'ai' then 1 else 0 end
    end
  where current_usage.window_started_at <= v_now - interval '1 hour'
     or (current_usage.request_count < 30
       and (p_request_type <> 'photo' or current_usage.photo_count < 5)
       and (p_request_type <> 'ai' or current_usage.ai_count < 5))
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$$;
revoke all on function public._consume_identification_quota(text) from public, anonymous, authenticated;

create or replace function public.consume_barcode_identification_quota()
returns boolean language sql security definer set search_path = ''
as $$ select public._consume_identification_quota('barcode'); $$;
create or replace function public.consume_photo_identification_quota()
returns boolean language sql security definer set search_path = ''
as $$ select public._consume_identification_quota('photo'); $$;
create or replace function public.consume_ai_identification_quota()
returns boolean language sql security definer set search_path = ''
as $$ select public._consume_identification_quota('ai'); $$;
revoke all on function public.consume_barcode_identification_quota() from public, anonymous;
revoke all on function public.consume_photo_identification_quota() from public, anonymous;
revoke all on function public.consume_ai_identification_quota() from public, anonymous;
grant execute on function public.consume_barcode_identification_quota() to authenticated;
grant execute on function public.consume_photo_identification_quota() to authenticated;
grant execute on function public.consume_ai_identification_quota() to authenticated;
