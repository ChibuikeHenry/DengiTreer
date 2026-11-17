import { getAuth, type UserRecord } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const db = getFirestore()

export const ADMIN_PERMISSIONS = [
  'manage_admins',
  'create_accounts',
  'create_family_trees',
  'manage_users',
  'manage_trees',
  'manage_invitations',
  'manage_claims',
  'manage_privacy',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

const BOOTSTRAP_ADMIN_EMAILS = new Set([
  'ugwuhenry195@gmail.com',
  'kool4evar@yahoo.com',
])

const ALL_PERMISSIONS: AdminPermission[] = [...ADMIN_PERMISSIONS]

function normalizeEmail(email: unknown): string {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(value)
}

function parsePermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<AdminPermission>()
  for (const item of value) {
    if (isAdminPermission(item)) unique.add(item)
  }
  return [...unique]
}

function claimsPermissions(claims: Record<string, unknown> | undefined): AdminPermission[] {
  return parsePermissions(claims?.adminPermissions)
}

async function loadCallerAuth(uid: string) {
  return getAuth().getUser(uid)
}

function callerIsBootstrap(email: string | undefined): boolean {
  return Boolean(email && BOOTSTRAP_ADMIN_EMAILS.has(email.toLowerCase()))
}

function callerIsAdmin(user: UserRecord): boolean {
  const claims = (user.customClaims ?? {}) as Record<string, unknown>
  if (claims.admin === true) return true
  return callerIsBootstrap(user.email)
}

function callerHasPermission(user: UserRecord, permission: AdminPermission): boolean {
  if (callerIsBootstrap(user.email)) return true
  const claims = (user.customClaims ?? {}) as Record<string, unknown>
  if (claims.admin !== true) return false
  const perms = claimsPermissions(claims)
  // Admins created before permissions existed: treat empty list as full access only for bootstrap.
  return perms.includes(permission)
}

async function requireAdminCaller(uid: string | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  const user = await loadCallerAuth(uid)
  if (!callerIsAdmin(user)) {
    throw new HttpsError('permission-denied', 'Admin access required.')
  }
  return user
}

async function requireManageAdmins(uid: string | undefined) {
  const user = await requireAdminCaller(uid)
  if (!callerHasPermission(user, 'manage_admins')) {
    throw new HttpsError('permission-denied', 'You do not have permission to manage admins.')
  }
  return user
}

function displayNameFromParts(firstName: string, lastName: string, email: string): string {
  const name = [firstName, lastName].map((p) => p.trim()).filter(Boolean).join(' ')
  return name || email
}

type AdminUserDoc = {
  uid: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  permissions: AdminPermission[]
  status: 'active' | 'revoked'
  createdAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp
  updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp
  createdByUid?: string | null
  revokedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null
  revokedByUid?: string | null
}

