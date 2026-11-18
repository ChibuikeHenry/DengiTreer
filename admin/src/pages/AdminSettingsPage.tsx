import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import { useAdminAuth } from '../context/AdminAuthContext'
import {
  createAdminAccount,
  listAdminAccounts,
  revokeAdminAccess,
  updateAdminPermissions,
  type AdminAccountRow,
} from '../lib/adminAccountsApi'
import {
  ADMIN_PERMISSION_OPTIONS,
  ADMIN_PERMISSIONS,
  adminPermissionLabel,
  type AdminPermission,
} from '../lib/adminPermissions'
import { isAllowlistedAdminEmail } from '../lib/adminAccess'

const MAX_ADDITIONAL_STAFF = 2
const CMS_SETTINGS_KEY = 'dengitree.cmsSettings'

type StaffRole = 'admin' | 'content_editor'

const ROLE_PRESETS: Record<StaffRole, AdminPermission[]> = {
  content_editor: ['manage_claims', 'manage_invitations', 'manage_privacy'],
  admin: ADMIN_PERMISSIONS.filter((p) => p !== 'manage_admins'),
}

type CmsSystemSettings = {
  siteName: string
}

const DEFAULT_SYSTEM: CmsSystemSettings = {
  siteName: 'DengiTree CMS',
}

function loadSystemSettings(): CmsSystemSettings {
  try {
    const raw = localStorage.getItem(CMS_SETTINGS_KEY)
    if (!raw) return DEFAULT_SYSTEM
    return { ...DEFAULT_SYSTEM, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SYSTEM
  }
}

function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

function initialsFromName(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  return (email.slice(0, 2) || 'AD').toUpperCase()
}

function inferStaffRole(permissions: AdminPermission[]): StaffRole {
  const hasOps =
    permissions.includes('manage_users') ||
    permissions.includes('create_accounts') ||
    permissions.includes('create_family_trees') ||
    permissions.includes('manage_trees')
  return hasOps ? 'admin' : 'content_editor'
}

function SettingsCardIcon({ kind }: { kind: 'system' | 'admins' | 'activity' }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (kind) {
    case 'system':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )
    case 'admins':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'activity':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
  }
}

function PermissionChecklist({
  selected,
  onChange,
  disabled,
}: {
  selected: AdminPermission[]
  onChange: (next: AdminPermission[]) => void
  disabled?: boolean
}) {
  function toggle(value: AdminPermission) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <ul className="dt-perm-list">
      {ADMIN_PERMISSION_OPTIONS.filter((option) => option.value !== 'manage_admins').map(
        (option) => {
          const checked = selected.includes(option.value)
          return (
            <li key={option.value}>
              <label
                className={`dt-perm-item${checked ? ' is-checked' : ''}`}
                title={option.description}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(option.value)}
                />
                <span className="dt-perm-label">{option.label}</span>
              </label>
            </li>
          )
        },
      )}
    </ul>
  )
}

