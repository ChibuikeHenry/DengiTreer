import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar'
import { useAuth } from '../context/AuthContext'
import { formatBioForDisplay } from '../lib/bio'
import {
  avatarGenderToneForMember,
  buildTreeAvatarViewer,
  memberRelationshipLabel,
  subscribeTreeMembers,
  treeMemberRoleLabel,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { formatDisplayDate } from '../lib/lifeDates'
import { memberPrivacyScopeLabel } from '../lib/memberPrivacy'
import { isClaimedTreeMember } from '../lib/profileClaim'
import { resolveExploreAccess } from '../lib/treeExplore'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'

function FieldIcon({ children }: { children: ReactNode }) {
  return <span className="claimed-field-icon" aria-hidden="true">{children}</span>
}

export default function ClaimedMemberProfilePage() {
  const { memberId } = useParams<{ memberId: string }>()
  const { user } = useAuth()
  const [members, setMembers] = useState<TreeMember[]>([])
  const [viewerName, setViewerName] = useState('')
  const [viewerInvitedByUid, setViewerInvitedByUid] = useState<string | null>(null)
  const [viewerGender, setViewerGender] = useState<string | null>(null)
  const [viewerPhotoURL, setViewerPhotoURL] = useState<string | null>(null)
  const [viewerPosition, setViewerPosition] = useState<string | null>(null)
  const [canExplore, setCanExplore] = useState(false)
  const [exploreRootUid, setExploreRootUid] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) return
    return subscribeTreeMembers(user.uid, setMembers)
  }, [user?.uid])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setViewerName(profileFullName(profile) || user.displayName?.trim() || 'You')
      setViewerInvitedByUid(profile.invitedByUid?.trim() || null)
      setViewerGender(profile.gender?.trim() || null)
      setViewerPhotoURL(user.photoURL ?? profile.photoURL ?? null)
      setViewerPosition(profile.familyRole ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const member = useMemo(
    () => members.find((m) => m.id === memberId) ?? null,
    [members, memberId],
  )

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

  useEffect(() => {
    if (!member || !user?.uid) {
      setCanExplore(false)
      setExploreRootUid(null)
      return
    }
    let cancelled = false
    void resolveExploreAccess(user.uid, member, viewerInvitedByUid).then((result) => {
      if (cancelled) return
      setCanExplore(result.allowed)
      setExploreRootUid(result.rootUid)
    })
    return () => {
      cancelled = true
    }
  }, [member, user?.uid, viewerInvitedByUid])

  if (!member) {
    return (
      <div className="claimed-member-page">
        <Link to="/home/tree" className="claimed-back">
          ← Back to Family Tree
        </Link>
        <p className="claimed-loading">Loading profile…</p>
      </div>
    )
  }

  const roleLabel =
    memberRelationshipLabel(member) ?? treeMemberRoleLabel(member)
  const father = members.find((m) => m.id === member.sharedFatherMemberId) ?? null
  const mother = members.find((m) => m.id === member.sharedMotherMemberId) ?? null
  const dob = formatDisplayDate(member.dateOfBirth)
  const bio = formatBioForDisplay(member.bio)
  const genderTone = avatarGenderToneForMember(member, avatarViewer)
  const claimed = isClaimedTreeMember(member)

  return (
    <div className="claimed-member-page">
      <div className="claimed-member-top">
        <Link to="/home/tree" className="claimed-back">
          ← Back to Family Tree
        </Link>
        <span className="claimed-account-badge">
          {claimed ? 'Claimed Account' : 'Family member profile'}
        </span>
      </div>

      <div className="claimed-member-grid">
        <section className="claimed-card claimed-card-profile">
          <ProfileAvatar
            photoURL={member.photoURL}
            name={member.displayName}
            gender={member.gender}
            genderTone={genderTone}
            size="lg"
            className="claimed-profile-avatar"
          />
          <h1>{member.displayName}</h1>
          <p className="claimed-role">{roleLabel}</p>
          <span className="claimed-privacy-pill">
            {memberPrivacyScopeLabel(member.privacy)}
          </span>

          <ul className="claimed-facts">
            <li>
              <FieldIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </FieldIcon>
              <span>
                <strong>Date of Birth</strong>
                {dob ?? 'Not shared'}
              </span>
            </li>
            <li>
              <FieldIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4z" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
              </FieldIcon>
              <span>
                <strong>Email Address</strong>
                {member.inviteeEmail ?? 'Not shared'}
              </span>
            </li>
            <li>
              <FieldIcon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </FieldIcon>
              <span>
                <strong>Living Status</strong>
                {member.memberStatus === 'deceased' ? 'Deceased' : 'Alive'}
              </span>
            </li>
          </ul>

          {canExplore && exploreRootUid ? (
            <Link
              to={`/home/tree?explore=${encodeURIComponent(exploreRootUid)}`}
              className="claimed-explore-link"
            >
              Explore their family tree
            </Link>
          ) : null}
        </section>

        <section className="claimed-card claimed-card-about">
          <h2>About {member.displayName.split(/\s+/)[0] ?? member.displayName}</h2>
          <div className="claimed-about-box">
            <p>{bio}</p>
          </div>
          <p className="claimed-readonly-note">
            {claimed
              ? `This profile is managed by ${member.displayName.split(/\s+/)[0] ?? 'them'}. You can view details but not edit a claimed account.`
              : 'This person is on your tree through extended family. You can view their details here but cannot edit them.'}
          </p>
        </section>
      </div>

      <section className="claimed-card claimed-card-relations">
        <div className="claimed-relation-col">
          <h3>Father</h3>
          {father ? (
            isClaimedTreeMember(father) ? (
              <Link to={`/home/member/${father.id}`} className="claimed-relation-person">
                <ProfileAvatar
                  photoURL={father.photoURL}
                  name={father.displayName}
                  gender={father.gender}
                  genderTone={avatarGenderToneForMember(father, avatarViewer)}
                  size="sm"
                />
                <span>{father.displayName}</span>
              </Link>
            ) : (
              <div className="claimed-relation-person claimed-relation-static">
                <ProfileAvatar
                  photoURL={father.photoURL}
                  name={father.displayName}
                  gender={father.gender}
                  genderTone={avatarGenderToneForMember(father, avatarViewer)}
                  size="sm"
                />
                <span>{father.displayName}</span>
              </div>
            )
          ) : (
            <p className="claimed-relation-empty">Not linked</p>
          )}
        </div>
        <div className="claimed-relation-col">
          <h3>Mother</h3>
          {mother ? (
            isClaimedTreeMember(mother) ? (
              <Link to={`/home/member/${mother.id}`} className="claimed-relation-person">
                <ProfileAvatar
                  photoURL={mother.photoURL}
                  name={mother.displayName}
                  gender={mother.gender}
                  genderTone={avatarGenderToneForMember(mother, avatarViewer)}
                  size="sm"
                />
                <span>{mother.displayName}</span>
              </Link>
            ) : (
              <div className="claimed-relation-person claimed-relation-static">
                <ProfileAvatar
                  photoURL={mother.photoURL}
                  name={mother.displayName}
                  gender={mother.gender}
                  genderTone={avatarGenderToneForMember(mother, avatarViewer)}
                  size="sm"
                />
                <span>{mother.displayName}</span>
              </div>
            )
          ) : (
            <p className="claimed-relation-empty">Not linked</p>
          )}
        </div>
        <div className="claimed-relation-col">
          <h3>Added by</h3>
          <div className="claimed-relation-person claimed-relation-static">
            <ProfileAvatar photoURL={null} name={viewerName} size="sm" gender={viewerGender} />
            <span>
              {viewerName}
              {viewerPosition ? ` [${viewerPosition}]` : ''}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
