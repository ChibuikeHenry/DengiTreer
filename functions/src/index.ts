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

async function queueInviteEmail(options: {
  to: string
  inviterName: string
  inviteeFirstName: string
  role: InviteRole
  joinUrl: string
  personalMessage?: string | null
}) {
  const roleText = roleLabel(options.role)
  const greeting = options.inviteeFirstName
    ? escapeHtml(options.inviteeFirstName)
    : 'there'
  const extra = options.personalMessage
    ? `<p><em>${escapeHtml(options.personalMessage)}</em></p>`
    : ''

  await db.collection('mail').add({
    to: options.to,
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
  sharedFatherMemberId?: string
  sharedMotherMemberId?: string
  siblingRelationship?: SiblingRelationship
  dateOfBirth?: string
  dateOfDeath?: string
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
  const inviteeEmail = String(data.inviteeEmail ?? '')
    .trim()
    .toLowerCase()
  const privacy = parseMemberPrivacy(data.privacy)
  const bio = String(data.bio ?? '').trim()
  const dateOfBirth = String(data.dateOfBirth ?? '').trim() || null
  const dateOfDeath = String(data.dateOfDeath ?? '').trim() || null
  const parentSlot =
    role === 'parent' || role === 'grandparent' || role === 'great-grandparent'
      ? parseParentSlot(data.parentSlot)
      : null
  const parentKind = role === 'parent' ? parseParentKind(data.parentKind) : null
  const sharedFatherMemberId =
    role === 'sibling' ? String(data.sharedFatherMemberId ?? '').trim() || null : null
  const sharedMotherMemberId =
    role === 'sibling' ? String(data.sharedMotherMemberId ?? '').trim() || null : null
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
    sharedFatherMemberId,
    sharedMotherMemberId,
    siblingRelationship,
    dateOfBirth,
    dateOfDeath,
    createdAt: FieldValue.serverTimestamp(),
    joinedAt: null,
    joinedUid: null,
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
        sharedFatherMemberId,
        sharedMotherMemberId,
        siblingRelationship,
        dateOfBirth,
        dateOfDeath,
        claimedByUid: null,
        claimedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      })
  }

  if (role === 'parent' && parentSlot && parentSlot !== 'unknown') {
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
    const familySnap = await tx.get(familyMemberRef)

    const doc = snap.data()!
    if (doc.inviterUid !== uid) {
      throw new HttpsError('permission-denied', 'You can only edit people you invited.')
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
    let newEmail: string | null = null
    if (data.inviteeEmail !== undefined) {
      newEmail = String(data.inviteeEmail ?? '').trim().toLowerCase() || null
      invitationUpdate.inviteeEmail = newEmail
    } else if (doc.inviteeEmail) {
      newEmail = String(doc.inviteeEmail).trim().toLowerCase() || null
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
    if (doc.role === 'parent') {
      if (data.parentKind !== undefined) {
        invitationUpdate.parentKind = parseParentKind(data.parentKind)
      }
      if (data.parentSlot !== undefined) {
        invitationUpdate.parentSlot = parseParentSlot(data.parentSlot)
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
      if (doc.role === 'parent') {
        if (data.parentKind !== undefined) {
          familyUpdate.parentKind = parseParentKind(data.parentKind)
        }
        if (data.parentSlot !== undefined) {
          familyUpdate.parentSlot = parseParentSlot(data.parentSlot)
        }
      }
      tx.update(familyMemberRef, familyUpdate)
    }

    if (newEmail && memberStatus === 'living') {
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
