import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import AddChildModal from '../components/AddChildModal'
import AddGrandparentModal from '../components/AddGrandparentModal'
import AddParentModal from '../components/AddParentModal'
import AddSiblingModal from '../components/AddSiblingModal'
import AddSpouseModal from '../components/AddSpouseModal'
import AddYourselfModal from '../components/AddYourselfModal'
import DashboardLayout, { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { positionLabel } from '../lib/familyTreeMembers'
import { acceptPersistedInvitationIfAny } from '../lib/invitations'
import { setSelfOnTree } from '../lib/treeStorage'
import {
  fetchUserProfile,
  greetingFirstNameFromUser,
  personalizedHomeGreeting,
  signedInHomeTagline,
} from '../lib/userProfile'
import '../dashboard.css'
import '../merge-flow.css'

export type MemberModalKind =
  | 'yourself'
  | 'grandparent'
  | 'parent'
  | 'spouse'
  | 'sibling'
  | 'child'

export type DashboardContext = {
  openModal: (kind: MemberModalKind) => void
  treeVersion: number
  setTreeImmersive: (active: boolean) => void
}

export function HomeDashboard() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<MemberModalKind | null>(null)
  const [treeVersion, setTreeVersion] = useState(0)
  const [treeImmersive, setTreeImmersive] = useState(false)

  useEffect(() => {
    if (!user) return
    void acceptPersistedInvitationIfAny().then(({ linkedToTree, acceptError }) => {
      if (acceptError) console.error('Invitation not accepted:', acceptError)
      if (linkedToTree) setTreeVersion((v) => v + 1)
    })
  }, [user])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const closeModal = useCallback(() => setActiveModal(null), [])
  const openModal = useCallback((kind: MemberModalKind) => setActiveModal(kind), [])

  const closeModalAfterInvite = useCallback(() => {
    setTreeVersion((v) => v + 1)
    setActiveModal(null)
  }, [])

  const handleSelfAdded = useCallback(() => {
    setSelfOnTree()
    setTreeVersion((v) => v + 1)
    closeModal()
  }, [closeModal])

  return (
    <DashboardLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      onCloseSidebar={closeSidebar}
      treeImmersive={treeImmersive}
      treeVersion={treeVersion}
    >
      <Outlet
        context={{ openModal, treeVersion, setTreeImmersive } satisfies DashboardContext}
      />
      <AddYourselfModal
        open={activeModal === 'yourself'}
        onClose={closeModal}
        onSuccess={handleSelfAdded}
      />
      <AddGrandparentModal
        open={activeModal === 'grandparent'}
        onClose={closeModal}
        onAdded={closeModalAfterInvite}
      />
      <AddParentModal
        open={activeModal === 'parent'}
        onClose={closeModal}
        onAdded={closeModalAfterInvite}
      />
      <AddSpouseModal
        open={activeModal === 'spouse'}
        onClose={closeModal}
        onAdded={closeModalAfterInvite}
      />
      <AddSiblingModal
        open={activeModal === 'sibling'}
        onClose={closeModal}
        onAdded={closeModalAfterInvite}
      />
      <AddChildModal
        open={activeModal === 'child'}
        onClose={closeModal}
        onAdded={closeModalAfterInvite}
      />
    </DashboardLayout>
  )
}

const gettingStartedItems = [
  {
    title: 'Getting Started',
    subtitle: 'Tell us about yourself',
    icon: DashIcons.userPlus,
    action: 'profile' as const,
  },
  {
    title: 'Add your first family member',
    subtitle: 'Start with your parents',
    icon: DashIcons.people,
    action: 'parent' as const,
  },
  {
    title: 'Invite a relative',
    subtitle: 'Grow your family network',
    icon: DashIcons.mail,
    action: 'invitations' as const,
  },
  {
    title: 'Explore Premium',
    subtitle: 'Unlock more powerful features',
    icon: DashIcons.star,
    action: 'premium' as const,
  },
] as const

export default function HomePage() {
  const navigate = useNavigate()
  const { openModal, treeVersion } = useOutletContext<DashboardContext>()
  const { user } = useAuth()
  const [joinedFamily, setJoinedFamily] = useState(false)
  const [position, setPosition] = useState<string | null>(null)
  const [greetingName, setGreetingName] = useState('there')

  useEffect(() => {
    if (!user) {
      setJoinedFamily(false)
      setPosition(null)
      setGreetingName('there')
      return
    }
    setGreetingName(greetingFirstNameFromUser(null, user))
    let cancelled = false
    void fetchUserProfile(user.uid).then((profile) => {
      if (cancelled) return
      setJoinedFamily(Boolean(profile?.invitedByUid))
      setPosition(positionLabel(profile?.familyRole))
      setGreetingName(greetingFirstNameFromUser(profile, user))
    })
    return () => {
      cancelled = true
    }
  }, [user, treeVersion])

  function handleGettingStarted(action: (typeof gettingStartedItems)[number]['action']) {
    switch (action) {
      case 'parent':
        openModal('parent')
        break
      case 'profile':
        navigate('/home/profile')
        break
      case 'invitations':
        navigate('/home/invitations')
        break
      case 'premium':
        navigate('/home/premium')
        break
    }
  }

  return (
    <div className="home">
      <header className="home-welcome">
        <h1>
          {personalizedHomeGreeting(greetingName)}{' '}
          <span aria-hidden="true">👋</span>
        </h1>
        <p>{signedInHomeTagline()}</p>
      </header>

      <div className="home-top-grid">
        <section className="home-card tree-card tree-card-v2">
          <div className="tree-card-body">
            <p className="tree-card-eyebrow">
              {joinedFamily ? 'Your family tree' : 'Create your family tree'}
            </p>
            <h2>
              {joinedFamily ? (
                <>
                  You&apos;re in the family.
                  <br />
                  {position ? `As a ${position.toLowerCase()}.` : 'See your place.'}
                </>
              ) : (
                <>
                  Start with you.
                  <br />
                  Grow together.
                </>
              )}
            </h2>
            <p className="tree-card-desc">
              {joinedFamily
                ? 'The family tree you were invited to is ready. Open it to see your relatives and where you sit among them.'
                : 'Build your family network step by step. Add you family members, invite relatives and preserve your family history.'}
            </p>
            <button
              type="button"
              className="tree-card-cta"
              onClick={() =>
                navigate(
                  '/home/tree',
                  joinedFamily ? undefined : { state: { openSelf: true } },
                )
              }
            >
              {joinedFamily ? 'View family tree' : 'Click Here to Start'}
            </button>
          </div>
          <div className="tree-card-photo">
            <img
              src="/images/hero-family.png"
              alt="Family members connected across generations"
              width={693}
              height={426}
            />
          </div>
        </section>

        <section className="home-card getting-started-card">
          <header className="getting-started-head">
            <h2>Getting Started</h2>
            <p>New here? We&apos;ve got you Covered.</p>
          </header>
          <ul className="getting-started-list">
            {gettingStartedItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    className="getting-started-item"
                    onClick={() => handleGettingStarted(item.action)}
                  >
                    <span className="getting-started-icon">{Icon()}</span>
                    <span className="getting-started-text">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </span>
                    <span className="getting-started-chevron" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

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
            <div className="step-icon-wrap">{DashIcons.trendingUp()}</div>
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
