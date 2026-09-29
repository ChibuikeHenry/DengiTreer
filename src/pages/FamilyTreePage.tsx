import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar'
import PedigreeTreeDiagram from '../components/PedigreeTreeDiagram'
import { useAuth } from '../context/AuthContext'
import { formatBioForDisplay } from '../lib/bio'
import {
  computeTreeStats,
  memberRelationshipLabel,
  roleLabel,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import {
  DEFAULT_MEMBER_PRIVACY,
  memberPrivacyLabel,
  parseMemberPrivacy,
  type MemberPrivacy,
} from '../lib/memberPrivacy'
import {
  hasSavedProfileName,
  profileFullName,
  resolveUserProfileForForm,
} from '../lib/userProfile'
import { hasSelfOnTree } from '../lib/treeStorage'
import type { DashboardContext } from './HomePage'

function StarterDiagram({
  openModal,
  members,
  selfPhotoURL,
  selfName,
  selfHasProfileName,
  selfBio,
  selfPrivacy,
  selfDateOfBirth,
}: {
  openModal: DashboardContext['openModal']
  members: TreeMember[]
  selfPhotoURL: string | null
  selfName: string
  selfHasProfileName: boolean
  selfBio: string
  selfPrivacy: MemberPrivacy
  selfDateOfBirth: string | null
}) {
  return (
    <div className="ft-canvas ft-canvas-starter">
      <PedigreeTreeDiagram
        members={members}
        openModal={openModal}
        selfPhotoURL={selfPhotoURL}
        selfName={selfName}
        selfHasProfileName={selfHasProfileName}
        selfBio={selfBio}
        selfPrivacy={selfPrivacy}
        selfDateOfBirth={selfDateOfBirth}
      />
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
  const [selfBio, setSelfBio] = useState('')
  const [selfPrivacy, setSelfPrivacy] = useState<MemberPrivacy>(DEFAULT_MEMBER_PRIVACY)
  const [selfDateOfBirth, setSelfDateOfBirth] = useState<string | null>(null)

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
      setSelfBio('')
      setSelfPrivacy(DEFAULT_MEMBER_PRIVACY)
      setSelfDateOfBirth(null)
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
      setSelfBio(profile.bio?.trim() ?? '')
      setSelfPrivacy(
        parseMemberPrivacy(
          profile.profilePrivacy ?? profile.defaultMemberPrivacy ?? DEFAULT_MEMBER_PRIVACY,
        ),
      )
      setSelfDateOfBirth(profile.dateOfBirth?.trim() || null)
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
              selfBio={selfBio}
              selfPrivacy={selfPrivacy}
              selfDateOfBirth={selfDateOfBirth}
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
                      <span>
                        Profile · Living · {memberPrivacyLabel(selfPrivacy)}
                      </span>
                      <span className="ft-list-bio">{formatBioForDisplay(selfBio)}</span>
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
                        {memberRelationshipLabel(member) ?? roleLabel(member.role)} ·{' '}
                        {member.memberStatus === 'living' ? 'Living' : 'Deceased'}
                        {member.inviteStatus === 'pending' ? ' · Invite pending' : ''}
                        {' · '}
                        {memberPrivacyLabel(member.privacy)}
                      </span>
                      <span className="ft-list-bio">{formatBioForDisplay(member.bio)}</span>
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
