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
    'mommy',
    'dad',
    'daddy',
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

/** Gender-neutral relationship terms shared by every parent (not mom/dad). */
const PARENT_SHARED_ALIASES = [
  'parent',
  'parents',
  'step-parent',
  'stepparent',
  'adoptive parent',
]

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
      add(...PARENT_SHARED_ALIASES)
      if (slot === 'father' || isMale) {
        add('father', 'dad', 'daddy', 'papa', 'step-father', 'stepfather', 'adoptive father')
      } else if (slot === 'mother' || isFemale) {
        add('mother', 'mom', 'mommy', 'mama', 'step-mother', 'stepmother', 'adoptive mother')
      } else {
        // Unknown gender — keep both so relationship search still works.
        add('father', 'dad', 'daddy', 'papa', 'mother', 'mom', 'mommy', 'mama')
      }
      if (kind === 'step') add('step parent', 'step-parent', 'stepparent')
      if (kind === 'adoptive') add('adoptive parent')
      break
    case 'grandparent':
      add('grandparent', 'grandparents')
      if (slot === 'father' || isMale) add('grandfather', 'grandpa', 'step-grandfather')
      else if (slot === 'mother' || isFemale) add('grandmother', 'grandma', 'step-grandmother')
      else add('grandfather', 'grandpa', 'grandmother', 'grandma')
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
      add('great-grandparent', 'great grandparent', 'grandparent', 'grandparents')
      if (slot === 'father' || isMale) add('great-grandfather', 'great grandfather', 'grandfather', 'grandpa')
      else if (slot === 'mother' || isFemale)
        add('great-grandmother', 'great grandmother', 'grandmother', 'grandma')
      else {
        add(
          'great-grandfather',
          'great grandfather',
          'great-grandmother',
          'great grandmother',
          'grandfather',
          'grandma',
          'grandpa',
          'grandmother',
        )
      }
      if (side) add(side)
      break
    case 'child':
      add('child', 'children', 'kid', 'kids')
      if (isMale) add('son')
      else if (isFemale) add('daughter')
      else add('son', 'daughter')
      break
    case 'sibling':
      add('sibling', 'siblings')
      if (member.siblingRelationship) {
        add(siblingRelationshipLabel(member.siblingRelationship), member.siblingRelationship)
      }
      if (isMale) add('brother', 'half-brother', 'half brother', 'step-brother', 'step brother')
      else if (isFemale) add('sister', 'half-sister', 'half sister', 'step-sister', 'step sister')
      else add(...FAMILY_QUERY_ALIASES.sibling)
      break
    case 'spouse':
      add('spouse', 'partner', 'married')
      if (isMale) add('husband')
      else if (isFemale) add('wife')
      else add('husband', 'wife')
      break
    default:
      break
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
  ]
  return normalize(
    parts.filter((p): p is string => Boolean(p && String(p).trim())).join(' '),
  )
}

function selfSearchHaystack(name: string, position: string | null): string {
  return normalize([name, position, 'you', 'self', 'me', 'profile'].filter(Boolean).join(' '))
}

/** True when `token` is a relationship word (exact or clear prefix), not a name that merely contains one. */
function tokenMatchesAlias(token: string, alias: string): boolean {
  if (!token || !alias) return false
  if (token === alias) return true
  // "bro" → brother, "moth" → mother (prefix of alias)
  if (token.length >= 3 && alias.startsWith(token)) return true
  // "daddy" → dad, "mommy" → mom (token extends a short alias)
  if (alias.length >= 3 && token.startsWith(alias) && token.length <= alias.length + 3) return true
  return false
}

function tokenMatchesAnyAlias(token: string, aliases: string[]): boolean {
  return aliases.some((alias) => tokenMatchesAlias(token, alias))
}

function haystackMatchesRelationshipToken(token: string, haystack: string): boolean {
  for (const aliases of Object.values(FAMILY_QUERY_ALIASES)) {
    const normalizedAliases = aliases.map(normalize)
    if (!tokenMatchesAnyAlias(token, normalizedAliases)) continue
    if (normalizedAliases.some((alias) => haystack.includes(alias))) return true
  }
  return false
}

function queryMatchesHaystack(query: string, haystack: string): boolean {
  const q = normalize(query)
  if (!q) return true
  if (haystack.includes(q)) return true

  const tokens = q.split(' ').filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    return true
  }

  // Relationship search: match only when a query *token* is a relationship term.
  // Never use `query.includes(alias)` — that made "Jason" match all sons and
  // "daddy jennifer" match every parent because of the substring "dad".
  const allAliases = Object.values(FAMILY_QUERY_ALIASES).flat().map(normalize)
  const familyWideAliases = FAMILY_QUERY_ALIASES.family.map(normalize)
  const relationshipTokens = tokens.filter((token) => tokenMatchesAnyAlias(token, allAliases))
  const nameTokens = tokens.filter((token) => !relationshipTokens.includes(token))

  if (relationshipTokens.length === 0) return false

  const isFamilyWide = relationshipTokens.every((token) =>
    tokenMatchesAnyAlias(token, familyWideAliases),
  )
  if (isFamilyWide) {
    // "family" / "relative" → everyone; with a name token, filter by name
    return nameTokens.length === 0 || nameTokens.every((token) => haystack.includes(token))
  }

  const relationshipOk = relationshipTokens.every((token) =>
    haystackMatchesRelationshipToken(token, haystack),
  )
  if (!relationshipOk) return false

  // "daddy jennifer" → must be a dad/father AND mention Jennifer
  if (nameTokens.length > 0) {
    return nameTokens.every((token) => haystack.includes(token))
  }

  return true
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
