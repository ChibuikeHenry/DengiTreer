import { useState } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import { IconUsers, IconTree } from '../components/AdminNavIcons'
import StatusBadge from '../components/StatusBadge'
import UserFamilyTreeModal from '../components/UserFamilyTreeModal'
import { useRealUsers } from '../lib/adminDataService'
import { useQuickFilterState } from '../lib/useQuickFilterState'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function UserManagementPage() {
  const { users, loading, error } = useRealUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
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
              <p>Manage user accounts, roles and status. Click any user to view their family tree.</p>
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
                <th scope="col" style={{ textAlign: 'right' }}>Family Tree</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="dt-empty-cell" style={{ textAlign: 'center', color: '#c53030', padding: '2rem' }}>
                    {error}
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((row) => (
                  <tr
                    key={row.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedUserId(row.id)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {row.photoUrl ? (
                          <img
                            src={row.photoUrl}
                            alt={row.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #34611d',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#163706',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(row.name)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUserId(row.id)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#163706',
                            fontWeight: 700,
                            textAlign: 'left',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textDecorationColor: 'transparent',
                            transition: 'text-decoration-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = '#163706')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = 'transparent')}
                        >
                          {row.name}
                        </button>
                      </div>
                    </td>
                    <td>{row.email}</td>
                    <td>
                      <span className="dt-role-pill">{row.role}</span>
                    </td>
                    <td>
                      <StatusBadge variant={row.status} />
                    </td>
                    <td>{row.joined}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedUserId(row.id)
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#eef6e8',
                          color: '#163706',
                          border: '1px solid #c8e0b8',
                          borderRadius: '6px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <IconTree size={14} />
                        View Tree
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="dt-empty-cell dt-empty-cell--tall" style={{ textAlign: 'center', padding: '2rem' }}>
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

      {selectedUserId ? (
        <UserFamilyTreeModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      ) : null}
    </>
  )
}
