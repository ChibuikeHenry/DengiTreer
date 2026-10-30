import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import { IconTree } from '../components/AdminNavIcons'
const SHOW_SAMPLE_TREES = false

export default function FamilyTreesPage() {
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
              All Family Trees
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
                <th scope="col">Last Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SHOW_SAMPLE_TREES ? (
                <tr>
                  <td colSpan={6} className="dt-empty-cell">
                    Sample rows disabled.
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="dt-empty-cell dt-empty-cell--tall" />
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <AdminSideRail variant="trees" />
      </div>
    </>
  )
}
