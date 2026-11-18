alter table public.bottle_reviews alter column rating drop not null;
alter table public.bottle_reviews add constraint bottle_reviews_has_content check (rating is not null or nullif(btrim(comment), '') is not null);
alter table public.bottles add constraint bottles_removal_reason_length check (removal_reason is null or length(removal_reason) <= 2000);

-- A move to the same position is not a movement and must not create history.
create or replace function public.move_bottle(p_cellar_id uuid, p_bottle_id uuid, p_shelf_id uuid, p_row integer, p_column integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := (select auth.uid()); v_bottle public.bottles%rowtype;
begin
  if v_user_id is null or not exists (select 1 from public.cellars c where c.id=p_cellar_id and c.owner_id=v_user_id) then raise exception 'Cellar not found for this user' using errcode='42501'; end if;
  select * into v_bottle from public.bottles where id=p_bottle_id and cellar_id=p_cellar_id and status='active' for update;
  if not found then raise exception 'Active bottle not found' using errcode='23503'; end if;
  if (v_bottle.shelf_id,v_bottle.row_number,v_bottle.column_number) is not distinct from (p_shelf_id,p_row,p_column) then raise exception 'Destination is the current position' using errcode='23514'; end if;
  update public.bottles set shelf_id=p_shelf_id,row_number=p_row,column_number=p_column where id=p_bottle_id and cellar_id=p_cellar_id;
  insert into public.bottle_movements(cellar_id,bottle_id,movement_type,from_shelf_id,from_row,from_column,to_shelf_id,to_row,to_column,actor_id)
  values(p_cellar_id,p_bottle_id,'move',v_bottle.shelf_id,v_bottle.row_number,v_bottle.column_number,p_shelf_id,p_row,p_column,v_user_id);
end $$;
