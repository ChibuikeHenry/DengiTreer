/** Link for signed-in family to open this person’s tree (Family Tree → explore view). */
export function treeShareViewUrl(ownerUid: string, origin?: string): string {
  const base =
    origin?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://dengitree.web.app')
  return `${base.replace(/\/$/, '')}/home/tree?explore=${encodeURIComponent(ownerUid)}`
}

export function treeShareImageFilename(displayName: string): string {
  const slug =
    displayName.trim().replace(/\s+/g, '-').toLowerCase() || 'family'
  return `${slug}-family-tree.png`
}
