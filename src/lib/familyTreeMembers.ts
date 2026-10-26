import type { InviteRole } from './invitations'
import {
  DEFAULT_MEMBER_PRIVACY,
  parseMemberPrivacy,
  type MemberPrivacy,
} from './memberPrivacy'
import {
  genderForSiblingRelationship,
  genderFromParentSlot,
  siblingRelationshipLabel,
  type ParentKind,
  type ParentSlot,
  type SiblingRelationship,
} from './siblingRelationship'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { subscribeSentInvitations, type InvitationRecord } from './invitations'
import {
  canInviterEditInvitation,
  canInviterRemoveFromTree,
  isProfileClaimed,
} from './profileClaim'
import { fetchUserProfile } from './userProfile'
import { setSelfOnTree } from './treeStorage'

export type TreeMember = {
  id: string
  firstName: string
  lastName: string
  displayName: string
  role: InviteRole
  photoURL: string | null
  memberStatus: 'living' | 'deceased'
  inviteStatus: 'pending' | 'joined'
  joinedUid: string | null
  profileClaimed: boolean
  inviterCanEdit: boolean
  inviterCanRemove: boolean
  privacy: MemberPrivacy
  bio: string
  parentSlot: ParentSlot | null
  parentKind: ParentKind | null
  /** Grandparents only: paternal = your father's parent, maternal = your mother's parent. */
  lineageSide?: 'paternal' | 'maternal' | null
  sharedFatherMemberId: string | null
  sharedMotherMemberId: string | null
  siblingRelationship: SiblingRelationship | null
  dateOfBirth: string | null
  dateOfDeath: string | null
  inviteeEmail: string | null
  gender: string | null
}

export function findMemberForParentLink(
  members: TreeMember[],
  linkId: string | null | undefined,
): TreeMember | null {
  const id = linkId?.trim()
  if (!id) return null
  return members.find((m) => m.id === id || m.joinedUid === id) ?? null
}

/** Resolve father/mother member ids for siblings (and stored links for others). */
export function resolveSharedParentLinkIds(
  member: Pick<TreeMember, 'role' | 'sharedFatherMemberId' | 'sharedMotherMemberId'>,
  treeOwnerProfile: { treeFatherMemberId?: string; treeMotherMemberId?: string } | null,
): { fatherId: string | null; motherId: string | null } {
  let fatherId = member.sharedFatherMemberId?.trim() || null
  let motherId = member.sharedMotherMemberId?.trim() || null

  if (member.role === 'sibling' && treeOwnerProfile && !fatherId && !motherId) {
    fatherId = treeOwnerProfile.treeFatherMemberId?.trim() || null
    motherId = treeOwnerProfile.treeMotherMemberId?.trim() || null
  }

  return { fatherId, motherId }
}

export function resolveSharedParentMembers(
  member: TreeMember,
  members: TreeMember[],
  treeOwnerProfile: { treeFatherMemberId?: string; treeMotherMemberId?: string } | null,
): { father: TreeMember | null; mother: TreeMember | null } {
  const { fatherId, motherId } = resolveSharedParentLinkIds(member, treeOwnerProfile)
  let father = findMemberForParentLink(members, fatherId)
  let mother = findMemberForParentLink(members, motherId)

  if (member.role === 'sibling' && treeOwnerProfile) {
    if (!father && treeOwnerProfile.treeFatherMemberId?.trim()) {
      father = findMemberForParentLink(members, treeOwnerProfile.treeFatherMemberId)
    }
    if (!mother && treeOwnerProfile.treeMotherMemberId?.trim()) {
      mother = findMemberForParentLink(members, treeOwnerProfile.treeMotherMemberId)
    }
  }

  return { father, mother }
}

const treeRoles = new Set<InviteRole>([
  'spouse',
  'parent',
  'grandparent',
  'great-grandparent',
  'child',
  'sibling',
])

