import { randomBytes } from 'crypto'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase-admin/app'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'us-central1' })

const db = getFirestore()
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app'

type InviteRole = 'spouse' | 'parent' | 'grandparent' | 'great-grandparent' | 'child' | 'sibling' | 'member'

type MemberPrivacy =
  | 'family_members'
  | 'immediate_family'
  | 'only_me'
  | 'network'

type ParentKind = 'biological' | 'step' | 'adoptive'
type ParentSlot = 'father' | 'mother' | 'unknown'
type SiblingRelationship =
  | 'brother'
  | 'sister'
  | 'half-brother'
  | 'half-sister'
  | 'step-brother'
  | 'step-sister'
  | 'sibling'

function parseParentKind(value: unknown): ParentKind {
  const v = String(value ?? '').trim()
  if (v === 'step' || v === 'adoptive' || v === 'biological') return v
  return 'biological'
}

function isPrimaryParentKind(kind: ParentKind): boolean {
  return kind !== 'step'
}

function primaryParentSlotTaken(
  members: FirebaseFirestore.QueryDocumentSnapshot[],
  slot: ParentSlot,
  exceptToken?: string,
): boolean {
  if (!slot || slot === 'unknown') return false
  return members.some((doc) => {
    if (exceptToken && doc.id === exceptToken) return false
    const data = doc.data()
    if (data.role !== 'parent') return false
    const memberSlot = parseParentSlot(data.parentSlot)
    const memberKind = parseParentKind(data.parentKind)
    return memberSlot === slot && isPrimaryParentKind(memberKind)
  })
}

function primaryParentSlotError(slot: ParentSlot): string {
  if (slot === 'father') {
    return 'You already have a father on your tree. Add a step-father instead, or edit the existing person.'
  }
  if (slot === 'mother') {
    return 'You already have a mother on your tree. Add a step-mother instead, or edit the existing person.'
  }
  return 'That parent slot is already filled on your tree.'
}

function grandparentSlotsConflict(
  aSide: LineageSide | null,
  aSlot: ParentSlot | null,
  bSide: LineageSide | null,
  bSlot: ParentSlot | null,
): boolean {
  if (!aSlot || !bSlot || aSlot === 'unknown' || bSlot === 'unknown') return false
  if (aSlot !== bSlot) return false
  if (aSide === bSide) return true
  if (aSide === null || bSide === null) return true
  return false
}

function grandparentSlotTaken(
  members: FirebaseFirestore.QueryDocumentSnapshot[],
  lineageSide: LineageSide | null,
  parentSlot: ParentSlot | null,
  exceptToken?: string,
): boolean {
  if (!parentSlot || parentSlot === 'unknown') return false
  return members.some((doc) => {
    if (exceptToken && doc.id === exceptToken) return false
    const data = doc.data()
    if (data.role !== 'grandparent') return false
    if (parseParentKind(data.parentKind) === 'step') return false
    return grandparentSlotsConflict(
      lineageSide,
      parentSlot,
      parseLineageSide(data.lineageSide),
      parseParentSlot(data.parentSlot),
    )
  })
}

function grandparentSlotError(
  lineageSide: LineageSide | null,
  parentSlot: ParentSlot,
): string {
  const side =
    lineageSide === 'maternal'
      ? "Mother's"
      : lineageSide === 'paternal'
        ? "Father's"
        : ''
  const rel = parentSlot === 'father' ? 'father' : 'mother'
  const label = side ? `${side} ${rel}` : `Grand${rel === 'father' ? 'father' : 'mother'}`
  return `You already have ${label} on your tree. Edit the existing person instead of adding another.`
}

type LineageSide = 'paternal' | 'maternal'

function parseLineageSide(value: unknown): LineageSide | null {
  const v = String(value ?? '').trim()
  if (v === 'paternal' || v === 'maternal') return v
  return null
}

function parseParentSlot(value: unknown): ParentSlot | null {
  const v = String(value ?? '').trim()
  if (v === 'father' || v === 'mother' || v === 'unknown') return v
  return null
}

const MEMBER_PRIVACY_VALUES = new Set<MemberPrivacy>([
  'family_members',
  'immediate_family',
  'only_me',
  'network',
])

function parseMemberPrivacy(value: unknown): MemberPrivacy {
  const normalized = String(value ?? '').trim() as MemberPrivacy
  return MEMBER_PRIVACY_VALUES.has(normalized) ? normalized : 'family_members'
}

