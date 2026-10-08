// Texto de la invitación por WhatsApp a clientes que vienen poco.
// Se prueba la función tal cual está escrita en app/app.js.
import fs from 'node:fs';
const src = fs.readFileSync('app/app.js', 'utf8');
const ini = src.indexOf('  function textoInvitacion(');
const fin = src.indexOf('  function linkInvitacion(');
const texto = new Function('CICLO', 'urlTarjeta',
  src.slice(ini, fin) + '; return textoInvitacion;')(4, t => `https://nanno/customer.html?id=${t}`);

const base = { name: 'Sofía Pérez', qr_token: 'TOK', coffees: 0, coffees_total: 0,
               free_coffee_available: false, favorite_coffee: null };

const casos = [
  ['saluda solo por el nombre de pila', base, t => t.startsWith('¡Hola Sofía! ☕')],
  ['siempre manda el link de la tarjeta', base, t => t.includes('https://nanno/customer.html?id=TOK')],
  ['nunca vino: le explica la tarjeta', base, t => t.includes('Todavía no estrenaste') && t.includes('5.º es gratis')],
  ['con favorito: lo nombra en minúscula', { ...base, coffees_total: 6, coffees: 2, favorite_coffee: 'Flat white' },
    t => t.includes('¿Se viene un flat white esta semana?')],
  ['sin favorito: dice cafecito', { ...base, coffees_total: 6, coffees: 2 }, t => t.includes('cafecito')],
  ['le cuenta los sellos que tiene y los que faltan', { ...base, coffees_total: 6, coffees: 2 },
    t => t.includes('Ya tenés 2 sellos') && t.includes('te faltan 2 para el café de regalo')],
  ['singular con 1 sello y 3 faltantes', { ...base, coffees_total: 1, coffees: 1 },
    t => t.includes('Ya tenés 1 sello en') && t.includes('te faltan 3')],
  ['singular con 1 faltante', { ...base, coffees_total: 3, coffees: 3 }, t => t.includes('te falta 1 para')],
  ['tarjeta en 0 después de un regalo', { ...base, coffees_total: 8, coffees: 0 },
    t => t.includes('Con cada café sumás un sello') && !t.includes('estrenaste')],
  ['regalo pendiente: va primero', { ...base, coffees_total: 4, coffees: 4, free_coffee_available: true },
    t => t.includes('¡Tenés un café de regalo esperándote!') && !t.includes('sellos')],
  ['no promete descuentos', { ...base, coffees_total: 6, coffees: 2 }, t => !/descuento|%|off/i.test(t)],
  ['nombre vacío no rompe', { ...base, name: '' }, t => t.startsWith('¡Hola ! ☕') || t.startsWith('¡Hola! ☕')],
];

let fallas = 0;
for (const [nombre, cliente, ok] of casos) {
  const t = texto(cliente);
  const bien = ok(t);
  if (!bien) { fallas++; console.log(t); }
  console.log(`${bien ? 'OK   ' : 'FALLA'} · ${nombre}`);
}
console.log('\nEjemplo:\n' + texto({ ...base, coffees_total: 6, coffees: 2, favorite_coffee: 'Flat white' }));
console.log(fallas ? `\n${fallas} FALLAS` : '\nInvitaciones: todo bien');
process.exit(fallas ? 1 : 0);
