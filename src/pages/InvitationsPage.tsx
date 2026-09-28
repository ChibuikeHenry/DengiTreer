import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  createShareInviteLink,
  formatInviteDate,
  getCallableErrorMessage,
  inviteRoleLabel,
  subscribeReceivedInvitations,
  subscribeSentInvitations,
  type InvitationRecord,
} from '../lib/invitations'
import { canInviterEditInvitation, isProfileClaimed } from '../lib/profileClaim'

type Tab = 'sent' | 'received'

function initialsFor(record: InvitationRecord): string {
  const source = record.inviteeName || record.inviteeEmail || '?'
  const parts = source.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function displayName(record: InvitationRecord): string {
  return record.inviteeName || record.inviteeEmail || 'Invite link'
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('sent')
  const [composing, setComposing] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [sent, setSent] = useState<InvitationRecord[]>([])
  const [received, setReceived] = useState<InvitationRecord[]>([])
  const [listError, setListError] = useState('')
  const [composeError, setComposeError] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    return subscribeSentInvitations(
      user.uid,
      setSent,
      (err) => setListError(err.message),
    )
  }, [user?.uid])

  useEffect(() => {
    if (!user?.email) {
      setReceived([])
      return
    }
    return subscribeReceivedInvitations(
      user.email,
      setReceived,
      (err) => setListError(err.message),
    )
  }, [user?.email])

  useEffect(() => {
    if (!composing || inviteLink || !user) return
    let cancelled = false
    setCreatingLink(true)
    setComposeError('')
    ;(async () => {
      try {
        const { joinUrl } = await createShareInviteLink()
        if (!cancelled) setInviteLink(joinUrl)
      } catch (err) {
        if (!cancelled) setComposeError(getCallableErrorMessage(err))
      } finally {
        if (!cancelled) setCreatingLink(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [composing, inviteLink, user])

  const sentCount = sent.length
  const receivedCount = received.length

  const activeList = useMemo(
    () => (tab === 'sent' ? sent : received),
    [received, sent, tab],
  )

  async function copyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      /* ignore */
    }
  }

  async function refreshShareLink() {
    setCreatingLink(true)
    setComposeError('')
    try {
      const { joinUrl } = await createShareInviteLink(message.trim() || undefined)
      setInviteLink(joinUrl)
    } catch (err) {
      setComposeError(getCallableErrorMessage(err))
    } finally {
      setCreatingLink(false)
    }
  }

  if (composing) {
    return (
      <div className="home inv-page">
        <header className="inv-head">
          <button
            type="button"
            className="inv-back"
            onClick={() => {
              setComposing(false)
              setInviteLink('')
              setMessage('')
            }}
          >
            ← Back
          </button>
        </header>
        <section className="home-card inv-compose">
          <h1>Invite Someone to DengiTree</h1>
          <p className="inv-lede">
            Share the link with someone who isn&apos;t on DengiTree yet. they can create
            their own account and add their family members to the tree.
          </p>

          <div className="inv-block">
            <h2>Share Your Invite Link</h2>
            <p>Copy and share this link with the person you want to invite.</p>
            <div className="inv-link-row">
              <span className="inv-link-field">
                {creatingLink && !inviteLink ? 'Generating link…' : inviteLink || '—'}
              </span>
              <button
                type="button"
                className="inv-copy-btn"
                onClick={copyLink}
                disabled={!inviteLink}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="inv-block">
            <h2>Personal Message (Optional)</h2>
            <p>Add a short message to include with your invitation.</p>
            <label className="inv-message-wrap">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                rows={5}
                placeholder=""
              />
              <span className="inv-char-count">{message.length}/300</span>
            </label>
          </div>

          {composeError ? (
            <p className="modal-form-error" role="alert">
              {composeError}
            </p>
          ) : null}

          <button
            type="button"
            className="inv-share-btn"
            onClick={async () => {
              if (message.trim()) {
                await refreshShareLink()
              }
              await copyLink()
            }}
            disabled={!inviteLink || creatingLink}
          >
            Copy Link &amp; Share
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="home inv-page">
      <header className="inv-list-head">
        <div>
          <h1>Invitations</h1>
          <p>Manage your sent invitation and see who has joined.</p>
        </div>
        <button type="button" className="inv-send-btn" onClick={() => setComposing(true)}>
          + Send invitation
        </button>
      </header>

      <div className="inv-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sent'}
          className={tab === 'sent' ? 'is-active' : ''}
          onClick={() => setTab('sent')}
        >
          Sent ({sentCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'received'}
          className={tab === 'received' ? 'is-active' : ''}
          onClick={() => setTab('received')}
        >
          Received ({receivedCount})
        </button>
      </div>

      {listError ? (
        <p className="modal-form-error" role="alert">
          {listError}
        </p>
      ) : null}

      <section className="home-card inv-list-panel">
        {activeList.length ? (
          <ul className="inv-cards">
            {activeList.map((item) => (
              <li key={item.id} className="inv-card">
                <span className="inv-avatar">{initialsFor(item)}</span>
                <div className="inv-card-body">
                  <strong>{displayName(item)}</strong>
                  {item.inviteeEmail ? <span>{item.inviteeEmail}</span> : null}
                  <span className="inv-date">
                    {tab === 'sent' ? 'Sent' : 'Received'} on{' '}
                    {formatInviteDate(item.createdAt) || '—'}
                    {item.role !== 'member' ? ` · ${inviteRoleLabel(item.role)}` : ''}
                  </span>
                </div>
                <span
                  className={`inv-badge inv-badge-${
                    isProfileClaimed(item)
                      ? 'claimed'
                      : item.status === 'joined'
                        ? 'joined'
                        : 'pending'
                  }`}
                  title={
                    tab === 'sent' && isProfileClaimed(item)
                      ? 'They claimed their profile. You can view them on your tree but cannot edit their details.'
                      : undefined
                  }
                >
                  {tab === 'sent' && isProfileClaimed(item)
                    ? 'Profile claimed'
                    : item.status === 'joined'
                      ? 'Joined'
                      : 'Pending'}
                </span>
                {tab === 'sent' && canInviterEditInvitation(item) ? (
                  <button type="button" className="inv-menu" aria-label="More options">
                    ⋮
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="inv-empty">
            {tab === 'sent'
              ? 'No invitations sent yet. Add a family member with their email or create a share link.'
              : 'No received invitations yet.'}
          </p>
        )}
      </section>

      <p className="inv-foot-link">
        <Link to="/home">Back to Home</Link>
      </p>
    </div>
  )
}
