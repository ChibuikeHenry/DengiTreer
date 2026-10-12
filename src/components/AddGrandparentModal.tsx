import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ContactFields, MemberBioField } from './familyFormFields'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import { useFamilyMemberInviteSubmit } from '../hooks/useFamilyMemberInviteSubmit'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { DashIcons } from './DashboardLayout'
import {
  GRANDPARENT_PLACEMENTS,
  grandparentPlacementLabel,
  grandparentSlotTaken,
  type GrandparentPlacement,
} from '../lib/grandparentSlots'
import { subscribeTreeMembers, type TreeMember } from '../lib/familyTreeMembers'
import { getTodayString, normalizeDateField } from '../lib/lifeDates'
import type { ParentSlot } from '../lib/siblingRelationship'

const relationships = ['Grandfather', 'Grandmother'] as const

function placementToRelationship(placement: GrandparentPlacement | '') {
  if (placement === 'fathers-father' || placement === 'mothers-father') return 'Grandfather'
  if (placement === 'fathers-mother' || placement === 'mothers-mother') return 'Grandmother'
  return ''
}

function relationshipToParentSlot(relationship: string): ParentSlot {
  if (relationship === 'Grandfather') return 'father'
  if (relationship === 'Grandmother') return 'mother'
  return 'unknown'
}

type Props = { open: boolean; onClose: () => void; onAdded?: () => void }

export default function AddGrandparentModal({ open, onClose, onAdded }: Props) {
  const { user } = useAuth()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [treeMembers, setTreeMembers] = useState<TreeMember[]>([])
  const [slotError, setSlotError] = useState('')
  const [placementOpen, setPlacementOpen] = useState(false)
  const [relationshipOpen, setRelationshipOpen] = useState(false)
  const [placement, setPlacement] = useState<GrandparentPlacement | ''>('')
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
  const { submitting, error, submit } = useFamilyMemberInviteSubmit(
    'grandparent',
    onClose,
    onAdded,
  )

  useEffect(() => {
    if (!open || !user?.uid) {
      setTreeMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setTreeMembers)
  }, [open, user?.uid])

  const availablePlacements = useMemo(
    () =>
      GRANDPARENT_PLACEMENTS.filter(
        (p) => !grandparentSlotTaken(treeMembers, p.value),
      ),
    [treeMembers],
  )

  useEffect(() => {
    if (open) return
    setPlacementOpen(false)
    setRelationshipOpen(false)
    setPlacement('')
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
    setSlotError('')
    photo.reset()
  }, [open, photo.reset])

  useEffect(() => {
    if (placement && grandparentSlotTaken(treeMembers, placement)) {
      setPlacement('')
      setRelationship('')
    }
  }, [placement, treeMembers])

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

  const placementLabel = placement ? grandparentPlacementLabel(placement) : ''

  function handleClose() {
    setPlacementOpen(false)
    setRelationshipOpen(false)
    onClose()
  }

  function applyPlacement(value: GrandparentPlacement) {
    setPlacement(value)
    setPlacementOpen(false)
    const rel = placementToRelationship(value)
    setRelationship(rel)
    if (rel === 'Grandfather') setGender('male')
    if (rel === 'Grandmother') setGender('female')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!placement || !relationship) return

    const resolvedFirst = firstName.trim()
    const resolvedLast = lastName.trim()
    if (!resolvedFirst || !resolvedLast) return

    if (grandparentSlotTaken(treeMembers, placement)) {
      setSlotError(
        `${grandparentPlacementLabel(placement)} is already on your tree. Edit that person instead.`,
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
      gender: gender || undefined,
      photoFile: photo.file,
      privacy,
      bio: bio.trim() || undefined,
      parentSlot: relationshipToParentSlot(relationship),
      lineageSide: placement.startsWith('fathers') ? 'paternal' : 'maternal',
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
            <h2 id={titleId}>Add GRANDPARENT</h2>
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
            <h3>1. Which grandparent are you adding?</h3>
            <p className="field-hint">
              (this helps us place your grandparent correctly in your family tree).
            </p>
            <div className="custom-select">
              <button
                type="button"
                className={`select-trigger${placement ? '' : ' is-placeholder'}`}
                onClick={() => {
                  setPlacementOpen((v) => !v)
                  setRelationshipOpen(false)
                }}
                aria-expanded={placementOpen}
              >
                <span>{placementLabel || 'Select parent'}</span>
                {DashIcons.chevron()}
              </button>
              {placementOpen ? (
                <ul className="select-menu select-menu-simple" role="listbox">
                  {availablePlacements.length ? (
                    availablePlacements.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          className="select-option"
                          onClick={() => applyPlacement(option.value)}
                        >
                          <span>
                            <strong>{option.label}</strong>
                          </span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="select-option is-disabled">
                      <span>All four grandparent slots are filled on your tree.</span>
                    </li>
                  )}
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
                  required
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
                  required
                />
              </label>
            </div>

            <div className="form-row form-row-status">
              <label className="field field-date">
                <span>Date of Birth</span>
                <span className="field-date-wrap">
                  <span className="field-date-icon" aria-hidden="true">
                    {DashIcons.calendar()}
                  </span>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => {
                      const val = e.target.value
                      const today = getTodayString()
                      setDob(val && val > today ? today : val)
                    }}
                    max={getTodayString()}
                    aria-label="Date of birth"
                  />
                </span>
              </label>
              {status === 'deceased' ? (
                <label className="field field-date">
                  <span>Date of Death</span>
                  <span className="field-date-wrap">
                    <span className="field-date-icon" aria-hidden="true">
                      {DashIcons.calendar()}
                    </span>
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
                      aria-label="Date of death"
                    />
                  </span>
                </label>
              ) : null}
              <label className="field">
                <span>Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <fieldset className="status-radios">
                <legend className="sr-only">Living status</legend>
                <span className="status-radios-label">Status</span>
                <label>
                  <input
                    type="radio"
                    name="grandparent-living-status"
                    checked={status === 'living'}
                    onChange={() => setStatus('living')}
                  />
                  Living
                </label>
                <label>
                  <input
                    type="radio"
                    name="grandparent-living-status"
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
                  setPlacementOpen(false)
                }}
                aria-expanded={relationshipOpen}
              >
                <span>{relationship || 'Select relationship type'}</span>
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
                          if (option === 'Grandfather' && !gender) setGender('male')
                          if (option === 'Grandmother' && !gender) setGender('female')
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
          </section>

          <section className="modal-section">
            <h3>5. Short Bio</h3>
            <MemberBioField
              bio={bio}
              onBioChange={setBio}
              idPrefix="grandparent"
              hideLabel
              placeholder="Write a few words about this person"
            />
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
              {submitting
                ? email.trim()
                  ? 'Sending invite…'
                  : 'Adding grandparent…'
                : 'Add Grandparent'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
