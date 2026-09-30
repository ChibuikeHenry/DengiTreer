import { useEffect, useMemo, useState, type FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import { useSiblingRelationshipPreview } from '../hooks/useSiblingRelationshipPreview'
import {
  ContactFields,
  MemberBioField,
  OccupationEducationFields,
  ParentSelectFields,
  PersonalInfoFields,
} from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { normalizeDateField } from '../lib/lifeDates'
import { usePhotoPicker } from '../hooks/usePhotoPicker'

type Props = { open: boolean; onClose: () => void; onAdded?: () => void }

export default function AddSiblingModal({ open, onClose, onAdded }: Props) {
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
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const photo = usePhotoPicker()

  const [privacy] = useDefaultMemberPrivacy(open)
  const { submitting, error, submit } = useFamilyMemberInviteSubmit('sibling', onClose, onAdded)

  const sharedParents = useMemo(
    () => ({
      fatherMemberId: fatherId || null,
      motherMemberId: motherId || null,
    }),
    [fatherId, motherId],
  )

  const { relationship, label: relationshipLabel } = useSiblingRelationshipPreview(
    open,
    sharedParents,
    gender,
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await submit({
      firstName,
      middleName,
      lastName,
      inviteeEmail: email,
      memberStatus: status,
      photoFile: photo.file,
      privacy,
      bio: bio.trim() || undefined,
      sharedFatherMemberId: fatherId || undefined,
      sharedMotherMemberId: motherId || undefined,
      siblingRelationship: relationship,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    })
  }

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
      title="Add a Sibling"
      description="Add your sibling to your family tree. We infer brother, sister, half-, or step-sibling from the parents you share."
      submitLabel="Add Sibling"
      onSubmit={handleSubmit}
      formError={error}
      submitting={submitting}
    >
      <section className="modal-section">
        <h3>1. Select shared parents</h3>
        <p className="field-hint">
          Choose the parents you share with this sibling (your mother and/or father on the tree).
          Relationship type updates automatically.
        </p>
        <ParentSelectFields
          active={open}
          mode="sibling"
          fatherId={fatherId}
          motherId={motherId}
          onFatherId={setFatherId}
          onMotherId={setMotherId}
        />
      </section>

      <section className="modal-section">
        <h3>2. Relationship (automatic)</h3>
        <div className="relationship-auto-box" role="status" aria-live="polite">
          <span className="relationship-auto-label">Detected relationship</span>
          <strong className="relationship-auto-value">{relationshipLabel}</strong>
          <p className="field-hint">
            Based on shared parents and gender. Add your parents with Father/Mother roles for
            best accuracy; step-parents are detected from parent type.
          </p>
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

      <section className="modal-section">
        <h3>6. About this person (Optional)</h3>
        <MemberBioField bio={bio} onBioChange={setBio} idPrefix="sibling" />
      </section>
    </ModalFrame>
  )
}
