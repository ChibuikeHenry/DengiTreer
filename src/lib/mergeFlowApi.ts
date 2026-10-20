import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { FamilyMemberInviteInput } from './invitations'

const checkInviteeEmailForMergeFn = httpsCallable<
  { email: string },
  | { shouldMerge: false; notice?: string | null }
  | {
      shouldMerge: true
      email: string
      inviteeUid: string
      inviteeDisplayName: string
      inviteeMemberCount: number
      requesterDisplayName: string
      requesterMemberCount: number
      notice?: string | null
    }
>(functions, 'checkInviteeEmailForMerge')

const submitTreeMergeRequestFn = httpsCallable<
  FamilyMemberInviteInput & { mergeMessage?: string },
  { ok: boolean; token: string; joinUrl: string }
>(functions, 'submitTreeMergeRequest')

const getTreeMergeRequestFn = httpsCallable<
  { token: string },
  {
    token: string
    status: string
    inviterUid: string
    inviteeUid: string
    inviteeEmail: string | null
    inviterName: string
    inviteeName: string
    mergeMessage: string | null
    requesterMemberCount: number
    inviteeMemberCount: number
    roleLabel: string
  }
>(functions, 'getTreeMergeRequest')

const getMergeRequesterFamilyFn = httpsCallable<
  { token: string },
  {
    requesterName: string
    requesterPhotoURL: string | null
    members: { id: string; displayName: string; role: string; gender: string | null }[]
  }
>(functions, 'getMergeRequesterFamily')

export async function checkInviteeEmailForMerge(email: string) {
  const result = await checkInviteeEmailForMergeFn({ email: email.trim().toLowerCase() })
  return result.data
}

export async function submitTreeMergeRequest(
  payload: FamilyMemberInviteInput & { mergeMessage?: string },
) {
  const result = await submitTreeMergeRequestFn(payload)
  return result.data
}

export async function fetchTreeMergeRequest(token: string) {
  const result = await getTreeMergeRequestFn({ token })
  return result.data
}

export async function fetchMergeRequesterFamily(token: string) {
  const result = await getMergeRequesterFamilyFn({ token })
  return result.data
}
