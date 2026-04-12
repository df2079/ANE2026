insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
