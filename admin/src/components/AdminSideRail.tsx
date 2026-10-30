import { Link } from 'react-router-dom'
import { IconChevronRight } from './AdminNavIcons'

type AdminSideRailProps = {
  variant?: 'users' | 'trees'
}

const userActions = [
  { label: 'Add New User', to: '/add-user' },
  { label: 'Upload Users', to: '/add-user' },
  { label: 'Send Invitation', to: '/invitations' },
  { label: 'Manage Roles', to: '/users' },
  { label: 'View Active Logs', to: '/dashboard' },
] as const

const treeActions = [
  { label: 'Create Family Tree', to: '/create-family-tree' },
  { label: 'Add New User', to: '/add-user' },
  { label: 'Send Invitation', to: '/invitations' },
  { label: 'Export Trees', to: '/family-trees' },
  { label: 'View Active Logs', to: '/dashboard' },
] as const

export default function AdminSideRail({ variant = 'users' }: AdminSideRailProps) {
  const actions = variant === 'trees' ? treeActions : userActions

  return (
    <aside className="dt-side-rail">
      <section className="dt-panel dt-panel--filters">
        <h2 className="dt-panel-title">Quick Filters</h2>
        <div className="dt-filter-group">
          <h3>User Status</h3>
          <label>
            <input type="checkbox" defaultChecked /> Active
          </label>
          <label>
            <input type="checkbox" /> Pending Claim
          </label>
          <label>
            <input type="checkbox" /> Inactive
          </label>
          <label>
            <input type="checkbox" /> Blocked
          </label>
        </div>
        <div className="dt-filter-group">
          <h3>Role</h3>
          <label>
            <input type="checkbox" defaultChecked /> Member
          </label>
          <label>
            <input type="checkbox" /> Admin
          </label>
        </div>
      </section>

      <section className="dt-panel dt-panel--actions">
        <h2 className="dt-panel-title">{variant === 'trees' ? 'Tree Actions' : 'User Actions'}</h2>
        <ul className="dt-action-list">
          {actions.map((item) => (
            <li key={item.label}>
              <Link to={item.to}>
                {item.label}
                <IconChevronRight />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
