import type { InviteRole } from './invitations'
import { subscribeSentInvitations, type InvitationRecord } from './invitations'
import { isProfileClaimed } from './profileClaim'
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
}

const treeRoles = new Set<InviteRole>(['spouse', 'parent', 'child', 'sibling'])

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
    inviterCanEdit: record.memberStatus === 'deceased' || !claimed,
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
  return subscribeSentInvitations(
    uid,
    (records) => {
      const members = records
        .map((record) => mapInvitationToTreeMember(record))
        .filter((member): member is TreeMember => member !== null)
      void enrichClaimedMembers(members).then(onChange)
    },
    onError,
  )
}

export function membersByRole(members: TreeMember[]) {
  const map: Partial<Record<InviteRole, TreeMember>> = {}
  for (const member of members) {
    if (!map[member.role]) {
      map[member.role] = member
    }
  }
  return map
}

export function computeTreeStats(selfOnTree: boolean, members: TreeMember[]) {
  const total = (selfOnTree ? 1 : 0) + members.length
  const hasParent = members.some((m) => m.role === 'parent')
  const hasChild = members.some((m) => m.role === 'child')
  let generations = selfOnTree ? 1 : 0
  if (hasParent) generations += 1
  if (hasChild) generations += 1

  const branches = members.length

  return {
    total,
    generations: Math.max(generations, selfOnTree ? 1 : 0),
    branches,
  }
}

export function roleLabel(role: InviteRole): string {
  switch (role) {
    case 'spouse':
      return 'Spouse'
    case 'parent':
      return 'Parent'
    case 'child':
      return 'Child'
    case 'sibling':
      return 'Sibling'
    default:
      return 'Member'
  }
}
