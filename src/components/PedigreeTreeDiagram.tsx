import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react'
import { Link } from 'react-router-dom'
import TreePersonDetails from './TreePersonDetails'
import { profileFirstName } from '../lib/userProfile'
import {
  avatarGenderToneForMember,
  buildTreeAvatarViewer,
  normalizeTreeMemberGender,
  treeMemberForAvatarDisplay,
  treeMemberRoleLabel,
  type TreeAvatarViewerContext,
  type TreeMember,
} from '../lib/familyTreeMembers'
import type { AvatarGenderTone } from './ProfileAvatar'
import { formatLifeYearsLine } from '../lib/lifeDates'
import type { MemberPrivacy } from '../lib/memberPrivacy'
import { isClaimedTreeMember } from '../lib/profileClaim'
import { PED, buildPedigreeLayout } from '../lib/pedigreeLayout'
import { renderTreePng } from '../lib/exportTreeImage'
import type { DashboardContext } from '../pages/HomePage'
import './pedigree-tree.css'

const MIN_SCALE = 0.5

export type PedigreeTreeHandle = {
  /** render the tree to a PNG image */
  exportPng: (caption?: string) => Promise<Blob>
}

function roleLine(roleText: string, memberStatus: 'living' | 'deceased'): string {
  return memberStatus === 'deceased' ? `${roleText} (Deceased)` : roleText
}

function PedigreeMemberNode({
  member,
  viewer,
  onSelectMember,
  exploreHint = false,
  allowMemberEdit = true,
}: {
  member: TreeMember
  viewer: TreeAvatarViewerContext | null
  onSelectMember?: (member: TreeMember) => void
  exploreHint?: boolean
  allowMemberEdit?: boolean
}) {
  const yearsLabel = formatLifeYearsLine(
    member.dateOfBirth,
    member.dateOfDeath,
    member.memberStatus,
  )

  const isClickable = Boolean(onSelectMember)
  const displayMember = treeMemberForAvatarDisplay(member, viewer)

  return (
    <div
      className="ped-person"
      onClick={() => onSelectMember?.(member)}
      style={isClickable ? { cursor: 'pointer' } : undefined}
      title={
        allowMemberEdit && member.inviterCanEdit
          ? 'Click to edit member details'
          : exploreHint && (member.joinedUid || member.id.startsWith('inviter-'))
            ? 'Click to explore their family tree'
            : isClaimedTreeMember(member)
              ? 'Click to view claimed profile'
              : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectMember?.(member)
              }
            }
          : undefined
      }
    >
      <TreePersonDetails
        photoURL={member.photoURL}
        displayName={member.displayName}
        nameLabel={member.displayName}
        bio=""
        privacy={member.privacy}
        variant="pedigree"
        roleLabel={roleLine(treeMemberRoleLabel(member), member.memberStatus)}
        yearsLabel={yearsLabel}
        avatarGenderTone={avatarGenderToneForMember(member, viewer)}
        avatarGender={displayMember.gender}
      />
    </div>
  )
}

function AddCircle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="ped-add" onClick={onClick}>
      <span className="ped-add-ring" aria-hidden="true">
        +
      </span>
      <span className="ped-add-label">{label}</span>
    </button>
  )
}

