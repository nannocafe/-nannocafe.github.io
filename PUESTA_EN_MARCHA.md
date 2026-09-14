# Puesta en marcha — para Nanno Café

Esta guía va desde cero hasta la app andando en el celular. Se hace toda desde
el navegador: no hay que instalar nada ni saber programar.

Son dos servicios, los dos gratis:

- **GitHub** — guarda el código y publica la página.
- **Supabase** — la base de datos donde viven los clientes y los cafés.

Las dos cuentas tienen que estar **a nombre de la cafetería**, con un mail del
negocio al que siempre tengas acceso. Son las llaves del sistema.

> ⏱️ Calculá 40 minutos la primera vez. Conviene hacerlo de una sentada y
> desde una computadora, aunque después se use todo del celular.

---

## Antes de empezar: elegí bien el nombre de usuario

La dirección de la app va a ser:

```
https://NOMBREDEUSUARIO.github.io/nanno-cafe/
```

Ese `NOMBREDEUSUARIO` es el de la cuenta de GitHub y **queda para siempre**,
porque es la dirección a la que apuntan los QR de los clientes. Si más adelante
se cambia, los QR que la gente ya guardó dejan de abrir.

Elegí algo sobrio y del negocio (`nannocafe`, `nanno-cafe`), no un apodo.

---

## Paso 1 — Crear la cuenta de GitHub

