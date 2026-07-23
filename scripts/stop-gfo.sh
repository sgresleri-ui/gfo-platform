#!/bin/zsh

set -u

PROJECT="/Users/sgresleri/Documents/gfo-platform"
LOG_DIR="$PROJECT/.gfo-logs"
SILENT="${1:-}"

mkdir -p "$LOG_DIR"

terminate_process_tree() {
  local ROOT_PID="$1"

  [[ "$ROOT_PID" == <-> ]] || return 0

  /usr/bin/python3 - "$ROOT_PID" <<'PY'
import os
import signal
import subprocess
import sys
import time

root = int(sys.argv[1])

try:
    output = subprocess.check_output(
        ["ps", "-axo", "pid=,ppid="],
        text=True,
    )
except Exception:
    output = ""

children = {}

for line in output.splitlines():
    parts = line.split()

    if len(parts) != 2:
        continue

    try:
        pid = int(parts[0])
        parent = int(parts[1])
    except ValueError:
        continue

    children.setdefault(parent, []).append(pid)

processes = []
pending = [root]
seen = set()

while pending:
    pid = pending.pop()

    if pid in seen:
        continue

    seen.add(pid)
    processes.append(pid)
    pending.extend(children.get(pid, []))

# Ferma prima il processo padre, impedendo al watcher
# di generare nuovi processi figli.
for pid in processes:
    try:
        os.kill(pid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        pass

time.sleep(1.5)

for pid in reversed(processes):
    try:
        os.kill(pid, 0)
    except (ProcessLookupError, PermissionError):
        continue

    try:
        os.kill(pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass
PY
}

for PID_FILE in \
  "$LOG_DIR/backend.pid" \
  "$LOG_DIR/frontend.pid"
do
  if [[ -f "$PID_FILE" ]]; then
    PID="$(tr -d '[:space:]' < "$PID_FILE")"
    terminate_process_tree "$PID"
  fi
done

# Recupera anche eventuali watcher rimasti attivi
# dopo arresti precedenti.
for PATTERN in \
  "$PROJECT/backend/node_modules/.bin/nest" \
  "$PROJECT/frontend/node_modules/.bin/vite"
do
  for PID in $(pgrep -f "$PATTERN" 2>/dev/null); do
    terminate_process_tree "$PID"
  done
done

# Ultimo controllo sulle porte applicative.
for PORT in 3000 5173; do
  for PID in $(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null); do
    terminate_process_tree "$PID"
  done
done

rm -f \
  "$LOG_DIR/backend.pid" \
  "$LOG_DIR/frontend.pid"

if [[ "$SILENT" != "--silent" ]]; then
  osascript -e \
    'display notification "GFO Platform arrestata." with title "GFO Platform"'
fi
