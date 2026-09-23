# DengiTree

A living, collaborative and verified family network. Discover your connections. Preserve your legacy.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Family invitations (Firebase)

Adding a **living** spouse, parent, child, or sibling with an email creates a Firestore invitation and queues an email with a join link (`/join/{token}`) that includes their **role**. Deceased relatives are saved without sending email.

### One-time setup

1. Enable **Firestore** and **Cloud Functions** (Blaze plan) in the [Firebase console](https://console.firebase.google.com/project/dengitree).
2. Install the [**Trigger Email**](https://extensions.dev/extensions/firebase/firestore-send-email) extension on project `dengitree`, collection **`mail`**, and configure SMTP (e.g. SendGrid, Mailgun, or Gmail).
3. Deploy rules, indexes, and functions:

```bash
cd functions && npm install && npm run build && cd ..
firebase deploy --only firestore,functions --project dengitree
```

4. Deploy the web app: `npm run deploy`

### Callable functions

- `createFamilyMemberInvite` — add relative + email invite  
- `createShareInvite` — generic invite link (Invitations page)  
- `getInvitationByToken` — public preview for `/join/:token`  
- `acceptInvitation` — after sign-up/login, attaches role to the user profile  
