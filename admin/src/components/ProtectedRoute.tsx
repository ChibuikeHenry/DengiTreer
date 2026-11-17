import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { ROUTE_PERMISSIONS } from '../lib/adminPermissions'

export default function ProtectedRoute() {
  const { user, ready, isAdmin, adminChecked, can } = useAdminAuth()
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

  const required = ROUTE_PERMISSIONS[location.pathname]
  if (required && !can(required)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