export function mapInvitationToTreeMember(record: InvitationRecord): TreeMember | null {
  if (!treeRoles.has(record.role)) return null

  const firstName =
    record.inviteeFirstName?.trim() ||
    record.inviteeName?.trim().split(/\s+/)[0] ||
    ''
  const lastName =
    record.inviteeLastName?.trim() ||
    record.inviteeName?.trim().split(/\s+/).slice(-1)[0] ||
    ''
  const displayName =
    record.inviteeName?.trim() ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    'Family member'

  const claimed = isProfileClaimed(record)

  return {
    id: record.id,
    firstName,
    lastName,
    displayName,
    role: record.role,
    photoURL: record.photoURL,
    memberStatus: record.memberStatus,
    inviteStatus: record.status,
    joinedUid: record.joinedUid,
    profileClaimed: claimed,
    inviterCanEdit: canInviterEditInvitation(record),
    inviterCanRemove: canInviterRemoveFromTree(record),
    privacy: record.privacy,
    bio: record.bio,
    parentSlot: record.parentSlot,
    parentKind: record.parentKind,
    lineageSide: record.lineageSide,
    sharedFatherMemberId: record.sharedFatherMemberId,
    sharedMotherMemberId: record.sharedMotherMemberId,
    siblingRelationship: record.siblingRelationship,
    dateOfBirth: record.dateOfBirth,
    dateOfDeath: record.dateOfDeath,
    inviteeEmail: record.inviteeEmail,
    gender: resolveTreeMemberGender({
      gender: record.gender,
      parentSlot: record.parentSlot,
      role: record.role,
      siblingRelationship: record.siblingRelationship,
    }),
  }
}

/** Form/display gender: stored value, else infer from parent role or sibling relationship. */
export function resolveTreeMemberGender(member: {
  gender?: string | null
  parentSlot?: ParentSlot | null
  role?: InviteRole | string
  siblingRelationship?: SiblingRelationship | null
}): string | null {
  const stored = normalizeTreeMemberGender(member.gender)
  if (stored) return stored
  if (member.role === 'parent') {
    return genderFromParentSlot(member.parentSlot)
  }
  if (member.siblingRelationship) {
    return (
      genderFromSiblingRelationship(member.siblingRelationship) ??
      genderForSiblingRelationship(member.siblingRelationship)
    )
  }
  return null
}

function genderFromSiblingRelationship(
  rel: SiblingRelationship | null | undefined,
): 'male' | 'female' | null {
  if (rel === 'brother' || rel === 'half-brother' || rel === 'step-brother') return 'male'
  if (rel === 'sister' || rel === 'half-sister' || rel === 'step-sister') return 'female'
  return null
}

