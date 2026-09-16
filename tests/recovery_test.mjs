// Prueba la lectura del hash con el que vuelven los mails de auth y la
// traducción de sus errores. Se extrae el código real de app.js, no una copia.
import fs from 'node:fs';
const src = fs.readFileSync('app/app.js', 'utf8');

// --- bloque que lee el hash, tal cual está en el archivo ---
const iniHash = src.indexOf('  const HASH_ENTRADA');
const finHash = src.indexOf('  const sb = window.supabase');
const codigoHash = src.slice(iniHash, finHash);

const leerHash = href => new Function('location',
  codigoHash + '; return { recuperacion: ES_RECUPERACION, error: ERROR_DEL_MAIL };'
)({ hash: href });

// --- la función que traduce los errores del mail ---
const iniMsg = src.indexOf('  function mensajeDelMail(');
const finMsg = src.indexOf('  /* Dirección del panel');
const mensajeDelMail = new Function(src.slice(iniMsg, finMsg) + '; return mensajeDelMail;')();

let fallas = 0;
const ok = (cond, etiqueta) => {
  console.log((cond ? 'OK    · ' : 'FALLA · ') + etiqueta);
  if (!cond) fallas++;
};

// El hash real que manda Supabase al recuperar la contraseña.
const recuperar = '#access_token=abc123&expires_in=3600&refresh_token=xyz&type=recovery';
ok(leerHash(recuperar).recuperacion === true, 'reconoce un link de recuperación');
ok(leerHash(recuperar).error === '',          'un link válido no trae error');

// El hash real del error que dio la invitación vencida.
const vencido = '#error=access_denied&error_code=otp_expired' +
                '&error_description=Email+link+is+invalid+or+has+expired';
ok(leerHash(vencido).recuperacion === false, 'un link vencido no abre el cambio de contraseña');
ok(leerHash(vencido).error !== '',           'detecta que el mail volvió con error');

ok(leerHash('').recuperacion === false,       'sin hash no es recuperación');
ok(leerHash('').error === '',                 'sin hash no hay error');
ok(leerHash('#type=signup').recuperacion === false, 'un link de alta no es de recuperación');

// Los mensajes tienen que estar en castellano y decir qué hacer.
const m = mensajeDelMail('Email+link+is+invalid+or+has+expired');
ok(/una sola vez|vencen/.test(m),  'el link vencido se explica en castellano');
ok(!/\+/.test(m),                  'no quedan los + de la URL en el mensaje');
ok(/olvidaste/i.test(m),           'le dice al usuario cómo pedir uno nuevo');
ok(!/\+/.test(mensajeDelMail('algo+raro+del+servidor')), 'limpia los + de cualquier mensaje');

console.log(fallas ? `\n${fallas} fallas` : '\nRecuperación de contraseña: todo bien');
process.exit(fallas ? 1 : 0);
