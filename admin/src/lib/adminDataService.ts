import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { InvitationRow, MemberRow, TreeRow } from '../data/mockAdminData'

export type RealPlatformStat = {
  label: string
  value: string
  tone: 'green' | 'mint' | 'yellow' | 'lavender' | 'purple' | 'sage'
}

export type RealActivityItem = {
  id: string
  event: string
  category: string
  status: 'Completed' | 'Pending'
  time: string
}

export type RealProfileClaim = {
  id: string
  /** Profile / invitee shown on a family tree */
  member: string
  memberEmail: string | null
  /** Who added them to the tree */
  addedBy: string
  /** DengiTree user who claimed the profile (or null if still unclaimed) */
  claimant: string | null
  relationship: string
  /** Claimed = joined DengiTree account; Unclaimed = stub / pending invite */
  status: 'Claimed' | 'Unclaimed'
  submitted: string
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

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return 'Just now'
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diffSeconds < 60) return 'Just now'
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
    return `${Math.floor(diffSeconds / 86400)}d ago`
  } catch {
    return 'Just now'
  }
}

/** Hook for fetching all users from Firestore */
export function useRealUsers() {
  const [users, setUsers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'users'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MemberRow[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          const name =
            data.displayName ||
            [data.firstName, data.lastName].filter(Boolean).join(' ') ||
            data.email?.split('@')[0] ||
            'User'
          const email = data.email || 'No email'
          const role = data.customClaims?.admin === true || data.role === 'admin' ? 'Admin' : 'Member'
          const status = data.status === 'pending' ? 'Pending' : 'Active'
          const joined = formatDate(data.createdAt || data.updatedAt)

          return {
            id: docSnap.id,
            name,
            email,
            role,
            status,
            joined,
          }
        })
        setUsers(list)
        setLoading(false)
      },
      (err) => {
        console.warn('Error fetching users:', err)
        setError(err.message)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return { users, loading, error }
}

/** Hook for fetching all invitations from Firestore */
export function useRealInvitations() {
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'invitations'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: InvitationRow[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          const email = data.inviteeEmail || data.inviteeName || 'Link invitation'
          const invitedBy = data.inviterName || data.inviterEmail || 'System'
          const role = data.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1)) : 'Member'
          const status =
            data.status === 'joined'
              ? 'Sent'
              : data.status === 'expired'
                ? 'Expired'
                : 'Pending'
          const sent = formatDate(data.createdAt)

          return {
            id: docSnap.id,
            email,
            invitedBy,
            role: role as 'Admin' | 'Member',
            status: status as 'Pending' | 'Sent' | 'Expired',
            sent,
          }
        })
        setInvitations(list)
        setLoading(false)
      },
      (err) => {
        console.warn('Error fetching invitations:', err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return { invitations, loading }
}

/** Hook for fetching all family trees (aggregated from invitations & users) */
export function useRealFamilyTrees() {
  const [trees, setTrees] = useState<TreeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'invitations'),
      (snapshot) => {
        const treeMap = new Map<string, { owner: string; members: number; created: any }>()

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          const inviterUid = data.inviterUid || 'unknown'
          const owner = data.inviterName || data.inviterEmail || 'Unknown Owner'
          const created = data.createdAt

          if (!treeMap.has(inviterUid)) {
            treeMap.set(inviterUid, { owner, members: 1, created })
          } else {
            const current = treeMap.get(inviterUid)!
            current.members += 1
          }
        })

        const list: TreeRow[] = Array.from(treeMap.entries()).map(([uid, info], idx) => ({
          id: uid || String(idx + 1),
          treeName: `${info.owner}'s Family Tree`,
          owner: info.owner,
          ownerIsEmail: info.owner.includes('@'),
          members: info.members,
          status: 'Active',
          created: formatDate(info.created),
        }))

        setTrees(list)
        setLoading(false)
      },
      (err) => {
        console.warn('Error fetching family trees:', err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return { trees, loading }
}

function formatRelationship(role: unknown): string {
  const raw = typeof role === 'string' ? role.trim() : ''
  if (!raw) return 'Member'
  return raw
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-')
}

/**
 * Profile claims = family-tree invitations that are either still unclaimed stubs
 * or claimed by a DengiTree account (joinedUid / profileClaimed / matching user email).
 * Cross-references registered users in Firestore to determine claimed vs unclaimed status accurately.
 */
export function useRealProfileClaims() {
  const [claims, setClaims] = useState<RealProfileClaim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeInvites: (() => void) | null = null

    const usersMap = new Map<string, { displayName: string; email: string; uid: string }>()
    const usersByUid = new Map<string, { displayName: string; email: string }>()

    const qUsers = query(collection(db, 'users'))
    const unsubscribeUsers = onSnapshot(
      qUsers,
      (usersSnap) => {
        usersMap.clear()
        usersByUid.clear()
        usersSnap.docs.forEach((docSnap) => {
          const uData = docSnap.data() as Record<string, unknown>
          const email = typeof uData.email === 'string' ? uData.email.trim().toLowerCase() : ''
          const name =
            (typeof uData.displayName === 'string' && uData.displayName.trim()) ||
            [uData.firstName, uData.lastName].filter(Boolean).join(' ').trim() ||
            (email ? email.split('@')[0] : 'User')

          if (email) {
            usersMap.set(email, { displayName: name, email, uid: docSnap.id })
          }
          usersByUid.set(docSnap.id, { displayName: name, email })
        })

        if (!unsubscribeInvites) {
          const qInvites = query(collection(db, 'invitations'), orderBy('createdAt', 'desc'))
          unsubscribeInvites = onSnapshot(
            qInvites,
            (snapshot) => {
              const list: RealProfileClaim[] = snapshot.docs
                .map((docSnap) => {
                  const data = docSnap.data() as Record<string, unknown>
                  const role = typeof data.role === 'string' ? data.role : 'member'
                  // Platform share invites (role === 'member') are general invites, not profile claims
                  if (role === 'member') return null

                  const memberName =
                    (typeof data.inviteeName === 'string' && data.inviteeName.trim()) ||
                    (typeof data.inviteeEmail === 'string' && data.inviteeEmail.trim()) ||
                    'Family member'
                  const memberEmail =
                    typeof data.inviteeEmail === 'string' && data.inviteeEmail.trim()
                      ? data.inviteeEmail.trim().toLowerCase()
                      : null

                  const joinedUid = typeof data.joinedUid === 'string' ? data.joinedUid.trim() : ''
                  const statusStr = typeof data.status === 'string' ? data.status.toLowerCase().trim() : ''

                  const matchedUserByUid = joinedUid ? usersByUid.get(joinedUid) : null
                  const matchedUserByEmail = memberEmail ? usersMap.get(memberEmail) : null
                  const matchedUser = matchedUserByUid || matchedUserByEmail

                  const claimed =
                    data.profileClaimed === true ||
                    data.profileClaimed === 'true' ||
                    Boolean(joinedUid) ||
                    ['joined', 'claimed', 'accepted', 'approved'].includes(statusStr) ||
                    Boolean(matchedUser)

                  const addedBy =
                    (typeof data.inviterName === 'string' && data.inviterName.trim()) ||
                    (typeof data.inviterEmail === 'string' && data.inviterEmail.trim()) ||
                    'Unknown'

                  const claimant = claimed
                    ? matchedUser?.displayName || matchedUser?.email || memberName
                    : null

                  return {
                    id: docSnap.id,
                    member: memberName,
                    memberEmail,
                    addedBy,
                    claimant,
                    relationship: formatRelationship(role),
                    status: claimed ? ('Claimed' as const) : ('Unclaimed' as const),
                    submitted: formatDate(data.createdAt),
                  }
                })
                .filter((row): row is RealProfileClaim => Boolean(row))

              setClaims(list)
              setLoading(false)
            },
            (err) => {
              console.warn('Error fetching profile claims:', err)
              setLoading(false)
            },
          )
        }
      },
      (err) => {
        console.warn('Error fetching users for profile claims:', err)
        setLoading(false)
      },
    )

    return () => {
      unsubscribeUsers()
      if (unsubscribeInvites) unsubscribeInvites()
    }
  }, [])

  return { claims, loading }
}

