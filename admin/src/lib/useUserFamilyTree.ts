import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export type AdminTreeMember = {
  id: string
  name: string
  email: string | null
  photoUrl: string | null
  relationship: string
  rawRole: string
  parentSlot?: 'father' | 'mother' | 'unknown' | null
  lineageSide?: 'paternal' | 'maternal' | null
  memberStatus: 'living' | 'deceased'
  claimed: boolean
  claimedByUid: string | null
  targetTreeUid: string | null
  addedDate: string
  isSelf?: boolean
}

export type UserFamilyTreeData = {
  ownerName: string
  ownerEmail: string
  ownerPhotoUrl: string | null
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
  if (r === 'great-grandparent') return 'Great-Grandparent'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

function extractPhoto(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null
  return (
    obj.photoURL ||
    obj.photoUrl ||
    obj.avatarUrl ||
    obj.avatar ||
    obj.profileImage ||
    obj.picture ||
    obj.inviteePhoto ||
    null
  )
}

function getReciprocalRoleString(role: string): string {
  const r = (role || '').toLowerCase().trim()
  if (r === 'child') return 'parent'
  if (r === 'parent') return 'child'
  if (r === 'sibling') return 'sibling'
  if (r === 'spouse') return 'spouse'
  if (r === 'grandparent') return 'grandchild'
  return 'relative'
}

function mapInviterRoleToViewer(viewerRoleToInviter: string, otherRoleToInviter: string): string {
  const v = (viewerRoleToInviter || '').toLowerCase().trim()
  const o = (otherRoleToInviter || '').toLowerCase().trim()

  if (v === 'child') {
    if (o === 'parent') return 'grandparent'
    if (o === 'spouse') return 'parent'
    if (o === 'child') return 'sibling'
    if (o === 'grandparent') return 'great-grandparent'
    if (o === 'sibling') return 'relative'
  } else if (v === 'sibling') {
    if (o === 'parent') return 'parent'
    if (o === 'sibling') return 'sibling'
    if (o === 'grandparent') return 'grandparent'
    if (o === 'child') return 'child'
    if (o === 'spouse') return 'spouse'
  } else if (v === 'spouse') {
    if (o === 'child') return 'child'
    if (o === 'parent') return 'parent'
    if (o === 'sibling') return 'sibling'
    if (o === 'grandparent') return 'grandparent'
  } else if (v === 'parent') {
    if (o === 'parent') return 'spouse'
    if (o === 'child') return 'child'
    if (o === 'sibling') return 'child'
    if (o === 'grandparent') return 'great-grandparent'
  }
  return o
}

export function useUserFamilyTree(uid: string | null) {
  const [data, setData] = useState<UserFamilyTreeData>({
    ownerName: '',
    ownerEmail: '',
    ownerPhotoUrl: null,
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
        ownerPhotoUrl: null,
        ownerRole: 'Member',
        ownerStatus: 'Active',
        ownerJoined: '',
        members: [],
        loading: false,
      })
      return
    }

    let unsubUsers: (() => void) | null = null
    let unsubUser: (() => void) | null = null
    let unsubFamily: (() => void) | null = null
    let unsubInvites1: (() => void) | null = null
    let unsubInvites2: (() => void) | null = null
    let unsubInvites3: (() => void) | null = null
    let unsubInviterTree: (() => void) | null = null

    type UserRecordInfo = { uid: string; photoUrl: string | null; name: string; email: string }
    const usersByEmail = new Map<string, UserRecordInfo>()
    const usersByUid = new Map<string, UserRecordInfo>()

    let ownerInfo = {
      ownerName: 'User',
      ownerEmail: '',
      ownerPhotoUrl: null as string | null,
      ownerRole: 'Member',
      ownerStatus: 'Active',
      ownerJoined: '',
      invitedByUid: null as string | null,
      invitedByEmail: null as string | null,
      familyRole: 'member' as string,
      selfMember: null as AdminTreeMember | null,
    }

    let rawFamilyMembers: any[] = []
    let rawInvitesSentByUid: any[] = []
    let rawInvitesSentByEmail: any[] = []
    let rawInvitesReceivedByEmail: any[] = []
    let rawInviterTreeRecords: any[] = []

    let subscribedInviterUid: string | null = null
    let subscribedEmail: string | null = null

    function getEffectiveInviter(): { inviterUid: string | null; familyRole: string } {
      if (ownerInfo.invitedByUid) {
        return { inviterUid: ownerInfo.invitedByUid, familyRole: ownerInfo.familyRole || 'member' }
      }
      if (rawInvitesReceivedByEmail.length > 0) {
        const withInviter = rawInvitesReceivedByEmail.find((m) => m.inviterUid && m.inviterUid !== uid)
        if (withInviter) {
          return { inviterUid: String(withInviter.inviterUid), familyRole: withInviter.role || 'member' }
        }
      }
      return { inviterUid: null, familyRole: ownerInfo.familyRole || 'member' }
    }

    function checkInviterSubscription() {
      const { inviterUid } = getEffectiveInviter()
      if (inviterUid && inviterUid !== uid && inviterUid !== subscribedInviterUid) {
        subscribedInviterUid = inviterUid
        unsubInviterTree?.()
        unsubInviterTree = onSnapshot(
          query(collection(db, 'invitations'), where('inviterUid', '==', inviterUid)),
          (snap) => {
            rawInviterTreeRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            updateResult()
          },
        )
      }
    }

    function checkEmailInvites(email: string) {
      if (!email || email === subscribedEmail) return
      subscribedEmail = email

      unsubInvites2?.()
      unsubInvites2 = onSnapshot(
        query(collection(db, 'invitations'), where('inviterEmail', '==', email.toLowerCase())),
        (snap) => {
          rawInvitesSentByEmail = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          updateResult()
        },
      )

      unsubInvites3?.()
      unsubInvites3 = onSnapshot(
        query(collection(db, 'invitations'), where('inviteeEmail', '==', email.toLowerCase())),
        (snap) => {
          rawInvitesReceivedByEmail = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          checkInviterSubscription()
          updateResult()
        },
      )
    }

    function updateResult() {
      const combinedMap = new Map<string, AdminTreeMember>()
      const { inviterUid: effectiveInviterUid, familyRole: effectiveFamilyRole } = getEffectiveInviter()

      if (ownerInfo.selfMember) {
        combinedMap.set(ownerInfo.selfMember.id, ownerInfo.selfMember)
      }

      const processRecord = (m: any, isInviterTree = false) => {
        if (!m || !m.id) return

        let rawRole = (m.role || 'member').toLowerCase().trim()
        if (isInviterTree && effectiveFamilyRole && effectiveFamilyRole !== 'member') {
          const mapped = mapInviterRoleToViewer(effectiveFamilyRole, rawRole)
          if (mapped) rawRole = mapped
        }

        const email = m.inviteeEmail || m.email || null
        const emailKey = email ? email.toLowerCase().trim() : ''
        const claimedByUid = m.claimedByUid || m.joinedUid || null

        const matchedByUid = claimedByUid ? usersByUid.get(claimedByUid) : null
        const matchedByEmail = emailKey ? usersByEmail.get(emailKey) : null
        const matchedUser = matchedByUid || matchedByEmail

        const photoUrl = extractPhoto(m) || matchedUser?.photoUrl || null
        const claimed = Boolean(claimedByUid || m.claimedAt || m.profileClaimed || matchedUser)
        const targetTreeUid = claimedByUid || matchedUser?.uid || null

        let name =
          m.displayName ||
          [m.firstName, m.lastName].filter(Boolean).join(' ') ||
          m.inviteeName ||
          matchedUser?.name ||
          email ||
          'Family member'

        const displayRole = formatRoleLabel(rawRole, m.parentSlot, m.lineageSide)
        const idKey = m.id || claimedByUid || emailKey

        if (!combinedMap.has(idKey)) {
          combinedMap.set(idKey, {
            id: idKey,
            name,
            email,
            photoUrl,
            relationship: displayRole,
            rawRole,
            parentSlot: m.parentSlot || null,
            lineageSide: m.lineageSide || null,
            memberStatus: m.memberStatus === 'deceased' ? 'deceased' : 'living',
            claimed,
            claimedByUid,
            targetTreeUid,
            addedDate: formatDate(m.createdAt),
          })
        }
      }

      rawFamilyMembers.forEach((m) => processRecord(m))
      rawInvitesSentByUid.forEach((m) => processRecord(m))
      rawInvitesSentByEmail.forEach((m) => processRecord(m))

      rawInvitesReceivedByEmail.forEach((m) => {
        const inviterUid = m.inviterUid || null
        const inviterEmail = m.inviterEmail || null
        const matchedInviter = inviterUid ? usersByUid.get(inviterUid) : (inviterEmail ? usersByEmail.get(inviterEmail.toLowerCase()) : null)

        const inviterName = m.inviterName || matchedInviter?.name || inviterEmail || 'Family Member'
        const inviterPhoto = matchedInviter?.photoUrl || extractPhoto(m) || null
        const reciprocalRole = getReciprocalRoleString(m.role || 'member')

        const idKey = `inviter-${inviterUid || inviterEmail || m.id}`
        if (!combinedMap.has(idKey)) {
          combinedMap.set(idKey, {
            id: idKey,
            name: inviterName,
            email: inviterEmail,
            photoUrl: inviterPhoto,
            relationship: formatRoleLabel(reciprocalRole, null, null),
            rawRole: reciprocalRole,
            memberStatus: 'living',
            claimed: true,
            claimedByUid: inviterUid || matchedInviter?.uid || null,
            targetTreeUid: inviterUid || matchedInviter?.uid || null,
            addedDate: formatDate(m.createdAt),
          })
        }
      })

      if (effectiveInviterUid) {
        const matchedInviter = usersByUid.get(effectiveInviterUid) || (ownerInfo.invitedByEmail ? usersByEmail.get(ownerInfo.invitedByEmail.toLowerCase()) : null)

        if (matchedInviter) {
          const reciprocalRole = getReciprocalRoleString(effectiveFamilyRole)
          const idKey = `inviter-user-${matchedInviter.uid}`
          if (!combinedMap.has(idKey)) {
            combinedMap.set(idKey, {
              id: idKey,
              name: matchedInviter.name,
              email: matchedInviter.email || ownerInfo.invitedByEmail || null,
              photoUrl: matchedInviter.photoUrl,
              relationship: formatRoleLabel(reciprocalRole, null, null),
              rawRole: reciprocalRole,
              memberStatus: 'living',
              claimed: true,
              claimedByUid: matchedInviter.uid,
              targetTreeUid: matchedInviter.uid,
              addedDate: ownerInfo.ownerJoined,
            })
          }
        }

        rawInviterTreeRecords.forEach((m) => {
          if (m.joinedUid === uid || (m.inviteeEmail && m.inviteeEmail.toLowerCase() === ownerInfo.ownerEmail.toLowerCase())) return
          processRecord(m, true)
        })
      }

      const allMembers = Array.from(combinedMap.values())

      setData({
        ownerName: ownerInfo.ownerName,
        ownerEmail: ownerInfo.ownerEmail,
        ownerPhotoUrl: ownerInfo.ownerPhotoUrl,
        ownerRole: ownerInfo.ownerRole,
        ownerStatus: ownerInfo.ownerStatus,
        ownerJoined: ownerInfo.ownerJoined,
        members: allMembers,
        loading: false,
      })
    }

    // 0. Listen to all registered users
    unsubUsers = onSnapshot(collection(db, 'users'), (usersSnap) => {
      usersByEmail.clear()
      usersByUid.clear()
      usersSnap.docs.forEach((uDoc) => {
        const uData = uDoc.data()
        const email = typeof uData.email === 'string' ? uData.email.toLowerCase().trim() : ''
        const photo = extractPhoto(uData)
        const name =
          uData.displayName ||
          [uData.firstName, uData.lastName].filter(Boolean).join(' ') ||
          (email ? email.split('@')[0] : 'User')

        const info: UserRecordInfo = { uid: uDoc.id, photoUrl: photo, name, email }
        if (email) usersByEmail.set(email, info)
        usersByUid.set(uDoc.id, info)
      })
      checkInviterSubscription()
      updateResult()
    })

    // 1. Listen to target user doc
    unsubUser = onSnapshot(doc(db, 'users', uid), (userSnap) => {
      if (userSnap.exists()) {
        const uData = userSnap.data()
        const name =
          uData.displayName ||
          [uData.firstName, uData.lastName].filter(Boolean).join(' ') ||
          uData.email?.split('@')[0] ||
          'User'
        const email = uData.email || ''
        const photoUrl = extractPhoto(uData)
        const role = uData.customClaims?.admin === true || uData.role === 'admin' ? 'Admin' : 'Member'
        const status = uData.status === 'pending' ? 'Pending' : 'Active'
        const joined = formatDate(uData.createdAt || uData.updatedAt)

        const invitedByUid = uData.invitedByUid ? String(uData.invitedByUid) : null
        const invitedByEmail = uData.inviterEmail ? String(uData.inviterEmail) : null
        const familyRole = uData.familyRole || 'member'

        ownerInfo = {
          ownerName: name,
          ownerEmail: email,
          ownerPhotoUrl: photoUrl,
          ownerRole: role,
          ownerStatus: status,
          ownerJoined: joined,
          invitedByUid,
          invitedByEmail,
          familyRole,
          selfMember: {
            id: uid,
            name: `${name} (Self)`,
            email,
            photoUrl,
            relationship: 'Self (Tree Owner)',
            rawRole: 'self',
            memberStatus: 'living',
            claimed: true,
            claimedByUid: uid,
            targetTreeUid: uid,
            addedDate: joined,
            isSelf: true,
          },
        }

        checkEmailInvites(email)
        checkInviterSubscription()
      }
      updateResult()
    })

    // 2. Listen to users/{uid}/familyMembers
    unsubFamily = onSnapshot(
      collection(db, 'users', uid, 'familyMembers'),
      (snap) => {
        rawFamilyMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        updateResult()
      },
    )

    // 3. Listen to invitations sent by UID
    unsubInvites1 = onSnapshot(
      query(collection(db, 'invitations'), where('inviterUid', '==', uid)),
      (snap) => {
        rawInvitesSentByUid = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        updateResult()
      },
    )

    return () => {
      unsubUsers?.()
      unsubUser?.()
      unsubFamily?.()
      unsubInvites1?.()
      unsubInvites2?.()
      unsubInvites3?.()
      unsubInviterTree?.()
    }
  }, [uid])

  return data
}
