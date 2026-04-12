insert into public.admin_settings (key, value)
values
  ('voting_start_at', 'null'::jsonb),
  ('voting_end_at', 'null'::jsonb),
  ('results_revealed_at', 'null'::jsonb)
on conflict (key) do update set value = excluded.value;

delete from public.admin_settings
where key in ('ceremony_at', 'results_hidden_until_end', 'require_email', 'require_attendee_code', 'allow_almost_human_in_category_1');

insert into public.categories (id, name, nominee_type, sort_order, is_active)
values
  ('best-romanian-perfume', 'Best Romanian Perfume from Art Niche Expo 2026', 'perfume', 1, true),
  ('best-brand-launched', 'Best brand launched at Art Niche Expo 2026', 'brand', 2, true),
  ('best-perfume-launched', 'Best perfume launched at Art Niche Expo 2026', 'perfume', 3, true),
  ('best-perfume-overall', 'Best perfume from Art Niche Expo 2026', 'perfume', 4, true)
on conflict (id) do update
set name = excluded.name,
    nominee_type = excluded.nominee_type,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
