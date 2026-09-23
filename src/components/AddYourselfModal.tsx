import { useState } from 'react'
import type { FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  OccupationEducationFields,
  PersonalInfoFields,
} from './familyFormFields'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddYourselfModal({ open, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSuccess()
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add Yourself"
      description="Add your profile to start your family tree. You can always edit details later."
      submitLabel="Add Yourself"
      onSubmit={handleSubmit}
    >
      <section className="modal-section">
        <h3>1. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="yourself"
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
        <label className="field">
          <span>Marital Status</span>
          <select defaultValue="">
            <option value="">Select marital status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </label>
      </section>

      <section className="modal-section">
        <h3>3. Contact Information (Optional)</h3>
        <ContactFields />
      </section>

      <section className="modal-section">
        <h3>4. Additional Information (Optional)</h3>
        <OccupationEducationFields />
      </section>
    </ModalFrame>
  )
}
