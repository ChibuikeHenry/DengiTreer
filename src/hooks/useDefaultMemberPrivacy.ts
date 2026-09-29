import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  DEFAULT_MEMBER_PRIVACY,
  type MemberPrivacy,
  parseMemberPrivacy,
} from '../lib/memberPrivacy'
import { resolveUserProfileForForm } from '../lib/userProfile'

export function useDefaultMemberPrivacy(open: boolean) {
  const { user } = useAuth()
  const [privacy, setPrivacy] = useState<MemberPrivacy>(DEFAULT_MEMBER_PRIVACY)

  useEffect(() => {
    if (!open) return
    if (!user) {
      setPrivacy(DEFAULT_MEMBER_PRIVACY)
      return
    }

    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setPrivacy(parseMemberPrivacy(profile.defaultMemberPrivacy))
    })()

    return () => {
      cancelled = true
    }
  }, [open, user])

  return [privacy, setPrivacy] as const
}
