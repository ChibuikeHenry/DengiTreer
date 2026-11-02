import { Link } from 'react-router-dom'
import { IconChevronRight } from './AdminNavIcons'

export type FilterState = {
  statuses: string[]
  roles: string[]
}

type AdminSideRailProps = {
  variant?: 'users' | 'trees'
  filterState?: FilterState
  onToggleStatus?: (status: string) => void
  onToggleRole?: (role: string) => void
}

const ALL_STATUSES = ['Active', 'Pending Claim', 'Inactive', 'Blocked'] as const
const ALL_ROLES = ['Member', 'Admin'] as const

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

export default function AdminSideRail({
  variant = 'users',
  filterState,
  onToggleStatus,
  onToggleRole,
}: AdminSideRailProps) {
  const actions = variant === 'trees' ? treeActions : userActions

  const activeStatuses = filterState?.statuses ?? [...ALL_STATUSES]
  const activeRoles = filterState?.roles ?? [...ALL_ROLES]

  return (
    <aside className="dt-side-rail">
      <section className="dt-panel dt-panel--filters">
        <h2 className="dt-panel-title">Quick Filters</h2>

        <div className="dt-filter-group">
          <h3>User Status</h3>
          {ALL_STATUSES.map((status) => {
            const isChecked = activeStatuses.includes(status)
            return (
              <label key={status}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleStatus?.(status)}
                />{' '}
                {status}
              </label>
            )
          })}
        </div>

        <div className="dt-filter-group">
          <h3>Role</h3>
          {ALL_ROLES.map((role) => {
            const isChecked = activeRoles.includes(role)
            return (
              <label key={role}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleRole?.(role)}
                />{' '}
                {role}
              </label>
            )
          })}
        </div>
      </section>

      <section className="dt-panel dt-panel--actions">
        <h2 className="dt-panel-title">
          {variant === 'trees' ? 'Tree Actions' : 'User Actions'}
        </h2>
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
