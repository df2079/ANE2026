create table if not exists public.category_reveals (
  category_id text primary key references public.categories(id) on delete cascade,
  revealed_at timestamptz not null default now(),
  revealed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.category_reveals enable row level security;

drop trigger if exists category_reveals_set_updated_at on public.category_reveals;
create trigger category_reveals_set_updated_at
before update on public.category_reveals
for each row execute function public.set_updated_at();

drop policy if exists "service_role_all_access_category_reveals" on public.category_reveals;
create policy "service_role_all_access_category_reveals"
on public.category_reveals for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
