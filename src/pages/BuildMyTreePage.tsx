import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import {
  BUILD_MY_TREE_ACCEPT,
  BUILD_MY_TREE_CHECKOUT_ENABLED,
  BUILD_MY_TREE_MAX_BYTES,
  formatBuildMyTreePrice,
} from '../lib/buildMyTreeService'
import {
  createTreeBuildRequest,
  isTreeBuildSpreadsheet,
  uploadTreeBuildSpreadsheet,
} from '../lib/treeBuildRequest'
import {
  initializeTreeBuildPayment,
  verifyTreeBuildPayment,
} from '../lib/treeBuildPayment'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'

export default function BuildMyTreePage() {
  const titleId = useId()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [paidOnline, setPaidOnline] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const name = profileFullName(profile) || user.displayName?.trim() || ''
      setFullName((prev) => prev || name)
      setEmail((prev) => prev || user.email?.trim() || profile.email?.trim() || '')
      setPhone((prev) => prev || profile.phone?.trim() || '')
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const paid = searchParams.get('paid') === '1'
    const reference = searchParams.get('reference')?.trim() || searchParams.get('trxref')?.trim()
    if (!paid || !reference || !user) return
    let cancelled = false
    ;(async () => {
      try {
        await verifyTreeBuildPayment(reference)
        if (!cancelled) {
          setSubmitted(true)
          setPaidOnline(true)
          setSearchParams({}, { replace: true })
        }
      } catch {
        if (!cancelled) {
          setError('We could not confirm your payment. Contact support with your receipt reference.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, user])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user?.uid) return
    if (!file) {
      setError('Choose an Excel or CSV file with your family data.')
      return
    }
    if (!isTreeBuildSpreadsheet(file)) {
      setError('Upload a .xlsx, .xls, or .csv file.')
      return
    }
    if (file.size > BUILD_MY_TREE_MAX_BYTES) {
      setError('File is too large. Maximum size is 10 MB.')
      return
    }
    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const { storagePath, downloadUrl } = await uploadTreeBuildSpreadsheet(user.uid, file)
      const requestId = await createTreeBuildRequest({
        uid: user.uid,
        fullName,
        email,
        phone,
        notes,
        fileName: file.name,
        fileStoragePath: storagePath,
        fileDownloadUrl: downloadUrl,
        checkoutEnabled: BUILD_MY_TREE_CHECKOUT_ENABLED,
      })

      if (BUILD_MY_TREE_CHECKOUT_ENABLED) {
        const { authorizationUrl } = await initializeTreeBuildPayment(requestId)
        window.location.assign(authorizationUrl)
        return
      }

      setSubmitted(true)
      setPaidOnline(false)
    } catch (err) {
      console.error(err)
      setError('Could not submit your request. Check your file and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="home build-tree-page">
      <section className="home-card build-tree-card" aria-labelledby={titleId}>
        <header className="build-tree-head">
          <div className="build-tree-head-icon" aria-hidden="true">
            {DashIcons.upload()}
          </div>
          <div>
            <h1 id={titleId}>Build my tree</h1>
            <p>
              Send us your family list in Excel or CSV and our team will build your DengiTree
              diagram for you — clear parents, siblings, and generations like a professional
              pedigree layout.
            </p>
          </div>
          <span className="build-tree-price-badge">{formatBuildMyTreePrice()} · Paid service</span>
        </header>

        {submitted ? (
          <div className="build-tree-success" role="status">
            <h2>Thank you — we received your request</h2>
            {paidOnline ? (
              <p>
                Payment confirmed. Our team will start building your tree and email you at{' '}
                <strong>{email}</strong> when it is ready to review on your account.
              </p>
            ) : (
              <p>
                We have your spreadsheet. Our team will contact you at <strong>{email}</strong>{' '}
                to confirm details and payment ({formatBuildMyTreePrice()}), then build your tree
                on DengiTree.
              </p>
            )}
            <Link to="/home/tree" className="build-tree-success-link">
              Back to Family Tree →
            </Link>
          </div>
        ) : (
          <>
            <ol className="build-tree-steps">
              <li>
                <strong>Download the template</strong> (optional) or use your own sheet with names
                and relationships.
              </li>
              <li>
                <strong>Upload your file</strong> and tell us how to reach you.
              </li>
              <li>
                <strong>We build your tree</strong> on your account — usually within a few working
                days after payment.
              </li>
            </ol>

            <p className="build-tree-template-row">
              <a href="/tree-build-template.csv" download className="build-tree-template-link">
                Download CSV template
              </a>
              <span className="field-hint">
                Columns: name, relationship, parents, dates, notes.
              </span>
            </p>

            {!BUILD_MY_TREE_CHECKOUT_ENABLED ? (
              <p className="build-tree-checkout-note" role="note">
                Online payment for this service is coming soon. Submit your sheet now — we will
                email you a payment link before we start.
              </p>
            ) : null}

            <form className="build-tree-form" onSubmit={(e) => void handleSubmit(e)}>
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
                <span>Notes for our team (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. centre the tree on me, include step-parents, …"
                />
              </label>
              <label className="field build-tree-file-field">
                <span>Family spreadsheet (.xlsx, .xls, or .csv)</span>
                <input
                  type="file"
                  accept={BUILD_MY_TREE_ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
                {file ? (
                  <span className="field-hint">
                    Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                ) : null}
              </label>

              {error ? (
                <p className="modal-form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="build-tree-submit" disabled={submitting}>
                {submitting
                  ? 'Uploading…'
                  : BUILD_MY_TREE_CHECKOUT_ENABLED
                    ? `Pay ${formatBuildMyTreePrice()} & submit`
                    : 'Submit for our team to build'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
