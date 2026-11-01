import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import InvitationsTable from '../components/InvitationsTable'
import { useRealInvitations } from '../lib/adminDataService'

export default function InvitationsPage() {
  const { invitations, loading } = useRealInvitations()

  return (
    <>
      <AdminPageToolbar
        title="Invitations"
        subtitle="Send and track family and group invitations."
      />
      <div className="dt-content-split">
        <div className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>All Invitations ({invitations.length})</h2>
            <p>Track pending and sent invitations across DengiTree.</p>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#5c6456' }}>
              Loading invitations...
            </div>
          ) : (
            <InvitationsTable rows={invitations} />
          )}
        </div>
        <AdminSideRail />
      </div>
    </>
  )
}
