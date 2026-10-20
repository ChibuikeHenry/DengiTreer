import { randomBytes } from 'crypto'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { completeInvitationAccept } from './inviteAccept'

const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app'

function db() {
  return getFirestore()
}

export type TreeMergeStatus = 'pending' | 'accepted' | 'declined'

function newToken(): string {
  return randomBytes(6).toString('hex')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeEmail(raw: unknown): string | null {
  const trimmed = String(raw ?? '').trim().toLowerCase()
  if (!trimmed) return null
  const at = trimmed.indexOf('@')
  if (at <= 0 || at >= trimmed.length - 1) return null
  return trimmed
}

export async function findUidByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  try {
    const user = await getAuth().getUserByEmail(normalized)
    return user.uid
  } catch {
    /* not registered */
  }
  try {
    const snap = await db().collection('users').where('email', '==', normalized).limit(1).get()
    if (!snap.empty) return snap.docs[0].id
  } catch {
    /* index may be missing; auth lookup is primary */
  }
  return null
}

async function userHasOwnTree(uid: string): Promise<boolean> {
  const membersSnap = await db()
    .collection('users')
    .doc(uid)
    .collection('familyMembers')
    .limit(1)
    .get()
  if (!membersSnap.empty) return true

  const invitesSnap = await db()
    .collection('invitations')
    .where('inviterUid', '==', uid)
    .limit(1)
    .get()
  return !invitesSnap.empty
}

async function emailUsedOnAnotherTree(email: string, excludeInviterUid: string): Promise<boolean> {
  const invites = await db()
    .collection('invitations')
    .where('inviteeEmail', '==', email)
    .limit(25)
    .get()

  for (const doc of invites.docs) {
    const data = doc.data()
    if (String(data.inviterUid ?? '') === excludeInviterUid) continue
    if (data.role === 'member') continue
    return true
  }

  try {
    const members = await db()
      .collectionGroup('familyMembers')
      .where('inviteeEmail', '==', email)
      .limit(15)
      .get()
    for (const doc of members.docs) {
      const parts = doc.ref.path.split('/')
      const ownerUid = parts[1] ?? ''
      if (ownerUid && ownerUid !== excludeInviterUid) return true
    }
  } catch {
    /* collection group index may still be building */
  }

  return false
}

async function inviteeHasFamilyTreeContext(
  uid: string,
  email: string,
  inviterUid: string,
): Promise<boolean> {
  if (await userHasOwnTree(uid)) return true

  const snap = await db().collection('users').doc(uid).get()
  const profile = snap.data() ?? {}
  if (String(profile.invitedByUid ?? '').trim()) return true
  if (String(profile.treeFatherMemberId ?? '').trim()) return true
  if (String(profile.treeMotherMemberId ?? '').trim()) return true
  if (String(profile.claimedInviteToken ?? '').trim()) return true
  if (String(profile.inviteToken ?? '').trim()) return true

  const joinedAs = await db()
    .collection('invitations')
    .where('joinedUid', '==', uid)
    .limit(1)
    .get()
  if (!joinedAs.empty) return true

  return emailUsedOnAnotherTree(email, inviterUid)
}

export type TreeMergeOfferResult = {
  offered: boolean
  notice: string | null
}

async function resolveMergeInvitee(
  inviteeEmail: string,
  inviterUid: string,
): Promise<{ inviteeUid: string | null; shouldOffer: boolean; notice: string | null }> {
  const email = normalizeEmail(inviteeEmail)
  if (!email) return { inviteeUid: null, shouldOffer: false, notice: null }

  const inviteeUid = await findUidByEmail(email)
  if (inviteeUid === inviterUid) {
    return {
      inviteeUid: null,
      shouldOffer: false,
      notice: 'That email belongs to your own DengiTree account.',
    }
  }

  if (inviteeUid) {
    const hasTree = await inviteeHasFamilyTreeContext(inviteeUid, email, inviterUid)
    if (hasTree) {
      return {
        inviteeUid,
        shouldOffer: true,
        notice:
          'This person already has a family tree on DengiTree. They will be asked to merge their tree with yours.',
      }
    }
    return { inviteeUid, shouldOffer: false, notice: null }
  }

  if (await emailUsedOnAnotherTree(email, inviterUid)) {
    return {
      inviteeUid: null,
      shouldOffer: false,
      notice:
        'This email is already on another family tree. Ask them to sign in with that email, then save this invite again to send a merge request.',
    }
  }

  return { inviteeUid: null, shouldOffer: false, notice: null }
}