function roleLabel(role: InviteRole): string {
  const map: Record<InviteRole, string> = {
    spouse: 'Spouse',
    parent: 'Parent',
    grandparent: 'Grandparent',
    'great-grandparent': 'Great-grandparent',
    child: 'Child',
    sibling: 'Sibling',
    member: 'Family Member',
  }
  return map[role] ?? 'Family Member'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function newToken(): string {
  return randomBytes(6).toString('hex')
}

/** Returns a normalized email or null when blank / not a plausible address. */
function normalizeInviteeEmail(raw: unknown): string | null {
  const trimmed = String(raw ?? '').trim().toLowerCase()
  if (!trimmed) return null
  const at = trimmed.indexOf('@')
  if (at <= 0 || at >= trimmed.length - 1) return null
  const domain = trimmed.slice(at + 1)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null
  return trimmed
}

async function queueInviteEmail(options: {
  to: string
  inviterName: string
  inviteeFirstName: string
  role: InviteRole
  joinUrl: string
  personalMessage?: string | null
}) {
  const recipient = normalizeInviteeEmail(options.to)
  if (!recipient) return

  const roleText = roleLabel(options.role)
  const greeting = options.inviteeFirstName
    ? escapeHtml(options.inviteeFirstName)
    : 'there'
  const extra = options.personalMessage
    ? `<p><em>${escapeHtml(options.personalMessage)}</em></p>`
    : ''

  await db.collection('mail').add({
    to: recipient,
    message: {
      subject: `${options.inviterName} invited you to DengiTree as their ${roleText}`,
      html: `
        <p>Hi ${greeting},</p>
        <p><strong>${escapeHtml(options.inviterName)}</strong> added you to their family tree on DengiTree as their <strong>${roleText}</strong>.</p>
        ${extra}
        <p><a href="${options.joinUrl}">Accept invitation and join DengiTree</a></p>
        <p>If the button does not work, copy this link:<br>${options.joinUrl}</p>
        <p>— DengiTree</p>
      `.trim(),
    },
  })
}

async function queueShareInviteEmail(options: {
  to: string
  inviterName: string
  personalMessage: string
  joinUrl: string
}) {
  const recipient = normalizeInviteeEmail(options.to)
  if (!recipient) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.')
  }

  const bodyHtml = escapeHtml(options.personalMessage).replace(/\n/g, '<br>')

  await db.collection('mail').add({
    to: recipient,
    message: {
      subject: `${options.inviterName} invited you to join DengiTree`,
      html: `
        <p>${bodyHtml}</p>
        <p><a href="${options.joinUrl}">Join DengiTree</a></p>
        <p>If the button does not work, copy this link:<br>${options.joinUrl}</p>
        <p>— DengiTree</p>
      `.trim(),
    },
  })
}

type CreateInviteInput = {
  role: InviteRole
  firstName?: string
  middleName?: string
  lastName?: string
  inviteeEmail?: string
  memberStatus?: 'living' | 'deceased'
  personalMessage?: string
  photoURL?: string
  privacy?: MemberPrivacy
  bio?: string
  parentSlot?: ParentSlot
  parentKind?: ParentKind
  lineageSide?: string
  sharedFatherMemberId?: string
  sharedMotherMemberId?: string
  siblingRelationship?: SiblingRelationship
  dateOfBirth?: string
  dateOfDeath?: string
  gender?: string
}

