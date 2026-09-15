# Estado del proyecto

**Fecha:** 15/09/2026
**Situación:** listo para publicar. Esperando que la cafetería cree sus cuentas.

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

1. **Ella:** cuenta de GitHub, repo `nanno-cafe` público, agregar al
   desarrollo como colaborador.
2. **Desarrollo:** subir el código.
3. **Ella:** Settings → Pages → Source: *GitHub Actions*. Es un setting del
   repositorio: un colaborador no puede tocarlo.
4. **Ella:** proyecto en Supabase (puede entrar con la misma cuenta de GitHub),
   correr `app/supabase.sql`, apagar "Enable signups", crear su usuario y
   habilitarlo en la tabla `staff`.
5. **Ella:** pasar la Project URL y la anon key. Son públicas por diseño; la
   `service_role` no sale nunca de su cuenta.
6. **Desarrollo:** completar `config.js` y publicar.
7. **Los dos:** probar en un iPhone y un Android reales, con cámara.

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
