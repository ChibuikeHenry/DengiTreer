import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { DashIcons } from '../components/DashboardLayout'
import EditFamilyMemberModal from '../components/EditFamilyMemberModal'
import ProfileAvatar from '../components/ProfileAvatar'
import PedigreeTreeDiagram, { type PedigreeTreeHandle } from '../components/PedigreeTreeDiagram'
import { useAuth } from '../context/AuthContext'
import { formatBioForDisplay } from '../lib/bio'
import {
  computeTreeStats,
  avatarGenderToneForMember,
  buildTreeAvatarViewer,
  memberRelationshipLabel,
  positionLabel,
  roleLabel,
  subscribeTreeMembers,
  treeMembersForPedigree,
  type TreeMember,
} from '../lib/familyTreeMembers'
import {
  DEFAULT_MEMBER_PRIVACY,
  memberPrivacyLabel,
  parseMemberPrivacy,
  type MemberPrivacy,
} from '../lib/memberPrivacy'
import {
  fetchUserProfile,
  hasSavedProfileName,
  profileFullName,
  resolveUserProfileForForm,
} from '../lib/userProfile'
import { hasSelfOnTree } from '../lib/treeStorage'
import { canViewerEditTreeMember } from '../lib/profileClaim'
import type { DashboardContext, MemberModalKind } from './HomePage'

const ADD_MEMBER_MENU: { label: string; kind: MemberModalKind }[] = [
  { label: 'Grand Parents', kind: 'grandparent' },
  { label: 'Parents', kind: 'parent' },
  { label: 'Siblings', kind: 'sibling' },
  { label: 'Spouse', kind: 'spouse' },
  { label: 'Child', kind: 'child' },
]

function StarterDiagram({
  openModal,
  members,
  selfPhotoURL,
  selfName,
  selfHasProfileName,
  selfBio,
  selfPrivacy,
  selfDateOfBirth,
  selfPositionLabel,
  selfGender,
  viewerUid,
  onSelectMember,
  allowAdds,
  centerProfileHref,
  centerRoleLabel,
  exploreHint,
  allowMemberEdit,
  centerSelfMemberIds,
  fullTreeView,
  treeRef,
}: {
  openModal: DashboardContext['openModal']
  members: TreeMember[]
  selfPhotoURL: string | null
  selfName: string
  selfHasProfileName: boolean
  selfBio: string
  selfPrivacy: MemberPrivacy
  selfDateOfBirth: string | null
  selfPositionLabel: string | null
  selfGender?: string | null
  viewerUid?: string | null
  onSelectMember?: (member: TreeMember) => void
  allowAdds?: boolean
  centerProfileHref?: string | null
  centerRoleLabel?: string
  exploreHint?: boolean
  allowMemberEdit?: boolean
  centerSelfMemberIds?: string[]
  fullTreeView?: boolean
  treeRef?: Ref<PedigreeTreeHandle>
}) {
  return (
    <div
      className={`ft-canvas ft-canvas-starter${fullTreeView ? ' ft-canvas-immersive' : ''}`}
    >
      <PedigreeTreeDiagram
        maxScale={fullTreeView ? 1.4 : 1}
        handleRef={treeRef}
        members={members}
        openModal={openModal}
        selfPhotoURL={selfPhotoURL}
        selfName={selfName}
        selfHasProfileName={selfHasProfileName}
        selfBio={selfBio}
        selfPrivacy={selfPrivacy}
        selfDateOfBirth={selfDateOfBirth}
        selfPositionLabel={selfPositionLabel}
        selfGender={selfGender}
        viewerUid={viewerUid}
        onSelectMember={onSelectMember}
        allowAdds={allowAdds}
        centerProfileHref={centerProfileHref}
        centerRoleLabel={centerRoleLabel}
        exploreHint={exploreHint}
        allowMemberEdit={allowMemberEdit}
        centerSelfMemberIds={centerSelfMemberIds}
      />
    </div>
  )
}