export default function PedigreeTreeDiagram({
  members,
  openModal,
  selfPhotoURL,
  selfName,
  selfHasProfileName,
  selfBio,
  selfPrivacy,
  selfDateOfBirth,
  selfPositionLabel = null,
  selfGender = null,
  viewerUid = null,
  onSelectMember,
  allowAdds = true,
  centerProfileHref = '/home/profile',
  centerRoleLabel,
  exploreHint = false,
  allowMemberEdit = true,
  centerSelfMemberIds = [],
  centerFatherMemberId = null,
  centerMotherMemberId = null,
  maxScale = 1,
  handleRef,
}: {
  members: TreeMember[]
  openModal: DashboardContext['openModal']
  selfPhotoURL: string | null
  selfName: string
  selfHasProfileName: boolean
  selfBio: string
  selfPrivacy: MemberPrivacy
  selfDateOfBirth: string | null
  selfPositionLabel?: string | null
  selfGender?: string | null
  viewerUid?: string | null
  onSelectMember?: (member: TreeMember) => void
  allowAdds?: boolean
  centerProfileHref?: string | null
  centerRoleLabel?: string
  exploreHint?: boolean
  allowMemberEdit?: boolean
  centerSelfMemberIds?: string[]
  /** the centre person's own father / mother (profile links to a parent on the tree) */
  centerFatherMemberId?: string | null
  centerMotherMemberId?: string | null
  /** how far the diagram may be enlarged when there is spare room (full view uses > 1) */
  maxScale?: number
  handleRef?: Ref<PedigreeTreeHandle>
}) {
  // Lines that leave from under a person must start right below their real text, so the
  // rendered height of every person (avatar + labels) is measured and fed back to the layout.
  const [labelHeights, setLabelHeights] = useState<Record<string, number>>({})
  const layout = useMemo(
    () =>
      buildPedigreeLayout({
        members,
        allowAdds,
        centerSelfMemberIds,
        selfFatherMemberId: centerFatherMemberId,
        selfMotherMemberId: centerMotherMemberId,
        labelHeights,
      }),
    [members, allowAdds, centerSelfMemberIds, centerFatherMemberId, centerMotherMemberId, labelHeights],
  )

  // scale the whole canvas down (or up in full view) so it fits the available width
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapWidth, setWrapWidth] = useState(0)
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWrapWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const fit = wrapWidth > 0 ? wrapWidth / layout.width : 1
  const scale = Math.max(MIN_SCALE, Math.min(maxScale, fit))

  const canvasRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const measure = () => {
      const next: Record<string, number> = {}
      canvas.querySelectorAll<HTMLElement>('[data-ped-person]').forEach((el) => {
        const person = el.firstElementChild as HTMLElement | null
        if (person) next[el.dataset.pedPerson as string] = Math.ceil(person.offsetHeight)
      })
      setLabelHeights((prev) => {
        const keys = Object.keys(next)
        const same =
          keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k])
        return same ? prev : next
      })
    }
    measure()
    // web fonts finishing loading change how tall the text is
    void document.fonts?.ready.then(measure)
  }, [layout, selfName, selfDateOfBirth, selfHasProfileName, centerRoleLabel])
  useImperativeHandle(
    handleRef,
    () => ({
      exportPng: (caption) => {
        if (!canvasRef.current) return Promise.reject(new Error('Tree is not ready yet.'))
        return renderTreePng(canvasRef.current, layout, caption)
      },
    }),
    [layout],
  )

  const selfDisplayName = selfName.trim() || 'You'
  const selfNameLabel = selfHasProfileName
    ? profileFirstName(selfDisplayName, 'You')
    : 'YOU'
  const selfYears = formatLifeYearsLine(selfDateOfBirth, null, 'living')
  const selfNormalizedGender = normalizeTreeMemberGender(selfGender)
  const selfAvatarTone: AvatarGenderTone =
    selfNormalizedGender === 'female'
      ? 'female'
      : selfNormalizedGender === 'male'
        ? 'male'
        : selfPositionLabel && /\b(mother|wife|grandmother|sister|daughter)\b/i.test(selfPositionLabel)
          ? 'female'
          : selfPositionLabel && /\b(father|husband|grandfather|brother|son)\b/i.test(selfPositionLabel)
            ? 'male'
            : 'you'

  const viewer = buildTreeAvatarViewer({
    uid: viewerUid,
    gender: selfGender,
    photoURL: selfPhotoURL,
    displayName: selfDisplayName,
    positionLabel: selfPositionLabel,
  })

  const selfDetails = (
    <TreePersonDetails
      photoURL={selfPhotoURL}
      displayName={selfDisplayName}
      nameLabel={selfHasProfileName ? selfDisplayName : selfNameLabel}
      bio={selfBio}
      privacy={selfPrivacy}
      avatarClassName={selfAvatarTone === 'you' ? 'tree-person-avatar-you' : undefined}
      variant="pedigree"
      roleLabel={
        centerRoleLabel
          ? roleLine(centerRoleLabel, 'living')
          : centerProfileHref
            ? roleLine('You', 'living')
            : undefined
      }
      yearsLabel={selfHasProfileName ? selfYears : null}
      youBadge={Boolean(centerProfileHref) && !selfHasProfileName && !selfPhotoURL && !centerRoleLabel}
      avatarGenderTone={selfAvatarTone}
      avatarGender={selfGender}
    />
  )

  const stageStyle: CSSProperties & Record<string, string | number> = {
    width: layout.width * scale,
    height: layout.height * scale,
    '--ped-av': `${PED.av}px`,
    '--ped-node-h': `${PED.nodeH}px`,
  }

  return (
    <div
      className="pedigree-tree"
      ref={wrapRef}
      role="group"
      aria-label="Family tree diagram"
    >
      <div className="ped-stage" style={stageStyle}>
        <div
          ref={canvasRef}
          className="ped-canvas"
          style={{
            width: layout.width,
            height: layout.height,
            transform: `scale(${scale})`,
          }}
        >
          <svg
            className="ped-lines"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            {layout.segs.map((seg, i) => (
              <line
                key={i}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                strokeDasharray={seg.dashed ? '5 5' : undefined}
                strokeLinejoin="round"
                strokeLinecap={seg.dashed ? 'butt' : 'round'}
                style={{ strokeWidth: PED.line }}
              />
            ))}
          </svg>

          {layout.nodes.map((node) => (
            <div
              key={node.key}
              className="ped-node"
              data-ped-person={node.kind === 'member' ? node.member.id : node.kind === 'self' ? 'self' : undefined}
              style={{ left: node.x - PED.nodeW / 2, top: node.y, width: PED.nodeW }}
            >
              {node.kind === 'member' ? (
                <PedigreeMemberNode
                  member={node.member}
                  viewer={viewer}
                  onSelectMember={onSelectMember}
                  exploreHint={exploreHint}
                  allowMemberEdit={allowMemberEdit}
                />
              ) : node.kind === 'add' ? (
                <AddCircle label={node.label} onClick={() => openModal(node.modal)} />
              ) : centerProfileHref ? (
                <Link to={centerProfileHref} className="ped-person ped-person-self">
                  {selfDetails}
                </Link>
              ) : (
                <div className="ped-person ped-person-self">{selfDetails}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}