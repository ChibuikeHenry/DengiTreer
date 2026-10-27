/** Flip to true when Paystack (or other) checkout is configured in Cloud Functions. */
export const PREMIUM_CHECKOUT_ENABLED = false

/** One-time (non-recurring) premium access plans. Amounts in Nigerian Naira. */
export type PremiumPlanId = '7day' | 'monthly' | 'quarterly' | 'yearly'

export type PremiumPlan = {
  id: PremiumPlanId
  amountNaira: number
  /** Human label for the price line, e.g. "/ 7 days" */
  priceSuffix: string
  /** Short label in the billing picker */
  pickerLabel: string
  accessDays: number
  recurring: false
}

export const PREMIUM_PLANS: Record<PremiumPlanId, PremiumPlan> = {
  '7day': {
    id: '7day',
    amountNaira: 500,
    priceSuffix: '/ 7 days',
    pickerLabel: '/ 7 days',
    accessDays: 7,
    recurring: false,
  },
  monthly: {
    id: 'monthly',
    amountNaira: 1_000,
    priceSuffix: '/ month',
    pickerLabel: '/ monthly',
    accessDays: 30,
    recurring: false,
  },
  quarterly: {
    id: 'quarterly',
    amountNaira: 2_500,
    priceSuffix: '/ quarter',
    pickerLabel: '/ quarterly',
    accessDays: 90,
    recurring: false,
  },
  yearly: {
    id: 'yearly',
    amountNaira: 5_000,
    priceSuffix: '/ year',
    pickerLabel: '/ yearly',
    accessDays: 365,
    recurring: false,
  },
}

export const PREMIUM_PLAN_ORDER: PremiumPlanId[] = [
  '7day',
  'monthly',
  'quarterly',
  'yearly',
]

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

export function premiumPlanById(id: string | null | undefined): PremiumPlan | null {
  if (!id || !(id in PREMIUM_PLANS)) return null
  return PREMIUM_PLANS[id as PremiumPlanId]
}
