import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardContext } from './HomePage'

type TreeMember = {
  id: string
  name: string
  role: string
  status: string
  dates?: string
  you?: boolean
}

const treeMembers: TreeMember[] = [
  {
    id: 'james',
    name: 'James Achoromadu',
    role: 'Grandfather',
    status: 'Deceased',
    dates: '1948–2019',
  },
  {
    id: 'mary',
    name: 'Mary Achoromadu',
    role: 'Grandmother',
    status: 'Deceased',
    dates: '1952–2020',
  },
  {
    id: 'uche',
    name: 'Uche Achoromadu',
    role: 'Father',
    status: 'Living',
  },
  {
    id: 'grace',
    name: 'Grace Achoromadu',
    role: 'Mother',
    status: 'Living',
  },
  {
    id: 'joy',
    name: 'Joy Achoromadu',
    role: 'Sister',
    status: 'Living',
  },
  {
    id: 'you',
    name: 'Chinyere Achoromadu',
    role: '(YOU)',
    status: 'Living',
    you: true,
  },
  {
    id: 'tunde',
    name: 'Tunde Aweda',
    role: 'Spouse',
    status: 'Living',
  },
  {
    id: 'habib',
    name: 'Habib Aweda',
    role: 'Son',
    status: 'Living',
  },
  {
    id: 'habiba',
    name: 'Habiba Aweda',
    role: 'Daughter',
    status: 'Living',
  },
]

function TreeNode({ member }: { member: TreeMember }) {
  return (
    <div className={`ft-node${member.you ? ' is-you' : ''}`}>
      <div className="ft-avatar" />
      <p className="ft-name">{member.name}</p>
      <p className="ft-role">{member.role}</p>
      <p className="ft-status">
        {member.status}
        {member.dates ? ` · ${member.dates}` : ''}
      </p>
    </div>
  )
}

export default function FamilyTreePage() {
  const { openModal } = useOutletContext<DashboardContext>()
  const [view, setView] = useState<'tree' | 'list'>('tree')

  const quickActions = [
    { label: 'Add family member', action: () => openModal('parent') },
    { label: 'View Full Tree', action: () => setView('tree') },
    { label: 'Download Tree', action: () => {} },
    { label: 'Share Tree', action: () => {} },
  ] as const

  return (
    <div className="ft-page">
      <div className="ft-main">
        <header className="ft-head">
          <div>
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
          <div className="ft-canvas">
            <div className="ft-gen ft-gen-1">
              <TreeNode member={treeMembers[0]} />
              <span className="ft-spouse-line" aria-hidden="true" />
              <TreeNode member={treeMembers[1]} />
            </div>
            <div className="ft-v-line ft-v-line-1" aria-hidden="true" />
            <div className="ft-gen ft-gen-2">
              <TreeNode member={treeMembers[2]} />
              <span className="ft-spouse-line" aria-hidden="true" />
              <TreeNode member={treeMembers[3]} />
            </div>
            <div className="ft-v-line ft-v-line-2" aria-hidden="true" />
            <div className="ft-gen ft-gen-3">
              <TreeNode member={treeMembers[4]} />
              <TreeNode member={treeMembers[5]} />
              <span className="ft-spouse-line" aria-hidden="true" />
              <TreeNode member={treeMembers[6]} />
            </div>
            <div className="ft-v-line ft-v-line-3" aria-hidden="true" />
            <div className="ft-gen ft-gen-4">
              <TreeNode member={treeMembers[7]} />
              <TreeNode member={treeMembers[8]} />
            </div>
          </div>
        ) : (
          <ul className="ft-list">
            {treeMembers.map((member) => (
              <li key={member.id}>
                <strong>{member.name}</strong>
                <span>
                  {member.role} · {member.status}
                  {member.dates ? ` · ${member.dates}` : ''}
                </span>
              </li>
            ))}
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
                <strong>12</strong>
                <small>Total Family Member</small>
              </span>
            </li>
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>4</strong>
                <small>Generation</small>
              </span>
            </li>
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>3</strong>
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
