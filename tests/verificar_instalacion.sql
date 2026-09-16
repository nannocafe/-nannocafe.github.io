-- ============================================================================
-- Verificación de la instalación — Nanno Café
-- ============================================================================
-- Pegar entero en el SQL Editor de Supabase DESPUÉS de correr supabase.sql
-- y de dar de alta al personal. No modifica nada: solo mira y reporta.
--
-- Tiene que dar OK en todas las filas. Si algo dice FALLA, no repartir
-- tarjetas hasta arreglarlo.
-- ============================================================================

with chequeos as (

  select 1 as orden, 'Extensión pgcrypto instalada' as chequeo,
         exists(select 1 from pg_extension where extname = 'pgcrypto') as bien

  union all select 2, 'Las tres tablas existen',
    (select count(*) from pg_tables
      where schemaname = 'public'
        and tablename in ('clients','loyalty_events','staff')) = 3

  union all select 3, 'Row Level Security activo en las tres tablas',
    (select count(*) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('clients','loyalty_events','staff')
        and c.relrowsecurity) = 3

  union all select 4, 'Las cinco políticas de acceso están puestas',
    (select count(*) from pg_policies
      where schemaname = 'public'
        and policyname in ('staff read clients','staff insert clients',
                           'staff update clients','staff read events',
                           'staff read self')) = 5

  union all select 5, 'Las funciones tienen search_path fijo',
    (select count(*) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('is_staff','get_client_for_qr','add_coffee',
                          'redeem_gift','dashboard_stats')
        and p.proconfig @> array['search_path=public']) = 5

  -- Lo importante: un visitante sin login (rol anon) no puede tocar saldos.
  union all select 6, 'Un desconocido NO puede sumar cafés',
    not has_function_privilege('anon','public.add_coffee(uuid,boolean)','execute')

  union all select 7, 'Un desconocido NO puede canjear regalos',
    not has_function_privilege('anon','public.redeem_gift(uuid)','execute')

  union all select 8, 'Un desconocido NO puede preguntar si es personal',
    not has_function_privilege('anon','public.is_staff()','execute')

  -- Esto sí tiene que estar permitido: es la tarjeta pública del cliente.
  union all select 9, 'La tarjeta del cliente SÍ se puede abrir sin login',
    has_function_privilege('anon','public.get_client_for_qr(text)','execute')

  union all select 10, 'Hay al menos una persona habilitada como personal',
    (select count(*) from public.staff where active) >= 1
)
select
  case when bien then 'OK    ' else 'FALLA ' end as estado,
  chequeo
from chequeos
order by orden;

-- Quién puede operar hoy. Revisar que no sobre nadie.
select email, active as habilitada, created_at as alta
from public.staff
order by created_at;
