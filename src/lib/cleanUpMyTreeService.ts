/** One-time fee for the DengiTree team to tidy layout, relationships, and duplicates on your tree. */
export const CLEAN_UP_MY_TREE_PRICE_NAIRA = 15_000

/** Set true when Paystack cleanup checkout is configured in Cloud Functions. */
export const CLEAN_UP_MY_TREE_CHECKOUT_ENABLED = false

export function formatCleanUpMyTreePrice(): string {
  return `₦${CLEAN_UP_MY_TREE_PRICE_NAIRA.toLocaleString('en-NG')}`
}
