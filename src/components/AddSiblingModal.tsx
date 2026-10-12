import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import { useSiblingRelationshipPreview } from '../hooks/useSiblingRelationshipPreview'
import {
  OccupationEducationFields,
  ParentSelectFields,
  PersonalInfoFields,
  SIBLING_RELATIONSHIP_OPTIONS,
  SiblingDetailsFields,
} from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { normalizeDateField } from '../lib/lifeDates'
import type { SiblingRelationship } from '../lib/siblingRelationship'
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
  const [email, setEmail] = useState('')
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const [birthOrder, setBirthOrder] = useState('')
  const [relationship, setRelationship] = useState<SiblingRelationship>('sibling')
  const relationshipEdited = useRef(false)
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

  const {
    relationship: inferredRelationship,
    label: relationshipLabel,
    stepParentSelected,
  } = useSiblingRelationshipPreview(open, sharedParents, gender)

  const parentSelectionKey = `${fatherId}|${motherId}`
  const lastParentSelectionKey = useRef('')

  const relationshipOptions = useMemo(() => {
    if (stepParentSelected) {
      return SIBLING_RELATIONSHIP_OPTIONS.filter((o) =>
        o.value === 'step-brother' || o.value === 'step-sister',
      )
    }
    return SIBLING_RELATIONSHIP_OPTIONS
  }, [stepParentSelected])

  useEffect(() => {
    if (!open) {
      relationshipEdited.current = false
      lastParentSelectionKey.current = ''
      return
    }
    if (parentSelectionKey !== lastParentSelectionKey.current) {
      lastParentSelectionKey.current = parentSelectionKey
      relationshipEdited.current = false
    }
    if (stepParentSelected || !relationshipEdited.current) {
      setRelationship(inferredRelationship)
    }
  }, [open, inferredRelationship, parentSelectionKey, stepParentSelected])

  useEffect(() => {
    if (relationship === 'brother' || relationship === 'half-brother' || relationship === 'step-brother') {
      if (!gender) setGender('male')
    }
    if (relationship === 'sister' || relationship === 'half-sister' || relationship === 'step-sister') {
      if (!gender) setGender('female')
    }
  }, [gender, relationship])

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
      sharedFatherMemberId: fatherId || undefined,
      sharedMotherMemberId: motherId || undefined,
      siblingRelationship: relationship,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    })
  }

  useEffect(() => {
    if (open) return
    setFirstName('')
    setMiddleName('')
    setLastName('')
    setDob('')
    setDateOfDeath('')
    setGender('')
    setStatus('living')
    setEmail('')
    setFatherId('')
    setMotherId('')
    setBirthOrder('')
    setRelationship('sibling')
    relationshipEdited.current = false
    photo.reset()
  }, [open, photo.reset])

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Sibling"
      description="Add your sibling to your family tree. You can always edit details later."
      submitLabel="Add Sibling"
      submittingText={email.trim() ? 'Sending invite…' : 'Adding sibling…'}
      onSubmit={handleSubmit}
      formError={error}
      submitting={submitting}
      panelClassName="modal-panel-lg"
    >
      <section className="modal-section">
        <h3>1. Select Parents</h3>
        <p className="field-hint">Choose the parents for this sibling from your family tree.</p>
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
        <h3>2. Sibling Details</h3>
        <SiblingDetailsFields
          relationship={relationship}
          onRelationship={(value) => {
            relationshipEdited.current = true
            setRelationship(value)
            if (value === 'step-brother' || value === 'brother' || value === 'half-brother') {
              setGender('male')
            }
            if (value === 'step-sister' || value === 'sister' || value === 'half-sister') {
              setGender('female')
            }
          }}
          birthOrder={birthOrder}
          onBirthOrder={setBirthOrder}
          photoPreviewUrl={photo.previewUrl}
          onPhotoSelect={photo.selectFile}
          photoError={photo.error}
          relationshipOptions={relationshipOptions}
          suggestedLabel={
            stepParentSelected
              ? `From selected parents — choose step-brother or step-sister`
              : relationship !== inferredRelationship
                ? `Suggested from shared parents: ${relationshipLabel}`
                : undefined
          }
        />
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
        <h3>4. Additional Details</h3>
        <OccupationEducationFields />
        {status === 'living' ? (
          <label className="field" style={{ marginTop: '0.75rem' }}>
            <span>Email Address (optional)</span>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="field-hint">
              Invite them to claim their profile on DengiTree when you&apos;re ready.
            </span>
          </label>
        ) : null}
      </section>
    </ModalFrame>
  )
}
