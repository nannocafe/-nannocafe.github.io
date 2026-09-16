// El nombre del archivo que se descarga sale del nombre del cliente, que lo
// escribe una persona en el mostrador. Si se cuela una barra o un emoji, la
// descarga puede fallar o guardar cualquier cosa.
import fs from 'node:fs';
const src = fs.readFileSync('app/app.js', 'utf8');

const ini = src.indexOf('  const archivoTarjeta =');
const fin = src.indexOf('  /* Guarda la imagen por el mejor camino');
const archivoTarjeta = new Function(src.slice(ini, fin) + '; return archivoTarjeta;')();

let fallas = 0;
const caso = (entrada, espera, etiqueta) => {
  const got = archivoTarjeta(entrada);
  const ok = got === espera;
  console.log((ok ? 'OK    · ' : 'FALLA · ') + etiqueta + '  ->  ' + got);
  if (!ok) { fallas++; console.log('         esperaba: ' + espera); }
};

caso('Sofía Gutiérrez', 'Tarjeta Nanno Cafe - Sofía Gutiérrez.png', 'conserva tildes y ñ');
caso('Ana/María',       'Tarjeta Nanno Cafe - AnaMaría.png',        'saca la barra que rompe la ruta');
caso('Juan 🙂',         'Tarjeta Nanno Cafe - Juan.png',            'saca el emoji');
caso('  Pedro  ',       'Tarjeta Nanno Cafe - Pedro.png',           'recorta los espacios de los bordes');
caso('',                'Tarjeta Nanno Cafe - cliente.png',         'sin nombre usa "cliente"');
caso(null,              'Tarjeta Nanno Cafe - cliente.png',         'nombre nulo no rompe');
caso('José 3',          'Tarjeta Nanno Cafe - José 3.png',          'deja los números');
caso('..\\..\\etc',       'Tarjeta Nanno Cafe - etc.png',             'no deja armar una ruta hacia arriba');

const largo = archivoTarjeta('A'.repeat(200));
const okLargo = largo.length < 80;
console.log((okLargo ? 'OK    · ' : 'FALLA · ') + 'un nombre larguísimo no desborda  (' + largo.length + ' chars)');
if (!okLargo) fallas++;

console.log(fallas ? `\n${fallas} fallas` : '\nNombres de archivo: todo bien');
process.exit(fallas ? 1 : 0);
