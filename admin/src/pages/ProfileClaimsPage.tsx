import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import StatusBadge from '../components/StatusBadge'
import { useRealProfileClaims } from '../lib/adminDataService'

export default function ProfileClaimsPage() {
  const { claims, loading } = useRealProfileClaims()

  return (
    <>
      <AdminPageToolbar
        title="Profile Claims"
        subtitle="Review profile claim requests and verify relationships."
      />
      <div className="dt-content-split">
        <section className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>Claims Awaiting Review ({claims.length})</h2>
            <p>Approve or reject member profile claims.</p>
          </div>
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Claimant</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length > 0 ? (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <strong>{claim.member}</strong>
                    </td>
                    <td>{claim.claimant}</td>
                    <td>
                      <StatusBadge variant={claim.status === 'Approved' ? 'Active' : 'Pending'} />
                    </td>
                    <td>{claim.submitted}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="dt-empty-cell dt-empty-cell--tall" style={{ textAlign: 'center', padding: '2rem' }}>
                    No profile claims in the queue.
                  </td>
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
