import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DiscoveriesPage from './pages/DiscoveriesPage'
import JoinInvitePage from './pages/JoinInvitePage'
import FamilyTreePage from './pages/FamilyTreePage'
import HomePage, { HomeDashboard, PlaceholderPage } from './pages/HomePage'
import InvitationsPage from './pages/InvitationsPage'
import './auth.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<Navigate to="/#features" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join/:token" element={<JoinInvitePage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomeDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="tree" element={<FamilyTreePage />} />
            <Route path="people" element={<PlaceholderPage title="People" />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="discoveries" element={<DiscoveriesPage />} />
            <Route
              path="manage"
              element={<PlaceholderPage title="Manage Trees" />}
            />
            <Route path="photos" element={<PlaceholderPage title="Photos" />} />
            <Route path="profile" element={<PlaceholderPage title="Profile" />} />
            <Route
              path="settings"
              element={<PlaceholderPage title="Settings" />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
