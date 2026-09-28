type UpcomingBadgeProps = {
  label?: string
}

export default function UpcomingBadge({ label = 'Coming soon' }: UpcomingBadgeProps) {
  return <span className="upcoming-badge">{label}</span>
}
