#!/bin/zsh

set -u

PROJECT="/Users/sgresleri/Documents/gfo-platform"
LOG_DIR="$PROJECT/.gfo-logs"

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

nohup /bin/zsh -lc \
  "cd '$PROJECT/backend' && exec npm run start:dev" \
  > "$LOG_DIR/backend.log" \
  2>&1 &

echo $! > "$LOG_DIR/backend.pid"

nohup /bin/zsh -lc \
  "cd '$PROJECT/frontend' && exec npm run dev -- --host 127.0.0.1" \
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
    open "http://localhost:5173"

    osascript -e \
      'display notification "Backend e frontend avviati correttamente." with title "GFO Platform"'

    exit 0
  fi

  sleep 1
done

open "$LOG_DIR"

osascript -e \
  'display alert "GFO Platform" message "Avvio non completato. Controlla i file di log nella cartella aperta." as warning'

exit 1
