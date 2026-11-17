import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { AdminPermission } from './adminPermissions'

export type AdminAccountRow = {
  uid: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  permissions: AdminPermission[]
  status: 'active' | 'revoked'
  createdByUid: string | null
}

const listAdminAccountsFn = httpsCallable<void, { admins: AdminAccountRow[] }>(
  functions,
  'listAdminAccounts',
)

const createAdminAccountFn = httpsCallable<
  {
    email: string
    firstName: string
    lastName: string
    password: string
    permissions: AdminPermission[]
  },
  { ok: boolean; uid: string; email: string; created: boolean; permissions: AdminPermission[] }
>(functions, 'createAdminAccount')

const updateAdminPermissionsFn = httpsCallable<
  { uid: string; permissions: AdminPermission[]; firstName?: string; lastName?: string },
  { ok: boolean; uid: string; permissions: AdminPermission[] }
>(functions, 'updateAdminPermissions')

const revokeAdminAccessFn = httpsCallable<{ uid: string }, { ok: boolean; uid: string }>(
  functions,
  'revokeAdminAccess',
)

function callableErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err && 'message' in err) {
    const message = String((err as { message: string }).message || '')
    if (message) return message.replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)\s*$/, '')
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  const result = await listAdminAccountsFn()
  return result.data.admins ?? []
}

export async function createAdminAccount(input: {
  email: string
  firstName: string
  lastName: string
  password: string
  permissions: AdminPermission[]
}) {
  try {
    const result = await createAdminAccountFn(input)
    return result.data
  } catch (err) {
    throw new Error(callableErrorMessage(err, 'Could not create admin account.'))
  }
}

export async function updateAdminPermissions(input: {
  uid: string
  permissions: AdminPermission[]
  firstName?: string
  lastName?: string
}) {
  try {
    const result = await updateAdminPermissionsFn(input)
    return result.data
  } catch (err) {
    throw new Error(callableErrorMessage(err, 'Could not update permissions.'))
  }
}

export async function revokeAdminAccess(uid: string) {
  try {
    const result = await revokeAdminAccessFn({ uid })
    return result.data
  } catch (err) {
    throw new Error(callableErrorMessage(err, 'Could not revoke admin access.'))
  }
}
