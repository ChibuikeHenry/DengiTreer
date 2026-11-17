import { NavLink } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import type { AdminPermission } from '../lib/adminPermissions'
import {
  IconCalendar,
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

type NavItem = {
  to: string
  label: string
  icon: typeof IconOverview
  permission: AdminPermission | null
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: IconOverview, permission: null },
  { to: '/users', label: 'User Management', icon: IconUsers, permission: 'manage_users' },
  { to: '/family-trees', label: 'Family Trees', icon: IconTree, permission: 'manage_trees' },
  { to: '/add-user', label: 'Add User', icon: IconUserPlus, permission: 'create_accounts' },
  {
    to: '/create-family-tree',
    label: 'Create Family Tree',
    icon: IconPlusSquare,
    permission: 'create_family_trees',
  },
  {
    to: '/profile-claims',
    label: 'Profile Claims',
    icon: IconShield,
    permission: 'manage_claims',
  },
  {
    to: '/invitations',
    label: 'Invitations',
    icon: IconMail,
    permission: 'manage_invitations',
  },
  { to: '/concessions', label: 'Concession Review', icon: IconCalendar, permission: null },
  { to: '/privacy', label: 'Privacy & Safety', icon: IconFolder, permission: 'manage_privacy' },
  { to: '/settings', label: 'Settings', icon: IconSettings, permission: null },
]

export default function AdminSidebar() {
  const { can } = useAdminAuth()

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
        {navItems
          .filter((item) => item.permission === null || can(item.permission))
          .map((item) => {
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
