import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import ProfileAvatar from '../components/ProfileAvatar'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { parseMemberPrivacy, type MemberPrivacy } from '../lib/memberPrivacy'
import { uploadProfilePhoto } from '../lib/profilePhoto'
import { resolveUserProfileForForm, saveUserProfile } from '../lib/userProfile'

const SETTINGS_PRIVACY_OPTIONS: ReadonlyArray<{ value: MemberPrivacy; label: string }> = [
  { value: 'network', label: 'Everyone' },
  { value: 'family_members', label: 'Family members only' },
  { value: 'only_me', label: 'Nobody' },
]

type NotificationPrefs = {
  email: boolean
  inApp: boolean
  weekly: boolean
}

const DEFAULT_NOTIFS: NotificationPrefs = {
  email: true,
  inApp: true,
  weekly: false,
}

function notifStorageKey(uid: string) {
  return `dengitree.notifPrefs.${uid}`
}

function loadNotifs(uid: string): NotificationPrefs {
  try {
    const raw = localStorage.getItem(notifStorageKey(uid))
    if (!raw) return DEFAULT_NOTIFS
    return { ...DEFAULT_NOTIFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_NOTIFS
  }
}

function SettingsIcon({ kind }: { kind: 'profile' | 'password' | 'bell' | 'shield' | 'camera' | 'trash' }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (kind) {
    case 'profile':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'password':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'camera':
      return (
        <svg {...props} width={14} height={14}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...props}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      )
  }
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`user-settings-switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="user-settings-switch-knob" />
    </button>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const photo = usePhotoPicker()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [profilePrivacy, setProfilePrivacy] = useState<MemberPrivacy>('family_members')
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState('')

  const [notifs, setNotifs] = useState<NotificationPrefs>(DEFAULT_NOTIFS)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const hasPasswordProvider =
    user?.providerData.some((p) => p.providerId === 'password') ?? false

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setNotifs(loadNotifs(user.uid))

    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setFirstName(profile.firstName)
      setLastName(profile.lastName)
      setEmail(profile.email || user.email?.trim() || '')
      setPhone(profile.phone ?? '')
      setPhotoURL(user.photoURL ?? profile.photoURL ?? null)
      setProfilePrivacy(
        parseMemberPrivacy(profile.profilePrivacy ?? profile.defaultMemberPrivacy),
      )
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const displayName =
    [firstName, lastName].map((p) => p.trim()).filter(Boolean).join(' ') ||
    user?.displayName?.trim() ||
    'Your profile'

  function updateNotif<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    if (!user) return
    setNotifs((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(notifStorageKey(user.uid), JSON.stringify(next))
      return next
    })
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setProfileError('')
    setProfileSaved('')
    setSavingProfile(true)
    try {
      let nextPhotoURL = photoURL ?? user.photoURL ?? undefined
      if (photo.file) {
        nextPhotoURL = await uploadProfilePhoto(user.uid, photo.file)
      }
      const displayNameSave = [firstName, lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ')

      await updateProfile(user, {
        ...(displayNameSave ? { displayName: displayNameSave } : {}),
        ...(nextPhotoURL ? { photoURL: nextPhotoURL } : {}),
      })

      await saveUserProfile(user.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        photoURL: nextPhotoURL,
        profilePrivacy,
      })

      if (nextPhotoURL) setPhotoURL(nextPhotoURL)
      photo.reset()
      setProfileSaved('Profile saved.')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleUpdatePassword(event: FormEvent) {
    event.preventDefault()
    if (!user?.email) return
    setPasswordError('')
    setPasswordSaved('')

    if (!hasPasswordProvider) {
      setPasswordError('This account uses Google sign-in. Password change is not available.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setSavingPassword(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved('Password updated.')
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.')
      } else if (code === 'auth/weak-password') {
        setPasswordError('Choose a stronger password (at least 6 characters).')
      } else {
        setPasswordError(err instanceof Error ? err.message : 'Could not update password.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user) return
    const confirmed = window.confirm(
      'Delete your DengiTree login?\n\nYour email/password sign-in will be removed. Your profile and family tree data can remain on the platform.',
    )
    if (!confirmed) return

    setDeleteError('')
    setDeleting(true)
    try {
      await deleteUser(user)
      await logout()
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : ''
      if (code === 'auth/requires-recent-login') {
        setDeleteError('For security, sign out and sign back in, then try deleting again.')
      } else {
        setDeleteError(err instanceof Error ? err.message : 'Could not delete account.')
      }
      setDeleting(false)
    }
  }

  const privacyLabel =
    SETTINGS_PRIVACY_OPTIONS.find((o) => o.value === profilePrivacy)?.label ??
    'Family members only'

  return (
    <div className="home user-settings-page">
      <header className="user-settings-head">
        <span className="user-settings-head-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
          </svg>
        </span>
        <div>
          <h1 id={titleId}>User Settings</h1>
          <p>Manage your account settings and preferences.</p>
        </div>
      </header>

      {loading ? (
        <div className="user-settings-loading">
          <LoadingSpinner size="lg" label="Loading settings" />
          <p>Loading your settings…</p>
        </div>
      ) : (
        <div className="user-settings-grid">
          {/* Profile Information */}
          <section className="user-settings-card user-settings-card--profile">
            <header className="user-settings-card-head">
              <span className="user-settings-card-icon">
                <SettingsIcon kind="profile" />
              </span>
              <div>
                <h2>Profile Information</h2>
                <p>Update your personal details.</p>
              </div>
            </header>

            <form onSubmit={(e) => void handleSaveProfile(e)}>
              <div className="user-settings-profile-body">
                <div className="user-settings-photo-col">
                  <div className="user-settings-photo-wrap">
                    <ProfileAvatar
                      photoURL={photo.previewUrl ?? photoURL}
                      name={displayName}
                      size="lg"
                      className="user-settings-avatar"
                    />
                    <button
                      type="button"
                      className="user-settings-camera-btn"
                      aria-label="Change photo"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <SettingsIcon kind="camera" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="user-settings-change-photo"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      photo.selectFile(e.target.files?.[0] ?? null)
                      e.target.value = ''
                    }}
                  />
                  {photo.error ? <p className="user-settings-inline-error">{photo.error}</p> : null}
                </div>

                <div className="user-settings-fields">
                  <label className="user-settings-field">
                    <span>First Name</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className="user-settings-field">
                    <span>Last Name</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                  <label className="user-settings-field">
                    <span>Email Address</span>
                    <input value={email} readOnly autoComplete="email" />
                  </label>
                  <label className="user-settings-field">
                    <span>Phone Number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      placeholder="Enter phone number"
                    />
                  </label>
                </div>
              </div>

              {profileError ? <p className="user-settings-error">{profileError}</p> : null}
              {profileSaved ? <p className="user-settings-success">{profileSaved}</p> : null}

              <div className="user-settings-card-actions">
                <button type="submit" className="user-settings-primary-btn" disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          {/* Change Password */}
          <section className="user-settings-card">
            <header className="user-settings-card-head">
              <span className="user-settings-card-icon">
                <SettingsIcon kind="password" />
              </span>
              <div>
                <h2>Change Password</h2>
                <p>Keep your account secure.</p>
              </div>
            </header>

            <form onSubmit={(e) => void handleUpdatePassword(e)}>
              <div className="user-settings-fields">
                <label className="user-settings-field">
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required={hasPasswordProvider}
                    disabled={!hasPasswordProvider || savingPassword}
                  />
                </label>
                <label className="user-settings-field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required={hasPasswordProvider}
                    disabled={!hasPasswordProvider || savingPassword}
                  />
                </label>
                <label className="user-settings-field">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required={hasPasswordProvider}
                    disabled={!hasPasswordProvider || savingPassword}
                  />
                </label>
              </div>

              {!hasPasswordProvider ? (
                <p className="user-settings-hint">
                  You signed in with Google. Password changes are managed through your Google account.
                </p>
              ) : null}
              {passwordError ? <p className="user-settings-error">{passwordError}</p> : null}
              {passwordSaved ? <p className="user-settings-success">{passwordSaved}</p> : null}

              <div className="user-settings-card-actions">
                <button
                  type="submit"
                  className="user-settings-primary-btn"
                  disabled={!hasPasswordProvider || savingPassword}
                >
                  {savingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>

          {/* Notification Preferences */}
          <section className="user-settings-card">
            <header className="user-settings-card-head">
              <span className="user-settings-card-icon">
                <SettingsIcon kind="bell" />
              </span>
              <div>
                <h2>Notification Preferences</h2>
                <p>Choose what notification you want to receive.</p>
              </div>
            </header>

            <ul className="user-settings-notif-list">
              <li>
                <div className="user-settings-notif-copy">
                  <span className="user-settings-notif-icon" aria-hidden="true">
                    <SettingsIcon kind="bell" />
                  </span>
                  <div>
                    <strong>Email Notifications</strong>
                    <span>Get updates via email</span>
                  </div>
                </div>
                <ToggleSwitch
                  label="Email Notifications"
                  checked={notifs.email}
                  onChange={(v) => updateNotif('email', v)}
                />
              </li>
              <li>
                <div className="user-settings-notif-copy">
                  <span className="user-settings-notif-icon" aria-hidden="true">
                    <SettingsIcon kind="bell" />
                  </span>
                  <div>
                    <strong>In-App Notifications</strong>
                    <span>See updates in the dashboard</span>
                  </div>
                </div>
                <ToggleSwitch
                  label="In-App Notifications"
                  checked={notifs.inApp}
                  onChange={(v) => updateNotif('inApp', v)}
                />
              </li>
              <li>
                <div className="user-settings-notif-copy">
                  <span className="user-settings-notif-icon" aria-hidden="true">
                    <SettingsIcon kind="bell" />
                  </span>
                  <div>
                    <strong>Weekly Reports</strong>
                    <span>Receive weekly summary reports</span>
                  </div>
                </div>
                <ToggleSwitch
                  label="Weekly Reports"
                  checked={notifs.weekly}
                  onChange={(v) => updateNotif('weekly', v)}
                />
              </li>
            </ul>
          </section>

          {/* Privacy & Account */}
          <section className="user-settings-card">
            <header className="user-settings-card-head">
              <span className="user-settings-card-icon">
                <SettingsIcon kind="shield" />
              </span>
              <div>
                <h2>Privacy &amp; Account</h2>
                <p>Manage your privacy and account.</p>
              </div>
            </header>

            <div className="user-settings-privacy-block">
              <button
                type="button"
                className="user-settings-privacy-trigger"
                aria-expanded={privacyOpen}
                onClick={() => setPrivacyOpen((open) => !open)}
              >
                <span className="user-settings-notif-icon" aria-hidden="true">
                  <SettingsIcon kind="shield" />
                </span>
                <span className="user-settings-privacy-copy">
                  <strong>Privacy Settings</strong>
                  <span>Control who can view your information · {privacyLabel}</span>
                </span>
                <span className="user-settings-chevron" aria-hidden="true">
                  ›
                </span>
              </button>

              {privacyOpen ? (
                <ul className="user-settings-privacy-menu" role="listbox">
                  {SETTINGS_PRIVACY_OPTIONS.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        className={
                          option.value === profilePrivacy
                            ? 'user-settings-privacy-option is-active'
                            : 'user-settings-privacy-option'
                        }
                        onClick={() => {
                          setProfilePrivacy(option.value)
                          setPrivacyOpen(false)
                          if (user) {
                            void saveUserProfile(user.uid, { profilePrivacy: option.value }).catch(
                              () => {
                                setProfileError('Could not save privacy setting.')
                              },
                            )
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="user-settings-delete-box">
              <span className="user-settings-delete-icon" aria-hidden="true">
                <SettingsIcon kind="trash" />
              </span>
              <p>
                Deleting your account will remove your email and password from DengiTree, but your
                profile and family tree will remain.
              </p>
              <button
                type="button"
                className="user-settings-delete-btn"
                disabled={deleting}
                onClick={() => void handleDeleteAccount()}
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
            {deleteError ? <p className="user-settings-error">{deleteError}</p> : null}
          </section>
        </div>
      )}
    </div>
  )
}