async function createInvitationRecord(
  uid: string,
  authToken: Record<string, unknown>,
  data: CreateInviteInput,
) {
  const role = data.role
  if (
    !role ||
    !['spouse', 'parent', 'grandparent', 'great-grandparent', 'child', 'sibling', 'member'].includes(role)
  ) {
    throw new HttpsError('invalid-argument', 'Invalid invitation role.')
  }

  const firstName = String(data.firstName ?? '').trim()
  const lastName = String(data.lastName ?? '').trim()
  const middleName = String(data.middleName ?? '').trim()
  const inviteeName = [firstName, middleName, lastName].filter(Boolean).join(' ')
  const memberStatus = data.memberStatus === 'deceased' ? 'deceased' : 'living'
  const inviteeEmail = normalizeInviteeEmail(data.inviteeEmail)
  const privacy = parseMemberPrivacy(data.privacy)
  const bio = String(data.bio ?? '').trim()
  const dateOfBirth = String(data.dateOfBirth ?? '').trim() || null
  const dateOfDeath = String(data.dateOfDeath ?? '').trim() || null
  const parentSlot =
    role === 'parent' || role === 'grandparent' || role === 'great-grandparent'
      ? parseParentSlot(data.parentSlot)
      : null
  const parentKind = role === 'parent' ? parseParentKind(data.parentKind) : null
  const lineageSide =
    role === 'grandparent' || role === 'great-grandparent'
      ? parseLineageSide(data.lineageSide)
      : null
  const sharedFatherMemberId =
    role === 'sibling' || role === 'child'
      ? String(data.sharedFatherMemberId ?? '').trim() || null
      : null
  const sharedMotherMemberId =
    role === 'sibling' || role === 'child'
      ? String(data.sharedMotherMemberId ?? '').trim() || null
      : null
  const siblingRelationship =
    role === 'sibling' && data.siblingRelationship
      ? (String(data.siblingRelationship).trim() as SiblingRelationship)
      : null

  const inviterName =
    (typeof authToken.name === 'string' && authToken.name) ||
    (typeof authToken.email === 'string' && authToken.email) ||
    'A family member'

  const token = newToken()
  const joinUrl = `${APP_ORIGIN}/join/${token}`

  const invitationPayload = {
    token,
    inviterUid: uid,
    inviterName,
    inviterEmail:
      typeof authToken.email === 'string' ? authToken.email.toLowerCase() : null,
    inviteeEmail: inviteeEmail || null,
    inviteeName: inviteeName || null,
    inviteeFirstName: firstName || null,
    inviteeMiddleName: middleName || null,
    inviteeLastName: lastName || null,
    role,
    status: 'pending',
    memberStatus,
    personalMessage: data.personalMessage?.trim() || null,
    photoURL: data.photoURL?.trim() || null,
    privacy,
    bio: bio || null,
    parentSlot,
    parentKind,
    lineageSide,
    sharedFatherMemberId,
    sharedMotherMemberId,
    siblingRelationship,
    dateOfBirth,
    dateOfDeath,
    gender: String(data.gender ?? '').trim() || null,
    createdAt: FieldValue.serverTimestamp(),
    joinedAt: null,
    joinedUid: null,
  }

  if (
    role === 'parent' &&
    parentSlot &&
    parentSlot !== 'unknown' &&
    parentKind &&
    isPrimaryParentKind(parentKind)
  ) {
    const existingParents = await db
      .collection('users')
      .doc(uid)
      .collection('familyMembers')
      .where('role', '==', 'parent')
      .get()
    if (primaryParentSlotTaken(existingParents.docs, parentSlot)) {
      throw new HttpsError('failed-precondition', primaryParentSlotError(parentSlot))
    }
  }

  if (role === 'grandparent' && parentSlot && parentSlot !== 'unknown') {
    const existingGrandparents = await db
      .collection('users')
      .doc(uid)
      .collection('familyMembers')
      .where('role', '==', 'grandparent')
      .get()
    if (grandparentSlotTaken(existingGrandparents.docs, lineageSide, parentSlot)) {
      throw new HttpsError(
        'failed-precondition',
        grandparentSlotError(lineageSide, parentSlot),
      )
    }
  }

  await db.collection('invitations').doc(token).set(invitationPayload)

  if (role !== 'member') {
    await db
      .collection('users')
      .doc(uid)
      .collection('familyMembers')
      .doc(token)
      .set({
        inviteToken: token,
        firstName: firstName || null,
        middleName: middleName || null,
        lastName: lastName || null,
        displayName: inviteeName || null,
        role,
        memberStatus,
        photoURL: data.photoURL?.trim() || null,
        inviteeEmail: inviteeEmail || null,
        privacy,
        bio: bio || null,
        parentSlot,
        parentKind,
        lineageSide,
        sharedFatherMemberId,
        sharedMotherMemberId,
        siblingRelationship,
        dateOfBirth,
        dateOfDeath,
        gender: String(data.gender ?? '').trim() || null,
        claimedByUid: null,
        claimedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      })
  }

  if (
    role === 'parent' &&
    parentSlot &&
    parentSlot !== 'unknown' &&
    parentKind &&
    isPrimaryParentKind(parentKind)
  ) {
    const userParentPatch: Record<string, string> = {}
    if (parentSlot === 'father') userParentPatch.treeFatherMemberId = token
    if (parentSlot === 'mother') userParentPatch.treeMotherMemberId = token
    await db.collection('users').doc(uid).set(userParentPatch, { merge: true })
  }

  if (memberStatus === 'living' && inviteeEmail) {
    await queueInviteEmail({
      to: inviteeEmail,
      inviterName,
      inviteeFirstName: firstName,
      role,
      joinUrl,
      personalMessage: data.personalMessage,
    })
  }

  return { token, joinUrl }
}

