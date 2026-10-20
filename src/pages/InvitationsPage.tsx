import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  createShareInviteLink,
  defaultShareInviteMessage,
  formatInviteDate,
  getCallableErrorMessage,
  inviteRoleLabel,
  removeFamilyMemberFromTree,
  sendShareInviteEmail,
  subscribeReceivedInvitations,
  subscribeSentInvitations,
  updateFamilyMemberPrivacy,
  type InvitationRecord,
} from '../lib/invitations'
import {
  MEMBER_PRIVACY_OPTIONS,
  type MemberPrivacy,
} from '../lib/memberPrivacy'
import EditFamilyMemberModal from '../components/EditFamilyMemberModal'
import type { TreeMember } from '../lib/familyTreeMembers'
import {
  canInviterEditInvitation,
  canInviterRemoveFromTree,
  isProfileClaimed,
} from '../lib/profileClaim'
import {
  isMergePending,
  subscribeMergeRequestsForTokens,
  syncTreeMergeOffers,
  unmergeFamilyTrees,
  type TreeMergeRequest,
} from '../lib/treeMerge'

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

function inviterDisplayName(user: { displayName?: string | null; email?: string | null }) {
  const fromProfile = user.displayName?.trim()
  if (fromProfile) return fromProfile
  const email = user.email?.trim()
  if (email) return email.split('@')[0] ?? email
  return 'Someone'
}

