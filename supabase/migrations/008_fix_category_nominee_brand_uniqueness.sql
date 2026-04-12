drop index if exists public.idx_category_nominees_unique_brand;

create unique index if not exists idx_category_nominees_unique_brand
on public.category_nominees(category_id, brand_id)
where brand_id is not null and perfume_id is null;
