import type { InviteRole } from './invitations'
import {
  DEFAULT_MEMBER_PRIVACY,
  parseMemberPrivacy,
  type MemberPrivacy,
} from './memberPrivacy'
import {
  siblingRelationshipLabel,
  type ParentKind,
  type ParentSlot,
  type SiblingRelationship,
} from './siblingRelationship'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { subscribeSentInvitations, type InvitationRecord } from './invitations'
import { canInviterEditInvitation, isProfileClaimed } from './profileClaim'
import { fetchUserProfile } from './userProfile'
import { setSelfOnTree } from './treeStorage'

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

/** how `other` (a role relative to the inviter) appears to the viewer, given the viewer's role relative to the inviter */
const VIEWER_ROLE_TABLE: Partial<
  Record<InviteRole, Partial<Record<InviteRole, InviteRole>>>
> = {
  child: { parent: 'grandparent', spouse: 'parent', child: 'sibling' },
  parent: { grandparent: 'parent', parent: 'spouse', sibling: 'child' },
  sibling: { grandparent: 'grandparent', parent: 'parent', sibling: 'sibling' },
  spouse: { child: 'child' },
}

export function roleForViewer(
  viewerRoleToInviter: InviteRole | 'member',
  otherRoleToInviter: InviteRole,
): InviteRole | null {
  if (viewerRoleToInviter === 'member') return null
  return VIEWER_ROLE_TABLE[viewerRoleToInviter]?.[otherRoleToInviter] ?? null
}

export function getReciprocalRole(role: InviteRole): InviteRole {
  switch (role) {
    case 'child':
      return 'parent'
    case 'parent':
      return 'child'
    case 'sibling':
      return 'sibling'
    case 'spouse':
      return 'spouse'
    case 'grandparent':
      return 'member'
    default:
      return 'member'
  }
}

