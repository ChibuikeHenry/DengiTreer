import {
  ADMIN_PERMISSIONS,
  parseAdminPermissions,
  type AdminPermission,
} from './adminPermissions'

/** Emails allowed into Admin CMS (also grant `{ admin: true }` custom claim in Firebase). */
export const ADMIN_EMAILS = [
  'ugwuhenry195@gmail.com',
  'kool4evar@yahoo.com',
] as const

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeAdminEmail(email)
  return ADMIN_EMAILS.some((entry) => entry === normalized)
}

export type AdminAccessResult = {
  isAdmin: boolean
  permissions: AdminPermission[]
  /** True when allowlisted bootstrap admin (full access). */
  isBootstrap: boolean
}

export async function resolveAdminAccessDetails(user: {
  email: string | null | undefined
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>
}): Promise<AdminAccessResult> {
  const isBootstrap = isAllowlistedAdminEmail(user.email)

  try {
    const token = await user.getIdTokenResult(true)
    const claimAdmin = token.claims.admin === true
    const claimPerms = parseAdminPermissions(token.claims.adminPermissions)

    if (isBootstrap) {
      return {
        isAdmin: true,
        permissions: [...ADMIN_PERMISSIONS],
        isBootstrap: true,
      }
    }

    if (claimAdmin) {
      return {
        isAdmin: true,
        permissions: claimPerms,
        isBootstrap: false,
      }
    }
  } catch (e) {
    console.warn('Error refreshing ID token claims:', e)
  }

  if (isBootstrap) {
    return {
      isAdmin: true,
      permissions: [...ADMIN_PERMISSIONS],
      isBootstrap: true,
    }
  }

  return { isAdmin: false, permissions: [], isBootstrap: false }
}

export async function resolveAdminAccess(user: {
  email: string | null | undefined
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>
}): Promise<boolean> {
  const details = await resolveAdminAccessDetails(user)
  return details.isAdmin
}

export function hasAdminPermission(
  permissions: readonly AdminPermission[],
  permission: AdminPermission,
  options?: { isBootstrap?: boolean },
): boolean {
  if (options?.isBootstrap) return true
  return permissions.includes(permission)
}
