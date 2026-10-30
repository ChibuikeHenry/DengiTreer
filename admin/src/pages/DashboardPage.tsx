import AdminPageToolbar from '../components/AdminPageToolbar'
import { IconChevronRight } from '../components/AdminNavIcons'
import StatusBadge from '../components/StatusBadge'
import {
  adminQuickActions,
  chartMonths,
  chartPoints,
  operationsQueue,
  platformStats,
  recentPlatformActivity,
} from '../data/mockPlatformData'

function toneClass(tone: string) {
  return `dt-stat-card dt-stat-card--${tone}`
}

function queueDot(tone: string) {
  return `dt-queue-dot dt-queue-dot--${tone}`
}

export default function DashboardPage() {
  const max = Math.max(...chartPoints)
  const width = 400
  const height = 160
  const step = width / (chartPoints.length - 1)
  const points = chartPoints
    .map((v, i) => {
      const x = i * step
      const y = height - (v / max) * (height - 20) - 10
      return `${x},${y}`
    })
    .join(' ')

  return (
    <>
      <AdminPageToolbar
        title="Platform Overview"
        subtitle="Monitor user activity, account claims, invitations, and relationship verification across DengiTree."
        backTo="/dashboard"
      />

      <div className="dt-stat-grid">
        {platformStats.map((stat) => (
          <article key={stat.label} className={toneClass(stat.tone)}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div className="dt-overview-mid">
        <section className="dt-panel">
          <h2 className="dt-panel-title">Platform Overview</h2>
          <div className="dt-chart-wrap">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Activity trend">
              <polyline
                fill="none"
                stroke="#34611d"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {chartPoints.map((v, i) => {
                const x = i * step
                const y = height - (v / max) * (height - 20) - 10
                return <circle key={i} cx={x} cy={y} r="5" fill="#163706" />
              })}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#5c6456' }}>
            {chartMonths.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </section>

        <section className="dt-panel">
          <h2 className="dt-panel-title">Operations Queue</h2>
          <ul className="dt-queue-list">
            {operationsQueue.map((item) => (
              <li key={item.label}>
                <button type="button">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={queueDot(item.tone)} />
                    {item.label}
                  </span>
                  <IconChevronRight />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="dt-panel">
          <h2 className="dt-panel-title">Admin Quick Actions</h2>
          <ul className="dt-quick-actions">
            {adminQuickActions.map((label) => (
              <li key={label}>
                <button type="button">{label}</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="dt-table-panel">
        <div className="dt-table-panel-head">
          <h2>Recent Platform Activity</h2>
        </div>
        <table className="dt-data-table">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {recentPlatformActivity.map((row) => (
              <tr key={row.time + row.event}>
                <td>{row.event}</td>
                <td>{row.category}</td>
                <td>
                  <StatusBadge variant={row.status === 'Completed' ? 'Active' : 'Pending'} />
                </td>
                <td>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
