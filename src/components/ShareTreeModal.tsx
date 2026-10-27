import { useEffect, useId, useRef, useState } from 'react'
import { DashIcons } from './DashboardLayout'
import { treeShareImageFilename, treeShareViewUrl } from '../lib/treeShare'

type ShareTreeModalProps = {
  open: boolean
  onClose: () => void
  ownerUid: string | null
  ownerDisplayName: string
  exportPng: (caption?: string) => Promise<Blob>
}

export default function ShareTreeModal({
  open,
  onClose,
  ownerUid,
  ownerDisplayName,
  exportPng,
}: ShareTreeModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [link, setLink] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy link')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !ownerUid) return
    setLink(treeShareViewUrl(ownerUid))
    setCopyLabel('Copy link')
    setError('')
    let cancelled = false
    setLoadingImage(true)
    const caption = `${ownerDisplayName || 'My'} family tree — DengiTree`
    void exportPng(caption)
      .then((blob) => {
        if (cancelled) return
        setImageBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
      })
      .catch(() => {
        if (!cancelled) setError('We could not create the tree image. Try again in a moment.')
      })
      .finally(() => {
        if (!cancelled) setLoadingImage(false)
      })
    return () => {
      cancelled = true
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setImageBlob(null)
    }
  }, [open, ownerUid, ownerDisplayName, exportPng])

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

  function downloadImage() {
    if (!imageBlob) return
    const url = URL.createObjectURL(imageBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = treeShareImageFilename(ownerDisplayName)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function handleShare() {
    if (!link) return
    setSharing(true)
    setError('')
    const title = `${ownerDisplayName.trim() || 'My'} family tree`
    const text = `View my family tree on DengiTree:\n${link}`
    try {
      if (imageBlob && typeof navigator.share === 'function') {
        const file = new File([imageBlob], treeShareImageFilename(ownerDisplayName), {
          type: 'image/png',
        })
        const withFile = { title, text, files: [file] }
        if (navigator.canShare?.(withFile)) {
          await navigator.share(withFile)
          return
        }
        await navigator.share({ title, text, url: link })
        return
      }
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text, url: link })
        return
      }
      await copyLink()
      if (imageBlob) downloadImage()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Sharing is not available here. Copy the link or download the image instead.')
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
            <p>
              Send a link and an image of your tree. Family on DengiTree can open the link when
              they are signed in.
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            {DashIcons.close()}
          </button>
        </header>

        <div className="share-tree-body">
          <section className="modal-section">
            <h3>Tree link</h3>
            <p className="field-hint">
              Opens your tree in DengiTree for relatives who already have access.
            </p>
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

          <section className="modal-section">
            <h3>Tree image</h3>
            <p className="field-hint">PNG of your diagram (without add placeholders).</p>
            <div className="share-tree-preview" aria-busy={loadingImage}>
              {loadingImage ? (
                <p className="share-tree-preview-loading">Preparing image…</p>
              ) : previewUrl ? (
                <img src={previewUrl} alt="" className="share-tree-preview-img" />
              ) : (
                <p className="share-tree-preview-loading">Image not ready</p>
              )}
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
                disabled={loadingImage || sharing || !imageBlob}
                onClick={() => void handleShare()}
              >
                {sharing ? 'Opening share…' : 'Share link & image'}
              </button>
            ) : null}
            <button
              type="button"
              className={canShareNative ? 'share-tree-secondary' : 'modal-submit'}
              disabled={loadingImage || !imageBlob}
              onClick={downloadImage}
            >
              Download image
            </button>
            {!canShareNative ? (
              <button type="button" className="share-tree-secondary" onClick={() => void copyLink()}>
                {copyLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
