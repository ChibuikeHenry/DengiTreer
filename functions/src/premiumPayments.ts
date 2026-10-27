import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const db = getFirestore()
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app'

export type PremiumPlanId = '7day' | 'monthly' | 'quarterly' | 'yearly'

type PremiumPlanDef = {
  id: PremiumPlanId
  amountKobo: number
  accessDays: number
  label: string
}

const PLANS: Record<PremiumPlanId, PremiumPlanDef> = {
  '7day': { id: '7day', amountKobo: 500_00, accessDays: 7, label: 'Premium — 7 days' },
  monthly: { id: 'monthly', amountKobo: 1_000_00, accessDays: 30, label: 'Premium — 1 month' },
  quarterly: {
    id: 'quarterly',
    amountKobo: 2_500_00,
    accessDays: 90,
    label: 'Premium — 3 months',
  },
  yearly: { id: 'yearly', amountKobo: 5_000_00, accessDays: 365, label: 'Premium — 1 year' },
}

function paystackSecret(): string {
  return String(process.env.PAYSTACK_SECRET_KEY ?? '').trim()
}

function parsePlanId(raw: unknown): PremiumPlanId {
  const id = String(raw ?? '').trim()
  if (id in PLANS) return id as PremiumPlanId
  throw new HttpsError('invalid-argument', 'Choose a valid premium plan.')
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

function addAccessDays(base: Date, days: number): Date {
  const next = new Date(base.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function readPremiumExpiry(data: Record<string, unknown> | undefined): Date | null {
  const raw = data?.premiumExpiresAt
  if (raw instanceof Timestamp) return raw.toDate()
  if (raw instanceof Date) return raw
  return null
}

export const initializePremiumPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to purchase premium.')
  }

  const planId = parsePlanId((request.data as { planId?: string })?.planId)
  const plan = PLANS[planId]
  const email =
    (typeof request.auth.token.email === 'string' && request.auth.token.email.trim()) || ''
  if (!email) {
    throw new HttpsError('failed-precondition', 'Your account needs an email address to pay.')
  }

  const uid = request.auth.uid
  const callbackUrl = `${APP_ORIGIN}/home/premium?paid=1`

  const initData = await paystackRequest<{
    authorization_url: string
    reference: string
  }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: plan.amountKobo,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata: {
        uid,
        planId: plan.id,
        nonRecurring: true,
      },
    }),
  })

  const reference = String(initData.reference ?? '').trim()
  if (!reference || !initData.authorization_url) {
    throw new HttpsError('internal', 'Could not start payment.')
  }

  await db.collection('premiumPayments').doc(reference).set({
    uid,
    planId: plan.id,
    amountKobo: plan.amountKobo,
    accessDays: plan.accessDays,
    status: 'pending',
    nonRecurring: true,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { authorizationUrl: initData.authorization_url, reference }
})

export const verifyPremiumPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to confirm payment.')
  }

  const reference = String((request.data as { reference?: string })?.reference ?? '').trim()
  if (!reference) {
    throw new HttpsError('invalid-argument', 'Missing payment reference.')
  }

  const uid = request.auth.uid
  const paymentRef = db.collection('premiumPayments').doc(reference)

  const verifyData = await paystackRequest<{
    status: string
    amount: number
    metadata?: { uid?: string; planId?: string }
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' })

  if (verifyData.status !== 'success') {
    throw new HttpsError('failed-precondition', 'Payment was not completed.')
  }

  const metaUid = String(verifyData.metadata?.uid ?? '').trim()
  if (metaUid && metaUid !== uid) {
    throw new HttpsError('permission-denied', 'This payment belongs to another account.')
  }

  const planId = parsePlanId(verifyData.metadata?.planId)
  const plan = PLANS[planId]

  const resultExpiry = await db.runTransaction(async (tx): Promise<Date | null> => {
    const paySnap = await tx.get(paymentRef)
    const userRef = db.collection('users').doc(uid)
    const userSnap = await tx.get(userRef)

    if (paySnap.exists && paySnap.data()?.status === 'success') {
      return readPremiumExpiry(userSnap.data())
    }

    const now = new Date()
    const currentExpiry = readPremiumExpiry(userSnap.data())
    const base =
      currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now
    const premiumExpiresAt = addAccessDays(base, plan.accessDays)

    tx.set(
      userRef,
      {
        premiumPlanId: plan.id,
        premiumExpiresAt: Timestamp.fromDate(premiumExpiresAt),
        premiumNonRecurring: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    tx.set(
      paymentRef,
      {
        uid,
        planId: plan.id,
        amountKobo: plan.amountKobo,
        accessDays: plan.accessDays,
        status: 'success',
        nonRecurring: true,
        verifiedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return premiumExpiresAt
  })

  const expiresIso = resultExpiry ? resultExpiry.toISOString() : null

  return {
    ok: true,
    premiumExpiresAt: expiresIso,
    planId,
  }
})
