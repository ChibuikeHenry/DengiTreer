import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'

function db() {
  return getFirestore()
}

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

export function buildClaimUserPatch(
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

export async function completeInvitationAccept(options: {
  token: string
  joinedUid: string
  userEmail: string | null
  forceAnchor: boolean
}): Promise<InviteRole> {
  const ref = db().collection('invitations').doc(options.token)
  let role: InviteRole = 'member'

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invitation not found.')
    }

    const invite = snap.data()!
    const alreadyJoinedByMe =
      invite.status !== 'pending' && invite.joinedUid === options.joinedUid
    if (invite.status !== 'pending' && !alreadyJoinedByMe) {
      throw new HttpsError('failed-precondition', 'Invitation already accepted.')
    }

    const inviteeEmail = String(invite.inviteeEmail ?? '')
      .trim()
      .toLowerCase()
    if (inviteeEmail && options.userEmail && options.userEmail !== inviteeEmail) {
      throw new HttpsError(
        'permission-denied',
        'Sign in with the email address this invitation was sent to.',
      )
    }

    role = asInviteRole(invite.role)
    const inviterUid = String(invite.inviterUid ?? '').trim()
    const userRef = db().collection('users').doc(options.joinedUid)
    const userSnap = await tx.get(userRef)

    const familyMemberRef =
      inviterUid && role !== 'member'
        ? db().collection('users').doc(inviterUid).collection('familyMembers').doc(options.token)
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
        joinedUid: options.joinedUid,
        profileClaimed: true,
      })
    }

    tx.set(
      userRef,
      buildClaimUserPatch(userSnap.data(), invite, {
        token: options.token,
        forceAnchor: options.forceAnchor,
      }),
      { merge: true },
    )

    if (familySnap?.exists && familyMemberRef) {
      tx.update(familyMemberRef, {
        claimedByUid: options.joinedUid,
        claimedAt: FieldValue.serverTimestamp(),
        displayName: displayName || familySnap.data()?.displayName || null,
      })
    }
  })

  return role
}
