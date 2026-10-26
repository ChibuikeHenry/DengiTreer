import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  DEFAULT_MEMBER_PRIVACY,
  type MemberPrivacy,
  parseMemberPrivacy,
} from '../lib/memberPrivacy'
import { resolveUserProfileForForm } from '../lib/userProfile'

/** @param scope `self` loads your profile privacy; `invite` uses app default (inviters do not set others' visibility). */
export function useDefaultMemberPrivacy(open: boolean, scope: 'self' | 'invite' = 'invite') {
  const { user } = useAuth()
  const [privacy, setPrivacy] = useState<MemberPrivacy>(DEFAULT_MEMBER_PRIVACY)

  useEffect(() => {
    if (!open) return
    if (scope === 'invite' || !user) {
      setPrivacy(DEFAULT_MEMBER_PRIVACY)
      return
    }

    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setPrivacy(
        parseMemberPrivacy(profile.profilePrivacy ?? profile.defaultMemberPrivacy),
      )
    })()

    return () => {
      cancelled = true
    }
  }, [open, scope, user])

  return [privacy, setPrivacy] as const
}
