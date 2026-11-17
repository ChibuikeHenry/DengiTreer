import { useMemo, useState } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import StatusBadge from '../components/StatusBadge'
import {
  updateConcessionRequestStatus,
  useRealConcessionRequests,
  type ConcessionRequestStatus,
  type RealConcessionRequest,
} from '../lib/adminDataService'

type StatusFilter = 'all' | ConcessionRequestStatus

function statusBadge(status: ConcessionRequestStatus) {
  if (status === 'approved') return <StatusBadge variant="Active" />
  if (status === 'rejected') return <StatusBadge variant="Expired" />
  return <StatusBadge variant="Pending" />
}

export default function ConcessionReviewPage() {
  const { requests, loading, error } = useRealConcessionRequests()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return requests.filter((row) => {
      const statusMatch = statusFilter === 'all' || row.status === statusFilter
      const textMatch =
        !term ||
        row.email.toLowerCase().includes(term) ||
        row.reasonLabel.toLowerCase().includes(term) ||
        (row.phone && row.phone.toLowerCase().includes(term)) ||
        (row.details && row.details.toLowerCase().includes(term))
      return statusMatch && textMatch
    })
  }, [requests, searchTerm, statusFilter])

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  async function handleReview(row: RealConcessionRequest, status: 'approved' | 'rejected') {
    setActionError('')
    setBusyId(row.id)
    try {
      await updateConcessionRequestStatus(row.id, status)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this request.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AdminPageToolbar
        title="Concession Review"
        subtitle="Review pricing concession requests and approve or reject each submission."
        backTo="/dashboard"
      />

      <section className="dt-table-panel">
        <div
          className="dt-table-panel-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2>
              Concession requests ({filtered.length} of {requests.length})
            </h2>
            <p>
              {pendingCount} pending · {approvedCount} approved · {rejectedCount} rejected
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by status"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #c9dcb8',
                fontSize: '0.85rem',
                background: '#ffffff',
              }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <input
              type="text"
              placeholder="Search email, reason…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                minWidth: '220px',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #c9dcb8',
                fontSize: '0.85rem',
                background: '#ffffff',
              }}
            />
          </div>
        </div>

        {error ? <p className="dt-settings-error">{error}</p> : null}
        {actionError ? <p className="dt-settings-error">{actionError}</p> : null}

        <div className="dt-table-scroll">
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Requester</th>
                <th scope="col">Reason</th>
                <th scope="col">Details</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading concession requests…
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.email || '—'}</strong>
                      {row.phone ? <div className="dt-cell-muted">{row.phone}</div> : null}
                    </td>
                    <td>{row.reasonLabel}</td>
                    <td style={{ maxWidth: '220px' }}>
                      {row.details ? (
                        <span title={row.details}>{row.details}</span>
                      ) : (
                        <span className="dt-cell-muted">—</span>
                      )}
                    </td>
                    <td>{row.submitted}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>
                      {row.status === 'pending' ? (
                        <div className="dt-row-actions">
                          <button
                            type="button"
                            className="dt-link-btn"
                            disabled={busyId === row.id}
                            onClick={() => void handleReview(row, 'approved')}
                          >
                            {busyId === row.id ? 'Saving…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="dt-link-btn dt-link-btn--danger"
                            disabled={busyId === row.id}
                            onClick={() => void handleReview(row, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="dt-cell-muted">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="dt-empty-cell dt-empty-cell--tall"
                    style={{ textAlign: 'center', padding: '2rem' }}
                  >
                    No concession requests match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