export default function AdminSettingsPage() {
  const { user, can, refreshAccess } = useAdminAuth()
  const canManage = can('manage_admins')

  const [admins, setAdmins] = useState<AdminAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [system, setSystem] = useState<CmsSystemSettings>(loadSystemSettings)
  const [systemSaved, setSystemSaved] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('content_editor')
  const [permissions, setPermissions] = useState<AdminPermission[]>([
    ...ROLE_PRESETS.content_editor,
  ])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [actionBusyUid, setActionBusyUid] = useState<string | null>(null)

  const [editing, setEditing] = useState<AdminAccountRow | null>(null)
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const loadAdmins = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const rows = await listAdminAccounts()
      setAdmins(rows.filter((a) => a.status === 'active'))
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not load admin accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAdmins()
  }, [loadAdmins])

  const additionalStaff = useMemo(
    () => admins.filter((a) => !isAllowlistedAdminEmail(a.email)),
    [admins],
  )
  const slotsRemaining = Math.max(0, MAX_ADDITIONAL_STAFF - additionalStaff.length)
  const canAddMore = slotsRemaining > 0

  function resetAddForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('content_editor')
    setPermissions([...ROLE_PRESETS.content_editor])
    setCreateError('')
  }

  function handleRoleChange(nextRole: StaffRole) {
    setRole(nextRole)
    setPermissions([...ROLE_PRESETS[nextRole]])
  }

  function handleSaveSystem(event: FormEvent) {
    event.preventDefault()
    localStorage.setItem(CMS_SETTINGS_KEY, JSON.stringify(system))
    setSystemSaved('System settings saved.')
    window.setTimeout(() => setSystemSaved(''), 2500)
  }

  async function handleAddAdmin(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    if (!canAddMore) {
      setCreateError(`You already have the maximum of ${MAX_ADDITIONAL_STAFF} additional staff.`)
      return
    }
    if (permissions.length === 0) {
      setCreateError('Select at least one permission.')
      return
    }

    setCreateError('')
    setCreateSuccess('')
    setCreating(true)
    const tempPassword = generateTempPassword()
    try {
      const result = await createAdminAccount({
        email,
        firstName,
        lastName,
        password: tempPassword,
        permissions,
      })
      const roleLabel = role === 'admin' ? 'Admin' : 'Content Editor'
      setCreateSuccess(
        `${roleLabel} added for ${result.email}. Temporary password: ${tempPassword}`,
      )
      resetAddForm()
      await loadAdmins()
      await refreshAccess()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add staff account.')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(admin: AdminAccountRow) {
    setEditing(admin)
    setEditPermissions([...admin.permissions])
    setEditError('')
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing || !canManage) return
    if (editPermissions.length === 0) {
      setEditError('Select at least one permission.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      await updateAdminPermissions({
        uid: editing.uid,
        permissions: editPermissions,
        firstName: editing.firstName,
        lastName: editing.lastName,
      })
      setEditing(null)
      await loadAdmins()
      if (editing.uid === user?.uid) await refreshAccess()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update permissions.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleRevoke(admin: AdminAccountRow) {
    if (!canManage) return
    if (admin.uid === user?.uid) {
      setListError('You cannot remove your own admin access.')
      return
    }
    if (admin.uid.startsWith('bootstrap:') || isAllowlistedAdminEmail(admin.email)) {
      setListError('Primary admins cannot be removed from Settings.')
      return
    }
    const confirmed = window.confirm(
      `Remove access for ${admin.displayName || admin.email}?`,
    )
    if (!confirmed) return

    setActionBusyUid(admin.uid)
    setListError('')
    try {
      await revokeAdminAccess(admin.uid)
      await loadAdmins()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not remove staff account.')
    } finally {
      setActionBusyUid(null)
    }
  }

  return (
    <>
      <AdminPageToolbar
        title="CMS Settings"
        subtitle="Configure system defaults and staff access permissions."
        showActions={false}
      />

      <div className="dt-cms-settings-grid">
        <section className="dt-cms-card">
          <header className="dt-cms-card-head">
            <span className="dt-cms-card-icon" aria-hidden="true">
              <SettingsCardIcon kind="admins" />
            </span>
            <h2>Admin Access</h2>
          </header>

          {listError ? <p className="dt-settings-error">{listError}</p> : null}

          <div className="dt-cms-current-admins">
            <h3>Current Staff</h3>
            {loading ? (
              <p className="dt-settings-muted">Loading…</p>
            ) : admins.length === 0 ? (
              <p className="dt-settings-muted">No staff accounts found.</p>
            ) : (
              <ul className="dt-cms-admin-list">
                {admins.map((admin) => {
                  const name = admin.displayName || admin.email
                  const staffRole = inferStaffRole(admin.permissions)
                  const removable =
                    canManage &&
                    admin.uid !== user?.uid &&
                    !admin.uid.startsWith('bootstrap:') &&
                    !isAllowlistedAdminEmail(admin.email)
                  const editable =
                    canManage &&
                    !admin.uid.startsWith('bootstrap:') &&
                    admin.status === 'active'
                  return (
                    <li key={admin.uid} className="dt-cms-admin-row">
                      <span className="dt-cms-admin-avatar" aria-hidden="true">
                        {initialsFromName(name, admin.email)}
                      </span>
                      <div className="dt-cms-admin-meta">
                        <strong>{name}</strong>
                        <span>{admin.email}</span>
                        <span className="dt-cms-role-pill">
                          {staffRole === 'admin' ? 'Admin' : 'Content Editor'}
                        </span>
                        {admin.permissions.length > 0 ? (
                          <div className="dt-perm-chips">
                            {admin.permissions.slice(0, 4).map((perm) => (
                              <span key={perm} className="dt-perm-chip">
                                {adminPermissionLabel(perm)}
                              </span>
                            ))}
                            {admin.permissions.length > 4 ? (
                              <span className="dt-perm-chip">
                                +{admin.permissions.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="dt-row-actions">
                        {editable ? (
                          <button
                            type="button"
                            className="dt-link-btn"
                            onClick={() => openEdit(admin)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {removable ? (
                          <button
                            type="button"
                            className="dt-link-btn dt-link-btn--danger"
                            disabled={actionBusyUid === admin.uid}
                            onClick={() => void handleRevoke(admin)}
                          >
                            {actionBusyUid === admin.uid ? 'Removing…' : 'Remove'}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {canManage && canAddMore ? (
            <form className="dt-cms-add-admin" onSubmit={(e) => void handleAddAdmin(e)}>
              <h3>Add Staff</h3>
              {createError ? <p className="dt-settings-error">{createError}</p> : null}
              {createSuccess ? <p className="dt-settings-success">{createSuccess}</p> : null}
              <div className="dt-cms-add-grid">
                <div className="dt-field">
                  <label htmlFor="add-admin-first">First Name</label>
                  <input
                    id="add-admin-first"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="dt-field">
                  <label htmlFor="add-admin-last">Last Name</label>
                  <input
                    id="add-admin-last"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="dt-field dt-cms-add-span">
                  <label htmlFor="add-admin-email">Email Address</label>
                  <input
                    id="add-admin-email"
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="dt-field dt-cms-add-span">
                  <label htmlFor="add-admin-role">Role</label>
                  <select
                    id="add-admin-role"
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                    disabled={creating}
                  >
                    <option value="content_editor">Content Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="dt-cms-perms-block">
                <h4 className="dt-cms-perms-title">Permissions</h4>
                <p className="dt-settings-muted" style={{ marginBottom: '0.4rem' }}>
                  {role === 'admin'
                    ? 'Admins can manage users, trees, and accounts. Uncheck anything you want to withhold.'
                    : 'Content Editors focus on claims, invitations, and privacy. Add more access if needed.'}
                </p>
                <PermissionChecklist
                  selected={permissions}
                  onChange={setPermissions}
                  disabled={creating}
                />
              </div>

              <div className="dt-cms-card-actions">
                <button
                  type="button"
                  className="dt-btn-outline"
                  onClick={resetAddForm}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="dt-btn-primary" disabled={creating}>
                  {creating ? 'Adding…' : '+ Add Staff'}
                </button>
              </div>
            </form>
          ) : canManage && !canAddMore ? (
            <p className="dt-settings-muted" style={{ marginTop: '0.75rem' }}>
              Maximum of {MAX_ADDITIONAL_STAFF} additional staff reached.
            </p>
          ) : !canManage ? (
            <p className="dt-settings-muted" style={{ marginTop: '0.75rem' }}>
              You need permission to manage admins to add new staff.
            </p>
          ) : null}
        </section>

        <section className="dt-cms-card">
          <header className="dt-cms-card-head">
            <span className="dt-cms-card-icon" aria-hidden="true">
              <SettingsCardIcon kind="system" />
            </span>
            <h2>System Settings</h2>
          </header>
          <form onSubmit={handleSaveSystem}>
            <div className="dt-cms-fields">
              <div className="dt-field">
                <label htmlFor="cms-site-name">Site Name</label>
                <input
                  id="cms-site-name"
                  value={system.siteName}
                  onChange={(e) => setSystem({ siteName: e.target.value })}
                />
              </div>
            </div>
            {systemSaved ? <p className="dt-settings-success">{systemSaved}</p> : null}
            <div className="dt-cms-card-actions">
              <button type="submit" className="dt-btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </section>

        <section className="dt-cms-card dt-cms-card--wide">
          <header className="dt-cms-card-head">
            <span className="dt-cms-card-icon" aria-hidden="true">
              <SettingsCardIcon kind="activity" />
            </span>
            <h2>Recent Admin Activity</h2>
          </header>
          <div className="dt-table-scroll">
            <table className="dt-data-table dt-cms-activity-table">
              <thead>
                <tr>
                  <th scope="col">Admin</th>
                  <th scope="col">Action</th>
                  <th scope="col">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={3}
                    className="dt-empty-cell"
                    style={{ textAlign: 'center', padding: '1.5rem' }}
                  >
                    No recent admin activity yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editing ? (
        <div className="dt-modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div
            className="dt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-staff-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-staff-title">Edit permissions</h2>
            <p className="dt-settings-muted">
              {editing.displayName || editing.email} · {editing.email}
            </p>
            {editError ? <p className="dt-settings-error">{editError}</p> : null}
            <form onSubmit={(e) => void handleSaveEdit(e)}>
              <PermissionChecklist
                selected={editPermissions}
                onChange={setEditPermissions}
                disabled={editSaving}
              />
              <div className="dt-form-actions">
                <button
                  type="button"
                  className="dt-btn-outline"
                  onClick={() => setEditing(null)}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="dt-btn-primary" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