function firstNameFromFullName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? ''
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('sent')
  const [composing, setComposing] = useState(false)
  const [inviteeName, setInviteeName] = useState('')
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [message, setMessage] = useState('')
  const [messageTouched, setMessageTouched] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sent, setSent] = useState<InvitationRecord[]>([])
  const [received, setReceived] = useState<InvitationRecord[]>([])
  const [listError, setListError] = useState('')
  const [composeError, setComposeError] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)
  const [privacyUpdatingId, setPrivacyUpdatingId] = useState<string | null>(null)
  const [editingMember, setEditingMember] = useState<TreeMember | null>(null)
  const [removingToken, setRemovingToken] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState('')
  const [unmergingToken, setUnmergingToken] = useState<string | null>(null)
  const [unmergeError, setUnmergeError] = useState('')
  const [mergesByToken, setMergesByToken] = useState<Map<string, TreeMergeRequest | null>>(
    () => new Map(),
  )
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

  const invitationTokens = useMemo(() => {
    const ids = new Set<string>()
    for (const item of sent) ids.add(item.token)
    for (const item of received) ids.add(item.token)
    return [...ids]
  }, [sent, received])

  useEffect(() => {
    return subscribeMergeRequestsForTokens(
      invitationTokens,
      setMergesByToken,
      (err) => console.warn('Tree merge request listen failed:', err),
    )
  }, [invitationTokens.join('|')])

  useEffect(() => {
    if (!user?.uid) return
    void syncTreeMergeOffers().catch((err) =>
      console.warn('Tree merge sync failed:', err),
    )
  }, [user?.uid])

  async function handleUnmergeTrees(item: InvitationRecord) {
    const confirmed = window.confirm(
      'Unmerge these family trees?\n\nRelatives copied from the other tree will be removed from the combined tree and restored on their original account. You can merge again later.',
    )
    if (!confirmed) return
    setUnmergeError('')
    setUnmergingToken(item.token)
    try {
      await unmergeFamilyTrees(item.token)
    } catch (err) {
      setUnmergeError(getCallableErrorMessage(err))
    } finally {
      setUnmergingToken(null)
    }
  }

  async function handleRemoveFromTree(item: InvitationRecord) {
    const name = item.inviteeName || 'this person'
    const claimed = isProfileClaimed(item)
    const confirmed = window.confirm(
      claimed
        ? `Remove ${name} from your tree?\n\nTheir DengiTree account is not deleted.`
        : `Remove ${name} from your tree?`,
    )
    if (!confirmed) return
    setRemoveError('')
    setRemovingToken(item.token)
    try {
      await removeFamilyMemberFromTree(item.token)
    } catch (err) {
      setRemoveError(getCallableErrorMessage(err))
    } finally {
      setRemovingToken(null)
    }
  }

  const pendingMergeOnReceived = useMemo(() => {
    return received.filter((item) =>
      isMergePending(item, mergesByToken.get(item.token)),
    )
  }, [received, mergesByToken])

  useEffect(() => {
    if (!composing || inviteLink || !user) return
    let cancelled = false
    setCreatingLink(true)
    setComposeError('')
    ;(async () => {
      try {
        const { joinUrl, token } = await createShareInviteLink()
        if (!cancelled) {
          setInviteLink(joinUrl)
          setInviteToken(token)
        }
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

  useEffect(() => {
    if (!composing || !inviteLink || !user || messageTouched) return
    setMessage(
      defaultShareInviteMessage({
        inviteeFirstName: firstNameFromFullName(inviteeName),
        inviterName: inviterDisplayName(user),
        joinUrl: inviteLink,
      }),
    )
  }, [composing, inviteLink, inviteeName, messageTouched, user])

  const sentCount = sent.length
  const receivedCount = received.length

  const activeList = useMemo(
    () => (tab === 'sent' ? sent : received),
    [received, sent, tab],
  )

  function resetCompose() {
    setComposing(false)
    setInviteeName('')
    setInviteeEmail('')
    setMessage('')
    setMessageTouched(false)
    setInviteToken('')
    setInviteLink('')
    setCopyLabel('Copy')
    setComposeError('')
  }

  async function copyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy'), 2000)
    } catch {
      /* ignore */
    }
  }

  async function handleSendEmail() {
    if (!inviteToken || !inviteLink) return
    setSendingEmail(true)
    setComposeError('')
    try {
      await sendShareInviteEmail({
        token: inviteToken,
        inviteeName: inviteeName.trim(),
        inviteeEmail: inviteeEmail.trim(),
        personalMessage: message.trim(),
      })
      resetCompose()
    } catch (err) {
      setComposeError(getCallableErrorMessage(err))
    } finally {
      setSendingEmail(false)
    }
  }

  async function handlePrivacyChange(item: InvitationRecord, privacy: MemberPrivacy) {
    setPrivacyUpdatingId(item.id)
    setListError('')
    try {
      await updateFamilyMemberPrivacy(item.token, privacy)
    } catch (err) {
      setListError(getCallableErrorMessage(err))
    } finally {
      setPrivacyUpdatingId(null)
    }
  }

  if (composing) {
    const canSend =
      Boolean(inviteToken && inviteLink) &&
      inviteeName.trim().length > 0 &&
      inviteeEmail.trim().includes('@') &&
      message.trim().length > 0

    return (
      <div className="home inv-page">
        <button type="button" className="inv-back" onClick={resetCompose}>
          ← Back to invitations
        </button>
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
              <label className="inv-link-input-wrap">
                <span className="inv-link-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  className="inv-link-input"
                  readOnly
                  value={
                    creatingLink && !inviteLink ? 'Generating link…' : inviteLink || ''
                  }
                  aria-label="Invite link"
                />
              </label>
              <button
                type="button"
                className="inv-copy-btn"
                onClick={() => void copyLink()}
                disabled={!inviteLink}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                {copyLabel}
              </button>
            </div>
          </div>

          <div className="inv-form-fields">
            <label className="inv-field">
              <span className="inv-field-label">Name</span>
              <input
                type="text"
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                autoComplete="name"
                placeholder="Full name"
              />
            </label>
            <label className="inv-field">
              <span className="inv-field-label">Email Address</span>
              <input
                type="email"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
            <label className="inv-field inv-field-message">
              <span className="inv-field-label">Personalized Message.</span>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessageTouched(true)
                  setMessage(e.target.value.slice(0, 600))
                }}
                rows={5}
              />
            </label>
          </div>

          {composeError ? (
            <p className="modal-form-error" role="alert">
              {composeError}
            </p>
          ) : null}

          <button
            type="button"
            className="inv-send-email-btn"
            onClick={() => void handleSendEmail()}
            disabled={!canSend || sendingEmail || creatingLink}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {sendingEmail ? 'Sending…' : 'Send Email'}
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
          <p>
            Manage sent and received invites.{' '}
            <strong>Tree merge</strong> applies to family invites (spouse, parent, child, sibling)
            — not generic “platform” share links. The person with the existing tree accepts merge
            under <strong>Received</strong>.
          </p>
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

      {removeError ? (
        <p className="modal-form-error" role="alert">
          {removeError}
        </p>
      ) : null}

      {unmergeError ? (
        <p className="modal-form-error" role="alert">
          {unmergeError}
        </p>
      ) : null}

      {pendingMergeOnReceived.length > 0 ? (
        <div className="inv-merge-banner" role="status">
          <strong>
            {pendingMergeOnReceived.length === 1
              ? '1 family tree merge waiting for you'
              : `${pendingMergeOnReceived.length} family tree merges waiting for you`}
          </strong>
          <p>
            Open the <button type="button" className="inv-merge-tab-link" onClick={() => setTab('received')}>Received</button>{' '}
            tab and choose <strong>Review merge request</strong> to combine your tree with theirs.
          </p>
        </div>
      ) : null}

      <section className="home-card inv-list-panel">
        {activeList.length ? (
          <ul className="inv-cards">
            {activeList.map((item) => {
              const merge = mergesByToken.get(item.token) ?? null
              const mergePending = isMergePending(item, merge)
              const canAcceptMerge =
                tab === 'received' && mergePending && item.role !== 'member'
              return (
              <li key={item.id} className="inv-card">
                <span className="inv-avatar">{initialsFor(item)}</span>
                <div className="inv-card-body">
                  <strong>{displayName(item)}</strong>
                  {item.inviteeEmail ? <span>{item.inviteeEmail}</span> : null}
                  <span className="inv-date">
                    {tab === 'sent' ? 'Sent' : 'Received'} on{' '}
                    {formatInviteDate(item.createdAt) || '—'}
                    {item.role === 'member'
                      ? ' · Platform invite (not on your tree)'
                      : ` · ${inviteRoleLabel(item.role)}`}
                    {mergePending ? ' · Tree merge offered' : null}
                    {merge?.status === 'accepted' ? ' · Trees merged' : null}
                    {merge?.status === 'undone' ? ' · Merge undone' : null}
                    {merge?.status === 'declined' ? ' · Merge declined' : null}
                  </span>
                  {tab === 'received' && mergePending ? (
                    <p className="inv-merge-note">
                      You already have a family tree. Accept merge to copy your relatives into
                      their tree and join as {inviteRoleLabel(item.role).toLowerCase()}.
                    </p>
                  ) : null}
                  {tab === 'sent' && mergePending ? (
                    <p className="inv-merge-note">
                      This person already has a tree — they can accept a merge from their Received
                      tab.
                    </p>
                  ) : null}
                  {tab === 'sent' && item.treeMergeInviterNotice && !mergePending ? (
                    <p className="inv-merge-note">{item.treeMergeInviterNotice}</p>
                  ) : null}
                  {merge?.status === 'accepted' && item.role !== 'member' ? (
                    <p className="inv-merge-note">
                      Your trees are combined. Unmerge to split copied relatives back onto each
                      account (for testing or if you merged by mistake).
                    </p>
                  ) : null}
                  {tab === 'sent' && item.role !== 'member' ? (
                    <label className="inv-privacy">
                      <span className="sr-only">Who can view {displayName(item)}</span>
                      <select
                        value={item.privacy}
                        disabled={privacyUpdatingId === item.id}
                        onChange={(e) =>
                          void handlePrivacyChange(
                            item,
                            e.target.value as MemberPrivacy,
                          )
                        }
                      >
                        {MEMBER_PRIVACY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                {tab === 'sent' && mergePending ? (
                  <span className="inv-badge inv-badge-merge">Merge offered</span>
                ) : null}
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
                {canAcceptMerge ? (
                  <div className="inv-merge-actions">
                    <Link
                      to={`/home/merge/incoming/${item.token}`}
                      className="inv-send-btn inv-merge-accept"
                      style={{ textAlign: 'center', textDecoration: 'none' }}
                    >
                      Review merge request
                    </Link>
                  </div>
                ) : null}
                {merge?.status === 'accepted' && item.role !== 'member' ? (
                  <button
                    type="button"
                    className="people-row-remove"
                    disabled={unmergingToken === item.token}
                    onClick={() => void handleUnmergeTrees(item)}
                    style={{ fontSize: '0.8rem', marginLeft: '0.35rem' }}
                  >
                    {unmergingToken === item.token ? 'Unmerging…' : 'Unmerge trees'}
                  </button>
                ) : null}
                {tab === 'sent' && canInviterEditInvitation(item) ? (
                  <button
                    type="button"
                    className="inv-menu"
                    aria-label="Edit details"
                    title="Edit member details before they sign up"
                    onClick={() =>
                      setEditingMember({
                        id: item.token,
                        firstName: item.inviteeFirstName || item.inviteeName?.split(' ')[0] || '',
                        lastName: item.inviteeLastName || item.inviteeName?.split(' ').slice(-1)[0] || '',
                        displayName: item.inviteeName || 'Family member',
                        role: item.role,
                        photoURL: item.photoURL,
                        memberStatus: item.memberStatus,
                        inviteStatus: item.status,
                        joinedUid: item.joinedUid,
                        profileClaimed: isProfileClaimed(item),
                        inviterCanEdit: canInviterEditInvitation(item),
                        inviterCanRemove: canInviterRemoveFromTree(item),
                        privacy: item.privacy,
                        bio: item.bio,
                        parentSlot: item.parentSlot,
                        parentKind: item.parentKind,
                        sharedFatherMemberId: item.sharedFatherMemberId,
                        sharedMotherMemberId: item.sharedMotherMemberId,
                        siblingRelationship: item.siblingRelationship,
                        dateOfBirth: item.dateOfBirth,
                        dateOfDeath: item.dateOfDeath,
                        gender: item.gender,
                        inviteeEmail: item.inviteeEmail,
                      })
                    }
                    style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                ) : null}
                {tab === 'sent' && canInviterRemoveFromTree(item) ? (
                  <button
                    type="button"
                    className="people-row-remove"
                    disabled={removingToken === item.token}
                    onClick={() => void handleRemoveFromTree(item)}
                    style={{ fontSize: '0.8rem', marginLeft: '0.35rem' }}
                  >
                    {removingToken === item.token ? 'Removing…' : 'Remove'}
                  </button>
                ) : null}
              </li>
            )})}
          </ul>
        ) : (
          <p className="inv-empty">
            {tab === 'sent'
              ? 'No invitations sent yet. Add a family member with their email or create a share link.'
              : 'No received invitations yet.'}
          </p>
        )}
      </section>

      <EditFamilyMemberModal
        open={editingMember !== null}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onUpdated={() => {}}
      />

      <p className="inv-foot-link">
        <Link to="/home">Back to Home</Link>
      </p>
    </div>
  )
}
