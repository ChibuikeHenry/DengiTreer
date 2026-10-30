import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import { IconUsers } from '../components/AdminNavIcons'
import { members } from '../data/mockAdminData'
import StatusBadge from '../components/StatusBadge'

/** Set true to preview table rows; Figma shows an empty grid. */
const SHOW_SAMPLE_USERS = false

export default function UserManagementPage() {
  return (
    <>
      <AdminPageToolbar
        title="User Management"
        subtitle="View, search, and manage all users on the DengiTree platform."
      />

      <div className="dt-content-split">
        <section className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>
              <IconUsers size={18} />
              All Users
            </h2>
            <p>Manage user accounts, roles and status.</p>
          </div>
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Joined On</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SHOW_SAMPLE_USERS ? (
                members.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>
                      <StatusBadge variant={row.status} />
                    </td>
                    <td>{row.joined}</td>
                    <td>
                      <button type="button" className="dt-logout-btn">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="dt-empty-cell dt-empty-cell--tall" />
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <AdminSideRail variant="users" />
      </div>
    </>
  )
}
