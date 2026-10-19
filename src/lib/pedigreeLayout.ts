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
  rowGap: 64,
  /** extra breathing room between two separate family units on a row */
  unitGap: 24,
  pad: 28,
  /** how far above the next row the horizontal "bus" line sits */
  busOffset: 30,
  /** thickness of the connector lines (the Figma uses thin hairlines) */
  line: 2,
} as const

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

export function buildPedigreeLayout({
  members,
  allowAdds,
  centerSelfMemberIds = [],
}: {
  members: TreeMember[]
  allowAdds: boolean
  /** Invite tokens for the centered person — matches stored co-parent ids for "You". */
  centerSelfMemberIds?: string[]
}): PedigreeLayout {
  const selfMemberIds = new Set(
    centerSelfMemberIds.map((id) => id.trim()).filter(Boolean),
  )
  const { nodeW, nodeH, av, pitch, rowGap, unitGap, pad, busOffset } = PED
  /** visual height of an "add" circle including its label */
  const addH = av + 26

  const gg = orderHousehold(members.filter((m) => m.role === 'great-grandparent'))
  const gpAll = members.filter((m) => m.role === 'grandparent')
  const parents = orderHousehold(members.filter((m) => m.role === 'parent'))
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
  const rowTop = (row: number) => pad + row * (nodeH + rowGap)

  const nodes: PedNode[] = []
  const segs: PedSeg[] = []

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
  /** from a family unit, drop to a shared bus, then to each target */
  const bracket = (
    fromX: number,
    fromY: number,
    targets: Target[],
    busY: number,
    dashed = false,
  ) => {
    if (!targets.length) return
    if (targets.length === 1 && Math.abs(targets[0].x - fromX) < 0.5) {
      vLine(fromX, fromY, targets[0].y, dashed || Boolean(targets[0].dashed))
      return
    }
    vLine(fromX, fromY, busY, dashed)
    const xs = [fromX, ...targets.map((t) => t.x)]
    hLine(Math.min(...xs), Math.max(...xs), busY, dashed)
    for (const t of targets) vLine(t.x, busY, t.y, dashed || Boolean(t.dashed))
  }

  /* ---------------------------------------------------------------- parents */
  const { father: primaryFather, mother: primaryMother } = primaryCouple(parents)
  let aNodes = [primaryFather, primaryMother].filter((m): m is TreeMember => Boolean(m))
  if (!aNodes.length && parents[0]) aNodes = [parents[0]]
  const parentIdx = (m: TreeMember) => parents.findIndex((p) => p.id === m.id)
  const aCenterIdx = aNodes.length ? mean(aNodes.map(parentIdx)) : 0

  // a step (or additional) parent forms its own couple with the adjacent primary parent
  const bUnits = parents
    .filter((p) => !aNodes.some((a) => a.id === p.id))
    .flatMap((p) => {
      const partner = aNodes.find((a) => Math.abs(parentIdx(a) - parentIdx(p)) === 1)
      if (!partner) return []
      return [
        {
          key: p.id,
          nodes: [p, partner] as TreeMember[],
          centerIdx: (parentIdx(p) + parentIdx(partner)) / 2,
        },
      ]
    })

  const siblingUnit = (s: TreeMember) => {
    const ids = [s.sharedFatherMemberId, s.sharedMotherMemberId].filter(Boolean)
    return bUnits.find((u) => ids.includes(u.key))?.key ?? 'A'
  }
  const unitCenterIdx = (key: string) =>
    key === 'A' ? aCenterIdx : (bUnits.find((u) => u.key === key)?.centerIdx ?? aCenterIdx)
  // siblings are grouped under the couple they belong to, left to right
  const orderedSiblings = siblings
    .map((s, i) => ({ s, i, idx: unitCenterIdx(siblingUnit(s)) }))
    .sort((a, b) => a.idx - b.idx || a.i - b.i)
    .map((entry) => entry.s)

  /* ------------------------------------------------- self row: sibs / you / spouse */
  type Slot =
    | { kind: 'add'; modal: MemberModalKind; label: string }
    | { kind: 'member'; member: TreeMember }
    | { kind: 'self' }
  const slots: Slot[] = []
  if (allowAdds) slots.push({ kind: 'add', modal: 'sibling', label: 'Add Sibling' })
  orderedSiblings.forEach((member) => slots.push({ kind: 'member', member }))
  slots.push({ kind: 'self' })
  spouses.forEach((member) => slots.push({ kind: 'member', member }))
  if (allowAdds) slots.push({ kind: 'add', modal: 'spouse', label: 'Add Spouse' })

  const slotX = slots.map((_, i) => i * pitch)
  const selfIdx = slots.findIndex((s) => s.kind === 'self')
  const selfX = slotX[selfIdx]
  const selfTop = rowTop(selfRow)
  const memberX = new Map<string, number>()
  slots.forEach((slot, i) => {
    if (slot.kind === 'member') memberX.set(slot.member.id, slotX[i])
  })

  slots.forEach((slot, i) => {
    if (slot.kind === 'self') {
      nodes.push({ key: 'self', kind: 'self', x: slotX[i], y: selfTop })
    } else if (slot.kind === 'member') {
      nodes.push({
        key: `m:${slot.member.id}`,
        kind: 'member',
        member: slot.member,
        x: slotX[i],
        y: selfTop,
      })
    } else {
      nodes.push({
        key: `add:${slot.modal}`,
        kind: 'add',
        modal: slot.modal,
        label: slot.label,
        x: slotX[i],
        y: selfTop,
      })
    }
  })

  // you – spouse(s)
  const spouseXs = spouses.map((s) => memberX.get(s.id) as number)
  let prevX = selfX
  for (const x of spouseXs) {
    hJoin(prevX, x, selfTop)
    prevX = x
  }
  if (allowAdds) {
    // dashed links to the add circles at each end of the row
    hJoin(slotX[0], slotX[1], selfTop, true)
    hJoin(prevX, slotX[slots.length - 1], selfTop, true)
  }

  /* --------------------------------------------------------------- parents row */
  const aSiblingXs = orderedSiblings
    .filter((s) => siblingUnit(s) === 'A')
    .map((s) => memberX.get(s.id) as number)
  const aKidXs = [...aSiblingXs, selfX]
  const aimX = (Math.min(...aKidXs) + Math.max(...aKidXs)) / 2

  const parentsTop = showParents ? rowTop(parentsRow) : 0
  const parentX = new Map<string, number>()
  if (showParents) {
    parents.forEach((p, i) => {
      const x = aimX + (i - aCenterIdx) * pitch
      parentX.set(p.id, x)
      nodes.push({ key: `m:${p.id}`, kind: 'member', member: p, x, y: parentsTop })
    })
    parents.forEach((p, i) => {
      if (i < parents.length - 1) {
        hJoin(parentX.get(p.id) as number, parentX.get(parents[i + 1].id) as number, parentsTop)
      }
    })
    if (allowAdds) {
      const x = aimX + (parents.length - aCenterIdx) * pitch
      nodes.push({
        key: 'add:parent',
        kind: 'add',
        modal: 'parent',
        label: 'Add Parent',
        x,
        y: parentsTop,
      })
      if (parents.length) {
        hJoin(parentX.get(parents[parents.length - 1].id) as number, x, parentsTop, true)
      }
    }

    // parents → siblings & you
    const busToSelf = selfTop - busOffset
    const aFromY =
      aNodes.length >= 2
        ? parentsTop + av / 2
        : aNodes.length === 1
          ? parentsTop + nodeH - 4
          : parentsTop + addH
    bracket(
      aimX,
      aFromY,
      [...aSiblingXs, selfX].map((x) => ({ x, y: selfTop })),
      busToSelf,
      aNodes.length === 0,
    )
    for (const unit of bUnits) {
      const xs = unit.nodes.map((m) => parentX.get(m.id) as number)
      const kidXs = orderedSiblings
        .filter((s) => siblingUnit(s) === unit.key)
        .map((s) => memberX.get(s.id) as number)
      bracket(
        mean(xs),
        parentsTop + av / 2,
        kidXs.map((x) => ({ x, y: selfTop })),
        busToSelf,
      )
    }
  } else if (orderedSiblings.length) {
    // no parents on the tree: link the siblings and you with a plain line
    const xs = [...orderedSiblings.map((s) => memberX.get(s.id) as number), selfX]
    for (let i = 0; i < xs.length - 1; i += 1) hJoin(xs[i], xs[i + 1], selfTop)
  }

  /* ----------------------------------------------------------------- grandparents */
  const gpTop = showGP ? rowTop(gpRow) : 0
  const parentTargetsFor = (key: 'paternal' | 'unsided' | 'maternal'): Target[] => {
    if (!showParents) return []
    if (!parents.length) return [{ x: aimX, y: parentsTop, dashed: true }]
    if (key === 'unsided') {
      // One drop to the bio father–mother join — never a bus across the whole parent row.
      const { father: pf, mother: pm } = primaryCouple(parents)
      if (pf && pm) {
        const fx = parentX.get(pf.id) as number
        const mx = parentX.get(pm.id) as number
        return [{ x: (fx + mx) / 2, y: parentsTop + av / 2 }]
      }
      const one = pf ?? pm ?? aNodes[0]
      if (one) return [{ x: parentX.get(one.id) as number, y: parentsTop }]
      return [{ x: aimX, y: parentsTop, dashed: true }]
    }
    const preferred = key === 'paternal' ? primaryFather : primaryMother
    if (preferred) {
      return [{ x: parentX.get(preferred.id) as number, y: parentsTop }]
    }
    const fallback = key === 'paternal' ? primaryMother : primaryFather
    const node = fallback ?? aNodes[0]
    if (!node) return [{ x: aimX, y: parentsTop, dashed: true }]
    return [{ x: parentX.get(node.id) as number, y: parentsTop, dashed: true }]
  }
  // a lone person (or an odd household with no clear couple) leaves from under their label
  const underLabelY = (top: number) => top + nodeH - 4

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
          unit.anchor.atAvatar ? gpTop + av / 2 : underLabelY(gpTop),
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
          unit.anchor.atAvatar ? ggTop + av / 2 : underLabelY(ggTop),
          targets,
          busToGP,
        )
      }
    })
  }

  /* ----------------------------------------------------------------- children */
  if (showKids) {
    const kidsTop = rowTop(kidsRow)
    const fromY = spouseXs.length ? selfTop + av / 2 : selfTop + nodeH - 4
    const legacySpouseX = spouseXs[0] ?? null

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

    let lastGroupRight = -Infinity
    sortedGroups.forEach(([, kids]) => {
      let anchorX = childCoupleAnchorX(
        kids[0],
        selfX,
        selfMemberIds,
        memberX,
        legacySpouseX,
      )
      const groupSpan = Math.max(0, kids.length - 1) * pitch
      const groupLeft = anchorX - groupSpan / 2
      if (groupLeft < lastGroupRight + unitGap) {
        anchorX += lastGroupRight + unitGap - groupLeft
      }
      lastGroupRight = anchorX + groupSpan / 2

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
      bracket(anchorX, fromY, groupTargets, kidsTop - busOffset)
    })

    if (allowAdds) {
      const addAnchorX =
        legacySpouseX != null ? (selfX + legacySpouseX) / 2 : selfX
      let addX = addAnchorX
      if (addX <= lastGroupRight + unitGap) {
        addX = lastGroupRight + unitGap + pitch / 2
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
        fromY,
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
    nodes: nodes.map((n) => ({ ...n, x: n.x + dx })),
    segs: segs.map((s) => ({ ...s, x1: s.x1 + dx, x2: s.x2 + dx })),
    width: maxX - minX + pad * 2,
    height: pad * 2 + rowCount * nodeH + (rowCount - 1) * rowGap,
  }
}