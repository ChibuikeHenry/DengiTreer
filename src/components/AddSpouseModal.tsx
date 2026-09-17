import { useState } from 'react'
import type { FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  OccupationEducationFields,
  PersonalInfoFields,
} from './familyFormFields'

type Props = { open: boolean; onClose: () => void }

export default function AddSpouseModal({ open, onClose }: Props) {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onClose()
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Spouse"
      description="Add a new relative to your family tree. You can always edit details later."
      submitLabel="Add Spouse"
      onSubmit={handleSubmit}
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
            <span className="field-with-icon">
              <input type="date" />
            </span>
          </label>
        </div>
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
