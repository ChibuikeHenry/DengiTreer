/** One-time fee for the DengiTree team to build a member’s tree from their uploaded file. */
export const BUILD_MY_TREE_PRICE_NAIRA = 25_000

/** Set true when Paystack tree-build checkout is configured in Cloud Functions. */
export const BUILD_MY_TREE_CHECKOUT_ENABLED = false

/** Accept any file type — sheets, docs, photos, PDFs, etc. */
export const BUILD_MY_TREE_ACCEPT = '*/*'

export const BUILD_MY_TREE_MAX_BYTES = 10 * 1024 * 1024

export function formatBuildMyTreePrice(): string {
  return `₦${BUILD_MY_TREE_PRICE_NAIRA.toLocaleString('en-NG')}`
}
