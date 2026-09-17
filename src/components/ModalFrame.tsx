import { useEffect, useId, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { DashIcons } from './DashboardLayout'

type ModalFrameProps = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  submitLabel: string
  onSubmit: (event: FormEvent) => void
  children: ReactNode
}

export default function ModalFrame({
  open,
  onClose,
  title,
  description,
  submitLabel,
  onSubmit,
  children,
}: ModalFrameProps) {
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

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            <p>{description}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            {DashIcons.close()}
          </button>
        </header>

        <form className="modal-form" onSubmit={onSubmit}>
          {children}
          <footer className="modal-actions">
            <button type="button" className="btn-modal-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary">
              {submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
