# GFO Platform

Digital Family Office Platform

## Mission

Transform the Gresleri2026 workbook into an intelligent Digital Family Office.

## Status

Release: 2.0.0-alpha

Development has officially started.

## Avvio locale

```bash
./scripts/start-gfo.sh
```

La piattaforma viene aperta sul Mac e resta accessibile soltanto dal Mac.

## Accesso da iPhone

Collegare Mac e iPhone alla stessa rete Wi-Fi, quindi avviare:

```bash
./scripts/start-gfo-iphone.sh
```

Safari si apre sull'indirizzo di rete del Mac e l'indirizzo viene copiato negli
appunti. Il pulsante con l'icona iPhone nella barra superiore mostra anche un QR
code locale. Da Safari su iPhone si può usare **Condividi → Aggiungi alla
schermata Home**.

La modalità iPhone espone GFO soltanto sulla rete locale. Usarla esclusivamente
su una rete privata e attendibile; non configurare inoltri delle porte 3000 o
5173 sul router.
