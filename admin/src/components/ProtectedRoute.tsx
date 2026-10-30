import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function ProtectedRoute() {
  const { user, ready, isAdmin, adminChecked } = useAdminAuth()
  const location = useLocation()

  if (!ready || (user && !adminChecked)) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-main">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ denied: true }} />
  }

  return <Outlet />
}
