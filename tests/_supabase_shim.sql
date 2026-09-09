-- Simulacro del entorno de Supabase para poder testear el esquema localmente.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table auth.users(id uuid primary key, email text);

-- En Supabase auth.uid() sale del JWT. Acá lo tomamos de una variable de sesión.
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;

grant usage on schema public, auth to anon, authenticated;
