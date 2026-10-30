import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { IconBell, IconChevronDown, IconSearch } from './AdminIcons'
import { useAdminAuth } from '../context/AdminAuthContext'
import { auth } from '../firebase'

export default function AdminTopBar() {
  const { user } = useAdminAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  const initial =
    user?.email?.trim().charAt(0).toUpperCase() ||
    user?.displayName?.trim().charAt(0).toUpperCase() ||
    'A'

  return (
    <header className="dt-topbar">
      <div className="dt-topbar-search">
        <IconSearch />
        <input
          type="search"
          placeholder="Search users, profiles, claims, invitations…"
          aria-label="Search admin platform"
        />
      </div>
      <div className="dt-topbar-actions">
        <button type="button" className="dt-icon-btn" aria-label="Notifications">
          <IconBell />
        </button>
        <button type="button" className="dt-profile-btn" aria-label="Admin platform menu">
          <span className="dt-profile-avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="dt-profile-label">Admin Platform</span>
          <IconChevronDown />
        </button>
        <button type="button" className="dt-logout-btn" onClick={() => void handleLogout()}>
          Log out
        </button>
      </div>
    </header>
  )
}