export const createFamilyMemberInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to send invitations.')
  }

  const data = (request.data ?? {}) as CreateInviteInput
  return createInvitationRecord(
    request.auth.uid,
    request.auth.token,
    data,
  )
})

export const createShareInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to create an invite link.')
  }

  const data = (request.data ?? {}) as { personalMessage?: string }
  return createInvitationRecord(request.auth.uid, request.auth.token, {
    role: 'member',
    memberStatus: 'living',
    personalMessage: data.personalMessage,
  })
})

export const sendShareInviteEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to send invitations.')
  }

  const data = (request.data ?? {}) as {
    token?: string
    inviteeName?: string
    inviteeEmail?: string
    personalMessage?: string
  }

  const token = String(data.token ?? '').trim()
  const inviteeName = String(data.inviteeName ?? '').trim()
  const inviteeEmail = normalizeInviteeEmail(data.inviteeEmail)
  const personalMessage = String(data.personalMessage ?? '').trim()

  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation link.')
  }
  if (!inviteeName) {
    throw new HttpsError('invalid-argument', 'Enter the invitee’s name.')
  }
  if (!inviteeEmail) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.')
  }
  if (!personalMessage) {
    throw new HttpsError('invalid-argument', 'Add a message for your invitation.')
  }

  const ref = db.collection('invitations').doc(token)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Invitation not found.')
  }

  const invitation = snap.data() as { inviterUid?: string; role?: InviteRole; inviterName?: string }
  if (invitation.inviterUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'You cannot send this invitation.')
  }
  if (invitation.role !== 'member') {
    throw new HttpsError('invalid-argument', 'This invitation cannot be sent by email.')
  }

  const nameParts = inviteeName.split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.length > 1 ? (nameParts[nameParts.length - 1] ?? '') : ''
  const middleName =
    nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''

  const inviterName =
    invitation.inviterName ||
    (typeof request.auth.token.name === 'string' && request.auth.token.name) ||
    (typeof request.auth.token.email === 'string' && request.auth.token.email) ||
    'A family member'

  const joinUrl = `${APP_ORIGIN}/join/${token}`

  await ref.update({
    inviteeEmail,
    inviteeName,
    inviteeFirstName: firstName || null,
    inviteeMiddleName: middleName || null,
    inviteeLastName: lastName || null,
    personalMessage,
  })

  await queueShareInviteEmail({
    to: inviteeEmail,
    inviterName,
    personalMessage,
    joinUrl,
  })

  return { ok: true }
})

export const getInvitationByToken = onCall(async (request) => {
  const token = String((request.data as { token?: string })?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const snap = await db.collection('invitations').doc(token).get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'This invitation link is invalid or expired.')
  }

  const doc = snap.data()!
  if (doc.status !== 'pending') {
    throw new HttpsError(
      'failed-precondition',
      'This invitation has already been used.',
    )
  }

  return {
    token,
    inviteeName: doc.inviteeName as string | null,
    inviteeEmail: doc.inviteeEmail as string | null,
    role: doc.role as InviteRole,
    roleLabel: roleLabel(doc.role as InviteRole),
    inviterName: doc.inviterName as string,
    personalMessage: doc.personalMessage as string | null,
  }
})

const FAMILY_ROLE_RANK: Record<InviteRole, number> = {
  child: 0,
  spouse: 1,
  sibling: 2,
  parent: 3,
  grandparent: 4,
  'great-grandparent': 5,
  member: 6,
}

function asInviteRole(value: unknown): InviteRole {
  const role = String(value ?? 'member')
  if (
    role === 'spouse' ||
    role === 'parent' ||
    role === 'grandparent' ||
    role === 'great-grandparent' ||
    role === 'child' ||
    role === 'sibling' ||
    role === 'member'
  ) {
    return role
  }
  return 'member'
}

async function callerEmail(
  uid: string,
  token: Record<string, unknown> | undefined,
): Promise<string | null> {
  const fromToken =
    typeof token?.email === 'string' ? token.email.trim().toLowerCase() : ''
  if (fromToken) return fromToken

  const snap = await db.collection('users').doc(uid).get()
  const fromProfile = String(snap.data()?.email ?? '')
    .trim()
    .toLowerCase()
  return fromProfile || null
}