async function enrichClaimedMember(member: TreeMember): Promise<TreeMember> {
  if (!member.joinedUid) return member

  try {
    const profile = await fetchUserProfile(member.joinedUid)
    if (!profile) return member

    const displayName =
      [profile.firstName, profile.middleName, profile.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ') || member.displayName

    return {
      ...member,
      firstName: profile.firstName || member.firstName,
      lastName: profile.lastName || member.lastName,
      displayName,
      photoURL: profile.photoURL ?? member.photoURL,
      bio: profile.bio?.trim() || member.bio,
      privacy: profile.profilePrivacy
        ? parseMemberPrivacy(profile.profilePrivacy)
        : member.privacy,
      dateOfBirth: profile.dateOfBirth?.trim() || member.dateOfBirth,
      gender: profile.gender ?? member.gender,
    }
  } catch {
    return member
  }
}

async function enrichClaimedMembers(members: TreeMember[]): Promise<TreeMember[]> {
  return Promise.all(members.map((member) => enrichClaimedMember(member)))
}

/** how `other` (a role relative to the inviter) appears to the viewer, given the viewer's role relative to the inviter */
const VIEWER_ROLE_TABLE: Partial<
  Record<InviteRole, Partial<Record<InviteRole, InviteRole>>>
> = {
  child: {
    parent: 'grandparent',
    spouse: 'parent',
    child: 'sibling',
    grandparent: 'great-grandparent',
    'great-grandparent': 'great-grandparent',
  },
  parent: { grandparent: 'great-grandparent', parent: 'spouse', sibling: 'child' },
  sibling: { grandparent: 'grandparent', parent: 'parent', sibling: 'sibling', 'great-grandparent': 'great-grandparent' },
  spouse: { child: 'child' },
}

export function roleForViewer(
  viewerRoleToInviter: InviteRole | 'member',
  otherRoleToInviter: InviteRole,
): InviteRole | null {
  if (viewerRoleToInviter === 'member') return null
  return VIEWER_ROLE_TABLE[viewerRoleToInviter]?.[otherRoleToInviter] ?? null
}

export function getReciprocalRole(role: InviteRole): InviteRole {
  switch (role) {
    case 'child':
      return 'parent'
    case 'parent':
      return 'child'
    case 'sibling':
      return 'sibling'
    case 'spouse':
      return 'spouse'
    case 'grandparent':
      return 'member'
    default:
      return 'member'
  }
}

/** Members drawn around the center node — never include the signed-in viewer twice. */
export function treeMembersForPedigree(
  members: TreeMember[],
  viewerUid: string | null | undefined,
  claimedInviteToken?: string | null,
): TreeMember[] {
  if (!viewerUid && !claimedInviteToken) return members
  return members.filter((m) => {
    if (viewerUid && m.joinedUid === viewerUid) return false
    if (claimedInviteToken && m.id === claimedInviteToken) return false
    return true
  })
}

export function subscribeTreeMembers(
  uid: string,
  onChange: (members: TreeMember[]) => void,
  onError?: (error: Error) => void,
) {
  let unsub1: (() => void) | null = null
  let unsub2: (() => void) | null = null
  let unsubUser: (() => void) | null = null
  let subscribedInviterUid: string | null = null

  let recs1: InvitationRecord[] = []
  let recs2: InvitationRecord[] = []
  let inviterMember: TreeMember | null = null
  let inviterRelation: InviteRole | 'member' = 'member'
  let claimedInviteToken: string | null = null

  function notify() {
    const keep = (r: InvitationRecord) =>
      r.joinedUid !== uid && r.id !== claimedInviteToken

    // people the viewer invited: roles are already relative to the viewer
    const own = recs1
      .filter(keep)
      .map(mapInvitationToTreeMember)
      .filter((m): m is TreeMember => m !== null)

    // people the inviter invited: re-map roles to the viewer's point of view
    const viaInviter = recs2
      .filter(keep)
      .map(mapInvitationToTreeMember)
      .filter((m): m is TreeMember => m !== null)
      .flatMap((m) => {
        const role = roleForViewer(inviterRelation, m.role)
        if (!role) return []
        let parentSlot = m.parentSlot
        if (
          inviterRelation === 'child' &&
          role === 'parent' &&
          !parentSlot &&
          inviterMember?.parentSlot &&
          inviterMember.parentSlot !== 'unknown'
        ) {
          parentSlot = inviterMember.parentSlot === 'father' ? 'mother' : 'father'
        }

        const inviterSide =
          inviterMember?.parentSlot === 'father'
            ? 'paternal'
            : inviterMember?.parentSlot === 'mother'
              ? 'maternal'
              : null

        let lineageSide: TreeMember['lineageSide'] = null
        let parentKind = m.parentKind

        if (inviterRelation === 'child') {
          if (role === 'grandparent') lineageSide = inviterSide
          else if (role === 'great-grandparent') lineageSide = m.lineageSide ?? inviterSide
          if (role === 'parent' && m.role === 'spouse') {
            parentKind = 'step'
          }
        }

        return [
          {
            ...m,
            role,
            parentSlot,
            parentKind,
            lineageSide,
            inviterCanEdit: false,
            inviterCanRemove: false,
          },
        ]
      })

    const seen = new Set<string>()
    const allMembers = [
      ...(inviterMember ? [inviterMember] : []),
      ...own,
      ...viaInviter,
    ].filter((m) => {
      const key = m.joinedUid ?? m.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    onChange(allMembers)
    void enrichClaimedMembers(allMembers).then(onChange).catch(() => onChange(allMembers))
  }

  unsub1 = subscribeSentInvitations(
    uid,
    (records) => {
      recs1 = records
      notify()
    },
    (err) => {
      console.warn('Error subscribing to sent invitations:', err)
      onError?.(err)
    },
  )

  async function syncInviterTree(
    invitedByUid: string,
    familyRole: InviteRole | 'member',
  ) {
    inviterRelation = familyRole
    setSelfOnTree()

    try {
      const inviterProfile = await fetchUserProfile(invitedByUid)
      if (inviterProfile) {
        const reciprocalRole = getReciprocalRole(familyRole)
        const nameFromProfile = [
          inviterProfile.firstName,
          inviterProfile.middleName,
          inviterProfile.lastName,
        ]
          .map((p) => (p || '').trim())
          .filter(Boolean)
          .join(' ')

        const inviterName =
          nameFromProfile ||
          (inviterProfile.email ? inviterProfile.email.split('@')[0] : 'Family member')

        inviterMember = {
          id: `inviter-${invitedByUid}`,
          firstName: inviterProfile.firstName || '',
          lastName: inviterProfile.lastName || '',
          displayName: inviterName,
          role: reciprocalRole,
          photoURL: inviterProfile.photoURL ?? null,
          memberStatus: 'living',
          inviteStatus: 'joined',
          joinedUid: invitedByUid,
          gender: inviterProfile.gender ?? null,
          profileClaimed: true,
          inviterCanEdit: false,
          inviterCanRemove: false,
          privacy: inviterProfile.profilePrivacy
            ? parseMemberPrivacy(inviterProfile.profilePrivacy)
            : DEFAULT_MEMBER_PRIVACY,
          bio: inviterProfile.bio?.trim() || '',
          parentSlot:
            reciprocalRole === 'parent' ? parentSlotFromGender(inviterProfile.gender) : null,
          parentKind: null,
          sharedFatherMemberId: null,
          sharedMotherMemberId: null,
          siblingRelationship: null,
          dateOfBirth: inviterProfile.dateOfBirth?.trim() || null,
          dateOfDeath: null,
          inviteeEmail: inviterProfile.email || null,
        }
        notify()
      }
    } catch (err) {
      console.warn('Error fetching inviter profile:', err)
    }

    if (subscribedInviterUid === invitedByUid) return
    unsub2?.()
    subscribedInviterUid = invitedByUid
    unsub2 = subscribeSentInvitations(
      invitedByUid,
      (records) => {
        recs2 = records
        notify()
      },
      (err) => {
        console.warn('Error subscribing to inviter invitations:', err)
        onError?.(err)
      },
    )
  }

  function clearInviterTree() {
    unsub2?.()
    unsub2 = null
    subscribedInviterUid = null
    inviterMember = null
    inviterRelation = 'member'
    recs2 = []
    notify()
  }

  unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        claimedInviteToken = null
        clearInviterTree()
        return
      }

      const data = snap.data()
      claimedInviteToken =
        (data.claimedInviteToken ? String(data.claimedInviteToken) : null) ||
        (data.inviteToken ? String(data.inviteToken) : null)

      const invitedByUid = data.invitedByUid ? String(data.invitedByUid) : null
      const familyRole = (data.familyRole as InviteRole | undefined) ?? 'member'

      if (invitedByUid && invitedByUid !== uid) {
        void syncInviterTree(invitedByUid, familyRole)
      } else {
        clearInviterTree()
      }
    },
    (err) => {
      console.warn('Error subscribing to user profile in subscribeTreeMembers:', err)
      onError?.(err)
    },
  )

  return () => {
    unsub1?.()
    unsub2?.()
    unsubUser?.()
  }
}

