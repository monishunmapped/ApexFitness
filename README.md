# Apex Fitness

Gym management console: memberships, QR / PIN check-ins, WhatsApp reminders, invoices and feedback, synced through Cloud Firestore.

## Run locally

```bash
npm install
npm run dev
```

Firebase settings live in `firebase-applet-config.json`; Firestore rules in `firestore.rules`.

## Deploy

Every push to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`
(Settings → Pages → Source must be **GitHub Actions**).
