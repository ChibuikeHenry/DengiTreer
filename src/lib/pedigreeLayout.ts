import type { TreeMember } from './familyTreeMembers'
import type { MemberModalKind } from '../pages/HomePage'

/** Fixed geometry (px) for the family-tree canvas. The canvas is scaled to fit its container. */
export const PED = {
  /** width of a person's box (name / role labels live inside it) */
  nodeW: 116,
  /** height of a person's box: avatar + up to three label lines */
  nodeH: 132,
  /** avatar diameter */
  av: 64,
  /** distance between the centres of two neighbouring people on the same row */
  pitch: 144,
  /** vertical space between one row's boxes and the next row's */
  rowGap: 84,
  /** extra breathing room between two separate family units on a row */
  unitGap: 24,
  pad: 28,
  /** how far above the next row the lowest horizontal "bus" line sits */
  busOffset: 42,
  /**
   * Two families whose buses would overlap get separate lanes this far apart, so each
   * family's line stays visibly its own instead of merging into one long bar.
   */
  laneGap: 20,
  /** thickness of the connector lines (thin, light hairlines) */
  line: 1.75,
  /** radius of the rounded elbows where a bus line turns down towards a person */
  corner: 12,
} as const

/** colour of the connector lines */
export const PED_LINE_COLOR = '#a9b4a1'

export type PedNode =
  | { key: string; kind: 'member'; member: TreeMember; x: number; y: number }
  | { key: string; kind: 'self'; x: number; y: number }
  | {
      key: string
      kind: 'add'
      modal: MemberModalKind
      label: string
      x: number
      y: number
    }

export type PedSeg = { x1: number; y1: number; x2: number; y2: number; dashed: boolean }

/**
 * Turns the straight line pieces into smooth SVG paths: where two pieces meet end to end in
 * an "L" (a bus line turning down towards a person) the corner is rounded; T-junctions and
 * crossings stay sharp. Dashed and solid pieces come back as separate paths.
 */
export function buildLinePaths(
  segs: PedSeg[],
  radius: number = PED.corner,
): { solid: string; dashed: string } {
  type Piece = { x1: number; y1: number; x2: number; y2: number; dashed: boolean }
  const pieces: Piece[] = segs
    .filter((g) => g.x1 !== g.x2 || g.y1 !== g.y2)
    .map((g) => ({ ...g }))
  const isH = (g: Piece) => g.y1 === g.y2
  const len = (g: Piece) => Math.abs(g.x2 - g.x1) + Math.abs(g.y2 - g.y1)
  const keyOf = (x: number, y: number) => `${Math.round(x * 10)}:${Math.round(y * 10)}`

  const ends = new Map<string, { piece: number; end: 1 | 2 }[]>()
  pieces.forEach((g, i) => {
    for (const end of [1, 2] as const) {
      const key = keyOf(end === 1 ? g.x1 : g.x2, end === 1 ? g.y1 : g.y2)
      const list = ends.get(key) ?? []
      list.push({ piece: i, end })
      ends.set(key, list)
    }
  })
  const passesThrough = (x: number, y: number) =>
    pieces.some((g) =>
      isH(g)
        ? y === g.y1 && x > Math.min(g.x1, g.x2) && x < Math.max(g.x1, g.x2)
        : x === g.x1 && y > Math.min(g.y1, g.y2) && y < Math.max(g.y1, g.y2),
    )

  /** how far each end of each piece is pulled back to make room for a corner */
  const trim = pieces.map(() => ({ 1: 0, 2: 0 }))
  const corners: { a: number; aEnd: 1 | 2; b: number; bEnd: 1 | 2; r: number }[] = []
  for (const [key, list] of ends) {
    if (list.length !== 2 || list[0].piece === list[1].piece) continue
    const [a, b] = list
    const ga = pieces[a.piece]
    const gb = pieces[b.piece]
    if (isH(ga) === isH(gb) || ga.dashed !== gb.dashed) continue
    const [x, y] = key.split(':').map((v) => Number(v) / 10)
    if (passesThrough(x, y)) continue
    const r = Math.min(radius, len(ga) / 2, len(gb) / 2)
    if (r < 2) continue
    trim[a.piece][a.end] = Math.max(trim[a.piece][a.end], r)
    trim[b.piece][b.end] = Math.max(trim[b.piece][b.end], r)
    corners.push({ a: a.piece, aEnd: a.end, b: b.piece, bEnd: b.end, r })
  }

  const pointAlong = (g: Piece, end: 1 | 2, by: number) => {
    const [fx, fy, tx, ty] = end === 1 ? [g.x1, g.y1, g.x2, g.y2] : [g.x2, g.y2, g.x1, g.y1]
    const d = Math.abs(tx - fx) + Math.abs(ty - fy)
    return { x: fx + ((tx - fx) / d) * by, y: fy + ((ty - fy) / d) * by }
  }
  const num = (v: number) => Number(v.toFixed(2))
  const out = { solid: '', dashed: '' }
  pieces.forEach((g, i) => {
    const a = pointAlong(g, 1, trim[i][1])
    const b = pointAlong(g, 2, trim[i][2])
    out[g.dashed ? 'dashed' : 'solid'] += `M${num(a.x)} ${num(a.y)}L${num(b.x)} ${num(b.y)}`
  })
  for (const c of corners) {
    const ga = pieces[c.a]
    const gb = pieces[c.b]
    const from = pointAlong(ga, c.aEnd, c.r)
    const to = pointAlong(gb, c.bEnd, c.r)
    const corner = c.aEnd === 1 ? { x: ga.x1, y: ga.y1 } : { x: ga.x2, y: ga.y2 }
    out[ga.dashed ? 'dashed' : 'solid'] +=
      `M${num(from.x)} ${num(from.y)}Q${num(corner.x)} ${num(corner.y)} ${num(to.x)} ${num(to.y)}`
  }
  return out
}

export type PedigreeLayout = {
  nodes: PedNode[]
  segs: PedSeg[]
  width: number
  height: number
}

function isStep(member: TreeMember) {
  return member.parentKind === 'step'
}

