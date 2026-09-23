import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { AuthLayout, FacebookIcon, GoogleIcon } from '../components/AuthShell'
import { getErrorMessage, useAuth } from '../context/AuthContext'
import {
  acceptPersistedInvitationIfAny,
  persistInviteToken,
} from '../lib/invitations'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, loginWithGoogle, loginWithFacebook, resetPassword, user, loading } =
    useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from && from !== '/login' ? from : '/home'

  useEffect(() => {
    const token = searchParams.get('invite')
    if (token) persistInviteToken(token)
  }, [searchParams])

  if (loading) {
    return (
      <div className="auth-loading">
        <p>Loading…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await login(email, password, remember)
      await acceptPersistedInvitationIfAny()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await loginWithGoogle()
      await acceptPersistedInvitationIfAny()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFacebook() {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await loginWithFacebook()
      await acceptPersistedInvitationIfAny()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter your email address first, then tap Forgot Password.')
      return
    }
    try {
      await resetPassword(email)
      setInfo('Password reset email sent. Check your inbox.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <AuthLayout>
      <header className="auth-card-head">
        <h1>Welcome Back</h1>
        <p>Log in to continue building your family network.</p>
      </header>

      <div className="auth-social-stack">
        <button
          type="button"
          className="btn-google"
          onClick={handleGoogle}
          disabled={submitting}
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          type="button"
          className="btn-facebook"
          onClick={handleFacebook}
          disabled={submitting}
        >
          <FacebookIcon />
          Continue with Facebook
        </button>
      </div>

      <div className="auth-divider" role="separator">
        <span>OR</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email Address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <div className="auth-meta">
          <button
            type="button"
            className="auth-forgot"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}
        {info ? <p className="auth-info">{info}</p> : null}

        <button type="submit" className="btn-auth-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/signup">Sign up</Link>
      </p>
    </AuthLayout>
  )
}
