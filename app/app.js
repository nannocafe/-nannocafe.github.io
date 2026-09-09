/* ==========================================================================
   Nanno Café · Fidelidad
   --------------------------------------------------------------------------
   Un solo archivo para las tres pantallas:
     index.html    -> panel del personal
     scan.html     -> mostrador (escanear y sumar café)
     customer.html -> tarjeta pública del cliente
   ========================================================================== */
(() => {
  'use strict';

  const CONFIG = window.NANNO_CONFIG || {};
  const CICLO = 4; // cafés a comprar antes del regalo

  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('TU-PROYECTO')) {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertAdjacentHTML('afterbegin',
        '<p class="error center" style="padding:15px">' +
        'Falta configurar config.js con los datos del proyecto Supabase.</p>');
    });
  }

  const sb = window.supabase?.createClient(
    CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  const $ = s => document.querySelector(s);

  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const inicial = nombre => (String(nombre || '?').trim()[0] || '?').toUpperCase();

  /* Traduce los errores de la base a algo que se entienda en el mostrador. */
  function mensajeDeError(error) {
    const m = String(error?.message || error || '');
    if (m.includes('RAPID_DUPLICATE')) return 'RAPID_DUPLICATE';
    if (m.includes('No autorizado')) return 'Tu usuario no tiene permiso para operar. Avisale al dueño.';
    if (m.includes('utilizar el regalo')) return 'Este cliente tiene un café de regalo sin usar. Primero canjealo.';
    if (m.includes('No hay regalo')) return 'Este cliente no tiene un regalo disponible.';
    if (m.includes('Cliente inexistente')) return 'No se encontró el cliente.';
    if (m.includes('Failed to fetch') || m.includes('NetworkError')) {
      return 'Sin conexión. Revisá el wifi o los datos del celular.';
    }
    return m || 'Ocurrió un error inesperado.';
  }

  /* Deshabilita el botón mientras la operación está en curso.
     Es lo que evita que dos toques rápidos cuenten dos veces. */
  async function ocupado(boton, tarea) {
    if (!boton || boton.disabled) return;
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Un momento…';
    try {
      return await tarea();
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }

  const sesion = async () => (await sb.auth.getSession()).data.session;
  const esPersonal = async () => (await sb.rpc('is_staff')).data === true;

  /* Trae todos los clientes activos.
     Supabase devuelve como máximo 1000 filas por consulta, así que se pide
     de a páginas hasta que no venga nada más. */
  async function traerClientes() {
    const PAGINA = 1000;
    let desde = 0, todos = [];
    for (;;) {
      const { data, error } = await sb.from('clients')
        .select('id,name,phone,qr_token,coffees,free_coffee_available,created_at')
        .eq('active', true)
        .order('name')
        .range(desde, desde + PAGINA - 1);
      if (error) throw error;
      todos = todos.concat(data || []);
      if (!data || data.length < PAGINA) return todos;
      desde += PAGINA;
    }
  }

  function dibujarSellos(contenedor, cafes, regalo) {
    const sellos = Array.from({ length: CICLO }, (_, i) =>
      `<span class="stamp ${i < cafes ? 'done' : ''}">${i + 1}</span>`).join('');
    contenedor.innerHTML = sellos +
      `<span class="stamp gift ${regalo ? 'done' : ''}">🎁</span>`;
  }

  function textoProgreso(cafes, regalo) {
    if (regalo) return '¡Regalo disponible! 🎁';
    const faltan = CICLO - cafes;
    return `Faltan ${faltan} café${faltan === 1 ? '' : 's'} para el regalo.`;
  }

  /* Dirección base contra la que se arma el link de una tarjeta.
     Si no hay PUBLIC_BASE_URL configurada, se resuelve relativo a la página
     actual (que es lo correcto: index.html y customer.html son hermanos). */
  function baseTarjeta() {
    const configurada = (CONFIG.PUBLIC_BASE_URL || '').trim();
    if (!configurada) return location.href;
    try {
      const u = new URL(configurada);
      if (!u.pathname.endsWith('/')) {
        // Tolera que hayan pegado la URL completa con archivo (.../index.html):
        // en ese caso vale la carpeta que lo contiene.
        const ultimo = u.pathname.split('/').pop();
        u.pathname = ultimo.includes('.')
          ? u.pathname.slice(0, u.pathname.lastIndexOf('/') + 1)
          : u.pathname + '/';
      }
      return u.href;
    } catch {
      console.warn('NANNO: PUBLIC_BASE_URL mal escrita (falta https://?):', configurada);
      return location.href;   // mal escrita: mejor seguir andando
    }
  }

  /* URL de la tarjeta de un cliente. Usa la dirección definitiva configurada
     para que los QR ya repartidos no se rompan si se cambia de hosting. */
  function urlTarjeta(qrToken) {
    const u = new URL('customer.html', baseTarjeta());
    u.searchParams.set('id', qrToken);
    return u.href;
  }

  /* ======================================================================
     PANEL (index.html)
     ====================================================================== */

  let clientesEnMemoria = [];

  async function iniciarPanel() {
    $('#loginForm').onsubmit = async e => {
      e.preventDefault();
      $('#loginError').textContent = '';
      await ocupado(e.submitter || $('#loginForm button.primary'), async () => {
        const { error } = await sb.auth.signInWithPassword({
          email: $('#email').value.trim(),
          password: $('#password').value
        });
        if (error) {
          $('#loginError').textContent = 'Email o contraseña incorrectos.';
          return;
        }
        location.reload();
      });
    };

    $('#logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };
    $('#newClient').onclick = () => abrirNuevoCliente();
    $('#close').onclick = () => $('#dialog').close();
    $('#clientForm').onsubmit = crearCliente;
    $('#search').oninput = () => listarClientes();   // filtra en memoria, sin red
    $('#detailClose').onclick = () => $('#clientDialog').close();

    if (!await sesion()) return;

    if (!await esPersonal()) {
      $('#login').classList.add('hidden');
      $('#noStaff').classList.remove('hidden');
      $('#noStaffLogout').onclick = async () => { await sb.auth.signOut(); location.reload(); };
      return;
    }

    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    await cargarPanel();
  }

  async function cargarPanel() {
    try {
      const [{ data: stats }, clientes] = await Promise.all([
        sb.rpc('dashboard_stats'),
        traerClientes()
      ]);
      const s = stats?.[0] || {};
      $('#clientsCount').textContent = s.clients_count ?? 0;
      $('#coffeeCount').textContent = s.coffees_count ?? 0;
      $('#giftCount').textContent = s.gifts_count ?? 0;
      clientesEnMemoria = clientes;
      listarClientes();
    } catch (e) {
      $('#clientList').innerHTML =
        `<p class="error">${esc(mensajeDeError(e))}</p>`;
    }
  }

  function listarClientes() {
    const q = ($('#search')?.value || '').trim().toLowerCase();
    const qDigitos = q.replace(/\D/g, '');
    const filtrados = clientesEnMemoria.filter(c => {
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      const tel = (c.phone || '').replace(/\D/g, '');
      return qDigitos.length > 0 && tel.includes(qDigitos);
    });

    if (!filtrados.length) {
      $('#clientList').innerHTML = clientesEnMemoria.length
        ? '<p>Ningún cliente coincide con la búsqueda.</p>'
        : '<p>Todavía no hay clientes cargados.</p>';
      return;
    }

    $('#clientList').innerHTML = filtrados.map(c => `
      <div class="client" data-id="${esc(c.id)}" role="button" tabindex="0">
        <div><b>${esc(c.name)}</b><br><small>${esc(c.phone || 'sin teléfono')}</small></div>
        <div>
          <span class="pill">${c.coffees}/${CICLO}</span>
          ${c.free_coffee_available ? ' <span class="pill">🎁</span>' : ''}
        </div>
      </div>`).join('');

    $('#clientList').querySelectorAll('.client').forEach(fila => {
      fila.onclick = () => abrirDetalle(fila.dataset.id);
    });
  }

  function abrirNuevoCliente() {
    $('#clientForm').reset();
    $('#clientError').textContent = '';
    $('#dupWarning').classList.add('hidden');
    $('#dialog').showModal();
  }

  /* Avisa si ya existe alguien con ese teléfono, para no duplicar clientes. */
  function chequearDuplicado() {
    const digitos = ($('#phone').value || '').replace(/\D/g, '');
    const aviso = $('#dupWarning');
    if (digitos.length < 6) return aviso.classList.add('hidden');
    const ya = clientesEnMemoria.find(c =>
      (c.phone || '').replace(/\D/g, '') === digitos);
    if (ya) {
      aviso.innerHTML = `Ojo: <b>${esc(ya.name)}</b> ya está cargado con ese teléfono.`;
      aviso.classList.remove('hidden');
    } else {
      aviso.classList.add('hidden');
    }
  }

  async function crearCliente(e) {
    e.preventDefault();
    $('#clientError').textContent = '';
    const nombre = $('#name').value.trim();
    if (!nombre) {
      $('#clientError').textContent = 'El nombre no puede estar vacío.';
      return;
    }
    await ocupado($('#clientForm button.primary'), async () => {
      const { data, error } = await sb.from('clients')
        .insert({ name: nombre, phone: $('#phone').value.trim() || null })
        .select('qr_token').single();
      if (error) {
        $('#clientError').textContent = mensajeDeError(error);
        return;
      }
      location.href = urlTarjeta(data.qr_token);
    });
  }

  async function abrirDetalle(id) {
    const c = clientesEnMemoria.find(x => x.id === id);
    if (!c) return;
    $('#detailName').textContent = c.name;
    $('#detailPhone').textContent = c.phone || 'sin teléfono';
    $('#detailAvatar').textContent = inicial(c.name);
    dibujarSellos($('#detailStamps'), c.coffees, c.free_coffee_available);
    $('#editName').value = c.name;
    $('#editPhone').value = c.phone || '';
    $('#detailError').textContent = '';
    $('#detailHistory').innerHTML = '<p>Cargando historial…</p>';
    $('#openCard').href = urlTarjeta(c.qr_token);
    $('#clientDialog').showModal();

    $('#editForm').onsubmit = async ev => {
      ev.preventDefault();
      const nuevoNombre = $('#editName').value.trim();
      if (!nuevoNombre) {
        $('#detailError').textContent = 'El nombre no puede estar vacío.';
        return;
      }
      await ocupado($('#editForm button.primary'), async () => {
        const { error } = await sb.from('clients')
          .update({ name: nuevoNombre, phone: $('#editPhone').value.trim() || null })
          .eq('id', id);
        if (error) return $('#detailError').textContent = mensajeDeError(error);
        $('#clientDialog').close();
        await cargarPanel();
      });
    };

    $('#deactivate').onclick = async () => {
      $('#confirmDeactivate').classList.remove('hidden');
    };
    $('#cancelDeactivate').onclick = () => $('#confirmDeactivate').classList.add('hidden');
    $('#confirmDeactivateYes').onclick = async () => {
      await ocupado($('#confirmDeactivateYes'), async () => {
        const { error } = await sb.from('clients').update({ active: false }).eq('id', id);
        if (error) return $('#detailError').textContent = mensajeDeError(error);
        $('#clientDialog').close();
        await cargarPanel();
      });
    };
    $('#confirmDeactivate').classList.add('hidden');

    const { data: eventos, error } = await sb.from('loyalty_events')
      .select('event_type,created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      $('#detailHistory').innerHTML = `<p class="error">${esc(mensajeDeError(error))}</p>`;
    } else if (!eventos.length) {
      $('#detailHistory').innerHTML = '<p>Sin movimientos todavía.</p>';
    } else {
      $('#detailHistory').innerHTML = eventos.map(ev => {
        const f = new Date(ev.created_at).toLocaleString('es-AR',
          { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        const etiqueta = ev.event_type === 'coffee' ? '☕ Café' : '🎁 Regalo usado';
        return `<div class="client"><div>${etiqueta}</div><small>${esc(f)}</small></div>`;
      }).join('');
    }
  }

  /* ======================================================================
     MOSTRADOR (scan.html)
     ====================================================================== */

  let clienteActual = null;
  let lector = null;
  let leyendo = false;

  async function initScan() {
    if (!await sesion()) return location.href = 'index.html';
    if (!await esPersonal()) return location.href = 'index.html';

    lector = new Html5Qrcode('reader');
    await arrancarCamara();

    $('#add').onclick = () => sumarCafe(false);
    $('#confirmRapidYes').onclick = () => sumarCafe(true);
    $('#confirmRapidNo').onclick = () => $('#confirmRapid').classList.add('hidden');
    $('#gift').onclick = () => canjearRegalo();
    $('#scanAnother').onclick = () => volverAEscanear();

    $('#manual').onclick = () => {
      $('#manualBox').classList.toggle('hidden');
      $('#manualCode').focus();
    };
    $('#manualForm').onsubmit = async ev => {
      ev.preventDefault();
      const codigo = $('#manualCode').value.trim();
      if (codigo) await mostrarCliente(codigo);
    };
  }

  async function arrancarCamara() {
    if (leyendo) return;
    $('#status').textContent = 'Apuntá la cámara al QR del cliente.';
    // Se marca antes de arrancar: si un QR se detecta muy rápido, el callback
    // puede llegar antes de que start() termine de resolver.
    leyendo = true;
    try {
      await lector.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async texto => {
          if (!leyendo) return;
          await pararCamara();
          await mostrarCliente(extraerToken(texto));
        },
        () => { /* cuadro sin QR: es normal, no molestamos al usuario */ }
      );
    } catch {
      leyendo = false;
      $('#status').innerHTML =
        'No se pudo abrir la cámara. Revisá los permisos del navegador.<br>' +
        'Podés usar “Ingresar código manualmente”.';
    }
  }

  async function pararCamara() {
    if (!leyendo) return;
    leyendo = false;
    try { await lector.stop(); } catch { /* ya estaba parada */ }
  }

  /* El QR guarda la URL de la tarjeta; de ahí sacamos el token.
     Si alguien tipea el token pelado, también funciona. */
  function extraerToken(texto) {
    try { return new URL(texto).searchParams.get('id') || texto; }
    catch { return texto; }
  }

  async function mostrarCliente(token) {
    $('#message').textContent = '';
    $('#message').className = 'center';
    $('#confirmRapid').classList.add('hidden');
    $('#manualBox').classList.add('hidden');
    try {
      const { data, error } = await sb.rpc('get_client_for_qr', { p_qr_token: token });
      if (error) throw error;
      clienteActual = data?.[0];
      if (!clienteActual) throw new Error('Esta tarjeta no figura en el sistema.');

      $('#customerName').textContent = clienteActual.name;
      $('#avatar').textContent = inicial(clienteActual.name);
      pintarEstadoCliente();
      $('#customer').classList.remove('hidden');
      $('#scanner').classList.add('hidden');
      $('#status').textContent = '';
    } catch (e) {
      $('#status').textContent = mensajeDeError(e);
      await arrancarCamara();
    }
  }

  function pintarEstadoCliente() {
    const c = clienteActual;
    dibujarSellos($('#stamps'), c.coffees, c.free_coffee_available);
    $('#progress').textContent = textoProgreso(c.coffees, c.free_coffee_available);
    $('#gift').classList.toggle('hidden', !c.free_coffee_available);
    $('#add').classList.toggle('hidden', c.free_coffee_available);
  }

  async function refrescarCliente() {
    const { data } = await sb.rpc('get_client_for_qr',
      { p_qr_token: clienteActual.qr_token });
    if (data?.[0]) { clienteActual = data[0]; pintarEstadoCliente(); }
  }

  async function sumarCafe(permitirRapido) {
    $('#confirmRapid').classList.add('hidden');
    const boton = permitirRapido ? $('#confirmRapidYes') : $('#add');
    await ocupado(boton, async () => {
      const { error } = await sb.rpc('add_coffee', {
        p_client_id: clienteActual.id,
        p_allow_rapid: permitirRapido
      });
      if (error) {
        const msg = mensajeDeError(error);
        if (msg === 'RAPID_DUPLICATE') {
          // Recién se le sumó un café. Puede ser un doble toque sin querer.
          $('#confirmRapid').classList.remove('hidden');
          return;
        }
        $('#message').textContent = msg;
        $('#message').className = 'center error';
        return;
      }
      await refrescarCliente();
      $('#message').textContent = clienteActual.free_coffee_available
        ? '¡Completó la tarjeta! El próximo café es gratis 🎁'
        : 'Café sumado ✓';
      $('#message').className = 'center';
    });
  }

  async function canjearRegalo() {
    await ocupado($('#gift'), async () => {
      const { error } = await sb.rpc('redeem_gift', { p_client_id: clienteActual.id });
      if (error) {
        $('#message').textContent = mensajeDeError(error);
        $('#message').className = 'center error';
        return;
      }
      await refrescarCliente();
      $('#message').textContent = 'Regalo entregado ✓ La tarjeta arranca de nuevo.';
      $('#message').className = 'center';
    });
  }

  /* Sin esto había que recargar la página para atender al siguiente cliente. */
  async function volverAEscanear() {
    clienteActual = null;
    $('#customer').classList.add('hidden');
    $('#scanner').classList.remove('hidden');
    $('#message').textContent = '';
    $('#manualCode').value = '';
    await arrancarCamara();
  }

  /* ======================================================================
     TARJETA DEL CLIENTE (customer.html)
     ====================================================================== */

  async function initCustomer() {
    const token = new URLSearchParams(location.search).get('id');
    if (!token) {
      $('#card').innerHTML = '<p class="error">Este link no es una tarjeta válida.</p>';
      return;
    }
    try {
      const { data, error } = await sb.rpc('get_client_for_qr', { p_qr_token: token });
      if (error) throw error;
      const c = data?.[0];
      if (!c) throw new Error('No encontramos esta tarjeta.');
      dibujarTarjeta(c);
    } catch (e) {
      $('#card').innerHTML = `<p class="error">${esc(mensajeDeError(e))}</p>`;
    }
  }

  function dibujarTarjeta(c) {
    $('#card').innerHTML = `
      <div class="logo" style="margin:auto">${esc(inicial(c.name))}</div>
      <h2>${esc(c.name)}</h2>
      <div class="stamps" id="cardStamps"></div>
      <p>${c.free_coffee_available
          ? '🎁 Tenés un café de regalo esperándote.'
          : `Llevás ${c.coffees} de ${CICLO} cafés.`}</p>
      <canvas id="qr"></canvas>
      <p><small>Mostrá este código en el mostrador.</small></p>`;
    dibujarSellos($('#cardStamps'), c.coffees, c.free_coffee_available);

    // Si la librería del QR no cargó, mostramos el link igual en vez de
    // dejar la tarjeta a medio dibujar.
    const link = urlTarjeta(c.qr_token);
    if (typeof QRCode === 'undefined') {
      $('#qr').replaceWith(Object.assign(document.createElement('p'),
        { className: 'error', textContent: 'No se pudo dibujar el código QR. Guardá este link: ' + link }));
      return;
    }
    QRCode.toCanvas($('#qr'), link, { width: 230, margin: 1 });
  }

  /* ====================================================================== */

  window.Nanno = { initScan, initCustomer, chequearDuplicado };

  if (document.querySelector('#loginForm')) iniciarPanel();
})();
