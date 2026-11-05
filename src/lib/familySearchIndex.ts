import {
  mapInvitationToTreeMember,
  roleForViewer,
  subscribeTreeMembers,
  type TreeMember,
} from './familyTreeMembers'
import { subscribeSentInvitations, type InvitationRecord } from './invitations'

function memberKey(member: TreeMember): string {
  return member.joinedUid?.trim() || member.id
}

function remapViaBridge(
  bridge: TreeMember,
  record: InvitationRecord,
  viewerUid: string,
): TreeMember | null {
  if (record.joinedUid === viewerUid) return null
  if (record.id === bridge.id) return null

  const raw = mapInvitationToTreeMember(record)
  if (!raw) return null
  if (raw.joinedUid && raw.joinedUid === bridge.joinedUid) return null

  const role = roleForViewer(bridge.role, raw.role) ?? 'member'
  let lineageSide = raw.lineageSide ?? null
  if (bridge.role === 'parent' && (role === 'parent' || role === 'grandparent')) {
    if (bridge.parentSlot === 'father') lineageSide = 'paternal'
    if (bridge.parentSlot === 'mother') lineageSide = 'maternal'
  }

  const bridgeRoot = bridge.joinedUid?.trim()
  if (!bridgeRoot) return null

  return {
    ...raw,
    // via:<treeOwnerUid>:<invitationId> — searchable deep hit on a relative's tree
    id: `via:${bridgeRoot}:${raw.id}`,
    role,
    inviterCanEdit: false,
    inviterCanRemove: false,
    lineageSide,
    bio: [raw.bio, `Related via ${bridge.displayName}`].filter(Boolean).join(' · '),
  }
}

/**
 * Global / deep family search index:
 * - everyone on your tree (including remapped inviter-tree people)
 * - plus people on trees of relatives you invited who have joined (one hop deeper)
 *
 * Pedigree canvas keeps using `subscribeTreeMembers`; search uses this wider set.
 */
export function subscribeFamilySearchIndex(
  uid: string,
  onChange: (members: TreeMember[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let baseMembers: TreeMember[] = []
  const hopMembers = new Map<string, TreeMember[]>()
  const hopUnsubs = new Map<string, () => void>()

  function publish() {
    const byKey = new Map<string, TreeMember>()
    for (const member of baseMembers) {
      byKey.set(memberKey(member), member)
    }
    for (const list of hopMembers.values()) {
      for (const member of list) {
        const key = memberKey(member)
        if (!byKey.has(key)) byKey.set(key, member)
      }
    }
    onChange([...byKey.values()])
  }

  function syncHops(members: TreeMember[]) {
    const bridges = members.filter(
      (m) => m.joinedUid && m.joinedUid !== uid && m.inviteStatus === 'joined',
    )
    const wanted = new Set(bridges.map((m) => m.joinedUid as string))

    for (const [bridgeUid, unsub] of hopUnsubs) {
      if (wanted.has(bridgeUid)) continue
      unsub()
      hopUnsubs.delete(bridgeUid)
      hopMembers.delete(bridgeUid)
    }

    for (const bridge of bridges) {
      const bridgeUid = bridge.joinedUid as string
      if (hopUnsubs.has(bridgeUid)) continue

      const unsub = subscribeSentInvitations(
        bridgeUid,
        (records) => {
          hopMembers.set(
            bridgeUid,
            records
              .map((record) => remapViaBridge(bridge, record, uid))
              .filter((m): m is TreeMember => Boolean(m)),
          )
          publish()
        },
        (err) => onError?.(err),
      )
      hopUnsubs.set(bridgeUid, unsub)
    }

    publish()
  }

  const unsubBase = subscribeTreeMembers(
    uid,
    (members) => {
      baseMembers = members
      syncHops(members)
    },
    onError,
  )

  return () => {
    unsubBase()
    for (const unsub of hopUnsubs.values()) unsub()
    hopUnsubs.clear()
    hopMembers.clear()
  }
}
