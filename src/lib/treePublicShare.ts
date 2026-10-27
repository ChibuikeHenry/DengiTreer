import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import { getCallableErrorMessage } from './invitations'
import { parsePublicTreeSnapshot, type PublicTreeSnapshotDoc } from './publicTreeSnapshot'

const ensureTreeShareLinkFn = httpsCallable<
  Record<string, never>,
  { token: string; viewUrl: string; ownerDisplayName: string }
>(functions, 'ensureTreeShareLink')

const disableTreeShareLinkFn = httpsCallable<Record<string, never>, { ok: boolean }>(
  functions,
  'disableTreeShareLink',
)

/** Public read-only URL — no sign-in required. */
export function treeSharePublicViewUrl(token: string, origin?: string): string {
  const base =
    origin?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://dengitree.web.app')
  return `${base.replace(/\/$/, '')}/tree/${encodeURIComponent(token)}`
}

export async function ensureTreeShareLink(): Promise<{
  token: string
  viewUrl: string
  ownerDisplayName: string
}> {
  const { data } = await ensureTreeShareLinkFn({})
  const token = String(data.token ?? '').trim()
  const viewUrl = String(data.viewUrl ?? '').trim() || treeSharePublicViewUrl(token)
  return {
    token,
    viewUrl,
    ownerDisplayName: String(data.ownerDisplayName ?? ''),
  }
}

export async function disableTreeShareLink(): Promise<void> {
  await disableTreeShareLinkFn({})
}

export async function fetchPublicTreeShare(token: string): Promise<PublicTreeSnapshotDoc | null> {
  const trimmed = token.trim()
  if (!trimmed) return null
  const snap = await getDoc(doc(db, 'treePublicShares', trimmed))
  if (!snap.exists()) return null
  return parsePublicTreeSnapshot(snap.data())
}

export { getCallableErrorMessage }
