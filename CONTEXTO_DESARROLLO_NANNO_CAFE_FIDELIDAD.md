# Nanno Café Fidelidad — Contexto para desarrollo

**Proyecto:** Nanno Café / Nano Café — sistema de fidelización digital
**Estado:** prototipo funcional + primera versión online conectada a Supabase
**Última actualización de este contexto:** 4 de septiembre de 2026

---

## 1. Qué necesidad resuelve

Nanno Café necesita reemplazar una tarjeta de fidelidad física por una tarjeta digital simple que permita:

- Identificar a cada cliente de manera única.
- Registrar los cafés comprados desde distintos celulares del negocio.
- Evitar que el cliente tenga que recordar o traer una tarjeta física.
- Mostrar al cliente su progreso.
- Entregar automáticamente el beneficio al completar el ciclo.
- Mantener un historial de operaciones para poder auditar cafés y regalos.

La idea debe ser **muy simple de usar en el mostrador**, especialmente en momentos de atención rápida.

---

## 2. Regla de negocio actual

La regla definida para el MVP es:

> **4 cafés comprados → el 5.º café es gratis.**

El cliente acumula 4 cafés. Al registrar el cuarto, el sistema marca que existe un regalo disponible. Al consumir el regalo, el ciclo vuelve a 0.

Importante: el QR **no guarda el número de cafés**. El QR únicamente identifica al cliente mediante un token único. El saldo real vive en la base de datos.

---

## 3. Cómo debería funcionar el flujo

### Alta de cliente

1. El personal entra al panel.
2. Selecciona “Nuevo cliente”.
3. Ingresa nombre y teléfono.
4. Se crea el cliente en la base de datos.
5. Se genera un `qr_token` único.
6. Se muestra la tarjeta/QR del cliente.
7. El cliente puede guardar ese QR en su celular.

### Compra posterior

1. El cliente muestra su QR.
2. El personal abre “Escanear QR”.
3. Se utiliza la cámara del celular del negocio.
4. El QR identifica al cliente.
5. El sistema consulta online su estado.
6. El personal pulsa “+1 café comprado”.
7. El backend actualiza el saldo y registra el evento.

### Al completar 4 cafés

- `coffees = 4`
- `free_coffee_available = true`
- Se muestra “Regalo disponible”.
- No se permite sumar otro café mientras el regalo siga pendiente.

### Uso del regalo

1. El personal identifica al cliente.
2. Pulsa “Marcar regalo utilizado”.
3. El backend verifica que exista un regalo.
4. Pone `coffees = 0`.
5. Pone `free_coffee_available = false`.
6. Registra `gift_redeemed` en el historial.

---

## 4. Arquitectura actual

La primera versión online está planteada como una **web responsive**, sin aplicación móvil nativa.

```text
                    ┌─────────────────────┐
                    │   Cliente            │
                    │   Guarda su QR       │
                    └──────────┬──────────┘
                               │ muestra QR
                               ▼
                    ┌─────────────────────┐
                    │ Celular del negocio  │
                    │ Escáner QR           │
                    └──────────┬──────────┘
                               │ token
                               ▼
                    ┌─────────────────────┐
                    │ Frontend web         │
                    │ HTML/CSS/JS          │
                    └──────────┬──────────┘
                               │ Supabase JS
                               ▼
                    ┌─────────────────────┐
                    │ Supabase Auth        │
                    │ + PostgreSQL         │
                    │ + RPC seguras        │
                    └─────────────────────┘
```

### Componentes actuales

- **Frontend:** HTML + CSS + JavaScript vanilla.
- **Backend / DB:** Supabase.
- **Base de datos:** PostgreSQL.
- **Autenticación:** Supabase Auth para el personal/admin.
- **QR:** token único por cliente.
- **Lectura QR:** `html5-qrcode`.
- **Generación QR:** librería `qrcode`.
- **Hosting previsto:** cualquier hosting HTTPS capaz de servir archivos estáticos.

No hay actualmente un backend Node/Express separado. La lógica sensible de modificación de saldo está implementada como funciones PostgreSQL (`RPC`) con `security definer`.

---

## 5. Modelo de datos actual

### `clients`

Campos principales:

| Campo | Tipo | Función |
|---|---|---|
| `id` | uuid | Identificador interno del cliente |
| `name` | text | Nombre del cliente |
| `phone` | text | Teléfono, opcional |
| `qr_token` | text | Identificador secreto/único utilizado por el QR |
| `coffees` | integer | Cafés acumulados, 0–4 |
| `free_coffee_available` | boolean | Indica si ya ganó el café gratis |
| `created_at` | timestamptz | Fecha de alta |

### `loyalty_events`

Historial de movimientos:

| Campo | Tipo | Función |
|---|---|---|
| `id` | bigint | ID del evento |
| `client_id` | uuid | Cliente afectado |
| `event_type` | text | `coffee` o `gift_redeemed` |
| `created_at` | timestamptz | Fecha/hora |
| `performed_by` | uuid | Usuario de Auth que realizó la operación |

---

## 6. Funciones PostgreSQL actuales

### `get_client_for_qr(p_qr_token text)`

Busca un cliente a partir de su QR.

Se permite ejecución para `anon` y `authenticated`, porque el cliente necesita poder consultar su tarjeta pública desde el QR.

### `add_coffee(p_client_id uuid)`

Función protegida que:

- exige usuario autenticado;
- bloquea la fila con `FOR UPDATE`;
- impide sumar si el regalo está pendiente;
- suma un café;
- al llegar a 4 activa `free_coffee_available`;
- registra el evento `coffee`.

### `redeem_gift(p_client_id uuid)`

Función protegida que:

- exige usuario autenticado;
- verifica que exista regalo disponible;
- reinicia el ciclo;
- registra `gift_redeemed`.

Las funciones de modificación están revocadas para `anon`.

---

## 7. Seguridad actual y puntos que el desarrollador debe revisar

La intención de seguridad es que **el navegador nunca tenga una `service_role` key**. Solo debe utilizarse la clave pública/anon de Supabase.

El SQL actual usa Row Level Security y funciones `security definer` para las operaciones sensibles.

### Revisar antes de producción

1. Confirmar que todas las funciones `security definer` tengan `search_path` controlado.
2. Revisar permisos exactos de cada función y tabla.
3. Confirmar que un usuario autenticado solo pueda realizar las operaciones administrativas previstas.
4. Evaluar si el QR debe seguir siendo un bearer token sin login del cliente.
5. Evaluar privacidad de `name` y `phone` en la consulta pública por QR.
6. Agregar restricciones/normalización de teléfono para evitar clientes duplicados.
7. Agregar auditoría suficiente para detectar modificaciones anómalas.
8. Agregar manejo de errores y estados offline.
9. No publicar credenciales privadas ni `service_role` en frontend.

El QR debe seguir identificando al cliente, **no contener el saldo**.

---

## 8. Interfaces existentes

### `index.html`

Panel administrativo:

- Login por email + contraseña.
- Cantidad de clientes.
- Cantidad de cafés registrados.
- Cantidad de regalos utilizados.
- Acceso a escaneo QR.
- Alta de cliente.
- Búsqueda por nombre/teléfono.
- Lista de clientes.

### `scan.html`

Pantalla de atención:

- Abre cámara.
- Escanea QR.
- Permite ingreso manual del código.
- Muestra cliente encontrado.
- Muestra progreso.
- Botón `+1 café comprado`.
- Botón `Marcar regalo utilizado` cuando corresponde.

### `customer.html`

Tarjeta pública del cliente:

- Nombre.
- Progreso de cafés.
- Estado del regalo.
- QR del cliente.
- Explicación de la regla: 4 cafés → 5.º gratis.

---

## 9. Prototipos anteriores

Hay dos etapas previas incluidas en el repositorio:

### Prototipo local

`nano_cafe_fidelidad_prototipo.zip`

Era una prueba completamente local usando `localStorage`.

Permitía:

- mostrar nombre;
- mostrar progreso;
- sumar cafés;
- reiniciar el ciclo;
- visualizar el concepto de tarjeta.

No era multi-dispositivo ni tenía base online.

### Primera versión web con Supabase

`nanno_cafe_fidelidad.html` y `nanno_cafe_fidelidad_qr.html`

Estas versiones fueron la transición hacia la arquitectura online.

---

## 10. Estado real del desarrollo al entregar al programador

### Ya resuelto / implementado