function buildClaimUserPatch(
  existing: FirebaseFirestore.DocumentData | undefined,
  invite: FirebaseFirestore.DocumentData,
  options: { token: string; forceAnchor: boolean },
): Record<string, unknown> {
  const role = asInviteRole(invite.role)
  const inviterUid = String(invite.inviterUid ?? '').trim()
  const existingInviter = String(existing?.invitedByUid ?? '').trim()
  const setAnchor = Boolean(inviterUid) && (options.forceAnchor || !existingInviter)

  const patch: Record<string, unknown> = {
    profileClaimed: true,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (setAnchor) {
    patch.familyRole = role
    patch.invitedByUid = inviterUid
    patch.inviteToken = options.token
    patch.claimedInviteToken = options.token
    if (!String(existing?.profilePrivacy ?? '').trim()) {
      patch.profilePrivacy = parseMemberPrivacy(invite.privacy)
    }
  }

  const firstName = String(invite.inviteeFirstName ?? '').trim()
  const middleName = String(invite.inviteeMiddleName ?? '').trim()
  const lastName = String(invite.inviteeLastName ?? '').trim()
  const photoURL = String(invite.photoURL ?? '').trim()
  const bio = String(invite.bio ?? '').trim()
  const dateOfBirth = String(invite.dateOfBirth ?? '').trim()
  const email = String(invite.inviteeEmail ?? '').trim().toLowerCase()

  if (firstName && !String(existing?.firstName ?? '').trim()) patch.firstName = firstName
  if (middleName && !String(existing?.middleName ?? '').trim()) patch.middleName = middleName
  if (lastName && !String(existing?.lastName ?? '').trim()) patch.lastName = lastName
  if (photoURL && !String(existing?.photoURL ?? '').trim()) patch.photoURL = photoURL
  if (bio && !String(existing?.bio ?? '').trim()) patch.bio = bio
  if (dateOfBirth && !String(existing?.dateOfBirth ?? '').trim()) patch.dateOfBirth = dateOfBirth
  if (email && !String(existing?.email ?? '').trim()) patch.email = email

  return patch
}

export const acceptInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to accept this invitation.')
  }

  const token = String((request.data as { token?: string })?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const ref = db.collection('invitations').doc(token)
  const userEmail = await callerEmail(request.auth.uid, request.auth.token)
  const joinedUid = request.auth.uid
  let role: InviteRole = 'member'

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invitation not found.')
    }

    const invite = snap.data()!
    const alreadyJoinedByMe =
      invite.status !== 'pending' && invite.joinedUid === joinedUid
    if (invite.status !== 'pending' && !alreadyJoinedByMe) {
      throw new HttpsError('failed-precondition', 'Invitation already accepted.')
    }

    const inviteeEmail = String(invite.inviteeEmail ?? '')
      .trim()
      .toLowerCase()
    if (inviteeEmail && userEmail !== inviteeEmail) {
      throw new HttpsError(
        'permission-denied',
        'Sign in with the email address this invitation was sent to.',
      )
    }

    role = asInviteRole(invite.role)
    const inviterUid = String(invite.inviterUid ?? '').trim()
    const userRef = db.collection('users').doc(joinedUid)
    const userSnap = await tx.get(userRef)

    const familyMemberRef =
      inviterUid && role !== 'member'
        ? db.collection('users').doc(inviterUid).collection('familyMembers').doc(token)
        : null
    const familySnap = familyMemberRef ? await tx.get(familyMemberRef) : null

    const firstName = String(invite.inviteeFirstName ?? '').trim()
    const middleName = String(invite.inviteeMiddleName ?? '').trim()
    const lastName = String(invite.inviteeLastName ?? '').trim()
    const displayName =
      String(invite.inviteeName ?? '').trim() ||
      [firstName, middleName, lastName].filter(Boolean).join(' ')

    if (!alreadyJoinedByMe) {
      tx.update(ref, {
        status: 'joined',
        joinedAt: FieldValue.serverTimestamp(),
        joinedUid,
        profileClaimed: true,
      })
    }

    tx.set(
      userRef,
      buildClaimUserPatch(userSnap.data(), invite, { token, forceAnchor: true }),
      { merge: true },
    )

    if (familySnap?.exists && familyMemberRef) {
      tx.update(familyMemberRef, {
        claimedByUid: joinedUid,
        claimedAt: FieldValue.serverTimestamp(),
        displayName: displayName || familySnap.data()?.displayName || null,
      })
    }
  })

  return {
    ok: true,
    role,
    roleLabel: roleLabel(role),
    profileClaimed: true,
  }
})

