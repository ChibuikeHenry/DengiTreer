import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import type { MemberPrivacy } from './memberPrivacy'
import { parseMemberPrivacy } from './memberPrivacy'
import {
  parseParentKind,
  parseParentSlot,
  type ParentKind,
  type ParentSlot,
  type SiblingRelationship,
} from './siblingRelationship'

export type InviteRole =
  | 'spouse'
  | 'parent'
  | 'grandparent'
  | 'great-grandparent'
  | 'child'
  | 'sibling'
  | 'member'

/** Blank or invalid addresses become undefined so the backend never queues mail. */
export function normalizeInviteeEmail(raw: unknown): string | undefined {
  const trimmed = String(raw ?? '').trim().toLowerCase()
  if (!trimmed) return undefined
  const at = trimmed.indexOf('@')
  if (at <= 0 || at >= trimmed.length - 1) return undefined
  const domain = trimmed.slice(at + 1)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return undefined
  return trimmed
}

export type FamilyMemberInviteInput = {
  role: InviteRole
  firstName: string
  middleName?: string
  lastName: string
  inviteeEmail?: string
  memberStatus: 'living' | 'deceased'
  personalMessage?: string
  photoURL?: string
  privacy?: MemberPrivacy
  bio?: string
  parentSlot?: ParentSlot
  parentKind?: ParentKind
  /** Grandparents: which of your parents they belong to (paternal = father's side). */
  lineageSide?: LineageSide
  sharedFatherMemberId?: string
  sharedMotherMemberId?: string
  siblingRelationship?: SiblingRelationship
  dateOfBirth?: string
  dateOfDeath?: string
  gender?: string
}

export type LineageSide = 'paternal' | 'maternal'

export type InvitationRecord = {
  id: string
  token: string
  inviteeName: string | null
  inviteeFirstName: string | null
  inviteeLastName: string | null
  inviteeEmail: string | null
  role: InviteRole
  status: 'pending' | 'joined'
  memberStatus: 'living' | 'deceased'
  photoURL: string | null
  joinedUid: string | null
  profileClaimed: boolean
  privacy: MemberPrivacy
  bio: string
  parentSlot: ParentSlot | null
  parentKind: ParentKind | null
  lineageSide: LineageSide | null
  sharedFatherMemberId: string | null
  sharedMotherMemberId: string | null
  siblingRelationship: SiblingRelationship | null
  dateOfBirth: string | null
  dateOfDeath: string | null
  gender: string | null
  createdAt: Date | null
}

const createFamilyMemberInviteFn = httpsCallable<
  FamilyMemberInviteInput,
  { token: string; joinUrl: string }
>(functions, 'createFamilyMemberInvite')

const createShareInviteFn = httpsCallable<
  { personalMessage?: string },
  { token: string; joinUrl: string }
>(functions, 'createShareInvite')

const sendShareInviteEmailFn = httpsCallable<
  {
    token: string
    inviteeName: string
    inviteeEmail: string
    personalMessage: string
  },
  { ok: boolean }
>(functions, 'sendShareInviteEmail')

const getInvitationByTokenFn = httpsCallable<
  { token: string },
  {
    token: string
    inviteeName: string | null
    inviteeEmail: string | null
    role: InviteRole
    roleLabel: string
    inviterName: string
    personalMessage: string | null
  }
>(functions, 'getInvitationByToken')

const acceptInvitationFn = httpsCallable<
  { token: string },
  { ok: boolean; role: InviteRole; roleLabel: string; profileClaimed?: boolean }
>(functions, 'acceptInvitation')

const updateFamilyMemberPrivacyFn = httpsCallable<
  { token: string; privacy: MemberPrivacy },
  { ok: boolean }
>(functions, 'updateFamilyMemberPrivacy')

const updatePendingFamilyMemberProfileFn = httpsCallable<
  {
    token: string
    firstName: string
    middleName?: string
    lastName: string
    photoURL?: string | null
    bio?: string
    dateOfBirth?: string | null
    dateOfDeath?: string | null
    memberStatus?: 'living' | 'deceased'
    privacy?: MemberPrivacy
    parentKind?: ParentKind
    parentSlot?: ParentSlot
    inviteeEmail?: string | null
    gender?: string | null
    sharedFatherMemberId?: string | null
    sharedMotherMemberId?: string | null
  },
  { ok: boolean }
>(functions, 'updatePendingFamilyMemberProfile')

const claimPendingInvitationsForEmailFn = httpsCallable<
  void,
  { claimedCount: number }
>(functions, 'claimPendingInvitationsForEmail')

