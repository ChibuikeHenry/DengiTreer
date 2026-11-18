import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  hasAdminPermission,
  resolveAdminAccessDetails,
} from '../lib/adminAccess'
import type { AdminPermission } from '../lib/adminPermissions'
import { auth } from '../firebase'

type AdminAuthContextValue = {
  user: User | null
  ready: boolean
  isAdmin: boolean
  adminChecked: boolean
  isBootstrap: boolean
  permissions: AdminPermission[]
  can: (permission: AdminPermission) => boolean
  refreshAccess: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [isBootstrap, setIsBootstrap] = useState(false)
  const [permissions, setPermissions] = useState<AdminPermission[]>([])

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      // Reset admin check in the same render as the restored user so
      // ProtectedRoute never sees user + stale adminChecked=true + isAdmin=false.
      if (next) {
        setAdminChecked(false)
        setIsAdmin(false)
        setIsBootstrap(false)
        setPermissions([])
      } else {
        setIsAdmin(false)
        setIsBootstrap(false)
        setPermissions([])
        setAdminChecked(true)
      }
      setUser(next)
      setReady(true)
    })
  }, [])

  const applyAccess = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setIsAdmin(false)
      setIsBootstrap(false)
      setPermissions([])
      setAdminChecked(true)
      return
    }
    setAdminChecked(false)
    const details = await resolveAdminAccessDetails(nextUser)
    setIsAdmin(details.isAdmin)
    setIsBootstrap(details.isBootstrap)
    setPermissions(details.permissions)
    setAdminChecked(true)
  }, [])

  useEffect(() => {
    if (!ready || !user) return

    let cancelled = false
    void (async () => {
      const details = await resolveAdminAccessDetails(user)
      if (!cancelled) {
        setIsAdmin(details.isAdmin)
        setIsBootstrap(details.isBootstrap)
        setPermissions(details.permissions)
        setAdminChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, ready])

  const refreshAccess = useCallback(async () => {
    await applyAccess(user)
  }, [applyAccess, user])

  const can = useCallback(
    (permission: AdminPermission) =>
      hasAdminPermission(permissions, permission, { isBootstrap }),
    [permissions, isBootstrap],
  )

  const value = useMemo(
    () => ({
      user,
      ready,
      isAdmin,
      adminChecked,
      isBootstrap,
      permissions,
      can,
      refreshAccess,
    }),
    [user, ready, isAdmin, adminChecked, isBootstrap, permissions, can, refreshAccess],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
