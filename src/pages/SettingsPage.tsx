import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UpcomingBadge from '../components/UpcomingBadge'
import { useAuth } from '../context/AuthContext'
import {
  DEFAULT_MEMBER_PRIVACY,
  MEMBER_PRIVACY_OPTIONS,
  type MemberPrivacy,
  parseMemberPrivacy,
} from '../lib/memberPrivacy'
import { resolveUserProfileForForm, saveUserProfile } from '../lib/userProfile'

export default function SettingsPage() {
  const { user } = useAuth()
  const [defaultPrivacy, setDefaultPrivacy] =
    useState<MemberPrivacy>(DEFAULT_MEMBER_PRIVACY)
  const [privacyStatus, setPrivacyStatus] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setDefaultPrivacy(parseMemberPrivacy(profile.defaultMemberPrivacy))
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleDefaultPrivacyChange(value: MemberPrivacy) {
    if (!user) return
    setDefaultPrivacy(value)
    setPrivacyStatus('Saving…')
    try {
      await saveUserProfile(user.uid, { defaultMemberPrivacy: value })
      setPrivacyStatus('Saved')
    } catch {
      setPrivacyStatus('Could not save. Try again.')
    }
  }

  return (
    <div className="home upcoming-page settings-page">
      <header className="upcoming-head">
        <div>
          <h1>Settings</h1>
          <p>Control notifications, privacy, and how DengiTree works for you.</p>
        </div>
      </header>

      <section className="home-card upcoming-panel settings-group">
        <h2>Account</h2>
        <ul className="settings-list">
          <li className="settings-row">
            <div>
              <strong>Profile &amp; photo</strong>
              <span>{user?.email ?? 'Signed-in account'}</span>
            </div>
            <Link to="/home/profile" className="settings-link">
              Edit
            </Link>
          </li>
          <li className="settings-row settings-row-disabled">
            <div>
              <strong>Change password</strong>
              <span>Email sign-in only</span>
            </div>
            <UpcomingBadge label="Soon" />
          </li>
        </ul>
      </section>

      <section className="home-card upcoming-panel settings-group">
        <h2>Notifications</h2>
        <ul className="settings-list">
          <li className="settings-row settings-row-disabled">
            <div>
              <strong>Invitation updates</strong>
              <span>When someone accepts your invite</span>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" disabled defaultChecked />
              <span className="settings-toggle-ui" />
            </label>
          </li>
          <li className="settings-row settings-row-disabled">
            <div>
              <strong>Discovery suggestions</strong>
              <span>Possible relatives in the network</span>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" disabled />
              <span className="settings-toggle-ui" />
            </label>
          </li>
        </ul>
      </section>

      <section className="home-card upcoming-panel settings-group">
        <h2>Privacy</h2>
        <ul className="settings-list">
          <li className="settings-row settings-row-privacy">
            <div>
              <strong>Default for new family members</strong>
              <span>Used when you add parents, spouses, children, or siblings</span>
              {privacyStatus ? (
                <span className="settings-inline-status">{privacyStatus}</span>
              ) : null}
            </div>
            <select
              className="settings-select"
              value={defaultPrivacy}
              onChange={(e) =>
                void handleDefaultPrivacyChange(e.target.value as MemberPrivacy)
              }
              aria-label="Default privacy for new family members"
            >
              {MEMBER_PRIVACY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </li>
          <li className="settings-row">
            <div>
              <strong>Per-person privacy</strong>
              <span>Update visibility for someone you already added</span>
            </div>
            <Link to="/home/invitations" className="settings-link">
              Invitations
            </Link>
          </li>
          <li className="settings-row settings-row-disabled">
            <div>
              <strong>Hide living relatives from search</strong>
              <span>Discover connections</span>
            </div>
            <UpcomingBadge />
          </li>
        </ul>
      </section>

      <section className="home-card upcoming-preview-card">
        <h2>More settings coming</h2>
        <ul className="upcoming-feature-list">
          <li>Two-factor authentication</li>
          <li>Download your data</li>
          <li>Delete account</li>
        </ul>
      </section>
    </div>
  )
}