const groupedTreeRoles = ['parent', 'child', 'sibling', 'spouse'] as const
export type GroupedTreeRole = (typeof groupedTreeRoles)[number]

export function membersGroupedByRole(members: TreeMember[]) {
  const groups: Record<GroupedTreeRole, TreeMember[]> = {
    parent: [],
    child: [],
    sibling: [],
    spouse: [],
  }

  for (const member of members) {
    if (groupedTreeRoles.includes(member.role as GroupedTreeRole)) {
      groups[member.role as GroupedTreeRole].push(member)
    }
  }

  return groups
}

/** @deprecated Prefer membersGroupedByRole when multiple members per role are supported */
export function membersByRole(members: TreeMember[]) {
  const groups = membersGroupedByRole(members)
  return {
    parent: groups.parent[0],
    child: groups.child[0],
    sibling: groups.sibling[0],
    spouse: groups.spouse[0],
  }
}

export function computeTreeStats(selfOnTree: boolean, members: TreeMember[]) {
  const total = (selfOnTree ? 1 : 0) + members.length
  const hasGrandparent = members.some((m) => m.role === 'grandparent')
  const hasParent = members.some((m) => m.role === 'parent')
  const hasChild = members.some((m) => m.role === 'child')
  let generations = selfOnTree ? 1 : 0
  if (hasGrandparent) generations += 1
  if (hasParent) generations += 1
  if (hasChild) generations += 1

  const branches = members.length

  return {
    total,
    generations: Math.max(generations, selfOnTree ? 1 : 0),
    branches,
  }
}

/** Biological or adoptive parent already occupying a father/mother slot. */
export function primaryParentOnTree(
  members: TreeMember[],
  slot: 'father' | 'mother',
): TreeMember | undefined {
  return members.find(
    (m) => m.role === 'parent' && m.parentSlot === slot && m.parentKind !== 'step',
  )
}

