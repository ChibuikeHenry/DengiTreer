export type MemberPrivacy =
  | 'family_members'
  | 'immediate_family'
  | 'only_me'
  | 'network'

export const DEFAULT_MEMBER_PRIVACY: MemberPrivacy = 'family_members'

export const MEMBER_PRIVACY_OPTIONS: ReadonlyArray<{
  value: MemberPrivacy
  label: string
}> = [
  { value: 'family_members', label: 'Family members only' },
  { value: 'immediate_family', label: 'Immediate family only' },
  { value: 'only_me', label: 'Only me' },
  { value: 'network', label: 'Everyone in my network' },
] as const

export function isMemberPrivacy(value: unknown): value is MemberPrivacy {
  return (
    typeof value === 'string' &&
    MEMBER_PRIVACY_OPTIONS.some((option) => option.value === value)
  )
}

export function parseMemberPrivacy(value: unknown): MemberPrivacy {
  return isMemberPrivacy(value) ? value : DEFAULT_MEMBER_PRIVACY
}

export function memberPrivacyLabel(value: unknown): string {
  const privacy = parseMemberPrivacy(value)
  return (
    MEMBER_PRIVACY_OPTIONS.find((option) => option.value === privacy)?.label ??
    MEMBER_PRIVACY_OPTIONS[0].label
  )
}

const MEMBER_PRIVACY_SHORT: Record<MemberPrivacy, string> = {
  family_members: 'Family',
  immediate_family: 'Immediate',
  only_me: 'Private',
  network: 'Network',
}

export function memberPrivacyShortLabel(value: unknown): string {
  const privacy = parseMemberPrivacy(value)
  return MEMBER_PRIVACY_SHORT[privacy]
}
