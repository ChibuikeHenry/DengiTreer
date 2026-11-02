import { useState } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import { IconUsers } from '../components/AdminNavIcons'
import StatusBadge from '../components/StatusBadge'
import { useRealUsers } from '../lib/adminDataService'
import { useQuickFilterState } from '../lib/useQuickFilterState'

export default function UserManagementPage() {
  const { users, loading, error } = useRealUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const { filterState, toggleStatus, toggleRole, matchesStatusAndRole } = useQuickFilterState()

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase()
    const textMatch = u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    const filterMatch = matchesStatusAndRole(u.status, u.role)
    return textMatch && filterMatch
  })

  return (
    <>
      <AdminPageToolbar
        title="User Management"
        subtitle="View, search, and manage all users on the DengiTree platform."
      />

      <div className="dt-content-split">
        <section className="dt-table-panel">
          <div className="dt-table-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>
                <IconUsers size={18} />
                All Users ({filteredUsers.length} of {users.length})
              </h2>
              <p>Manage user accounts, roles and status.</p>
            </div>
            <div style={{ minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #c9dcb8',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Joined On</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="dt-empty-cell" style={{ textAlign: 'center', color: '#c53030', padding: '2rem' }}>
                    {error}
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{row.email}</td>
                    <td>
                      <span className="dt-role-pill">{row.role}</span>
                    </td>
                    <td>
                      <StatusBadge variant={row.status} />
                    </td>
                    <td>{row.joined}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="dt-empty-cell dt-empty-cell--tall" style={{ textAlign: 'center', padding: '2rem' }}>
                    No users matching current filters or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <AdminSideRail
          variant="users"
          filterState={filterState}
          onToggleStatus={toggleStatus}
          onToggleRole={toggleRole}
        />
      </div>
    </>
  )
}
