import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { resolveUserProfileForForm } from '../lib/userProfile'
import { hasSelfOnTree } from '../lib/treeStorage'

export type ParentPickOption = {
  id: string
  displayName: string
  gender: 'male' | 'female' | 'other' | null
}

function displayNameFromProfile(profile: {
  firstName: string
  middleName: string
  lastName: string
}) {
  return [profile.firstName, profile.middleName, profile.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

function matchesParentSlot(
  gender: ParentPickOption['gender'],
  slot: 'father' | 'mother',
): boolean {
  if (!gender || gender === 'other') return true
  if (slot === 'father') return gender === 'male'
  return gender === 'female'
}

function spouseMembers(members: TreeMember[]): ParentPickOption[] {
  return members
    .filter((member) => member.role === 'spouse')
    .map((member) => ({
      id: member.id,
      displayName: member.displayName,
      gender: null,
    }))
}

export function partitionParentOptions(
  self: ParentPickOption | null,
  members: TreeMember[],
): { fathers: ParentPickOption[]; mothers: ParentPickOption[] } {
  const spouses = spouseMembers(members)
  const candidates: ParentPickOption[] = []
  if (self) candidates.push(self)
  candidates.push(...spouses)

  const fathers = candidates.filter((option) => matchesParentSlot(option.gender, 'father'))
  const mothers = candidates.filter((option) => matchesParentSlot(option.gender, 'mother'))

  return { fathers, mothers }
}

export function useTreeParentPickOptions(enabled: boolean) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TreeMember[]>([])
  const [selfOption, setSelfOption] = useState<ParentPickOption | null>(null)

  useEffect(() => {
    if (!enabled || !user?.uid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setMembers)
  }, [enabled, user?.uid])

  useEffect(() => {
    if (!enabled || !user) {
      setSelfOption(null)
      return
    }

    if (!hasSelfOnTree()) {
      setSelfOption(null)
      return
    }

    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const name =
        displayNameFromProfile(profile) ||
        user.displayName?.trim() ||
        'You'
      setSelfOption({
        id: 'self',
        displayName: name,
        gender: null,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, user])

  const { fathers, mothers } = useMemo(
    () => partitionParentOptions(selfOption, members),
    [members, selfOption],
  )

  return { fathers, mothers }
}
