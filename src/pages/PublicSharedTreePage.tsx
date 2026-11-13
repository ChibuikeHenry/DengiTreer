import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PedigreeTreeDiagram from '../components/PedigreeTreeDiagram'
import { GoogleIcon } from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import {
  fetchPublicTreeShare,
  getCallableErrorMessage,
} from '../lib/treePublicShare'
import {
  publicMembersToTreeMembers,
  treeMembersForPublicPedigree,
  type PublicTreeSnapshotDoc,
} from '../lib/publicTreeSnapshot'
import { computeTreeStats } from '../lib/familyTreeMembers'
import { DEFAULT_MEMBER_PRIVACY } from '../lib/memberPrivacy'
import { profileFirstName } from '../lib/userProfile'
import type { MemberModalKind } from './HomePage'
import '../dashboard.css'
import '../auth.css'
import './public-shared-tree.css'

function StatCheckIcon() {
  return (
    <span className="public-tree-stat-icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill="#34611d" />
        <path
          d="M4.5 8.2 6.8 10.5 11.5 5.5"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c1.4-2.8 3.5-4.2 6.5-4.2 1.2 0 2.3.2 3.2.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M18 10v6M15 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function PublicSharedTreePage() {
  const { token = '' } = useParams<{ token: string }>()
  const { user, loading: authLoading, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<PublicTreeSnapshotDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [googleBusy, setGoogleBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void fetchPublicTreeShare(token)
      .then((doc) => {
        if (cancelled) return
        if (!doc) {
          setSnapshot(null)
          setError('This shared tree link is invalid or has been turned off.')
          return
        }
        setSnapshot(doc)
      })
      .catch((err) => {
        if (cancelled) return
        setSnapshot(null)
        setError(getCallableErrorMessage(err) || 'Could not load this shared tree.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const members = useMemo(() => {
    if (!snapshot) return []
    return treeMembersForPublicPedigree(
      publicMembersToTreeMembers(snapshot.members),
      snapshot.center.selfMemberIds,
    )
  }, [snapshot])

  const stats = useMemo(() => computeTreeStats(true, members), [members])

  const ownerFirstName = snapshot
    ? profileFirstName(snapshot.ownerDisplayName || snapshot.center.displayName, 'Family')
    : 'Family'
  const treeTitle = `${ownerFirstName} Family Tree`

  const noopOpenModal = (_kind: MemberModalKind) => {}

  async function handleGoogle() {
    setAuthError('')
    setGoogleBusy(true)
    try {
      await loginWithGoogle()
      navigate('/home', { replace: true })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <div className="public-tree-page">
      <header className="public-tree-top">
        <Link to="/" className="public-tree-brand">
          <span className="public-tree-brand-name">DengiTree</span>
          <span className="public-tree-brand-tag">Your Family. Your Story. Connected.</span>
        </Link>
        <div className="ft-gender-legend" aria-label="Gender legend">
          <span className="ft-gender-legend-item">
            <span className="ft-gender-dot ft-gender-dot-male" aria-hidden="true" />
            Male
          </span>
          <span className="ft-gender-legend-item">
            <span className="ft-gender-dot ft-gender-dot-female" aria-hidden="true" />
            Female
          </span>
        </div>
      </header>

      <main className="public-tree-shell">
        {loading || authLoading ? (
          <p className="public-tree-status">Loading family tree…</p>
        ) : error || !snapshot ? (
          <section className="public-tree-empty" role="alert">
            <h1>Tree unavailable</h1>
            <p>{error || 'This shared tree could not be found.'}</p>
            <Link to="/" className="public-tree-primary-btn">
              Go to DengiTree
            </Link>
          </section>
        ) : (
          <>
            <section className="public-tree-stage" aria-label={treeTitle}>
              <div className="public-tree-stage-head">
                <span className="public-tree-badge">Shared Family Tree</span>
                <h1>{treeTitle}</h1>
                <p>A family united by love, history and family roots.</p>
              </div>

              <div className="public-tree-canvas">
                <PedigreeTreeDiagram
                  maxScale={1.15}
                  members={members}
                  openModal={noopOpenModal}
                  selfPhotoURL={snapshot.center.photoURL}
                  selfName={snapshot.center.displayName}
                  selfHasProfileName={Boolean(snapshot.center.displayName.trim())}
                  selfBio={snapshot.center.bio}
                  selfPrivacy={DEFAULT_MEMBER_PRIVACY}
                  selfDateOfBirth={snapshot.center.dateOfBirth}
                  selfPositionLabel={snapshot.center.positionLabel}
                  selfGender={snapshot.center.gender}
                  viewerUid={null}
                  allowAdds={false}
                  centerProfileHref={null}
                  centerRoleLabel={ownerFirstName}
                  exploreHint={false}
                  allowMemberEdit={false}
                  centerSelfMemberIds={snapshot.center.selfMemberIds}
                  centerFatherMemberId={snapshot.center.treeFatherMemberId}
                  centerMotherMemberId={snapshot.center.treeMotherMemberId}
                />
              </div>

              <aside className="public-tree-overview" aria-label="Family tree overview">
                <h2>Family Tree Overview</h2>
                <ul>
                  <li>
                    <StatCheckIcon />
                    <span>
                      <strong>{stats.total}</strong>
                      <small>Total Family Member</small>
                    </span>
                  </li>
                  <li>
                    <StatCheckIcon />
                    <span>
                      <strong>{stats.generations}</strong>
                      <small>Generation</small>
                    </span>
                  </li>
                  <li>
                    <StatCheckIcon />
                    <span>
                      <strong>{stats.branches}</strong>
                      <small>Branches</small>
                    </span>
                  </li>
                </ul>
              </aside>
            </section>

            <aside className="public-tree-welcome">
              {user ? (
                <>
                  <header>
                    <h2>Welcome back</h2>
                    <p>
                      You&apos;re viewing <strong>{treeTitle}</strong>. Open your dashboard to
                      manage your own tree.
                    </p>
                  </header>
                  <Link to="/home" className="public-tree-primary-btn">
                    <UserIcon />
                    Go to my tree
                  </Link>
                </>
              ) : (
                <>
                  <header>
                    <h2>Welcome to DengiTree</h2>
                    <p>
                      You&apos;re viewing <strong>{treeTitle}</strong>. Sign in to explore more
                      details and build your own family network.
                    </p>
                  </header>

                  {authError ? (
                    <p className="public-tree-auth-error" role="alert">
                      {authError}
                    </p>
                  ) : null}

                  <div className="public-tree-welcome-actions">
                    <Link to="/login" className="public-tree-primary-btn">
                      <UserIcon />
                      Sign in
                    </Link>
                    <button
                      type="button"
                      className="btn-google public-tree-google-btn"
                      onClick={() => void handleGoogle()}
                      disabled={googleBusy}
                    >
                      <GoogleIcon />
                      {googleBusy ? 'Connecting…' : 'Continue with Google'}
                    </button>
                    <Link to="/signup" className="public-tree-secondary-btn">
                      <UserPlusIcon />
                      Create an Account
                    </Link>
                  </div>

                  <p className="public-tree-welcome-foot">
                    Already have an account? <Link to="/login">Log in</Link>
                  </p>
                </>
              )}
            </aside>
          </>
        )}
      </main>
    </div>
  )
}
