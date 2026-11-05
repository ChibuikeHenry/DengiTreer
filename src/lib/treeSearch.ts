import {
  findMemberForParentLink,
  memberRelationshipLabel,
  roleLabel,
  treeMemberRoleLabel,
  type TreeMember,
} from './familyTreeMembers'
import { siblingRelationshipLabel } from './siblingRelationship'

export type TreeSearchEntry = {
  key: string
  name: string
  subtitle: string
  kind: 'self' | 'member'
  memberId?: string
  /** Whose tree hosts this person (deep hits from a relative's tree). */
  treeOwnerUid?: string
  /** How this person relates to you (search + display). */
  relationToYou?: string
}

/** Parse deep-index ids shaped like `via:<treeOwnerUid>:<invitationId>`. */
export function parseDeepSearchMemberId(memberId: string): {
  memberId: string
  treeOwnerUid?: string
} {
  if (!memberId.startsWith('via:')) return { memberId }
  const rest = memberId.slice(4)
  const split = rest.indexOf(':')
  if (split <= 0) return { memberId }
  return {
    treeOwnerUid: rest.slice(0, split),
    memberId: rest.slice(split + 1),
  }
}

const FAMILY_QUERY_ALIASES: Record<string, string[]> = {
  parent: [
    'parent',
    'parents',
    'mother',
    'father',
    'mom',
    'dad',
    'mama',
    'papa',
    'step-mother',
    'stepmother',
    'step-father',
    'stepfather',
    'step-parent',
    'stepparent',
    'adoptive mother',
    'adoptive father',
    'adoptive parent',
  ],
  grandparent: [
    'grandparent',
    'grandparents',
    'grandmother',
    'grandfather',
    'grandma',
    'grandpa',
    'paternal',
    'maternal',
    'paternal grandmother',
    'paternal grandfather',
    'maternal grandmother',
    'maternal grandfather',
    'step-grandmother',
    'step-grandfather',
  ],
  'great-grandparent': [
    'great-grandparent',
    'great grandparent',
    'great-grandmother',
    'great-grandfather',
    'great grandma',
    'great grandpa',
  ],
  child: ['child', 'children', 'son', 'daughter', 'kid', 'kids'],
  sibling: [
    'sibling',
    'siblings',
    'brother',
    'sister',
    'half-brother',
    'half brother',
    'half-sister',
    'half sister',
    'step-brother',
    'step brother',
    'step-sister',
    'step sister',
  ],
  spouse: ['spouse', 'husband', 'wife', 'partner', 'married'],
  family: ['family', 'relative', 'relatives', 'relation', 'relationship'],
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** All phrases that describe this member's relationship to you. */
export function relationshipToYouTerms(member: TreeMember): string[] {
  const terms = new Set<string>()
  const add = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      if (!value?.trim()) continue
      terms.add(normalize(value))
    }
  }

  const role = treeMemberRoleLabel(member)
  const rel = memberRelationshipLabel(member)
  add(role, rel, roleLabel(member.role), member.role)

  const gender = (member.gender || '').toLowerCase()
  const isMale = gender === 'male' || gender === 'm'
  const isFemale = gender === 'female' || gender === 'f'
  const side = member.lineageSide
  const kind = member.parentKind
  const slot = member.parentSlot

  switch (member.role) {
    case 'parent':
      add(...FAMILY_QUERY_ALIASES.parent)
      if (slot === 'father' || isMale) add('father', 'dad', 'papa')
      if (slot === 'mother' || isFemale) add('mother', 'mom', 'mama')
      if (kind === 'step') add('step parent', 'step-parent', 'stepparent')
      if (kind === 'adoptive') add('adoptive parent')
      break
    case 'grandparent':
      add(...FAMILY_QUERY_ALIASES.grandparent)
      if (slot === 'father' || isMale) add('grandfather', 'grandpa')
      if (slot === 'mother' || isFemale) add('grandmother', 'grandma')
      if (side === 'paternal') {
        add('paternal', 'fathers side', "father's side")
        if (slot === 'father' || isMale) add('paternal grandfather')
        if (slot === 'mother' || isFemale) add('paternal grandmother')
      }
      if (side === 'maternal') {
        add('maternal', 'mothers side', "mother's side")
        if (slot === 'father' || isMale) add('maternal grandfather')
        if (slot === 'mother' || isFemale) add('maternal grandmother')
      }
      break
    case 'great-grandparent':
      add(...FAMILY_QUERY_ALIASES['great-grandparent'], ...FAMILY_QUERY_ALIASES.grandparent)
      if (slot === 'father' || isMale) add('great-grandfather', 'great grandfather')
      if (slot === 'mother' || isFemale) add('great-grandmother', 'great grandmother')
      if (side) add(side)
      break
    case 'child':
      add(...FAMILY_QUERY_ALIASES.child)
      if (isMale) add('son')
      if (isFemale) add('daughter')
      break
    case 'sibling':
      add(...FAMILY_QUERY_ALIASES.sibling)
      if (member.siblingRelationship) {
        add(siblingRelationshipLabel(member.siblingRelationship), member.siblingRelationship)
      }
      if (isMale) add('brother')
      if (isFemale) add('sister')
      break
    case 'spouse':
      add(...FAMILY_QUERY_ALIASES.spouse)
      if (isMale) add('husband')
      if (isFemale) add('wife')
      break
    default:
      add(...FAMILY_QUERY_ALIASES.family)
  }

  return [...terms]
}

