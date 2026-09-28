import type { InvitationRecord } from './invitations'

/** Invitee has accepted and owns their profile; inviter must not edit stub data. */
export function isProfileClaimed(record: Pick<InvitationRecord, 'status' | 'profileClaimed' | 'joinedUid'>): boolean {
  if (record.profileClaimed) return true
  return record.status === 'joined' && !!record.joinedUid
}

export function canInviterEditInvitation(
  record: Pick<InvitationRecord, 'status' | 'profileClaimed' | 'joinedUid' | 'memberStatus'>,
): boolean {
  if (record.memberStatus === 'deceased') return true
  return !isProfileClaimed(record)
}
