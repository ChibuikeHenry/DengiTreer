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

export function partitionChildParentOptions(
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

/** Shared parents on the tree — never you or your spouse/co-parent. */
export function partitionSiblingParentOptions(
  members: TreeMember[],
  currentUserUid?: string | null,
): { fathers: ParentPickOption[]; mothers: ParentPickOption[] } {
  const parents: ParentPickOption[] = members
    .filter((member) => member.role === 'parent')
    .filter((member) => member.role !== 'spouse' && member.role !== 'child')
    .filter(
      (member) =>
        !currentUserUid || !member.joinedUid || member.joinedUid !== currentUserUid,
    )
    .map((member) => ({
      id: member.id,
      displayName: member.displayName,
      gender: null,
    }))

  const fathers = parents.filter((option) => matchesParentSlot(option.gender, 'father'))
  const mothers = parents.filter((option) => matchesParentSlot(option.gender, 'mother'))

  return { fathers, mothers }
}

export type ParentPickMode = 'child' | 'sibling'

/** @deprecated Use partitionChildParentOptions */
export const partitionParentOptions = partitionChildParentOptions

/** Co-parents when adding a child (you + spouse). */
export function useChildCoParentPickOptions(enabled: boolean) {
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

  return useMemo(
    () => partitionChildParentOptions(selfOption, members),
    [members, selfOption],
  )
}

/** Your mother/father on the tree when adding a sibling. */
export function useSiblingSharedParentPickOptions(enabled: boolean) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TreeMember[]>([])

  useEffect(() => {
    if (!enabled || !user?.uid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setMembers)
  }, [enabled, user?.uid])

  return useMemo(
    () => partitionSiblingParentOptions(members, user?.uid),
    [members, user?.uid],
  )
}

export function useTreeParentPickOptions(
  enabled: boolean,
  mode: ParentPickMode = 'child',
) {
  const childOptions = useChildCoParentPickOptions(enabled && mode === 'child')
  const siblingOptions = useSiblingSharedParentPickOptions(enabled && mode === 'sibling')

  return mode === 'sibling' ? siblingOptions : childOptions
}