async function writeAdminUserDoc(uid: string, data: Partial<AdminUserDoc> & { email: string }) {
  await db.collection('adminUsers').doc(uid).set(
    {
      uid,
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

async function upsertMemberUserDoc(
  uid: string,
  data: {
    email: string
    firstName: string
    lastName: string
    displayName: string
  },
) {
  await db.collection('users').doc(uid).set(
    {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: '',
      email: data.email,
      displayName: data.displayName,
      role: 'admin',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

export const createAdminAccount = onCall(async (request) => {
  const caller = await requireManageAdmins(request.auth?.uid)

  const email = normalizeEmail(request.data?.email)
  const firstName = String(request.data?.firstName ?? '').trim()
  const lastName = String(request.data?.lastName ?? '').trim()
  const password = String(request.data?.password ?? '')
  const permissions = parsePermissions(request.data?.permissions)

  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.')
  }
  if (!firstName || !lastName) {
    throw new HttpsError('invalid-argument', 'First and last name are required.')
  }
  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.')
  }
  if (permissions.length === 0) {
    throw new HttpsError('invalid-argument', 'Select at least one permission.')
  }

  const auth = getAuth()
  let uid: string
  let created = false

  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
    const existingClaims = (existing.customClaims ?? {}) as Record<string, unknown>
    if (existingClaims.admin === true) {
      throw new HttpsError('already-exists', 'This user is already an admin.')
    }
    await auth.updateUser(uid, {
      password,
      displayName: displayNameFromParts(firstName, lastName, email),
      emailVerified: existing.emailVerified,
    })
  } catch (err) {
    if (err instanceof HttpsError) throw err
    const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : ''
    if (code === 'auth/user-not-found') {
      const createdUser = await auth.createUser({
        email,
        password,
        displayName: displayNameFromParts(firstName, lastName, email),
        emailVerified: false,
      })
      uid = createdUser.uid
      created = true
    } else {
      const message = err instanceof Error ? err.message : 'Could not create admin account.'
      throw new HttpsError('internal', message)
    }
  }

  await auth.setCustomUserClaims(uid, {
    admin: true,
    adminPermissions: permissions,
  })

  const displayName = displayNameFromParts(firstName, lastName, email)

  await writeAdminUserDoc(uid, {
    email,
    firstName,
    lastName,
    displayName,
    permissions,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    createdByUid: caller.uid,
    revokedAt: null,
    revokedByUid: null,
  })

  await upsertMemberUserDoc(uid, { email, firstName, lastName, displayName })

  return {
    ok: true,
    uid,
    email,
    created,
    permissions,
  }
})

export const listAdminAccounts = onCall(async (request) => {
  await requireAdminCaller(request.auth?.uid)

  const snap = await db.collection('adminUsers').orderBy('email').get()
  const admins = snap.docs.map((doc) => {
    const data = doc.data()
    return {
      uid: doc.id,
      email: String(data.email ?? ''),
      firstName: String(data.firstName ?? ''),
      lastName: String(data.lastName ?? ''),
      displayName: String(data.displayName ?? ''),
      permissions: parsePermissions(data.permissions),
      status: data.status === 'revoked' ? 'revoked' : 'active',
      createdByUid: data.createdByUid ? String(data.createdByUid) : null,
    }
  })

  // Surface bootstrap allowlist entries even if they have no adminUsers doc yet.
  for (const email of BOOTSTRAP_ADMIN_EMAILS) {
    if (admins.some((a) => a.email === email)) continue
    try {
      const user = await getAuth().getUserByEmail(email)
      admins.push({
        uid: user.uid,
        email,
        firstName: '',
        lastName: '',
        displayName: user.displayName?.trim() || email,
        permissions: ALL_PERMISSIONS,
        status: 'active',
        createdByUid: null,
      })
    } catch {
      admins.push({
        uid: `bootstrap:${email}`,
        email,
        firstName: '',
        lastName: '',
        displayName: email,
        permissions: ALL_PERMISSIONS,
        status: 'active',
        createdByUid: null,
      })
    }
  }

  admins.sort((a, b) => a.email.localeCompare(b.email))
  return { admins }
})

export const updateAdminPermissions = onCall(async (request) => {
  const caller = await requireManageAdmins(request.auth?.uid)

  const targetUid = String(request.data?.uid ?? '').trim()
  const permissions = parsePermissions(request.data?.permissions)

  if (!targetUid || targetUid.startsWith('bootstrap:')) {
    throw new HttpsError('invalid-argument', 'Invalid admin user.')
  }
  if (permissions.length === 0) {
    throw new HttpsError('invalid-argument', 'Select at least one permission.')
  }

  const auth = getAuth()
  const target = await auth.getUser(targetUid)
  const targetClaims = (target.customClaims ?? {}) as Record<string, unknown>
  const adminDoc = await db.collection('adminUsers').doc(targetUid).get()
  const isActiveAdmin =
    targetClaims.admin === true ||
    adminDoc.exists ||
    callerIsBootstrap(target.email)

  if (!isActiveAdmin) {
    throw new HttpsError('failed-precondition', 'Target user is not an admin.')
  }

  await auth.setCustomUserClaims(targetUid, {
    admin: true,
    adminPermissions: permissions,
  })

  const firstName =
    String(request.data?.firstName ?? adminDoc.data()?.firstName ?? '').trim() ||
    String(target.displayName ?? '').split(/\s+/)[0] ||
    ''
  const lastName =
    String(request.data?.lastName ?? adminDoc.data()?.lastName ?? '').trim() ||
    String(target.displayName ?? '').split(/\s+/).slice(1).join(' ') ||
    ''
  const email = normalizeEmail(target.email)
  const displayName = displayNameFromParts(firstName, lastName, email)

  await writeAdminUserDoc(targetUid, {
    email,
    firstName,
    lastName,
    displayName,
    permissions,
    status: 'active',
    revokedAt: null,
    revokedByUid: null,
  })

  await upsertMemberUserDoc(targetUid, { email, firstName, lastName, displayName })

  return {
    ok: true,
    uid: targetUid,
    permissions,
    updatedByUid: caller.uid,
  }
})

export const revokeAdminAccess = onCall(async (request) => {
  const caller = await requireManageAdmins(request.auth?.uid)

  const targetUid = String(request.data?.uid ?? '').trim()
  if (!targetUid || targetUid.startsWith('bootstrap:')) {
    throw new HttpsError('invalid-argument', 'Invalid admin user.')
  }
  if (targetUid === caller.uid) {
    throw new HttpsError('failed-precondition', 'You cannot revoke your own admin access.')
  }

  const auth = getAuth()
  const target = await auth.getUser(targetUid)
  if (callerIsBootstrap(target.email)) {
    throw new HttpsError('failed-precondition', 'Bootstrap admins cannot be revoked from Settings.')
  }

  const existingClaims = { ...(target.customClaims ?? {}) } as Record<string, unknown>
  delete existingClaims.admin
  delete existingClaims.adminPermissions
  await auth.setCustomUserClaims(targetUid, existingClaims)

  const existingDoc = await db.collection('adminUsers').doc(targetUid).get()
  const existingData = existingDoc.data() ?? {}

  await writeAdminUserDoc(targetUid, {
    email: normalizeEmail(target.email),
    firstName: String(existingData.firstName ?? ''),
    lastName: String(existingData.lastName ?? ''),
    displayName: target.displayName?.trim() || normalizeEmail(target.email),
    permissions: [],
    status: 'revoked',
    revokedAt: FieldValue.serverTimestamp(),
    revokedByUid: caller.uid,
  })

  await db.collection('users').doc(targetUid).set(
    {
      role: 'member',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return { ok: true, uid: targetUid }
})
