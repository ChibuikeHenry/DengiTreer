/** One-time fee for the DengiTree team to build a member’s tree from their spreadsheet. */
export const BUILD_MY_TREE_PRICE_NAIRA = 25_000

/** Set true when Paystack tree-build checkout is configured in Cloud Functions. */
export const BUILD_MY_TREE_CHECKOUT_ENABLED = false

export const BUILD_MY_TREE_ACCEPT =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export const BUILD_MY_TREE_MAX_BYTES = 10 * 1024 * 1024

export function formatBuildMyTreePrice(): string {
  return `₦${BUILD_MY_TREE_PRICE_NAIRA.toLocaleString('en-NG')}`
}
