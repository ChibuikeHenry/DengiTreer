type StatusBadgeProps = {
  variant: 'Active' | 'Pending' | 'Sent' | 'Expired' | 'Admin' | 'Member'
}

const classMap: Record<StatusBadgeProps['variant'], string> = {
  Active: 'admin-badge--active',
  Pending: 'admin-badge--pending',
  Sent: 'admin-badge--sent',
  Expired: 'admin-badge--expired',
  Admin: 'admin-badge--admin',
  Member: 'admin-badge--member',
}

export default function StatusBadge({ variant }: StatusBadgeProps) {
  return <span className={`admin-badge ${classMap[variant]}`}>{variant}</span>
}
