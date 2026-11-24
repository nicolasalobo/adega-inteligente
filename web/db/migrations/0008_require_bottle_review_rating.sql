-- A review always carries a 1–5 star rating; its written comment remains optional.
-- This fails without changing data if a deployment contains legacy comment-only rows.
alter table public.bottle_reviews
  alter column rating set not null;
