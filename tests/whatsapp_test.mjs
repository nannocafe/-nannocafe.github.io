// Normalización de teléfonos argentinos para wa.me.
// Se prueba la función tal cual está escrita en app/app.js.
import fs from 'node:fs';
const src = fs.readFileSync('app/app.js', 'utf8');
const ini = src.indexOf('  function telefonoWhatsApp(');
const fin = src.indexOf('  function linkWhatsApp(');
const fn = new Function('CONFIG', src.slice(ini, fin) + '; return telefonoWhatsApp;')({});

const casos = [
  // [ como lo escribe el personal,        esperado ]
  ['11 2345-6789',            '5491123456789'],  // el formato normal
  ['1123456789',              '5491123456789'],  // todo junto
  ['+54 9 11 2345 6789',      '5491123456789'],  // internacional completo
  ['+54 11 2345-6789',        '5491123456789'],  // internacional sin el 9
  ['5491123456789',           '5491123456789'],  // ya normalizado
  ['011 15 2345-6789',        '5491123456789'],  // con 0 y 15, área de 2
  ['0351 15 234-5678',        '5493512345678'],  // Córdoba, área de 3
  ['02604 15 12-3456',        '5492604123456'],  // área de 4
  ['0054 9 11 2345 6789',     '5491123456789'],  // con 00 adelante
  ['(11) 2345-6789',          '5491123456789'],  // con paréntesis
  ['11 2345 6789 ',           '5491123456789'],  // con espacios de más
  ['',                        null],             // vacío
  [null,                      null],             // sin teléfono
  ['1234',                    null],             // muy corto, no se manda
  ['sin numero',              null],             // texto suelto
];

let fallas = 0;
for (const [entrada, esperado] of casos) {
  const got = fn(entrada);
  const ok = got === esperado;
  if (!ok) fallas++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} · ${JSON.stringify(entrada).padEnd(24)} -> ${got}`);
}
console.log(fallas ? `\n${fallas} FALLAS` : '\nTodos los formatos de teléfono se normalizan bien');
process.exit(fallas ? 1 : 0);