export function inviteTokenStorageKey() {
  return 'dengitree-invite-token'
}

export function persistInviteToken(token: string) {
  try {
    localStorage.setItem(inviteTokenStorageKey(), token)
  } catch {
    /* ignore */
  }
}

export function readPersistedInviteToken(): string | null {
  try {
    return (
      localStorage.getItem(inviteTokenStorageKey()) ??
      sessionStorage.getItem(inviteTokenStorageKey())
    )
  } catch {
    return null
  }
}

export function clearPersistedInviteToken() {
  try {
    localStorage.removeItem(inviteTokenStorageKey())
    sessionStorage.removeItem(inviteTokenStorageKey())
  } catch {
    /* ignore */
  }
}

export async function sendFamilyMemberInvite(input: FamilyMemberInviteInput) {
  const inviteeEmail = normalizeInviteeEmail(input.inviteeEmail)
  const payload: FamilyMemberInviteInput = { ...input }
  if (inviteeEmail) payload.inviteeEmail = inviteeEmail
  else delete payload.inviteeEmail
  const result = await createFamilyMemberInviteFn(payload)
  return result.data
}

export async function createShareInviteLink(personalMessage?: string) {
  const result = await createShareInviteFn({ personalMessage })
  return result.data
}

export async function sendShareInviteEmail(input: {
  token: string
  inviteeName: string
  inviteeEmail: string
  personalMessage: string
}) {
  const inviteeEmail = normalizeInviteeEmail(input.inviteeEmail)
  if (!inviteeEmail) {
    throw new Error('Enter a valid email address.')
  }
  const result = await sendShareInviteEmailFn({ ...input, inviteeEmail })
  return result.data
}

export function defaultShareInviteMessage(options: {
  inviteeFirstName: string
  inviterName: string
  joinUrl: string
}) {
  const name = options.inviteeFirstName.trim() || 'there'
  const inviter = options.inviterName.trim() || 'Someone'
  return `Hi ${name}, ${inviter} is inviting you to join DengiTree. click on this link : ${options.joinUrl} to join DengiTree.`
}

export async function fetchInvitationPreview(token: string) {
  const result = await getInvitationByTokenFn({ token })
  return result.data
}

export async function acceptInvitation(token: string) {
  const result = await acceptInvitationFn({ token })
  return result.data
}

export async function updateFamilyMemberPrivacy(token: string, privacy: MemberPrivacy) {
  const result = await updateFamilyMemberPrivacyFn({ token, privacy })
  return result.data
}

export async function updatePendingFamilyMemberProfile(input: {
  token: string
  firstName: string
  middleName?: string
  lastName: string
  photoURL?: string | null
  bio?: string
  dateOfBirth?: string | null
  dateOfDeath?: string | null
  memberStatus?: 'living' | 'deceased'
  privacy?: MemberPrivacy
  parentKind?: ParentKind
  parentSlot?: ParentSlot
  inviteeEmail?: string | null
  gender?: string | null
  sharedFatherMemberId?: string | null
  sharedMotherMemberId?: string | null
}) {
  const payload = { ...input }
  if (input.inviteeEmail !== undefined) {
    payload.inviteeEmail = normalizeInviteeEmail(input.inviteeEmail) ?? null
  }
  if (input.sharedFatherMemberId !== undefined) {
    payload.sharedFatherMemberId = input.sharedFatherMemberId?.trim() || null
  }
  if (input.sharedMotherMemberId !== undefined) {
    payload.sharedMotherMemberId = input.sharedMotherMemberId?.trim() || null
  }
  const result = await updatePendingFamilyMemberProfileFn(payload)
  return result.data
}

export async function claimPendingInvitationsForEmail() {
  const result = await claimPendingInvitationsForEmailFn()
  return result.data
}

