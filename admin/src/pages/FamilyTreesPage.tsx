import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import { IconTree } from '../components/AdminNavIcons'
import StatusBadge from '../components/StatusBadge'
import { useRealFamilyTrees } from '../lib/adminDataService'
import { useQuickFilterState } from '../lib/useQuickFilterState'

export default function FamilyTreesPage() {
  const { trees, loading } = useRealFamilyTrees()
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
            <p>View owners, member counts, and tree status.</p>
          </div>
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Tree Name</th>
                <th scope="col">Owner</th>
                <th scope="col">Members</th>
                <th scope="col">Status</th>
                <th scope="col">Created On</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading family trees...
                  </td>
                </tr>
              ) : filteredTrees.length > 0 ? (
                filteredTrees.map((tree) => (
                  <tr key={tree.id}>
                    <td>
                      <strong>{tree.treeName}</strong>
                    </td>
                    <td>{tree.owner}</td>
                    <td>{tree.members} members</td>
                    <td>
                      <StatusBadge variant={tree.status} />
                    </td>
                    <td>{tree.created}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="dt-empty-cell dt-empty-cell--tall" style={{ textAlign: 'center', padding: '2rem' }}>
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
    </>
  )
}
