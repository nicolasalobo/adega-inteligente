-- The managed auth schema is not accessible to the authenticated role directly.
-- The RPC's owner check keeps the definer function scoped to the caller's cellar.
alter function public.register_wine_bottles(uuid, uuid, jsonb, jsonb) security definer;
