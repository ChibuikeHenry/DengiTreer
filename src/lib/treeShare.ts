/** View-only link for signed-in family to open this person’s tree (explore view). */
export function treeShareViewUrl(ownerUid: string, origin?: string): string {
  const base =
    origin?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://dengitree.web.app')
  return `${base.replace(/\/$/, '')}/home/tree?explore=${encodeURIComponent(ownerUid)}`
}
