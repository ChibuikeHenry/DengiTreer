import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { PremiumPlanId } from './premiumPlans'

const initializePremiumPaymentFn = httpsCallable<
  { planId: PremiumPlanId },
  { authorizationUrl: string; reference: string }
>(functions, 'initializePremiumPayment')

const verifyPremiumPaymentFn = httpsCallable<
  { reference: string },
  { ok: boolean; premiumExpiresAt: string | null; planId: PremiumPlanId | null }
>(functions, 'verifyPremiumPayment')

export async function initializePremiumPayment(planId: PremiumPlanId) {
  const result = await initializePremiumPaymentFn({ planId })
  return result.data
}

export async function verifyPremiumPayment(reference: string) {
  const result = await verifyPremiumPaymentFn({ reference })
  return result.data
}
