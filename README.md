# Diario dell'emicrania

PWA per tenere un diario del mal di testa. Uso personale e multiutente: ogni
persona vede solo il proprio diario.

Progetto open source: chiunque può ospitare la propria istanza sul proprio
progetto Firebase gratuito, con i propri dati.

## Stack

- **React + Vite + TypeScript** — SPA statica, nessun server
- **PWA** (`vite-plugin-pwa`) — installabile, funziona offline
- **Firebase** — Auth (login Google) + Cloud Firestore per i dati
- **Hosting** — sito statico su Netlify (o qualsiasi CDN)

Tutto l'accesso ai dati passa da [`src/lib/data.ts`](src/lib/data.ts): il resto
dell'app non conosce Firebase, così il backend resta sostituibile.

## Sviluppo in locale

```bash
npm install
cp .env.example .env.local   # e compilare con la config del proprio progetto Firebase
npm run dev
```

## Self-hosting

1. Creare un progetto su [Firebase](https://console.firebase.google.com/) (piano
   Spark, gratuito).
2. Attivare **Authentication** (provider Google) e **Cloud Firestore**.
3. Copiare la configurazione web del progetto in `.env.local` (in locale) o nelle
   variabili d'ambiente del proprio hosting.
4. `npm run build` produce `dist/`, da servire come sito statico.

## Licenza

MIT — vedi [LICENSE](LICENSE). Software fornito "così com'è", senza garanzie.
Non è un dispositivo medico.
