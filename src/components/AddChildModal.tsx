import { useState } from 'react'
import type { FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import {
  OccupationEducationFields,
  ParentSelectFields,
  PersonalInfoFields,
  PhotoUploadField,
} from './familyFormFields'

type Props = { open: boolean; onClose: () => void }

export default function AddChildModal({ open, onClose }: Props) {
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
      title="Add a Child"
      description="Add your child to your family tree. You can always edit details later."
      submitLabel="Add Child"
      onSubmit={handleSubmit}
    >
      <section className="modal-section">
        <h3>1. Select Parent(s)</h3>
        <p className="field-hint">
          Choose the parent(s) for this child from your family tree.
        </p>
        <ParentSelectFields />
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
        <div className="form-row form-row-sibling-details">
          <label className="field">
            <span>Order in Birth</span>
            <select defaultValue="">
              <option value="">Select birth order</option>
              <option value="1">First born</option>
              <option value="2">Second born</option>
            </select>
            <span className="field-hint">e.g First born, Second born, etc.</span>
          </label>
          <PhotoUploadField compact />
        </div>
      </section>

      <section className="modal-section">
        <h3>4. Additional Information (Optional)</h3>
        <OccupationEducationFields />
      </section>
    </ModalFrame>
  )
}
