#!/bin/zsh

set -u

PROJECT="/Users/sgresleri/Documents/gfo-platform"
LOG_DIR="$PROJECT/.gfo-logs"
REQUESTED_MODE="${1:-local}"

case "$REQUESTED_MODE" in
  local)
    NETWORK_MODE="local"
    FRONTEND_HOST="127.0.0.1"
    ACCESS_URL="http://localhost:5173"
    ;;
  lan|iphone)
    NETWORK_MODE="lan"
    FRONTEND_HOST="0.0.0.0"

    DEFAULT_INTERFACE="$(
      route -n get default 2>/dev/null |
        awk '/interface:/{print $2; exit}'
    )"
    LAN_IP="$(ipconfig getifaddr "$DEFAULT_INTERFACE" 2>/dev/null || true)"

    if [[ -z "$LAN_IP" ]]; then
      osascript -e \
        'display alert "GFO Platform" message "Impossibile rilevare l’indirizzo della rete locale. Verifica che il Mac sia collegato al Wi-Fi." as warning'
      exit 1
    fi

    ACCESS_URL="http://$LAN_IP:5173"
    ;;
  *)
    echo "Uso: ./scripts/start-gfo.sh [local|lan]"
    exit 2
    ;;
esac

mkdir -p "$LOG_DIR"

"$PROJECT/scripts/stop-gfo.sh" --silent

if ! "$PROJECT/scripts/backup-gfo-db.sh"; then
  open "$LOG_DIR"

  osascript -e \
    'display alert "GFO Platform" message "Backup automatico del database non riuscito. Avvio interrotto per sicurezza." as warning'

  exit 1
fi

# NestJS ricostruirà dist da zero, senza watcher concorrenti.
rm -rf "$PROJECT/backend/dist"

: > "$LOG_DIR/backend.log"
: > "$LOG_DIR/frontend.log"

if ! (
  cd "$PROJECT/backend" &&
  npx prisma generate &&
  npx prisma migrate deploy
) >> "$LOG_DIR/backend.log" 2>&1; then
  open "$LOG_DIR"

  osascript -e \
    'display alert "GFO Platform" message "Aggiornamento Prisma o database non riuscito. Il backup è stato conservato e l’avvio è stato interrotto." as warning'

  exit 1
fi

nohup /bin/zsh -lc \
  "cd '$PROJECT/backend' && export GFO_NETWORK_MODE='$NETWORK_MODE' && exec npm run start:dev" \
  > "$LOG_DIR/backend.log" \
  2>&1 &

echo $! > "$LOG_DIR/backend.pid"

nohup /bin/zsh -lc \
  "cd '$PROJECT/frontend' && exec npm run dev -- --host '$FRONTEND_HOST'" \
  > "$LOG_DIR/frontend.log" \
  2>&1 &

echo $! > "$LOG_DIR/frontend.pid"

for ATTEMPT in {1..45}; do
  BACKEND_READY=false
  FRONTEND_READY=false

  curl -fsS \
    "http://127.0.0.1:3000/budget" \
    >/dev/null 2>&1 && \
    BACKEND_READY=true

  curl -fsS \
    "http://127.0.0.1:5173" \
    >/dev/null 2>&1 && \
    FRONTEND_READY=true

  if [[ "$BACKEND_READY" == true &&
        "$FRONTEND_READY" == true ]]; then
    print -r -- "$ACCESS_URL" > "$LOG_DIR/access-url.txt"
    open "$ACCESS_URL"

    if [[ "$NETWORK_MODE" == "lan" ]]; then
      print -rn -- "$ACCESS_URL" | pbcopy
      osascript -e \
        "display notification \"Indirizzo iPhone copiato: $ACCESS_URL\" with title \"GFO Platform\""
    else
      osascript -e \
        'display notification "Backend e frontend avviati correttamente." with title "GFO Platform"'
    fi

    exit 0
  fi

  sleep 1
done

open "$LOG_DIR"

osascript -e \
  'display alert "GFO Platform" message "Avvio non completato. Controlla i file di log nella cartella aperta." as warning'

exit 1
