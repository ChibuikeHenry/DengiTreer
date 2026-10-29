import { Link } from 'react-router-dom'
import UpcomingBadge from '../components/UpcomingBadge'
import { DashIcons } from '../components/DashboardLayout'
import { formatBuildMyTreePrice } from '../lib/buildMyTreeService'
import { formatCleanUpMyTreePrice } from '../lib/cleanUpMyTreeService'

const plannedTrees = [
  {
    title: 'Primary family tree',
    subtitle: 'The tree you are building today',
    status: 'Active',
  },
]

export default function ManageTreesPage() {
  return (
    <div className="home upcoming-page manage-trees-page">
      <header className="upcoming-head">
        <div>
          <h1>Manage Trees</h1>
          <p>Create separate trees, switch between them, and control who can view or edit.</p>
        </div>
        <button type="button" className="upcoming-primary-btn upcoming-primary-btn-disabled" disabled>
          + New tree
          <UpcomingBadge label="Soon" />
        </button>
      </header>

      <section className="home-card upcoming-panel">
        <ul className="manage-tree-list">
          {plannedTrees.map((tree) => (
            <li key={tree.title} className="manage-tree-card">
              <div className="manage-tree-icon">{DashIcons.tree()}</div>
              <div className="manage-tree-body">
                <strong>{tree.title}</strong>
                <span>{tree.subtitle}</span>
              </div>
              <span className="manage-tree-badge manage-tree-badge-active">{tree.status}</span>
              <Link to="/home/tree" className="manage-tree-link">
                Open tree
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="upcoming-grid-2">
        <section className="home-card upcoming-preview-card">
          <h2>Tree tools</h2>
          <ul className="upcoming-action-list">
            <li>
              <span>Download PDF / image</span>
              <Link to="/home/tree" className="manage-tree-link">
                On Family Tree
              </Link>
            </li>
            <li>
              <span>Share read-only link</span>
              <Link to="/home/tree?share=1" className="manage-tree-link">
                Share tree
              </Link>
            </li>
            <li>
              <span>Clean up my tree</span>
              <Link to="/home/clean-up-my-tree" className="manage-tree-link manage-tree-link-paid">
                {formatCleanUpMyTreePrice()} · Paid
              </Link>
            </li>
            <li>
              <span>Build my tree (from spreadsheet)</span>
              <Link to="/home/build-my-tree" className="manage-tree-link manage-tree-link-paid">
                {formatBuildMyTreePrice()} · Paid
              </Link>
            </li>
            <li>
              <span>Merge two trees</span>
              <Link to="/home/invitations" className="manage-tree-link">
                Via invitations
              </Link>
            </li>
            <li>
              <span>Archive tree</span>
              <UpcomingBadge />
            </li>
          </ul>
        </section>

        <section className="home-card upcoming-preview-card">
          <h2>Collaboration</h2>
          <p className="upcoming-preview-lede">
            Invite co-editors and set roles per branch. Available after multi-tree support launches.
          </p>
          <ul className="upcoming-feature-list">
            <li>Editor vs viewer roles</li>
            <li>Branch-level permissions</li>
            <li>Activity history</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
