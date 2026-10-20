import type { FamilyMemberInviteInput, InviteRole } from './invitations'

export type MergeFlowDraft = {
  invite: FamilyMemberInviteInput
  target: {
    email: string
    inviteeUid: string
    displayName: string
    memberCount: number
  }
  requester: {
    displayName: string
    memberCount: number
  }
  mergeMessage?: string
  invitationToken?: string
}

const KEY = 'dengitree-merge-flow-draft'

export function saveMergeFlowDraft(draft: MergeFlowDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function readMergeFlowDraft(): MergeFlowDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as MergeFlowDraft
  } catch {
    return null
  }
}

export function clearMergeFlowDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

export type MergeCheckResult = {
  shouldMerge: true
  email: string
  inviteeUid: string
  inviteeDisplayName: string
  inviteeMemberCount: number
  requesterDisplayName: string
  requesterMemberCount: number
  notice?: string | null
}

export function startMergeFlowFromCheck(
  invite: FamilyMemberInviteInput & { role: InviteRole },
  check: MergeCheckResult,
) {
  saveMergeFlowDraft({
    invite,
    target: {
      email: check.email,
      inviteeUid: check.inviteeUid,
      displayName: check.inviteeDisplayName,
      memberCount: check.inviteeMemberCount,
    },
    requester: {
      displayName: check.requesterDisplayName,
      memberCount: check.requesterMemberCount,
    },
  })
}
