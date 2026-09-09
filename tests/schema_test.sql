\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- ---------------------------------------------------------------- datos base
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','duenia@nanno.test'),
  ('22222222-2222-2222-2222-222222222222','intruso@cualquiera.com');

insert into public.staff(user_id,email) values
  ('11111111-1111-1111-1111-111111111111','duenia@nanno.test');

insert into public.clients(id,name,phone,qr_token) values
  ('33333333-3333-3333-3333-333333333333','Sofía Pérez','11 2345-6789','TOKENTEST');

\echo '################ 1. INTRUSO (registrado, pero no es personal) ################'
set role authenticated;
set test.uid = '22222222-2222-2222-2222-222222222222';

do $$ declare n int; begin
  select count(*) into n from public.clients;
  if n <> 0 then raise exception 'FALLO: el intruso leyó % clientes', n; end if;
  raise notice 'OK · no puede leer la lista de clientes (ve 0 filas)';
end $$;

do $$ declare n int; begin
  select count(*) into n from public.loyalty_events;
  if n <> 0 then raise exception 'FALLO: el intruso leyó el historial'; end if;
  raise notice 'OK · no puede leer el historial';
end $$;

do $$ begin
  perform public.add_coffee('33333333-3333-3333-3333-333333333333', true);
  raise exception 'FALLO: el intruso se sumó un café';
exception when others then
  if sqlerrm like 'FALLO%' then raise; end if;
  raise notice 'OK · no puede sumar café (%)', sqlerrm;
end $$;

do $$ begin
  perform public.redeem_gift('33333333-3333-3333-3333-333333333333');
  raise exception 'FALLO: el intruso canjeó un regalo';
exception when others then
  if sqlerrm like 'FALLO%' then raise; end if;
  raise notice 'OK · no puede canjear regalos (%)', sqlerrm;
end $$;

do $$ begin
  insert into public.clients(name) values ('cliente trucho');
  raise exception 'FALLO: el intruso creó un cliente';
exception when others then
  if sqlerrm like 'FALLO%' then raise; end if;
  raise notice 'OK · no puede crear clientes';
end $$;

do $$ declare n int; begin
  select count(*) into n from public.dashboard_stats();
  if n <> 0 then raise exception 'FALLO: el intruso vio las estadísticas'; end if;
  raise notice 'OK · no ve las estadísticas del negocio';
end $$;

\echo '################ 2. VISITANTE SIN LOGIN (anon) ################'
reset role; set role anon; set test.uid = '';

do $$ declare n int; begin
  select count(*) into n from public.clients;
  if n <> 0 then raise exception 'FALLO: anon leyó clientes'; end if;
  raise notice 'OK · sin login no se lee la tabla de clientes';
end $$;

do $$ begin
  perform public.add_coffee('33333333-3333-3333-3333-333333333333', true);
  raise exception 'FALLO: anon sumó café';
exception when others then
  if sqlerrm like 'FALLO%' then raise; end if;
  raise notice 'OK · sin login no se puede sumar café';
end $$;

do $$ declare r record; begin
  select * into r from public.get_client_for_qr('TOKENTEST');
  if r.name <> 'Sofía Pérez' then raise exception 'FALLO: la tarjeta pública no anda'; end if;
  raise notice 'OK · la tarjeta pública sí se puede ver con el token';
end $$;

do $$ declare cols text; begin
  select string_agg(a.attname, ', ' order by a.attnum) into cols
  from pg_proc p, unnest(p.proallargtypes) with ordinality t(typ, ord)
  join lateral (select p.proargnames[t.ord] as attname, t.ord as attnum) a on true
  where p.proname = 'get_client_for_qr' and p.proargmodes[t.ord] = 't';
  if position('phone' in coalesce(cols,'')) > 0 then
    raise exception 'FALLO: la tarjeta pública devuelve el teléfono';
  end if;
  raise notice 'OK · la tarjeta pública NO expone el teléfono (devuelve: %)', cols;
end $$;

\echo '################ 3. PERSONAL AUTORIZADO ################'
reset role; set role authenticated;
set test.uid = '11111111-1111-1111-1111-111111111111';

do $$ declare n int; begin
  select count(*) into n from public.clients;
  if n <> 1 then raise exception 'FALLO: el personal debería ver 1 cliente, ve %', n; end if;
  raise notice 'OK · el personal sí ve la lista de clientes';
end $$;