/** The biological (or, failing that, any) father and mother of a household. */
function primaryCouple(members: TreeMember[]) {
  const father =
    members.find((p) => p.parentSlot === 'father' && !isStep(p)) ??
    members.find((p) => p.parentSlot === 'father')
  const mother =
    members.find((p) => p.parentSlot === 'mother' && !isStep(p)) ??
    members.find((p) => p.parentSlot === 'mother')
  return { father, mother }
}

/** Step partners sit outside the biological couple so a drop line hits father–mother. */
export function orderHousehold(members: TreeMember[]): TreeMember[] {
  const { father: primaryFather, mother: primaryMother } = primaryCouple(members)
  const used = new Set(
    [primaryFather?.id, primaryMother?.id].filter((id): id is string => Boolean(id)),
  )
  const extras = members.filter((p) => !used.has(p.id))
  const left = extras.filter((p) => p.parentSlot === 'mother' || isStep(p))
  const right = extras.filter((p) => !left.includes(p))
  return [
    ...left,
    ...(primaryFather ? [primaryFather] : []),
    ...(primaryMother ? [primaryMother] : []),
    ...right,
  ]
}

/**
 * Where the line to the next generation leaves a household that is laid out centred on `0`.
 * Like the design, it leaves from the middle of the father–mother link, level with the
 * avatars, so it drops through the gap between their labels instead of floating under one.
 * `offset` is relative to the household's centre.
 */
function householdAnchor(ordered: TreeMember[]): { offset: number; atAvatar: boolean } {
  const n = ordered.length
  const { father, mother } = primaryCouple(ordered)
  const fi = father ? ordered.findIndex((p) => p.id === father.id) : -1
  const mi = mother ? ordered.findIndex((p) => p.id === mother.id) : -1
  if (fi >= 0 && mi >= 0 && Math.abs(fi - mi) === 1) {
    return { offset: ((fi + mi) / 2 - (n - 1) / 2) * PED.pitch, atAvatar: true }
  }
  // no clear couple: an even household is centred on a link, an odd one on a person
  return { offset: 0, atAvatar: n % 2 === 0 }
}

/** how many separate bus lanes fit in the normal gap between two rows */
const MAX_LANES = 3

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0

type Target = { x: number; y: number; dashed?: boolean }

/** Spouses who co-parent a child sit next to You so drop lines hit the right couple. */
function orderSpousesAdjacentToSelf(
  spouses: TreeMember[],
  children: TreeMember[],
  selfMemberIds: Set<string>,
): TreeMember[] {
  const linkedIds: string[] = []
  const seen = new Set<string>()
  for (const child of children) {
    for (const raw of [child.sharedMotherMemberId, child.sharedFatherMemberId]) {
      const id = raw?.trim()
      if (!id || selfMemberIds.has(id) || seen.has(id)) continue
      if (spouses.some((s) => s.id === id)) {
        seen.add(id)
        linkedIds.push(id)
      }
    }
  }
  const linkedSet = new Set(linkedIds)
  const linkedSpouses = linkedIds
    .map((id) => spouses.find((s) => s.id === id))
    .filter((s): s is TreeMember => Boolean(s))
  const rest = spouses.filter((s) => !linkedSet.has(s.id))
  return [...linkedSpouses, ...rest]
}

function childCoupleKey(child: TreeMember): string {
  const f = child.sharedFatherMemberId?.trim() ?? ''
  const m = child.sharedMotherMemberId?.trim() ?? ''
  if (!f && !m) return '__legacy__'
  return `${f}|${m}`
}

function coParentX(
  memberId: string | null | undefined,
  selfX: number,
  selfMemberIds: Set<string>,
  memberX: Map<string, number>,
): number | null {
  const id = memberId?.trim()
  if (!id) return null
  if (selfMemberIds.has(id)) return selfX
  const x = memberX.get(id)
  return x ?? null
}

/** Midpoint on the self row for lines to this child's recorded parent(s). */
function childCoupleAnchorX(
  child: TreeMember,
  selfX: number,
  selfMemberIds: Set<string>,
  memberX: Map<string, number>,
  fallbackSpouseX: number | null,
): number {
  const fatherX = coParentX(child.sharedFatherMemberId, selfX, selfMemberIds, memberX)
  const motherX = coParentX(child.sharedMotherMemberId, selfX, selfMemberIds, memberX)
  if (fatherX != null && motherX != null) return (fatherX + motherX) / 2
  if (motherX != null) return (selfX + motherX) / 2
  if (fatherX != null) return (selfX + fatherX) / 2
  if (fallbackSpouseX != null) return (selfX + fallbackSpouseX) / 2
  return selfX
}

/* ------------------------------------------------------------------------------------
   Parent families

   The centre person's parents row used to be derived from "whoever is the first father /
   mother on the list", so changing a father or mother (or who a sibling belongs to) made
   couples pair up with the wrong person and lines hang off the wrong place.

   It is now derived from the links that are actually stored:
     - the centre person's own father / mother (their profile links), and
     - each sibling's shared father / mother.
   Every distinct father+mother pair becomes a "family"; families are then ordered so each
   couple stands side by side, and every sibling is drawn under the family it belongs to.
   ------------------------------------------------------------------------------------ */

export type ParentFamily = {
  key: string
  /** one or two parents, in the order they were linked (father first) */
  parents: TreeMember[]
  /** siblings who belong to this family (the centre person joins the `isSelf` family) */
  kids: TreeMember[]
  isSelf: boolean
}

const present = <T>(value: T | null | undefined): value is T => value != null

/** A stored father/mother link may be an invite token or the claimed account's uid. */
function findLinkedParent(candidates: TreeMember[], link: string | null | undefined) {
  const id = link?.trim()
  if (!id) return null
  return candidates.find((p) => p.id === id || (p.joinedUid && p.joinedUid === id)) ?? null
}

const uniqueById = (list: TreeMember[]) =>
  list.filter((m, i) => list.findIndex((o) => o.id === m.id) === i)

const familyKey = (parents: TreeMember[]) =>
  parents
    .map((p) => p.id)
    .sort()
    .join('|')

/**
 * Who the centre person's father and mother are. The profile's explicit links win; only a
 * tree without any (resolvable) link falls back to guessing from each parent's role.
 */
