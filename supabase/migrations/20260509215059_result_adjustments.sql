create table if not exists public.result_adjustments (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  multiplier numeric not null check (multiplier >= 0 and multiplier <= 1),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id)
);

alter table public.result_adjustments enable row level security;

drop trigger if exists result_adjustments_set_updated_at on public.result_adjustments;
create trigger result_adjustments_set_updated_at
before update on public.result_adjustments
for each row execute function public.set_updated_at();

drop policy if exists "service_role_all_access_result_adjustments" on public.result_adjustments;
create policy "service_role_all_access_result_adjustments"
on public.result_adjustments for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
