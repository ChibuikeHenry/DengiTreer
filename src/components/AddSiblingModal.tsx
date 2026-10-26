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
import {
  genderForSiblingRelationship,
  siblingRelationshipsForKind,
  type SiblingRelationship,
} from '../lib/siblingRelationship'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { useMergeEmailCheck } from '../hooks/useMergeEmailCheck'
import { useMergeModalSubmit } from '../hooks/useMergeModalSubmit'
import { useSiblingSharedParentPickOptions } from '../hooks/useTreeParentPickOptions'
import MergeFamilyEmailNotice from './MergeFamilyEmailNotice'
import { useAuth } from '../context/AuthContext'
import { fetchUserProfile } from '../lib/userProfile'

type Props = { open: boolean; onClose: () => void; onAdded?: () => void }

export default function AddSiblingModal({ open, onClose, onAdded }: Props) {
  const { user } = useAuth()
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
  const [mergeDismissed, setMergeDismissed] = useState(false)
  const { match: mergeMatch } = useMergeEmailCheck(email, open && status === 'living')
  const { fathers, mothers } = useSiblingSharedParentPickOptions(open)

  const sharedParents = useMemo(
    () => ({
      fatherMemberId: fatherId || null,
      motherMemberId: motherId || null,
    }),
    [fatherId, motherId],
  )

  const { relationship: inferredRelationship, relationshipKind } =
    useSiblingRelationshipPreview(open, sharedParents, gender)

  const parentSelectionKey = `${fatherId}|${motherId}`
  const lastParentSelectionKey = useRef('')

  const relationshipOptions = useMemo(() => {
    const allowed = siblingRelationshipsForKind(relationshipKind)
    if (!allowed.length) return []
    return SIBLING_RELATIONSHIP_OPTIONS.filter((o) => allowed.includes(o.value))
  }, [relationshipKind])

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
    if (relationshipKind !== 'unset' && !relationshipEdited.current) {
      setRelationship(inferredRelationship)
      const g = genderForSiblingRelationship(inferredRelationship)
      if (g) setGender(g)
    }
  }, [open, inferredRelationship, parentSelectionKey, relationshipKind])

  useEffect(() => {
    if (!open || relationshipKind === 'unset') return
    if (!relationshipOptions.some((o) => o.value === relationship)) {
      relationshipEdited.current = false
      setRelationship(inferredRelationship)
    }
  }, [open, relationship, relationshipOptions, inferredRelationship, relationshipKind])

  useEffect(() => {
    const g = genderForSiblingRelationship(relationship)
    if (g && gender !== g) setGender(g)
  }, [relationship, gender])

  const mergeInvitePayload = useMemo(
    () => ({
      role: 'sibling' as const,
      firstName,
      middleName,
      lastName,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      gender: (genderForSiblingRelationship(relationship) ?? gender) || undefined,
      privacy,
      sharedFatherMemberId:
        fatherId || (fathers.length === 1 ? fathers[0].id : '') || undefined,
      sharedMotherMemberId:
        motherId || (mothers.length === 1 ? mothers[0].id : '') || undefined,
      siblingRelationship: relationship,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    }),
    [
      firstName,
      middleName,
      lastName,
      email,
      status,
      gender,
      relationship,
      privacy,
      fatherId,
      motherId,
      fathers,
      mothers,
      dob,
      dateOfDeath,
    ],
  )

  const { offerMerge, submitLabel, submittingText, interceptSubmit } = useMergeModalSubmit({
    mergeMatch,
    mergeDismissed,
    invitePayload: mergeInvitePayload,
    onClose,
    defaultSubmitLabel: 'Add Sibling',
    defaultSubmittingText: email.trim() ? 'Sending invite…' : 'Adding sibling…',
  })

  async function handleSubmit(event: FormEvent) {
    interceptSubmit(event, async () => {
    const sharedParentsForSubmit = await resolveSharedParentIdsForSubmit()
    await submit({
      firstName,
      middleName,
      lastName,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      gender: (genderForSiblingRelationship(relationship) ?? gender) || undefined,
      photoFile: photo.file,
      privacy,
      ...sharedParentsForSubmit,
      siblingRelationship: relationship,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    })
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
    setMergeDismissed(false)
    photo.reset()
  }, [open, photo.reset])

  useEffect(() => {
    setMergeDismissed(false)
  }, [email])

  useEffect(() => {
    if (!open) return
    if (fathers.length === 1 && !fatherId) setFatherId(fathers[0].id)
    if (mothers.length === 1 && !motherId) setMotherId(mothers[0].id)
  }, [open, fathers, mothers, fatherId, motherId])

  async function resolveSharedParentIdsForSubmit() {
    let sharedFather = fatherId.trim()
    let sharedMother = motherId.trim()
    if (!sharedFather && fathers.length === 1) sharedFather = fathers[0].id
    if (!sharedMother && mothers.length === 1) sharedMother = mothers[0].id
    if (!sharedFather && !sharedMother && user?.uid) {
      const profile = await fetchUserProfile(user.uid)
      sharedFather = profile?.treeFatherMemberId?.trim() ?? ''
      sharedMother = profile?.treeMotherMemberId?.trim() ?? ''
    }
    return {
      sharedFatherMemberId: sharedFather || undefined,
      sharedMotherMemberId: sharedMother || undefined,
    }
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add a Sibling"
      description="Add your sibling to your family tree. You can always edit details later."
      submitLabel={submitLabel}
      submittingText={submittingText}
      onSubmit={handleSubmit}
      formError={error}
      submitting={submitting}
      panelClassName="modal-panel-lg modal-panel-merge"
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
          relationshipSelectDisabled={relationshipKind === 'unset'}
          suggestedLabel={
            relationshipKind === 'unset'
              ? 'Select father and/or mother above to set relationship type.'
              : relationshipKind === 'full'
                ? 'Same parents as you — brother or sister'
                : relationshipKind === 'half'
                  ? 'One shared parent — half-brother or half-sister'
                  : 'Step parent selected — step-brother or step-sister'
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
          hideGender={relationshipKind !== 'unset'}
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
            {offerMerge ? (
              <MergeFamilyEmailNotice
                onAddWithoutMerge={() => setMergeDismissed(true)}
                addWithoutMergeLabel="Add sibling without merging"
              />
            ) : null}
          </label>
        ) : null}
      </section>
    </ModalFrame>
  )
}
