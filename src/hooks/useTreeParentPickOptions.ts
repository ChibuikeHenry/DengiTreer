import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  normalizeTreeMemberGender,
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

function pickOptionGender(
  memberGender: string | null | undefined,
): ParentPickOption['gender'] {
  const normalized = normalizeTreeMemberGender(memberGender)
  if (normalized === 'male' || normalized === 'female') return normalized
  return null
}

function matchesParentSlot(
  gender: ParentPickOption['gender'],
  slot: 'father' | 'mother',
): boolean {
  if (!gender) return false
  if (gender === 'other') return true
  if (slot === 'father') return gender === 'male'
  return gender === 'female'
}

function spouseMembers(
  members: TreeMember[],
  selfGender: ParentPickOption['gender'],
): ParentPickOption[] {
  return members
    .filter((member) => member.role === 'spouse')
    .map((member) => {
      let gender = pickOptionGender(member.gender)
      if (!gender && selfGender === 'male') gender = 'female'
      else if (!gender && selfGender === 'female') gender = 'male'
      return {
        id: member.id,
        displayName: member.displayName,
        gender,
      }
    })
}

function assignSelfToParentSlots(self: ParentPickOption): {
  fathers: ParentPickOption[]
  mothers: ParentPickOption[]
} {
  if (self.gender === 'male') return { fathers: [self], mothers: [] }
  if (self.gender === 'female') return { fathers: [], mothers: [self] }
  return { fathers: [], mothers: [] }
}

export function partitionChildParentOptions(
  self: ParentPickOption | null,
  members: TreeMember[],
): { fathers: ParentPickOption[]; mothers: ParentPickOption[] } {
  const spouses = spouseMembers(members, self?.gender ?? null)
  const selfSlots = self ? assignSelfToParentSlots(self) : { fathers: [], mothers: [] }

  const fathers = [
    ...selfSlots.fathers,
    ...spouses.filter((option) => matchesParentSlot(option.gender, 'father')),
  ]
  const mothers = [
    ...selfSlots.mothers,
    ...spouses.filter((option) => matchesParentSlot(option.gender, 'mother')),
  ]

  return { fathers, mothers }
}

/** Shared parents on the tree — strictly filter father/mother slots so fathers only show in father select and mothers in mother select. */
export function partitionSiblingParentOptions(
  members: TreeMember[],
  currentUserUid?: string | null,
): { fathers: ParentPickOption[]; mothers: ParentPickOption[] } {
  const parents = members
    .filter((member) => member.role === 'parent')
    .filter(
      (member) =>
        !currentUserUid || !member.joinedUid || member.joinedUid !== currentUserUid,
    )

  function parentMatchesSlot(member: TreeMember, slot: 'father' | 'mother'): boolean {
    if (member.parentSlot === 'father') return slot === 'father'
    if (member.parentSlot === 'mother') return slot === 'mother'
    const gender = pickOptionGender(member.gender)
    if (gender === 'male') return slot === 'father'
    if (gender === 'female') return slot === 'mother'
    return false
  }

  const fathers: ParentPickOption[] = parents
    .filter((m) => parentMatchesSlot(m, 'father'))
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      gender: pickOptionGender(m.gender) ?? 'male',
    }))

  const mothers: ParentPickOption[] = parents
    .filter((m) => parentMatchesSlot(m, 'mother'))
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      gender: pickOptionGender(m.gender) ?? 'female',
    }))

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

    if (!hasSelfOnTree() && members.length === 0) {
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
      const gender = pickOptionGender(profile.gender)
      setSelfOption({
        id: 'self',
        displayName: name,
        gender,
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

export function selfCoParentMemberIds(profile: {
  inviteToken?: string
  claimedInviteToken?: string
}): string[] {
  return [profile.claimedInviteToken, profile.inviteToken]
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token))
}

/** Map stored co-parent token back to ParentSelectFields value (`self` or member id). */
export function coParentPickIdFromStored(
  storedId: string | null | undefined,
  selfMemberIds: string[],
): string {
  const id = storedId?.trim()
  if (!id) return ''
  if (selfMemberIds.includes(id)) return 'self'
  return id
}

export async function resolveChildCoParentMemberId(
  user: { uid: string; displayName: string | null; email: string | null },
  pickId: string,
): Promise<string | null> {
  const trimmed = pickId.trim()
  if (!trimmed) return null
  if (trimmed === 'self') {
    const profile = await resolveUserProfileForForm(user)
    return selfCoParentMemberIds(profile)[0] ?? null
  }
  return trimmed
}
