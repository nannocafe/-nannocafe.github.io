# Estado del proyecto

**Fecha:** 15/09/2026
**Situación:** publicado y funcionando. Falta dar de alta al personal y probar en teléfonos reales.

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

1. **Invitar a la dueña como usuaria**: Authentication → Users → *Invite user*,
   así elige ella su propia contraseña.
2. **Habilitarla en `staff`** con el insert del README. Sin esto entra al panel
   pero no puede operar.
3. **Probar en un iPhone y un Android reales**, con cámara. Es lo único que no
   se puede verificar a distancia.

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
