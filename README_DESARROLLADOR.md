# Nanno Café Fidelidad — entrega para desarrollador

Este repositorio contiene el estado del proyecto hasta el 4/09/2026.

## Empezar por

1. Leer `CONTEXTO_DESARROLLO_NANNO_CAFE_FIDELIDAD.md`.
2. Revisar `app/supabase.sql`.
3. Revisar `app/app.js`.
4. Abrir `app/index.html`, `app/scan.html` y `app/customer.html`.
5. Revisar `prototypes/` y `legacy/` solo como referencia histórica.

## Stack actual

- HTML/CSS/JavaScript vanilla
- Supabase
- PostgreSQL
- Supabase Auth
- QRCode
- html5-qrcode

## Regla de negocio

4 cafés comprados → 5.º gratis.

El QR contiene únicamente un token identificador; el saldo vive en PostgreSQL.

## Configuración

Copiar `app/config.example.js` a `config.js` y completar la URL y anon key del proyecto Supabase.

**Nunca utilizar la `service_role` key en el frontend.**

## Estado

Es una primera versión funcional/prototipo online. Antes de producción hay que revisar seguridad, RLS, UX, pruebas multi-dispositivo, duplicados y manejo de errores.
