import type { InviteRole } from './invitations'
import {
  resolveTreeMemberGender,
  type TreeMember,
} from './familyTreeMembers'
import { DEFAULT_MEMBER_PRIVACY, type MemberPrivacy } from './memberPrivacy'
import type { ParentKind, ParentSlot, SiblingRelationship } from './siblingRelationship'

export type PublicTreeCenter = {
  displayName: string
  photoURL: string | null
  bio: string
  gender: string | null
  dateOfBirth: string | null
  positionLabel: string | null
  treeFatherMemberId: string | null
  treeMotherMemberId: string | null
  selfMemberIds: string[]
}

export type PublicTreeMemberPayload = {
  id: string
  firstName: string
  lastName: string
  displayName: string
  role: InviteRole
  memberStatus: 'living' | 'deceased'
  photoURL: string | null
  bio: string
  parentSlot: string | null
  parentKind: string | null
  lineageSide: string | null
  sharedFatherMemberId: string | null
  sharedMotherMemberId: string | null
  siblingRelationship: string | null
  dateOfBirth: string | null
  dateOfDeath: string | null
  gender: string | null
}

export type PublicTreeSnapshotDoc = {
  token: string
  ownerUid: string
  ownerDisplayName: string
  enabled: boolean
  center: PublicTreeCenter
  members: PublicTreeMemberPayload[]
}

function parseParentSlot(value: string | null): ParentSlot | null {
  const v = String(value ?? '').trim()
  if (v === 'father' || v === 'mother' || v === 'unknown') return v
  return null
}

function parseParentKind(value: string | null): ParentKind | null {
  const v = String(value ?? '').trim()
  if (v === 'biological' || v === 'step' || v === 'adoptive') return v
  return null
}

function parseLineageSide(value: string | null): 'paternal' | 'maternal' | null {
  const v = String(value ?? '').trim()
  if (v === 'paternal' || v === 'maternal') return v
  return null
}

function parseSiblingRelationship(value: string | null): SiblingRelationship | null {
  const v = String(value ?? '').trim()
  const allowed: SiblingRelationship[] = [
    'brother',
    'sister',
    'half-brother',
    'half-sister',
    'step-brother',
    'step-sister',
    'sibling',
  ]
  return allowed.includes(v as SiblingRelationship) ? (v as SiblingRelationship) : null
}

export function publicMembersToTreeMembers(members: PublicTreeMemberPayload[]): TreeMember[] {
  return members.map((m) => {
    const parentSlot = parseParentSlot(m.parentSlot)
    const siblingRelationship = parseSiblingRelationship(m.siblingRelationship)
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      displayName: m.displayName,
      role: m.role,
      photoURL: m.photoURL,
      memberStatus: m.memberStatus,
      inviteStatus: 'joined',
      joinedUid: null,
      profileClaimed: false,
      inviterCanEdit: false,
      inviterCanRemove: false,
      privacy: DEFAULT_MEMBER_PRIVACY as MemberPrivacy,
      bio: m.bio,
      parentSlot,
      parentKind: parseParentKind(m.parentKind),
      lineageSide: parseLineageSide(m.lineageSide),
      sharedFatherMemberId: m.sharedFatherMemberId,
      sharedMotherMemberId: m.sharedMotherMemberId,
      siblingRelationship,
      dateOfBirth: m.dateOfBirth,
      dateOfDeath: m.dateOfDeath,
      inviteeEmail: null,
      gender: resolveTreeMemberGender({
        gender: m.gender,
        parentSlot,
        role: m.role,
        siblingRelationship,
      }),
    }
  })
}

export function parsePublicTreeSnapshot(data: Record<string, unknown>): PublicTreeSnapshotDoc | null {
  const token = String(data.token ?? '').trim()
  const ownerUid = String(data.ownerUid ?? '').trim()
  if (!token || !ownerUid) return null
  if (data.enabled === false) return null

  const centerRaw = data.center
  if (!centerRaw || typeof centerRaw !== 'object') return null
  const c = centerRaw as Record<string, unknown>

  const membersRaw = data.members
  const members: PublicTreeMemberPayload[] = Array.isArray(membersRaw)
    ? membersRaw
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null
          const m = entry as Record<string, unknown>
          const role = String(m.role ?? '') as InviteRole
          if (!m.id || !role) return null
          return {
            id: String(m.id),
            firstName: String(m.firstName ?? ''),
            lastName: String(m.lastName ?? ''),
            displayName: String(m.displayName ?? 'Family member'),
            role,
            memberStatus: m.memberStatus === 'deceased' ? 'deceased' : 'living',
            photoURL: m.photoURL ? String(m.photoURL) : null,
            bio: String(m.bio ?? ''),
            parentSlot: m.parentSlot ? String(m.parentSlot) : null,
            parentKind: m.parentKind ? String(m.parentKind) : null,
            lineageSide: m.lineageSide ? String(m.lineageSide) : null,
            sharedFatherMemberId: m.sharedFatherMemberId
              ? String(m.sharedFatherMemberId)
              : null,
            sharedMotherMemberId: m.sharedMotherMemberId
              ? String(m.sharedMotherMemberId)
              : null,
            siblingRelationship: m.siblingRelationship
              ? String(m.siblingRelationship)
              : null,
            dateOfBirth: m.dateOfBirth ? String(m.dateOfBirth) : null,
            dateOfDeath: m.dateOfDeath ? String(m.dateOfDeath) : null,
            gender: m.gender ? String(m.gender) : null,
          } satisfies PublicTreeMemberPayload
        })
        .filter((m): m is PublicTreeMemberPayload => m !== null)
    : []

  return {
    token,
    ownerUid,
    ownerDisplayName: String(data.ownerDisplayName ?? c.displayName ?? 'Family tree'),
    enabled: true,
    center: {
      displayName: String(c.displayName ?? 'Family member'),
      photoURL: c.photoURL ? String(c.photoURL) : null,
      bio: String(c.bio ?? ''),
      gender: c.gender ? String(c.gender) : null,
      dateOfBirth: c.dateOfBirth ? String(c.dateOfBirth) : null,
      positionLabel: c.positionLabel ? String(c.positionLabel) : null,
      treeFatherMemberId: c.treeFatherMemberId ? String(c.treeFatherMemberId) : null,
      treeMotherMemberId: c.treeMotherMemberId ? String(c.treeMotherMemberId) : null,
      selfMemberIds: Array.isArray(c.selfMemberIds)
        ? c.selfMemberIds.map((id) => String(id)).filter(Boolean)
        : [],
    },
    members,
  }
}

export function treeMembersForPublicPedigree(
  members: TreeMember[],
  centerSelfMemberIds: string[],
): TreeMember[] {
  const hide = new Set(centerSelfMemberIds.filter(Boolean))
  return members.filter((m) => !hide.has(m.id))
}
