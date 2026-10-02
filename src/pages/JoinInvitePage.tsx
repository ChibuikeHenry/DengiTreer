import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'
import {
  acceptPersistedInvitationIfAny,
  fetchInvitationPreview,
  getCallableErrorMessage,
  persistInviteToken,
} from '../lib/invitations'
import { useAuth } from '../context/AuthContext'
import './JoinInvitePage.css'

export default function JoinInvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{
    inviterName: string
    roleLabel: string
    inviteeName: string | null
    inviteeEmail: string | null
    personalMessage: string | null
  } | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link.')
      setLoading(false)
      return
    }

    persistInviteToken(token)

    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchInvitationPreview(token)
        if (cancelled) return
        setPreview({
          inviterName: data.inviterName,
          roleLabel: data.roleLabel,
          inviteeName: data.inviteeName,
          inviteeEmail: data.inviteeEmail,
          personalMessage: data.personalMessage,
        })
      } catch (err) {
        if (!cancelled) setError(getCallableErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (authLoading || !user || !token) return

    let cancelled = false
    void (async () => {
      await acceptPersistedInvitationIfAny()
      if (!cancelled) navigate('/home', { replace: true })
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, navigate, token, user])

  if (authLoading || loading) {
    return (
      <div className="join-invite-state">
        <MarketingHeader />
        <div className="join-invite-state-content">
          <p>Loading invitation…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="join-invite-state">
        <MarketingHeader />
        <div className="join-invite-state-content">
          <div className="join-invite-error-card">
            <h1>Invitation unavailable</h1>
            <p className="auth-error" style={{ margin: '1rem 0 1.5rem' }}>
              {error}
            </p>
            <Link className="btn-join-primary" to="/signup">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!preview) return null

  const signupHref = `/signup?invite=${encodeURIComponent(token)}${
    preview.inviteeEmail ? `&email=${encodeURIComponent(preview.inviteeEmail)}` : ''
  }`

  return (
    <div className="join-invite-page">
      <MarketingHeader />
      <main className="join-invite-hero">
        <div className="join-invite-container">
          <div className="join-invite-badge">
            <span>🌿 Family Tree Invitation</span>
          </div>

          <h1 className="join-invite-title">
            You&apos;re invited to join <span className="highlight">{preview.inviterName}</span>&apos;s family tree
          </h1>

          <p className="join-invite-subtitle">
            <strong>{preview.inviterName}</strong> invited you to join their DengiTree as their{' '}
            <span className="join-invite-role-tag">{preview.roleLabel}</span>.
          </p>

          {preview.inviteeName ? (
            <p className="join-invite-meta">Invitation for {preview.inviteeName}</p>
          ) : null}

          {preview.personalMessage ? (
            <div className="join-invite-message-box">
              <blockquote>&ldquo;{preview.personalMessage}&rdquo;</blockquote>
            </div>
          ) : null}

          <div className="join-invite-actions">
            <Link className="btn-join-primary" to={signupHref}>
              Get Started
            </Link>
            <p className="join-login-text">
              Already have an account?{' '}
              <Link to={`/login?invite=${encodeURIComponent(token)}`}>Log in</Link>
            </p>
          </div>

          <div className="join-invite-features">
            <div className="join-feature-card">
              <h3>🌳 Build Together</h3>
              <p>Collaborate with relatives to grow your shared family tree and discover connections.</p>
            </div>
            <div className="join-feature-card">
              <h3>🔒 Private &amp; Secure</h3>
              <p>Your family history and details are kept private and accessible only to invited family.</p>
            </div>
            <div className="join-feature-card">
              <h3>📖 Preserve Memories</h3>
              <p>Store stories, photos, and historical details for future generations to cherish.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
