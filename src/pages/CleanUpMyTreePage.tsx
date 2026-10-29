import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import {
  CLEAN_UP_MY_TREE_CHECKOUT_ENABLED,
  formatCleanUpMyTreePrice,
} from '../lib/cleanUpMyTreeService'
import { createCleanUpTreeRequest } from '../lib/cleanUpTreeRequest'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'

const ISSUE_OPTIONS = [
  { id: 'lines', label: 'Messy lines or layout' },
  { id: 'parents', label: 'Wrong or missing parents' },
  { id: 'siblings', label: 'Siblings / half-siblings incorrect' },
  { id: 'duplicates', label: 'Duplicate people' },
  { id: 'names', label: 'Names or spelling' },
  { id: 'other', label: 'Something else' },
] as const

export default function CleanUpMyTreePage() {
  const titleId = useId()
  const { user } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [issues, setIssues] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void resolveUserProfileForForm(user).then((profile) => {
      if (cancelled) return
      const name = profileFullName(profile) || user.displayName?.trim() || ''
      setFullName((prev) => prev || name)
      setEmail((prev) => prev || user.email?.trim() || profile.email?.trim() || '')
      setPhone((prev) => prev || profile.phone?.trim() || '')
    })
    return () => {
      cancelled = true
    }
  }, [user])

  function toggleIssue(id: string) {
    setIssues((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user?.uid) return
    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (!issues.length && !notes.trim()) {
      setError('Select at least one issue or describe what needs fixing.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await createCleanUpTreeRequest({
        uid: user.uid,
        fullName,
        email,
        phone,
        notes,
        issues,
        checkoutEnabled: CLEAN_UP_MY_TREE_CHECKOUT_ENABLED,
      })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError('Could not submit your request. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="home build-tree-page">
      <section className="home-card build-tree-card" aria-labelledby={titleId}>
        <header className="build-tree-head">
          <div className="build-tree-head-icon" aria-hidden="true">
            {DashIcons.tree()}
          </div>
          <div>
            <h1 id={titleId}>Clean up my tree</h1>
            <p>
              Our team reviews your DengiTree diagram, fixes crossed lines, parent links, and
              duplicate entries, and leaves you with a clear pedigree you can share with family.
            </p>
          </div>
          <span className="build-tree-price-badge">
            {formatCleanUpMyTreePrice()} · Paid service
          </span>
        </header>

        {submitted ? (
          <div className="build-tree-success" role="status">
            <h2>Request received</h2>
            <p>
              We will email you at <strong>{email}</strong> to confirm payment (
              {formatCleanUpMyTreePrice()}) and schedule your tree cleanup. You keep editing your
              tree while we work — we only adjust what you ask for.
            </p>
            <Link to="/home/manage" className="build-tree-success-link">
              Back to Manage Trees →
            </Link>
          </div>
        ) : (
          <>
            <ol className="build-tree-steps">
              <li>
                <strong>Tell us what is wrong</strong> — layout, parents, siblings, or duplicates.
              </li>
              <li>
                <strong>We review your live tree</strong> on your DengiTree account (no file needed).
              </li>
              <li>
                <strong>You get a cleaned tree</strong> — usually within a few working days after
                payment.
              </li>
            </ol>

            {!CLEAN_UP_MY_TREE_CHECKOUT_ENABLED ? (
              <p className="build-tree-checkout-note" role="note">
                Online payment is coming soon. Submit your request now — we will send a payment link
                before we start.
              </p>
            ) : null}

            <form className="build-tree-form" onSubmit={(e) => void handleSubmit(e)}>
              <fieldset className="build-tree-issues">
                <legend>What should we fix?</legend>
                <ul className="build-tree-issues-list">
                  {ISSUE_OPTIONS.map((option) => (
                    <li key={option.id}>
                      <label className="tag-library-option">
                        <input
                          type="checkbox"
                          checked={issues.includes(option.id)}
                          onChange={() => toggleIssue(option.id)}
                        />
                        <span>
                          <strong>{option.label}</strong>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div className="form-row form-row-2">
                <label className="field">
                  <span>Your name</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  <span>Phone (optional)</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </label>
              </div>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span>Details (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Names of people with wrong links, branches to leave unchanged, …"
                />
              </label>

              {error ? (
                <p className="modal-form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="build-tree-submit" disabled={submitting}>
                {submitting
                  ? 'Sending…'
                  : CLEAN_UP_MY_TREE_CHECKOUT_ENABLED
                    ? `Pay ${formatCleanUpMyTreePrice()} & submit`
                    : `Request cleanup — ${formatCleanUpMyTreePrice()}`}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