export function mayAddPrimaryParent(
  members: TreeMember[],
  slot: ParentSlot | null,
  kind: ParentKind | null,
): boolean {
  if (slot !== 'father' && slot !== 'mother') return true
  if (kind === 'step') return true
  return !primaryParentOnTree(members, slot)
}

export function parentSlotLabel(member: TreeMember): string {
  if (member.role !== 'parent') return roleLabel(member.role)
  const isStep = member.parentKind === 'step'
  const isAdoptive = member.parentKind === 'adoptive'

  if (member.parentSlot === 'father') {
    if (isStep) return 'Step-father'
    if (isAdoptive) return 'Adoptive Father'
    return 'Father'
  }
  if (member.parentSlot === 'mother') {
    if (isStep) return 'Step-mother'
    if (isAdoptive) return 'Adoptive Mother'
    return 'Mother'
  }
  if (isStep) return 'Step-parent'
  if (isAdoptive) return 'Adoptive Parent'
  return 'Parent'
}

export function grandparentSlotLabel(member: TreeMember): string {
  if (member.role !== 'grandparent') return roleLabel(member.role)
  const isStep = member.parentKind === 'step'
  const isAdoptive = member.parentKind === 'adoptive'

  if (member.parentSlot === 'father') {
    if (isStep) return 'Step-grandfather'
    if (isAdoptive) return 'Adoptive Grandfather'
    return 'Grandfather'
  }
  if (member.parentSlot === 'mother') {
    if (isStep) return 'Step-grandmother'
    if (isAdoptive) return 'Adoptive Grandmother'
    return 'Grandmother'
  }
  if (isStep) return 'Step-grandparent'
  if (isAdoptive) return 'Adoptive Grandparent'
  return 'Grandparent'
}

export function greatGrandparentSlotLabel(member: TreeMember): string {
  if (member.role !== 'great-grandparent') return roleLabel(member.role)
  const isStep = member.parentKind === 'step'
  const isAdoptive = member.parentKind === 'adoptive'

  if (member.parentSlot === 'father') {
    if (isStep) return 'Step Great-grandfather'
    if (isAdoptive) return 'Adoptive Great-grandfather'
    return 'Great-grandfather'
  }
  if (member.parentSlot === 'mother') {
    if (isStep) return 'Step Great-grandmother'
    if (isAdoptive) return 'Adoptive Great-grandmother'
    return 'Great-grandmother'
  }
  if (isStep) return 'Step Great-grandparent'
  if (isAdoptive) return 'Adoptive Great-grandparent'
  return 'Great-grandparent'
}

export function treeMemberRoleLabel(member: TreeMember): string {
  if (member.role === 'sibling') {
    return memberRelationshipLabel(member) ?? roleLabel(member.role)
  }
  if (member.role === 'parent') return parentSlotLabel(member)
  if (member.role === 'grandparent') return grandparentSlotLabel(member)
  if (member.role === 'great-grandparent') return greatGrandparentSlotLabel(member)
  return roleLabel(member.role)
}

export function memberRelationshipLabel(member: TreeMember): string | null {
  if (member.role === 'sibling' && member.siblingRelationship) {
    return siblingRelationshipLabel(member.siblingRelationship)
  }
  return null
}

export function normalizeTreeMemberGender(
  gender: string | null | undefined,
): 'male' | 'female' | null {
  if (!gender?.trim()) return null
  const g = gender.trim().toLowerCase()
  if (g === 'male' || g === 'm') return 'male'
  if (g === 'female' || g === 'f') return 'female'
  return null
}

export type TreeAvatarViewerContext = {
  uid: string | null
  gender?: string | null
  photoURL?: string | null
  displayName?: string | null
}

export function buildTreeAvatarViewer(input: {
  uid: string | null
  gender?: string | null
  photoURL?: string | null
  displayName?: string | null
  positionLabel?: string | null
}): TreeAvatarViewerContext {
  let gender = normalizeTreeMemberGender(input.gender ?? null)
  if (!gender && input.positionLabel) {
    const role = input.positionLabel.toLowerCase()
    if (/\b(mother|wife|grandmother|sister|daughter)\b/i.test(role)) gender = 'female'
    else if (/\b(father|husband|grandfather|brother|son)\b/i.test(role)) gender = 'male'
  }
  return {
    uid: input.uid,
    gender: gender ?? input.gender ?? null,
    photoURL: input.photoURL ?? null,
    displayName: input.displayName ?? null,
  }
}

