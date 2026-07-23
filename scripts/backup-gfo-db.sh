#!/bin/zsh

set -u

PROJECT="/Users/sgresleri/Documents/gfo-platform"
DATABASE="$PROJECT/backend/prisma/gfo.db"
BACKUP_DIR="$PROJECT/backups/automatic"
LOG_DIR="$PROJECT/.gfo-logs"
MAX_BACKUPS="${GFO_BACKUP_RETENTION_COUNT:-30}"

mkdir -p \
  "$BACKUP_DIR" \
  "$LOG_DIR"

if [[ ! -f "$DATABASE" ]]; then
  echo "Database non trovato: $DATABASE" >&2
  exit 1
fi

if [[ "$MAX_BACKUPS" != <-> ]] ||
   (( MAX_BACKUPS < 1 )); then
  echo "Numero di backup da conservare non valido: $MAX_BACKUPS" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/gfo-auto-$TIMESTAMP.db"
TEMP_FILE="$BACKUP_FILE.tmp"

rm -f "$TEMP_FILE"

python3 - \
  "$DATABASE" \
  "$TEMP_FILE" <<'PY'
import sqlite3
import sys
from pathlib import Path

source_path = Path(sys.argv[1])
backup_path = Path(sys.argv[2])

source = sqlite3.connect(
    f"file:{source_path}?mode=ro",
    uri=True,
)

backup = sqlite3.connect(
    backup_path,
)

try:
    source.backup(backup)

    result = backup.execute(
        "PRAGMA quick_check"
    ).fetchone()

    if not result or result[0] != "ok":
        raise RuntimeError(
            "Il controllo di integrità del backup non è riuscito."
        )
finally:
    backup.close()
    source.close()
PY

mv \
  "$TEMP_FILE" \
  "$BACKUP_FILE"

chmod 600 "$BACKUP_FILE"

python3 - \
  "$BACKUP_DIR" \
  "$MAX_BACKUPS" <<'PY'
import sys
from pathlib import Path

backup_dir = Path(sys.argv[1])
maximum = int(sys.argv[2])

backups = sorted(
    backup_dir.glob(
        "gfo-auto-*.db"
    ),
    key=lambda path:
        path.stat().st_mtime,
    reverse=True,
)

for old_backup in backups[maximum:]:
    old_backup.unlink()
PY

BACKUP_SIZE="$(
  du -h "$BACKUP_FILE" |
  awk '{print $1}'
)"

echo \
  "$(date '+%Y-%m-%d %H:%M:%S') | Backup creato: $BACKUP_FILE ($BACKUP_SIZE)" \
  | tee -a "$LOG_DIR/backup.log"