function mapInvitationDoc(docSnap: { id: string; data: () => Record<string, unknown> }): InvitationRecord {
  const data = docSnap.data()
  const joinedUid = (data.joinedUid as string | null | undefined) ?? null
  const profileClaimed =
    data.profileClaimed === true || (data.status === 'joined' && !!joinedUid)

  return {
    id: docSnap.id,
    token: String(data.token ?? docSnap.id),
    inviteeName: (data.inviteeName as string | null) ?? null,
    inviteeFirstName: (data.inviteeFirstName as string | null) ?? null,
    inviteeLastName: (data.inviteeLastName as string | null) ?? null,
    inviteeEmail: (data.inviteeEmail as string | null) ?? null,
    role: (data.role as InviteRole) ?? 'member',
    status: (data.status as 'pending' | 'joined') ?? 'pending',
    memberStatus: (data.memberStatus === 'deceased' ? 'deceased' : 'living') as
      | 'living'
      | 'deceased',
    photoURL: (data.photoURL as string | null) ?? null,
    joinedUid,
    profileClaimed,
    privacy: parseMemberPrivacy(data.privacy),
    bio: String(data.bio ?? '').trim(),
    parentSlot: data.parentSlot ? parseParentSlot(data.parentSlot) : null,
    parentKind: data.parentKind ? parseParentKind(data.parentKind) : null,
    lineageSide:
      data.lineageSide === 'paternal' || data.lineageSide === 'maternal'
        ? data.lineageSide
        : null,
    sharedFatherMemberId: (data.sharedFatherMemberId as string | null) ?? null,
    sharedMotherMemberId: (data.sharedMotherMemberId as string | null) ?? null,
    siblingRelationship: (data.siblingRelationship as SiblingRelationship | null) ?? null,
    dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth) : null,
    dateOfDeath: data.dateOfDeath ? String(data.dateOfDeath) : null,
    gender: (data.gender as string | null) ?? null,
    createdAt: timestampToDate(data.createdAt as Timestamp | undefined),
  }
}

export async function acceptPersistedInvitationIfAny(): Promise<{
  linkedToTree: boolean
  acceptError: string | null
}> {
  const { setSelfOnTree } = await import('./treeStorage')
  const { auth } = await import('./firebase')
  let linkedToTree = false
  let acceptError: string | null = null

  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true)
  }

  const token = readPersistedInviteToken()
  console.log('[invite] token in storage:', token)

  if (token) {
    try {
      await acceptInvitation(token)
      console.log('[invite] accepted')
      setSelfOnTree()
      linkedToTree = true
      clearPersistedInviteToken()
    } catch (err) {
      console.error('[invite] accept failed', err)
      acceptError = getCallableErrorMessage(err)
      const code = (err as { code?: string })?.code
      if (code === 'functions/not-found' || code === 'functions/already-exists') {
        clearPersistedInviteToken()
      }
    }
  }

  try {
    const claimedRes = await claimPendingInvitationsForEmail()
    console.log('[invite] claimed by email:', claimedRes)
    if (claimedRes && claimedRes.claimedCount > 0) {
      setSelfOnTree()
      linkedToTree = true
    }
  } catch (err) {
    console.error('[invite] claim failed', err)
  }

  const { fetchUserProfile } = await import('./userProfile')
  const { updateProfile } = await import('firebase/auth')

  if (auth.currentUser) {
    const profile = await fetchUserProfile(auth.currentUser.uid)
    if (profile) {
      if (profile.invitedByUid) {
        setSelfOnTree()
        linkedToTree = true
      }
      const displayName = [profile.firstName, profile.middleName, profile.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ')
      await updateProfile(auth.currentUser, {
        photoURL: profile.photoURL ?? auth.currentUser.photoURL,
        ...(displayName ? { displayName } : {}),
      })
    }
  }

  return { linkedToTree, acceptError }
}

function timestampToDate(value: Timestamp | null | undefined): Date | null {
  if (!value || typeof value.toDate !== 'function') return null
  return value.toDate()
}

export function subscribeSentInvitations(
  uid: string,
  onChange: (items: InvitationRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(
    collection(db, 'invitations'),
    where('inviterUid', '==', uid),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapInvitationDoc(docSnap))
      onChange(items)
    },
    (error) => onError?.(error),
  )
}

export function subscribeReceivedInvitations(
  email: string,
  onChange: (items: InvitationRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    onChange([])
    return () => {}
  }

  const q = query(
    collection(db, 'invitations'),
    where('inviteeEmail', '==', normalized),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapInvitationDoc(docSnap))
      onChange(items)
    },
    (error) => onError?.(error),
  )
}

export function formatInviteDate(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function inviteRoleLabel(role: InviteRole): string {
  switch (role) {
    case 'spouse':
      return 'Spouse'
    case 'parent':
      return 'Parent'
    case 'grandparent':
      return 'Grandparent'
    case 'great-grandparent':
      return 'Great-grandparent'
    case 'child':
      return 'Child'
    case 'sibling':
      return 'Sibling'
    default:
      return 'Family Member'
  }
}

export function getCallableErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: string }).code)
    if (code === 'functions/unavailable') {
      return 'Invitation service is not available yet. Deploy Cloud Functions and try again.'
    }
    if ('message' in error && typeof (error as { message: string }).message === 'string') {
      return (error as { message: string }).message
    }
  }
  if (error instanceof Error && error.message) return error.message
  return 'Could not send invitation. Please try again.'
}
