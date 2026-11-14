import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ProfileAvatar from '../../components/ProfileAvatar'
import {
  fetchMergeRequesterFamily,
  fetchTreeMergeRequest,
  submitTreeMergeRequest,
} from '../../lib/mergeFlowApi'
import {
  clearMergeFlowDraft,
  initialsFromName,
  readMergeFlowDraft,
  saveMergeFlowDraft,
} from '../../lib/mergeFlowDraft'
import { sendFamilyMemberInvite, getCallableErrorMessage } from '../../lib/invitations'
import { acceptTreeMerge, declineTreeMerge } from '../../lib/treeMerge'
import type { MergeConflict } from '../../lib/mergeFlowApi'
import { setSelfOnTree } from '../../lib/treeStorage'
import '../../merge-flow.css'

function ConflictCompare({
  conflicts,
  senderName,
}: {
  conflicts: MergeConflict[]
  senderName: string
}) {
  if (!conflicts.length) {
    return (
      <div className="mf-info-banner">
        <strong>No overlapping conflicts</strong>
        <p>
          Your trees do not list different names for the same parents. Accepting still joins you
          into {senderName.split(/\s+/)[0]}&apos;s family.
        </p>
      </div>
    )
  }

  return (
    <div className="mf-conflicts">
      <div className="mf-info-banner mf-info-banner-warn">
        <strong>Conflict resolution</strong>
        <p>
          You both have people in these roles with different details. Accepting uses{' '}
          <strong>{senderName.split(/\s+/)[0]}&apos;s</strong> family information for these
          relatives. Declining ends the invite completely — add a comment explaining why.
        </p>
      </div>
      {conflicts.map((conflict) => (
        <section key={conflict.key} className="mf-conflict-card">
          <h3>{conflict.label}</h3>
          <div className="mf-conflict-grid">
            <div className="mf-conflict-side mf-conflict-sender">
              <span className="mf-conflict-label">Their {conflict.label.toLowerCase()}</span>
              <strong>{conflict.sender.displayName}</strong>
              {conflict.sender.dateOfBirth ? (
                <span className="mf-conflict-meta">Born {conflict.sender.dateOfBirth}</span>
              ) : null}
            </div>
            <div className="mf-conflict-vs" aria-hidden="true">
              vs
            </div>
            <div className="mf-conflict-side mf-conflict-yours">
              <span className="mf-conflict-label">Your {conflict.label.toLowerCase()}</span>
              <strong>{conflict.yours.displayName}</strong>
              {conflict.yours.dateOfBirth ? (
                <span className="mf-conflict-meta">Born {conflict.yours.dateOfBirth}</span>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

function DeclineMergeModal({
  open,
  inviterName,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  inviterName: string
  busy: boolean
  onClose: () => void
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (open) {
      setComment('')
      setLocalError('')
    }
  }, [open])

  if (!open) return null

  function submit() {
    const trimmed = comment.trim()
    if (trimmed.length < 5) {
      setLocalError('Please add a short comment (at least 5 characters).')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel mf-decline-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mf-decline-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="mf-decline-title">Decline invitation</h2>
        <p>
          Declining ends {inviterName.split(/\s+/)[0]}&apos;s invite completely. Tell them why so
          they understand.
        </p>
        <label className="mf-field">
          <span>Comment (required)</span>
          <textarea
            value={comment}
            maxLength={500}
            rows={4}
            onChange={(e) => setComment(e.target.value)}
            placeholder="I don't recognize these family details / I prefer to keep my tree separate…"
          />
          <span className="mf-char-count">{comment.length}/500</span>
        </label>
        {localError ? (
          <p className="modal-form-error" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="mf-actions-row">
          <button type="button" className="mf-btn-outline" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="mf-btn-decline-confirm"
            disabled={busy}
            onClick={submit}
          >
            {busy ? 'Declining…' : 'Decline invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MergeShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mf-page">
      <h1 className="mf-title">{title}</h1>
      {subtitle ? <p className="mf-subtitle">{subtitle}</p> : null}
      {children}
    </div>
  )
}

export function MergeExistsPage() {
  const navigate = useNavigate()
  const draft = readMergeFlowDraft()

  useEffect(() => {
    if (!draft) navigate('/home', { replace: true })
  }, [draft, navigate])

  if (!draft) return null

  return (
    <MergeShell title="This user already exists!">
      <div className="mf-icon-circle mf-icon-envelope" aria-hidden="true">
        ✉
      </div>
      <p className="mf-lede">
        An account with this email address ({draft.target.email}) already exists on DengiTree.
      </p>
      <div className="mf-callout">
        <strong>Do you want to merge families?</strong>
        <span>You can combine your family tree with their existing family tree.</span>
      </div>
      <div className="mf-actions-stack">
        <button
          type="button"
          className="mf-btn-primary-wide"
          onClick={() => navigate('/home/merge/review')}
        >
          Yes, Merge Families
        </button>
        <button
          type="button"
          className="mf-btn-outline-wide"
          onClick={() => navigate('/home/merge/separate')}
        >
          No, Add as Separate
        </button>
      </div>
    </MergeShell>
  )
}

export function MergeReviewPage() {
  const navigate = useNavigate()
  const draft = readMergeFlowDraft()

  useEffect(() => {
    if (!draft) navigate('/home', { replace: true })
  }, [draft, navigate])

  if (!draft) return null

  return (
    <MergeShell title="Merge Family Request" subtitle="Review the details below before sending the merge request.">
      <div className="mf-compare-row">
        <div className="mf-compare-card mf-compare-you">
          <span className="mf-compare-label">Your Family (Requester)</span>
          <span className="mf-compare-avatar">{initialsFromName(draft.requester.displayName)}</span>
          <strong>{draft.requester.displayName}</strong>
          <span className="mf-compare-count">{draft.requester.memberCount} family members</span>
        </div>
        <div className="mf-compare-arrows" aria-hidden="true">
          <span>→</span>
          <span>←</span>
        </div>
        <div className="mf-compare-card mf-compare-them">
          <span className="mf-compare-label">Existing Family Member (Target User)</span>
          <span className="mf-compare-avatar mf-compare-avatar-pink">
            {initialsFromName(draft.target.displayName)}
          </span>
          <strong>{draft.target.displayName}</strong>
          <span className="mf-compare-count mf-compare-count-pink">
            {draft.target.memberCount} family members
          </span>
        </div>
      </div>
      <div className="mf-info-banner">
        <strong>What will happen?</strong>
        <p>
          Your family tree will be merged with {draft.target.displayName.split(/\s+/)[0]}&apos;s
          existing family tree, combining both sets of family members together.
        </p>
      </div>
      <div className="mf-actions-row">
        <button type="button" className="mf-btn-outline" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button type="button" className="mf-btn-primary-wide" onClick={() => navigate('/home/merge/message')}>
          Continue →
        </button>
      </div>
    </MergeShell>
  )
}

export function MergeMessagePage() {
  const navigate = useNavigate()
  const draft = readMergeFlowDraft()
  const [message, setMessage] = useState(draft?.mergeMessage ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!draft) navigate('/home', { replace: true })
  }, [draft, navigate])

  if (!draft) return null

  async function handleContinue() {
    setError('')
    setSubmitting(true)
    try {
      const payload = { ...draft!.invite, mergeMessage: message.trim() || undefined }
      saveMergeFlowDraft({ ...draft!, mergeMessage: message.trim() })
      const result = await submitTreeMergeRequest(payload)
      saveMergeFlowDraft({
        ...draft!,
        mergeMessage: message.trim(),
        invitationToken: result.token,
      })
      navigate('/home/merge/sent')
    } catch (err) {
      setError(getCallableErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MergeShell
      title="Add a Message (Optional)"
      subtitle="Let the other user know why you want to merge families."
    >
      <label className="mf-field">
        <span>Message to {draft.target.displayName} (Optional)</span>
        <textarea
          value={message}
          maxLength={250}
          rows={6}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi, I noticed we both have family members in common..."
        />
        <span className="mf-char-count">{message.length}/250</span>
      </label>
      {error ? (
        <p className="modal-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mf-actions-row">
        <button type="button" className="mf-btn-outline" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button
          type="button"
          className="mf-btn-primary-wide"
          disabled={submitting}
          onClick={() => void handleContinue()}
        >
          {submitting ? 'Sending…' : 'Continue →'}
        </button>
      </div>
    </MergeShell>
  )
}

export function MergeSeparatePage() {
  const navigate = useNavigate()
  const draft = readMergeFlowDraft()
  const [submitting, setSubmitting] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!draft) {
      navigate('/home', { replace: true })
      return
    }
    void (async () => {
      try {
        await sendFamilyMemberInvite({ ...draft.invite, skipAutoMerge: true })
        clearMergeFlowDraft()
        navigate('/home/tree', { replace: true })
      } catch (err) {
        setError(getCallableErrorMessage(err))
        setSubmitting(false)
      }
    })()
  }, [draft, navigate])

  return (
    <MergeShell title="Adding family member…">
      {error ? (
        <>
          <p className="modal-form-error">{error}</p>
          <button type="button" className="mf-btn-outline" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </>
      ) : (
        <p className="mf-lede">{submitting ? 'Adding without merge…' : 'Done.'}</p>
      )}
    </MergeShell>
  )
}

export function MergeSentPage() {
  const draft = readMergeFlowDraft()

  return (
    <MergeShell title="Request Sent!">
      <div className="mf-icon-circle mf-icon-envelope" aria-hidden="true">
        ✉
      </div>
      <p className="mf-lede">
        Your merge request has been sent to {draft?.target.displayName ?? 'them'}.
      </p>
      <div className="mf-next-box">
        <strong>What happens next?</strong>
        <ol>
          <li>{draft?.target.displayName.split(/\s+/)[0] ?? 'They'} will receive a notification about your request.</li>
          <li>They review any overlapping relatives (for example both of you listing a mother).</li>
          <li>
            They accept your family details for conflicts, or decline the invite with a comment.
          </li>
        </ol>
      </div>
      <Link to="/home" className="mf-btn-primary-wide mf-link-btn" onClick={() => clearMergeFlowDraft()}>
        Back to Home
      </Link>
    </MergeShell>
  )
}

export function MergeIncomingPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchTreeMergeRequest>> | null>(null)
  const [error, setError] = useState('')
  const [declineOpen, setDeclineOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    void fetchTreeMergeRequest(token)
      .then(setData)
      .catch((err) => setError(getCallableErrorMessage(err)))
  }, [token])

  async function handleDecline(comment: string) {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      await declineTreeMerge(token, comment)
      navigate('/home/invitations')
    } catch (err) {
      setError(getCallableErrorMessage(err))
      setDeclineOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) {
    const stale =
      error.toLowerCase().includes('not found') ||
      error.toLowerCase().includes('missing an update')
    return (
      <MergeShell title="Merge request">
        <p className="modal-form-error">{error}</p>
        {stale ? (
          <p className="mf-lede">
            This request may have been removed or already handled. Check Invitations or add the
            person again to start a new merge.
          </p>
        ) : null}
        <Link to="/home/invitations" className="mf-btn-outline-wide mf-link-btn">
          Back to invitations
        </Link>
      </MergeShell>
    )
  }

  if (!data) {
    return (
      <MergeShell title="Family Merge Request">
        <p className="mf-lede">Loading…</p>
      </MergeShell>
    )
  }

  const conflictCount = data.conflicts?.length ?? 0

  return (
    <MergeShell title="Family Merge Request">
      <div className="mf-icon-circle mf-icon-bell" aria-hidden="true">
        🔔
      </div>
      <p className="mf-lede">
        <strong>{data.inviterName}</strong> invited you to join their family as their{' '}
        <strong>{data.roleLabel.toLowerCase()}</strong> and merge trees.
      </p>
      <div className="mf-request-card">
        <div className="mf-request-head">
          <span className="mf-compare-avatar">{initialsFromName(data.inviterName)}</span>
          <div>
            <strong>Request from {data.inviterName}</strong>
            <span className="mf-request-role">As your {data.roleLabel.toLowerCase()}</span>
          </div>
        </div>
        {data.mergeMessage ? (
          <div className="mf-request-message">
            <p>{data.mergeMessage}</p>
          </div>
        ) : null}
        {conflictCount > 0 ? (
          <p className="mf-request-conflict-note">
            {conflictCount} conflict{conflictCount === 1 ? '' : 's'} to review before accepting.
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="modal-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="mf-btn-primary-wide"
        onClick={() => navigate(`/home/merge/incoming/${token}/family`)}
      >
        Review conflicts &amp; family →
      </button>
      <div className="mf-incoming-actions">
        <button
          type="button"
          className="mf-btn-decline"
          disabled={busy}
          onClick={() => setDeclineOpen(true)}
        >
          ✕ Decline invite
        </button>
        <button
          type="button"
          className="mf-btn-accept"
          onClick={() => navigate(`/home/merge/incoming/${token}/family`)}
        >
          ✓ Review &amp; accept
        </button>
      </div>
      <DeclineMergeModal
        open={declineOpen}
        inviterName={data.inviterName}
        busy={busy}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(comment) => void handleDecline(comment)}
      />
    </MergeShell>
  )
}

export function MergeViewFamilyPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [family, setFamily] = useState<Awaited<ReturnType<typeof fetchMergeRequesterFamily>> | null>(
    null,
  )
  const [request, setRequest] = useState<Awaited<ReturnType<typeof fetchTreeMergeRequest>> | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [declineOpen, setDeclineOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    void Promise.all([fetchMergeRequesterFamily(token), fetchTreeMergeRequest(token)])
      .then(([fam, req]) => {
        setFamily(fam)
        setRequest(req)
      })
      .catch((err) => setError(getCallableErrorMessage(err)))
  }, [token])

  const parents = useMemo(
    () => family?.members.filter((m) => m.role === 'parent') ?? [],
    [family],
  )
  const siblings = useMemo(
    () => family?.members.filter((m) => m.role === 'sibling') ?? [],
    [family],
  )

  async function handleAccept() {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      await acceptTreeMerge(token)
      setSelfOnTree()
      clearMergeFlowDraft()
      navigate('/home/tree')
    } catch (err) {
      setError(getCallableErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline(comment: string) {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      await declineTreeMerge(token, comment)
      navigate('/home/invitations')
    } catch (err) {
      setError(getCallableErrorMessage(err))
      setDeclineOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!family || !request) {
    return (
      <MergeShell title="Resolve merge conflicts">
        <p className="mf-lede">{error || 'Loading…'}</p>
      </MergeShell>
    )
  }

  const isInvitee = user?.uid === request.inviteeUid
  const conflicts = request.conflicts ?? []

  return (
    <MergeShell
      title="Resolve merge conflicts"
      subtitle={`${family.requesterName} invited you as their ${request.roleLabel.toLowerCase()}. Review overlapping relatives below.`}
    >
      <div className="mf-requester-chip">
        <ProfileAvatar
          photoURL={family.requesterPhotoURL}
          name={family.requesterName}
          size="md"
        />
        <div>
          <strong>{family.requesterName}</strong>
          <span>Sender · join as {request.roleLabel.toLowerCase()}</span>
        </div>
      </div>

      <ConflictCompare conflicts={conflicts} senderName={family.requesterName} />

      <h2 className="mf-section-label">Their Immediate Family</h2>
      <div className="mf-mini-tree">
        <div className="mf-mini-row">
          {parents.slice(0, 2).map((p) => (
            <div key={p.id} className="mf-mini-person">
              <span className="mf-mini-avatar">{initialsFromName(p.displayName)}</span>
              <strong>{p.displayName}</strong>
              <span>{p.role === 'parent' ? 'Parent' : p.role}</span>
            </div>
          ))}
        </div>
        <div className="mf-mini-row">
          {siblings.slice(0, 3).map((s) => (
            <div key={s.id} className="mf-mini-person">
              <span className="mf-mini-avatar">{initialsFromName(s.displayName)}</span>
              <strong>{s.displayName}</strong>
              <span>Sibling</span>
            </div>
          ))}
          <div className="mf-mini-person mf-mini-person-you">
            <span className="mf-mini-avatar">{initialsFromName(family.requesterName)}</span>
            <strong>{family.requesterName.split(/\s+/)[0]}</strong>
            <span>Sender</span>
          </div>
        </div>
      </div>
      {error ? (
        <p className="modal-form-error" role="alert">
          {error}
        </p>
      ) : null}
      {isInvitee ? (
        <div className="mf-actions-stack">
          <button
            type="button"
            className="mf-btn-primary-wide"
            disabled={busy}
            onClick={() => void handleAccept()}
          >
            {busy
              ? 'Merging…'
              : conflicts.length
                ? "Accept sender's family & merge →"
                : 'Accept Merge Request →'}
          </button>
          <button
            type="button"
            className="mf-btn-outline-wide"
            disabled={busy}
            onClick={() => setDeclineOpen(true)}
          >
            Decline invite
          </button>
        </div>
      ) : (
        <Link to={`/home/merge/incoming/${token}`} className="mf-btn-outline-wide mf-link-btn">
          ← Back
        </Link>
      )}
      <DeclineMergeModal
        open={declineOpen}
        inviterName={family.requesterName}
        busy={busy}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(comment) => void handleDecline(comment)}
      />
    </MergeShell>
  )
}
