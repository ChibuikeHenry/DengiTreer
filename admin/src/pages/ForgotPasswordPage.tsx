import { sendPasswordResetEmail } from 'firebase/auth'
import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AdminBrand from '../components/AdminBrand'
import { useAdminAuth } from '../context/AdminAuthContext'
import { auth } from '../firebase'

export default function ForgotPasswordPage() {
  const { user, ready, isAdmin, adminChecked } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (ready && user && adminChecked && isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSent(false)
    setBusy(true)
    try {
      const continueUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/login`
          : 'https://dengitree-admin.web.app/login'
      await sendPasswordResetEmail(auth, email.trim(), { url: continueUrl })
      setSent(true)
    } catch {
      setError('Could not send reset email. Check the address and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login-page">
      <header className="admin-login-header">
        <div className="admin-login-header-inner">
          <AdminBrand href="https://dengitree.web.app/" />
          <nav className="admin-login-nav" aria-label="Marketing">
            <a href="https://dengitree.web.app/">Home</a>
            <a href="https://dengitree.web.app/about">About</a>
            <a href="https://dengitree.web.app/">Contact</a>
            <Link to="/login">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="admin-login-main">
        <div className="admin-login-stack">
          <img src="/favicon.svg" alt="" className="admin-login-mark" width={52} height={52} />
          <div className="admin-login-card">
            <div className="admin-login-card-head">
              <h1>Reset admin password</h1>
              <p className="admin-login-lede">
                Enter your admin email and we&apos;ll send a link to reset your password.
              </p>
            </div>
            {sent ? (
              <div className="admin-login-success" role="status">
                Check your inbox for <strong>{email.trim()}</strong>. Open the link from Firebase
                to choose a new password, then sign in here.
              </div>
            ) : null}
            {error ? <div className="admin-login-error">{error}</div> : null}
            {!sent ? (
              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="admin-field">
                  <label htmlFor="admin-reset-email">Email</label>
                  <input
                    id="admin-reset-email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="admin-btn-primary" disabled={busy}>
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
              >
                Send another link
              </button>
            )}
            <Link to="/login" className="admin-forgot">
              Back to sign in
            </Link>
          </div>
        </div>
      </main>

      <footer className="admin-login-footer">© 2026 DengiTree. All rights reserved.</footer>
    </div>
  )
}
