import { useEffect, useId, useRef } from 'react'
import { DashIcons } from './DashboardLayout'

type PhotoLightboxProps = {
  open: boolean
  src: string | null
  alt?: string
  onClose: () => void
}

export default function PhotoLightbox({ open, src, alt = 'Photo', onClose }: PhotoLightboxProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

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

  if (!open || !src) return null

  return (
    <div
      className="photo-lightbox-backdrop"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
      role="presentation"
    >
      <div
        className="photo-lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">
          Enlarged photo
        </h2>
        <button
          type="button"
          className="photo-lightbox-close"
          onClick={onClose}
          aria-label="Close"
        >
          {DashIcons.close()}
        </button>
        <img className="photo-lightbox-img" src={src} alt={alt} />
      </div>
    </div>
  )
}