1. Entrá a [github.com](https://github.com) → **Sign up**.
2. Usá el mail del negocio y el nombre de usuario que elegiste arriba.
3. Confirmá el mail.
4. Activá la verificación en dos pasos cuando te la ofrezca.

## Paso 2 — Crear el repositorio

1. Arriba a la derecha, **+** → **New repository**.
2. **Repository name:** `nanno-cafe` (tal cual, en minúscula y con guión).
3. Dejalo en **Public**. Es necesario para que la publicación sea gratis.
   El código no tiene contraseñas adentro: lo que protege los datos son los
   permisos de la base, no que el código esté escondido.
4. No marques nada más. **Create repository**.

## Paso 3 — Darle acceso a Matías para que suba el código

1. En el repo: **Settings** → **Collaborators** → **Add people**.
2. Poné su usuario de GitHub.

Él sube el código y te avisa. El repositorio sigue siendo tuyo: podés sacarle
el acceso cuando quieras desde esa misma pantalla.

## Paso 4 — Crear la base de datos en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **Start your project**.
   Podés entrar con la cuenta de GitHub que acabás de crear.
2. **New project**. Nombre: `nanno-cafe`.
3. Te pide una contraseña para la base: generá una y **guardala** en el gestor
   de contraseñas. No es la que vas a usar para entrar al panel.
4. Región: **South America (São Paulo)**, que es la más cercana.
5. Tarda un par de minutos en crearse.

## Paso 5 — Crear las tablas

1. En Supabase, menú de la izquierda → **SQL Editor** → **New query**.
2. Abrí el archivo `app/supabase.sql` del repositorio, copiá **todo** el
   contenido y pegalo ahí.
3. **Run**.

Si lo corrés dos veces no pasa nada: no borra clientes ni historial.

## Paso 6 — Cerrar el registro público ⚠️

**Authentication** → **Sign In / Providers** → **Email** → desactivar
**"Enable signups"** → **Save**.

Si esto queda prendido, cualquier persona de internet puede crearse una cuenta
en tu proyecto. No podría operar (por el paso 8), pero es una puerta que
conviene tener cerrada.

## Paso 7 — Crear tu usuario del panel

**Authentication** → **Users** → **Add user** → **Create new user**.

Poné tu mail y una contraseña. Este es el usuario con el que vas a entrar al
panel todos los días. Marcá "Auto Confirm User" si te aparece la opción.

## Paso 8 — Habilitarte como personal ⚠️

Tener usuario **no alcanza** para operar: además hay que estar en la lista de
personal. Volvé al **SQL Editor**, pegá esto cambiando el mail por el tuyo y
dale **Run**:

```sql
insert into public.staff (user_id, email)
select id, email from auth.users where email = 'TUMAIL@ejemplo.com'
on conflict (user_id) do update set active = true;
```

Para sumar a una empleada: se le crea usuario (paso 7) y se repite esto con su
mail. Para sacarle el acceso a alguien:

```sql
update public.staff set active = false where email = 'elqueseva@ejemplo.com';
```

## Paso 9 — Anotar las dos claves

En Supabase: **Project Settings** (el engranaje) → **API**. Copiá:

- **Project URL** — algo como `https://abcdefgh.supabase.co`
- **anon / public** — una clave larga

> La otra clave, la `service_role`, **no se usa nunca** en este proyecto y no
> va en ningún archivo. Si alguna vez te la piden por mail o por chat, es
> estafa.

## Paso 10 — Completar la configuración

En GitHub, entrá al repositorio → carpeta `app` → archivo `config.js` → el
lápiz ✏️ arriba a la derecha.

Completá los valores y dejalo así (con tus datos reales):

```js
window.NANNO_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "la clave larga del paso 9",
  PUBLIC_BASE_URL: "https://NOMBREDEUSUARIO.github.io/nanno-cafe/",
  WHATSAPP_PREFIJO: "549"
};
```

**Commit changes** abajo de todo.

## Paso 11 — Publicar la página

1. En el repositorio: **Settings** → **Pages**.
2. En **Source**, elegí **GitHub Actions**.
3. Andá a la solapa **Actions**: vas a ver "Publicar la app" corriendo.
   Cuando termine con un tilde verde ✅, la página está online.

La primera publicación tarda un par de minutos. Después de cada cambio se
vuelve a publicar sola.

## Paso 12 — Probar de verdad, antes de repartir nada

Desde tu celular, con datos o wifi:

1. Abrí `https://NOMBREDEUSUARIO.github.io/nanno-cafe/` → te pide mail y
   contraseña (los del paso 7).
2. Cargá un cliente de prueba con tu propio teléfono.
3. Probá el botón de **WhatsApp**: te tiene que abrir el chat con el link ya
   escrito.
4. Abrí ese link: tenés que ver la tarjeta con el QR.
5. Desde el panel entrá a **Escanear** y apuntá a la pantalla de otro celular
   que muestre ese QR. La primera vez el navegador va a pedir permiso para usar
   la cámara: hay que darle **Permitir**.
6. Sumá 4 cafés y canjeá el regalo.
7. Repetilo en un iPhone y en un Android, que piden los permisos distinto.

Cuando termines, borrá el cliente de prueba desde Supabase
(**Table Editor** → `clients`).

Recién ahí empezá a cargar clientes reales.

---

## Guardátelo a mano

En el celular, con la página abierta: **Compartir** → **Agregar a inicio**.
Queda como si fuera una app, sin la barra del navegador.

---

## Cosas para tener en cuenta

**Si la cafetería cierra más de una semana**, Supabase pausa los proyectos
gratuitos por falta de uso. No se pierde nada: se entra a supabase.com y se le
da *Restore*, tarda unos minutos. Conviene saberlo antes de que pase un martes
a las 8 de la mañana.

**La dirección.** Mientras sea `github.io` está atada a esa cuenta de GitHub.
Si en algún momento querés independizarte de eso, se compra un dominio propio
(`nannocafe.com.ar`, unos pocos miles de pesos al año) y se apunta la página
ahí. Hacerlo **antes** de repartir tarjetas es gratis en esfuerzo; hacerlo
después obliga a que todos los QR ya repartidos sigan funcionando de alguna
forma. No es urgente, pero es la única decisión difícil de deshacer.

**Los datos de los clientes.** Guardás nombres y teléfonos, así que aplica la
Ley 25.326. Alcanza con avisarle a la gente para qué se los pedís y poder
borrarla si te lo pide.

**Respaldo.** Supabase hace copias automáticas. Igual, una vez por mes está
bueno entrar a **Table Editor** → `clients` → **Export to CSV** y guardarte ese
archivo.
