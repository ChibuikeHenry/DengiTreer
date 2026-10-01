import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  MemberBioField,
  PersonalInfoFields,
} from './familyFormFields'
import MemberPrivacyFields from './MemberPrivacyFields'
import { useAuth } from '../context/AuthContext'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import {
  getCallableErrorMessage,
  updatePendingFamilyMemberProfile,
} from '../lib/invitations'
import { parseMemberPrivacy, type MemberPrivacy } from '../lib/memberPrivacy'
import { uploadFamilyMemberPhoto } from '../lib/profilePhoto'
import type { TreeMember } from '../lib/familyTreeMembers'
import type { ParentKind, ParentSlot } from '../lib/siblingRelationship'

type EditFamilyMemberModalProps = {
  open: boolean
  member: TreeMember | null
  onClose: () => void
  onUpdated: () => void
}

export default function EditFamilyMemberModal({
  open,
  member,
  onClose,
  onUpdated,
}: EditFamilyMemberModalProps) {
  const { user } = useAuth()
  const photo = usePhotoPicker()
  const [submitting, setSubmitting] = useState(false)
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
  const [privacy, setPrivacy] = useState<MemberPrivacy>('family_members')

  const isParent = member?.role === 'parent'
  const [parentKind, setParentKind] = useState<ParentKind>('biological')
  const [parentSlot, setParentSlot] = useState<ParentSlot>('father')

  useEffect(() => {
    if (!open || !member) return
    setFirstName(member.firstName)
    setMiddleName('')
    setLastName(member.lastName)
    setEmail(member.inviteeEmail ?? '')
    setGender('')
    setDob(member.dateOfBirth ?? '')
    setDod(member.dateOfDeath ?? '')
    setStatus(member.memberStatus)
    setBio(member.bio)
    setPrivacy(parseMemberPrivacy(member.privacy))
    setParentKind(member.parentKind ?? 'biological')
    setParentSlot(member.parentSlot ?? 'father')
    setError('')
    photo.reset()
  }, [open, member])

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

      await updatePendingFamilyMemberProfile({
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
        privacy,
        ...(isParent ? { parentKind, parentSlot } : {}),
      })

      onUpdated()
      onClose()
    } catch (err) {
      setError(getCallableErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title={`Edit ${member.displayName}`}
      description="Update their details before they log in and claim their profile."
      submitLabel="Save Changes"
      onSubmit={handleSubmit}
      formError={error}
      submitting={submitting}
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
                onChange={(e) => setParentSlot(e.target.value as ParentSlot)}
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

      <MemberPrivacyFields privacy={privacy} onPrivacyChange={setPrivacy} sectionNumber={4} />
    </ModalFrame>
  )
}
