insert into public.admin_settings (key, value)
values ('voting_start_at', 'null'::jsonb)
on conflict (key) do nothing;
