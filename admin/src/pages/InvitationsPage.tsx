import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import InvitationsTable from '../components/InvitationsTable'
import { invitationsPage } from '../data/mockAdminData'

export default function InvitationsPage() {
  return (
    <>
      <AdminPageToolbar
        title="Invitations"
        subtitle="Send and track family and group invitations."
      />
      <div className="dt-content-split">
        <div className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>All Invitations</h2>
            <p>Resend or revoke pending invites.</p>
          </div>
          <InvitationsTable rows={invitationsPage} />
        </div>
        <AdminSideRail />
      </div>
    </>
  )
}