function resolveSelfParents(
  parents: TreeMember[],
  fatherLink: string | null | undefined,
  motherLink: string | null | undefined,
): { father: TreeMember | null; mother: TreeMember | null; all: TreeMember[] } {
  let father = findLinkedParent(parents, fatherLink)
  let mother = findLinkedParent(parents, motherLink)
  if (!father && !mother) {
    const guess = primaryCouple(parents)
    father = guess.father ?? null
    mother = guess.mother ?? null
  }
  if (father && mother && father.id === mother.id) mother = null
  let all = [father, mother].filter(present)
  if (!all.length && parents[0]) all = [parents[0]]
  return { father, mother, all }
}

function buildParentFamilies(
  parents: TreeMember[],
  siblings: TreeMember[],
  selfParents: TreeMember[],
  selfFather: TreeMember | null,
  selfMother: TreeMember | null,
) {
  const selfFamily: ParentFamily = {
    key: familyKey(selfParents),
    parents: selfParents,
    kids: [],
    isSelf: true,
  }
  const families: ParentFamily[] = [selfFamily]
  const byKey = new Map<string, ParentFamily>([[selfFamily.key, selfFamily]])

  for (const sibling of siblings) {
    // A sibling shares your parents unless told otherwise: a father or mother that was not
    // recorded for them is yours (the same rule their profile page uses to show their parents).
    const linked = uniqueById(
      [
        findLinkedParent(parents, sibling.sharedFatherMemberId) ?? selfFather,
        findLinkedParent(parents, sibling.sharedMotherMemberId) ?? selfMother,
      ].filter(present),
    )
    // no (resolvable) parent recorded: they belong with the centre person
    if (!linked.length) {
      selfFamily.kids.push(sibling)
      continue
    }
    const key = familyKey(linked)
    let family = byKey.get(key)
    if (!family) {
      family = { key, parents: linked, kids: [], isSelf: false }
      byKey.set(key, family)
      families.push(family)
    }
    family.kids.push(sibling)
  }
  return { families, selfFamily }
}

/** father–mother links between parents (couples with children, and step-marriages). */
function buildParentLinks(
  parents: TreeMember[],
  families: ParentFamily[],
  selfFamily: ParentFamily,
) {
  const adj = new Map<string, Set<string>>(parents.map((p) => [p.id, new Set<string>()]))
  const link = (a: string, b: string) => {
    if (a === b) return
    adj.get(a)?.add(b)
    adj.get(b)?.add(a)
  }
  for (const family of families) {
    if (family.parents.length === 2) link(family.parents[0].id, family.parents[1].id)
  }
  // a step-parent with no partner yet is married to the centre person's other parent
  for (const p of parents) {
    if (p.parentKind !== 'step' || adj.get(p.id)?.size) continue
    const partner = selfFamily.parents.find(
      (o) =>
        o.id !== p.id &&
        o.parentKind !== 'step' &&
        (p.parentSlot === 'unknown' || p.parentSlot == null || o.parentSlot !== p.parentSlot),
    )
    if (partner) link(p.id, partner.id)
  }
  return adj
}

/** Lay one connected group of parents out in a line, so linked parents stand side by side. */
function linearizeParentGroup(
  group: TreeMember[],
  adj: Map<string, Set<string>>,
  preferId: string | undefined,
): TreeMember[] {
  if (group.length < 2) return group
  const byId = new Map(group.map((p) => [p.id, p]))
  const visited = new Set<string>()
  const degree = (id: string) => adj.get(id)?.size ?? 0

  /** walk outward from `start`, always stepping to a not-yet-placed partner */
  const walk = (start: string) => {
    const chain: TreeMember[] = []
    let current: string | undefined = start
    while (current && !visited.has(current)) {
      visited.add(current)
      chain.push(byId.get(current) as TreeMember)
      current = [...(adj.get(current) ?? [])].find((id) => !visited.has(id) && byId.has(id))
    }
    return chain
  }

  const hub = group.reduce((best, p) => (degree(p.id) > degree(best.id) ? p : best), group[0])
  if (degree(hub.id) <= 2) {
    // a simple line (or loop): start from one end
    const end = group.find((p) => degree(p.id) === 1) ?? group[0]
    const line = walk(end.id)
    return [...line, ...group.filter((p) => !visited.has(p.id))]
  }

  // one person with several partners sits in the middle, partners alternate left/right
  visited.add(hub.id)
  const partners = [...(adj.get(hub.id) ?? [])]
    .filter((id) => byId.has(id))
    .sort((a, b) => Number(b === preferId) - Number(a === preferId))
  const left: TreeMember[][] = []
  const right: TreeMember[][] = []
  partners.forEach((id, i) => (i % 2 === 0 ? right : left).push(walk(id)))
  const rest = group.filter((p) => !visited.has(p.id) && p.id !== hub.id)
  return [
    ...[...left].reverse().flatMap((chain) => [...chain].reverse()),
    hub,
    ...right.flat(),
    ...rest,
  ]
}

/**
 * Orders the whole parents row. The centre person's own couple goes to the right-hand end
 * (their siblings and they share that side of the row below), other couples sit to its left
 * in the order their children are drawn, and parents with no link at all go furthest left.
 */
