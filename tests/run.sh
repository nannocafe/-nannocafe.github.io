#!/usr/bin/env bash
# Corre los tests del esquema contra un PostgreSQL descartable.
# No toca la base real de Supabase.
#
#   ./tests/run.sh
#
# Requiere postgresql instalado (brew install postgresql@16).
set -euo pipefail
cd "$(dirname "$0")/.."

for d in /usr/local/opt/postgresql@1*/bin /opt/homebrew/opt/postgresql@1*/bin; do
  [ -d "$d" ] && PATH="$d:$PATH"
done
command -v initdb >/dev/null || { echo "Falta PostgreSQL. Instalalo con: brew install postgresql@16"; exit 1; }

# puerto libre al azar, para no chocar con otro PostgreSQL de la máquina
PORT=$(python3 -c "import socket;s=socket.socket();s.bind(('',0));print(s.getsockname()[1]);s.close()")
DATA=$(mktemp -d)/pgdata
SOCK=$(mktemp -d)
cleanup() { pg_ctl -D "$DATA" -o "-k $SOCK" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA" "$SOCK"; }
trap cleanup EXIT

echo "Levantando PostgreSQL temporal…"
initdb -D "$DATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$DATA" -o "-p $PORT -k $SOCK" -l "$DATA/log" start >/dev/null || { cat "$DATA/log"; exit 1; }
sleep 2

q() { psql -h "$SOCK" -p $PORT -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
q -c "create database nanno;" >/dev/null
q -d nanno -f tests/_supabase_shim.sql   >/dev/null 2>&1
q -d nanno -f app/supabase.sql           >/dev/null 2>&1
q -d nanno -f tests/_supabase_grants.sql >/dev/null 2>&1

psql -h "$SOCK" -p $PORT -U postgres -d nanno -v ON_ERROR_STOP=1 -f tests/schema_test.sql 2>&1 \
  | grep -vE "^(SET|INSERT|DO|RESET)$" \
  | sed 's|psql:tests/schema_test.sql:[0-9]*: NOTICE:  ||'

# ---- pruebas de JavaScript (solo si hay node instalado) ----
if command -v node >/dev/null; then
  echo
  echo '################ 7. LINKS DE LAS TARJETAS (regresión) ################'
  node --check app/app.js && echo 'OK · app.js no tiene errores de sintaxis'
  node tests/url_test.mjs
else
  echo; echo '(sin node: se saltean las pruebas de JavaScript)'
fi
