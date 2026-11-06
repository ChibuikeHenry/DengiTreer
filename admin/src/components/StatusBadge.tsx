type StatusBadgeProps = {
  variant:
    | 'Active'
    | 'Pending'
    | 'Sent'
    | 'Expired'
    | 'Admin'
    | 'Member'
    | 'Claimed'
    | 'Unclaimed'
}

const classMap: Record<StatusBadgeProps['variant'], string> = {
  Active: 'admin-badge--active',
  Pending: 'admin-badge--pending',
  Sent: 'admin-badge--sent',
  Expired: 'admin-badge--expired',
  Admin: 'admin-badge--admin',
  Member: 'admin-badge--member',
  Claimed: 'admin-badge--claimed',
  Unclaimed: 'admin-badge--unclaimed',
}

export default function StatusBadge({ variant }: StatusBadgeProps) {
  return <span className={`admin-badge ${classMap[variant]}`}>{variant}</span>
}
