import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import TreePersonDetails from './TreePersonDetails'
import { profileFirstName } from '../lib/userProfile'
import { treeMemberRoleLabel, type TreeMember } from '../lib/familyTreeMembers'
import { formatLifeYearsLine } from '../lib/lifeDates'
import type { MemberPrivacy } from '../lib/memberPrivacy'
import type { DashboardContext } from '../pages/HomePage'
import './pedigree-tree.css'

function roleLine(roleText: string, memberStatus: 'living' | 'deceased'): string {
  return memberStatus === 'deceased' ? `${roleText} (Deceased)` : roleText
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
  onSelectMember,
}: {
  member: TreeMember
  onSelectMember?: (member: TreeMember) => void
}) {
  const yearsLabel = formatLifeYearsLine(
    member.dateOfBirth,
    member.dateOfDeath,
    member.memberStatus,
  )

  const isClickable = Boolean(onSelectMember)

  return (
    <div
      className="ped-person"
      onClick={() => onSelectMember?.(member)}
      style={isClickable ? { cursor: 'pointer' } : undefined}
      title={
        member.inviterCanEdit
          ? 'Click to edit member details'
          : member.profileClaimed
            ? 'Profile claimed · View only'
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
      />
    </div>
  )
}

/** Horizontal line between two neighbours. `childrenDrop` hangs a stem + children off its middle. */
function Join({ childrenDrop }: { childrenDrop?: ReactNode }) {
  return (
    <div
      className={`ped-join${childrenDrop ? ' ped-join-drop' : ''}`}
      aria-hidden={childrenDrop ? undefined : true}
    >
      {childrenDrop}
    </div>
  )
}

/**
 * Vertical line between generations.
 * - from-join: starts on the line joining a couple (not below their labels)
 * - to-join:   dashed, from an "Add" circle down to a couple's joining line
 */
function Stem({ mode }: { mode?: 'from-join' | 'to-join' }) {
  return <div className={`ped-stem${mode ? ` ped-stem-${mode}` : ''}`} aria-hidden="true" />
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
  onSelectMember,
}: {
  members: TreeMember[]
  onSelectMember?: (member: TreeMember) => void
}) {
  return (
    <div className="ped-row">
      {members.map((member, index) => (
        <Fragment key={member.id}>
          {index > 0 ? <Join /> : null}
          <PedigreeMemberNode member={member} onSelectMember={onSelectMember} />
        </Fragment>
      ))}
    </div>
  )
}

/** Children hang off a horizontal bracket, each with its own short drop. */
function ChildRow({
  members,
  openModal,
  onSelectMember,
}: {
  members: TreeMember[]
  openModal: DashboardContext['openModal']
  onSelectMember?: (member: TreeMember) => void
}) {
  return (
    <div className="ped-kidrow">
      {members.map((member) => (
        <div key={member.id} className="ped-kid">
          <PedigreeMemberNode member={member} onSelectMember={onSelectMember} />
        </div>
      ))}
      <div className="ped-kid">
        <AddCircle label="Add Child" onClick={() => openModal('child')} />
      </div>
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
  onSelectMember,
}: {
  members: TreeMember[]
  openModal: DashboardContext['openModal']
  selfPhotoURL: string | null
  selfName: string
  selfHasProfileName: boolean
  selfBio: string
  selfPrivacy: MemberPrivacy
  selfDateOfBirth: string | null
  onSelectMember?: (member: TreeMember) => void
}) {
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

  const kids = (inline: boolean) => (
    <div className={`ped-kids${inline ? ' is-inline' : ''}`}>
      <div className={`ped-stem${inline ? '' : ' ped-stem-long'}`} aria-hidden="true" />
      <ChildRow members={children} openModal={openModal} onSelectMember={onSelectMember} />
    </div>
  )

  return (
    <div className="pedigree-tree" role="group" aria-label="Family tree diagram">
      <div className="ped-col">
        {/* grandparents */}
        <div className="ped-slot">
          {grandparents.length > 0 ? (
            <PartnerRow members={grandparents} onSelectMember={onSelectMember} />
          ) : (
            <AddCircle label="Add Grandparent" onClick={() => openModal('grandparent')} />
          )}
          {grandparents.length > 0 ? (
            <AddCircle
              className="ped-add-side"
              label="Add Grandparent"
              onClick={() => openModal('grandparent')}
            />
          ) : null}
        </div>

        {grandparents.length > 0 ? (
          <Stem mode={grandparents.length > 1 ? 'from-join' : undefined} />
        ) : parents.length > 0 ? (
          <Stem mode={parents.length > 1 ? 'to-join' : undefined} />
        ) : null}

        {/* parents */}
        <div className="ped-slot">
          {parents.length > 0 ? (
            <PartnerRow members={parents} onSelectMember={onSelectMember} />
          ) : (
            <AddCircle label="Add Parent" onClick={() => openModal('parent')} />
          )}
          {parents.length > 0 ? (
            <AddCircle
              className="ped-add-side"
              label="Add Parent"
              onClick={() => openModal('parent')}
            />
          ) : null}
        </div>

        {parents.length > 0 ? (
          <Stem mode={parents.length > 1 ? 'from-join' : undefined} />
        ) : null}

        {/* siblings + you + spouse + children */}
        <div className="ped-anchor">
          <div className="ped-row ped-blood">
            {siblings.map((member, index) => (
              <Fragment key={member.id}>
                {index > 0 ? <Join /> : null}
                <PedigreeMemberNode member={member} onSelectMember={onSelectMember} />
              </Fragment>
            ))}
            {siblings.length > 0 ? <Join /> : null}
            <div className="ped-you-slot">
              <Link to="/home/profile" className="ped-person ped-person-self">
                <TreePersonDetails
                  photoURL={selfPhotoURL}
                  displayName={selfDisplayName}
                  nameLabel={selfHasProfileName ? selfDisplayName : selfNameLabel}
                  bio={selfBio}
                  privacy={selfPrivacy}
                  avatarClassName="tree-person-avatar-you"
                  variant="pedigree"
                  roleLabel={selfHasProfileName ? roleLine('You', 'living') : undefined}
                  yearsLabel={selfHasProfileName ? selfYears : null}
                  youBadge={!selfHasProfileName}
                />
              </Link>
              {spouses.length === 0 ? kids(true) : null}
            </div>
          </div>

          <div className="ped-side">
            <Join childrenDrop={spouses.length > 0 ? kids(false) : null} />
            {spouses.map((member, index) => (
              <Fragment key={member.id}>
                {index > 0 ? <Join /> : null}
                <PedigreeMemberNode member={member} onSelectMember={onSelectMember} />
              </Fragment>
            ))}
            {spouses.length > 0 ? <Join /> : null}
            <AddCircle label="Add Spouse" onClick={() => openModal('spouse')} />
          </div>

          <AddCircle
            className="ped-add-sibling"
            label="Add Sibling"
            onClick={() => openModal('sibling')}
          />
        </div>
      </div>
    </div>
  )
}