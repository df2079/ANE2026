insert into public.admin_settings (key, value)
values
  ('voting_start_at', 'null'::jsonb),
  ('voting_end_at', 'null'::jsonb),
  ('results_revealed_at', 'null'::jsonb)
on conflict (key) do update
set value = excluded.value;

insert into public.categories (id, name, nominee_type, sort_order, is_active)
values
  ('best-romanian-perfume', 'Best perfume by a Romanian brand', 'perfume', 1, true),
  ('best-brand-launched', 'Best new brand at Art Niche Expo 2026', 'brand', 2, true),
  ('best-perfume-launched', 'Best new perfume of 2026', 'perfume', 3, true),
  ('best-perfume-overall', 'Best perfume at Art Niche Expo 2026', 'perfume', 4, true)
on conflict (id) do update
set name = excluded.name,
    nominee_type = excluded.nominee_type,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;
