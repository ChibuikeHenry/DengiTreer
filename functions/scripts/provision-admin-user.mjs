/**
 * Create or update a Firebase Auth user and grant admin claim.
 * Password is passed on the CLI only — never commit it.
 *
 *   gcloud auth application-default login
 *   node functions/scripts/provision-admin-user.mjs <email> <password>
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const email = process.argv[2]?.trim().toLowerCase()
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: node functions/scripts/provision-admin-user.mjs <email> <password>')
  process.exit(1)
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters.')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'dengitree',
  })
}

const auth = getAuth()

let user
try {
  user = await auth.getUserByEmail(email)
  await auth.updateUser(user.uid, { password, emailVerified: true })
  console.log(`✓ Updated password for existing user ${email}`)
} catch (err) {
  const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
  if (code === 'auth/user-not-found') {
    user = await auth.createUser({
      email,
      password,
      emailVerified: true,
    })
    console.log(`✓ Created Firebase Auth user ${email}`)
  } else {
    console.error(err)
    process.exit(1)
  }
}

const existing = user.customClaims ?? {}
await auth.setCustomUserClaims(user.uid, { ...existing, admin: true })
console.log(`✓ Admin claim set (uid: ${user.uid})`)
console.log('  Sign in at https://dengitree-admin.web.app/login')
