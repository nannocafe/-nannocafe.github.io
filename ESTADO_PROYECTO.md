# Estado del proyecto

**Fecha:** 16/09/2026
**Situación:** en uso. Probado en un teléfono real de punta a punta hasta sumar un café.

## Decisiones cerradas con la dueña (14/09/2026)

- **Web en el navegador del celular**, no app nativa. Ella inicia sesión, escanea
  el QR del cliente con la cámara y gestiona todo desde ahí. Es lo que el
  sistema ya hacía: no hubo que cambiar la arquitectura.
- **Solo el café suma sello** (para tomar ahí o para llevar). Ningún otro
  producto. Queda cerrada la pregunta de negocio que estaba abierta: la regla
  4 + 1 gratis no se toca.
- **Hosting: GitHub Pages.** Gratis, y evita una segunda cuenta: el repo tiene
  que existir igual.
- **Base: Supabase**, plan gratuito.
- **Las dos cuentas van a nombre de la cafetería.** El desarrollo entra como
  colaborador del repositorio, con sus propias credenciales. No se comparten
  contraseñas.

## Qué existe

- Prototipo local con localStorage.
- Versión online con Supabase: schema PostgreSQL, Auth, RLS y RPC.
- Panel del personal, pantalla de mostrador y tarjeta pública del cliente.
- Alta, búsqueda, edición y baja de clientes.
- QR por cliente, escaneo, y entrega de la tarjeta por WhatsApp.
- Historial de eventos y estadísticas.
- Workflow de GitHub Actions que publica `app/` en Pages en cada push.
- `PUESTA_EN_MARCHA.md`: los 12 pasos de instalación, escritos para la dueña.
- 20 tests de esquema (`./tests/run.sh`), todos pasando al 15/09/2026.

## Qué falta, en orden

1. **Terminar la prueba en el teléfono**: llegar a 4 cafés, ver que no deje
   sumar el quinto, canjear el regalo, probar el doble toque y mirar el
   historial del cliente.
2. **Probar en el otro sistema operativo.** Los permisos de cámara se piden
   distinto en iPhone y en Android.
3. **Borrar el cliente de prueba** (Table Editor → `clients`) antes de cargar
   gente real, así los contadores arrancan limpios.
4. **Rotar la secret key** de Supabase: se compartió por chat el 15/09 y nunca
   se revocó. No la usa nadie, así que rotarla no rompe nada.
5. **Confirmar el Site URL** en Authentication → URL Configuration. Tiene que
   ser la dirección de la app y no `localhost:3000`, o el mail de recuperación
   no lleva a ningún lado. No se puede verificar desde afuera.

## Decidido: sin dominio propio ni SMPT propio, por ahora (16/09/2026)

La cafetería es chica y no lo justifica. Es una decisión tomada, no un
pendiente: no hace falta volver a plantearla salvo que cambie la escala.

**Qué implica convivir con esto:**

- El mail de recuperación de contraseña es poco confiable: el SMTP de Supabase
  manda 2 por hora y solo a miembros del proyecto. La salida es que la dueña
  cambie su contraseña desde el panel, y si se queda afuera, que la resetee
  desde el dashboard, que puede porque es Owner.
- La dirección sigue siendo `nannocafe.github.io/-nannocafe.github.io/`.

**Cuándo reverlo:** si suma empleadas que necesiten recuperar su contraseña
solas, si los mails empiezan a hacer falta para algo más, o si quiere mudarse
de hosting. Si algún día se compra el dominio, GitHub redirige la dirección
vieja a la nueva, así que los QR ya repartidos seguirían funcionando.

## Lo que ya está andando

**App publicada:** https://nannocafe.github.io/-nannocafe.github.io/
Repositorio `nannocafe/-nannocafe.github.io`, Pages sirviendo desde el workflow.

**Base:** proyecto `oyqfdutkqjyjocmermjl` en la organización de la cafetería.
Schema aplicado, `config.js` conectado.

**Verificado contra el proyecto real, no en local:**

| Prueba | Resultado |
|---|---|
| Anónimo suma café | `42501 permission denied` |
| Anónimo canjea regalo | `42501 permission denied` |
| Anónimo ve estadísticas | `42501 permission denied` |
| Anónimo lee clientes o historial | vacío (RLS) |
| Anónimo escribe un cliente | `42501` violación de RLS |
| Tarjeta pública del cliente | funciona sin login, como debe |
| Registro público | `422 signup_disabled` |
| Login por mail | habilitado |

Para repetirlas sobre la base: `tests/verificar_instalacion.sql` en el SQL Editor.

**Agregado el 16/09:**

- Cambiar y recuperar la contraseña desde el panel, sin pasar por el dashboard.
- Guardar la tarjeta como imagen, para que el cliente la tenga en la galería y
  no dependa de tener señal en el mostrador. Probado en un teléfono real.
- El deploy le pega la versión a `app.js`, `config.js` y `styles.css`, porque
  Pages cachea 10 minutos y los cambios tardaban en llegar a un celular.

## Decisión abierta

**Dominio propio.** Mientras la dirección sea `usuaria.github.io/nanno-cafe/`
queda atada a esa cuenta de GitHub. Un dominio propio (`nannocafe.com.ar`,
unos pocos miles de pesos al año) la vuelve portable. No bloquea nada, pero
hay que resolverlo **antes de repartir la primera tarjeta**: los QR que los
clientes guardan apuntan a esa dirección y no se pueden reimprimir a distancia.

## Qué no debe asumirse

- No está certificado como producción: falta la prueba en teléfonos reales.
- `config.js` todavía tiene placeholders, no credenciales reales.
- No hay ningún proyecto de Supabase creado todavía.
