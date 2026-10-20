import type { InvitationRecord, InviteRole } from './invitations'
import type { TreeMember } from './familyTreeMembers'

/** Invitee has accepted and owns their profile; inviter must not edit stub data. */
export function isProfileClaimed(record: Pick<InvitationRecord, 'status' | 'profileClaimed' | 'joinedUid'>): boolean {
  if (record.profileClaimed) return true
  return record.status === 'joined' && !!record.joinedUid
}

/** Tree card / list — open claimed profile when they have joined DengiTree. */
export function isClaimedTreeMember(
  member: Pick<TreeMember, 'profileClaimed' | 'joinedUid' | 'inviteStatus'>,
): boolean {
  if (member.profileClaimed) return true
  if (member.joinedUid) return true
  return member.inviteStatus === 'joined'
}

const TREE_FAMILY_ROLES = new Set<InviteRole>([
  'spouse',
  'parent',
  'grandparent',
  'great-grandparent',
  'child',
  'sibling',
])

/** Invites to join DengiTree only — not a family-tree member stub. */
export function isPlatformShareInvite(
  record: Pick<InvitationRecord, 'role'>,
): boolean {
  return record.role === 'member'
}

export function canInviterEditInvitation(
  record: Pick<
    InvitationRecord,
    'status' | 'profileClaimed' | 'joinedUid' | 'memberStatus' | 'role'
  >,
): boolean {
  if (isPlatformShareInvite(record)) return false
  if (!TREE_FAMILY_ROLES.has(record.role)) return false
  if (isProfileClaimed(record)) return false
  return true
}

/** Inviter may remove this person from their tree (pending or claimed). */
export function canInviterRemoveFromTree(
  record: Pick<InvitationRecord, 'role'>,
): boolean {
  if (isPlatformShareInvite(record)) return false
  return TREE_FAMILY_ROLES.has(record.role)
}

/** True when the signed-in user may edit this member on the tree they are currently viewing. */
export function canViewerEditTreeMember(
  member: Pick<TreeMember, 'inviterCanEdit'>,
  viewerUid: string | null | undefined,
  treeOwnerUid: string | null | undefined,
): boolean {
  if (!viewerUid || !treeOwnerUid || viewerUid !== treeOwnerUid) return false
  return member.inviterCanEdit
}
