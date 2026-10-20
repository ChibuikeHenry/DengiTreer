import { useEffect, useState } from 'react'
import { checkInviteeEmailForMerge } from '../lib/mergeFlowApi'
import type { MergeCheckResult } from '../lib/mergeFlowDraft'
import { normalizeInviteeEmail } from '../lib/invitations'

export function useMergeEmailCheck(email: string, active: boolean) {
  const [checking, setChecking] = useState(false)
  const [match, setMatch] = useState<MergeCheckResult | null>(null)

  useEffect(() => {
    if (!active) {
      setMatch(null)
      return
    }
    const normalized = normalizeInviteeEmail(email)
    if (!normalized) {
      setMatch(null)
      return
    }

    let cancelled = false
    setChecking(true)
    const timer = window.setTimeout(() => {
      void checkInviteeEmailForMerge(normalized)
        .then((data) => {
          if (cancelled) return
          if (data.shouldMerge) setMatch(data)
          else setMatch(null)
        })
        .catch(() => {
          if (!cancelled) setMatch(null)
        })
        .finally(() => {
          if (!cancelled) setChecking(false)
        })
    }, 450)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [email, active])

  return { match, checking }
}
