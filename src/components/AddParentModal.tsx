import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ContactFields } from './familyFormFields'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { DashIcons } from './DashboardLayout'

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
const privacyOptions = [
  'Family members only',
  'Immediate family only',
  'Only me',
  'Everyone in my network',
] as const

type AddParentModalProps = {
  open: boolean
  onClose: () => void
}

export default function AddParentModal({ open, onClose }: AddParentModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
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
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [privacy, setPrivacy] = useState<(typeof privacyOptions)[number]>(
    'Family members only',
  )
  const photo = usePhotoPicker()
  const { submitting, error, submit } = useFamilyMemberInviteSubmit('parent', onClose)

  useEffect(() => {
    if (open) return
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
    setRelationshipOpen(false)
    onClose()
  }

  const isUnknownParent = relationship === UNKNOWN_RELATIONSHIP

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!relationship) return

    const resolvedFirst = firstName.trim() || (isUnknownParent ? 'Unknown' : '')
    const resolvedLast = lastName.trim() || (isUnknownParent ? 'Parent' : '')
    if (!resolvedFirst || !resolvedLast) return

    await submit({
      firstName: resolvedFirst,
      middleName: middleName.trim(),
      lastName: resolvedLast,
      inviteeEmail: email.trim() || undefined,
      memberStatus: status,
      photoFile: photo.file,
    })
  }

  return (
    <div className="modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className="modal-panel"
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
              Add a new relative to your family tree. You can edit their details until they
              accept your invite and claim their profile.
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
                  setRelationshipOpen(false)
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
                  onChange={(e) => setDob(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required={!isUnknownParent}
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer-not">Prefer not to say</option>
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
                          if (option === UNKNOWN_RELATIONSHIP) {
                            if (!firstName.trim()) setFirstName('Unknown')
                            if (!lastName.trim()) setLastName('Parent')
                          }
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
            <h3>5. Privacy settings</h3>
            <p className="field-hint">Who can view this person&apos;s information?</p>
            <label className="field">
              <span className="sr-only">Privacy</span>
              <select
                value={privacy}
                onChange={(e) =>
                  setPrivacy(e.target.value as (typeof privacyOptions)[number])
                }
              >
                {privacyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <p className="privacy-note">You can change this later in privacy settings.</p>
          </section>

          {error ? (
            <p className="modal-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <footer className="modal-actions">
            <button type="button" className="btn-modal-outline" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary" disabled={submitting}>
              {submitting ? 'Sending invite…' : 'Add Family Member'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
