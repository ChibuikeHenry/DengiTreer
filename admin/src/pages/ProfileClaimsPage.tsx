import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'

export default function ProfileClaimsPage() {
  return (
    <>
      <AdminPageToolbar
        title="Profile Claims"
        subtitle="Review profile claim requests and verify relationships."
      />
      <div className="dt-content-split">
        <section className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>Claims awaiting review</h2>
            <p>Approve or reject member profile claims.</p>
          </div>
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Claimant</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="dt-empty-cell">
                  No profile claims in the queue.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <AdminSideRail variant="users" />
      </div>
    </>
  )
}