/** Hook for real dashboard overview statistics */
export function useRealPlatformOverview() {
  const { users } = useRealUsers()
  const { invitations } = useRealInvitations()
  const { trees } = useRealFamilyTrees()
  const { claims } = useRealProfileClaims()

  const [recentActivities, setRecentActivities] = useState<RealActivityItem[]>([])

  useEffect(() => {
    const q = query(collection(db, 'invitations'), orderBy('createdAt', 'desc'), limit(5))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activities: RealActivityItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          const isJoined = data.status === 'joined'
          return {
            id: docSnap.id,
            event: isJoined ? 'Profile Claimed' : 'Invitation Sent',
            category: isJoined ? 'Profile Management' : 'Invitations',
            status: isJoined ? 'Completed' : 'Pending',
            time: formatTimeAgo(data.createdAt),
          }
        })
        setRecentActivities(activities)
      },
      () => {},
    )
    return () => unsubscribe()
  }, [])

  const totalUsers = users.length
  const activeTrees = trees.length
  const pendingInvites = invitations.filter((i) => i.status === 'Pending').length
  const claimedProfiles = claims.filter((c) => c.status === 'Claimed').length
  const unclaimedProfiles = claims.filter((c) => c.status === 'Unclaimed').length

  const stats: RealPlatformStat[] = [
    { label: 'Total Users', value: String(totalUsers), tone: 'green' },
    { label: 'Claimed Profiles', value: String(claimedProfiles), tone: 'mint' },
    { label: 'Unclaimed Profiles', value: String(unclaimedProfiles), tone: 'yellow' },
    { label: 'Pending Invitations', value: String(pendingInvites), tone: 'lavender' },
    { label: 'Total Invitations', value: String(invitations.length), tone: 'purple' },
    { label: 'Total Families', value: String(activeTrees), tone: 'sage' },
  ]

  return { stats, recentActivities }
}

/** Create new user directly in Firestore */
export async function createRealUser(payload: {
  firstName: string
  lastName: string
  email: string
  gender?: string
  dateOfBirth?: string
  location?: string
  phone?: string
  notes?: string
  relationship?: string
}) {
  const docRef = await addDoc(collection(db, 'users'), {
    firstName: payload.firstName,
    lastName: payload.lastName,
    displayName: `${payload.firstName} ${payload.lastName}`.trim(),
    email: payload.email,
    gender: payload.gender || null,
    dateOfBirth: payload.dateOfBirth || null,
    location: payload.location || null,
    phone: payload.phone || null,
    notes: payload.notes || null,
    relationship: payload.relationship || 'member',
    status: 'Active',
    createdAt: serverTimestamp(),
  })

  // If email provided, create invitation record so they can sign in
  if (payload.email) {
    await addDoc(collection(db, 'invitations'), {
      inviteeEmail: payload.email.toLowerCase(),
      inviteeName: `${payload.firstName} ${payload.lastName}`.trim(),
      inviterName: 'Admin',
      role: payload.relationship || 'member',
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  }

  return docRef.id
}
