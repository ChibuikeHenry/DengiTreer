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

export default function AddChildModal({ open, onClose }: Props) {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const photo = usePhotoPicker()

  const { submitting, error, onSubmit } = useFamilyMemberInviteSubmit('child', onClose)

  useEffect(() => {
    if (open) return
    photo.reset()
    setFatherId('')
    setMotherId('')
  }, [open, photo.reset])

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Child"
      description="Add your child to your family tree. Living children can be invited by email to join."
      submitLabel="Add Child"
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
        <h3>1. Select Parent(s)</h3>
        <p className="field-hint">
          Choose the parent(s) for this child from your family tree.
        </p>
        <ParentSelectFields
          active={open}
          fatherId={fatherId}
          motherId={motherId}
          onFatherId={setFatherId}
          onMotherId={setMotherId}
        />
      </section>

      <section className="modal-section">
        <h3>2. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="child"
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
        <h3>3. Relationship details</h3>
        <label className="field">
          <span>Order in Birth</span>
          <select defaultValue="">
            <option value="">Select birth order</option>
            <option value="1">First born</option>
            <option value="2">Second born</option>
          </select>
          <span className="field-hint">e.g First born, Second born, etc.</span>
        </label>
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
