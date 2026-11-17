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

## Admin Settings (permissions)

Settings (`/settings`) lets bootstrap/super admins create staff accounts with granular permissions (`manage_admins`, `create_accounts`, `create_family_trees`, etc.).

- Auth custom claims: `{ admin: true, adminPermissions: string[] }`
- Firestore mirror: `adminUsers/{uid}` (client read for admins; writes only via Cloud Functions)
- Bootstrap allowlist emails in `src/lib/adminAccess.ts` keep full access even without claims

### Deploy backend pieces (repo root)

```bash
# Cloud Functions (createAdminAccount, listAdminAccounts, updateAdminPermissions, revokeAdminAccess)
firebase deploy --only functions:createAdminAccount,functions:listAdminAccounts,functions:updateAdminPermissions,functions:revokeAdminAccess --project dengitree

# Firestore rules (adminUsers collection)
firebase deploy --only firestore:rules --project dengitree
```

Then ship the Admin CMS UI:

```bash
npm run deploy:admin
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
