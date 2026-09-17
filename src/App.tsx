import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import FeaturesPage from './pages/FeaturesPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import FamilyTreePage from './pages/FamilyTreePage'
import HomePage, { HomeDashboard, PlaceholderPage } from './pages/HomePage'
import './auth.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
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
            <Route
              path="invitations"
              element={<PlaceholderPage title="Invitations" />}
            />
            <Route
              path="discoveries"
              element={<PlaceholderPage title="Discoveries" />}
            />
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
