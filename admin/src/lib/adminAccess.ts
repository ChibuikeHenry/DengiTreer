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

export async function resolveAdminAccess(user: {
  email: string | null | undefined
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>
}): Promise<boolean> {
  if (isAllowlistedAdminEmail(user.email)) return true
  const token = await user.getIdTokenResult()
  return token.claims.admin === true
}
