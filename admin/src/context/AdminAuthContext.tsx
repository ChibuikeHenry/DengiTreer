import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { resolveAdminAccess } from '../lib/adminAccess'
import { auth } from '../firebase'

type AdminAuthContextValue = {
  user: User | null
  ready: boolean
  isAdmin: boolean
  adminChecked: boolean
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setIsAdmin(false)
      setAdminChecked(true)
      return
    }
    setAdminChecked(false)
    void resolveAdminAccess(user).then((allowed) => {
      if (!cancelled) {
        setIsAdmin(allowed)
        setAdminChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const value = useMemo(
    () => ({ user, ready, isAdmin, adminChecked }),
    [user, ready, isAdmin, adminChecked],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
