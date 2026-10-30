/**
 * Grant Firebase Auth custom claim { admin: true } for an email.
 *
 * Usage (from repo root, with Firebase CLI logged in):
 *   node functions/scripts/set-admin-claim.mjs ugwuhenry195@gmail.com
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage: node functions/scripts/set-admin-claim.mjs <email>')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'dengitree',
  })
}

const auth = getAuth()

try {
  const user = await auth.getUserByEmail(email)
  const existing = user.customClaims ?? {}
  await auth.setCustomUserClaims(user.uid, { ...existing, admin: true })
  console.log(`✓ Admin claim set for ${email} (uid: ${user.uid})`)
  console.log('  Ask them to sign out and sign in again on the admin site.')
} catch (err) {
  const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
  if (code === 'auth/user-not-found') {
    console.error(`No Firebase Auth user for ${email}.`)
    console.error('Create the account first (sign up on dengitree.web.app or Firebase Console).')
  } else {
    console.error(err)
  }
  process.exit(1)
}
