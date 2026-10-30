import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'
import '../admin-platform.css'

export default function AdminLayout() {
  return (
    <div className="dt-admin">
      <AdminSidebar />
      <div className="dt-admin-body">
        <AdminTopBar />
        <div className="dt-page-wrap">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