- [x] Concepto de tarjeta digital.
- [x] Regla 4 + 1 gratis.
- [x] Identificación mediante QR.
- [x] QR separado del saldo.
- [x] Base PostgreSQL en Supabase.
- [x] Tabla de clientes.
- [x] Tabla de historial.
- [x] Campo de regalo disponible.
- [x] Auth para personal.
- [x] RLS inicial.
- [x] RPC para sumar café.
- [x] RPC para usar regalo.
- [x] Pantalla administrativa.
- [x] Pantalla de escaneo.
- [x] Tarjeta pública del cliente.
- [x] Generación/visualización del QR.
- [x] Búsqueda por nombre/teléfono.
- [x] Alta de clientes.

### Falta para una versión realmente lista para producción

- [ ] Configurar proyecto Supabase real.
- [ ] Configurar Auth real.
- [ ] Configurar `config.js` con URL y anon key del proyecto.
- [ ] Publicar bajo HTTPS.
- [ ] Probar QR desde varios celulares reales.
- [ ] Probar permisos de cámara en iPhone/Android.
- [ ] Revisar seguridad/RLS con pruebas negativas.
- [ ] Evitar duplicados de clientes.
- [ ] Mejorar historial visible desde el panel.
- [ ] Añadir edición de cliente.
- [ ] Añadir baja/desactivación de cliente.
- [ ] Mejorar UX de estados de carga y errores.
- [ ] Definir recuperación de contraseña/admin.
- [ ] Definir estrategia de backups.
- [ ] Considerar PWA/instalación en pantalla de inicio.
- [ ] Considerar modo offline o tolerancia a mala conexión.
- [ ] Tests automatizados del flujo de fidelidad.

---

## 11. Decisiones importantes que NO deberían cambiarse sin consultar

1. **El QR identifica al cliente; no almacena el saldo.**
2. El saldo debe permanecer en la base online.
3. La operación de sumar café debe ser transaccional y auditable.
4. El cliente no debería poder autoadministrarse cafés desde su tarjeta pública.
5. El personal es quien registra la compra.
6. La experiencia debe funcionar muy rápido desde un celular.
7. El sistema debe poder utilizarse desde distintos celulares sin perder información.
8. El producto inicial es una web responsive; una app nativa puede evaluarse más adelante.

---

## 12. Próximo objetivo recomendado para desarrollo

Convertir la versión actual en un **MVP de producción**, priorizando:

### Prioridad 1 — Seguridad y consistencia

- Revisar RLS.
- Revisar RPC.
- Pruebas de autorización.
- Evitar duplicados.
- Auditoría.

### Prioridad 2 — Flujo de mostrador

- Escanear QR → identificar cliente → sumar café en 1–2 toques.
- Confirmación visual clara.
- Evitar doble toque/doble registro accidental.
- Mensajes claros cuando el regalo está disponible.

### Prioridad 3 — Gestión

- Historial por cliente.
- Fecha de cada café.
- Fecha de cada regalo utilizado.
- Estadísticas básicas.
- Editar/desactivar clientes.

### Prioridad 4 — Cliente

- Tarjeta digital más pulida.
- QR persistente.
- Estado del progreso.
- Aviso de regalo disponible.
- Posible PWA.

---

## 13. Estructura del repositorio entregado

```text
nanno-cafe-fidelidad/
├── CONTEXTO_DESARROLLO_NANNO_CAFE_FIDELIDAD.md
├── README_DESARROLLADOR.md
├── app/
│   ├── index.html
│   ├── scan.html
│   ├── customer.html
│   ├── app.js
│   ├── styles.css
│   ├── config.example.js
│   ├── config.js
│   └── supabase.sql
├── prototypes/
│   └── index.html
├── legacy/
│   ├── nanno_cafe_fidelidad.html
│   └── nanno_cafe_fidelidad_qr.html
└── assets/
    └── Fachada cálida de NANO Cafetería.png
```

Los archivos originales también se conservan en `originales/` para que el desarrollador pueda comparar versiones.

---

## 14. Nota para el desarrollador

Este proyecto comenzó como un prototipo sencillo y evolucionó a una primera arquitectura real con Supabase. No se busca simplemente “hacer una tarjeta QR”: el objetivo es construir un sistema de fidelización pequeño, rápido y confiable para el uso cotidiano de una cafetería.

El foco del MVP es **fiabilidad + simplicidad + trazabilidad**.
