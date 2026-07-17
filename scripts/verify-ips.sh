#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== GFO IPS INTEGRITY CHECK ==="
echo "Backend: $BASE_URL"
echo

check_endpoint() {
  local endpoint="$1"
  local output="$2"

  echo "Controllo $endpoint..."

  curl -fsS \
    "$BASE_URL$endpoint" \
    -o "$output"

  python3 -m json.tool \
    "$output" \
    >/dev/null

  echo "OK"
}

check_endpoint \
  "/ips/compliance" \
  "/tmp/gfo-ips-compliance.json"

check_endpoint \
  "/ips/classifications" \
  "/tmp/gfo-ips-classifications.json"

check_endpoint \
  "/ips/classifications/audit" \
  "/tmp/gfo-ips-classification-audit.json"

check_endpoint \
  "/ips/classifications/review-audit" \
  "/tmp/gfo-ips-review-audit.json"

python3 <<'PY'
import json
from pathlib import Path

compliance = json.loads(
    Path(
        "/tmp/gfo-ips-compliance.json"
    ).read_text()
)

classifications = json.loads(
    Path(
        "/tmp/gfo-ips-classifications.json"
    ).read_text()
)

classification_audit = json.loads(
    Path(
        "/tmp/gfo-ips-classification-audit.json"
    ).read_text()
)

review_audit = json.loads(
    Path(
        "/tmp/gfo-ips-review-audit.json"
    ).read_text()
)

summary = classifications["summary"]
allocation = classifications["allocation"]
items = classifications["items"]

required_summary_fields = [
    "positions",
    "classifiedPositions",
    "unclassifiedPositions",
    "suggestedPositions",
    "pendingInformationPositions",
    "deferredPositions",
    "coveragePercentage",
    "complianceAvailable",
    "rebalanceAvailable",
]

for field in required_summary_fields:
    if field not in summary:
        raise SystemExit(
            f"ERRORE: campo summary mancante: {field}"
        )

if summary["positions"] != len(items):
    raise SystemExit(
        "ERRORE: numero posizioni incoerente."
    )

if (
    summary["classifiedPositions"]
    + summary["unclassifiedPositions"]
    != summary["positions"]
):
    raise SystemExit(
        "ERRORE: classificate + non classificate "
        "non coincide con il totale."
    )

required_allocation_fields = [
    "code",
    "value",
    "weight",
    "status",
    "targetValue",
    "minimumValue",
    "maximumValue",
    "gapToTarget",
    "rebalanceAction",
]

for asset_class in allocation:
    for field in required_allocation_fields:
        if field not in asset_class:
            raise SystemExit(
                "ERRORE: campo allocation mancante: "
                f"{field} in {asset_class.get('code')}"
            )

if not summary["rebalanceAvailable"]:
    for asset_class in allocation:
        if not asset_class["strategic"]:
            continue

        if asset_class["targetValue"] is not None:
            raise SystemExit(
                "ERRORE: target operativo presente "
                "con ribilanciamento sospeso."
            )

        if asset_class["rebalanceAction"] is not None:
            raise SystemExit(
                "ERRORE: azione presente "
                "con ribilanciamento sospeso."
            )

print()
print("=== RISULTATO ===")
print("Indicatori IPS:", compliance["summary"]["total"])
print("Posizioni finanziarie:", summary["positions"])
print("Classificate:", summary["classifiedPositions"])
print("Da classificare:", summary["unclassifiedPositions"])
print("Con suggerimento:", summary["suggestedPositions"])
print(
    "Da approfondire:",
    summary["pendingInformationPositions"],
)
print("Rinviate:", summary["deferredPositions"])
print(
    "Copertura:",
    summary["coveragePercentage"],
    "%",
)
print(
    "Ribilanciamento disponibile:",
    summary["rebalanceAvailable"],
)
print(
    "Audit classificazioni:",
    classification_audit["count"],
)
print(
    "Audit revisioni:",
    review_audit["count"],
)
print()
print("TEST IPS SUPERATO")
PY