type UpdatePendingMemberInput = {
  token?: string
  firstName?: string
  middleName?: string
  lastName?: string
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
}

function inviterSelfMemberIds(userData: Record<string, unknown> | undefined): string[] {
  const ids: string[] = []
  const inviteToken = String(userData?.inviteToken ?? '').trim()
  const claimed = String(userData?.claimedInviteToken ?? '').trim()
  if (inviteToken) ids.push(inviteToken)
  if (claimed) ids.push(claimed)
  return ids
}

function assertChildCoParentId(
  allFamilyDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  selfMemberIds: string[],
  id: string | null,
  label: string,
) {
  if (!id) return
  const onTree = allFamilyDocs.some((doc) => doc.id === id)
  const isSelf = selfMemberIds.includes(id)
  if (!onTree && !isSelf) {
    throw new HttpsError('invalid-argument', `${label} must be you or someone on your tree.`)
  }
}

function assertSiblingParentId(
  allFamilyDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  id: string | null,
  label: string,
) {
  if (!id) return
  const doc = allFamilyDocs.find((entry) => entry.id === id)
  if (!doc || doc.data().role !== 'parent') {
    throw new HttpsError('invalid-argument', `${label} must be a parent on your tree.`)
  }
}

export const updatePendingFamilyMemberProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to update this family member.')
  }

  const data = (request.data ?? {}) as UpdatePendingMemberInput
  const token = String(data.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const firstName = String(data.firstName ?? '').trim()
  const lastName = String(data.lastName ?? '').trim()
  const middleName = String(data.middleName ?? '').trim()
  if (!firstName || !lastName) {
    throw new HttpsError('invalid-argument', 'First and last name are required.')
  }

  const inviteeName = [firstName, middleName, lastName].filter(Boolean).join(' ')
  const photoURL =
    data.photoURL === null || data.photoURL === undefined
      ? undefined
      : String(data.photoURL).trim() || null
  const bio =
    data.bio === undefined ? undefined : String(data.bio ?? '').trim() || null
  const dateOfBirth = data.dateOfBirth === undefined ? undefined : String(data.dateOfBirth ?? '').trim() || null
  const dateOfDeath = data.dateOfDeath === undefined ? undefined : String(data.dateOfDeath ?? '').trim() || null
  const memberStatus = data.memberStatus === 'deceased' ? 'deceased' : 'living'
  const privacy = data.privacy ? parseMemberPrivacy(data.privacy) : undefined
  const gender =
    data.gender === undefined ? undefined : String(data.gender ?? '').trim() || null

  const ref = db.collection('invitations').doc(token)
  const uid = request.auth.uid

  let emailToSend: {
    to: string
    inviterName: string
    inviteeFirstName: string
    role: InviteRole
    joinUrl: string
    personalMessage?: string | null
  } | null = null

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invitation not found.')
    }

    const familyMemberRef = db
      .collection('users')
      .doc(uid)
      .collection('familyMembers')
      .doc(token)
    const familyMembersCol = db.collection('users').doc(uid).collection('familyMembers')
    const familySnap = await tx.get(familyMemberRef)
    const allFamilySnap = await tx.get(familyMembersCol)
    const inviterUserSnap = await tx.get(db.collection('users').doc(uid))
    const selfMemberIds = inviterSelfMemberIds(inviterUserSnap.data())

    const doc = snap.data()!
    if (doc.inviterUid !== uid) {
      throw new HttpsError('permission-denied', 'You can only edit people you invited.')
    }

    if (doc.role === 'member') {
      throw new HttpsError(
        'failed-precondition',
        'This invite is only for joining DengiTree, not a family tree profile you can edit.',
      )
    }

    if (doc.status !== 'pending' || doc.profileClaimed === true || doc.joinedUid != null) {
      throw new HttpsError(
        'failed-precondition',
        'This person has claimed their profile. You can no longer edit their details.',
      )
    }

    const invitationUpdate: Record<string, unknown> = {
      inviteeFirstName: firstName,
      inviteeMiddleName: middleName || null,
      inviteeLastName: lastName,
      inviteeName: inviteeName,
      memberStatus,
      updatedAt: FieldValue.serverTimestamp(),
    }
    const previousEmail = normalizeInviteeEmail(doc.inviteeEmail)
    let newEmail: string | null = previousEmail
    let emailJustAddedOrChanged = false

    if (data.inviteeEmail !== undefined) {
      newEmail = normalizeInviteeEmail(data.inviteeEmail)
      invitationUpdate.inviteeEmail = newEmail
      if (newEmail && newEmail !== previousEmail) {
        emailJustAddedOrChanged = true
      }
    }

    if (photoURL !== undefined) {
      invitationUpdate.photoURL = photoURL
    }
    if (bio !== undefined) {
      invitationUpdate.bio = bio
    }
    if (dateOfBirth !== undefined) {
      invitationUpdate.dateOfBirth = dateOfBirth
    }
    if (dateOfDeath !== undefined) {
      invitationUpdate.dateOfDeath = dateOfDeath
    }
    if (privacy !== undefined) {
      invitationUpdate.privacy = privacy
    }
    if (gender !== undefined) {
      invitationUpdate.gender = gender
    }
    if (doc.role === 'parent') {
      if (data.parentKind !== undefined) {
        invitationUpdate.parentKind = parseParentKind(data.parentKind)
      }
      if (data.parentSlot !== undefined) {
        invitationUpdate.parentSlot = parseParentSlot(data.parentSlot)
      }

      const nextSlot = parseParentSlot(
        data.parentSlot !== undefined ? data.parentSlot : doc.parentSlot,
      )
      const nextKind = parseParentKind(
        data.parentKind !== undefined ? data.parentKind : doc.parentKind,
      )
      if (
        nextSlot &&
        nextSlot !== 'unknown' &&
        isPrimaryParentKind(nextKind) &&
        primaryParentSlotTaken(allFamilySnap.docs, nextSlot, token)
      ) {
        throw new HttpsError('failed-precondition', primaryParentSlotError(nextSlot))
      }
    }

    if (doc.role === 'child' || doc.role === 'sibling') {
      if (data.sharedFatherMemberId !== undefined) {
        const fatherId =
          data.sharedFatherMemberId === null
            ? null
            : String(data.sharedFatherMemberId ?? '').trim() || null
        if (doc.role === 'child') {
          assertChildCoParentId(allFamilySnap.docs, selfMemberIds, fatherId, 'Father')
        } else {
          assertSiblingParentId(allFamilySnap.docs, fatherId, 'Father')
        }
        invitationUpdate.sharedFatherMemberId = fatherId
      }
      if (data.sharedMotherMemberId !== undefined) {
        const motherId =
          data.sharedMotherMemberId === null
            ? null
            : String(data.sharedMotherMemberId ?? '').trim() || null
        if (doc.role === 'child') {
          assertChildCoParentId(allFamilySnap.docs, selfMemberIds, motherId, 'Mother')
        } else {
          assertSiblingParentId(allFamilySnap.docs, motherId, 'Mother')
        }
        invitationUpdate.sharedMotherMemberId = motherId
      }
    }

    tx.update(ref, invitationUpdate)

    if (familySnap.exists) {
      const familyUpdate: Record<string, unknown> = {
        firstName,
        middleName: middleName || null,
        lastName,
        displayName: inviteeName,
        memberStatus,
      }
      if (data.inviteeEmail !== undefined) {
        familyUpdate.inviteeEmail = newEmail
      }
      if (photoURL !== undefined) {
        familyUpdate.photoURL = photoURL
      }
      if (bio !== undefined) {
        familyUpdate.bio = bio
      }
      if (dateOfBirth !== undefined) {
        familyUpdate.dateOfBirth = dateOfBirth
      }
      if (dateOfDeath !== undefined) {
        familyUpdate.dateOfDeath = dateOfDeath
      }
      if (privacy !== undefined) {
        familyUpdate.privacy = privacy
      }
      if (gender !== undefined) {
        familyUpdate.gender = gender
      }
      if (doc.role === 'parent') {
        if (data.parentKind !== undefined) {
          familyUpdate.parentKind = parseParentKind(data.parentKind)
        }
        if (data.parentSlot !== undefined) {
          familyUpdate.parentSlot = parseParentSlot(data.parentSlot)
        }
      }
      if (doc.role === 'child' || doc.role === 'sibling') {
        if (data.sharedFatherMemberId !== undefined) {
          familyUpdate.sharedFatherMemberId =
            data.sharedFatherMemberId === null
              ? null
              : String(data.sharedFatherMemberId ?? '').trim() || null
        }
        if (data.sharedMotherMemberId !== undefined) {
          familyUpdate.sharedMotherMemberId =
            data.sharedMotherMemberId === null
              ? null
              : String(data.sharedMotherMemberId ?? '').trim() || null
        }
      }
      tx.update(familyMemberRef, familyUpdate)
    }

    if (emailJustAddedOrChanged && newEmail && memberStatus === 'living') {
      const joinUrl = `${APP_ORIGIN}/join/${token}`
      emailToSend = {
        to: newEmail,
        inviterName: doc.inviterName || 'A family member',
        inviteeFirstName: firstName || doc.inviteeFirstName || '',
        role: doc.role,
        joinUrl,
        personalMessage: doc.personalMessage || null,
      }
    }
  })

  if (emailToSend) {
    await queueInviteEmail(emailToSend)
  }

  return { ok: true }
})

