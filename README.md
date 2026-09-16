# Nanno Café · Tarjeta de fidelidad

Tarjeta de fidelidad digital: el cliente junta **4 cafés y el 5.º es gratis**.
El cliente guarda un QR en el celular; el personal lo escanea desde el mostrador.

- `app/index.html` — panel del personal (clientes, altas, historial, estadísticas)
- `app/scan.html` — pantalla de mostrador (escanear y sumar café)
- `app/customer.html` — tarjeta pública del cliente, con su QR
- `app/supabase.sql` — toda la base de datos y los permisos
- `tests/` — pruebas automáticas del esquema

La documentación original del proyecto (del 4/9/2026) sigue en
`CONTEXTO_DESARROLLO_NANNO_CAFE_FIDELIDAD.md`, `ESTADO_PROYECTO.md` y
`README_DESARROLLADOR.md`.

> **¿Sos de Nanno Café y lo estás instalando por primera vez?**
> Seguí [`PUESTA_EN_MARCHA.md`](PUESTA_EN_MARCHA.md), que es la misma
> receta explicada paso a paso y sin tecnicismos.

---

## Puesta en marcha

Hay que hacer estos pasos **en orden**. Los pasos 3 y 5 son los que hacen que
un desconocido no pueda entrar: no se los puede saltear.

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com), proyecto nuevo. Anotar de
**Project Settings → API**:

- la **Project URL**
- la clave **anon / public**

> La otra clave, la `service_role`, no se usa nunca en este proyecto.
> No va en ningún archivo de esta carpeta.

### 2. Crear las tablas

En el **SQL Editor** de Supabase, pegar todo el contenido de `app/supabase.sql`
y darle *Run*. Se puede volver a correr cuantas veces haga falta: no borra
clientes ni historial.

### 3. Apagar el registro público ⚠️

**Authentication → Sign In / Providers → Email → desactivar "Enable signups".**

Si esto queda prendido, cualquier persona de internet puede crearse una cuenta
en el proyecto. Las cuentas nuevas no podrían operar (ver paso 5), pero es una
puerta que conviene tener cerrada.

### 4. Crear el usuario del personal

**Authentication → Users → Add user**, con email y contraseña.
Este es el usuario con el que se entra al panel.

### 5. Habilitar a ese usuario como personal ⚠️

Estar registrado **no alcanza** para operar: además hay que estar en la tabla
`staff`. En el SQL Editor, cambiando el mail por el real:

```sql
insert into public.staff (user_id, email)
select id, email from auth.users where email = 'elmaildelacafeteria@ejemplo.com'
on conflict (user_id) do update set active = true;
```

Para sumar a alguien más (un empleado), se repite con su mail.
Para sacarle el acceso a alguien:

```sql
update public.staff set active = false where email = 'elqueseva@ejemplo.com';
```

### 6. Completar la configuración

Copiar `app/config.example.js` a `app/config.js` y poner la URL y la anon key
del paso 1.

### 7. Publicar en GitHub Pages

El repositorio tiene que vivir en la cuenta de GitHub **de la cafetería**, no
en la de quien desarrolla: la dirección publicada queda grabada en los QR de
los clientes.

En el repositorio: **Settings** → **Pages** → en *Source*, elegir
**GitHub Actions**. El workflow `.github/workflows/pages.yml` publica la
carpeta `app/` en cada push a `main`.

La dirección queda:

```
https://nannocafe.github.io/
```

**Tiene que ser HTTPS.** Los navegadores no dejan usar la cámara en sitios sin
candado, así que el escáner no funciona en `http://`. GitHub Pages ya sirve
todo por HTTPS.

Para un dominio propio (`nannocafe.com.ar`), se agrega en **Settings → Pages →
Custom domain** y se apunta el DNS. Conviene decidirlo antes de repartir la
primera tarjeta.

### 8. Fijar la dirección definitiva

Una vez publicado, poner esa dirección en `PUBLIC_BASE_URL` dentro de
`config.js` y volver a subir:

```js
PUBLIC_BASE_URL: "https://nannocafe.github.io/"
```

En el mismo archivo está `WHATSAPP_PREFIJO`, que ya viene en `"549"`
(celulares de Argentina) y solo hay que tocarlo si el negocio no está acá.

Los QR de los clientes apuntan a esa dirección. Conviene dejarla fija **antes**
de repartir la primera tarjeta, porque si después se cambia de hosting, los QR
que la gente ya guardó dejan de abrir.

### 9. Probar

1. Entrar al panel con el usuario del paso 4.
2. Crear un cliente de prueba → aparece su tarjeta con el QR.
3. Probar el botón "Enviar por WhatsApp": tiene que abrir el chat con el
   link de la tarjeta ya escrito.
4. Abrir `scan.html` desde el celular y escanear ese QR.
5. Sumar 4 cafés y canjear el regalo.
6. Probarlo en un iPhone y en un Android: los permisos de cámara se piden
   distinto en cada uno.

---

## Cómo le llega la tarjeta al cliente

Apenas se crea un cliente aparece una pantalla con tres formas de entregársela,
para no depender de que se acuerde de guardar el link:

- **Escaneando el QR de la pantalla** con la cámara de su propio celular.
- **Por WhatsApp**, con el mensaje y el link ya escritos (necesita el teléfono cargado).
- **Abriendo la tarjeta** para mostrársela.

Si después la pierde, se lo busca en el panel y desde su ficha se le puede
volver a mandar.

## Cómo funcionan los permisos

Hay tres niveles y cada uno puede hacer solo lo suyo:

| Quién | Puede | No puede |
|---|---|---|
| Cualquiera con el link de una tarjeta | Ver esa tarjeta: nombre, progreso y QR | Ver el teléfono, ver otras tarjetas, sumarse cafés |
| Usuario registrado que no es personal | Nada | Nada: ni ver clientes ni tocar saldos |
| Personal (en la tabla `staff`) | Todo el panel y el mostrador | Editar saldos a mano en la tabla |

El saldo de cafés **no se puede escribir directamente** desde el navegador.
Solo lo cambian las funciones `add_coffee` y `redeem_gift`, que verifican
permisos, bloquean la fila mientras operan y dejan registro de quién hizo qué.

## Correr las pruebas

```bash
./tests/run.sh
```

Levanta un PostgreSQL descartable, le aplica `app/supabase.sql` y verifica 20
cosas: que un intruso no pueda leer ni tocar nada, que la regla de 4+1 funcione,
que no se pueda canjear dos veces el mismo regalo, que el doble toque no cuente
doble y que dar de baja a un cliente no borre su historial.
No toca la base real. Requiere `brew install postgresql@16`.

## Datos personales

La base guarda nombres y teléfonos de clientes, así que aplica la
**Ley 25.326 de Protección de Datos Personales**. Conviene avisarle al cliente
para qué se usan sus datos cuando se lo da de alta, y poder borrarlo si lo pide
(el botón "Dar de baja" lo saca del panel; para borrarlo del todo hay que
eliminarlo desde Supabase).
