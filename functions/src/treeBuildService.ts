import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const db = getFirestore()
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app'

export const TREE_BUILD_AMOUNT_KOBO = 25_000_00

function paystackSecret(): string {
  return String(process.env.PAYSTACK_SECRET_KEY ?? '').trim()
}

async function paystackRequest<T>(
  path: string,
  init: RequestInit & { method: 'GET' | 'POST' },
): Promise<T> {
  const secret = paystackSecret()
  if (!secret) {
    throw new HttpsError(
      'failed-precondition',
      'Payments are not configured yet. Contact support or try again later.',
    )
  }

  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const body = (await response.json()) as { status?: boolean; message?: string; data?: T }
  if (!response.ok || body.status === false) {
    throw new HttpsError(
      'internal',
      body.message?.trim() || 'Payment provider error. Try again.',
    )
  }
  return body.data as T
}

export const initializeTreeBuildPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to pay for Build my tree.')
  }

  const requestId = String((request.data as { requestId?: string })?.requestId ?? '').trim()
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'Missing build request.')
  }

  const reqRef = db.collection('treeBuildRequests').doc(requestId)
  const reqSnap = await reqRef.get()
  if (!reqSnap.exists) {
    throw new HttpsError('not-found', 'Build request not found.')
  }
  const req = reqSnap.data() as { uid?: string; status?: string; paymentStatus?: string }
  if (req.uid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'This request belongs to another account.')
  }
  if (req.paymentStatus === 'paid') {
    throw new HttpsError('failed-precondition', 'This request is already paid.')
  }

  const email =
    (typeof request.auth.token.email === 'string' && request.auth.token.email.trim()) || ''
  if (!email) {
    throw new HttpsError('failed-precondition', 'Your account needs an email address to pay.')
  }

  const uid = request.auth.uid
  const callbackUrl = `${APP_ORIGIN}/home/build-my-tree?paid=1`

  const initData = await paystackRequest<{
    authorization_url: string
    reference: string
  }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: TREE_BUILD_AMOUNT_KOBO,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata: {
        uid,
        requestId,
        kind: 'tree_build',
      },
    }),
  })

  const reference = String(initData.reference ?? '').trim()
  if (!reference || !initData.authorization_url) {
    throw new HttpsError('internal', 'Could not start payment.')
  }

  await db.collection('treeBuildPayments').doc(reference).set({
    uid,
    requestId,
    amountKobo: TREE_BUILD_AMOUNT_KOBO,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  await reqRef.update({
    paymentReference: reference,
    status: 'awaiting_payment',
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { authorizationUrl: initData.authorization_url, reference }
})

export const verifyTreeBuildPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to confirm payment.')
  }

  const reference = String((request.data as { reference?: string })?.reference ?? '').trim()
  if (!reference) {
    throw new HttpsError('invalid-argument', 'Missing payment reference.')
  }

  const uid = request.auth.uid
  const paymentRef = db.collection('treeBuildPayments').doc(reference)

  const verifyData = await paystackRequest<{
    status: string
    metadata?: { uid?: string; requestId?: string; kind?: string }
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' })

  if (verifyData.status !== 'success') {
    throw new HttpsError('failed-precondition', 'Payment was not completed.')
  }

  const metaUid = String(verifyData.metadata?.uid ?? '').trim()
  if (metaUid && metaUid !== uid) {
    throw new HttpsError('permission-denied', 'This payment belongs to another account.')
  }

  const requestId = String(verifyData.metadata?.requestId ?? '').trim()
  if (!requestId) {
    throw new HttpsError('failed-precondition', 'Payment is not linked to a build request.')
  }

  await db.runTransaction(async (tx) => {
    const paySnap = await tx.get(paymentRef)
    const reqRef = db.collection('treeBuildRequests').doc(requestId)
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists) {
      throw new HttpsError('not-found', 'Build request not found.')
    }
    const req = reqSnap.data() as { uid?: string }
    if (req.uid !== uid) {
      throw new HttpsError('permission-denied', 'This request belongs to another account.')
    }

    if (paySnap.exists && paySnap.data()?.status === 'success') {
      return
    }

    tx.set(
      paymentRef,
      {
        uid,
        requestId,
        status: 'success',
        verifiedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    tx.update(reqRef, {
      paymentStatus: 'paid',
      status: 'queued',
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  return { ok: true, requestId }
})
