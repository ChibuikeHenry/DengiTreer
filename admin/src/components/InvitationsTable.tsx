import type { InvitationRow } from '../data/mockAdminData'
import StatusBadge from './StatusBadge'

type InvitationsTableProps = {
  rows: InvitationRow[]
}

export default function InvitationsTable({ rows }: InvitationsTableProps) {
  return (
    <table className="dt-data-table">
      <thead>
        <tr>
          <th scope="col">Email</th>
          <th scope="col">Invited By</th>
          <th scope="col">Role</th>
          <th scope="col">Status</th>
          <th scope="col">Sent</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.email}</td>
            <td>{row.invitedBy}</td>
            <td>
              <StatusBadge variant={row.role} />
            </td>
            <td>
              <StatusBadge variant={row.status} />
            </td>
            <td>{row.sent}</td>
            <td>
              <button type="button" className="dt-logout-btn">
                Resend
              </button>
              {' · '}
              <button type="button" style={{ color: '#b42318', background: 'none', border: 'none', cursor: 'pointer' }}>
                Revoke
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
