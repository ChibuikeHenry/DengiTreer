import { useNavigate } from 'react-router-dom'
import type { FamilyMemberInviteInput, InviteRole } from '../lib/invitations'
import type { MergeCheckResult } from '../lib/mergeFlowDraft'
import { startMergeFlowFromCheck } from '../lib/mergeFlowDraft'

type Props = {
  match: MergeCheckResult
  invitePayload: FamilyMemberInviteInput & { role: InviteRole }
  onCloseModal: () => void
  onDismiss: () => void
}

export default function MergeFamilyPrompt({
  match,
  invitePayload,
  onCloseModal,
  onDismiss,
}: Props) {
  const navigate = useNavigate()

  function handleMerge() {
    startMergeFlowFromCheck(invitePayload, match)
    onCloseModal()
    navigate('/home/merge/exists')
  }

  return (
    <div className="mf-modal-toast" role="dialog" aria-labelledby="mf-toast-title">
      <p id="mf-toast-title" className="mf-modal-toast-text">
        This user already exists on DengiTree. Would you like to merge families?
      </p>
      <div className="mf-modal-toast-actions">
        <button type="button" className="mf-btn-outline-sm" onClick={onDismiss}>
          Cancel
        </button>
        <button type="button" className="mf-btn-primary-sm" onClick={handleMerge}>
          Merge family
        </button>
      </div>
    </div>
  )
}
