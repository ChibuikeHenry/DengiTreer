import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, FacebookIcon, GoogleIcon } from '../components/AuthShell'
import { getErrorMessage, useAuth } from '../context/AuthContext'
import {
  acceptPersistedInvitationIfAny,
  persistInviteToken,
} from '../lib/invitations'

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signup, loginWithGoogle, loginWithFacebook, user, loading } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const token = searchParams.get('invite')
    if (token) persistInviteToken(token)
    const prefillEmail = searchParams.get('email')
    if (prefillEmail) setEmail(prefillEmail)
  }, [searchParams])

  if (loading) {
    return (
      <div className="auth-loading">
        <p>Loading…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/home" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setSubmitting(true)
    try {
      await signup(firstName, lastName, email, password)
      await acceptPersistedInvitationIfAny()
      navigate('/home', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setSubmitting(true)
    try {
      await loginWithGoogle()
      await acceptPersistedInvitationIfAny()
      navigate('/home', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFacebook() {
    setError('')
    setSubmitting(true)
    try {
      await loginWithFacebook()
      await acceptPersistedInvitationIfAny()
      navigate('/home', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <header className="auth-card-head">
        <h1>Create your account</h1>
        <p>Start building your family legacy today.</p>
      </header>

      <div className="auth-social-stack">
        <button
          type="button"
          className="btn-google"
          onClick={handleGoogle}
          disabled={submitting}
        >
          <GoogleIcon />
          Sign up with Google
        </button>
        <button
          type="button"
          className="btn-facebook"
          onClick={handleFacebook}
          disabled={submitting}
        >
          <FacebookIcon />
          Sign up with Facebook
        </button>
      </div>

      <div className="auth-divider" role="separator">
        <span>OR</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>First Name</span>
          <input
            type="text"
            name="firstName"
            autoComplete="given-name"
            placeholder="Enter first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          <span>Last Name</span>
          <input
            type="text"
            name="lastName"
            autoComplete="family-name"
            placeholder="Enter last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>

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
            autoComplete="new-password"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <label className="auth-field">
          <span>Confirm Password</span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <label className="auth-check auth-terms">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />
          <span>
            I agree to the{' '}
            <a href="#terms">Terms of Service</a> and{' '}
            <a href="#privacy">Privacy Policy</a>
          </span>
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" className="btn-auth-primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
