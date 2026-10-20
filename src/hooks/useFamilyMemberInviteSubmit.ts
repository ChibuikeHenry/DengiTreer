import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getCallableErrorMessage,
  normalizeInviteeEmail,
  sendFamilyMemberInvite,
  type FamilyMemberInviteInput,
  type InviteRole,
} from '../lib/invitations'
import { uploadFamilyMemberPhoto } from '../lib/profilePhoto'

export type FamilyMemberSubmitFields = Omit<FamilyMemberInviteInput, 'role'> & {
  role?: InviteRole
  photoFile?: File | null
}

export function useFamilyMemberInviteSubmit(
  defaultRole: InviteRole,
  onClose: () => void,
  onAdded?: () => void,
) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = useCallback(
    async (fields: FamilyMemberSubmitFields) => {
      if (!user) {
        setError('Sign in to add family members.')
        return
      }

      setError('')
      setSubmitting(true)
      try {
        const { photoFile, role: overrideRole, ...inviteFields } = fields
        const targetRole = overrideRole ?? defaultRole
        let photoURL: string | undefined

        if (photoFile) {
          photoURL = await uploadFamilyMemberPhoto(user.uid, targetRole, photoFile)
        }

        const result = await sendFamilyMemberInvite({
          role: targetRole,
          ...inviteFields,
          inviteeEmail: normalizeInviteeEmail(inviteFields.inviteeEmail),
          photoURL,
        })
        if (result.mergeNotice) {
          window.alert(result.mergeNotice)
        }
        if (onAdded) onAdded()
        else onClose()
      } catch (err) {
        const message = getCallableErrorMessage(err)
        if (message.includes('storage/unauthorized') || message.includes('403')) {
          setError('Could not upload photo. Check Storage rules or try again without a photo.')
        } else {
          setError(message)
        }
      } finally {
        setSubmitting(false)
      }
    },
    [defaultRole, onAdded, onClose, user],
  )

  const onSubmit = useCallback(
    (fields: FamilyMemberSubmitFields) => (event: FormEvent) => {
      event.preventDefault()
      void submit(fields)
    },
    [submit],
  )

  return { submitting, error, onSubmit, submit }
}