export const claimPendingInvitationsForEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to claim invitations.')
  }

  const userEmail = await callerEmail(request.auth.uid, request.auth.token)
  if (!userEmail) return { claimedCount: 0 }

  const joinedUid = request.auth.uid
  const snap = await db
    .collection('invitations')
    .where('inviteeEmail', '==', userEmail)
    .get()

  if (snap.empty) return { claimedCount: 0 }

  const pending = snap.docs.filter((docSnap) => {
    const data = docSnap.data()
    return data.status === 'pending' && data.profileClaimed !== true && data.joinedUid == null
  })
  const alreadyMine = snap.docs.filter((docSnap) => docSnap.data().joinedUid === joinedUid)
  const byRole = (a: FirebaseFirestore.QueryDocumentSnapshot, b: FirebaseFirestore.QueryDocumentSnapshot) =>
    FAMILY_ROLE_RANK[asInviteRole(a.data().role)] - FAMILY_ROLE_RANK[asInviteRole(b.data().role)]
  pending.sort(byRole)
  alreadyMine.sort(byRole)

  let count = 0
  for (const docSnap of pending) {
    const claimed = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(docSnap.ref)
      if (!inviteSnap.exists) return false

      const invite = inviteSnap.data()!
      if (invite.status !== 'pending' || invite.profileClaimed === true || invite.joinedUid != null) {
        return false
      }

      const token = docSnap.id
      const role = asInviteRole(invite.role)
      const inviterUid = String(invite.inviterUid ?? '').trim()
      const userRef = db.collection('users').doc(joinedUid)
      const userSnap = await tx.get(userRef)
      const familyMemberRef =
        inviterUid && role !== 'member'
          ? db.collection('users').doc(inviterUid).collection('familyMembers').doc(token)
          : null
      const familySnap = familyMemberRef ? await tx.get(familyMemberRef) : null

      tx.update(docSnap.ref, {
        status: 'joined',
        joinedAt: FieldValue.serverTimestamp(),
        joinedUid,
        profileClaimed: true,
      })
      tx.set(
        userRef,
        buildClaimUserPatch(userSnap.data(), invite, { token, forceAnchor: false }),
        { merge: true },
      )
      if (familySnap?.exists && familyMemberRef) {
        tx.update(familyMemberRef, {
          claimedByUid: joinedUid,
          claimedAt: FieldValue.serverTimestamp(),
        })
      }
      return true
    })
    if (claimed) count++
  }

  if (alreadyMine.length > 0) {
    const best = alreadyMine[0]
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(joinedUid)
      const userSnap = await tx.get(userRef)
      if (String(userSnap.data()?.invitedByUid ?? '').trim()) return

      const inviteSnap = await tx.get(best.ref)
      if (!inviteSnap.exists) return
      tx.set(
        userRef,
        buildClaimUserPatch(userSnap.data(), inviteSnap.data()!, {
          token: best.id,
          forceAnchor: false,
        }),
        { merge: true },
      )
    })
  }

  return { claimedCount: count }
})

export const updateFamilyMemberPrivacy = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to update privacy settings.')
  }

  const data = (request.data ?? {}) as { token?: string; privacy?: MemberPrivacy }
  const token = String(data.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const privacy = parseMemberPrivacy(data.privacy)
  const uid = request.auth.uid
  const ref = db.collection('invitations').doc(token)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invitation not found.')
    }

    const doc = snap.data()!
    if (doc.inviterUid !== uid) {
      throw new HttpsError('permission-denied', 'You can only update people you added.')
    }

    const familyMemberRef = db
      .collection('users')
      .doc(uid)
      .collection('familyMembers')
      .doc(token)
    const familySnap = await tx.get(familyMemberRef)

    tx.update(ref, {
      privacy,
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (familySnap.exists) {
      tx.update(familyMemberRef, { privacy })
    }
  })

  return { ok: true }
})

export { initializePremiumPayment, verifyPremiumPayment } from './premiumPayments'
