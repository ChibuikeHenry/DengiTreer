import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import { useAdminAuth } from '../context/AdminAuthContext'
import {
  createAdminAccount,
  listAdminAccounts,
  revokeAdminAccess,
  type AdminAccountRow,
} from '../lib/adminAccountsApi'
import { ADMIN_PERMISSIONS, type AdminPermission } from '../lib/adminPermissions'
import { isAllowlistedAdminEmail } from '../lib/adminAccess'

const MAX_ADDITIONAL_ADMINS = 2
const CMS_SETTINGS_KEY = 'dengitree.cmsSettings'
const CMS_PREFS_KEY = 'dengitree.cmsPreferences'

/** Additional admins get full CMS access except managing other admins / system config. */
const ADDITIONAL_ADMIN_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.filter(
  (p) => p !== 'manage_admins',
)

type CmsSystemSettings = {
  siteName: string
  language: string
  timeZone: string
  dateFormat: string
}

type CmsPreferences = {
  allowContentEditing: boolean
  enableUserManagement: boolean
  receiveSystemNotifications: boolean
}

const DEFAULT_SYSTEM: CmsSystemSettings = {
  siteName: 'DengiTree CMS',
  language: 'en',
  timeZone: 'GMT+1',
  dateFormat: 'DD MM YYYY',
}