export function subscribeTreeMembers(
  uid: string,
  onChange: (members: TreeMember[]) => void,
  onError?: (error: Error) => void,
) {
  let unsub1: (() => void) | null = null
  let unsub2: (() => void) | null = null
  let unsubUser: (() => void) | null = null
  let subscribedInviterUid: string | null = null

  let recs1: InvitationRecord[] = []
  let recs2: InvitationRecord[] = []
  let inviterMember: TreeMember | null = null
  let inviterRelation: InviteRole | 'member' = 'member'
  let claimedInviteToken: string | null = null

  function notify() {
    const keep = (r: InvitationRecord) =>
      r.joinedUid !== uid && r.id !== claimedInviteToken

    // people the viewer invited: roles are already relative to the viewer
    const own = recs1
      .filter(keep)
      .map(mapInvitationToTreeMember)
      .filter((m): m is TreeMember => m !== null)

    // people the inviter invited: re-map roles to the viewer's point of view
    const viaInviter = recs2
      .filter(keep)
      .map(mapInvitationToTreeMember)
      .filter((m): m is TreeMember => m !== null)
      .flatMap((m) => {
        const role = roleForViewer(inviterRelation, m.role)
        if (!role) return []
        let parentSlot = m.parentSlot
        if (
          inviterRelation === 'child' &&
          role === 'parent' &&
          !parentSlot &&
          inviterMember?.parentSlot &&
          inviterMember.parentSlot !== 'unknown'
        ) {
          parentSlot = inviterMember.parentSlot === 'father' ? 'mother' : 'father'
        }
        return [{ ...m, role, parentSlot, inviterCanEdit: false }]
      })

    const seen = new Set<string>()
    const allMembers = [
      ...(inviterMember ? [inviterMember] : []),
      ...own,
      ...viaInviter,
    ].filter((m) => {
      const key = m.joinedUid ?? m.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    void enrichClaimedMembers(allMembers).then(onChange)
  }

  unsub1 = subscribeSentInvitations(
    uid,
    (records) => {
      recs1 = records
      notify()
    },
    (err) => {
      console.warn('Error subscribing to sent invitations:', err)
      onError?.(err)
    },
  )

  async function syncInviterTree(
    invitedByUid: string,
    familyRole: InviteRole | 'member',
  ) {
    inviterRelation = familyRole
    setSelfOnTree()

    try {
      const inviterProfile = await fetchUserProfile(invitedByUid)
      if (inviterProfile) {
        const reciprocalRole = getReciprocalRole(familyRole)
        const nameFromProfile = [
          inviterProfile.firstName,
          inviterProfile.middleName,
          inviterProfile.lastName,
        ]
          .map((p) => (p || '').trim())
          .filter(Boolean)
          .join(' ')

        const inviterName =
          nameFromProfile ||
          (inviterProfile.email ? inviterProfile.email.split('@')[0] : 'Family member')

        inviterMember = {
          id: `inviter-${invitedByUid}`,
          firstName: inviterProfile.firstName || '',
          lastName: inviterProfile.lastName || '',
          displayName: inviterName,
          role: reciprocalRole,
          photoURL: inviterProfile.photoURL ?? null,
          memberStatus: 'living',
          inviteStatus: 'joined',
          joinedUid: invitedByUid,
          profileClaimed: true,
          inviterCanEdit: false,
          privacy: inviterProfile.profilePrivacy
            ? parseMemberPrivacy(inviterProfile.profilePrivacy)
            : DEFAULT_MEMBER_PRIVACY,
          bio: inviterProfile.bio?.trim() || '',
          parentSlot:
            reciprocalRole === 'parent' ? parentSlotFromGender(inviterProfile.gender) : null,
          parentKind: null,
          sharedFatherMemberId: null,
          sharedMotherMemberId: null,
          siblingRelationship: null,
          dateOfBirth: inviterProfile.dateOfBirth?.trim() || null,
          dateOfDeath: null,
          inviteeEmail: inviterProfile.email || null,
        }
        notify()
      }
    } catch (err) {
      console.warn('Error fetching inviter profile:', err)
    }

    if (subscribedInviterUid === invitedByUid) return
    unsub2?.()
    subscribedInviterUid = invitedByUid
    unsub2 = subscribeSentInvitations(
      invitedByUid,
      (records) => {
        recs2 = records
        notify()
      },
      (err) => {
        console.warn('Error subscribing to inviter invitations:', err)
        onError?.(err)
      },
    )
  }

  function clearInviterTree() {
    unsub2?.()
    unsub2 = null
    subscribedInviterUid = null
    inviterMember = null
    inviterRelation = 'member'
    recs2 = []
    notify()
  }

  unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        claimedInviteToken = null
        clearInviterTree()
        return
      }

      const data = snap.data()
      claimedInviteToken =
        (data.claimedInviteToken ? String(data.claimedInviteToken) : null) ||
        (data.inviteToken ? String(data.inviteToken) : null)

      const invitedByUid = data.invitedByUid ? String(data.invitedByUid) : null
      const familyRole = (data.familyRole as InviteRole | undefined) ?? 'member'

      if (invitedByUid && invitedByUid !== uid) {
        void syncInviterTree(invitedByUid, familyRole)
      } else {
        clearInviterTree()
      }
    },
    (err) => {
      console.warn('Error subscribing to user profile in subscribeTreeMembers:', err)
      onError?.(err)
    },
  )

  return () => {
    unsub1?.()
    unsub2?.()
    unsubUser?.()
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

export function positionLabel(role: string | null | undefined): string | null {
  if (
    role === 'spouse' ||
    role === 'parent' ||
    role === 'grandparent' ||
    role === 'child' ||
    role === 'sibling'
  ) {
    return roleLabel(role)
  }
  return null
}

function parentSlotFromGender(gender: string | null | undefined): ParentSlot | null {
  const value = gender?.trim().toLowerCase()
  if (value === 'male') return 'father'
  if (value === 'female') return 'mother'
  return null
}
