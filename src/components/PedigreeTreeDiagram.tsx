import { Fragment, type ReactNode } from 'react'
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
import type { DashboardContext } from '../pages/HomePage'
import './pedigree-tree.css'

function roleLine(roleText: string, memberStatus: 'living' | 'deceased'): string {
  return memberStatus === 'deceased' ? `${roleText} (Deceased)` : roleText
}

function memberAvatarTone(
  member: TreeMember,
  viewer: TreeAvatarViewerContext | null,
): AvatarGenderTone {
  return avatarGenderToneForMember(member, viewer)
}

/** Step partners sit outside the biological couple so the stem hits father–mother. */
function orderHousehold(members: TreeMember[]): TreeMember[] {
  const primaryFather =
    members.find((p) => p.parentSlot === 'father' && p.parentKind !== 'step') ??
    members.find((p) => p.parentSlot === 'father')
  const primaryMother =
    members.find((p) => p.parentSlot === 'mother' && p.parentKind !== 'step') ??
    members.find((p) => p.parentSlot === 'mother')
  const used = new Set(
    [primaryFather?.id, primaryMother?.id].filter((id): id is string => Boolean(id)),
  )
  const extras = members.filter((p) => !used.has(p.id))
  const left = extras.filter((p) => p.parentSlot === 'mother' || p.parentKind === 'step')
  const right = extras.filter((p) => !left.includes(p))
  return [
    ...left,
    ...(primaryFather ? [primaryFather] : []),
    ...(primaryMother ? [primaryMother] : []),
    ...right,
  ]
}

function PedigreeMemberNode({
  member,
  viewer,
  onSelectMember,
  exploreHint = false,
}: {
  member: TreeMember
  viewer: TreeAvatarViewerContext | null
  onSelectMember?: (member: TreeMember) => void
  exploreHint?: boolean
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
        member.inviterCanEdit
          ? 'Click to edit member details'
          : exploreHint && (member.joinedUid || member.id.startsWith('inviter-'))
            ? 'Click to explore their family tree'
            : member.profileClaimed
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
        avatarGenderTone={memberAvatarTone(member, viewer)}
        avatarGender={displayMember.gender}
      />
    </div>
  )
}

/** Index of the child node that completes the primary father–mother pair (stem drops from that join). */
function primaryCoupleJoinBeforeIndex(members: TreeMember[]): number | null {
  if (members.length < 2) return null
  const fatherIdx = members.findIndex(
    (m) => m.parentSlot === 'father' && m.parentKind !== 'step',
  )
  if (fatherIdx === -1) return members.length === 2 ? 1 : null
  const motherIdx = members.findIndex(
    (m, i) => i > fatherIdx && m.parentSlot === 'mother' && m.parentKind !== 'step',
  )
  if (motherIdx === fatherIdx + 1) return motherIdx
  return members.length === 2 ? 1 : null
}

/** Horizontal line between two neighbours. `childrenDrop` hangs a stem + children off its middle. */
function Join({
  childrenDrop,
  hasStem = false,
  isStep = false,
}: {
  childrenDrop?: ReactNode
  hasStem?: boolean
  isStep?: boolean
}) {
  return (
    <div
      className={`ped-join${childrenDrop ? ' ped-join-drop' : ''}${isStep ? ' is-step-join' : ''}`}
      aria-hidden={childrenDrop ? undefined : true}
    >
      {hasStem ? <div className="ped-join-stem" aria-hidden="true" /> : null}
      {childrenDrop}
    </div>
  )
}

/** Vertical link between generations (avatar centre to avatar centre on the next row). */
function VLink({ dashed = false }: { dashed?: boolean }) {
  return (
    <div
      className={`ped-vlink${dashed ? ' ped-vlink-dashed' : ''}`}
      aria-hidden="true"
    />
  )
}

function AddCircle({
  label,
  onClick,
  className = '',
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button type="button" className={`ped-add ${className}`.trim()} onClick={onClick}>
      <span className="ped-add-ring" aria-hidden="true">
        +
      </span>
      <span className="ped-add-label">{label}</span>
    </button>
  )
}

