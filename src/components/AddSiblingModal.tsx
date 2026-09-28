import { useEffect, useState } from 'react'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  OccupationEducationFields,
  ParentSelectFields,
  PersonalInfoFields,
} from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { usePhotoPicker } from '../hooks/usePhotoPicker'

type Props = { open: boolean; onClose: () => void }

export default function AddSiblingModal({ open, onClose }: Props) {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const photo = usePhotoPicker()

  const { submitting, error, onSubmit } = useFamilyMemberInviteSubmit('sibling', onClose)

  useEffect(() => {
    if (open) return
    photo.reset()
  }, [open, photo.reset])

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Sibling"
      description="Add your sibling to your family tree. Living siblings receive an email invite to join."
      submitLabel="Add Sibling"
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
        <h3>1. Select Parents</h3>
        <p className="field-hint">Choose the parents for this sibling from your family tree.</p>
        <ParentSelectFields />
      </section>

      <section className="modal-section">
        <h3>2. Sibling Details</h3>
        <div className="form-row form-row-sibling-details">
          <div className="form-stack">
            <label className="field">
              <span>Relationship Type</span>
              <select defaultValue="">
                <option value="">Select relationship type</option>
                <option value="brother">Brother</option>
                <option value="sister">Sister</option>
                <option value="half-brother">Half-brother</option>
                <option value="half-sister">Half-sister</option>
              </select>
              <span className="field-hint">e.g Brother, Sister, Half-brother, Half-sister</span>
            </label>
            <label className="field">
              <span>Order in Birth</span>
              <select defaultValue="">
                <option value="">Select birth order</option>
                <option value="1">First born</option>
                <option value="2">Second born</option>
                <option value="3">Third born</option>
              </select>
              <span className="field-hint">e.g First born, Second born, etc</span>
            </label>
          </div>
        </div>
      </section>

      <section className="modal-section">
        <h3>3. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="sibling"
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
        <h3>4. Contact Information {status === 'living' ? '' : '(Optional)'}</h3>
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
        <h3>5. Additional Information (Optional)</h3>
        <OccupationEducationFields />
      </section>
    </ModalFrame>
  )
}