function orderParentRow(
  parents: TreeMember[],
  families: ParentFamily[],
  selfFamily: ParentFamily,
) {
  const adj = buildParentLinks(parents, families, selfFamily)
  const seen = new Set<string>()
  const groups: TreeMember[][] = []
  for (const seed of [...selfFamily.parents, ...parents]) {
    if (seen.has(seed.id)) continue
    const group: TreeMember[] = []
    const queue = [seed.id]
    seen.add(seed.id)
    while (queue.length) {
      const id = queue.shift() as string
      const member = parents.find((p) => p.id === id)
      if (member) group.push(member)
      for (const next of adj.get(id) ?? []) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    groups.push(group)
  }

  const selfGroupIndex = selfFamily.parents.length
    ? groups.findIndex((g) => g.some((p) => p.id === selfFamily.parents[0].id))
    : -1
  const selfGroup = selfGroupIndex >= 0 ? groups[selfGroupIndex] : null
  const others = groups.filter((_, i) => i !== selfGroupIndex)

  const fatherBeforeMother = (line: TreeMember[]) =>
    line.length === 2 && line[0].parentSlot === 'mother' && line[1].parentSlot === 'father'
      ? [...line].reverse()
      : line

  // single, unlinked parents are merged into one block so they don't each get a gap
  const loners = others.filter((g) => g.length === 1)
  const couples = others
    .filter((g) => g.length > 1)
    .map((g) => fatherBeforeMother(linearizeParentGroup(g, adj, undefined)))

  let selfLine: TreeMember[] = []
  if (selfGroup) {
    selfLine = linearizeParentGroup(selfGroup, adj, selfFamily.parents.find((p) => p.id !== selfFamily.parents[0].id)?.id)
    const at = selfFamily.parents.map((p) => selfLine.findIndex((o) => o.id === p.id))
    const centre = at.reduce((sum, v) => sum + v, 0) / at.length
    const middle = (selfLine.length - 1) / 2
    const reverse =
      Math.abs(centre - middle) > 0.01
        ? centre < middle
        : at.length === 2 && at[0] > at[1]
    if (reverse) selfLine = [...selfLine].reverse()
  }

  const blocks = [...(loners.length ? [loners.flat()] : []), ...couples, ...(selfLine.length ? [selfLine] : [])]
  return { blocks, adj }
}

type LayoutInput = {
  members: TreeMember[]
  allowAdds: boolean
  /** Invite tokens for the centered person — matches stored co-parent ids for "You". */
  centerSelfMemberIds?: string[]
  /** The centre person's own father / mother (their profile links to a parent on the tree). */
  selfFatherMemberId?: string | null
  selfMotherMemberId?: string | null
  /**
   * Measured height (px) of each person's avatar + labels, by member id (`self` for the centre
   * person). Lines that leave from under a person start right below their real text instead
   * of a guessed spot; until measured, a generous default is used.
   */
  labelHeights?: Record<string, number>
}

/**
 * Lays the tree out. Buses that would have to share a line get their own lane; when a gap
 * between two rows has too little room for the lanes it needs, that gap is widened and the
 * tree is laid out again (lines never get squeezed onto each other or through name labels).
 */
export function buildPedigreeLayout(input: LayoutInput): PedigreeLayout {
  let extraBefore: number[] = []
  let result = layoutPass(input, extraBefore)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = result.laneDemand.map((lanes, row) =>
      Math.max(extraBefore[row] ?? 0, Math.max(0, lanes - MAX_LANES) * PED.laneGap),
    )
    if (next.every((v, i) => v === (extraBefore[i] ?? 0))) break
    extraBefore = next
    result = layoutPass(input, extraBefore)
  }
  return result.layout
}

