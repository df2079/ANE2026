create extension if not exists "pgcrypto";

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  nominee_type text not null check (nominee_type in ('brand', 'perfume')),
  sort_order integer not null,
  is_active boolean not null default true
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null unique,
  source_sheet_name text not null,
  exclude_from_awards boolean not null default false,
  is_romanian_brand boolean not null default false,
  eligible_category_2 boolean not null default false,
  is_active boolean not null default true,
  importer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.perfumes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  display_name text not null,
  normalized_name text not null,
  launched_2026 boolean not null default false,
  include_override boolean,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, normalized_name)
);

create table if not exists public.category_nominees (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  perfume_id uuid references public.perfumes(id) on delete cascade,
  sort_label text not null,
  created_at timestamptz not null default now(),
  check ((brand_id is not null) or (perfume_id is not null))
);

create table if not exists public.import_logs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text,
  workbook_sha1 text,
  status text not null default 'uploaded' check (status in ('uploaded', 'synced', 'failed')),
  summary jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.import_warnings (
  id uuid primary key default gen_random_uuid(),
  import_log_id uuid not null references public.import_logs(id) on delete cascade,
  sheet_name text not null,
  brand_name text not null,
  severity text not null default 'warning',
  code text not null,
  message text not null,
  row_number integer,
  created_at timestamptz not null default now()
);

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  is_reusable boolean not null default false,
  max_uses integer,
  used_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voters (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null unique,
  device_token text,
  newsletter_opt_in boolean not null default false,
  access_code_id uuid references public.access_codes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.voters(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  nominee_brand_id uuid references public.brands(id) on delete set null,
  nominee_perfume_id uuid references public.perfumes(id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (voter_id, category_id),
  check ((nominee_brand_id is not null) or (nominee_perfume_id is not null))
);

create table if not exists public.vote_attempt_logs (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid references public.voters(id) on delete set null,
  category_id text references public.categories(id) on delete set null,
  action text not null,
  ip_hash text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_email text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_perfumes_brand_active on public.perfumes(brand_id, is_active);
create index if not exists idx_category_nominees_category on public.category_nominees(category_id, sort_label);
create unique index if not exists idx_category_nominees_unique_brand
on public.category_nominees(category_id, brand_id)
where brand_id is not null;
create unique index if not exists idx_category_nominees_unique_perfume
on public.category_nominees(category_id, perfume_id)
where perfume_id is not null;
create index if not exists idx_votes_category on public.votes(category_id, created_at);
create index if not exists idx_votes_voter_category on public.votes(voter_id, category_id);
create index if not exists idx_vote_attempt_logs_ip on public.vote_attempt_logs(ip_hash, created_at);
create index if not exists idx_vote_attempt_logs_action on public.vote_attempt_logs(action, created_at desc);
create index if not exists idx_import_logs_created_at on public.import_logs(created_at desc);
create index if not exists idx_import_warnings_import_log on public.import_warnings(import_log_id, severity, created_at desc);
create index if not exists idx_access_codes_active on public.access_codes(is_active, code);
create index if not exists idx_voters_device_token on public.voters(device_token);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);

alter table public.import_warnings
  add constraint import_warnings_severity_check check (severity in ('info', 'warning', 'error'));

alter table public.access_codes
  add constraint access_codes_max_uses_check check (max_uses is null or max_uses > 0);

alter table public.access_codes
  add constraint access_codes_used_count_check check (used_count >= 0);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists perfumes_set_updated_at on public.perfumes;
create trigger perfumes_set_updated_at
before update on public.perfumes
for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.admin_settings;
create trigger settings_set_updated_at
before update on public.admin_settings
for each row execute function public.set_updated_at();

drop trigger if exists access_codes_set_updated_at on public.access_codes;
create trigger access_codes_set_updated_at
before update on public.access_codes
for each row execute function public.set_updated_at();

drop trigger if exists voters_set_updated_at on public.voters;
create trigger voters_set_updated_at
before update on public.voters
for each row execute function public.set_updated_at();

alter table public.admin_settings enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.perfumes enable row level security;
alter table public.category_nominees enable row level security;
alter table public.import_logs enable row level security;
alter table public.import_warnings enable row level security;
alter table public.access_codes enable row level security;
alter table public.voters enable row level security;
alter table public.votes enable row level security;
alter table public.vote_attempt_logs enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "public_can_read_active_categories" on public.categories;
create policy "public_can_read_active_categories"
on public.categories for select
using (is_active = true);

drop policy if exists "public_can_read_active_brands" on public.brands;
create policy "public_can_read_active_brands"
on public.brands for select
using (is_active = true);

drop policy if exists "public_can_read_active_perfumes" on public.perfumes;
create policy "public_can_read_active_perfumes"
on public.perfumes for select
using (is_active = true);

drop policy if exists "public_can_read_nominees" on public.category_nominees;
create policy "public_can_read_nominees"
on public.category_nominees for select
using (true);

drop policy if exists "service_role_all_access_admin_settings" on public.admin_settings;
create policy "service_role_all_access_admin_settings"
on public.admin_settings for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_categories" on public.categories;
create policy "service_role_all_access_categories"
on public.categories for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_brands" on public.brands;
create policy "service_role_all_access_brands"
on public.brands for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_perfumes" on public.perfumes;
create policy "service_role_all_access_perfumes"
on public.perfumes for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_category_nominees" on public.category_nominees;
create policy "service_role_all_access_category_nominees"
on public.category_nominees for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_import_logs" on public.import_logs;
create policy "service_role_all_access_import_logs"
on public.import_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_import_warnings" on public.import_warnings;
create policy "service_role_all_access_import_warnings"
on public.import_warnings for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_access_codes" on public.access_codes;
create policy "service_role_all_access_access_codes"
on public.access_codes for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_voters" on public.voters;
create policy "service_role_all_access_voters"
on public.voters for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_votes" on public.votes;
create policy "service_role_all_access_votes"
on public.votes for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_vote_attempt_logs" on public.vote_attempt_logs;
create policy "service_role_all_access_vote_attempt_logs"
on public.vote_attempt_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_role_all_access_admin_audit_logs" on public.admin_audit_logs;
create policy "service_role_all_access_admin_audit_logs"
on public.admin_audit_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
