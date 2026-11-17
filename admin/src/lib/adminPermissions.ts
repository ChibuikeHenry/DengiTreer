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

export const ADMIN_PERMISSION_OPTIONS: ReadonlyArray<{
  value: AdminPermission
  label: string
  description: string
}> = [
  {
    value: 'manage_admins',
    label: 'Manage admins',
    description: 'Create, edit, and revoke other admin accounts',
  },
  {
    value: 'create_accounts',
    label: 'Create accounts',
    description: 'Add new user accounts from Admin CMS',
  },
  {
    value: 'create_family_trees',
    label: 'Create family trees',
    description: 'Create family trees for users',
  },
  {
    value: 'manage_users',
    label: 'User management',
    description: 'View and manage platform users',
  },
  {
    value: 'manage_trees',
    label: 'Family trees',
    description: 'Browse and manage family trees',
  },
  {
    value: 'manage_invitations',
    label: 'Invitations',
    description: 'View and manage invitations',
  },
  {
    value: 'manage_claims',
    label: 'Profile claims',
    description: 'Review profile claim requests',
  },
  {
    value: 'manage_privacy',
    label: 'Privacy & safety',
    description: 'Handle privacy and safety reports',
  },
] as const

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(value)
}

export function parseAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<AdminPermission>()
  for (const item of value) {
    if (isAdminPermission(item)) unique.add(item)
  }
  return [...unique]
}

export function adminPermissionLabel(value: AdminPermission): string {
  return ADMIN_PERMISSION_OPTIONS.find((option) => option.value === value)?.label ?? value
}

/** Route → required permission. Dashboard and Settings are open to any admin. */
export const ROUTE_PERMISSIONS: Record<string, AdminPermission | null> = {
  '/dashboard': null,
  '/settings': null,
  '/users': 'manage_users',
  '/add-user': 'create_accounts',
  '/family-trees': 'manage_trees',
  '/create-family-tree': 'create_family_trees',
  '/invitations': 'manage_invitations',
  '/profile-claims': 'manage_claims',
  '/privacy': 'manage_privacy',
  '/concessions': null,
}
