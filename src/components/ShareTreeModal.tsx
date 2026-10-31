import { useEffect, useId, useRef, useState } from 'react'
import { DashIcons } from './DashboardLayout'
import { treeShareViewUrl } from '../lib/treeShare'

type ShareTreeModalProps = {
  open: boolean
  onClose: () => void
  ownerUid: string | null
}

export default function ShareTreeModal({ open, onClose, ownerUid }: ShareTreeModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [link, setLink] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy link')
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !ownerUid) return
    setLink(treeShareViewUrl(ownerUid))
    setCopyLabel('Copy link')
    setError('')
  }, [open, ownerUid])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !ownerUid) return null

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy link'), 2000)
    } catch {
      setError('Could not copy the link. Select it and copy manually.')
    }
  }

  async function handleShare() {
    if (!link) return
    setSharing(true)
    setError('')
    const title = 'My family tree'
    const text = `View my family tree on DengiTree:\n${link}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text, url: link })
        return
      }
      await copyLink()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Sharing is not available here. Copy the link instead.')
    } finally {
      setSharing(false)
    }
  }

  const canShareNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel share-tree-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>Share your family tree</h2>
            <p>Opens your tree in DengiTree. Family who are signed in can view it with this link.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            {DashIcons.close()}
          </button>
        </header>

        <div className="share-tree-body">
          <section className="modal-section">
            <h3>Tree link</h3>
            <p className="field-hint">Opens your tree in DengiTree</p>
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
                <input className="inv-link-input" readOnly value={link} onFocus={(e) => e.target.select()} />
              </label>
              <button type="button" className="inv-copy-btn" onClick={() => void copyLink()}>
                {copyLabel}
              </button>
            </div>
          </section>

          {error ? (
            <p className="modal-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="share-tree-actions">
            {canShareNative ? (
              <button
                type="button"
                className="modal-submit"
                disabled={sharing || !link}
                onClick={() => void handleShare()}
              >
                {sharing ? 'Opening share…' : 'Share link'}
              </button>
            ) : (
              <button type="button" className="modal-submit" onClick={() => void copyLink()}>
                {copyLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
