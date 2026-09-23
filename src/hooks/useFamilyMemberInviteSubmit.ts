import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getCallableErrorMessage,
  sendFamilyMemberInvite,
  type FamilyMemberInviteInput,
  type InviteRole,
} from '../lib/invitations'

type Fields = Omit<FamilyMemberInviteInput, 'role'>

export function useFamilyMemberInviteSubmit(role: InviteRole, onClose: () => void) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = useCallback(
    async (fields: Fields) => {
      setError('')
      setSubmitting(true)
      try {
        await sendFamilyMemberInvite({ role, ...fields })
        onClose()
      } catch (err) {
        setError(getCallableErrorMessage(err))
      } finally {
        setSubmitting(false)
      }
    },
    [onClose, role],
  )

  const onSubmit = useCallback(
    (fields: Fields) => (event: FormEvent) => {
      event.preventDefault()
      void submit(fields)
    },
    [submit],
  )

  return { submitting, error, onSubmit, submit }
}
