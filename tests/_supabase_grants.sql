-- Supabase le da permisos amplios de tabla a anon/authenticated y confía en RLS.
-- Replicamos eso para que el test sea realista: si RLS falla, queda expuesto.
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
