import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ContactFields, MemberBioField } from './familyFormFields'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import {
  mayAddPrimaryParent,
  primaryParentOnTree,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { DashIcons } from './DashboardLayout'
import { getTodayString, normalizeDateField } from '../lib/lifeDates'
import {
  genderFromParentSlot,
  type ParentKind,
  type ParentSlot,
} from '../lib/siblingRelationship'

const parentTypes = [
  {
    value: 'biological',
    label: 'Biological Parents',
    description: 'A parent related to you by birth',
  },
  {
    value: 'step',
    label: 'Step Parents',
    description: 'A parent spouse who is not your biological parent',
  },
  {
    value: 'adoptive',
    label: 'Adoptive Parents',
    description: 'A parent who legally adopt and raise you',
  },
] as const

const relationships = ['Mother', 'Father', 'Unknown / Not Known'] as const
const UNKNOWN_RELATIONSHIP = 'Unknown / Not Known'

function relationshipToParentSlot(relationship: string): ParentSlot {
  if (relationship === 'Father') return 'father'
  if (relationship === 'Mother') return 'mother'
  return 'unknown'
}

type AddParentModalProps = {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

export default function AddParentModal({ open, onClose, onAdded }: AddParentModalProps) {
  const { user } = useAuth()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [treeMembers, setTreeMembers] = useState<TreeMember[]>([])
  const [parentTypeOpen, setParentTypeOpen] = useState(false)
  const [relationshipOpen, setRelationshipOpen] = useState(false)
  const [parentType, setParentType] = useState<(typeof parentTypes)[number] | null>(
    null,
  )
  const [relationship, setRelationship] = useState('')
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
  const [privacy] = useDefaultMemberPrivacy(open)
  const photo = usePhotoPicker()
  const { submitting, error, submit } = useFamilyMemberInviteSubmit('parent', onClose, onAdded)
  const [slotError, setSlotError] = useState('')

  useEffect(() => {
    if (!open || !user?.uid) {
      setTreeMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setTreeMembers)
  }, [open, user?.uid])

  useEffect(() => {
    if (open) return
    setParentTypeOpen(false)
    setRelationshipOpen(false)
    setParentType(null)
    setRelationship('')
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
    photo.reset()
  }, [open, photo.reset])

  useEffect(() => {
    if (!open) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  function handleClose() {
    setParentTypeOpen(false)
    onClose()
  }

  const isUnknownParent = relationship === UNKNOWN_RELATIONSHIP

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!relationship) return

    const resolvedFirst = firstName.trim() || (isUnknownParent ? 'Unknown' : '')
    const resolvedLast = lastName.trim() || (isUnknownParent ? 'Parent' : '')
    if (!resolvedFirst || !resolvedLast) return

    const parentKind: ParentKind = parentType?.value ?? 'biological'
    const parentSlot = relationshipToParentSlot(relationship)
    if (!mayAddPrimaryParent(treeMembers, parentSlot, parentKind)) {
      const taken = primaryParentOnTree(
        treeMembers,
        parentSlot === 'father' ? 'father' : 'mother',
      )
      setSlotError(
        taken
          ? `${taken.displayName} is already your ${parentSlot === 'father' ? 'father' : 'mother'}. Choose Step parent or edit them instead.`
          : 'That parent slot is already filled on your tree.',
      )
      return
    }
    setSlotError('')

    await submit({
      firstName: resolvedFirst,
      middleName: middleName.trim(),
      lastName: resolvedLast,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      gender: gender || genderFromParentSlot(parentSlot) || undefined,
      photoFile: photo.file,
      privacy,
      bio: bio.trim() || undefined,
      parentSlot,
      parentKind,
      dateOfBirth: normalizeDateField(dob),
      dateOfDeath: status === 'deceased' ? normalizeDateField(dateOfDeath) : undefined,
    })
  }

  return (
    <div className="modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className="modal-panel modal-panel-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>Add a PARENT</h2>
            <p>
              Add a new relative to your family tree. You can always edit details later.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            {DashIcons.close()}
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <section className="modal-section">
            <h3>1. What type of parent do you want to add?</h3>
            <div className="custom-select">
              <button
                type="button"
                className={`select-trigger${parentType ? '' : ' is-placeholder'}`}
                onClick={() => {
                  setParentTypeOpen((v) => !v)
                }}
                aria-expanded={parentTypeOpen}
              >
                <span>{parentType?.label ?? 'Select'}</span>
                {DashIcons.chevron()}
              </button>
              {parentTypeOpen ? (
                <ul className="select-menu" role="listbox">
                  {parentTypes.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        className="select-option"
                        onClick={() => {
                          setParentType(option)
                          setParentTypeOpen(false)
                        }}
                      >
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span aria-hidden="true">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="modal-section">
            <h3>2. Personal Information</h3>
            <div className="form-row form-row-3">
              <label className="field">
                <span>First Name</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  required={!isUnknownParent}
                />
              </label>
              <label className="field">
                <span>Middle Name</span>
                <input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle Name"
                />
              </label>
              <label className="field">
                <span>LastName</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  required={!isUnknownParent}
                />
              </label>
            </div>

            <div className="form-row form-row-status">
              <label className="field">
                <span>Date of Birth</span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => {
                    const val = e.target.value
                    const today = getTodayString()
                    setDob(val && val > today ? today : val)
                  }}
                  max={getTodayString()}
                />
              </label>
              {status === 'deceased' ? (
                <label className="field">
                  <span>Date of Death</span>
                  <input
                    type="date"
                    value={dateOfDeath}
                    onChange={(e) => {
                      const val = e.target.value
                      const today = getTodayString()
                      setDateOfDeath(val && val > today ? today : val)
                    }}
                    min={dob || undefined}
                    max={getTodayString()}
                  />
                </label>
              ) : null}
              <label className="field">
                <span>Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required={!isUnknownParent}
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <fieldset className="status-radios">
                <legend className="sr-only">Living status</legend>
                <label>
                  <input
                    type="radio"
                    name="living-status"
                    checked={status === 'living'}
                    onChange={() => setStatus('living')}
                  />
                  Living
                </label>
                <label>
                  <input
                    type="radio"
                    name="living-status"
                    checked={status === 'deceased'}
                    onChange={() => setStatus('deceased')}
                  />
                  Deceased
                </label>
              </fieldset>
            </div>
          </section>

          <section className="modal-section">
            <h3>3. Their relationship to you</h3>
            <p className="field-hint">How are they related to you?</p>
            <div className="custom-select">
              <button
                type="button"
                className={`select-trigger${relationship ? '' : ' is-placeholder'}`}
                onClick={() => {
                  setRelationshipOpen((v) => !v)
                  setParentTypeOpen(false)
                }}
                aria-expanded={relationshipOpen}
              >
                <span>{relationship || 'Select relationship'}</span>
                {DashIcons.chevron()}
              </button>
              {relationshipOpen ? (
                <ul className="select-menu select-menu-simple" role="listbox">
                  {relationships.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        className="select-option"
                        onClick={() => {
                          setRelationship(option)
                          setRelationshipOpen(false)
                          if (option === 'Father' && !gender) setGender('male')
                          if (option === 'Mother' && !gender) setGender('female')
                        }}
                      >
                        <span>
                          <strong>{option}</strong>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="modal-section">
            <h3>4. Additional Information (Optional)</h3>
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
            {isUnknownParent ? (
              <p className="field-hint">
                You can add a parent placeholder when details aren&apos;t known yet. Update
                their information later when you learn more.
              </p>
            ) : null}
          </section>

          <section className="modal-section">
            <h3>5. About this person (Optional)</h3>
            <MemberBioField bio={bio} onBioChange={setBio} idPrefix="parent" />
          </section>

          {slotError || error ? (
            <p className="modal-form-error" role="alert">
              {slotError || error}
            </p>
          ) : null}

          <footer className="modal-actions">
            <button type="button" className="btn-modal-outline" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary" disabled={submitting}>
              {submitting ? (email.trim() ? 'Sending invite…' : 'Adding family member…') : 'Add Family Member'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
