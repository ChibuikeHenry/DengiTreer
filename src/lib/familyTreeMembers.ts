import type { InviteRole } from './invitations'
import { parseMemberPrivacy, type MemberPrivacy } from './memberPrivacy'
import {
  siblingRelationshipLabel,
  type ParentKind,
  type ParentSlot,
  type SiblingRelationship,
} from './siblingRelationship'
import { subscribeSentInvitations, type InvitationRecord } from './invitations'
import { canInviterEditInvitation, isProfileClaimed } from './profileClaim'
import { fetchUserProfile } from './userProfile'

export type TreeMember = {
  id: string
  firstName: string
  lastName: string
  displayName: string
  role: InviteRole
  photoURL: string | null
  memberStatus: 'living' | 'deceased'
  inviteStatus: 'pending' | 'joined'
  joinedUid: string | null
  profileClaimed: boolean
  inviterCanEdit: boolean
  privacy: MemberPrivacy
  bio: string
  parentSlot: ParentSlot | null
  parentKind: ParentKind | null
  sharedFatherMemberId: string | null
  sharedMotherMemberId: string | null
  siblingRelationship: SiblingRelationship | null
  dateOfBirth: string | null
  dateOfDeath: string | null
  inviteeEmail: string | null
}

const treeRoles = new Set<InviteRole>([
  'spouse',
  'parent',
  'grandparent',
  'child',
  'sibling',
])

export function mapInvitationToTreeMember(record: InvitationRecord): TreeMember | null {
  if (!treeRoles.has(record.role)) return null

  const firstName =
    record.inviteeFirstName?.trim() ||
    record.inviteeName?.trim().split(/\s+/)[0] ||
    ''
  const lastName =
    record.inviteeLastName?.trim() ||
    record.inviteeName?.trim().split(/\s+/).slice(-1)[0] ||
    ''
  const displayName =
    record.inviteeName?.trim() ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    'Family member'

  const claimed = isProfileClaimed(record)

  return {
    id: record.id,
    firstName,
    lastName,
    displayName,
    role: record.role,
    photoURL: record.photoURL,
    memberStatus: record.memberStatus,
    inviteStatus: record.status,
    joinedUid: record.joinedUid,
    profileClaimed: claimed,
    inviterCanEdit: canInviterEditInvitation(record),
    privacy: record.privacy,
    bio: record.bio,
    parentSlot: record.parentSlot,
    parentKind: record.parentKind,
    sharedFatherMemberId: record.sharedFatherMemberId,
    sharedMotherMemberId: record.sharedMotherMemberId,
    siblingRelationship: record.siblingRelationship,
    dateOfBirth: record.dateOfBirth,
    dateOfDeath: record.dateOfDeath,
    inviteeEmail: record.inviteeEmail,
  }
}

