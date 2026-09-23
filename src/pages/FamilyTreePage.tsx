import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { hasSelfOnTree } from '../lib/treeStorage'
import type { DashboardContext } from './HomePage'

function StarterDiagram({ openModal }: { openModal: DashboardContext['openModal'] }) {
  return (
    <div className="ft-canvas ft-canvas-starter">
      <div className="tree-diagram tree-diagram-lg">
        <span className="tree-line tree-line-v-top" aria-hidden="true" />
        <span className="tree-line tree-line-v-bottom" aria-hidden="true" />
        <span className="tree-line tree-line-h" aria-hidden="true" />
        <div className="node node-you">You</div>
        <button
          type="button"
          className="node node-parent"
          onClick={() => openModal('parent')}
        >
          + Add Parent
        </button>
        <button
          type="button"
          className="node node-child"
          onClick={() => openModal('child')}
        >
          + Add Child
        </button>
        <button
          type="button"
          className="node node-sibling"
          onClick={() => openModal('sibling')}
        >
          + Add Sibling
        </button>
        <button
          type="button"
          className="node node-spouse"
          onClick={() => openModal('spouse')}
        >
          + Add Spouse
        </button>
      </div>
    </div>
  )
}

export default function FamilyTreePage() {
  const { openModal, treeVersion } = useOutletContext<DashboardContext>()
  const location = useLocation()
  const [view, setView] = useState<'tree' | 'list'>('tree')

  const selfAdded = useMemo(() => hasSelfOnTree(), [treeVersion])

  useEffect(() => {
    const state = location.state as { openSelf?: boolean } | null
    if (state?.openSelf && !hasSelfOnTree()) {
      openModal('yourself')
      window.history.replaceState({}, document.title)
    }
  }, [location.state, openModal])

  const memberCount = selfAdded ? 1 : 0
  const generations = selfAdded ? 1 : 0
  const branches = 0

  const quickActions = [
    {
      label: 'Add family member',
      action: () => (selfAdded ? openModal('parent') : openModal('yourself')),
    },
    { label: 'View Full Tree', action: () => setView('tree') },
    { label: 'Download Tree', action: () => {} },
    { label: 'Share Tree', action: () => {} },
  ] as const

  return (
    <div className="ft-page">
      <div className="ft-main">
        <header className="ft-head ft-head-with-back">
          <Link to="/home" className="ft-back" aria-label="Back to home">
            ←
          </Link>
          <div className="ft-head-text">
            <h1>Family Tree</h1>
            <p>Your family legacy, beautifully connected.</p>
          </div>
          <div className="ft-view-toggle" role="tablist" aria-label="Tree view">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'tree'}
              className={view === 'tree' ? 'is-active' : ''}
              onClick={() => setView('tree')}
            >
              Tree View
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
            >
              List View
            </button>
          </div>
        </header>

        {view === 'tree' ? (
          !selfAdded ? (
            <div className="ft-canvas ft-canvas-empty">
              <button
                type="button"
                className="ft-add-yourself"
                onClick={() => openModal('yourself')}
              >
                <span className="ft-add-yourself-ring" aria-hidden="true">
                  +
                </span>
                Add Yourself
              </button>
            </div>
          ) : (
            <StarterDiagram openModal={openModal} />
          )
        ) : (
          <ul className="ft-list">
            {selfAdded ? (
              <li>
                <strong>You</strong>
                <span>Profile · Living</span>
              </li>
            ) : (
              <li className="ft-list-empty">No family members yet. Add yourself to begin.</li>
            )}
          </ul>
        )}
      </div>

      <aside className="ft-sidebar">
        <section className="ft-widget">
          <h2>Family Tree Overview</h2>
          <ul className="ft-stats">
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>{memberCount}</strong>
                <small>Total Family Member</small>
              </span>
            </li>
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>{generations}</strong>
                <small>Generation</small>
              </span>
            </li>
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>{branches}</strong>
                <small>Branches</small>
              </span>
            </li>
          </ul>
        </section>

        <section className="ft-widget">
          <h2>Quick Actions</h2>
          <ul className="ft-actions">
            {quickActions.map((item) => (
              <li key={item.label}>
                <button type="button" onClick={item.action}>
                  <span>{item.label}</span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}