const DEFAULT_PREFS: CmsPreferences = {
  allowContentEditing: true,
  enableUserManagement: true,
  receiveSystemNotifications: true,
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
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

function SettingsCardIcon({ kind }: { kind: 'system' | 'admins' | 'prefs' | 'activity' }) {
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
    case 'prefs':
      return (
        <svg {...common}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="dt-cms-toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`dt-cms-switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="dt-cms-switch-knob" />
      </button>
    </label>
  )
}

export default function AdminSettingsPage() {
  const { user, can, refreshAccess } = useAdminAuth()
  const canManage = can('manage_admins')

  const [admins, setAdmins] = useState<AdminAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [system, setSystem] = useState<CmsSystemSettings>(() =>
    loadJson(CMS_SETTINGS_KEY, DEFAULT_SYSTEM),
  )
  const [prefs, setPrefs] = useState<CmsPreferences>(() => loadJson(CMS_PREFS_KEY, DEFAULT_PREFS))
  const [systemSaved, setSystemSaved] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [actionBusyUid, setActionBusyUid] = useState<string | null>(null)

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

  const additionalAdmins = useMemo(
    () => admins.filter((a) => !isAllowlistedAdminEmail(a.email)),
    [admins],
  )
  const slotsRemaining = Math.max(0, MAX_ADDITIONAL_ADMINS - additionalAdmins.length)
  const canAddMore = slotsRemaining > 0

  function resetAddForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('admin')
    setCreateError('')
  }

  function handleSaveSystem(event: FormEvent) {
    event.preventDefault()
    localStorage.setItem(CMS_SETTINGS_KEY, JSON.stringify(system))
    setSystemSaved('System settings saved.')
    window.setTimeout(() => setSystemSaved(''), 2500)
  }

  function updatePref<K extends keyof CmsPreferences>(key: K, value: CmsPreferences[K]) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(CMS_PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  async function handleAddAdmin(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    if (!canAddMore) {
      setCreateError('You already have the maximum of 2 additional admins.')
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
        permissions: ADDITIONAL_ADMIN_PERMISSIONS,
      })
      setCreateSuccess(
        `Admin added for ${result.email}. Temporary password: ${tempPassword}`,
      )
      resetAddForm()
      await loadAdmins()
      await refreshAccess()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add admin.')
    } finally {
      setCreating(false)
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
      `Remove admin access for ${admin.displayName || admin.email}?`,
    )
    if (!confirmed) return

    setActionBusyUid(admin.uid)
    setListError('')
    try {
      await revokeAdminAccess(admin.uid)
      await loadAdmins()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not remove admin.')
    } finally {
      setActionBusyUid(null)
    }
  }

  return (
    <>
      <AdminPageToolbar
        title="CMS Settings"
        subtitle="Configure system defaults, admin access, and CMS preferences."
      />

      <div className="dt-cms-settings-grid">
        {/* System Settings */}
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
                  onChange={(e) => setSystem((s) => ({ ...s, siteName: e.target.value }))}
                />
              </div>
              <div className="dt-field">
                <label htmlFor="cms-language">Default Language</label>
                <select
                  id="cms-language"
                  value={system.language}
                  onChange={(e) => setSystem((s) => ({ ...s, language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="ha">Hausa</option>
                  <option value="yo">Yoruba</option>
                  <option value="ig">Igbo</option>
                </select>
              </div>
              <div className="dt-field">
                <label htmlFor="cms-tz">Time Zone</label>
                <select
                  id="cms-tz"
                  value={system.timeZone}
                  onChange={(e) => setSystem((s) => ({ ...s, timeZone: e.target.value }))}
                >
                  <option value="GMT+1">(GMT +1) West Africa Time</option>
                  <option value="GMT+0">(GMT +0) Greenwich Mean Time</option>
                  <option value="GMT-5">(GMT -5) Eastern Time</option>
                  <option value="GMT+1-CET">(GMT +1) Central European Time</option>
                </select>
              </div>
              <div className="dt-field">
                <label htmlFor="cms-date">Date Format</label>
                <select
                  id="cms-date"
                  value={system.dateFormat}
                  onChange={(e) => setSystem((s) => ({ ...s, dateFormat: e.target.value }))}
                >
                  <option value="DD MM YYYY">DD MM YYYY</option>
                  <option value="MM DD YYYY">MM DD YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
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

        {/* Admin Access */}
        <section className="dt-cms-card">
          <header className="dt-cms-card-head">
            <span className="dt-cms-card-icon" aria-hidden="true">
              <SettingsCardIcon kind="admins" />
            </span>
            <h2>Admin Access</h2>
          </header>

          <div className="dt-cms-info-banner" role="note">
            You can add up to {MAX_ADDITIONAL_ADMINS} additional admins. They will have full access to
            the CMS dashboard, except for account deletion and system configuration.
            {canAddMore ? ` ${slotsRemaining} slot${slotsRemaining === 1 ? '' : 's'} remaining.` : null}
          </div>

          {listError ? <p className="dt-settings-error">{listError}</p> : null}

          <div className="dt-cms-current-admins">
            <h3>Current Admins</h3>
            {loading ? (
              <p className="dt-settings-muted">Loading…</p>
            ) : admins.length === 0 ? (
              <p className="dt-settings-muted">No admins found.</p>
            ) : (
              <ul className="dt-cms-admin-list">
                {admins.map((admin) => {
                  const name = admin.displayName || admin.email
                  const removable =
                    canManage &&
                    admin.uid !== user?.uid &&
                    !admin.uid.startsWith('bootstrap:') &&
                    !isAllowlistedAdminEmail(admin.email)
                  return (
                    <li key={admin.uid} className="dt-cms-admin-row">
                      <span className="dt-cms-admin-avatar" aria-hidden="true">
                        {initialsFromName(name, admin.email)}
                      </span>
                      <div className="dt-cms-admin-meta">
                        <strong>{name}</strong>
                        <span>{admin.email}</span>
                      </div>
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
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {canManage && canAddMore ? (
            <form className="dt-cms-add-admin" onSubmit={(e) => void handleAddAdmin(e)}>
              <h3>Add New Admin</h3>
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
                    onChange={(e) => setRole(e.target.value)}
                    disabled={creating}
                  >
                    <option value="admin">Admin</option>
                  </select>
                </div>
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
                  {creating ? 'Adding…' : '+ Add Admin'}
                </button>
              </div>
            </form>
          ) : canManage && !canAddMore ? (
            <p className="dt-settings-muted" style={{ marginTop: '0.75rem' }}>
              Maximum of {MAX_ADDITIONAL_ADMINS} additional admins reached.
            </p>
          ) : !canManage ? (
            <p className="dt-settings-muted" style={{ marginTop: '0.75rem' }}>
              You need permission to manage admins to add new staff.
            </p>
          ) : null}
        </section>

        {/* CMS Preferences */}
        <section className="dt-cms-card">
          <header className="dt-cms-card-head">
            <span className="dt-cms-card-icon" aria-hidden="true">
              <SettingsCardIcon kind="prefs" />
            </span>
            <h2>CMS Preferences</h2>
          </header>
          <div className="dt-cms-pref-list">
            <ToggleRow
              label="Allow content editing"
              checked={prefs.allowContentEditing}
              onChange={(v) => updatePref('allowContentEditing', v)}
            />
            <ToggleRow
              label="Enable user management"
              checked={prefs.enableUserManagement}
              onChange={(v) => updatePref('enableUserManagement', v)}
            />
            <ToggleRow
              label="Receive system notifications"
              checked={prefs.receiveSystemNotifications}
              onChange={(v) => updatePref('receiveSystemNotifications', v)}
            />
          </div>
        </section>

        {/* Recent Admin Activity */}
        <section className="dt-cms-card">
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
                  <td colSpan={3} className="dt-empty-cell" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    No recent admin activity yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
