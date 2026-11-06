import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export type AdminTreeMember = {
  id: string
  name: string
  email: string | null
  relationship: string
  rawRole: string
  parentSlot?: 'father' | 'mother' | 'unknown' | null
  lineageSide?: 'paternal' | 'maternal' | null
  memberStatus: 'living' | 'deceased'
  claimed: boolean
  claimedByUid: string | null
  addedDate: string
  isSelf?: boolean
}

export type UserFamilyTreeData = {
  ownerName: string
  ownerEmail: string
  ownerRole: string
  ownerStatus: string
  ownerJoined: string
  members: AdminTreeMember[]
  loading: boolean
}

function formatDate(timestamp: any): string {
  if (!timestamp) return 'Recent'
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Recent'
  }
}

function formatRoleLabel(role: string, parentSlot?: string | null, lineageSide?: string | null): string {
  const r = (role || 'member').toLowerCase().trim()
  if (r === 'father') return 'Father'
  if (r === 'mother') return 'Mother'
  if (r === 'parent') {
    if (parentSlot === 'father') return 'Father'
    if (parentSlot === 'mother') return 'Mother'
    return 'Parent'
  }
  if (r === 'spouse') return 'Spouse'
  if (r === 'child') return 'Child'
  if (r === 'sibling') return 'Sibling'
  if (r === 'grandparent') {
    const side = lineageSide ? `${lineageSide.charAt(0).toUpperCase() + lineageSide.slice(1)} ` : ''
    const slot = parentSlot === 'father' ? 'Grandfather' : parentSlot === 'mother' ? 'Grandmother' : 'Grandparent'
    return `${side}${slot}`
  }
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export function useUserFamilyTree(uid: string | null) {
  const [data, setData] = useState<UserFamilyTreeData>({
    ownerName: '',
    ownerEmail: '',
    ownerRole: 'Member',
    ownerStatus: 'Active',
    ownerJoined: '',
    members: [],
    loading: true,
  })

  useEffect(() => {
    if (!uid) {
      setData({
        ownerName: '',
        ownerEmail: '',
        ownerRole: 'Member',
        ownerStatus: 'Active',
        ownerJoined: '',
        members: [],
        loading: false,
      })
      return
    }

    let unsubUser: (() => void) | null = null
    let unsubFamily: (() => void) | null = null
    let unsubInvites: (() => void) | null = null

    let ownerInfo = {
      ownerName: 'User',
      ownerEmail: '',
      ownerRole: 'Member',
      ownerStatus: 'Active',
      ownerJoined: '',
      selfMember: null as AdminTreeMember | null,
    }

    let familyMembersList: AdminTreeMember[] = []
    let invitesList: AdminTreeMember[] = []

    function updateResult() {
      const combinedMap = new Map<string, AdminTreeMember>()

      if (ownerInfo.selfMember) {
        combinedMap.set(ownerInfo.selfMember.id, ownerInfo.selfMember)
      }

      familyMembersList.forEach((m) => {
        combinedMap.set(m.id, m)
      })

      invitesList.forEach((inv) => {
        if (!combinedMap.has(inv.id)) {
          combinedMap.set(inv.id, inv)
        }
      })

      const allMembers = Array.from(combinedMap.values())

      setData({
        ownerName: ownerInfo.ownerName,
        ownerEmail: ownerInfo.ownerEmail,
        ownerRole: ownerInfo.ownerRole,
        ownerStatus: ownerInfo.ownerStatus,
        ownerJoined: ownerInfo.ownerJoined,
        members: allMembers,
        loading: false,
      })
    }

    // 1. Listen to user doc
    unsubUser = onSnapshot(doc(db, 'users', uid), (userSnap) => {
      if (userSnap.exists()) {
        const uData = userSnap.data()
        const name =
          uData.displayName ||
          [uData.firstName, uData.lastName].filter(Boolean).join(' ') ||
          uData.email?.split('@')[0] ||
          'User'
        const email = uData.email || ''
        const role = uData.customClaims?.admin === true || uData.role === 'admin' ? 'Admin' : 'Member'
        const status = uData.status === 'pending' ? 'Pending' : 'Active'
        const joined = formatDate(uData.createdAt || uData.updatedAt)

        ownerInfo = {
          ownerName: name,
          ownerEmail: email,
          ownerRole: role,
          ownerStatus: status,
          ownerJoined: joined,
          selfMember: {
            id: uid,
            name: `${name} (Self)`,
            email,
            relationship: 'Self (Tree Owner)',
            rawRole: 'self',
            memberStatus: 'living',
            claimed: true,
            claimedByUid: uid,
            addedDate: joined,
            isSelf: true,
          },
        }
      }
      updateResult()
    })

    // 2. Listen to users/{uid}/familyMembers subcollection
    const familyCol = collection(db, 'users', uid, 'familyMembers')
    unsubFamily = onSnapshot(
      familyCol,
      (snap) => {
        familyMembersList = snap.docs.map((docSnap) => {
          const m = docSnap.data()
          const name =
            m.displayName ||
            [m.firstName, m.lastName].filter(Boolean).join(' ') ||
            m.inviteeEmail ||
            'Family member'
          const email = m.inviteeEmail || null
          const claimed = Boolean(m.claimedByUid || m.claimedAt)

          return {
            id: docSnap.id,
            name,
            email,
            relationship: formatRoleLabel(m.role, m.parentSlot, m.lineageSide),
            rawRole: m.role || 'member',
            parentSlot: m.parentSlot || null,
            lineageSide: m.lineageSide || null,
            memberStatus: m.memberStatus === 'deceased' ? 'deceased' : 'living',
            claimed,
            claimedByUid: m.claimedByUid || null,
            addedDate: formatDate(m.createdAt),
          }
        })
        updateResult()
      },
      () => {
        updateResult()
      },
    )

    // 3. Listen to invitations where inviterUid == uid
    const qInvites = query(collection(db, 'invitations'), where('inviterUid', '==', uid))
    unsubInvites = onSnapshot(
      qInvites,
      (snap) => {
        const list: AdminTreeMember[] = []
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data()
          if (data.role === 'member') return

          const name =
            data.inviteeName ||
            data.inviteeEmail ||
            'Family member'
          const email = data.inviteeEmail || null
          const claimed =
            data.profileClaimed === true ||
            Boolean(data.joinedUid) ||
            data.status === 'joined'

          list.push({
            id: docSnap.id,
            name,
            email,
            relationship: formatRoleLabel(data.role, data.parentSlot, data.lineageSide),
            rawRole: data.role || 'member',
            parentSlot: data.parentSlot || null,
            lineageSide: data.lineageSide || null,
            memberStatus: data.memberStatus === 'deceased' ? 'deceased' : 'living',
            claimed,
            claimedByUid: data.joinedUid || null,
            addedDate: formatDate(data.createdAt),
          })
        })
        invitesList = list
        updateResult()
      },
      () => {
        updateResult()
      },
    )

    return () => {
      if (unsubUser) unsubUser()
      if (unsubFamily) unsubFamily()
      if (unsubInvites) unsubInvites()
    }
  }, [uid])

  return data
}
