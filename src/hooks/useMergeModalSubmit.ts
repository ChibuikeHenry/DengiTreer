import { useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import type { FamilyMemberInviteInput, InviteRole } from '../lib/invitations'
import { beginMergeFlowFromModal, type MergeCheckResult } from '../lib/mergeFlowDraft'

type Params = {
  mergeMatch: MergeCheckResult | null
  mergeDismissed: boolean
  invitePayload: FamilyMemberInviteInput & { role: InviteRole }
  onClose: () => void
  defaultSubmitLabel: string
  defaultSubmittingText: string
}

export function useMergeModalSubmit({
  mergeMatch,
  mergeDismissed,
  invitePayload,
  onClose,
  defaultSubmitLabel,
  defaultSubmittingText,
}: Params) {
  const navigate = useNavigate()
  const offerMerge = Boolean(mergeMatch && !mergeDismissed)

  const submitLabel = offerMerge ? 'Merge family' : defaultSubmitLabel
  const submittingText = offerMerge ? 'Starting merge…' : defaultSubmittingText

  function startMerge() {
    if (!mergeMatch) return
    beginMergeFlowFromModal(navigate, onClose, invitePayload, mergeMatch)
  }

  function interceptSubmit(
    event: FormEvent,
    continueNormalSubmit: () => void | Promise<void>,
  ) {
    event.preventDefault()
    if (offerMerge) {
      startMerge()
      return
    }
    void continueNormalSubmit()
  }

  return { offerMerge, submitLabel, submittingText, startMerge, interceptSubmit }
}
