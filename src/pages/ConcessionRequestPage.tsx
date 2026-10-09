import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'
import { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import './FeaturesPage.css'
import './ConcessionRequestPage.css'

const CONCESSION_REASONS = [
  { value: 'student', label: 'I am a student' },
  { value: 'low-income', label: 'I have a low-income household' },
  { value: 'unemployed', label: 'I am currently unemployed' },
  { value: 'dependant', label: 'I am a dependant' },
  { value: 'large-family', label: 'I am part of a large family' },
  { value: 'other', label: 'Other' },
] as const

type ConcessionRequestPageProps = {
  embedded?: boolean
}

export default function ConcessionRequestPage({ embedded = false }: ConcessionRequestPageProps) {
  const titleId = useId()
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [reasonOpen, setReasonOpen] = useState(false)
  const [details, setDetails] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (user?.email) {
      setEmail((prev) => prev || user.email || '')
    }
  }, [user?.email])

  const reasonLabel =
    CONCESSION_REASONS.find((item) => item.value === reason)?.label ?? ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!reason) return
    setError('')
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'concessionRequests'), {
        uid: user?.uid ?? null,
        reason,
        reasonLabel,
        details: details.trim() || null,
        phone: phone.trim() || null,
        email: email.trim().toLowerCase(),
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setSubmitted(true)
    } catch {
      setError('Could not submit your request. Please try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  const formBody = submitted ? (
    <div className="concession-success" role="status">
      <p>
        Thank you for reaching out. We will review your request and contact you at{' '}
        <strong>{email}</strong> soon.
      </p>
      <Link
        to={embedded ? '/home/premium' : '/pricing'}
        className="concession-success-link"
      >
        Back to pricing
      </Link>
    </div>
  ) : (
    <form className="concession-form" onSubmit={handleSubmit}>
      <div className="concession-eligibility" role="note">
        <span className="concession-eligibility-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m9 12 2 2 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <p>
          <strong>Concession eligibility</strong> — You may qualify for a concession if you are a
          student, elder, or part of a low income house hold.
        </p>
      </div>

      <label className="concession-field">
        <span className="concession-label">Request a Concession</span>
        <div className="custom-select concession-select">
          <button
            type="button"
            className={`select-trigger${reason ? '' : ' is-placeholder'}`}
            onClick={() => setReasonOpen((open) => !open)}
            aria-expanded={reasonOpen}
            aria-haspopup="listbox"
          >
            <span>{reasonLabel || 'Select your reasons'}</span>
            {DashIcons.chevron()}
          </button>
          {reasonOpen ? (
            <ul className="select-menu select-menu-simple" role="listbox">
              {CONCESSION_REASONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className="select-option"
                    onClick={() => {
                      setReason(option.value)
                      setReasonOpen(false)
                    }}
                  >
                    <span>
                      <strong>{option.label}</strong>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </label>

      <label className="concession-field">
        <span className="concession-label">Additional Information (Optional)</span>
        <textarea
          rows={5}
          placeholder="Tell us more about your situation...."
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 800))}
        />
      </label>

      <div className="concession-contact-row">
        <label className="concession-field">
          <span className="concession-label">Phone Number</span>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label className="concession-field">
          <span className="concession-label">Email Address</span>
          <input
            type="email"
            required
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
      </div>

      {error ? (
        <p className="modal-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="concession-submit" disabled={submitting || !reason}>
        {submitting ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  )

  if (embedded) {
    return (
      <div className="home concession-page">
        <Link to="/home/premium" className="concession-back">
          ← Back to pricing
        </Link>
        <section className="home-card concession-card" aria-labelledby={titleId}>
          <header className="concession-head">
            <h1 id={titleId}>Request a Concession</h1>
            <p>
              We are here to support you. If you need a discount, special pricing or you
              can&apos;t afford the subscription plans, please complete the form below.
            </p>
          </header>
          {formBody}
        </section>
      </div>
    )
  }

  return (
    <div className="concession-page concession-page-marketing">
      <MarketingHeader />
      <main className="concession-marketing-main">
        <section className="concession-card concession-card-standalone" aria-labelledby={titleId}>
          <header className="concession-head">
            <h1 id={titleId}>Request a Concession</h1>
            <p>
              We are here to support you. If you need a discount, special pricing or you
              can&apos;t afford the subscription plans, please complete the form below.
            </p>
          </header>
          {formBody}
        </section>
      </main>
    </div>
  )
}
