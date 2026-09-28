import { useEffect, useState } from 'react'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  OccupationEducationFields,
  PersonalInfoFields,
} from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { usePhotoPicker } from '../hooks/usePhotoPicker'

type Props = { open: boolean; onClose: () => void }

export default function AddSpouseModal({ open, onClose }: Props) {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const photo = usePhotoPicker()

  const { submitting, error, onSubmit } = useFamilyMemberInviteSubmit('spouse', onClose)

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
      onSubmit={onSubmit({
        firstName,
        middleName,
        lastName,
        inviteeEmail: email,
        memberStatus: status,
        photoFile: photo.file,
      })}
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
          gender={gender}
          status={status}
          onFirstName={setFirstName}
          onMiddleName={setMiddleName}
          onLastName={setLastName}
          onDob={setDob}
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
            <input type="date" />
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
    </ModalFrame>
  )
}