export default function FamilyTreePage() {
  const { user } = useAuth()
  const { openModal, treeVersion, setTreeImmersive } = useOutletContext<DashboardContext>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const exploreRootUid = searchParams.get('explore')?.trim() || null
  const isExploreView = Boolean(exploreRootUid)
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const treeRef = useRef<PedigreeTreeHandle>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadPending, setDownloadPending] = useState(false)
  const [members, setMembers] = useState<TreeMember[]>([])
  const [centerPhotoURL, setCenterPhotoURL] = useState<string | null>(null)
  const [centerName, setCenterName] = useState('')
  const [centerHasProfileName, setCenterHasProfileName] = useState(false)
  const [centerBio, setCenterBio] = useState('')
  const [centerPrivacy, setCenterPrivacy] = useState<MemberPrivacy>(DEFAULT_MEMBER_PRIVACY)
  const [centerDateOfBirth, setCenterDateOfBirth] = useState<string | null>(null)
  const [centerPosition, setCenterPosition] = useState<string | null>(null)
  const [centerGender, setCenterGender] = useState<string | null>(null)
  const [viewerGender, setViewerGender] = useState<string | null>(null)
  const [viewerPhotoURL, setViewerPhotoURL] = useState<string | null>(null)
  const [viewerName, setViewerName] = useState('')
  const [viewerPosition, setViewerPosition] = useState<string | null>(null)
  const [joinedFamily, setJoinedFamily] = useState(false)
  const [claimedInviteToken, setClaimedInviteToken] = useState<string | null>(null)
  const [centerSelfMemberIds, setCenterSelfMemberIds] = useState<string[]>([])
  const [profileReady, setProfileReady] = useState(false)
  const [editingMember, setEditingMember] = useState<TreeMember | null>(null)
  const [fullTreeView, setFullTreeView] = useState(false)
  const [addMemberMenuOpen, setAddMemberMenuOpen] = useState(false)
  const addMemberMenuRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!addMemberMenuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!addMemberMenuRef.current?.contains(event.target as Node)) {
        setAddMemberMenuOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setAddMemberMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [addMemberMenuOpen])

  useEffect(() => {
    setTreeImmersive(fullTreeView)
    return () => setTreeImmersive(false)
  }, [fullTreeView, setTreeImmersive])

  useEffect(() => {
    if (!fullTreeView) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setFullTreeView(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullTreeView])

  const selfAdded = useMemo(
    () => hasSelfOnTree() || members.length > 0 || joinedFamily,
    [treeVersion, members.length, joinedFamily],
  )
  const pedigreeMembers = useMemo(
    () => treeMembersForPedigree(members, user?.uid, claimedInviteToken),
    [members, user?.uid, claimedInviteToken],
  )
  const selfListLabel = centerHasProfileName ? centerName : 'You'
  const treeSubscriptionUid = exploreRootUid ?? user?.uid ?? null

  function viewerCanEditMember(member: TreeMember) {
    return canViewerEditTreeMember(member, user?.uid, treeSubscriptionUid)
  }

  useEffect(() => {
    if (isExploreView) setEditingMember(null)
  }, [isExploreView])

  useEffect(() => {
    if (!treeSubscriptionUid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(treeSubscriptionUid, setMembers)
  }, [treeSubscriptionUid, treeVersion])

  useEffect(() => {
    if (!user) {
      setCenterPhotoURL(null)
      setCenterName('')
      setCenterHasProfileName(false)
      setCenterBio('')
      setCenterPrivacy(DEFAULT_MEMBER_PRIVACY)
      setCenterDateOfBirth(null)
      setCenterPosition(null)
      setCenterGender(null)
      setViewerGender(null)
      setViewerPhotoURL(null)
      setViewerName('')
      setViewerPosition(null)
      setJoinedFamily(false)
      setClaimedInviteToken(null)
      setProfileReady(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const viewerProfile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const viewerDisplayName =
        profileFullName(viewerProfile) || user.displayName?.trim() || ''
      setViewerName(viewerDisplayName)
      setViewerGender(viewerProfile.gender?.trim() || null)
      setViewerPhotoURL(user.photoURL ?? viewerProfile.photoURL ?? null)
      setViewerPosition(positionLabel(viewerProfile.familyRole))
      setJoinedFamily(Boolean(viewerProfile.invitedByUid))
      const selfMemberIds = [
        viewerProfile.claimedInviteToken?.trim(),
        viewerProfile.inviteToken?.trim(),
      ].filter((id): id is string => Boolean(id))
      setCenterSelfMemberIds([...new Set(selfMemberIds)])
      setClaimedInviteToken(selfMemberIds[0] ?? null)

      const centerUid = exploreRootUid ?? user.uid
      if (centerUid === user.uid) {
        setCenterName(viewerDisplayName)
        setCenterHasProfileName(hasSavedProfileName(viewerProfile))
        setCenterPhotoURL(user.photoURL ?? viewerProfile.photoURL ?? null)
        setCenterBio(viewerProfile.bio?.trim() ?? '')
        setCenterPrivacy(
          parseMemberPrivacy(
            viewerProfile.profilePrivacy ??
              viewerProfile.defaultMemberPrivacy ??
              DEFAULT_MEMBER_PRIVACY,
          ),
        )
        setCenterDateOfBirth(viewerProfile.dateOfBirth?.trim() || null)
        setCenterPosition(positionLabel(viewerProfile.familyRole))
        setCenterGender(viewerProfile.gender?.trim() || null)
      } else {
        const rootProfile = await fetchUserProfile(centerUid)
        if (cancelled) return
        if (rootProfile) {
          const rootName = profileFullName(rootProfile) || 'Family member'
          setCenterName(rootName)
          setCenterHasProfileName(hasSavedProfileName(rootProfile))
          setCenterPhotoURL(rootProfile.photoURL ?? null)
          setCenterBio(rootProfile.bio?.trim() ?? '')
          setCenterPrivacy(
            parseMemberPrivacy(
              rootProfile.profilePrivacy ??
                rootProfile.defaultMemberPrivacy ??
                DEFAULT_MEMBER_PRIVACY,
            ),
          )
          setCenterDateOfBirth(rootProfile.dateOfBirth?.trim() || null)
          setCenterPosition(positionLabel(rootProfile.familyRole))
          setCenterGender(rootProfile.gender?.trim() || null)
        } else {
          setCenterName('Family member')
          setCenterHasProfileName(false)
          setCenterPhotoURL(null)
          setCenterBio('')
          setCenterPrivacy(DEFAULT_MEMBER_PRIVACY)
          setCenterDateOfBirth(null)
          setCenterPosition(null)
          setCenterGender(null)
        }
      }
      setProfileReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user, treeVersion, exploreRootUid])

  useEffect(() => {
    const state = location.state as { openSelf?: boolean } | null
    if (!state?.openSelf || !profileReady) return
    if (!hasSelfOnTree() && !joinedFamily) {
      openModal('yourself')
    }
    window.history.replaceState({}, document.title)
  }, [joinedFamily, location.state, openModal, profileReady])

  const stats = computeTreeStats(selfAdded, members)

  const avatarViewer = useMemo(
    () =>
      buildTreeAvatarViewer({
        uid: user?.uid ?? null,
        gender: viewerGender,
        photoURL: viewerPhotoURL,
        displayName: viewerName,
        positionLabel: viewerPosition,
      }),
    [user?.uid, viewerGender, viewerPhotoURL, viewerName, viewerPosition],
  )

  function handleMemberAction(member: TreeMember) {
    if (viewerCanEditMember(member)) {
      setEditingMember(member)
      return
    }
    navigate(`/home/member/${encodeURIComponent(member.id)}`)
  }

  async function runDownload() {
    if (!treeRef.current || downloading) return
    setDownloading(true)
    try {
      const blob = await treeRef.current.exportPng(`${centerName || 'My'} family tree — DengiTree`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(centerName || 'family').trim().replace(/\s+/g, '-').toLowerCase()}-family-tree.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error(err)
      window.alert('Sorry, we could not create the tree image. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  function handleDownloadTree() {
    if (!selfAdded) {
      openModal('yourself')
      return
    }
    if (view !== 'tree') {
      setView('tree')
      setDownloadPending(true)
      return
    }
    void runDownload()
  }

  useEffect(() => {
    if (!downloadPending || view !== 'tree') return
    const id = window.setTimeout(() => {
      setDownloadPending(false)
      void runDownload()
    }, 150)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadPending, view])

  function toggleFullTreeView() {
    setView('tree')
    setFullTreeView((active) => !active)
  }

  function handleAddFamilyMemberClick() {
    if (!selfAdded) {
      openModal('yourself')
      return
    }
    setAddMemberMenuOpen((open) => !open)
  }

  function openAddMemberKind(kind: MemberModalKind) {
    setAddMemberMenuOpen(false)
    openModal(kind)
  }

  const quickActions = [
    {
      label: fullTreeView ? 'Exit full view' : 'Full view',
      icon: DashIcons.tree,
      action: toggleFullTreeView,
    },
    {
      label: downloading ? 'Preparing image…' : 'Download Tree',
      icon: DashIcons.image,
      action: handleDownloadTree,
    },
    {
      label: 'Share Tree',
      icon: DashIcons.mail,
      action: () => navigate('/home/invitations'),
    },
  ] as const

  return (
    <div className={`ft-page${fullTreeView ? ' ft-page-immersive' : ''}`}>
      <div className="ft-main">
        {fullTreeView ? (
          <header className="ft-head ft-immersive-bar">
            <button type="button" className="ft-immersive-exit" onClick={() => setFullTreeView(false)}>
              ← Exit full view
            </button>
            <strong className="ft-immersive-title">Family Tree</strong>
            <div className="ft-gender-legend ft-gender-legend-inline" aria-label="Gender legend">
              <span className="ft-gender-legend-item">
                <span className="ft-gender-dot ft-gender-dot-male" aria-hidden="true" />
                Male
              </span>
              <span className="ft-gender-legend-item">
                <span className="ft-gender-dot ft-gender-dot-female" aria-hidden="true" />
                Female
              </span>
            </div>
          </header>
        ) : null}
        <header className={`ft-head ft-head-with-back${fullTreeView ? ' ft-head-compact-hidden' : ''}`}>
          <Link
            to={isExploreView ? '/home/tree' : '/home'}
            className="ft-back"
            aria-label={isExploreView ? 'Back to your tree' : 'Back to home'}
          >
            ←
          </Link>
          <div className="ft-head-text">
            <h1>{isExploreView ? `${centerName}'s tree` : 'Family Tree'}</h1>
            <p>
              {isExploreView
                ? 'Exploring their branch — click anyone connected to keep exploring.'
                : 'Your family legacy, beautifully connected.'}
            </p>
          </div>
          <div className="ft-gender-legend" aria-label="Gender legend">
            <span className="ft-gender-legend-item">
              <span className="ft-gender-dot ft-gender-dot-male" aria-hidden="true" />
              Male
            </span>
            <span className="ft-gender-legend-item">
              <span className="ft-gender-dot ft-gender-dot-female" aria-hidden="true" />
              Female
            </span>
          </div>
        </header>

        <div
          className={`ft-view-toggle${fullTreeView ? ' ft-head-compact-hidden' : ''}`}
          role="tablist"
          aria-label="Tree view"
        >
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            List View
          </button>
        </div>

        {isExploreView ? (
          <div className="ft-explore-banner" role="status">
            <span className="ft-explore-banner-text">
              Viewing <strong>{centerName}</strong>&apos;s family tree.
            </span>
            <Link to="/home/tree">Return to your tree</Link>
          </div>
        ) : null}

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
              members={pedigreeMembers}
              selfPhotoURL={centerPhotoURL}
              selfName={centerName}
              selfHasProfileName={centerHasProfileName}
              selfBio={centerBio}
              selfPrivacy={centerPrivacy}
              selfDateOfBirth={centerDateOfBirth}
              selfPositionLabel={centerPosition}
              selfGender={centerGender}
              viewerUid={user?.uid ?? null}
              onSelectMember={handleMemberAction}
              allowAdds={!isExploreView}
              centerProfileHref={isExploreView ? null : '/home/profile'}
              centerRoleLabel={isExploreView ? 'Tree center' : undefined}
              exploreHint
              allowMemberEdit={!isExploreView}
              centerSelfMemberIds={centerSelfMemberIds}
              fullTreeView={fullTreeView}
              treeRef={treeRef}
            />
          )
        ) : (
          <ul className="ft-list">
            {selfAdded ? (
              <>
                <li className="ft-list-person">
                  <Link to="/home/profile" className="ft-list-person-link">
                    <ProfileAvatar
                      photoURL={centerPhotoURL}
                      name={centerName || 'You'}
                      gender={centerGender}
                      size="sm"
                    />
                    <span>
                      <strong>{selfListLabel}</strong>
                      <span>
                        {centerPosition ?? 'Profile'} · {memberPrivacyLabel(centerPrivacy)}
                      </span>
                      <span className="ft-list-bio">{formatBioForDisplay(centerBio)}</span>
                    </span>
                  </Link>
                </li>
                {members.map((member) => (
                  <li key={member.id} className="ft-list-person">
                    {viewerCanEditMember(member) ? (
                      <button
                        type="button"
                        onClick={() => handleMemberAction(member)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          width: '100%',
                          cursor: 'pointer',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <ProfileAvatar
                          photoURL={member.photoURL}
                          name={member.displayName}
                          size="sm"
                          gender={member.gender}
                          genderTone={avatarGenderToneForMember(member, avatarViewer)}
                        />
                        <span>
                          <strong>{member.displayName}</strong>
                          <span>
                            {memberRelationshipLabel(member) ?? roleLabel(member.role)}
                            {member.memberStatus === 'deceased' ? ' · Deceased' : ''}
                            {member.inviteStatus === 'pending' ? ' · Invite pending' : ''}
                            {' · '}
                            {memberPrivacyLabel(member.privacy)}
                          </span>
                          <span className="ft-list-bio">{formatBioForDisplay(member.bio)}</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMemberAction(member)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          width: '100%',
                          cursor: 'pointer',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <ProfileAvatar
                          photoURL={member.photoURL}
                          name={member.displayName}
                          size="sm"
                          gender={member.gender}
                          genderTone={avatarGenderToneForMember(member, avatarViewer)}
                        />
                        <span>
                          <strong>{member.displayName}</strong>
                          <span>
                            {memberRelationshipLabel(member) ?? roleLabel(member.role)}
                            {' · Tap to view claimed profile'}
                            {' · '}
                            {memberPrivacyLabel(member.privacy)}
                          </span>
                          <span className="ft-list-bio">{formatBioForDisplay(member.bio)}</span>
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </>
            ) : (
              <li className="ft-list-empty">No family members yet. Add yourself to begin.</li>
            )}
          </ul>
        )}
      </div>

      <EditFamilyMemberModal
        open={editingMember !== null}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onUpdated={() => {}}
      />

      {!fullTreeView ? (
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
            <li className="ft-actions-add-member" ref={addMemberMenuRef}>
              <button
                type="button"
                onClick={handleAddFamilyMemberClick}
                aria-expanded={addMemberMenuOpen}
                aria-haspopup="menu"
              >
                <span className="ft-action-icon">{DashIcons.people({ width: 16, height: 16 })}</span>
                <span className="ft-action-label">Add family member</span>
                <span className="ft-action-chevron" aria-hidden="true">›</span>
              </button>
              {addMemberMenuOpen ? (
                <ul className="ft-add-member-menu" role="menu" aria-label="Add family member">
                  {ADD_MEMBER_MENU.map((item) => (
                    <li key={item.kind} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openAddMemberKind(item.kind)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
            {quickActions.map((item) => (
              <li key={item.label}>
                <button type="button" onClick={item.action}>
                  <span className="ft-action-icon">{item.icon({ width: 16, height: 16 })}</span>
                  <span className="ft-action-label">{item.label}</span>
                  <span className="ft-action-chevron" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
      ) : null}
    </div>
  )
}
