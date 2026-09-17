import { useCallback, useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import AddChildModal from '../components/AddChildModal'
import AddParentModal from '../components/AddParentModal'
import AddSiblingModal from '../components/AddSiblingModal'
import AddSpouseModal from '../components/AddSpouseModal'
import DashboardLayout, { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import '../dashboard.css'

export type MemberModalKind = 'parent' | 'spouse' | 'sibling' | 'child'

export type DashboardContext = {
  openModal: (kind: MemberModalKind) => void
}

export function HomeDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<MemberModalKind | null>(null)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const closeModal = useCallback(() => setActiveModal(null), [])
  const openModal = useCallback((kind: MemberModalKind) => setActiveModal(kind), [])

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      onCloseSidebar={closeSidebar}
    >
      <Outlet context={{ openModal } satisfies DashboardContext} />
      <AddParentModal open={activeModal === 'parent'} onClose={closeModal} />
      <AddSpouseModal open={activeModal === 'spouse'} onClose={closeModal} />
      <AddSiblingModal open={activeModal === 'sibling'} onClose={closeModal} />
      <AddChildModal open={activeModal === 'child'} onClose={closeModal} />
    </DashboardLayout>
  )
}

export default function HomePage() {
  const { openModal } = useOutletContext<DashboardContext>()
  const { user } = useAuth()
  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'there'

  return (
    <div className="home">
      <header className="home-welcome">
        <h1>
          Welcome to DengiTree, {firstName}! <span aria-hidden="true">👋</span>
        </h1>
        <p>Let&apos;s start building your family legacy.</p>
      </header>

      <section className="home-card tree-card">
        <div className="tree-card-copy">
          <p className="tree-card-eyebrow">Create your family tree</p>
          <h2>
            Start with you.
            <br />
            Grow together.
          </h2>
          <p>
            Build your family network step by step. Add you family members, invite
            relatives and preserve your family history.
          </p>
        </div>

        <div className="tree-diagram" aria-label="Family tree starter">
          <button type="button" className="node node-parent" onClick={() => openModal('parent')}>
            + Add Parent
          </button>
          <button
            type="button"
            className="node node-sibling"
            onClick={() => openModal('sibling')}
          >
            + Add Siblings
          </button>
          <div className="node node-you">YOU</div>
          <button type="button" className="node node-spouse" onClick={() => openModal('spouse')}>
            + Add Spouse
          </button>
          <button type="button" className="node node-child" onClick={() => openModal('child')}>
            + Add Child
          </button>
          <span className="tree-line tree-line-v-top" aria-hidden="true" />
          <span className="tree-line tree-line-v-bottom" aria-hidden="true" />
          <span className="tree-line tree-line-h" aria-hidden="true" />
        </div>
      </section>

      <section className="home-card steps-card">
        <h2>Easy steps to build your family network.</h2>
        <ol className="home-steps">
          <li>
            <div className="step-icon-wrap">{DashIcons.userPlus()}</div>
            <p>
              <strong>
                <span className="step-num">1</span> Add Yourself
              </strong>
              Create your profile to get started.
            </p>
          </li>
          <li>
            <div className="step-icon-wrap">{DashIcons.people()}</div>
            <p>
              <strong>
                <span className="step-num">2</span> Add family members
              </strong>
              Add your parent siblings and other relatives.
            </p>
          </li>
          <li>
            <div className="step-icon-wrap">{DashIcons.mail()}</div>
            <p>
              <strong>
                <span className="step-num">3</span> Invite Relatives
              </strong>
              Invite family members to join and contribute.
            </p>
          </li>
          <li>
            <div className="step-icon-wrap step-icon-empty" />
            <p>
              <strong>
                <span className="step-num">4</span> Grow your Tree
              </strong>
              Build branches together and preserve your legacy.
            </p>
          </li>
        </ol>
      </section>
    </div>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="home">
      <header className="home-welcome">
        <h1>{title}</h1>
        <p>This section is coming soon.</p>
      </header>
    </div>
  )
}