async function enrichClaimedMember(member: TreeMember): Promise<TreeMember> {
  if (!member.profileClaimed || !member.joinedUid) return member

  try {
    const profile = await fetchUserProfile(member.joinedUid)
    if (!profile) return member

    const displayName =
      [profile.firstName, profile.middleName, profile.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ') || member.displayName

    return {
      ...member,
      firstName: profile.firstName || member.firstName,
      lastName: profile.lastName || member.lastName,
      displayName,
      photoURL: profile.photoURL ?? member.photoURL,
      bio: profile.bio?.trim() || member.bio,
      privacy: profile.profilePrivacy
        ? parseMemberPrivacy(profile.profilePrivacy)
        : member.privacy,
      dateOfBirth: profile.dateOfBirth?.trim() || member.dateOfBirth,
    }
  } catch {
    return member
  }
}

async function enrichClaimedMembers(members: TreeMember[]): Promise<TreeMember[]> {
  return Promise.all(members.map((member) => enrichClaimedMember(member)))
}

export function subscribeTreeMembers(
  uid: string,
  onChange: (members: TreeMember[]) => void,
  onError?: (error: Error) => void,
) {
  let unsub1: (() => void) | null = null
  let unsub2: (() => void) | null = null

  let recs1: InvitationRecord[] = []
  let recs2: InvitationRecord[] = []

  function notify() {
    const map = new Map<string, InvitationRecord>()
    for (const r of recs1) map.set(r.id, r)
    for (const r of recs2) map.set(r.id, r)

    const records = Array.from(map.values())
    const members = records
      .map((record) => mapInvitationToTreeMember(record))
      .filter((member): member is TreeMember => member !== null)
    void enrichClaimedMembers(members).then(onChange)
  }

  unsub1 = subscribeSentInvitations(
    uid,
    (records) => {
      recs1 = records
      notify()
    },
    onError,
  )

  void fetchUserProfile(uid).then((profile) => {
    if (profile?.invitedByUid && profile.invitedByUid !== uid) {
      unsub2 = subscribeSentInvitations(
        profile.invitedByUid,
        (records) => {
          recs2 = records
          notify()
        },
        onError,
      )
    }
  })

  return () => {
    unsub1?.()
    unsub2?.()
  }
}

const groupedTreeRoles = ['parent', 'child', 'sibling', 'spouse'] as const
export type GroupedTreeRole = (typeof groupedTreeRoles)[number]

export function membersGroupedByRole(members: TreeMember[]) {
  const groups: Record<GroupedTreeRole, TreeMember[]> = {
    parent: [],
    child: [],
    sibling: [],
    spouse: [],
  }

  for (const member of members) {
    if (groupedTreeRoles.includes(member.role as GroupedTreeRole)) {
      groups[member.role as GroupedTreeRole].push(member)
    }
  }

  return groups
}

/** @deprecated Prefer membersGroupedByRole when multiple members per role are supported */
export function membersByRole(members: TreeMember[]) {
  const groups = membersGroupedByRole(members)
  return {
    parent: groups.parent[0],
    child: groups.child[0],
    sibling: groups.sibling[0],
    spouse: groups.spouse[0],
  }
}

export function computeTreeStats(selfOnTree: boolean, members: TreeMember[]) {
  const total = (selfOnTree ? 1 : 0) + members.length
  const hasGrandparent = members.some((m) => m.role === 'grandparent')
  const hasParent = members.some((m) => m.role === 'parent')
  const hasChild = members.some((m) => m.role === 'child')
  let generations = selfOnTree ? 1 : 0
  if (hasGrandparent) generations += 1
  if (hasParent) generations += 1
  if (hasChild) generations += 1

  const branches = members.length

  return {
    total,
    generations: Math.max(generations, selfOnTree ? 1 : 0),
    branches,
  }
}

export function parentSlotLabel(member: TreeMember): string {
  if (member.role !== 'parent') return roleLabel(member.role)
  if (member.parentSlot === 'father') return 'Father'
  if (member.parentSlot === 'mother') return 'Mother'
  return 'Parent'
}

export function grandparentSlotLabel(member: TreeMember): string {
  if (member.role !== 'grandparent') return roleLabel(member.role)
  if (member.parentSlot === 'father') return 'Grandfather'
  if (member.parentSlot === 'mother') return 'Grandmother'
  return 'Grandparent'
}

export function treeMemberRoleLabel(member: TreeMember): string {
  if (member.role === 'sibling') {
    return memberRelationshipLabel(member) ?? roleLabel(member.role)
  }
  if (member.role === 'parent') return parentSlotLabel(member)
  if (member.role === 'grandparent') return grandparentSlotLabel(member)
  return roleLabel(member.role)
}

export function memberRelationshipLabel(member: TreeMember): string | null {
  if (member.role === 'sibling' && member.siblingRelationship) {
    return siblingRelationshipLabel(member.siblingRelationship)
  }
  return null
}

export function roleLabel(role: InviteRole): string {
  switch (role) {
    case 'spouse':
      return 'Spouse'
    case 'parent':
      return 'Parent'
    case 'grandparent':
      return 'Grandparent'
    case 'child':
      return 'Child'
    case 'sibling':
      return 'Sibling'
    default:
      return 'Member'
  }
}
