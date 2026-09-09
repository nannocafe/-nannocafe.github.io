// Copiá este archivo como config.js y completá los tres valores.
// La anon key es pública: va en el navegador a propósito y no es un secreto.
// La service_role key NUNCA va acá ni en ningún archivo de esta carpeta.
window.NANNO_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY",

  // Dirección definitiva donde va a estar publicada la app.
  // Los QR de los clientes apuntan acá, así que conviene definirla ANTES
  // de empezar a repartir tarjetas. Si se deja vacío usa la dirección actual.
  PUBLIC_BASE_URL: ""
};
