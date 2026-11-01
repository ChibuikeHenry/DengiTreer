import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const SELF_TAG = '__self__'

/**
 * Lets a tagged person remove only their own tag from a library photo.
 * Accepts optional `tagId` (the id used to show the photo) so UI and backend stay in sync.
 */
export const untagSelfFromFamilyLibraryPhoto = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to untag yourself.')
  }

  const uid = request.auth.uid
  const data = (request.data ?? {}) as {
    ownerUid?: string
    photoId?: string
    tagId?: string
  }
  const ownerUid = String(data.ownerUid ?? '').trim()
  const photoId = String(data.photoId ?? '').trim()
  const tagId = String(data.tagId ?? '').trim()
  if (!ownerUid || !photoId) {
    throw new HttpsError('invalid-argument', 'Missing photo details.')
  }

  const db = getFirestore()
  const photoRef = db.collection('users').doc(ownerUid).collection('familyLibrary').doc(photoId)
  const photoSnap = await photoRef.get()
  if (!photoSnap.exists) {
    throw new HttpsError('not-found', 'Photo not found.')
  }

  const taggedRaw = photoSnap.data()?.taggedMemberIds
  const tagged: string[] = Array.isArray(taggedRaw)
    ? taggedRaw.map((v) => String(v)).filter(Boolean)
    : []

  const removable = new Set<string>()
  if (uid === ownerUid) {
    removable.add(SELF_TAG)
  }

  const membersSnap = await db.collection('users').doc(ownerUid).collection('familyMembers').get()
  for (const memberDoc of membersSnap.docs) {
    const joinedUid = String(memberDoc.data()?.joinedUid ?? '').trim()
    if (joinedUid && joinedUid === uid) {
      removable.add(memberDoc.id)
    }
  }

  const inviteSnap = await db
    .collection('invitations')
    .where('inviterUid', '==', ownerUid)
    .where('joinedUid', '==', uid)
    .get()
  for (const inviteDoc of inviteSnap.docs) {
    removable.add(inviteDoc.id)
  }

  // Prefer the exact tag the UI used to list this photo, after verifying ownership.
  if (tagId) {
    if (tagId === SELF_TAG && uid === ownerUid) {
      removable.add(SELF_TAG)
    } else {
      const memberDoc = await db
        .collection('users')
        .doc(ownerUid)
        .collection('familyMembers')
        .doc(tagId)
        .get()
      const memberJoined = String(memberDoc.data()?.joinedUid ?? '').trim()
      if (memberDoc.exists && memberJoined === uid) {
        removable.add(tagId)
      }

      const inviteDoc = await db.collection('invitations').doc(tagId).get()
      if (inviteDoc.exists) {
        const inv = inviteDoc.data()!
        if (
          String(inv.inviterUid ?? '') === ownerUid &&
          String(inv.joinedUid ?? '') === uid
        ) {
          removable.add(tagId)
        }
      }
    }
  }

  if (!removable.size) {
    throw new HttpsError(
      'permission-denied',
      'We could not verify your tag on this photo. Ask the tree owner to remove your tag.',
    )
  }

  const next = tagged.filter((id) => !removable.has(id))
  if (next.length === tagged.length) {
    // Already untagged in storage — succeed so the client can hide the card.
    return { ok: true as const, taggedMemberIds: tagged }
  }

  await photoRef.update({ taggedMemberIds: next })

  return { ok: true as const, taggedMemberIds: next }
})
