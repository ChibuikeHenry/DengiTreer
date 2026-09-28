import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar'
import { useAuth } from '../context/AuthContext'
import {
  computeTreeStats,
  membersByRole,
  roleLabel,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import {
  hasSavedProfileName,
  profileFirstName,
  profileFullName,
  resolveUserProfileForForm,
} from '../lib/userProfile'
import { hasSelfOnTree } from '../lib/treeStorage'
import type { InviteRole } from '../lib/invitations'
import type { DashboardContext } from './HomePage'

function TreePerson({
  member,
  slotClass,
}: {
  member: TreeMember
  slotClass: string
}) {
  return (
    <div className={`tree-person ${slotClass}`}>
      <ProfileAvatar
        photoURL={member.photoURL}
        name={member.displayName}
        size="tree"
        className="tree-person-avatar"
      />
      <span className="tree-person-name">
        {profileFirstName(member.displayName, roleLabel(member.role))}
      </span>
      {!member.profileClaimed ? (
        <span className="tree-person-role">{roleLabel(member.role)}</span>
      ) : null}
    </div>
  )
}

function TreeSlot({
  slotRole,
  member,
  openModal,
}: {
  slotRole: InviteRole
  member?: TreeMember
  openModal: DashboardContext['openModal']
}) {
  const modalRole = slotRole as 'parent' | 'child' | 'sibling' | 'spouse'
  const slotClass = `tree-person-${slotRole}`

  if (member) {
    return <TreePerson member={member} slotClass={slotClass} />
  }

  return (
    <button type="button" className={`node node-${slotRole} ${slotClass}`} onClick={() => openModal(modalRole)}>
      + Add {roleLabel(slotRole)}
    </button>
  )
}

function StarterDiagram({
  openModal,
  members,
  selfPhotoURL,
  selfName,
  selfHasProfileName,
}: {
  openModal: DashboardContext['openModal']
  members: TreeMember[]
  selfPhotoURL: string | null
  selfName: string
  selfHasProfileName: boolean
}) {
  const selfLabel = selfHasProfileName ? profileFirstName(selfName, 'You') : 'You'
  const byRole = membersByRole(members)

  return (
    <div className="ft-canvas ft-canvas-starter">
      <div className="tree-diagram tree-diagram-lg">
        <span className="tree-line tree-line-v-top" aria-hidden="true" />
        <span className="tree-line tree-line-v-bottom" aria-hidden="true" />
        <span className="tree-line tree-line-h" aria-hidden="true" />
        <Link to="/home/profile" className="tree-person tree-person-you tree-person-link">
          <ProfileAvatar
            photoURL={selfPhotoURL}
            name={selfName}
            size="tree"
            className="tree-person-avatar tree-person-avatar-you"
          />
          <span className="tree-person-name">{selfLabel}</span>
        </Link>
        <TreeSlot slotRole="parent" member={byRole.parent} openModal={openModal} />
        <TreeSlot slotRole="child" member={byRole.child} openModal={openModal} />
        <TreeSlot slotRole="sibling" member={byRole.sibling} openModal={openModal} />
        <TreeSlot slotRole="spouse" member={byRole.spouse} openModal={openModal} />
      </div>
    </div>
  )
}

export default function FamilyTreePage() {
  const { user } = useAuth()
  const { openModal, treeVersion } = useOutletContext<DashboardContext>()
  const location = useLocation()
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [members, setMembers] = useState<TreeMember[]>([])
  const [selfPhotoURL, setSelfPhotoURL] = useState<string | null>(null)
  const [selfName, setSelfName] = useState('')
  const [selfHasProfileName, setSelfHasProfileName] = useState(false)

  const selfAdded = useMemo(() => hasSelfOnTree(), [treeVersion])
  const selfListLabel = selfHasProfileName ? selfName : 'You'

  useEffect(() => {
    if (!user?.uid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setMembers)
  }, [user?.uid, treeVersion])

  useEffect(() => {
    if (!user) {
      setSelfPhotoURL(null)
      setSelfName('')
      setSelfHasProfileName(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const name = profileFullName(profile) || user.displayName?.trim() || ''
      setSelfName(name)
      setSelfHasProfileName(hasSavedProfileName(profile))
      setSelfPhotoURL(user.photoURL ?? profile.photoURL ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [user, treeVersion])

  useEffect(() => {
    const state = location.state as { openSelf?: boolean } | null
    if (state?.openSelf && !hasSelfOnTree()) {
      openModal('yourself')
      window.history.replaceState({}, document.title)
    }
  }, [location.state, openModal])

  const stats = computeTreeStats(selfAdded, members)

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
            <StarterDiagram
              openModal={openModal}
              members={members}
              selfPhotoURL={selfPhotoURL}
              selfName={selfName}
              selfHasProfileName={selfHasProfileName}
            />
          )
        ) : (
          <ul className="ft-list">
            {selfAdded ? (
              <>
                <li className="ft-list-person">
                  <Link to="/home/profile" className="ft-list-person-link">
                    <ProfileAvatar photoURL={selfPhotoURL} name={selfName || 'You'} size="sm" />
                    <span>
                      <strong>{selfListLabel}</strong>
                      <span>Profile · Living</span>
                    </span>
                  </Link>
                </li>
                {members.map((member) => (
                  <li key={member.id} className="ft-list-person">
                    <ProfileAvatar
                      photoURL={member.photoURL}
                      name={member.displayName}
                      size="sm"
                    />
                    <span>
                      <strong>{member.displayName}</strong>
                      <span>
                        {roleLabel(member.role)} ·{' '}
                        {member.memberStatus === 'living' ? 'Living' : 'Deceased'}
                        {member.inviteStatus === 'pending' ? ' · Invite pending' : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </>
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
                <strong>{stats.total}</strong>
                <small>Total Family Member</small>
              </span>
            </li>
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>{stats.generations}</strong>
                <small>Generation</small>
              </span>
            </li>
            <li>
              <span className="ft-stat-icon" />
              <span>
                <strong>{stats.branches}</strong>
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
