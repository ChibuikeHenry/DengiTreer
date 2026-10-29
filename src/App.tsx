import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import AboutUsPage from './pages/AboutUsPage'
import PricingPage from './pages/PricingPage'
import ConcessionRequestPage from './pages/ConcessionRequestPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DiscoveriesPage from './pages/DiscoveriesPage'
import JoinInvitePage from './pages/JoinInvitePage'
import ClaimedMemberProfilePage from './pages/ClaimedMemberProfilePage'
import FamilyTreePage from './pages/FamilyTreePage'
import HomePage, { HomeDashboard } from './pages/HomePage'
import InvitationsPage from './pages/InvitationsPage'
import ManageTreesPage from './pages/ManageTreesPage'
import PeoplePage from './pages/PeoplePage'
import PhotosPage from './pages/PhotosPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import BuildMyTreePage from './pages/BuildMyTreePage'
import CleanUpMyTreePage from './pages/CleanUpMyTreePage'
import {
  MergeExistsPage,
  MergeIncomingPage,
  MergeMessagePage,
  MergeReviewPage,
  MergeSentPage,
  MergeSeparatePage,
  MergeViewFamilyPage,
} from './pages/mergeFlow/MergeFlowPages'
import './auth.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/concession" element={<ConcessionRequestPage />} />
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
            <Route path="member/:memberId" element={<ClaimedMemberProfilePage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="discoveries" element={<DiscoveriesPage />} />
            <Route path="manage" element={<ManageTreesPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="build-my-tree" element={<BuildMyTreePage />} />
            <Route path="clean-up-my-tree" element={<CleanUpMyTreePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="premium" element={<PricingPage embedded />} />
            <Route path="concession" element={<ConcessionRequestPage embedded />} />
            <Route path="merge/exists" element={<MergeExistsPage />} />
            <Route path="merge/review" element={<MergeReviewPage />} />
            <Route path="merge/message" element={<MergeMessagePage />} />
            <Route path="merge/sent" element={<MergeSentPage />} />
            <Route path="merge/separate" element={<MergeSeparatePage />} />
            <Route path="merge/incoming/:token" element={<MergeIncomingPage />} />
            <Route path="merge/incoming/:token/family" element={<MergeViewFamilyPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
