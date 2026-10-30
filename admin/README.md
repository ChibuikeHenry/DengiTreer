# DengiTree Admin CMS

Separate Vite app for the admin dashboard UI (mock data until backend wiring).

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:5174 — sign in with an allowlisted admin email on the `dengitree` project.

### Provision admin login (Firebase Auth)

From repo root (requires [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)):

```bash
gcloud auth application-default login
npm run admin:provision -- your@email.com 'YourPassword'
```

## Deploy (Firebase Hosting)

Create the hosting site once (if it does not exist):

```bash
firebase hosting:sites:create dengitree-admin --project dengitree
```

From the repo root:

```bash
npm run deploy:admin
```

Live URL: `https://dengitree-admin.web.app` (after deploy).
