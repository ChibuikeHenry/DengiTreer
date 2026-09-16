import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const signedIn = user ?? auth.currentUser

  if (loading && !signedIn) {
    return (
      <div className="auth-loading">
        <p>Loading your account…</p>
      </div>
    )
  }

  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