function layoutPass(
  {
    members,
    allowAdds,
    centerSelfMemberIds = [],
    selfFatherMemberId = null,
    selfMotherMemberId = null,
    labelHeights = {},
  }: LayoutInput,
  /** extra vertical space (px) to add above each row, indexed by row */
  extraBefore: number[],
): { layout: PedigreeLayout; laneDemand: number[] } {
  const selfMemberIds = new Set(
    centerSelfMemberIds.map((id) => id.trim()).filter(Boolean),
  )
  const { nodeW, nodeH, av, pitch, rowGap, unitGap, pad, busOffset, laneGap } = PED
  /** visual height of an "add" circle including its label */
  const addH = av + 26

  const gg = orderHousehold(members.filter((m) => m.role === 'great-grandparent'))
  const gpAll = members.filter((m) => m.role === 'grandparent')
  const parents = members.filter((m) => m.role === 'parent')
  const siblings = members.filter((m) => m.role === 'sibling')
  const spousesRaw = members.filter((m) => m.role === 'spouse')
  const children = members.filter((m) => m.role === 'child')
  const spouses = orderSpousesAdjacentToSelf(spousesRaw, children, selfMemberIds)

  const showGG = gg.length > 0
  const showGP = gpAll.length > 0 || allowAdds || showGG
  const showParents = parents.length > 0 || allowAdds
  const showKids = children.length > 0 || allowAdds

  let rowCount = 0
  const ggRow = showGG ? rowCount++ : -1
  const gpRow = showGP ? rowCount++ : -1
  const parentsRow = showParents ? rowCount++ : -1
  const selfRow = rowCount++
  const kidsRow = showKids ? rowCount++ : -1
  const extraAbove = (row: number) =>
    extraBefore.slice(0, row + 1).reduce((sum, v) => sum + v, 0)
  const rowTop = (row: number) => pad + row * (nodeH + rowGap) + extraAbove(row)
  /** most lanes any bus feeding a row has needed (row index -> lanes) */
  const laneDemand: number[] = []

  const nodes: PedNode[] = []
  const segs: PedSeg[] = []

  // a lone person (or an odd household with no clear couple) leaves from under their label
  const underLabelY = (top: number, id?: string) => {
    const measured = id != null ? labelHeights[id] : undefined
    return top + (measured != null ? measured + 4 : nodeH - 4)
  }

  const vLine = (x: number, y1: number, y2: number, dashed = false) =>
    segs.push({ x1: x, y1: Math.min(y1, y2), x2: x, y2: Math.max(y1, y2), dashed })
  const hLine = (x1: number, x2: number, y: number, dashed = false) =>
    segs.push({ x1: Math.min(x1, x2), y1: y, x2: Math.max(x1, x2), y2: y, dashed })
  /** horizontal link between two avatars on the same row (edge to edge) */
  const hJoin = (xa: number, xb: number, top: number, dashed = false) => {
    const left = Math.min(xa, xb) + av / 2
    const right = Math.max(xa, xb) - av / 2
    if (right > left) hLine(left, right, top + av / 2, dashed)
  }
  /**
   * Horizontal "bus" lanes. Every family gets its own bus; if it would overlap another
   * family's bus on the same row it moves up a lane (further from the children) instead of
   * sharing the line. The first family to ask gets the lowest lane, which keeps verticals of
   * the later (upper-lane) families from ever crossing it.
   */
  const lanesUsed = new Map<number, { x1: number; x2: number }[][]>()
  const takeLane = (baseY: number, x1: number, x2: number) => {
    const lanes = lanesUsed.get(baseY) ?? []
    lanesUsed.set(baseY, lanes)
    const clash = (lane: { x1: number; x2: number }[] | undefined) =>
      Boolean(lane?.some((s) => x1 <= s.x2 + 20 && x2 >= s.x1 - 20))
    let lane = 0
    while (clash(lanes[lane])) lane += 1
    ;(lanes[lane] ??= []).push({ x1, x2 })
    for (let row = 0; row < rowCount; row += 1) {
      if (rowTop(row) - busOffset === baseY) {
        laneDemand[row] = Math.max(laneDemand[row] ?? 0, lane + 1)
      }
    }
    return baseY - lane * laneGap
  }
  /** from a family unit, drop to its own bus, then to each target */
  const bracket = (
    fromX: number,
    fromY: number,
    targets: Target[],
    busBaseY: number,
    dashed = false,
  ) => {
    if (!targets.length) return
    if (targets.length === 1 && Math.abs(targets[0].x - fromX) < 0.5) {
      vLine(fromX, fromY, targets[0].y, dashed || Boolean(targets[0].dashed))
      return
    }
    const xs = [fromX, ...targets.map((t) => t.x)]
    const busY = takeLane(busBaseY, Math.min(...xs), Math.max(...xs))
    vLine(fromX, fromY, busY, dashed)
    hLine(Math.min(...xs), Math.max(...xs), busY, dashed)
    for (const t of targets) vLine(t.x, busY, t.y, dashed || Boolean(t.dashed))
  }

  /* ---------------------------------------------------------------- parents */
  const selfParentLinks = resolveSelfParents(parents, selfFatherMemberId, selfMotherMemberId)
  const { families, selfFamily } = buildParentFamilies(
    parents,
    siblings,
    selfParentLinks.all,
    selfParentLinks.father,
    selfParentLinks.mother,
  )
  const { blocks: parentBlocks, adj: parentLinks } = orderParentRow(parents, families, selfFamily)
  const parentRowOrder = parentBlocks.flat()
  // each parent's place along the row, measured from its left end (blocks get a small gap)
  const parentRel = new Map<string, number>()
  const parentSlotIdx = new Map<string, number>()
  parentBlocks.forEach((block, blockIdx) => {
    block.forEach((p) => {
      const slot = parentSlotIdx.size
      parentSlotIdx.set(p.id, slot)
      parentRel.set(p.id, slot * pitch + blockIdx * unitGap)
    })
  })
  const standNextToEachOther = (a: TreeMember, b: TreeMember) =>
    Math.abs((parentSlotIdx.get(a.id) ?? -9) - (parentSlotIdx.get(b.id) ?? 9)) === 1
  const familyRel = (family: ParentFamily) =>
    family.parents.length ? mean(family.parents.map((p) => parentRel.get(p.id) as number)) : 0

  // siblings sit under the family they belong to: other families left to right (matching
  // their parents' order), then the centre person's own siblings right next to them
  const sideFamilies = families
    .map((family, i) => ({ family, i }))
    .filter(({ family }) => !family.isSelf)
    .sort((a, b) => familyRel(a.family) - familyRel(b.family) || a.i - b.i)
    .map(({ family }) => family)

  /* ------------------------------------------------- self row: sibs / you / spouse */
  type Slot =
    | { kind: 'add'; modal: MemberModalKind; label: string }
    | { kind: 'member'; member: TreeMember }
    | { kind: 'self' }
  // The centre person's own row is laid out first: [… siblings, 2nd spouse, YOU, 1st spouse, 3rd …].
  // Spouses sit on both sides of You so every couple is a neighbouring pair and its drop
  // line never has to cross a third person. Siblings from other families are placed later,
  // once the parents row is known, so each can stand straight under their own parents.
  const slots: Slot[] = []
  selfFamily.kids.forEach((member) => slots.push({ kind: 'member', member }))
  const leftSpouse = spouses.length > 1 ? spouses[1] : null
  const rightSpouses = spouses.filter((_, i) => i !== 1)
  if (leftSpouse) slots.push({ kind: 'member', member: leftSpouse })
  slots.push({ kind: 'self' })
  rightSpouses.forEach((member) => slots.push({ kind: 'member', member }))
  if (allowAdds) slots.push({ kind: 'add', modal: 'spouse', label: 'Add Spouse' })

  const slotX = slots.map((_, i) => i * pitch)
  const selfIdx = slots.findIndex((s) => s.kind === 'self')
  const selfX = slotX[selfIdx]
  const selfTop = rowTop(selfRow)
  const memberX = new Map<string, number>()
  slots.forEach((slot, i) => {
    if (slot.kind === 'member') memberX.set(slot.member.id, slotX[i])
  })
  const pushSelfRowNode = (slot: Slot, x: number) => {
    if (slot.kind === 'self') {
      nodes.push({ key: 'self', kind: 'self', x, y: selfTop })
    } else if (slot.kind === 'member') {
      nodes.push({ key: `m:${slot.member.id}`, kind: 'member', member: slot.member, x, y: selfTop })
    } else {
      nodes.push({
        key: `add:${slot.modal}`,
        kind: 'add',
        modal: slot.modal,
        label: slot.label,
        x,
        y: selfTop,
      })
    }
  }
  slots.forEach((slot, i) => pushSelfRowNode(slot, slotX[i]))

  // you – spouse(s)
  const spouseXs = spouses.map((s) => memberX.get(s.id) as number)
  const rightSpouseXs = rightSpouses.map((s) => memberX.get(s.id) as number)
  if (leftSpouse) hJoin(memberX.get(leftSpouse.id) as number, selfX, selfTop)
  let prevX = selfX
  for (const x of rightSpouseXs) {
    hJoin(prevX, x, selfTop)
    prevX = x
  }
  if (allowAdds) {
    // dashed link to the add circle at the right-hand end of the row
    hJoin(prevX, slotX[slots.length - 1], selfTop, true)
  }

  /** Puts a sibling on the self row (outside the core slots) and remembers where. */
  const placeSibling = (member: TreeMember, x: number) => {
    memberX.set(member.id, x)
    pushSelfRowNode({ kind: 'member', member }, x)
  }
  /** "Add Sibling" sits at the left-hand end, dashed-linked to whoever is next to it. */
  const placeAddSibling = (leftmostSiblingX: number | null) => {
    if (!allowAdds) return
    const leftEdge = Math.min(leftmostSiblingX ?? Infinity, slotX[0])
    const x = leftEdge - pitch
    pushSelfRowNode({ kind: 'add', modal: 'sibling', label: 'Add Sibling' }, x)
    // the next person along is a sibling, or You when nobody stands between
    const next = leftmostSiblingX ?? (leftSpouse ? null : selfX)
    if (next != null) hJoin(x, next, selfTop, true)
  }

  /* --------------------------------------------------------------- parents row */
  const aimX = (() => {
    const kidXs = [...selfFamily.kids.map((s) => memberX.get(s.id) as number), selfX]
    return (Math.min(...kidXs) + Math.max(...kidXs)) / 2
  })()

  const parentsTop = showParents ? rowTop(parentsRow) : 0
  const parentX = new Map<string, number>()
  if (showParents) {
    // the centre person's couple sits right above their own children
    const anchor = selfFamily.parents.length ? familyRel(selfFamily) : 0
    for (const p of parentRowOrder) {
      const x = aimX + (parentRel.get(p.id) as number) - anchor
      parentX.set(p.id, x)
      nodes.push({ key: `m:${p.id}`, kind: 'member', member: p, x, y: parentsTop })
    }
    // Children of other families stand straight under their own parents where there is room;
    // when two groups would collide the left one is nudged further left.
    let rightBound = slotX[0]
    for (const family of [...sideFamilies].reverse()) {
      if (!family.kids.length) continue
      const span = (family.kids.length - 1) * pitch
      const ideal = mean(family.parents.map((p) => parentX.get(p.id) as number))
      const center = Math.min(ideal, rightBound - pitch - unitGap - span / 2)
      family.kids.forEach((kid, j) => placeSibling(kid, center + (j - (family.kids.length - 1) / 2) * pitch))
      rightBound = center - span / 2
    }
    // father–mother (and step-marriage) links between neighbours
    const joinedPairs = new Set<string>()
    for (const [id, partners] of parentLinks) {
      for (const other of partners) {
        const pair = [id, other].sort().join('|')
        if (joinedPairs.has(pair)) continue
        joinedPairs.add(pair)
        const a = parentX.get(id)
        const b = parentX.get(other)
        const adjacent = Math.abs((parentSlotIdx.get(id) ?? -9) - (parentSlotIdx.get(other) ?? 9)) === 1
        if (a != null && b != null && adjacent) hJoin(a, b, parentsTop)
      }
    }
    if (allowAdds) {
      const last = parentRowOrder[parentRowOrder.length - 1]
      const lastX = last ? (parentX.get(last.id) as number) : null
      const x = lastX != null ? lastX + pitch : aimX
      nodes.push({
        key: 'add:parent',
        kind: 'add',
        modal: 'parent',
        label: 'Add Parent',
        x,
        y: parentsTop,
      })
      if (lastX != null) hJoin(lastX, x, parentsTop, true)
    }

    // parents → their children, one bracket per family so lines never share a bus
    const busToSelf = selfTop - busOffset
    const dropOrder = [selfFamily, ...families.filter((f) => !f.isSelf && f.kids.length)]
    for (const family of dropOrder) {
      const kidXs = family.kids.map((s) => memberX.get(s.id) as number)
      if (family.isSelf) kidXs.push(selfX)
      const targets: Target[] = kidXs.map((x) => ({ x, y: selfTop }))
      const xs = family.parents.map((p) => parentX.get(p.id) as number)
      if (xs.length === 0) {
        // no parents on the tree yet: dashed line up to the "Add Parent" circle
        bracket(aimX, parentsTop + addH, targets, busToSelf, true)
      } else if (xs.length === 1) {
        bracket(xs[0], underLabelY(parentsTop, family.parents[0].id), targets, busToSelf)
      } else if (standNextToEachOther(family.parents[0], family.parents[1])) {
        // leave from the middle of the father–mother link
        bracket(mean(xs), parentsTop + av / 2, targets, busToSelf)
      } else {
        // a couple that is not side by side: both drop onto one shared bus
        const all = [...xs, ...kidXs]
        const busY = takeLane(busToSelf, Math.min(...all), Math.max(...all))
        family.parents.forEach((p, i) => vLine(xs[i], underLabelY(parentsTop, p.id), busY))
        hLine(Math.min(...all), Math.max(...all), busY)
        for (const t of targets) vLine(t.x, busY, t.y)
      }
    }
  } else if (selfFamily.kids.length) {
    // no parents on the tree: link the siblings and you with a plain line
    const xs = [...selfFamily.kids.map((s) => memberX.get(s.id) as number), selfX]
    for (let i = 0; i < xs.length - 1; i += 1) {
      const blocked = leftSpouse && (memberX.get(leftSpouse.id) as number) > xs[i] &&
        (memberX.get(leftSpouse.id) as number) < xs[i + 1]
      if (!blocked) hJoin(xs[i], xs[i + 1], selfTop)
    }
  }

  placeAddSibling(
    siblings.length ? Math.min(...siblings.map((s) => memberX.get(s.id) as number)) : null,
  )

  /* ----------------------------------------------------------------- grandparents */
  const gpTop = showGP ? rowTop(gpRow) : 0
  const parentTargetsFor = (key: 'paternal' | 'unsided' | 'maternal'): Target[] => {
    if (!showParents) return []
    const { father: selfFather, mother: selfMother, all: selfParents } = selfParentLinks
    if (!selfParents.length) return [{ x: aimX, y: parentsTop, dashed: true }]
    const px = (m: TreeMember) => parentX.get(m.id) as number
    if (key === 'unsided') {
      // One drop to the father–mother join — never a bus across the whole parent row.
      if (selfFather && selfMother) {
        if (standNextToEachOther(selfFather, selfMother)) {
          return [{ x: (px(selfFather) + px(selfMother)) / 2, y: parentsTop + av / 2 }]
        }
        return [
          { x: px(selfFather), y: parentsTop },
          { x: px(selfMother), y: parentsTop },
        ]
      }
      return [{ x: px(selfFather ?? selfMother ?? selfParents[0]), y: parentsTop }]
    }
    const preferred = key === 'paternal' ? selfFather : selfMother
    if (preferred) return [{ x: px(preferred), y: parentsTop }]
    const fallback = key === 'paternal' ? selfMother : selfFather
    return [{ x: px(fallback ?? selfParents[0]), y: parentsTop, dashed: true }]
  }

  /** Group grandparents for drawing; legacy rows without lineageSide join a side when unambiguous. */
  const bucketGrandparents = (all: TreeMember[]) => {
    const paternal = all.filter((m) => m.lineageSide === 'paternal')
    const maternal = all.filter((m) => m.lineageSide === 'maternal')
    const unsided: TreeMember[] = []
    for (const m of all.filter((g) => !g.lineageSide)) {
      if (m.parentSlot === 'father' && !paternal.length) paternal.push(m)
      else if (m.parentSlot === 'mother' && !maternal.length) maternal.push(m)
      else if (m.parentSlot === 'father' && !paternal.some((p) => p.parentSlot === 'father')) {
        paternal.push(m)
      } else if (m.parentSlot === 'mother' && !maternal.some((p) => p.parentSlot === 'mother')) {
        maternal.push(m)
      } else unsided.push(m)
    }
    return { paternal, maternal, unsided }
  }

  const gpPlaced: { member: TreeMember; x: number }[] = []
  if (showGP) {
    const buckets = bucketGrandparents(gpAll)
    const gpUnits = (
      [
        { key: 'paternal' as const, nodes: buckets.paternal },
        { key: 'unsided' as const, nodes: buckets.unsided },
        { key: 'maternal' as const, nodes: buckets.maternal },
      ] as const
    )
      .map((u) => {
        const ordered = orderHousehold([...u.nodes])
        return { key: u.key, nodes: ordered, anchor: householdAnchor(ordered) }
      })
      .filter((u) => u.nodes.length > 0)

    const targets = gpUnits.map((u) => parentTargetsFor(u.key))
    // each household is placed by its drop line, which should sit right above what it feeds
    const wanted = targets.map((t) => (t.length ? mean(t.map((x) => x.x)) : aimX))
    const half = (n: number) => ((n - 1) / 2) * pitch
    const drops = [...wanted]
    for (let i = 1; i < gpUnits.length; i += 1) {
      const prev = gpUnits[i - 1]
      const cur = gpUnits[i]
      const prevRight = half(prev.nodes.length) - prev.anchor.offset
      const curLeft = -half(cur.nodes.length) - cur.anchor.offset
      drops[i] = Math.max(drops[i], drops[i - 1] + prevRight - curLeft + pitch + unitGap)
    }
    const shift = mean(wanted) - mean(drops)
    const busToParents = parentsTop - busOffset

    gpUnits.forEach((unit, ui) => {
      const dropX = drops[ui] + shift
      const center = dropX - unit.anchor.offset
      const n = unit.nodes.length
      const xs = unit.nodes.map((_, k) => center + (k - (n - 1) / 2) * pitch)
      unit.nodes.forEach((m, k) => {
        nodes.push({ key: `m:${m.id}`, kind: 'member', member: m, x: xs[k], y: gpTop })
        gpPlaced.push({ member: m, x: xs[k] })
        if (k > 0) hJoin(xs[k - 1], xs[k], gpTop)
      })
      const target = targets[ui]
      if (target.length) {
        bracket(
          dropX,
          unit.anchor.atAvatar
            ? gpTop + av / 2
            : underLabelY(gpTop, unit.nodes[Math.floor(n / 2)]?.id),
          target,
          busToParents,
        )
      }
    })

    const gpNodeXs = gpPlaced.map((p) => p.x)
    if (allowAdds && gpAll.length < 4) {
      if (gpNodeXs.length) {
        const x = Math.max(...gpNodeXs) + pitch
        nodes.push({
          key: 'add:grandparent',
          kind: 'add',
          modal: 'grandparent',
          label: 'Add Grandparent',
          x,
          y: gpTop,
        })
        hJoin(Math.max(...gpNodeXs), x, gpTop, true)
      } else {
        nodes.push({
          key: 'add:grandparent',
          kind: 'add',
          modal: 'grandparent',
          label: 'Add Grandparent',
          x: aimX,
          y: gpTop,
        })
        const target = parentTargetsFor('unsided')
        if (target.length) {
          bracket(aimX, gpTop + addH, target, parentsTop - busOffset, true)
        }
      }
    }
  }

  /* ------------------------------------------------------- great-grandparents */
  if (showGG) {
    const ggTop = rowTop(ggRow)
    const ggAll = members.filter((m) => m.role === 'great-grandparent')

    const bucketGreatGrandparents = (all: TreeMember[]) => {
      const paternal = all.filter((m) => m.lineageSide === 'paternal')
      const maternal = all.filter((m) => m.lineageSide === 'maternal')
      const unsided: TreeMember[] = []
      for (const m of all.filter((g) => !g.lineageSide)) {
        if (m.parentSlot === 'father' && !paternal.length) paternal.push(m)
        else if (m.parentSlot === 'mother' && !maternal.length) maternal.push(m)
        else unsided.push(m)
      }
      return { paternal, maternal, unsided }
    }

    const buckets = bucketGreatGrandparents(ggAll)
    const ggUnits = (
      [
        { key: 'paternal' as const, nodes: buckets.paternal },
        { key: 'unsided' as const, nodes: buckets.unsided },
        { key: 'maternal' as const, nodes: buckets.maternal },
      ] as const
    )
      .map((u) => {
        const ordered = orderHousehold([...u.nodes])
        return { key: u.key, nodes: ordered, anchor: householdAnchor(ordered) }
      })
      .filter((u) => u.nodes.length > 0)

    const bloodGP = gpPlaced.filter((p) => !isStep(p.member))
    const availableGP = bloodGP.length ? bloodGP : gpPlaced

    const targetsByUnit = ggUnits.map((u) => {
      const fed = availableGP.filter(
        (p) => u.key === 'unsided' || p.member.lineageSide === u.key,
      )
      const list = fed.length ? fed : availableGP
      if (list.length) {
        return list.map((p) => ({ x: p.x, y: gpTop }))
      }
      return [{ x: aimX, y: gpTop, dashed: true }]
    })

    const wanted = targetsByUnit.map((t) => (t.length ? mean(t.map((x) => x.x)) : aimX))
    const half = (n: number) => ((n - 1) / 2) * pitch
    const drops = [...wanted]
    for (let i = 1; i < ggUnits.length; i += 1) {
      const prev = ggUnits[i - 1]
      const cur = ggUnits[i]
      const prevRight = half(prev.nodes.length) - prev.anchor.offset
      const curLeft = -half(cur.nodes.length) - cur.anchor.offset
      drops[i] = Math.max(drops[i], drops[i - 1] + prevRight - curLeft + pitch + unitGap)
    }
    const shift = mean(wanted) - mean(drops)
    const busToGP = gpTop - busOffset

    ggUnits.forEach((unit, ui) => {
      const dropX = drops[ui] + shift
      const center = dropX - unit.anchor.offset
      const n = unit.nodes.length
      const xs = unit.nodes.map((_, k) => center + (k - (n - 1) / 2) * pitch)
      unit.nodes.forEach((m, k) => {
        nodes.push({ key: `m:${m.id}`, kind: 'member', member: m, x: xs[k], y: ggTop })
        if (k > 0) hJoin(xs[k - 1], xs[k], ggTop)
      })
      const targets = targetsByUnit[ui]
      if (targets.length) {
        bracket(
          dropX,
          unit.anchor.atAvatar
            ? ggTop + av / 2
            : underLabelY(ggTop, unit.nodes[Math.floor(n / 2)]?.id),
          targets,
          busToGP,
        )
      }
    })
  }

  /* ----------------------------------------------------------------- children */
  if (showKids) {
    const kidsTop = rowTop(kidsRow)
    const legacySpouseX = spouseXs[0] ?? null
    /**
     * Where a child group's line really leaves the self row: the middle of the link between
     * You and the co-parent when they stand side by side, otherwise straight down from the
     * lone parent. (Kids may be nudged sideways to avoid overlap; the line must not follow.)
     */
    const sourceFor = (child: TreeMember): { x: number; y: number } => {
      const fatherX = coParentX(child.sharedFatherMemberId, selfX, selfMemberIds, memberX)
      const motherX = coParentX(child.sharedMotherMemberId, selfX, selfMemberIds, memberX)
      const partners = [fatherX, motherX].filter((x): x is number => x != null)
      let others = partners.filter((x) => x !== selfX)
      if (!partners.length && legacySpouseX != null) others = [legacySpouseX]
      if (!others.length) return { x: selfX, y: underLabelY(selfTop, 'self') }
      const adjacent = others.every((x) => Math.abs(x - selfX) <= pitch * 1.01)
      if (!adjacent) {
        const partnerId = [...memberX].find(([, mx]) => mx === others[0])?.[0]
        return { x: others[0], y: underLabelY(selfTop, partnerId) }
      }
      return { x: (selfX + mean(others)) / 2, y: selfTop + av / 2 }
    }

    const coupleGroups = new Map<string, TreeMember[]>()
    for (const child of children) {
      const key = childCoupleKey(child)
      const list = coupleGroups.get(key) ?? []
      list.push(child)
      coupleGroups.set(key, list)
    }

    const sortedGroups = [...coupleGroups.entries()].sort((a, b) => {
      const ax = childCoupleAnchorX(
        a[1][0],
        selfX,
        selfMemberIds,
        memberX,
        legacySpouseX,
      )
      const bx = childCoupleAnchorX(
        b[1][0],
        selfX,
        selfMemberIds,
        memberX,
        legacySpouseX,
      )
      return ax - bx
    })

    /** Right edge (px) of the rightmost placed child node box on this row. */
    let lastGroupRightEdge = -Infinity
    let lastSource: { x: number; y: number } | null = null
    const halfW = nodeW / 2
    sortedGroups.forEach(([, kids]) => {
      const source = sourceFor(kids[0])
      let anchorX = childCoupleAnchorX(
        kids[0],
        selfX,
        selfMemberIds,
        memberX,
        legacySpouseX,
      )
      const groupSpan = Math.max(0, kids.length - 1) * pitch
      const groupLeftEdge = anchorX - groupSpan / 2 - halfW
      if (groupLeftEdge < lastGroupRightEdge + unitGap) {
        anchorX += lastGroupRightEdge + unitGap - groupLeftEdge
      }
      lastGroupRightEdge = anchorX + groupSpan / 2 + halfW

      const groupTargets: Target[] = []
      kids.forEach((member, j) => {
        const x = anchorX + (j - (kids.length - 1) / 2) * pitch
        nodes.push({
          key: `m:${member.id}`,
          kind: 'member',
          member,
          x,
          y: kidsTop,
        })
        groupTargets.push({ x, y: kidsTop })
      })
      bracket(source.x, source.y, groupTargets, kidsTop - busOffset)
      lastSource = source
    })

    if (allowAdds) {
      // "Add Child" hangs off the right-most family so its line never crosses another family's
      const fallbackSource = {
        x: legacySpouseX != null ? (selfX + legacySpouseX) / 2 : selfX,
        y: spouseXs.length ? selfTop + av / 2 : underLabelY(selfTop, 'self'),
      }
      const addSource: { x: number; y: number } = lastSource ?? fallbackSource
      const addAnchorX = addSource.x
      let addX = addAnchorX
      const addLeft = addX - halfW
      if (addLeft < lastGroupRightEdge + unitGap) {
        addX = lastGroupRightEdge + unitGap + halfW
      }
      nodes.push({
        key: 'add:child',
        kind: 'add',
        modal: 'child',
        label: 'Add Child',
        x: addX,
        y: kidsTop,
      })
      bracket(
        addAnchorX,
        addSource.y,
        [{ x: addX, y: kidsTop, dashed: true }],
        kidsTop - busOffset,
      )
    }
  }

  /* ------------------------------------------------------------ normalise to 0,0 */
  const xsAll = [
    ...nodes.flatMap((n) => [n.x - nodeW / 2, n.x + nodeW / 2]),
    ...segs.flatMap((s) => [s.x1, s.x2]),
  ]
  const minX = Math.min(...xsAll)
  const maxX = Math.max(...xsAll)
  const dx = pad - minX

  return {
    laneDemand,
    layout: {
      nodes: nodes.map((n) => ({ ...n, x: n.x + dx })),
      segs: segs.map((s) => ({ ...s, x1: s.x1 + dx, x2: s.x2 + dx })),
      width: maxX - minX + pad * 2,
      height: pad * 2 + rowCount * nodeH + (rowCount - 1) * rowGap + extraAbove(rowCount - 1),
    },
  }
}
