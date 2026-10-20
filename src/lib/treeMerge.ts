import { doc, onSnapshot, type Timestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'

export type TreeMergeStatus = 'pending' | 'accepted' | 'declined'

export type TreeMergeRequest = {
  id: string
  invitationToken: string
  inviterUid: string
  inviteeUid: string
  inviteeEmail: string | null
  status: TreeMergeStatus
  createdAt: Date | null
  respondedAt: Date | null
}

const acceptTreeMergeFn = httpsCallable<
  { token: string },
  { ok: boolean; copiedCount: number; inviterUid: string }
>(functions, 'acceptTreeMerge')

const declineTreeMergeFn = httpsCallable<{ token: string }, { ok: boolean }>(
  functions,
  'declineTreeMerge',
)

function timestampToDate(value: Timestamp | null | undefined): Date | null {
  if (!value || typeof value.toDate !== 'function') return null
  return value.toDate()
}

function mapMergeDoc(docSnap: { id: string; data: () => Record<string, unknown> }): TreeMergeRequest {
  const data = docSnap.data()
  const status = data.status as TreeMergeStatus
  return {
    id: docSnap.id,
    invitationToken: String(data.invitationToken ?? docSnap.id),
    inviterUid: String(data.inviterUid ?? ''),
    inviteeUid: String(data.inviteeUid ?? ''),
    inviteeEmail: (data.inviteeEmail as string | null) ?? null,
    status:
      status === 'accepted' || status === 'declined' || status === 'pending'
        ? status
        : 'pending',
    createdAt: timestampToDate(data.createdAt as Timestamp | undefined),
    respondedAt: timestampToDate(data.respondedAt as Timestamp | undefined),
  }
}

/** Listen by invitation token (document get) — works with Firestore rules; collection queries do not. */
export function subscribeMergeRequestsForTokens(
  tokens: string[],
  onChange: (byToken: Map<string, TreeMergeRequest | null>) => void,
  onError?: (error: Error) => void,
) {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))]
  if (!unique.length) {
    onChange(new Map())
    return () => {}
  }

  const latest = new Map<string, TreeMergeRequest | null>()
  let pending = unique.length

  const emit = () => {
    onChange(new Map(latest))
  }

  const unsubs = unique.map((token) =>
    subscribeMergeRequestForToken(
      token,
      (item) => {
        latest.set(token, item)
        if (pending > 0) {
          pending--
          if (pending === 0) emit()
        } else {
          emit()
        }
      },
      onError,
    ),
  )

  return () => unsubs.forEach((unsub) => unsub())
}

export function subscribeMergeRequestForToken(
  token: string,
  onChange: (item: TreeMergeRequest | null) => void,
  onError?: (error: Error) => void,
) {
  if (!token.trim()) {
    onChange(null)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'treeMergeRequests', token),
    (snap) => {
      onChange(snap.exists() ? mapMergeDoc(snap) : null)
    },
    (error) => onError?.(error),
  )
}

export async function acceptTreeMerge(token: string) {
  const result = await acceptTreeMergeFn({ token })
  return result.data
}

export async function declineTreeMerge(token: string) {
  const result = await declineTreeMergeFn({ token })
  return result.data
}
