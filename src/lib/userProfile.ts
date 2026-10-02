import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { parseMemberPrivacy, type MemberPrivacy } from './memberPrivacy'

export type UserProfile = {
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone?: string
  photoURL?: string
  gender?: string
  dateOfBirth?: string
  bio?: string
  profilePrivacy?: MemberPrivacy
  defaultMemberPrivacy?: MemberPrivacy
  treeFatherMemberId?: string
  treeMotherMemberId?: string
  invitedByUid?: string
  familyRole?: string
  claimedInviteToken?: string
  inviteToken?: string
}

export function parseDisplayName(displayName: string | null | undefined): {
  firstName: string
  middleName: string
  lastName: string
} {
  const trimmed = displayName?.trim()
  if (!trimmed) {
    return { firstName: '', middleName: '', lastName: '' }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' }
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] }
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

export function profileFullName(profile: Pick<UserProfile, 'firstName' | 'middleName' | 'lastName'>) {
  return [profile.firstName, profile.middleName, profile.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

export function hasSavedProfileName(
  profile: Pick<UserProfile, 'firstName' | 'middleName' | 'lastName'>,
) {
  return Boolean(profile.firstName.trim() || profile.lastName.trim())
}

export function profileFirstName(displayName: string, fallback = 'You') {
  const trimmed = displayName.trim()
  if (!trimmed) return fallback
  return trimmed.split(/\s+/)[0] ?? fallback
}

export function profileFromAuthUser(user: {
  displayName: string | null
  email: string | null
}): UserProfile {
  const names = parseDisplayName(user.displayName)
  return {
    ...names,
    email: user.email?.trim() ?? '',
  }
}

export async function saveUserProfile(
  uid: string,
  profile: Partial<UserProfile>,
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (profile.firstName !== undefined) payload.firstName = profile.firstName
  if (profile.middleName !== undefined) payload.middleName = profile.middleName
  if (profile.lastName !== undefined) payload.lastName = profile.lastName
  if (profile.email !== undefined) payload.email = profile.email.toLowerCase()
  if (profile.phone !== undefined) payload.phone = profile.phone
  if (profile.photoURL !== undefined) payload.photoURL = profile.photoURL
  if (profile.gender !== undefined) payload.gender = profile.gender
  if (profile.dateOfBirth !== undefined) payload.dateOfBirth = profile.dateOfBirth
  if (profile.bio !== undefined) payload.bio = profile.bio.trim()
  if (profile.profilePrivacy !== undefined) payload.profilePrivacy = profile.profilePrivacy
  if (profile.defaultMemberPrivacy !== undefined) {
    payload.defaultMemberPrivacy = profile.defaultMemberPrivacy
  }
  if (profile.treeFatherMemberId !== undefined) {
    payload.treeFatherMemberId = profile.treeFatherMemberId
  }
  if (profile.treeMotherMemberId !== undefined) {
    payload.treeMotherMemberId = profile.treeMotherMemberId
  }

  await setDoc(doc(db, 'users', uid), payload, { merge: true })
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null

  const data = snap.data()
  return {
    firstName: String(data.firstName ?? ''),
    middleName: String(data.middleName ?? ''),
    lastName: String(data.lastName ?? ''),
    email: String(data.email ?? ''),
    phone: data.phone ? String(data.phone) : undefined,
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    gender: data.gender ? String(data.gender) : undefined,
    dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth) : undefined,
    bio: data.bio ? String(data.bio) : undefined,
    profilePrivacy: data.profilePrivacy
      ? parseMemberPrivacy(data.profilePrivacy)
      : undefined,
    defaultMemberPrivacy: data.defaultMemberPrivacy
      ? parseMemberPrivacy(data.defaultMemberPrivacy)
      : undefined,
    treeFatherMemberId: data.treeFatherMemberId
      ? String(data.treeFatherMemberId)
      : undefined,
    treeMotherMemberId: data.treeMotherMemberId
      ? String(data.treeMotherMemberId)
      : undefined,
    invitedByUid: data.invitedByUid ? String(data.invitedByUid) : undefined,
    familyRole: data.familyRole ? String(data.familyRole) : undefined,
    claimedInviteToken: data.claimedInviteToken
      ? String(data.claimedInviteToken)
      : undefined,
    inviteToken: data.inviteToken ? String(data.inviteToken) : undefined,
  }
}

export async function resolveUserProfileForForm(user: {
  uid: string
  displayName: string | null
  email: string | null
}): Promise<UserProfile> {
  const fromAuth = profileFromAuthUser(user)

  try {
    const stored = await fetchUserProfile(user.uid)
    if (!stored) return fromAuth

    return {
      firstName: stored.firstName || fromAuth.firstName,
      middleName: stored.middleName || fromAuth.middleName,
      lastName: stored.lastName || fromAuth.lastName,
      email: stored.email || fromAuth.email,
      phone: stored.phone,
      photoURL: stored.photoURL,
      gender: stored.gender,
      dateOfBirth: stored.dateOfBirth,
      bio: stored.bio,
      profilePrivacy: stored.profilePrivacy,
      defaultMemberPrivacy: stored.defaultMemberPrivacy,
      treeFatherMemberId: stored.treeFatherMemberId,
      treeMotherMemberId: stored.treeMotherMemberId,
      invitedByUid: stored.invitedByUid,
      familyRole: stored.familyRole,
      claimedInviteToken: stored.claimedInviteToken,
      inviteToken: stored.inviteToken,
    }
  } catch {
    return fromAuth
  }
}
