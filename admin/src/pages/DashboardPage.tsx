import { Link } from 'react-router-dom'
import AdminPageToolbar from '../components/AdminPageToolbar'
import { IconChevronRight } from '../components/AdminNavIcons'
import StatusBadge from '../components/StatusBadge'
import { useRealPlatformOverview } from '../lib/adminDataService'

function toneClass(tone: string) {
  return `dt-stat-card dt-stat-card--${tone}`
}

function queueDot(tone: string) {
  return `dt-queue-dot dt-queue-dot--${tone}`
}

export default function DashboardPage() {
  const { stats, recentActivities, operationsQueue, growthTrend } = useRealPlatformOverview()

  const chartPoints = growthTrend.points.length > 0 ? growthTrend.points : [0]
  const chartMonths = growthTrend.months.length > 0 ? growthTrend.months : ['Nov']

  const max = Math.max(...chartPoints, 1)
  const width = 400
  const height = 160
  const step = chartPoints.length > 1 ? width / (chartPoints.length - 1) : 0
  const points = chartPoints
    .map((v, i) => {
      const x = chartPoints.length === 1 ? width / 2 : i * step
      const y = height - (v / max) * (height - 20) - 10
      return `${x},${y}`
    })
    .join(' ')

  return (
    <>
      <AdminPageToolbar
        title="Platform Overview"
        subtitle="Monitor real-time user activity, account claims, invitations, and relationship verification across DengiTree."
        backTo="/dashboard"
      />

      <div className="dt-stat-grid">
        {stats.map((stat) => (
          <article key={stat.label} className={toneClass(stat.tone)}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div className="dt-overview-mid">
        <section className="dt-panel">
          <h2 className="dt-panel-title">Platform Growth Trend</h2>
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
                const x = chartPoints.length === 1 ? width / 2 : i * step
                const y = height - (v / max) * (height - 20) - 10
                return <circle key={i} cx={x} cy={y} r="5" fill="#163706" />
              })}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: chartMonths.length === 1 ? 'center' : 'space-between', fontSize: '0.72rem', color: '#5c6456' }}>
            {chartMonths.map((m, i) => (
              <span key={`${m}-${i}`}>{m}</span>
            ))}
          </div>
        </section>

        <section className="dt-panel">
          <h2 className="dt-panel-title">Operations Queue</h2>
          <ul className="dt-queue-list">
            {operationsQueue.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.link}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={queueDot(item.tone)} />
                    {item.label}
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '12px',
                        background: '#eef6e8',
                        color: '#163706',
                      }}
                    >
                      {item.count}
                    </span>
                  </span>
                  <IconChevronRight />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="dt-panel">
          <h2 className="dt-panel-title">Admin Quick Actions</h2>
          <ul className="dt-quick-actions">
            <li>
              <Link to="/profile-claims" className="dt-quick-btn">Review Profile Claim</Link>
            </li>
            <li>
              <Link to="/invitations" className="dt-quick-btn">Manage Invitation</Link>
            </li>
            <li>
              <Link to="/add-user" className="dt-quick-btn">Add User</Link>
            </li>
            <li>
              <Link to="/create-family-tree" className="dt-quick-btn">Create Family Tree</Link>
            </li>
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
            {recentActivities.length > 0 ? (
              recentActivities.map((row) => (
                <tr key={row.id}>
                  <td>{row.event}</td>
                  <td>{row.category}</td>
                  <td>
                    <StatusBadge variant={row.status === 'Completed' ? 'Active' : 'Pending'} />
                  </td>
                  <td>{row.time}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="dt-empty-cell">
                  No recent activity recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