function PartnerRow({
  members,
  viewer,
  onSelectMember,
  coupleStemDown = false,
  exploreHint = false,
}: {
  members: TreeMember[]
  viewer: TreeAvatarViewerContext | null
  onSelectMember?: (member: TreeMember) => void
  /** Drop a vertical stem from the primary couple’s join to the next generation. */
  coupleStemDown?: boolean
  exploreHint?: boolean
}) {
  const stemBeforeIndex = coupleStemDown ? primaryCoupleJoinBeforeIndex(members) : null

  return (
    <div className="ped-row">
      {members.map((member, index) => {
        const prev = index > 0 ? members[index - 1] : null
        const isStep = Boolean(
          prev && (prev.parentKind === 'step' || member.parentKind === 'step'),
        )
        return (
          <Fragment key={member.id}>
            {index > 0 ? (
              <Join hasStem={stemBeforeIndex === index} isStep={isStep} />
            ) : null}
            <PedigreeMemberNode
              member={member}
              viewer={viewer}
              onSelectMember={onSelectMember}
              exploreHint={exploreHint}
            />
          </Fragment>
        )
      })}
    </div>
  )
}

/** Children hang off a horizontal bracket, each with its own short drop. */
function ChildRow({
  members,
  viewer,
  openModal,
  onSelectMember,
  allowAdds = true,
  exploreHint = false,
}: {
  members: TreeMember[]
  viewer: TreeAvatarViewerContext | null
  openModal: DashboardContext['openModal']
  onSelectMember?: (member: TreeMember) => void
  allowAdds?: boolean
  exploreHint?: boolean
}) {
  return (
    <div className="ped-kidrow">
      {members.map((member) => (
        <div key={member.id} className="ped-kid">
          <PedigreeMemberNode
            member={member}
            viewer={viewer}
            onSelectMember={onSelectMember}
            exploreHint={exploreHint}
          />
        </div>
      ))}
      {allowAdds ? (
        <div className="ped-kid">
          <AddCircle label="Add Child" onClick={() => openModal('child')} />
        </div>
      ) : null}
    </div>
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
}) {
  const greatGrandparents = orderHousehold(members.filter((m) => m.role === 'great-grandparent'))
  const grandparents = orderHousehold(members.filter((m) => m.role === 'grandparent'))
  const parents = orderHousehold(members.filter((m) => m.role === 'parent'))
  const siblings = members.filter((m) => m.role === 'sibling')
  const spouses = members.filter((m) => m.role === 'spouse')
  const children = members.filter((m) => m.role === 'child')

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

  const kids = (inline: boolean) => (
    <div className={`ped-kids${inline ? ' is-inline' : ''}`}>
      <div className={`ped-stem${inline ? '' : ' ped-stem-long'}`} aria-hidden="true" />
      <ChildRow
        members={children}
        viewer={viewer}
        openModal={openModal}
        onSelectMember={onSelectMember}
        allowAdds={allowAdds}
        exploreHint={exploreHint}
      />
    </div>
  )

  return (
    <div className="pedigree-tree" role="group" aria-label="Family tree diagram">
      <div className="ped-col">
        {/* great-grandparents */}
        {greatGrandparents.length > 0 ? (
          <>
            <div className="ped-slot">
              <PartnerRow
                members={greatGrandparents}
                viewer={viewer}
                onSelectMember={onSelectMember}
                coupleStemDown={greatGrandparents.length > 1 && grandparents.length > 0}
                exploreHint={exploreHint}
              />
            </div>
            {greatGrandparents.length === 1 && grandparents.length > 0 ? <VLink /> : null}
          </>
        ) : null}

        {/* grandparents */}
        <div className="ped-slot">
          {grandparents.length > 0 ? (
            <PartnerRow
              members={grandparents}
              viewer={viewer}
              onSelectMember={onSelectMember}
              coupleStemDown={grandparents.length > 1 && parents.length > 0}
              exploreHint={exploreHint}
            />
          ) : allowAdds ? (
            <AddCircle label="Add Grandparent" onClick={() => openModal('grandparent')} />
          ) : null}
          {allowAdds && grandparents.length > 0 ? (
            <AddCircle
              className="ped-add-side"
              label="Add Grandparent"
              onClick={() => openModal('grandparent')}
            />
          ) : null}
        </div>

        {grandparents.length === 1 && parents.length > 0 ? <VLink /> : null}
        {parents.length === 0 && grandparents.length > 0 ? (
          <VLink dashed={grandparents.length > 1} />
        ) : null}

        {/* parents */}
        <div className="ped-slot">
          {parents.length > 0 ? (
            <PartnerRow
              members={parents}
              viewer={viewer}
              onSelectMember={onSelectMember}
              coupleStemDown={false}
              exploreHint={exploreHint}
            />
          ) : allowAdds ? (
            <AddCircle label="Add Parent" onClick={() => openModal('parent')} />
          ) : null}
          {allowAdds && parents.length > 0 ? (
            <AddCircle
              className="ped-add-side"
              label="Add Parent"
              onClick={() => openModal('parent')}
            />
          ) : null}
        </div>

        {/* siblings + you + spouse + children */}
        <div className="ped-anchor">
          <div
            className={`ped-blood-group${siblings.length > 0 ? ' ped-has-sibling-bus' : ''}`}
          >
            {parents.length > 0 ? (
              <div className="ped-drop-to-blood" aria-hidden="true" />
            ) : null}
            <div className="ped-row ped-blood">
              {siblings.map((member) => (
                <PedigreeMemberNode
                  key={member.id}
                  member={member}
                  viewer={viewer}
                  onSelectMember={onSelectMember}
                  exploreHint={exploreHint}
                />
              ))}
              <div className="ped-you-slot">
              {centerProfileHref ? (
                <Link to={centerProfileHref} className="ped-person ped-person-self">
                  <TreePersonDetails
                    photoURL={selfPhotoURL}
                    displayName={selfDisplayName}
                    nameLabel={selfHasProfileName ? selfDisplayName : selfNameLabel}
                    bio={selfBio}
                    privacy={selfPrivacy}
                    avatarClassName={
                      selfAvatarTone === 'you' ? 'tree-person-avatar-you' : undefined
                    }
                    variant="pedigree"
                    roleLabel={
                      centerRoleLabel
                        ? roleLine(centerRoleLabel, 'living')
                        : selfPositionLabel
                          ? roleLine(selfPositionLabel, 'living')
                          : selfHasProfileName
                            ? roleLine('You', 'living')
                            : undefined
                    }
                    yearsLabel={selfHasProfileName ? selfYears : null}
                    youBadge={!selfHasProfileName && !selfPhotoURL && !centerRoleLabel}
                    avatarGenderTone={selfAvatarTone}
                    avatarGender={selfGender}
                  />
                </Link>
              ) : (
                <div className="ped-person ped-person-self">
                  <TreePersonDetails
                    photoURL={selfPhotoURL}
                    displayName={selfDisplayName}
                    nameLabel={selfHasProfileName ? selfDisplayName : selfNameLabel}
                    bio={selfBio}
                    privacy={selfPrivacy}
                    avatarClassName={
                      selfAvatarTone === 'you' ? 'tree-person-avatar-you' : undefined
                    }
                    variant="pedigree"
                    roleLabel={
                      centerRoleLabel
                        ? roleLine(centerRoleLabel, 'living')
                        : undefined
                    }
                    yearsLabel={selfHasProfileName ? selfYears : null}
                    youBadge={false}
                    avatarGenderTone={selfAvatarTone}
                    avatarGender={selfGender}
                  />
                </div>
              )}
              {spouses.length === 0 ? kids(true) : null}
              </div>
            </div>
          </div>

          <div className="ped-side">
            <Join childrenDrop={spouses.length > 0 ? kids(false) : null} />
            {spouses.map((member, index) => (
              <Fragment key={member.id}>
                {index > 0 ? <Join /> : null}
                <PedigreeMemberNode
                  member={member}
                  viewer={viewer}
                  onSelectMember={onSelectMember}
                  exploreHint={exploreHint}
                />
              </Fragment>
            ))}
            {spouses.length > 0 ? <Join /> : null}
            {allowAdds ? (
              <AddCircle label="Add Spouse" onClick={() => openModal('spouse')} />
            ) : null}
          </div>

          {allowAdds ? (
            <AddCircle
              className="ped-add-sibling"
              label="Add Sibling"
              onClick={() => openModal('sibling')}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}