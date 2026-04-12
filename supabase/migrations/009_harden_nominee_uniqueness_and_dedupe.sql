drop index if exists public.idx_category_nominees_unique_brand;

create unique index idx_category_nominees_unique_brand
on public.category_nominees(category_id, brand_id)
where brand_id is not null and perfume_id is null;

create or replace function public.replace_category_nominees(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(payload) <> 'array' then
    raise exception 'payload must be a json array';
  end if;

  delete from public.category_nominees
  where category_id is not null;

  insert into public.category_nominees (category_id, brand_id, perfume_id, sort_label)
  with typed_entries as (
    select
      entry.category_id,
      entry.brand_id,
      entry.perfume_id,
      entry.sort_label
    from jsonb_to_recordset(payload) as entry(
      category_id text,
      brand_id uuid,
      perfume_id uuid,
      sort_label text
    )
    where
      (
        entry.category_id = 'best-brand-launched'
        and entry.brand_id is not null
        and entry.perfume_id is null
      )
      or
      (
        entry.category_id in ('best-romanian-perfume', 'best-perfume-launched', 'best-perfume-overall')
        and entry.brand_id is not null
        and entry.perfume_id is not null
      )
  ),
  deduped_entries as (
    select distinct on (
      category_id,
      coalesce(brand_id::text, ''),
      coalesce(perfume_id::text, '')
    )
      category_id,
      brand_id,
      perfume_id,
      sort_label
    from typed_entries
    order by
      category_id,
      coalesce(brand_id::text, ''),
      coalesce(perfume_id::text, ''),
      sort_label
  )
  select
    category_id,
    brand_id,
    perfume_id,
    sort_label
  from deduped_entries;
end;
$$;
