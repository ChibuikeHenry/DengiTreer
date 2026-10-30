import { NavLink } from 'react-router-dom'
import {
  IconFolder,
  IconMail,
  IconOverview,
  IconPlusSquare,
  IconSettings,
  IconShield,
  IconTree,
  IconUserPlus,
  IconUsers,
} from './AdminNavIcons'

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: IconOverview },
  { to: '/users', label: 'User Management', icon: IconUsers },
  { to: '/family-trees', label: 'Family Trees', icon: IconTree },
  { to: '/add-user', label: 'Add User', icon: IconUserPlus },
  { to: '/create-family-tree', label: 'Create Family Tree', icon: IconPlusSquare },
  { to: '/profile-claims', label: 'Profile Claims', icon: IconShield },
  { to: '/invitations', label: 'Invitations', icon: IconMail },
  { to: '/privacy', label: 'Privacy & Safety', icon: IconFolder },
  { to: '/settings', label: 'Settings', icon: IconSettings },
] as const

export default function AdminSidebar() {
  return (
    <aside className="dt-sidebar">
      <div className="dt-sidebar-brand">
        <img src="/favicon.svg" alt="" className="dt-sidebar-logo" width={36} height={36} />
        <div>
          <div className="dt-sidebar-name">DengiTree</div>
          <div className="dt-sidebar-tag">Your Family. Your Story. Connected.</div>
        </div>
      </div>
      <nav className="dt-sidebar-nav" aria-label="Admin navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'dt-sidebar-link is-active' : 'dt-sidebar-link'
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
