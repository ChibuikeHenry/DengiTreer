import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileAvatar from './ProfileAvatar'
import { treeMemberRoleLabel, type TreeMember } from '../lib/familyTreeMembers'
import {
  exploreAccessHint,
  resolveExploreAccess,
} from '../lib/treeExplore'
import { DashIcons } from './DashboardLayout'

type Props = {
  open: boolean
  member: TreeMember | null
  viewerUid: string | null
  viewerInvitedByUid: string | null
  onClose: () => void
  onEdit?: (member: TreeMember) => void
}

export default function ExploreTreeMemberModal({
  open,
  member,
  viewerUid,
  viewerInvitedByUid,
  onClose,
  onEdit,
}: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [canExplore, setCanExplore] = useState(false)
  const [exploreRootUid, setExploreRootUid] = useState<string | null>(null)
  const [accessReason, setAccessReason] = useState<'inviter' | 'invitee' | 'none'>('none')

  useEffect(() => {
    if (!open || !member || !viewerUid) {
      setCanExplore(false)
      setExploreRootUid(null)
      setAccessReason('none')
      return
    }

    let cancelled = false
    setChecking(true)
    void resolveExploreAccess(viewerUid, member, viewerInvitedByUid).then((result) => {
      if (cancelled) return
      setCanExplore(result.allowed)
      setExploreRootUid(result.rootUid)
      setAccessReason(result.reason === 'self' ? 'none' : result.reason)
      setChecking(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, member, viewerUid, viewerInvitedByUid])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !member) return null

  const roleLabel = treeMemberRoleLabel(member)

  function handleExplore() {
    if (!exploreRootUid) return
    onClose()
    navigate(`/home/tree?explore=${encodeURIComponent(exploreRootUid)}`)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-panel explore-member-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{member.displayName}</h2>
            <p>{roleLabel}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            {DashIcons.close()}
          </button>
        </header>

        <div className="explore-member-body">
          <ProfileAvatar
            photoURL={member.photoURL}
            name={member.displayName}
            gender={member.gender}
            size="lg"
          />
          <p className="explore-member-hint">
            {member.profileClaimed
              ? 'This person has claimed their profile on DengiTree.'
              : member.inviterCanEdit
                ? 'Invite pending — you can still update their details before they join.'
                : 'This person is on your tree through extended family. You can view them but not edit their details.'}
          </p>
        </div>

        <div className="explore-member-actions">
          {member.inviterCanEdit && onEdit ? (
            <button
              type="button"
              className="btn-modal-primary"
              onClick={() => {
                onEdit(member)
                onClose()
              }}
            >
              Edit details
            </button>
          ) : null}
          {checking ? (
            <button type="button" className="btn-modal-outline" disabled>
              Checking tree access…
            </button>
          ) : canExplore && exploreRootUid ? (
            <button
              type="button"
              className={member.inviterCanEdit ? 'btn-modal-outline' : 'btn-modal-primary'}
              onClick={handleExplore}
            >
              Explore their family tree
            </button>
          ) : member.profileClaimed ? (
            <p className="explore-member-unavailable">
              Their tree isn&apos;t shared with you yet. They need to join through your invite
              link.
            </p>
          ) : !member.inviterCanEdit ? (
            <p className="explore-member-unavailable">
              Only the person who invited them can edit this profile before it is claimed.
            </p>
          ) : null}
          {canExplore ? (
            <p className="explore-member-access-note">{exploreAccessHint(accessReason)}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
