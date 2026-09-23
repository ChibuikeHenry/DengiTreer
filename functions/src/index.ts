import { randomBytes } from 'crypto'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase-admin/app'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'us-central1' })

const db = getFirestore()
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app'

type InviteRole = 'spouse' | 'parent' | 'child' | 'sibling' | 'member'

function roleLabel(role: InviteRole): string {
  const map: Record<InviteRole, string> = {
    spouse: 'Spouse',
    parent: 'Parent',
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
}

async function createInvitationRecord(
  uid: string,
  authToken: Record<string, unknown>,
  data: CreateInviteInput,
) {
  const role = data.role
  if (!role || !['spouse', 'parent', 'child', 'sibling', 'member'].includes(role)) {
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

  if (memberStatus === 'living' && role !== 'member' && !inviteeEmail) {
    throw new HttpsError(
      'invalid-argument',
      'Email is required to invite a living relative.',
    )
  }

  const inviterName =
    (typeof authToken.name === 'string' && authToken.name) ||
    (typeof authToken.email === 'string' && authToken.email) ||
    'A family member'

  const token = newToken()
  const joinUrl = `${APP_ORIGIN}/join/${token}`

  await db.collection('invitations').doc(token).set({
    token,
    inviterUid: uid,
    inviterName,
    inviterEmail:
      typeof authToken.email === 'string' ? authToken.email.toLowerCase() : null,
    inviteeEmail: inviteeEmail || null,
    inviteeName: inviteeName || null,
    inviteeFirstName: firstName || null,
    inviteeLastName: lastName || null,
    role,
    status: 'pending',
    memberStatus,
    personalMessage: data.personalMessage?.trim() || null,
    createdAt: FieldValue.serverTimestamp(),
    joinedAt: null,
    joinedUid: null,
  })

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

export const acceptInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to accept this invitation.')
  }

  const token = String((request.data as { token?: string })?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const ref = db.collection('invitations').doc(token)
  const userEmail =
    typeof request.auth.token.email === 'string'
      ? request.auth.token.email.toLowerCase()
      : null

  let role: InviteRole = 'member'

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invitation not found.')
    }

    const doc = snap.data()!
    if (doc.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Invitation already accepted.')
    }

    const inviteeEmail = doc.inviteeEmail as string | null
    if (inviteeEmail && userEmail && inviteeEmail !== userEmail) {
      throw new HttpsError(
        'permission-denied',
        'Sign in with the email address this invitation was sent to.',
      )
    }

    role = doc.role as InviteRole

    tx.update(ref, {
      status: 'joined',
      joinedAt: FieldValue.serverTimestamp(),
      joinedUid: request.auth!.uid,
    })

    tx.set(
      db.collection('users').doc(request.auth!.uid),
      {
        familyRole: role,
        invitedByUid: doc.inviterUid,
        inviteToken: token,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })

  return { ok: true, role, roleLabel: roleLabel(role) }
})
