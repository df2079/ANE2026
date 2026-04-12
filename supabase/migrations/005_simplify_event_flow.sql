alter table if exists public.voters
  add column if not exists newsletter_opt_in boolean not null default false;

delete from public.admin_settings
where key in ('ceremony_at', 'results_hidden_until_end', 'require_email', 'require_attendee_code', 'allow_almost_human_in_category_1');
