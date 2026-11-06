import { useState } from 'react'
import AdminPageToolbar from '../components/AdminPageToolbar'
import AdminSideRail from '../components/AdminSideRail'
import StatusBadge from '../components/StatusBadge'
import { useRealProfileClaims } from '../lib/adminDataService'
import { useQuickFilterState } from '../lib/useQuickFilterState'

export default function ProfileClaimsPage() {
  const { claims, loading } = useRealProfileClaims()
  const [searchTerm, setSearchTerm] = useState('')
  const { filterState, toggleStatus, toggleRole, matchesStatusAndRole } = useQuickFilterState()

  const filteredClaims = claims.filter((c) => {
    const term = searchTerm.toLowerCase().trim()
    const textMatch =
      !term ||
      c.member.toLowerCase().includes(term) ||
      (c.memberEmail && c.memberEmail.toLowerCase().includes(term)) ||
      (c.claimant && c.claimant.toLowerCase().includes(term)) ||
      c.addedBy.toLowerCase().includes(term) ||
      c.relationship.toLowerCase().includes(term)

    const filterMatch = matchesStatusAndRole(c.status, 'Member')
    return textMatch && filterMatch
  })

  const claimedCount = claims.filter((c) => c.status === 'Claimed').length
  const unclaimedCount = claims.filter((c) => c.status === 'Unclaimed').length

  return (
    <>
      <AdminPageToolbar
        title="Profile Claims"
        subtitle="Verify which family profiles are claimed by a DengiTree account versus still unclaimed."
      />
      <div className="dt-content-split">
        <section className="dt-table-panel">
          <div
            className="dt-table-panel-head"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
          >
            <div>
              <h2>
                Family profiles ({filteredClaims.length} of {claims.length})
              </h2>
              <p>
                {claimedCount} claimed · {unclaimedCount} unclaimed. Use Quick Filters → Active for
                claimed, Pending Claim for unclaimed.
              </p>
            </div>
            <div style={{ minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Search claims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #c9dcb8',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>
          <table className="dt-data-table">
            <thead>
              <tr>
                <th scope="col">Member profile</th>
                <th scope="col">Relationship</th>
                <th scope="col">Added by</th>
                <th scope="col">Claimant</th>
                <th scope="col">Claim status</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="dt-empty-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading profile claims…
                  </td>
                </tr>
              ) : filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <strong>{claim.member}</strong>
                      {claim.memberEmail && claim.memberEmail !== claim.member ? (
                        <div className="dt-cell-muted">{claim.memberEmail}</div>
                      ) : null}
                    </td>
                    <td>{claim.relationship}</td>
                    <td>{claim.addedBy}</td>
                    <td>{claim.claimant ?? '—'}</td>
                    <td>
                      <StatusBadge variant={claim.status === 'Claimed' ? 'Claimed' : 'Unclaimed'} />
                    </td>
                    <td>{claim.submitted}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="dt-empty-cell dt-empty-cell--tall"
                    style={{ textAlign: 'center', padding: '2rem' }}
                  >
                    No profiles matching current filters or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
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
