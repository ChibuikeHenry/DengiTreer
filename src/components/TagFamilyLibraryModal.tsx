import { useEffect, useId, useState } from 'react'
import { DashIcons } from './DashboardLayout'
import { FAMILY_LIBRARY_SELF_TAG } from '../lib/familyLibrary'
import { treeMemberRoleLabel, type TreeMember } from '../lib/familyTreeMembers'

type TagFamilyLibraryModalProps = {
  open: boolean
  onClose: () => void
  photoLabel: string
  members: TreeMember[]
  selfName: string
  initialTaggedIds: string[]
  saving?: boolean
  onSave: (taggedMemberIds: string[]) => void | Promise<void>
}

export default function TagFamilyLibraryModal({
  open,
  onClose,
  photoLabel,
  members,
  selfName,
  initialTaggedIds,
  saving = false,
  onSave,
}: TagFamilyLibraryModalProps) {
  const titleId = useId()
  const [selected, setSelected] = useState<string[]>(initialTaggedIds)

  useEffect(() => {
    if (open) setSelected(initialTaggedIds)
  }, [open, initialTaggedIds])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

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
            <p>Select who appears in {photoLabel}. Tagged photos show on their profile.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            {DashIcons.close()}
          </button>
        </header>
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
          <button type="button" className="share-tree-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-submit"
            disabled={saving}
            onClick={() => void onSave(selected)}
          >
            {saving ? 'Saving…' : 'Save tags'}
          </button>
        </div>
      </div>
    </div>
  )
}
