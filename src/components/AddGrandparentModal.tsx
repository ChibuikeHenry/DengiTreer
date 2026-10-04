import { useEffect, useState, type FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import {
  ContactFields,
  MemberBioField,
  PersonalInfoFields,
} from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { normalizeDateField } from '../lib/lifeDates'
import type { ParentSlot } from '../lib/siblingRelationship'

import type { InviteRole } from '../lib/invitations'

const relationships = [
  'Grandfather',
  'Grandmother',
  'Great-grandfather',
  'Great-grandmother',
  'Unknown / Not Known',
] as const
const UNKNOWN_RELATIONSHIP = 'Unknown / Not Known'

function relationshipToRole(relationship: string): InviteRole {
  if (relationship === 'Great-grandfather' || relationship === 'Great-grandmother') {
    return 'great-grandparent'
  }
  return 'grandparent'
}

function relationshipToParentSlot(relationship: string): ParentSlot {
  if (relationship === 'Grandfather' || relationship === 'Great-grandfather') return 'father'
  if (relationship === 'Grandmother' || relationship === 'Great-grandmother') return 'mother'
  return 'unknown'
}

type Props = { open: boolean; onClose: () => void; onAdded?: () => void }

export default function AddGrandparentModal({ open, onClose, onAdded }: Props) {
  const [relationship, setRelationship] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [dateOfDeath, setDateOfDeath] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const photo = usePhotoPicker()
  const [privacy] = useDefaultMemberPrivacy(open)
  const { submitting, error, submit } = useFamilyMemberInviteSubmit(
    'grandparent',
    onClose,
    onAdded,
  )

  useEffect(() => {
    if (open) return
    photo.reset()
  }, [open, photo.reset])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!relationship) return

    const isUnknown = relationship === UNKNOWN_RELATIONSHIP
    const isGreat = relationship === 'Great-grandfather' || relationship === 'Great-grandmother'
    const resolvedFirst = firstName.trim() || (isUnknown ? 'Unknown' : '')
    const resolvedLast =
      lastName.trim() || (isUnknown ? 'Grandparent' : isGreat ? 'Great-grandparent' : 'Grandparent')
    if (!resolvedFirst || !resolvedLast) return

    await submit({
      role: relationshipToRole(relationship),
      firstName: resolvedFirst,
      middleName: middleName.trim(),
      lastName: resolvedLast,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      photoFile: photo.file,
      privacy,
      bio: bio.trim() || undefined,
      parentSlot: relationshipToParentSlot(relationship),
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    })
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Grandparent"
      description="Add your grandparent to the top of your family tree. Include birth and death dates when you know them."
      submitLabel="Add Grandparent"
      onSubmit={handleSubmit}
      formError={error}
      submitting={submitting}
    >
      <section className="modal-section">
        <h3>1. Relationship</h3>
        <label className="field">
          <span>Relationship to you</span>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            required
          >
            <option value="">Select relationship</option>
            {relationships.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="modal-section">
        <h3>2. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="grandparent"
          firstName={firstName}
          middleName={middleName}
          lastName={lastName}
          dob={dob}
          dateOfDeath={dateOfDeath}
          gender={gender}
          status={status}
          onFirstName={setFirstName}
          onMiddleName={setMiddleName}
          onLastName={setLastName}
          onDob={setDob}
          onDateOfDeath={setDateOfDeath}
          onGender={setGender}
          onStatus={setStatus}
        />
      </section>

      <section className="modal-section">
        <h3>3. Contact Information {status === 'living' ? '' : '(Optional)'}</h3>
        <ContactFields
          phone={phone}
          email={email}
          onPhone={setPhone}
          onEmail={setEmail}
          emailOptionalHint={status === 'living'}
          photoPreviewUrl={photo.previewUrl}
          onPhotoSelect={photo.selectFile}
          photoError={photo.error}
        />
      </section>

      <section className="modal-section">
        <h3>4. About this person (Optional)</h3>
        <MemberBioField bio={bio} onBioChange={setBio} idPrefix="grandparent" />
      </section>
    </ModalFrame>
  )
}
