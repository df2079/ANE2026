update public.categories
set name = case id
  when 'best-romanian-perfume' then 'Best perfume by a Romanian brand'
  when 'best-brand-launched' then 'Best new brand at Art Niche Expo 2026'
  when 'best-perfume-launched' then 'Best new perfume of 2026'
  when 'best-perfume-overall' then 'Best perfume at Art Niche Expo 2026'
  else name
end;

create table if not exists public.category_tie_breaks (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories(id) on delete cascade,
  nominee_key text not null,
  nominee_brand_id uuid references public.brands(id) on delete cascade,
  nominee_perfume_id uuid references public.perfumes(id) on delete cascade,
  priority integer not null check (priority > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, nominee_key),
  check ((nominee_brand_id is not null) <> (nominee_perfume_id is not null))
);

create index if not exists idx_category_tie_breaks_category_priority
on public.category_tie_breaks(category_id, priority);

alter table public.category_tie_breaks enable row level security;

drop trigger if exists category_tie_breaks_set_updated_at on public.category_tie_breaks;
create trigger category_tie_breaks_set_updated_at
before update on public.category_tie_breaks
for each row execute function public.set_updated_at();

drop policy if exists "service_role_all_access_category_tie_breaks" on public.category_tie_breaks;
create policy "service_role_all_access_category_tie_breaks"
on public.category_tie_breaks for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
