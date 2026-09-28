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

export type InviteRole = 'spouse' | 'parent' | 'child' | 'sibling' | 'member'

export type FamilyMemberInviteInput = {
  role: InviteRole
  firstName: string
  middleName?: string
  lastName: string
  inviteeEmail?: string
  memberStatus: 'living' | 'deceased'
  personalMessage?: string
  photoURL?: string
}

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

const updatePendingFamilyMemberProfileFn = httpsCallable<
  {
    token: string
    firstName: string
    middleName?: string
    lastName: string
    photoURL?: string | null
  },
  { ok: boolean }
>(functions, 'updatePendingFamilyMemberProfile')

export function inviteTokenStorageKey() {
  return 'dengitree-invite-token'
}

export function persistInviteToken(token: string) {
  try {
    sessionStorage.setItem(inviteTokenStorageKey(), token)
  } catch {
    /* ignore */
  }
}

export function readPersistedInviteToken(): string | null {
  try {
    return sessionStorage.getItem(inviteTokenStorageKey())
  } catch {
    return null
  }
}

export function clearPersistedInviteToken() {
  try {
    sessionStorage.removeItem(inviteTokenStorageKey())
  } catch {
    /* ignore */
  }
}

export async function sendFamilyMemberInvite(input: FamilyMemberInviteInput) {
  const result = await createFamilyMemberInviteFn(input)
  return result.data
}

export async function createShareInviteLink(personalMessage?: string) {
  const result = await createShareInviteFn({ personalMessage })
  return result.data
}

export async function fetchInvitationPreview(token: string) {
  const result = await getInvitationByTokenFn({ token })
  return result.data
}

export async function acceptInvitation(token: string) {
  const result = await acceptInvitationFn({ token })
  return result.data
}

export async function updatePendingFamilyMemberProfile(input: {
  token: string
  firstName: string
  middleName?: string
  lastName: string
  photoURL?: string | null
}) {
  const result = await updatePendingFamilyMemberProfileFn(input)
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
    createdAt: timestampToDate(data.createdAt as Timestamp | undefined),
  }
}

export async function acceptPersistedInvitationIfAny() {
  const token = readPersistedInviteToken()
  if (!token) return null
  const data = await acceptInvitation(token)
  clearPersistedInviteToken()

  const { auth } = await import('./firebase')
  const { fetchUserProfile } = await import('./userProfile')
  const { updateProfile } = await import('firebase/auth')

  if (auth.currentUser) {
    const profile = await fetchUserProfile(auth.currentUser.uid)
    if (profile) {
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

  return data
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
