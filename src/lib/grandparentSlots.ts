import type { LineageSide } from './invitations'
import type { ParentKind, ParentSlot } from './siblingRelationship'

export type GrandparentPlacement =
  | 'fathers-father'
  | 'fathers-mother'
  | 'mothers-father'
  | 'mothers-mother'

export const GRANDPARENT_PLACEMENTS: {
  value: GrandparentPlacement
  label: string
}[] = [
  { value: 'fathers-father', label: "Father's father" },
  { value: 'fathers-mother', label: "Father's mother" },
  { value: 'mothers-father', label: "Mother's father" },
  { value: 'mothers-mother', label: "Mother's mother" },
]

export function placementToLineage(placement: GrandparentPlacement): {
  lineageSide: LineageSide
  parentSlot: 'father' | 'mother'
} {
  switch (placement) {
    case 'fathers-father':
      return { lineageSide: 'paternal', parentSlot: 'father' }
    case 'fathers-mother':
      return { lineageSide: 'paternal', parentSlot: 'mother' }
    case 'mothers-father':
      return { lineageSide: 'maternal', parentSlot: 'father' }
    case 'mothers-mother':
      return { lineageSide: 'maternal', parentSlot: 'mother' }
  }
}

/** True when two grandparents would occupy the same tree slot. */
export function grandparentSlotsConflict(
  aSide: LineageSide | null | undefined,
  aSlot: ParentSlot | null | undefined,
  bSide: LineageSide | null | undefined,
  bSlot: ParentSlot | null | undefined,
): boolean {
  if (!aSlot || !bSlot || aSlot === 'unknown' || bSlot === 'unknown') return false
  if (aSlot !== bSlot) return false
  const a = aSide ?? null
  const b = bSide ?? null
  if (a === b) return true
  // Legacy grandparents without a side block any new person in that grandfather/grandmother role.
  if (a === null || b === null) return true
  return false
}

export function grandparentPlacementLabel(placement: GrandparentPlacement): string {
  return GRANDPARENT_PLACEMENTS.find((p) => p.value === placement)?.label ?? placement
}

export function grandparentSlotTaken(
  members: Array<{
    role: string
    parentSlot?: ParentSlot | null
    parentKind?: ParentKind | null
    lineageSide?: LineageSide | null
  }>,
  placement: GrandparentPlacement,
): boolean {
  const { lineageSide, parentSlot } = placementToLineage(placement)
  return members.some((m) => {
    if (m.role !== 'grandparent' || m.parentKind === 'step') return false
    return grandparentSlotsConflict(lineageSide, parentSlot, m.lineageSide, m.parentSlot)
  })
}
