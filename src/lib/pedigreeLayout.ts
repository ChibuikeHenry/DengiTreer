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

/** Step partners sit outside the biological couple so a drop line hits father–mother. */
export function orderHousehold(members: TreeMember[]): TreeMember[] {
  const primaryFather =
    members.find((p) => p.parentSlot === 'father' && !isStep(p)) ??
    members.find((p) => p.parentSlot === 'father')
  const primaryMother =
    members.find((p) => p.parentSlot === 'mother' && !isStep(p)) ??
    members.find((p) => p.parentSlot === 'mother')
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

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0

type Target = { x: number; y: number; dashed?: boolean }

export function buildPedigreeLayout({
  members,
  allowAdds,
}: {
  members: TreeMember[]
  allowAdds: boolean
}): PedigreeLayout {
  const { nodeW, nodeH, av, pitch, rowGap, unitGap, pad, busOffset } = PED
  /** visual height of an "add" circle including its label */
  const addH = av + 26

  const gg = orderHousehold(members.filter((m) => m.role === 'great-grandparent'))
  const gpAll = members.filter((m) => m.role === 'grandparent')
  const parents = orderHousehold(members.filter((m) => m.role === 'parent'))
  const siblings = members.filter((m) => m.role === 'sibling')
  const spouses = members.filter((m) => m.role === 'spouse')
  const children = members.filter((m) => m.role === 'child')

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
  const primaryFather =
    parents.find((p) => p.parentSlot === 'father' && !isStep(p)) ??
    parents.find((p) => p.parentSlot === 'father')
  const primaryMother =
    parents.find((p) => p.parentSlot === 'mother' && !isStep(p)) ??
    parents.find((p) => p.parentSlot === 'mother')
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
  const parentTargetFor = (key: 'paternal' | 'unsided' | 'maternal'): Target | null => {
    if (!showParents) return null
    if (!parents.length) return { x: aimX, y: parentsTop, dashed: true }
    if (key === 'unsided') {
      return aNodes.length >= 2
        ? { x: aimX, y: parentsTop + av / 2 }
        : { x: parentX.get(aNodes[0].id) as number, y: parentsTop }
    }
    const preferred = key === 'paternal' ? primaryFather : primaryMother
    const fallback = key === 'paternal' ? primaryMother : primaryFather
    const node = preferred ?? fallback ?? aNodes[0]
    return { x: parentX.get(node.id) as number, y: parentsTop, dashed: !preferred }
  }

  const gpNodeXs: number[] = []
  if (showGP) {
    const gpUnits = (
      [
        { key: 'paternal', nodes: gpAll.filter((m) => m.lineageSide === 'paternal') },
        { key: 'unsided', nodes: gpAll.filter((m) => !m.lineageSide) },
        { key: 'maternal', nodes: gpAll.filter((m) => m.lineageSide === 'maternal') },
      ] as const
    )
      .map((u) => ({ key: u.key, nodes: orderHousehold([...u.nodes]) }))
      .filter((u) => u.nodes.length > 0)

    const targets = gpUnits.map((u) => parentTargetFor(u.key))
    const wanted = targets.map((t) => t?.x ?? aimX)
    const centers = [...wanted]
    for (let i = 1; i < gpUnits.length; i += 1) {
      const sep = (gpUnits[i - 1].nodes.length + gpUnits[i].nodes.length) / 2 * pitch + unitGap
      centers[i] = Math.max(centers[i], centers[i - 1] + sep)
    }
    const shift = mean(wanted) - mean(centers)
    const busToParents = parentsTop - busOffset

    gpUnits.forEach((unit, ui) => {
      const center = centers[ui] + shift
      const n = unit.nodes.length
      const xs = unit.nodes.map((_, k) => center + (k - (n - 1) / 2) * pitch)
      unit.nodes.forEach((m, k) => {
        nodes.push({ key: `m:${m.id}`, kind: 'member', member: m, x: xs[k], y: gpTop })
        gpNodeXs.push(xs[k])
        if (k > 0) hJoin(xs[k - 1], xs[k], gpTop)
      })
      const target = targets[ui]
      if (target) {
        bracket(
          center,
          n >= 2 ? gpTop + av / 2 : gpTop + nodeH - 4,
          [target],
          busToParents,
        )
      }
    })

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
        const target = parentTargetFor('unsided')
        if (target) {
          bracket(aimX, gpTop + addH, [target], parentsTop - busOffset, true)
        }
      }
    }
  }

  /* ------------------------------------------------------- great-grandparents */
  if (showGG) {
    const ggTop = rowTop(ggRow)
    const center = gpNodeXs.length ? mean(gpNodeXs) : aimX
    const n = gg.length
    const xs = gg.map((_, k) => center + (k - (n - 1) / 2) * pitch)
    gg.forEach((m, k) => {
      nodes.push({ key: `m:${m.id}`, kind: 'member', member: m, x: xs[k], y: ggTop })
      if (k > 0) hJoin(xs[k - 1], xs[k], ggTop)
    })
    bracket(
      center,
      n >= 2 ? ggTop + av / 2 : ggTop + nodeH - 4,
      gpNodeXs.map((x) => ({ x, y: gpTop })),
      gpTop - busOffset,
    )
  }

  /* ----------------------------------------------------------------- children */
  if (showKids) {
    const kidsTop = rowTop(kidsRow)
    const unitX = spouseXs.length ? (selfX + spouseXs[0]) / 2 : selfX
    const fromY = spouseXs.length ? selfTop + av / 2 : selfTop + nodeH - 4
    const kidSlots: ({ member: TreeMember } | { add: true })[] = [
      ...children.map((member) => ({ member })),
      ...(allowAdds ? [{ add: true as const }] : []),
    ]
    const k = kidSlots.length
    const targets: Target[] = []
    kidSlots.forEach((slot, j) => {
      const x = unitX + (j - (k - 1) / 2) * pitch
      if ('member' in slot) {
        nodes.push({
          key: `m:${slot.member.id}`,
          kind: 'member',
          member: slot.member,
          x,
          y: kidsTop,
        })
        targets.push({ x, y: kidsTop })
      } else {
        nodes.push({
          key: 'add:child',
          kind: 'add',
          modal: 'child',
          label: 'Add Child',
          x,
          y: kidsTop,
        })
        targets.push({ x, y: kidsTop, dashed: true })
      }
    })
    bracket(unitX, fromY, targets, kidsTop - busOffset)
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