do $$ declare tok text; begin
  insert into public.clients(name, phone) values ('Cliente Nuevo','+54 9 11 5555 4444')
    returning qr_token into tok;
  if length(tok) <> 36 then raise exception 'FALLO: token raro: %', tok; end if;
  raise notice 'OK · el personal puede dar de alta clientes (token de % caracteres)', length(tok);
end $$;

\echo '################ 4. REGLA 4 CAFÉS + 1 GRATIS ################'
do $$
declare v_id uuid := '33333333-3333-3333-3333-333333333333'; c int; g boolean;
begin
  for i in 1..4 loop
    perform public.add_coffee(v_id, true);
  end loop;

  select coffees, free_coffee_available into c, g from public.clients where clients.id = v_id;
  if c <> 4 or not g then raise exception 'FALLO: tras 4 cafés quedó c=%, regalo=%', c, g; end if;
  raise notice 'OK · a los 4 cafés se activa el regalo (c=4, regalo=true)';

  begin
    perform public.add_coffee(v_id, true);
    raise exception 'FALLO: dejó sumar un 5.º café con el regalo pendiente';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
    raise notice 'OK · no deja seguir sumando hasta que se use el regalo';
  end;

  perform public.redeem_gift(v_id);
  select coffees, free_coffee_available into c, g from public.clients where clients.id = v_id;
  if c <> 0 or g then raise exception 'FALLO: tras canjear quedó c=%, regalo=%', c, g; end if;
  raise notice 'OK · al canjear el regalo la tarjeta vuelve a 0';

  begin
    perform public.redeem_gift(v_id);
    raise exception 'FALLO: canjeó dos veces el mismo regalo';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
    raise notice 'OK · no se puede canjear un regalo que no existe';
  end;
end $$;

do $$ declare cafes int; regalos int; autor uuid; begin
  select count(*) filter (where event_type='coffee'),
         count(*) filter (where event_type='gift_redeemed'),
         (array_agg(performed_by))[1]
    into cafes, regalos, autor
  from public.loyalty_events
  where client_id = '33333333-3333-3333-3333-333333333333';
  if cafes <> 4 or regalos <> 1 then
    raise exception 'FALLO: historial con % cafés y % regalos', cafes, regalos; end if;
  if autor <> '11111111-1111-1111-1111-111111111111' then
    raise exception 'FALLO: no quedó registrado quién lo hizo'; end if;
  raise notice 'OK · el historial guardó 4 cafés, 1 regalo y quién los cargó';
end $$;

\echo '################ 5. DOBLE TOQUE EN EL MOSTRADOR ################'
do $$ declare v_id uuid; c int; begin
  -- cliente recién creado, sin cafes previos
  insert into public.clients(name) values ('Test Doble Toque') returning id into v_id;

  perform public.add_coffee(v_id, false);
  begin
    perform public.add_coffee(v_id, false);
    raise exception 'FALLO: contó dos cafes seguidos sin preguntar';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
    if sqlerrm not like '%RAPID_DUPLICATE%' then raise; end if;
    raise notice 'OK · el segundo toque inmediato queda frenado para que la pantalla pregunte';
  end;

  perform public.add_coffee(v_id, true);   -- el mozo confirma que si compro dos
  select coffees into c from public.clients where clients.id = v_id;
  if c <> 2 then raise exception 'FALLO: deberia tener 2 cafes, tiene %', c; end if;
  raise notice 'OK · si confirma que compro dos, se suman los dos (c=2)';
end $$;

\echo '################ 6. BAJA DE CLIENTE Y BÚSQUEDA POR TELÉFONO ################'
do $$ declare d text; begin
  select phone_digits into d from public.clients where qr_token = 'TOKENTEST';
  if d <> '1123456789' then raise exception 'FALLO: teléfono normalizado = %', d; end if;
  raise notice 'OK · "11 2345-6789" se normaliza a % para buscar y detectar repetidos', d;
end $$;

do $$ declare n int; begin
  update public.clients set active = false where qr_token = 'TOKENTEST';
  select count(*) into n from public.get_client_for_qr('TOKENTEST');
  if n <> 0 then raise exception 'FALLO: el QR de un cliente dado de baja sigue andando'; end if;
  raise notice 'OK · al dar de baja, su QR deja de funcionar';

  select count(*) into n from public.loyalty_events
    where client_id = '33333333-3333-3333-3333-333333333333';
  if n = 0 then raise exception 'FALLO: se perdió el historial al dar de baja'; end if;
  raise notice 'OK · pero el historial se conserva (% movimientos)', n;
end $$;

reset role;
\echo '################ TODOS LOS TESTS PASARON ################'
