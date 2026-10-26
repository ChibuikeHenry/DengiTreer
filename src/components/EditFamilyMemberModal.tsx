import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  MemberBioField,
  ParentSelectFields,
  PersonalInfoFields,
} from './familyFormFields'
import {
  coParentPickIdFromStored,
  resolveChildCoParentMemberId,
  selfCoParentMemberIds,
} from '../hooks/useTreeParentPickOptions'
import { useAuth } from '../context/AuthContext'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import {
  getCallableErrorMessage,
  removeFamilyMemberFromTree,
  updatePendingFamilyMemberProfile,
} from '../lib/invitations'
import { uploadFamilyMemberPhoto } from '../lib/profilePhoto'
import { resolveTreeMemberGender, type TreeMember } from '../lib/familyTreeMembers'
import {
  genderFromParentSlot,
  type ParentKind,
  type ParentSlot,
} from '../lib/siblingRelationship'
import { resolveUserProfileForForm } from '../lib/userProfile'

type EditFamilyMemberModalProps = {
  open: boolean
  member: TreeMember | null
  onClose: () => void
  onUpdated: () => void
  onRemoved?: () => void
}

export default function EditFamilyMemberModal({
  open,
  member,
  onClose,
  onUpdated,
  onRemoved,
}: EditFamilyMemberModalProps) {
  const { user } = useAuth()
  const photo = usePhotoPicker()
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [dod, setDod] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [bio, setBio] = useState('')

  const isParent = member?.role === 'parent'
  const usesSharedParents = member?.role === 'child' || member?.role === 'sibling'
  const parentPickMode = member?.role === 'sibling' ? 'sibling' : 'child'
  const [parentKind, setParentKind] = useState<ParentKind>('biological')
  const [parentSlot, setParentSlot] = useState<ParentSlot>('father')
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const formLoadedForMemberId = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      formLoadedForMemberId.current = null
      return
    }
    if (!member) return
    if (formLoadedForMemberId.current === member.id) return
    formLoadedForMemberId.current = member.id

    const slot = member.parentSlot ?? 'father'
    setFirstName(member.firstName)
    setMiddleName('')
    setLastName(member.lastName)
    setEmail(member.inviteeEmail ?? '')
    setGender(
      resolveTreeMemberGender({
        gender: member.gender,
        parentSlot: slot,
        role: member.role,
        siblingRelationship: member.siblingRelationship,
      }) ?? '',
    )
    setDob(member.dateOfBirth ?? '')
    setDod(member.dateOfDeath ?? '')
    setStatus(member.memberStatus)
    setBio(member.bio)
    setParentKind(member.parentKind ?? 'biological')
    setParentSlot(slot)
    setFatherId(member.sharedFatherMemberId ?? '')
    setMotherId(member.sharedMotherMemberId ?? '')
    setError('')
    photo.reset()

    if (!user || (member.role !== 'child' && member.role !== 'sibling')) return

    let cancelled = false
    ;(async () => {
      if (member.role === 'sibling') {
        setFatherId(member.sharedFatherMemberId ?? '')
        setMotherId(member.sharedMotherMemberId ?? '')
        return
      }
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const selfIds = selfCoParentMemberIds(profile)
      setFatherId(coParentPickIdFromStored(member.sharedFatherMemberId, selfIds))
      setMotherId(coParentPickIdFromStored(member.sharedMotherMemberId, selfIds))
    })()

    return () => {
      cancelled = true
    }
  }, [open, member, user, photo])

  if (!member) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user || !member) return

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      let photoURL: string | null | undefined = member.photoURL

      if (photo.file) {
        photoURL = await uploadFamilyMemberPhoto(user.uid, member.role, photo.file)
      }

      let sharedFatherMemberId: string | null | undefined
      let sharedMotherMemberId: string | null | undefined
      if (member.role === 'child') {
        sharedFatherMemberId = await resolveChildCoParentMemberId(user, fatherId)
        sharedMotherMemberId = await resolveChildCoParentMemberId(user, motherId)
      } else if (member.role === 'sibling') {
        sharedFatherMemberId = fatherId.trim() || null
        sharedMotherMemberId = motherId.trim() || null
      }

      const genderSave =
        gender.trim() ||
        (isParent ? genderFromParentSlot(parentSlot) : null) ||
        resolveTreeMemberGender({
          gender,
          parentSlot,
          role: member.role,
          siblingRelationship: member.siblingRelationship,
        })

      const updateResult = await updatePendingFamilyMemberProfile({
        token: member.id,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        inviteeEmail: email.trim() || null,
        photoURL,
        bio: bio.trim(),
        dateOfBirth: dob.trim() || null,
        dateOfDeath: status === 'deceased' ? dod.trim() || null : null,
        memberStatus: status,
        gender: genderSave,
        ...(isParent ? { parentKind, parentSlot } : {}),
        ...(member.role === 'child' || member.role === 'sibling'
          ? { sharedFatherMemberId, sharedMotherMemberId }
          : {}),
      })

      if (updateResult.mergeNotice) {
        window.alert(updateResult.mergeNotice)
      } else if (updateResult.treeMergeOffered) {
        window.alert(
          'This person already has a family tree on DengiTree. They will be asked to merge their tree with yours.',
        )
      }
      onUpdated()
      onClose()
    } catch (err) {
      setError(getCallableErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove() {
    if (!member || removing || submitting) return
    const claimed = member.profileClaimed || member.joinedUid
    const confirmed = window.confirm(
      claimed
        ? `Remove ${member.displayName} from your tree?\n\nTheir account stays on DengiTree. They will disappear from your tree and you can invite them again to test merge.`
        : `Remove ${member.displayName} from your tree?\n\nTheir pending invite and any merge request will be canceled. You can add them again later (useful for testing merge).`,
    )
    if (!confirmed) return

    setError('')
    setRemoving(true)
    try {
      await removeFamilyMemberFromTree(member.id)
      onRemoved?.()
      onUpdated()
      onClose()
    } catch (err) {
      setError(getCallableErrorMessage(err))
    } finally {
      setRemoving(false)
    }
  }

  const busy = submitting || removing

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title={`Edit ${member.displayName}`}
      description="Update their details before they log in and claim their profile."
      submitLabel="Save Changes"
      submittingText={email.trim() ? 'Sending invite…' : 'Saving changes…'}
      onSubmit={handleSubmit}
      formError={error}
      submitting={busy}
    >
      <section className="modal-section">
        <h3>1. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="edit-member"
          firstName={firstName}
          middleName={middleName}
          lastName={lastName}
          gender={gender}
          onGender={setGender}
          dob={dob}
          status={status}
          onFirstName={setFirstName}
          onMiddleName={setMiddleName}
          onLastName={setLastName}
          onDob={setDob}
          onStatus={setStatus}
          dateOfDeath={dod}
          onDateOfDeath={setDod}
        />
      </section>

      {usesSharedParents ? (
        <section className="modal-section">
          <h3>{member.role === 'child' ? 'Parent(s)' : 'Shared parents'}</h3>
          <p className="field-hint">
            {member.role === 'child'
              ? 'Choose who is this child’s parent(s) on your tree (you and/or your spouse or co-parent).'
              : 'Choose this sibling’s father and mother on your family tree.'}
          </p>
          <ParentSelectFields
            active={open}
            mode={parentPickMode}
            fatherId={fatherId}
            motherId={motherId}
            onFatherId={setFatherId}
            onMotherId={setMotherId}
          />
        </section>
      ) : null}

      {isParent ? (
        <section className="modal-section">
          <h3>Parent Type & Role</h3>
          <div className="form-row form-row-2">
            <label className="field">
              <span>Parent Type</span>
              <select
                value={parentKind}
                onChange={(e) => setParentKind(e.target.value as ParentKind)}
              >
                <option value="biological">Biological Parent</option>
                <option value="step">Step Parent</option>
                <option value="adoptive">Adoptive Parent</option>
              </select>
            </label>
            <label className="field">
              <span>Parent Role</span>
              <select
                value={parentSlot}
                onChange={(e) => {
                  const next = e.target.value as ParentSlot
                  setParentSlot(next)
                  const implied = genderFromParentSlot(next)
                  if (implied) setGender(implied)
                }}
              >
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="unknown">Unknown / Not Known</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section className="modal-section">
        <h3>2. Contact Information & Photo</h3>
        <ContactFields
          email={email}
          onEmail={setEmail}
          emailOptionalHint={status === 'living'}
          photoPreviewUrl={photo.previewUrl ?? member.photoURL}
          onPhotoSelect={photo.selectFile}
          photoError={photo.error}
        />
      </section>

      <section className="modal-section">
        <h3>3. Bio &amp; Notes</h3>
        <MemberBioField bio={bio} onBioChange={setBio} idPrefix="edit-member" />
      </section>

      <section className="modal-section modal-section-danger">
        <h3>Remove from tree</h3>
        <p className="field-hint">
          Remove this person from your tree (including if they already claimed their account). Their
          login is not deleted; you can invite them again afterward.
        </p>
        <button
          type="button"
          className="btn-tree-remove"
          disabled={busy}
          onClick={() => void handleRemove()}
        >
          {removing ? 'Removing…' : 'Remove from tree'}
        </button>
      </section>
    </ModalFrame>
  )
}
