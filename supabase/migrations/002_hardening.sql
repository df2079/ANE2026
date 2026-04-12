alter table if exists public.import_warnings
  add column if not exists severity text not null default 'warning';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'import_warnings_severity_check'
  ) then
    alter table public.import_warnings
      add constraint import_warnings_severity_check check (severity in ('info', 'warning', 'error'));
  end if;
end $$;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_email text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_category_nominees_unique_brand
on public.category_nominees(category_id, brand_id)
where brand_id is not null;

create unique index if not exists idx_category_nominees_unique_perfume
on public.category_nominees(category_id, perfume_id)
where perfume_id is not null;

create index if not exists idx_votes_voter_category on public.votes(voter_id, category_id);
create index if not exists idx_vote_attempt_logs_action on public.vote_attempt_logs(action, created_at desc);
create index if not exists idx_import_logs_created_at on public.import_logs(created_at desc);
create index if not exists idx_import_warnings_import_log on public.import_warnings(import_log_id, severity, created_at desc);
create index if not exists idx_access_codes_active on public.access_codes(is_active, code);
create index if not exists idx_voters_device_token on public.voters(device_token);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'access_codes_max_uses_check'
  ) then
    alter table public.access_codes
      add constraint access_codes_max_uses_check check (max_uses is null or max_uses > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'access_codes_used_count_check'
  ) then
    alter table public.access_codes
      add constraint access_codes_used_count_check check (used_count >= 0);
  end if;
end $$;

alter table public.admin_audit_logs enable row level security;

drop policy if exists "service_role_all_access_admin_audit_logs" on public.admin_audit_logs;
create policy "service_role_all_access_admin_audit_logs"
on public.admin_audit_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
