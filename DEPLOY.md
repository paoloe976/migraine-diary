# Deploy

Hosting: **Firebase Hosting** (progetto `migraine-diary-2026`).
URL di produzione: <https://migraine-diary-2026.web.app>

Flusso di lavoro:

- si lavora su **`dev`** (push liberi, nessun deploy);
- il **merge `dev` → `master`** è il rilascio: la GitHub Action
  [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) ricostruisce e pubblica.

## Deploy manuale (senza CI)

```bash
npm run build
firebase deploy --only hosting
```

Serve `firebase-tools` (`npm i -g firebase-tools`) e `firebase login`.
Le variabili `VITE_FIREBASE_*` vengono da `.env.local` (vedi `.env.example`).

## Configurazione della GitHub Action (una tantum)

La Action builda su runner puliti, quindi le servono i segreti/variabili nel repo
GitHub → **Settings → Secrets and variables → Actions**:

**Secret** (sensibile):

| nome | valore |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | contenuto JSON di una chiave service-account con ruolo *Firebase Hosting Admin* |

La chiave si genera con `firebase init hosting:github` (crea e carica il secret da
sola, chiamandolo `FIREBASE_SERVICE_ACCOUNT_MIGRAINE_DIARY_2026` — in tal caso
aggiornare il nome in `deploy.yml`), oppure a mano dalla console Google Cloud.

**Variables** (non sensibili — finiscono comunque nel bundle client):

| nome |
|---|
| `VITE_FIREBASE_API_KEY` |
| `VITE_FIREBASE_AUTH_DOMAIN` |
| `VITE_FIREBASE_PROJECT_ID` |
| `VITE_FIREBASE_STORAGE_BUCKET` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `VITE_FIREBASE_APP_ID` |

Valori identici a quelli in `.env.local`.
