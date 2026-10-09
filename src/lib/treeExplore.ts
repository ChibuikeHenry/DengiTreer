import type { TreeMember } from './familyTreeMembers'
import { fetchUserProfile } from './userProfile'

/** UID of the account whose tree should load when exploring this node. */
export function getMemberExploreRootUid(member: TreeMember): string | null {
  if (member.joinedUid) return member.joinedUid
  if (member.id.startsWith('inviter-')) {
    return member.id.slice('inviter-'.length) || null
  }
  return null
}

export type ExploreAccessReason =
  | 'inviter'
  | 'invitee'
  | 'self'
  | 'none'

export async function resolveExploreAccess(
  viewerUid: string,
  member: TreeMember,
  viewerInvitedByUid: string | null,
): Promise<{ allowed: boolean; rootUid: string | null; reason: ExploreAccessReason }> {
  const rootUid = getMemberExploreRootUid(member)
  if (!rootUid) {
    return { allowed: false, rootUid: null, reason: 'none' }
  }
  if (rootUid === viewerUid) {
    return { allowed: false, rootUid, reason: 'self' }
  }
  if (viewerInvitedByUid && rootUid === viewerInvitedByUid) {
    return { allowed: true, rootUid, reason: 'inviter' }
  }

  try {
    const profile = await fetchUserProfile(rootUid)
    if (profile?.invitedByUid === viewerUid) {
      return { allowed: true, rootUid, reason: 'invitee' }
    }
  } catch {
    /* ignore */
  }

  return { allowed: false, rootUid, reason: 'none' }
}

export function exploreAccessHint(reason: ExploreAccessReason): string {
  switch (reason) {
    case 'inviter':
      return 'View their branch of your extended family.'
    case 'invitee':
      return 'View the tree they are building from their perspective.'
    default:
      return ''
  }
}
