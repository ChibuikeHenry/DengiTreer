import { randomBytes } from 'crypto'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const db = getFirestore()
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app'

type InviteRole =
  | 'spouse'
  | 'parent'
  | 'grandparent'
  | 'great-grandparent'
  | 'child'
  | 'sibling'
  | 'member'

type MemberPrivacy =
  | 'family_members'
  | 'immediate_family'
  | 'only_me'
  | 'network'

const TREE_ROLES = new Set<InviteRole>([
  'spouse',
  'parent',
  'grandparent',
  'great-grandparent',
  'child',
  'sibling',
])

function newShareToken(): string {
  return randomBytes(9).toString('hex')
}

function parseMemberPrivacy(value: unknown): MemberPrivacy {
  const v = String(value ?? '').trim()
  if (
    v === 'family_members' ||
    v === 'immediate_family' ||
    v === 'only_me' ||
    v === 'network'
  ) {
    return v
  }
  return 'family_members'
}

function profileFullName(data: Record<string, unknown>): string {
  return [data.firstName, data.middleName, data.lastName]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

function redactForPublicShare(
  privacy: MemberPrivacy,
  fields: {
    displayName: string
    photoURL: string | null
    bio: string
    dateOfBirth: string | null
    dateOfDeath: string | null
  },
): typeof fields {
  if (privacy === 'only_me') {
    return {
      displayName: fields.displayName.trim() || 'Family member',
      photoURL: null,
      bio: '',
      dateOfBirth: null,
      dateOfDeath: null,
    }
  }
  return fields
}

type PublicTreeMember = {
  id: string
  firstName: string
  lastName: string
  displayName: string
  role: InviteRole
  memberStatus: 'living' | 'deceased'
  photoURL: string | null
  bio: string
  parentSlot: string | null
  parentKind: string | null
  lineageSide: string | null
  sharedFatherMemberId: string | null
  sharedMotherMemberId: string | null
  siblingRelationship: string | null
  dateOfBirth: string | null
  dateOfDeath: string | null
  gender: string | null
}

export type PublicTreeSnapshot = {
  token: string
  ownerUid: string
  ownerDisplayName: string
  enabled: boolean
  updatedAt: FirebaseFirestore.FieldValue
  center: {
    displayName: string
    photoURL: string | null
    bio: string
    gender: string | null
    dateOfBirth: string | null
    positionLabel: string | null
    treeFatherMemberId: string | null
    treeMotherMemberId: string | null
    selfMemberIds: string[]
  }
  members: PublicTreeMember[]
}

async function buildPublicTreeSnapshot(ownerUid: string): Promise<Omit<PublicTreeSnapshot, 'token' | 'enabled'>> {
  const userSnap = await db.collection('users').doc(ownerUid).get()
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Profile not found.')
  }
  const user = userSnap.data() ?? {}

  const centerPrivacy = parseMemberPrivacy(user.profilePrivacy ?? user.defaultMemberPrivacy)
  const centerName = profileFullName(user) || 'Family member'
  const centerRedacted = redactForPublicShare(centerPrivacy, {
    displayName: centerName,
    photoURL: String(user.photoURL ?? '').trim() || null,
    bio: String(user.bio ?? '').trim(),
    dateOfBirth: String(user.dateOfBirth ?? '').trim() || null,
    dateOfDeath: null,
  })

  const selfMemberIds = [
    String(user.claimedInviteToken ?? '').trim(),
    String(user.inviteToken ?? '').trim(),
  ].filter(Boolean)

  const invitesSnap = await db
    .collection('invitations')
    .where('inviterUid', '==', ownerUid)
    .get()

  const members: PublicTreeMember[] = []

  for (const doc of invitesSnap.docs) {
    const data = doc.data()
    const role = String(data.role ?? '') as InviteRole
    if (!TREE_ROLES.has(role)) continue

    const firstName = String(data.inviteeFirstName ?? '').trim()
    const lastName = String(data.inviteeLastName ?? '').trim()
    const inviteeName = String(data.inviteeName ?? '').trim()
    const displayName =
      inviteeName || [firstName, lastName].filter(Boolean).join(' ') || 'Family member'

    const privacy = parseMemberPrivacy(data.privacy)
    const redacted = redactForPublicShare(privacy, {
      displayName,
      photoURL: String(data.photoURL ?? '').trim() || null,
      bio: String(data.bio ?? '').trim(),
      dateOfBirth: String(data.dateOfBirth ?? '').trim() || null,
      dateOfDeath: String(data.dateOfDeath ?? '').trim() || null,
    })

    members.push({
      id: doc.id,
      firstName: firstName || displayName.split(/\s+/)[0] || '',
      lastName: lastName || displayName.split(/\s+/).slice(-1)[0] || '',
      displayName: redacted.displayName,
      role,
      memberStatus: data.memberStatus === 'deceased' ? 'deceased' : 'living',
      photoURL: redacted.photoURL,
      bio: redacted.bio,
      parentSlot: data.parentSlot ? String(data.parentSlot) : null,
      parentKind: data.parentKind ? String(data.parentKind) : null,
      lineageSide: data.lineageSide ? String(data.lineageSide) : null,
      sharedFatherMemberId: data.sharedFatherMemberId
        ? String(data.sharedFatherMemberId)
        : null,
      sharedMotherMemberId: data.sharedMotherMemberId
        ? String(data.sharedMotherMemberId)
        : null,
      siblingRelationship: data.siblingRelationship
        ? String(data.siblingRelationship)
        : null,
      dateOfBirth: redacted.dateOfBirth,
      dateOfDeath: redacted.dateOfDeath,
      gender: data.gender ? String(data.gender) : null,
    })
  }

  const familyRole = String(user.familyRole ?? '').trim()
  const positionLabel =
    familyRole && familyRole !== 'member'
      ? familyRole.charAt(0).toUpperCase() + familyRole.slice(1).replace(/-/g, ' ')
      : null

  return {
    ownerUid,
    ownerDisplayName: centerName,
    updatedAt: FieldValue.serverTimestamp(),
    center: {
      displayName: centerRedacted.displayName,
      photoURL: centerRedacted.photoURL,
      bio: centerRedacted.bio,
      gender: String(user.gender ?? '').trim() || null,
      dateOfBirth: centerRedacted.dateOfBirth,
      positionLabel,
      treeFatherMemberId: String(user.treeFatherMemberId ?? '').trim() || null,
      treeMotherMemberId: String(user.treeMotherMemberId ?? '').trim() || null,
      selfMemberIds: [...new Set(selfMemberIds)],
    },
    members,
  }
}

