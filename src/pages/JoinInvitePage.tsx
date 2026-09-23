import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthLayout } from '../components/AuthShell'
import {
  fetchInvitationPreview,
  getCallableErrorMessage,
  persistInviteToken,
} from '../lib/invitations'
import { useAuth } from '../context/AuthContext'

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
    navigate('/home', { replace: true })
  }, [authLoading, navigate, token, user])

  if (authLoading || loading) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <p>Loading invitation…</p>
        </div>
      </AuthLayout>
    )
  }

  if (error) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <h1>Invitation unavailable</h1>
          <p className="auth-error">{error}</p>
          <Link className="btn-auth-primary" to="/signup">
            Create an account
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (!preview) return null

  const signupHref = `/signup?invite=${encodeURIComponent(token)}${
    preview.inviteeEmail ? `&email=${encodeURIComponent(preview.inviteeEmail)}` : ''
  }`

  return (
    <AuthLayout>
      <div className="auth-card join-invite-card">
        <h1>You&apos;re invited to DengiTree</h1>
        <p>
          <strong>{preview.inviterName}</strong> invited you to join their family tree as
          their <strong>{preview.roleLabel}</strong>.
        </p>
        {preview.inviteeName ? (
          <p className="join-invite-meta">Invitation for {preview.inviteeName}</p>
        ) : null}
        {preview.personalMessage ? (
          <blockquote className="join-invite-message">{preview.personalMessage}</blockquote>
        ) : null}
        <Link className="btn-auth-primary" to={signupHref}>
          Get Started
        </Link>
        <p className="auth-switch">
          Already have an account?{' '}
          <Link to={`/login?invite=${encodeURIComponent(token)}`}>Log in</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
