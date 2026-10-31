import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import FamilyTreesPage from './pages/FamilyTreesPage'
import InvitationsPage from './pages/InvitationsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import AddUserPage from './pages/AddUserPage'
import CreateFamilyTreePage from './pages/CreateFamilyTreePage'
import PlaceholderPage from './pages/PlaceholderPage'
import PrivacySafetyPage from './pages/PrivacySafetyPage'
import ProfileClaimsPage from './pages/ProfileClaimsPage'
import UserManagementPage from './pages/UserManagementPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/forgot" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="family-trees" element={<FamilyTreesPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="add-user" element={<AddUserPage />} />
          <Route path="create-family-tree" element={<CreateFamilyTreePage />} />
          <Route path="profile-claims" element={<ProfileClaimsPage />} />
          <Route path="privacy" element={<PrivacySafetyPage />} />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Settings"
                subtitle="Configure admin preferences and platform options."
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