function linkedRelativeNames(member: TreeMember, members: TreeMember[]): string[] {
  const names: string[] = []
  const father = findMemberForParentLink(members, member.sharedFatherMemberId)
  const mother = findMemberForParentLink(members, member.sharedMotherMemberId)
  if (father?.displayName) {
    names.push(father.displayName, father.firstName, `child of ${father.displayName}`)
  }
  if (mother?.displayName) {
    names.push(mother.displayName, mother.firstName, `child of ${mother.displayName}`)
  }
  if (father && mother) {
    names.push(`child of ${father.displayName} and ${mother.displayName}`)
  }
  return names
}

function memberSearchHaystack(member: TreeMember, members: TreeMember[]): string {
  const parts = [
    member.displayName,
    member.firstName,
    member.lastName,
    member.bio,
    member.parentSlot,
    member.parentKind,
    member.lineageSide,
    member.siblingRelationship,
    member.memberStatus,
    member.gender,
    member.inviteeEmail,
    member.dateOfBirth,
    member.dateOfDeath,
    ...relationshipToYouTerms(member),
    ...linkedRelativeNames(member, members),
    ...FAMILY_QUERY_ALIASES.family,
  ]
  return normalize(
    parts.filter((p): p is string => Boolean(p && String(p).trim())).join(' '),
  )
}

function selfSearchHaystack(name: string, position: string | null): string {
  return normalize(
    [name, position, 'you', 'self', 'me', 'profile', ...FAMILY_QUERY_ALIASES.family]
      .filter(Boolean)
      .join(' '),
  )
}

function queryMatchesHaystack(query: string, haystack: string): boolean {
  const q = normalize(query)
  if (!q) return true
  if (haystack.includes(q)) return true

  const tokens = q.split(' ').filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    return true
  }

  for (const aliases of Object.values(FAMILY_QUERY_ALIASES)) {
    const normalizedAliases = aliases.map(normalize)
    const queryHitsAlias = normalizedAliases.some(
      (alias) => alias.includes(q) || q.includes(alias) || tokens.every((t) => alias.includes(t)),
    )
    if (!queryHitsAlias) continue
    if (normalizedAliases.some((alias) => haystack.includes(alias))) return true
  }

  return false
}

function matchScore(query: string, name: string, haystack: string): number {
  const q = normalize(query)
  const n = normalize(name)
  if (!q) return 0
  if (n === q) return 100
  if (n.startsWith(q)) return 90
  if (n.includes(q)) return 80
  if (haystack.includes(q)) return 60
  const tokens = q.split(' ').filter(Boolean)
  if (tokens.length > 1 && tokens.every((t) => haystack.includes(t))) return 50
  return 40
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
      relationToYou: 'You',
    })
  }

  for (const member of options.members) {
    const relation = treeMemberRoleLabel(member)
    const deep = parseDeepSearchMemberId(member.id)
    const viaNote = member.bio.includes('Related via')
      ? member.bio.split('Related via').pop()?.trim()
      : null
    entries.push({
      key: member.id,
      kind: 'member',
      memberId: deep.memberId,
      treeOwnerUid: deep.treeOwnerUid,
      name: member.displayName,
      relationToYou: relation,
      subtitle:
        relation +
        (viaNote ? ` · via ${viaNote}` : '') +
        (member.memberStatus === 'deceased' ? ' · Deceased' : '') +
        (member.inviteStatus === 'pending' ? ' · Invite pending' : ''),
    })
  }

  return entries
}

export function filterTreeSearchEntries(
  query: string,
  entries: TreeSearchEntry[],
  members: TreeMember[],
  options: { selfName: string; selfPosition: string | null; includeSelf: boolean },
  limit = 50,
): TreeSearchEntry[] {
  const q = query.trim()
  if (!q) return []

  const memberById = new Map(members.map((m) => [m.id, m]))

  const matched = entries
    .map((entry) => {
      if (entry.kind === 'self') {
        const haystack = selfSearchHaystack(options.selfName, options.selfPosition)
        if (!queryMatchesHaystack(q, haystack)) return null
        return { entry, score: matchScore(q, entry.name, haystack) }
      }
      // Prefer full index key (includes via:<owner>:<id> for deep hits).
      const member = memberById.get(entry.key) ??
        (entry.memberId ? memberById.get(entry.memberId) : null)
      if (!member) return null
      const haystack = memberSearchHaystack(member, members)
      if (!queryMatchesHaystack(q, haystack)) return null
      return { entry, score: matchScore(q, entry.name, haystack) }
    })
    .filter((row): row is { entry: TreeSearchEntry; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map((row) => row.entry)

  if (limit <= 0) return matched
  return matched.slice(0, limit)
}