function profilePhotoUrlsMatch(a: string, b: string): boolean {
  if (a === b) return true
  try {
    return new URL(a).pathname === new URL(b).pathname
  } catch {
    return false
  }
}

function personNamesMatch(a: string, b: string): boolean {
  const na = normalizePersonName(a)
  const nb = normalizePersonName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.startsWith(`${nb} `) || nb.startsWith(`${na} `)) return true
  const firstA = na.split(' ')[0] ?? ''
  const firstB = nb.split(' ')[0] ?? ''
  return firstA.length > 1 && firstA === firstB
}

/** Fill missing gender when a node is the viewer or uses the viewer's profile photo. */
export function treeMemberForAvatarDisplay(
  member: TreeMember,
  viewer?: TreeAvatarViewerContext | null,
): TreeMember {
  if (normalizeTreeMemberGender(member.gender)) return member
  if (!viewer) return member

  const viewerGender = normalizeTreeMemberGender(viewer.gender ?? null)
  if (!viewerGender) return member

  if (viewer.uid && member.joinedUid === viewer.uid) {
    return { ...member, gender: viewerGender }
  }

  if (
    viewer.photoURL &&
    member.photoURL &&
    profilePhotoUrlsMatch(viewer.photoURL, member.photoURL)
  ) {
    return { ...member, gender: viewerGender }
  }

  if (
    viewer.displayName &&
    member.displayName &&
    personNamesMatch(viewer.displayName, member.displayName)
  ) {
    return { ...member, gender: viewerGender }
  }

  return member
}

function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function inferGenderFromRoleLabel(label: string): 'male' | 'female' | null {
  const l = label.toLowerCase()
  if (
    l.includes('grandfather') ||
    l.includes('great-grandfather') ||
    l.includes('brother') ||
    l.includes('husband') ||
    /\bfather\b/.test(l) ||
    /\bson\b/.test(l)
  ) {
    return 'male'
  }
  if (
    l.includes('grandmother') ||
    l.includes('great-grandmother') ||
    l.includes('sister') ||
    l.includes('wife') ||
    /\bmother\b/.test(l) ||
    /\bdaughter\b/.test(l)
  ) {
    return 'female'
  }
  return null
}

export function inferTreeMemberGender(
  member: Pick<TreeMember, 'role' | 'parentSlot' | 'siblingRelationship' | 'gender'>,
): 'male' | 'female' | null {
  const fromField =
    normalizeTreeMemberGender(member.gender) ??
    genderFromSiblingRelationship(member.siblingRelationship)
  if (fromField) return fromField

  if (member.parentSlot === 'father') return 'male'
  if (member.parentSlot === 'mother') return 'female'
  const rel = member.siblingRelationship
  if (rel === 'brother' || rel === 'half-brother' || rel === 'step-brother') return 'male'
  if (rel === 'sister' || rel === 'half-sister' || rel === 'step-sister') return 'female'

  const relationshipLabel = rel ? siblingRelationshipLabel(rel) : ''
  const label = `${treeMemberRoleLabel(member as TreeMember)} ${relationshipLabel}`
  return inferGenderFromRoleLabel(label)
}

export function avatarGenderToneForMember(
  member: TreeMember,
  viewer?: TreeAvatarViewerContext | null,
): 'male' | 'female' | 'neutral' {
  const inferred = inferTreeMemberGender(treeMemberForAvatarDisplay(member, viewer))
  if (inferred === 'male') return 'male'
  if (inferred === 'female') return 'female'
  return 'neutral'
}

export function roleLabel(role: InviteRole): string {
  switch (role) {
    case 'spouse':
      return 'Spouse'
    case 'parent':
      return 'Parent'
    case 'grandparent':
      return 'Grandparent'
    case 'great-grandparent':
      return 'Great-grandparent'
    case 'child':
      return 'Child'
    case 'sibling':
      return 'Sibling'
    default:
      return 'Member'
  }
}

export function positionLabel(role: string | null | undefined): string | null {
  if (
    role === 'spouse' ||
    role === 'parent' ||
    role === 'grandparent' ||
    role === 'child' ||
    role === 'sibling'
  ) {
    return roleLabel(role)
  }
  return null
}

function parentSlotFromGender(gender: string | null | undefined): ParentSlot | null {
  const value = gender?.trim().toLowerCase()
  if (value === 'male') return 'father'
  if (value === 'female') return 'mother'
  return null
}
