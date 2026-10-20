import { useEffect, useMemo, useState, type FormEvent } from 'react'
import ModalFrame from './ModalFrame'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
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
import { resolveChildCoParentMemberId } from '../hooks/useTreeParentPickOptions'
import { useAuth } from '../context/AuthContext'
import { useMergeEmailCheck } from '../hooks/useMergeEmailCheck'
import MergeFamilyPrompt from './MergeFamilyPrompt'

type Props = { open: boolean; onClose: () => void; onAdded?: () => void }

const BIRTH_ORDER_OPTIONS = [
  { value: '1', label: 'First born' },
  { value: '2', label: 'Second born' },
  { value: '3', label: 'Third born' },
  { value: '4', label: 'Fourth born' },
  { value: '5', label: 'Fifth born' },
  { value: '6', label: 'Sixth born' },
  { value: '7', label: 'Seventh born' },
  { value: '8', label: 'Eighth born' },
  { value: '9', label: 'Ninth born' },
  { value: '10', label: 'Tenth born' },
  { value: '11', label: '11th born' },
  { value: '12', label: '12th born' },
  { value: '13', label: '13th born' },
  { value: '14', label: '14th born' },
  { value: '15+', label: '15th born or later' },
]

export default function AddChildModal({ open, onClose, onAdded }: Props) {
  const { user } = useAuth()
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
  const [birthOrder, setBirthOrder] = useState('')
  const photo = usePhotoPicker()

  const [privacy] = useDefaultMemberPrivacy(open)
  const { submitting, error, submit } = useFamilyMemberInviteSubmit('child', onClose, onAdded)
  const [mergeDismissed, setMergeDismissed] = useState(false)
  const { match: mergeMatch } = useMergeEmailCheck(email, open && status === 'living')
  const [sharedFatherMemberId, setSharedFatherMemberId] = useState<string | undefined>()
  const [sharedMotherMemberId, setSharedMotherMemberId] = useState<string | undefined>()

  useEffect(() => {
    if (!open || !user) {
      setSharedFatherMemberId(undefined)
      setSharedMotherMemberId(undefined)
      return
    }
    let cancelled = false
    void (async () => {
      const father =
        (await resolveChildCoParentMemberId(user, fatherId)) ?? undefined
      const mother =
        (await resolveChildCoParentMemberId(user, motherId)) ?? undefined
      if (!cancelled) {
        setSharedFatherMemberId(father)
        setSharedMotherMemberId(mother)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, user, fatherId, motherId])

  const mergeInvitePayload = useMemo(
    () => ({
      role: 'child' as const,
      firstName,
      middleName,
      lastName,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      gender: gender || undefined,
      privacy,
      bio: bio.trim() || undefined,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
      sharedFatherMemberId,
      sharedMotherMemberId,
    }),
    [
      firstName,
      middleName,
      lastName,
      email,
      status,
      gender,
      privacy,
      bio,
      dob,
      dateOfDeath,
      sharedFatherMemberId,
      sharedMotherMemberId,
    ],
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (mergeMatch && !mergeDismissed) return
    const sharedFather =
      sharedFatherMemberId ??
      ((await resolveChildCoParentMemberId(user, fatherId)) ?? undefined)
    const sharedMother =
      sharedMotherMemberId ??
      ((await resolveChildCoParentMemberId(user, motherId)) ?? undefined)
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
      sharedFatherMemberId: sharedFather,
      sharedMotherMemberId: sharedMother,
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
    setPhone('')
    setEmail('')
    setBio('')
    setFatherId('')
    setMotherId('')
    setBirthOrder('')
    setMergeDismissed(false)
    photo.reset()
  }, [open, photo.reset])

  useEffect(() => {
    setMergeDismissed(false)
  }, [email])

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Child"
      description="Add your child to your family tree. Living children with an email address will be invited to join."
      submitLabel="Add Child"
      submittingText={email.trim() ? 'Sending invite…' : 'Adding child…'}
      onSubmit={handleSubmit}
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
          mode="child"
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
        <h3>3. Relationship details</h3>
        <label className="field">
          <span>Order in Birth</span>
          <select value={birthOrder} onChange={(e) => setBirthOrder(e.target.value)}>
            <option value="">Select birth order</option>
            {BIRTH_ORDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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

      <section className="modal-section">
        <h3>6. About this person (Optional)</h3>
        <MemberBioField bio={bio} onBioChange={setBio} idPrefix="child" />
      </section>
      {mergeMatch && !mergeDismissed ? (
        <MergeFamilyPrompt
          match={mergeMatch}
          invitePayload={mergeInvitePayload}
          onCloseModal={onClose}
          onDismiss={() => setMergeDismissed(true)}
        />
      ) : null}
    </ModalFrame>
  )
}
