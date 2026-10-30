import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import AdminBrand from './AdminBrand'
import { IconBell, IconChevronDown } from './AdminIcons'
import { auth } from '../firebase'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'User Management' },
  { to: '/invitations', label: 'Invitations' },
  { to: '/family-trees', label: 'Family Trees' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
] as const

export default function AdminShell() {
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <AdminBrand />
          <nav className="admin-topnav" aria-label="Admin">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="admin-topbar-right">
          <button type="button" className="admin-icon-btn" aria-label="Notifications">
            <IconBell />
          </button>
          <button type="button" className="admin-user-menu" aria-label="Account menu">
            <span className="admin-avatar" aria-hidden="true">
              AU
            </span>
            Admin User
            <IconChevronDown />
          </button>
          <button type="button" className="admin-link-green" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
