import { useEffect, useState, type FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import {
  ContactFields,
  MemberBioField,
  OccupationEducationFields,
  PersonalInfoFields,
} from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { getTodayString, normalizeDateField } from '../lib/lifeDates'
import { usePhotoPicker } from '../hooks/usePhotoPicker'

type Props = { open: boolean; onClose: () => void; onAdded?: () => void }

export default function AddSpouseModal({ open, onClose, onAdded }: Props) {
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
  const { submitting, error, submit } = useFamilyMemberInviteSubmit('spouse', onClose, onAdded)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await submit({
      firstName,
      middleName,
      lastName,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      gender: gender || undefined,
      photoFile: photo.file,
      privacy,
      bio: bio.trim() || undefined,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    })
  }

  useEffect(() => {
    if (open) return
    photo.reset()
  }, [open, photo.reset])

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Spouse"
      description="Add a new relative to your family tree. Living spouses receive an email invite to join with their role."
      submitLabel="Add Spouse"
      onSubmit={handleSubmit}
      formError={error}
      submitting={submitting}
    >
      <section className="modal-section">
        <h3>1. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="spouse"
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
        <h3>2. Relationship details</h3>
        <div className="form-row form-row-2">
          <label className="field">
            <span>Marital Status</span>
            <select defaultValue="">
              <option value="">Select marital status</option>
              <option value="married">Married</option>
              <option value="partner">Partner</option>
            </select>
          </label>
          <label className="field">
            <span>Wedding Anniversary Date (Optional)</span>
            <input type="date" max={getTodayString()} />
          </label>
        </div>
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
        <h3>4. Additional Information (Optional)</h3>
        <OccupationEducationFields />
      </section>

      <section className="modal-section">
        <h3>5. About this person (Optional)</h3>
        <MemberBioField bio={bio} onBioChange={setBio} idPrefix="spouse" />
      </section>
    </ModalFrame>
  )
}
