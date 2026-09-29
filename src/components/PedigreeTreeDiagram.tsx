import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import TreePersonDetails from './TreePersonDetails'
import {
  profileFirstName,
} from '../lib/userProfile'
import {
  treeMemberRoleLabel,
  roleLabel,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { formatLifeYearsLine } from '../lib/lifeDates'
import type { MemberPrivacy } from '../lib/memberPrivacy'
import type { DashboardContext } from '../pages/HomePage'

function pedigreeRoleLine(
  roleText: string,
  memberStatus: 'living' | 'deceased',
): string {
  return `${roleText} (${memberStatus === 'living' ? 'Living' : 'Deceased'})`
}

function orderByParentSlot(members: TreeMember[]): TreeMember[] {
  const father = members.filter((p) => p.parentSlot === 'father')
  const mother = members.filter((p) => p.parentSlot === 'mother')
  const rest = members.filter(
    (p) => p.parentSlot !== 'father' && p.parentSlot !== 'mother',
  )
  return [...father, ...mother, ...rest]
}

function treeNameLabel(member: TreeMember): string {
  return profileFirstName(member.displayName, roleLabel(member.role))
}

function PedigreeMemberNode({ member }: { member: TreeMember }) {
  const roleText = treeMemberRoleLabel(member)
  const yearsLabel = formatLifeYearsLine(
    member.dateOfBirth,
    member.dateOfDeath,
    member.memberStatus,
  )

  return (
    <div className="pedigree-node">
      <TreePersonDetails
        photoURL={member.photoURL}
        displayName={member.displayName}
        nameLabel={treeNameLabel(member)}
        bio=""
        privacy={member.privacy}
        variant="pedigree"
        roleLabel={pedigreeRoleLine(roleText, member.memberStatus)}
        yearsLabel={yearsLabel}
      />
    </div>
  )
}

function AddPedigreeChip({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" className="pedigree-add-chip" onClick={onClick}>
      {label}
    </button>
  )
}

function HorizontalLine() {
  return <span className="pedigree-h-line" aria-hidden="true" />
}

function VerticalStem() {
  return <span className="pedigree-v-stem" aria-hidden="true" />
}

function MemberPairRow({ members }: { members: TreeMember[] }) {
  if (members.length === 0) return null

  return (
    <div className="pedigree-pair-row">
      {members.map((member, index) => (
        <Fragment key={member.id}>
          {index > 0 ? <HorizontalLine /> : null}
          <PedigreeMemberNode member={member} />
        </Fragment>
      ))}
    </div>
  )
}

function TierBlock({
  members,
  slotRole,
  openModal,
  emptyLabel,
  addLabel,
  showStemAfter = false,
}: {
  members: TreeMember[]
  slotRole: 'grandparent' | 'parent' | 'child'
  openModal: DashboardContext['openModal']
  emptyLabel: string
  addLabel: string
  showStemAfter?: boolean
}) {
  const hasMembers = members.length > 0

  return (
    <div className={`pedigree-tier${hasMembers ? ' has-members' : ''}`}>
      {hasMembers ? <MemberPairRow members={members} /> : null}
      {hasMembers && showStemAfter ? <VerticalStem /> : null}
      <div className="pedigree-tier-actions">
        <AddPedigreeChip
          label={hasMembers ? addLabel : emptyLabel}
          onClick={() => openModal(slotRole)}
        />
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
}: {
  members: TreeMember[]
  openModal: DashboardContext['openModal']
  selfPhotoURL: string | null
  selfName: string
  selfHasProfileName: boolean
  selfBio: string
  selfPrivacy: MemberPrivacy
  selfDateOfBirth: string | null
}) {
  const grandparents = orderByParentSlot(members.filter((m) => m.role === 'grandparent'))
  const parents = orderByParentSlot(members.filter((m) => m.role === 'parent'))
  const siblings = members.filter((m) => m.role === 'sibling')
  const spouses = members.filter((m) => m.role === 'spouse')
  const children = members.filter((m) => m.role === 'child')

  const selfDisplayName = selfName.trim() || 'You'
  const selfNameLabel = selfHasProfileName
    ? profileFirstName(selfDisplayName, 'You')
    : 'YOU'
  const selfYearsLabel = formatLifeYearsLine(selfDateOfBirth, null, 'living')

  const hasGrandparents = grandparents.length > 0
  const hasParents = parents.length > 0

  return (
    <div className="pedigree-tree" role="img" aria-label="Family tree diagram">
      <div className="pedigree-stack">
        <TierBlock
          members={grandparents}
          slotRole="grandparent"
          openModal={openModal}
          emptyLabel="+ Add Grandparent"
          addLabel="+ Add another grandparent"
          showStemAfter={hasGrandparents}
        />

        <TierBlock
          members={parents}
          slotRole="parent"
          openModal={openModal}
          emptyLabel="+ Add Parent"
          addLabel="+ Add another parent"
          showStemAfter={hasParents}
        />

        <div className="pedigree-tier pedigree-tier-peer has-members">
          <div className="pedigree-peer-row">
            {siblings.map((member, index) => (
              <Fragment key={member.id}>
                {index > 0 ? <HorizontalLine /> : null}
                <PedigreeMemberNode member={member} />
              </Fragment>
            ))}
            {siblings.length > 0 ? <HorizontalLine /> : null}
            <Link to="/home/profile" className="pedigree-node pedigree-node-self">
              <TreePersonDetails
                photoURL={selfPhotoURL}
                displayName={selfDisplayName}
                nameLabel={selfNameLabel}
                bio={selfBio}
                privacy={selfPrivacy}
                avatarClassName="tree-person-avatar-you"
                variant="pedigree"
                roleLabel={
                  selfHasProfileName ? pedigreeRoleLine('You', 'living') : undefined
                }
                yearsLabel={selfHasProfileName ? selfYearsLabel : null}
                youBadge={!selfHasProfileName}
              />
            </Link>
            {spouses.map((member) => (
              <Fragment key={member.id}>
                <HorizontalLine />
                <PedigreeMemberNode member={member} />
              </Fragment>
            ))}
          </div>
          <VerticalStem />
          <div className="pedigree-tier-actions pedigree-tier-actions-split">
            <AddPedigreeChip label="+ Add Sibling" onClick={() => openModal('sibling')} />
            <AddPedigreeChip
              label={spouses.length === 0 ? '+ Add Spouse' : '+ Add another spouse'}
              onClick={() => openModal('spouse')}
            />
          </div>
        </div>

        <TierBlock
          members={children}
          slotRole="child"
          openModal={openModal}
          emptyLabel="+ Add Child"
          addLabel="+ Add another child"
        />
      </div>
    </div>
  )
}
