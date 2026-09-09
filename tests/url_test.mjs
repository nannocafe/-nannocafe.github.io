import fs from 'node:fs';
const src = fs.readFileSync('app/app.js','utf8');
// Extraemos las dos funciones reales del archivo para probarlas tal cual están.
const ini = src.indexOf('  function baseTarjeta()');
const fin = src.indexOf('  /* ======================================================================\n     PANEL');
const codigo = src.slice(ini, fin);

let CONFIG, location;
const fabricar = (cfg, href) => {
  CONFIG = { PUBLIC_BASE_URL: cfg };
  location = { href };
  return new Function('CONFIG','location', codigo + '; return urlTarjeta;')(CONFIG, location);
};

const casos = [
  ['(vacío)', 'http://127.0.0.1:8788/index.html',  'http://127.0.0.1:8788/customer.html?id=TOK'],
  ['(vacío)', 'http://127.0.0.1:8788/',            'http://127.0.0.1:8788/customer.html?id=TOK'],
  ['(vacío)', 'http://127.0.0.1:8788/scan.html',   'http://127.0.0.1:8788/customer.html?id=TOK'],
  ['https://nanno.netlify.app',            'x', 'https://nanno.netlify.app/customer.html?id=TOK'],
  ['https://nanno.netlify.app/',           'x', 'https://nanno.netlify.app/customer.html?id=TOK'],
  ['https://nanno.netlify.app/index.html', 'x', 'https://nanno.netlify.app/customer.html?id=TOK'],
  ['  https://nanno.netlify.app  ',        'x', 'https://nanno.netlify.app/customer.html?id=TOK'],
  ['https://misitio.com/nanno',            'x', 'https://misitio.com/nanno/customer.html?id=TOK'],
  ['nanno.netlify.app', 'http://127.0.0.1:8788/index.html', 'http://127.0.0.1:8788/customer.html?id=TOK'],
];

let fallas = 0;
for (const [cfg, href, esperado] of casos) {
  const got = fabricar(cfg.trim() === '(vacío)' ? '' : cfg, href)('TOK');
  const ok = got === esperado;
  if (!ok) fallas++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} · base=${JSON.stringify(cfg).padEnd(38)} -> ${got}`);
}
console.log(fallas ? `\n${fallas} FALLAS` : '\nTodos los casos dan la URL correcta');
process.exit(fallas ? 1 : 0);
