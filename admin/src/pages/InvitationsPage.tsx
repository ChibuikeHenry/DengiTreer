import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import InvitationsTable from '../components/InvitationsTable'
import { useRealInvitations } from '../lib/adminDataService'
import { useQuickFilterState } from '../lib/useQuickFilterState'

export default function InvitationsPage() {
  const { invitations, loading } = useRealInvitations()
  const { filterState, toggleStatus, toggleRole, matchesStatusAndRole } = useQuickFilterState()

  const filteredInvitations = invitations.filter((inv) =>
    matchesStatusAndRole(inv.status, inv.role),
  )

  return (
    <>
      <AdminPageToolbar
        title="Invitations"
        subtitle="Send and track family and group invitations."
      />
      <div className="dt-content-split">
        <div className="dt-table-panel">
          <div className="dt-table-panel-head">
            <h2>
              All Invitations ({filteredInvitations.length} of {invitations.length})
            </h2>
            <p>Track pending and sent invitations across DengiTree.</p>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#5c6456' }}>
              Loading invitations...
            </div>
          ) : (
            <InvitationsTable rows={filteredInvitations} />
          )}
        </div>
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
