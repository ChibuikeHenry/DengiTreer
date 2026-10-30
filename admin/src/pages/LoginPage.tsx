import { signInWithEmailAndPassword } from 'firebase/auth'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AdminBrand from '../components/AdminBrand'
import { auth } from '../firebase'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function LoginPage() {
  const { user, ready, isAdmin, adminChecked } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const accessDenied = (location.state as { denied?: boolean } | null)?.denied === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && user && adminChecked && isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Sign in failed. Check your email and password.')
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
            <span className="is-active">Sign In</span>
          </nav>
        </div>
      </header>

      <main className="admin-login-main">
        <div className="admin-login-stack">
          <img src="/favicon.svg" alt="" className="admin-login-mark" width={52} height={52} />
          <div className="admin-login-card">
            <div className="admin-login-card-head">
              <h1>Sign in to Admin CMS</h1>
              <p className="admin-login-lede">Use your admin account to access the dashboard.</p>
            </div>
          {accessDenied ? (
            <div className="admin-login-error">
              This account is not authorized for Admin CMS. Contact DengiTree support.
            </div>
          ) : null}
          {error ? <div className="admin-login-error">{error}</div> : null}
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="admin-field">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="admin-btn-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
            <Link to="/login" className="admin-forgot">
              Forgot password?
            </Link>
          </div>
        </div>
      </main>

      <footer className="admin-login-footer">© 2026 DengiTree. All rights reserved.</footer>
    </div>
  )
}
