import { useEffect, useId, useState } from 'react'
import { DashIcons } from './DashboardLayout'
import PhotoLightbox from './PhotoLightbox'
import { FAMILY_LIBRARY_SELF_TAG } from '../lib/familyLibrary'
import { treeMemberRoleLabel, type TreeMember } from '../lib/familyTreeMembers'

type TagFamilyLibraryModalProps = {
  open: boolean
  onClose: () => void
  photoUrl?: string | null
  photoAlt?: string
  members: TreeMember[]
  selfName: string
  initialTaggedIds: string[]
  saving?: boolean
  onSave: (taggedMemberIds: string[]) => void | Promise<void>
}

export default function TagFamilyLibraryModal({
  open,
  onClose,
  photoUrl = null,
  photoAlt = 'Photo',
  members,
  selfName,
  initialTaggedIds,
  saving = false,
  onSave,
}: TagFamilyLibraryModalProps) {
  const titleId = useId()
  const [selected, setSelected] = useState<string[]>(initialTaggedIds)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setSelected(initialTaggedIds)
      setLightboxOpen(false)
    }
  }, [open, initialTaggedIds])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !lightboxOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, lightboxOpen])

  if (!open) return null

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel tag-library-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>Tag people</h2>
            <p>Select people you want to tag in this photo.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            {DashIcons.close()}
          </button>
        </header>

        {photoUrl ? (
          <button
            type="button"
            className="tag-library-preview family-library-thumb"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Enlarge ${photoAlt}`}
          >
            <img src={photoUrl} alt={photoAlt} />
          </button>
        ) : null}

        <div className="tag-library-list">
          <label className="tag-library-option">
            <input
              type="checkbox"
              checked={selected.includes(FAMILY_LIBRARY_SELF_TAG)}
              onChange={() => toggle(FAMILY_LIBRARY_SELF_TAG)}
            />
            <span>
              <strong>{selfName || 'You'}</strong>
              <small>Your profile</small>
            </span>
          </label>
          {members.map((member) => (
            <label key={member.id} className="tag-library-option">
              <input
                type="checkbox"
                checked={selected.includes(member.id)}
                onChange={() => toggle(member.id)}
              />
              <span>
                <strong>{member.displayName}</strong>
                <small>{treeMemberRoleLabel(member)}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-modal-primary"
            disabled={saving}
            onClick={() => void onSave(selected)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn-modal-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>

      <PhotoLightbox
        open={lightboxOpen}
        src={photoUrl}
        alt={photoAlt}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
