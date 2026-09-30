export type ParentKind = 'biological' | 'step' | 'adoptive'
export type ParentSlot = 'father' | 'mother' | 'unknown'

export type SiblingRelationship =
  | 'brother'
  | 'sister'
  | 'half-brother'
  | 'half-sister'
  | 'step-brother'
  | 'step-sister'
  | 'sibling'

export type ParentLinkIds = {
  fatherMemberId?: string | null
  motherMemberId?: string | null
}

export type ParentMemberMeta = {
  id: string
  parentSlot: ParentSlot
  parentKind: ParentKind
}

const PARENT_KINDS = new Set<ParentKind>(['biological', 'step', 'adoptive'])
const PARENT_SLOTS = new Set<ParentSlot>(['father', 'mother', 'unknown'])

export function parseParentKind(value: unknown): ParentKind {
  const v = String(value ?? '').trim() as ParentKind
  return PARENT_KINDS.has(v) ? v : 'biological'
}

export function parseParentSlot(value: unknown): ParentSlot {
  const v = String(value ?? '').trim() as ParentSlot
  return PARENT_SLOTS.has(v) ? v : 'unknown'
}

export function siblingRelationshipLabel(type: SiblingRelationship): string {
  switch (type) {
    case 'brother':
      return 'Brother'
    case 'sister':
      return 'Sister'
    case 'half-brother':
      return 'Half-brother'
    case 'half-sister':
      return 'Half-sister'
    case 'step-brother':
      return 'Step-brother'
    case 'step-sister':
      return 'Step-sister'
    default:
      return 'Sibling'
  }
}

function normalizeGender(gender: string): 'male' | 'female' | 'other' | null {
  const g = gender.trim().toLowerCase()
  if (g === 'male') return 'male'
  if (g === 'female') return 'female'
  if (g === 'other') return 'other'
  return null
}

function genderedSibling(
  kind: 'full' | 'half' | 'step',
  gender: 'male' | 'female' | 'other' | null,
): SiblingRelationship {
  if (kind === 'full') {
    if (gender === 'female') return 'sister'
    if (gender === 'male') return 'brother'
    return 'sibling'
  }
  if (kind === 'half') {
    if (gender === 'female') return 'half-sister'
    if (gender === 'male') return 'half-brother'
    return 'sibling'
  }
  if (gender === 'female') return 'step-sister'
  if (gender === 'male') return 'step-brother'
  return 'sibling'
}

function isStepParent(meta: ParentMemberMeta | undefined): boolean {
  return meta?.parentKind === 'step'
}

/**
 * Infers brother/sister/half/step from which parents the sibling shares with you
 * versus your linked father/mother on the tree.
 */
export function inferSiblingRelationship(
  siblingGender: string,
  shared: ParentLinkIds,
  _userParents: ParentLinkIds,
  parentMetaById: Map<string, ParentMemberMeta>,
): SiblingRelationship {
  const gender = normalizeGender(siblingGender)
  const sharedFather = shared.fatherMemberId?.trim() || null
  const sharedMother = shared.motherMemberId?.trim() || null

  const stepInvolved =
    isStepParent(sharedFather ? parentMetaById.get(sharedFather) : undefined) ||
    isStepParent(sharedMother ? parentMetaById.get(sharedMother) : undefined)

  // If a step-parent is involved, return step-brother / step-sister
  if (stepInvolved) {
    return genderedSibling('step', gender)
  }

  const hasFather = Boolean(sharedFather)
  const hasMother = Boolean(sharedMother)

  // If both father and mother are selected, they share both parents -> full sibling
  if (hasFather && hasMother) {
    return genderedSibling('full', gender)
  }

  // If only one parent is selected, they share one parent -> half sibling
  if (hasFather || hasMother) {
    return genderedSibling('half', gender)
  }

  // If no parents are selected, default to full sibling
  return genderedSibling('full', gender)
}

export function resolveUserParentLinks(
  profile: { treeFatherMemberId?: string; treeMotherMemberId?: string },
  parentMembers: ParentMemberMeta[],
): ParentLinkIds {
  if (profile.treeFatherMemberId || profile.treeMotherMemberId) {
    return {
      fatherMemberId: profile.treeFatherMemberId ?? null,
      motherMemberId: profile.treeMotherMemberId ?? null,
    }
  }

  const bioFather = parentMembers.find(
    (p) => p.parentSlot === 'father' && p.parentKind !== 'step',
  )
  const bioMother = parentMembers.find(
    (p) => p.parentSlot === 'mother' && p.parentKind !== 'step',
  )
  const anyFather = parentMembers.find((p) => p.parentSlot === 'father')
  const anyMother = parentMembers.find((p) => p.parentSlot === 'mother')

  return {
    fatherMemberId: bioFather?.id ?? anyFather?.id ?? null,
    motherMemberId: bioMother?.id ?? anyMother?.id ?? null,
  }
}

export function parentMetaFromMembers(
  members: Array<{
    id: string
    role: string
    parentSlot?: ParentSlot | null
    parentKind?: ParentKind | null
  }>,
): ParentMemberMeta[] {
  return members
    .filter((m) => m.role === 'parent')
    .map((m) => ({
      id: m.id,
      parentSlot: parseParentSlot(m.parentSlot ?? undefined),
      parentKind: parseParentKind(m.parentKind ?? undefined),
    }))
}
