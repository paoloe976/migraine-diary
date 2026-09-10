# Deploy

Hosting: **Firebase Hosting** (progetto `migraine-diary-2026`).
URL di produzione: <https://migraine-diary-2026.web.app>

## Flusso di lavoro

- si lavora su **`dev`** (push liberi, nessun deploy);
- il rilascio è **manuale**, e si deploya **da `master`** così che ciò che è
  online coincida con `master` (il numero di versione in "Altro" viene da
  `git rev-list --count HEAD`).

```bash
git checkout master && git merge dev && git push
npm run deploy        # = npm run build && firebase deploy --only hosting
git checkout dev
```

## Prerequisiti (una tantum)

`firebase-tools` è una devDependency (niente installazione globale). Serve solo:

```bash
npx firebase login          # account paoloe976@gmail.com
```

Le variabili `VITE_FIREBASE_*` vengono da `.env.local` (vedi `.env.example`).

## Rollback

Console Firebase → Hosting → cronologia dei rilasci → "Ripristina" sulla
versione precedente. Nessun rebuild.

## GitHub Action (non attiva — solo se un giorno servirà)

Utile solo con contributori esterni (merge di una PR che pubblica da solo) o
deploy da più macchine. Per attivarla:

1. `npx firebase init hosting:github` — crea il service account e carica da solo
   il secret su GitHub (`FIREBASE_SERVICE_ACCOUNT_MIGRAINE_DIARY_2026`) e i file
   workflow sotto `.github/workflows/`.
2. Aggiungere come **repository variables** (GitHub → Settings → Secrets and
   variables → Actions → Variables) le 6 `VITE_FIREBASE_*` con i valori di
   `.env.local`, e nel workflow passarle come `env:` allo step di build, più
   `fetch-depth: 0` allo step di checkout (serve al numero di versione).
