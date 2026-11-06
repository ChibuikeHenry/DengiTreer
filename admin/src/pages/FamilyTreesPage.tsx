import { useState } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import { IconTree } from '../components/AdminNavIcons'
import StatusBadge from '../components/StatusBadge'
import UserFamilyTreeModal from '../components/UserFamilyTreeModal'
import { useRealFamilyTrees } from '../lib/adminDataService'
import { useQuickFilterState } from '../lib/useQuickFilterState'

export default function FamilyTreesPage() {
  const { trees, loading } = useRealFamilyTrees()
  const [selectedTreeUid, setSelectedTreeUid] = useState<string | null>(null)
  const { filterState, toggleStatus, toggleRole, matchesStatusAndRole } = useQuickFilterState()

  const filteredTrees = trees.filter((t) => matchesStatusAndRole(t.status, 'Member'))

  return (
    <>
      <AdminPageToolbar
        title="Family Trees"
        subtitle="Manage all family trees created on the DengiTree platform."
      />

      <div className="dt-content-split">
        <section className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>
              <IconTree size={18} />
              All Family Trees ({filteredTrees.length} of {trees.length})
            </h2>
            <p>View owners, member counts, and tree status. Click any row to inspect the full tree.</p>
          </div>
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Tree Name</th>
                <th scope="col">Owner</th>
                <th scope="col">Members</th>
                <th scope="col">Status</th>
                <th scope="col">Created On</th>
                <th scope="col" style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading family trees...
                  </td>
                </tr>
              ) : filteredTrees.length > 0 ? (
                filteredTrees.map((tree) => (
                  <tr
                    key={tree.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedTreeUid(tree.id)}
                  >
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTreeUid(tree.id)
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
                        {tree.treeName}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tree.ownerPhotoUrl ? (
                          <img
                            src={tree.ownerPhotoUrl}
                            alt={tree.owner}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #34611d',
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        <span>{tree.owner}</span>
                      </div>
                    </td>
                    <td>{tree.members} members</td>
                    <td>
                      <StatusBadge variant={tree.status} />
                    </td>
                    <td>{tree.created}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTreeUid(tree.id)
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
                    No family trees matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <AdminSideRail
          variant="trees"
          filterState={filterState}
          onToggleStatus={toggleStatus}
          onToggleRole={toggleRole}
        />
      </div>

      {selectedTreeUid ? (
        <UserFamilyTreeModal
          userId={selectedTreeUid}
          onClose={() => setSelectedTreeUid(null)}
        />
      ) : null}
    </>
  )
}
