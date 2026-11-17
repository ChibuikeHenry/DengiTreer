import { useCallback, useEffect, useState, type FormEvent } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import StatusBadge from '../components/StatusBadge'
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
  adminPermissionLabel,
  type AdminPermission,
} from '../lib/adminPermissions'

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
      {ADMIN_PERMISSION_OPTIONS.map((option) => {
        const checked = selected.includes(option.value)
        return (
          <li key={option.value}>
            <label className={`dt-perm-item${checked ? ' is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.value)}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

export default function AdminSettingsPage() {
  const { user, can, refreshAccess } = useAdminAuth()
  const canManage = can('manage_admins')

  const [admins, setAdmins] = useState<AdminAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [permissions, setPermissions] = useState<AdminPermission[]>([
    'create_accounts',
    'create_family_trees',
  ])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [editing, setEditing] = useState<AdminAccountRow | null>(null)
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [actionBusyUid, setActionBusyUid] = useState<string | null>(null)

  const loadAdmins = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const rows = await listAdminAccounts()
      setAdmins(rows)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not load admin accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAdmins()
  }, [loadAdmins])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return

    setCreateError('')
    setCreateSuccess('')
    setCreating(true)
    try {
      const result = await createAdminAccount({
        email,
        firstName,
        lastName,
        password,
        permissions,
      })
      setCreateSuccess(
        result.created
          ? `Admin created for ${result.email}. Share the temporary password securely.`
          : `Existing account ${result.email} upgraded to admin. Password updated.`,
      )
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setPermissions(['create_accounts', 'create_family_trees'])
      await loadAdmins()
      await refreshAccess()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create admin.')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(admin: AdminAccountRow) {
    if (admin.status !== 'active') return
    setEditing(admin)
    setEditPermissions([...admin.permissions])
    setEditError('')
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing || !canManage) return
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
      setListError('You cannot revoke your own admin access.')
      return
    }
    if (admin.uid.startsWith('bootstrap:')) {
      setListError('Bootstrap admins cannot be revoked from Settings.')
      return
    }
    const confirmed = window.confirm(
      `Revoke admin access for ${admin.displayName || admin.email}? They will lose Admin CMS access immediately after their next token refresh.`,
    )
    if (!confirmed) return

    setActionBusyUid(admin.uid)
    setListError('')
    try {
      await revokeAdminAccess(admin.uid)
      await loadAdmins()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not revoke admin.')
    } finally {
      setActionBusyUid(null)
    }
  }

  return (
    <>
      <AdminPageToolbar
        title="Settings"
        subtitle="Manage admin accounts and platform access permissions."
      />

      <div className="dt-settings-layout">
        <section className="dt-table-panel">
          <div className="dt-table-panel-head">
            <div>
              <h2>Admin accounts</h2>
              <p>Staff who can sign in to the DengiTree Admin CMS.</p>
            </div>
            <button type="button" className="dt-btn-outline" onClick={() => void loadAdmins()}>
              Refresh
            </button>
          </div>

          {listError ? <p className="dt-settings-error">{listError}</p> : null}
          {loading ? <p className="dt-settings-muted">Loading admins…</p> : null}

          {!loading ? (
            <div className="dt-table-scroll">
              <table className="dt-data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Permissions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No admin accounts yet.</td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.uid}>
                        <td>
                          <strong>{admin.displayName || '—'}</strong>
                        </td>
                        <td>{admin.email}</td>
                        <td>
                          <div className="dt-perm-chips">
                            {admin.permissions.length === 0 ? (
                              <span className="dt-settings-muted">None</span>
                            ) : (
                              admin.permissions.map((perm) => (
                                <span key={perm} className="dt-perm-chip">
                                  {adminPermissionLabel(perm)}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusBadge variant={admin.status === 'active' ? 'Active' : 'Expired'} />
                        </td>
                        <td>
                          <div className="dt-row-actions">
                            <button
                              type="button"
                              className="dt-link-btn"
                              disabled={!canManage || admin.status !== 'active'}
                              onClick={() => openEdit(admin)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="dt-link-btn dt-link-btn--danger"
                              disabled={
                                !canManage ||
                                admin.status !== 'active' ||
                                admin.uid === user?.uid ||
                                admin.uid.startsWith('bootstrap:') ||
                                actionBusyUid === admin.uid
                              }
                              onClick={() => void handleRevoke(admin)}
                            >
                              {actionBusyUid === admin.uid ? 'Revoking…' : 'Revoke'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="dt-form-panel">
          <h2 className="dt-panel-title">Create admin</h2>
          <p className="dt-settings-muted" style={{ marginTop: '-0.35rem', marginBottom: '1rem' }}>
            Create a staff account with a temporary password and specific permissions.
          </p>

          {!canManage ? (
            <p className="dt-settings-muted">
              You can view admin accounts, but you need the <strong>Manage admins</strong> permission
              to create or change them.
            </p>
          ) : (
            <form onSubmit={(e) => void handleCreate(e)}>
              {createError ? <p className="dt-settings-error">{createError}</p> : null}
              {createSuccess ? <p className="dt-settings-success">{createSuccess}</p> : null}

              <div className="dt-form-grid">
                <div className="dt-field">
                  <label htmlFor="admin-first-name">First name</label>
                  <input
                    id="admin-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="dt-field">
                  <label htmlFor="admin-last-name">Last name</label>
                  <input
                    id="admin-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="dt-field">
                  <label htmlFor="admin-email">Email</label>
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="dt-field">
                  <label htmlFor="admin-password">Temporary password</label>
                  <input
                    id="admin-password"
                    type="text"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={creating}
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              <div className="dt-field" style={{ marginTop: '1rem' }}>
                <label>Permissions</label>
                <PermissionChecklist
                  selected={permissions}
                  onChange={setPermissions}
                  disabled={creating}
                />
              </div>

              <div className="dt-form-actions">
                <button type="submit" className="dt-btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create admin'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {editing ? (
        <div className="dt-modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div
            className="dt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-admin-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-admin-title">Edit permissions</h2>
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