export const ensureTreeShareLink = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to share your tree.')
  }

  const uid = request.auth.uid
  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Profile not found.')
  }

  const existingToken = String(userSnap.data()?.treeShareToken ?? '').trim()
  let token = existingToken

  if (!token) {
    token = newShareToken()
    await userRef.set({ treeShareToken: token }, { merge: true })
  }

  const snapshot = await buildPublicTreeSnapshot(uid)
  const shareRef = db.collection('treePublicShares').doc(token)

  await shareRef.set({
    ...snapshot,
    token,
    enabled: true,
  })

  const viewUrl = `${APP_ORIGIN.replace(/\/$/, '')}/tree/${token}`

  return {
    token,
    viewUrl,
    ownerDisplayName: snapshot.ownerDisplayName,
  }
})

export const disableTreeShareLink = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to manage your share link.')
  }

  const uid = request.auth.uid
  const userSnap = await db.collection('users').doc(uid).get()
  const token = String(userSnap.data()?.treeShareToken ?? '').trim()
  if (!token) {
    return { ok: true }
  }

  const shareRef = db.collection('treePublicShares').doc(token)
  const shareSnap = await shareRef.get()
  if (shareSnap.exists && shareSnap.data()?.ownerUid === uid) {
    await shareRef.set({ enabled: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  }

  return { ok: true }
})
