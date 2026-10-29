import {
  memberRelationshipLabel,
  roleLabel,
  treeMemberRoleLabel,
  type TreeMember,
} from './familyTreeMembers'

export type TreeSearchEntry = {
  key: string
  name: string
  subtitle: string
  kind: 'self' | 'member'
  memberId?: string
}

const FAMILY_QUERY_ALIASES: Record<string, string[]> = {
  parent: ['parent', 'parents', 'mother', 'father', 'mom', 'dad'],
  grandparent: ['grandparent', 'grandparents', 'grandmother', 'grandfather', 'grandma', 'grandpa'],
  child: ['child', 'children', 'son', 'daughter', 'kids'],
  sibling: ['sibling', 'siblings', 'brother', 'sister'],
  spouse: ['spouse', 'husband', 'wife', 'partner'],
  family: ['family', 'relative', 'relatives'],
}

function roleFamilyTerms(role: TreeMember['role']): string[] {
  switch (role) {
    case 'parent':
      return FAMILY_QUERY_ALIASES.parent
    case 'grandparent':
    case 'great-grandparent':
      return [...FAMILY_QUERY_ALIASES.grandparent, 'great-grandparent', 'great grandparent']
    case 'child':
      return FAMILY_QUERY_ALIASES.child
    case 'sibling':
      return FAMILY_QUERY_ALIASES.sibling
    case 'spouse':
      return FAMILY_QUERY_ALIASES.spouse
    default:
      return FAMILY_QUERY_ALIASES.family
  }
}

function memberSearchHaystack(member: TreeMember): string {
  const parts = [
    member.displayName,
    member.firstName,
    member.lastName,
    roleLabel(member.role),
    treeMemberRoleLabel(member),
    memberRelationshipLabel(member),
    member.bio,
    member.parentSlot,
    member.parentKind,
    member.lineageSide,
    member.siblingRelationship,
    member.memberStatus,
    member.gender,
    ...roleFamilyTerms(member.role),
  ]
  return parts
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .join(' ')
    .toLowerCase()
}

function selfSearchHaystack(name: string, position: string | null): string {
  return [name, position, 'you', 'self', 'profile', ...FAMILY_QUERY_ALIASES.family]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function queryMatchesHaystack(query: string, haystack: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (haystack.includes(q)) return true

  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    return tokens.every((token) => haystack.includes(token))
  }

  for (const aliases of Object.values(FAMILY_QUERY_ALIASES)) {
    if (aliases.some((alias) => alias.includes(q) || q.includes(alias))) {
      if (aliases.some((alias) => haystack.includes(alias))) return true
    }
  }

  return false
}

export function buildTreeSearchEntries(options: {
  selfName: string
  selfPosition: string | null
  members: TreeMember[]
  includeSelf: boolean
}): TreeSearchEntry[] {
  const entries: TreeSearchEntry[] = []

  if (options.includeSelf) {
    entries.push({
      key: 'self',
      kind: 'self',
      name: options.selfName.trim() || 'You',
      subtitle: options.selfPosition ? `You · ${options.selfPosition}` : 'Your profile',
    })
  }

  for (const member of options.members) {
    entries.push({
      key: member.id,
      kind: 'member',
      memberId: member.id,
      name: member.displayName,
      subtitle:
        treeMemberRoleLabel(member) +
        (member.memberStatus === 'deceased' ? ' · Deceased' : ''),
    })
  }

  return entries
}

export function filterTreeSearchEntries(
  query: string,
  entries: TreeSearchEntry[],
  members: TreeMember[],
  options: { selfName: string; selfPosition: string | null; includeSelf: boolean },
  limit = 8,
): TreeSearchEntry[] {
  const q = query.trim()
  if (!q) return []

  const memberById = new Map(members.map((m) => [m.id, m]))

  return entries
    .filter((entry) => {
      if (entry.kind === 'self') {
        return queryMatchesHaystack(q, selfSearchHaystack(options.selfName, options.selfPosition))
      }
      const member = entry.memberId ? memberById.get(entry.memberId) : null
      if (!member) return false
      return queryMatchesHaystack(q, memberSearchHaystack(member))
    })
    .slice(0, limit)
}
