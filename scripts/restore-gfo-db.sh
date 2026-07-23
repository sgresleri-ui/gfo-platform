#!/bin/zsh

set -eu

PROJECT="/Users/sgresleri/Documents/gfo-platform"
DATABASE="$PROJECT/backend/prisma/gfo.db"
BACKUP_DIR="$PROJECT/backups/automatic"
LOG_DIR="$PROJECT/.gfo-logs"

STOP_SCRIPT="$PROJECT/scripts/stop-gfo.sh"
BACKUP_SCRIPT="$PROJECT/scripts/backup-gfo-db.sh"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

show_backups() {
  echo
  echo "Backup disponibili:"
  echo

  python3 - "$BACKUP_DIR" <<'PY'
import sys
from datetime import datetime
from pathlib import Path

backup_dir = Path(sys.argv[1])

backups = sorted(
    backup_dir.glob("gfo-auto-*.db"),
    key=lambda path: path.stat().st_mtime,
    reverse=True,
)

if not backups:
    print("  Nessun backup disponibile.")
    raise SystemExit(0)

for index, backup in enumerate(backups[:20], start=1):
    stat = backup.stat()
    timestamp = datetime.fromtimestamp(
        stat.st_mtime
    ).strftime("%Y-%m-%d %H:%M:%S")

    size_mb = stat.st_size / (1024 * 1024)

    print(
        f"  {index:2}. {backup.name}  "
        f"{timestamp}  {size_mb:.1f} MB"
    )
PY
}

usage() {
  echo "Uso:"
  echo
  echo "  ./scripts/restore-gfo-db.sh --latest"
  echo "  ./scripts/restore-gfo-db.sh NOME_BACKUP.db"
  echo "  ./scripts/restore-gfo-db.sh /percorso/completo/backup.db"

  show_backups
}

validate_database() {
  local FILE_TO_CHECK="$1"

  python3 - "$FILE_TO_CHECK" <<'PY'
import sqlite3
import sys
from pathlib import Path

database_path = Path(sys.argv[1])

if not database_path.is_file():
    raise SystemExit(
        f"File non trovato: {database_path}"
    )

connection = sqlite3.connect(
    f"file:{database_path}?mode=ro",
    uri=True,
)

try:
    result = connection.execute(
        "PRAGMA quick_check"
    ).fetchone()

    if not result or result[0] != "ok":
        raise RuntimeError(
            "Controllo di integrità SQLite non superato."
        )
finally:
    connection.close()
PY
}

if (( $# != 1 )); then
  usage
  exit 1
fi

REQUESTED_BACKUP="$1"
SELECTED_BACKUP=""

if [[ "$REQUESTED_BACKUP" == "--latest" ]]; then
  SELECTED_BACKUP="$(
    python3 - "$BACKUP_DIR" <<'PY'
import sys
from pathlib import Path

backup_dir = Path(sys.argv[1])

backups = sorted(
    backup_dir.glob("gfo-auto-*.db"),
    key=lambda path: path.stat().st_mtime,
    reverse=True,
)

if not backups:
    raise SystemExit(1)

print(backups[0])
PY
  )"
elif [[ -f "$REQUESTED_BACKUP" ]]; then
  SELECTED_BACKUP="$REQUESTED_BACKUP"
elif [[ -f "$BACKUP_DIR/$REQUESTED_BACKUP" ]]; then
  SELECTED_BACKUP="$BACKUP_DIR/$REQUESTED_BACKUP"
else
  echo "Backup non trovato: $REQUESTED_BACKUP" >&2
  usage
  exit 1
fi

SELECTED_BACKUP="$(
  python3 - "$SELECTED_BACKUP" <<'PY'
import sys
from pathlib import Path

print(Path(sys.argv[1]).resolve())
PY
)"

echo "Backup selezionato:"
echo "  $SELECTED_BACKUP"
echo

echo "Verifica integrità del backup..."
validate_database "$SELECTED_BACKUP"

echo "Arresto della GFO Platform..."
"$STOP_SCRIPT" --silent

if [[ -f "$DATABASE" ]]; then
  echo "Creazione backup preventivo del database corrente..."

  if ! "$BACKUP_SCRIPT"; then
    echo \
      "Backup preventivo non riuscito. Ripristino annullato." \
      >&2
    exit 1
  fi
fi

TEMP_DATABASE="$DATABASE.restore-tmp"

rm -f "$TEMP_DATABASE"

echo "Ripristino del database..."

cp "$SELECTED_BACKUP" "$TEMP_DATABASE"
chmod 600 "$TEMP_DATABASE"

validate_database "$TEMP_DATABASE"

mv "$TEMP_DATABASE" "$DATABASE"
chmod 600 "$DATABASE"

validate_database "$DATABASE"

RESTORE_TIME="$(date '+%Y-%m-%d %H:%M:%S')"

echo \
  "$RESTORE_TIME | Database ripristinato da: $SELECTED_BACKUP" \
  | tee -a "$LOG_DIR/restore.log"

echo
echo "Ripristino completato correttamente."
echo
echo "Per riavviare la piattaforma:"
echo
echo "  ./scripts/start-gfo.sh"