function mergeRequestRef(invitationToken: string) {
  return db().collection('treeMergeRequests').doc(invitationToken)
}

export async function offerTreeMergeForInvitation(options: {
  invitationToken: string
  inviterUid: string
  inviterName: string
  inviteeEmail: string
  roleLabel: string
  joinUrl: string
  personalMessage?: string | null
  sendEmail?: boolean
}): Promise<TreeMergeOfferResult> {
  const inviteeEmail = normalizeEmail(options.inviteeEmail)
  if (!inviteeEmail) return { offered: false, notice: null }

  const resolved = await resolveMergeInvitee(inviteeEmail, options.inviterUid)
  if (resolved.notice && !resolved.shouldOffer) {
    await db()
      .collection('invitations')
      .doc(options.invitationToken)
      .set(
        {
          treeMergeOffered: false,
          treeMergeInviterNotice: resolved.notice,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    return { offered: false, notice: resolved.notice }
  }

  if (!resolved.shouldOffer || !resolved.inviteeUid) {
    return { offered: false, notice: resolved.notice }
  }

  const inviteeUid = resolved.inviteeUid
  const existing = await mergeRequestRef(options.invitationToken).get()
  const alreadyPending =
    existing.exists && String(existing.data()?.status ?? '') === 'pending'

  await mergeRequestRef(options.invitationToken).set(
    {
      invitationToken: options.invitationToken,
      inviterUid: options.inviterUid,
      inviteeUid,
      inviteeEmail,
      status: 'pending' satisfies TreeMergeStatus,
      createdAt: FieldValue.serverTimestamp(),
      respondedAt: null,
    },
    { merge: true },
  )

  await db()
    .collection('invitations')
    .doc(options.invitationToken)
    .set(
      {
        treeMergeOffered: true,
        treeMergeInviteeUid: inviteeUid,
        treeMergeInviterNotice: resolved.notice,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

  const shouldSendEmail = options.sendEmail !== false && !alreadyPending
  if (shouldSendEmail) {
    const greeting = inviteeEmail.split('@')[0] || 'there'
    const extra = options.personalMessage
      ? `<p><em>${escapeHtml(options.personalMessage)}</em></p>`
      : ''

    await db().collection('mail').add({
      to: inviteeEmail,
      message: {
        subject: `${options.inviterName} invited you to merge family trees on DengiTree`,
        html: `
        <p>Hi ${escapeHtml(greeting)},</p>
        <p><strong>${escapeHtml(options.inviterName)}</strong> added you to their family tree as their <strong>${escapeHtml(options.roleLabel)}</strong>.</p>
        <p>You already have a family tree on DengiTree. You can <strong>merge</strong> your tree into theirs so everyone appears on one shared tree.</p>
        ${extra}
        <p><a href="${options.joinUrl}">Review invitation</a></p>
        <p>After signing in, open <strong>Invitations → Received</strong> to accept or decline the merge.</p>
        <p>If the button does not work, copy this link:<br>${options.joinUrl}</p>
        <p>— DengiTree</p>
      `.trim(),
      },
    })
  }

  return { offered: true, notice: resolved.notice }
}

/** @deprecated use offerTreeMergeForInvitation */
export async function maybeCreateTreeMergeRequest(options: {
  invitationToken: string
  inviterUid: string
  inviterName: string
  inviteeEmail: string
  roleLabel: string
  joinUrl: string
  personalMessage?: string | null
}): Promise<boolean> {
  const result = await offerTreeMergeForInvitation(options)
  return result.offered
}

function remapId(
  idMap: Map<string, string>,
  oldId: string | null | undefined,
): string | null {
  if (!oldId) return null
  const trimmed = String(oldId).trim()
  if (!trimmed) return null
  return idMap.get(trimmed) ?? null
}

async function copyInviteeTreeIntoInviter(inviterUid: string, inviteeUid: string): Promise<number> {
  const inviteeUserSnap = await db().collection('users').doc(inviteeUid).get()
  const inviteeUser = inviteeUserSnap.data() ?? {}
  const skipMemberIds = new Set<string>()
  for (const key of ['inviteToken', 'claimedInviteToken'] as const) {
    const id = String(inviteeUser[key] ?? '').trim()
    if (id) skipMemberIds.add(id)
  }

  const [inviteeInvitesSnap, inviteeMembersSnap, inviterInvitesSnap] = await Promise.all([
    db().collection('invitations').where('inviterUid', '==', inviteeUid).get(),
    db().collection('users').doc(inviteeUid).collection('familyMembers').get(),
    db().collection('invitations').where('inviterUid', '==', inviterUid).get(),
  ])

  const inviterJoinedUids = new Set<string>()
  for (const doc of inviterInvitesSnap.docs) {
    const joined = String(doc.data().joinedUid ?? '').trim()
    if (joined) inviterJoinedUids.add(joined)
  }

  const idMap = new Map<string, string>()

  for (const doc of inviteeInvitesSnap.docs) {
    if (skipMemberIds.has(doc.id)) continue
    const joinedUid = String(doc.data().joinedUid ?? '').trim()
    if (joinedUid === inviteeUid) continue
    if (joinedUid && inviterJoinedUids.has(joinedUid)) continue
    if (!idMap.has(doc.id)) idMap.set(doc.id, newToken())
  }

  for (const doc of inviteeMembersSnap.docs) {
    if (skipMemberIds.has(doc.id)) continue
    if (!idMap.has(doc.id)) idMap.set(doc.id, newToken())
  }

  if (idMap.size === 0) return 0

  let batch = db().batch()
  let ops = 0
  const batches = []

  const queue = (fn: () => void) => {
    fn()
    ops++
    if (ops >= 400) {
      batches.push(batch)
      batch = db().batch()
      ops = 0
    }
  }

  for (const doc of inviteeInvitesSnap.docs) {
    if (!idMap.has(doc.id)) continue
    const newId = idMap.get(doc.id)!
    const data = doc.data()
    const joinedUid = String(data.joinedUid ?? '').trim()
    if (joinedUid === inviteeUid) continue
    if (joinedUid && inviterJoinedUids.has(joinedUid)) continue

    queue(() =>
      batch.set(db().collection('invitations').doc(newId), {
        ...data,
        token: newId,
        inviterUid: inviterUid,
        sharedFatherMemberId: remapId(idMap, data.sharedFatherMemberId as string),
        sharedMotherMemberId: remapId(idMap, data.sharedMotherMemberId as string),
        mergedFromUid: inviteeUid,
        mergedFromToken: doc.id,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    )
  }

  for (const doc of inviteeMembersSnap.docs) {
    if (!idMap.has(doc.id)) continue
    const newId = idMap.get(doc.id)!
    const data = doc.data()
    queue(() =>
      batch.set(db().collection('users').doc(inviterUid).collection('familyMembers').doc(newId), {
        ...data,
        inviteToken: newId,
        sharedFatherMemberId: remapId(idMap, data.sharedFatherMemberId as string),
        sharedMotherMemberId: remapId(idMap, data.sharedMotherMemberId as string),
        mergedFromUid: inviteeUid,
        mergedFromToken: doc.id,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    )
  }

  const inviterUserPatch: Record<string, string> = {}
  const fatherId = String(inviteeUser.treeFatherMemberId ?? '').trim()
  const motherId = String(inviteeUser.treeMotherMemberId ?? '').trim()
  if (fatherId && idMap.has(fatherId)) {
    inviterUserPatch.treeFatherMemberId = idMap.get(fatherId)!
  }
  if (motherId && idMap.has(motherId)) {
    inviterUserPatch.treeMotherMemberId = idMap.get(motherId)!
  }
  if (Object.keys(inviterUserPatch).length > 0) {
    queue(() =>
      batch.set(db().collection('users').doc(inviterUid), inviterUserPatch, { merge: true }),
    )
  }

  for (const doc of inviteeInvitesSnap.docs) {
    if (idMap.has(doc.id)) {
      queue(() => batch.delete(doc.ref))
    }
  }
  for (const doc of inviteeMembersSnap.docs) {
    if (idMap.has(doc.id)) {
      queue(() => batch.delete(doc.ref))
    }
  }

  queue(() =>
    batch.set(
      db().collection('users').doc(inviteeUid),
      {
        treeMergedIntoUid: inviterUid,
        treeMergedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  )

  batches.push(batch)
  for (const b of batches) {
    await b.commit()
  }

  return idMap.size
}

async function callerEmail(
  uid: string,
  token: Record<string, unknown> | undefined,
): Promise<string | null> {
  const fromToken =
    typeof token?.email === 'string' ? token.email.trim().toLowerCase() : ''
  if (fromToken) return fromToken
  const snap = await db().collection('users').doc(uid).get()
  return normalizeEmail(snap.data()?.email)
}

export const acceptTreeMerge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to accept this merge request.')
  }

  const token = String((request.data as { token?: string })?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const uid = request.auth.uid
  const userEmail = await callerEmail(uid, request.auth.token)
  const mergeRef = mergeRequestRef(token)
  const inviteRef = db().collection('invitations').doc(token)

  let inviterUid = ''
  let copiedCount = 0

  await db().runTransaction(async (tx) => {
    const mergeSnap = await tx.get(mergeRef)
    if (!mergeSnap.exists) {
      throw new HttpsError('not-found', 'Merge request not found.')
    }
    const merge = mergeSnap.data()!
    if (merge.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This merge request is no longer pending.')
    }
    if (String(merge.inviteeUid ?? '') !== uid) {
      throw new HttpsError('permission-denied', 'This merge request is for another account.')
    }
    const inviteeEmail = normalizeEmail(merge.inviteeEmail)
    if (inviteeEmail && userEmail && inviteeEmail !== userEmail) {
      throw new HttpsError(
        'permission-denied',
        'Sign in with the email address this invitation was sent to.',
      )
    }

    const inviteSnap = await tx.get(inviteRef)
    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invitation not found.')
    }
    inviterUid = String(inviteSnap.data()?.inviterUid ?? '').trim()
    if (!inviterUid) {
      throw new HttpsError('failed-precondition', 'Invalid invitation.')
    }

    tx.update(mergeRef, {
      status: 'accepted',
      respondedAt: FieldValue.serverTimestamp(),
    })
  })

  copiedCount = await copyInviteeTreeIntoInviter(inviterUid, uid)
  await completeInvitationAccept({
    token,
    joinedUid: uid,
    userEmail,
    forceAnchor: true,
  })

  return { ok: true, copiedCount, inviterUid }
})

export const declineTreeMerge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to decline this merge request.')
  }

  const token = String((request.data as { token?: string })?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'Missing invitation token.')
  }

  const uid = request.auth.uid
  const mergeRef = mergeRequestRef(token)

  await db().runTransaction(async (tx) => {
    const mergeSnap = await tx.get(mergeRef)
    if (!mergeSnap.exists) {
      throw new HttpsError('not-found', 'Merge request not found.')
    }
    const merge = mergeSnap.data()!
    if (String(merge.inviteeUid ?? '') !== uid) {
      throw new HttpsError('permission-denied', 'This merge request is for another account.')
    }
    if (merge.status !== 'pending') return
    tx.update(mergeRef, {
      status: 'declined',
      respondedAt: FieldValue.serverTimestamp(),
    })
  })

  return { ok: true }
})

export function mergeReviewUrl(invitationToken: string): string {
  return `${APP_ORIGIN}/join/${invitationToken}`
}
