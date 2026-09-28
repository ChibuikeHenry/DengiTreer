import type { ChangeEvent } from 'react'
import { useTreeParentPickOptions, type ParentPickOption } from '../hooks/useTreeParentPickOptions'
import { DashIcons } from './DashboardLayout'

type PersonalInfoProps = {
  firstName: string
  middleName: string
  lastName: string
  dob: string
  gender: string
  status: 'living' | 'deceased'
  namePrefix?: string
  onFirstName: (v: string) => void
  onMiddleName: (v: string) => void
  onLastName: (v: string) => void
  onDob: (v: string) => void
  onGender: (v: string) => void
  onStatus: (v: 'living' | 'deceased') => void
}

export function PersonalInfoFields({
  firstName,
  middleName,
  lastName,
  dob,
  gender,
  status,
  namePrefix = 'member',
  onFirstName,
  onMiddleName,
  onLastName,
  onDob,
  onGender,
  onStatus,
}: PersonalInfoProps) {
  return (
    <>
      <div className="form-row form-row-3">
        <label className="field">
          <span>First Name</span>
          <input
            value={firstName}
            onChange={(e) => onFirstName(e.target.value)}
            placeholder="Enter first name"
            required
          />
        </label>
        <label className="field">
          <span>Middle Name</span>
          <input
            value={middleName}
            onChange={(e) => onMiddleName(e.target.value)}
            placeholder="Enter middle name"
          />
        </label>
        <label className="field">
          <span>LastName</span>
          <input
            value={lastName}
            onChange={(e) => onLastName(e.target.value)}
            placeholder="Enter last name"
            required
          />
        </label>
      </div>
      <div className="form-row form-row-status">
        <label className="field">
          <span>Date of Birth</span>
          <input type="date" value={dob} onChange={(e) => onDob(e.target.value)} />
        </label>
        <label className="field">
          <span>Gender</span>
          <select value={gender} onChange={(e) => onGender(e.target.value)} required>
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
              name={`${namePrefix}-living-status`}
              checked={status === 'living'}
              onChange={() => onStatus('living')}
            />
            Living
          </label>
          <label>
            <input
              type="radio"
              name={`${namePrefix}-living-status`}
              checked={status === 'deceased'}
              onChange={() => onStatus('deceased')}
            />
            Deceased
          </label>
        </fieldset>
      </div>
    </>
  )
}

type ParentSelectFieldsProps = {
  active?: boolean
  fatherId?: string
  motherId?: string
  onFatherId?: (id: string) => void
  onMotherId?: (id: string) => void
}

function parentOptionLabel(option: ParentPickOption) {
  if (option.id === 'self') return `${option.displayName} (You)`
  return option.displayName
}

export function ParentSelectFields({
  active = true,
  fatherId = '',
  motherId = '',
  onFatherId,
  onMotherId,
}: ParentSelectFieldsProps) {
  const { fathers, mothers } = useTreeParentPickOptions(active)

  return (
    <div className="form-row form-row-2">
      <label className="field">
        <span>Father</span>
        <select
          value={fatherId}
          onChange={(e) => onFatherId?.(e.target.value)}
          required={fathers.length > 0}
        >
          <option value="">Select father</option>
          {fathers.map((option) => (
            <option key={option.id} value={option.id}>
              {parentOptionLabel(option)}
            </option>
          ))}
        </select>
        {fathers.length === 0 ? (
          <span className="field-hint">
            Add yourself and invite your spouse (or co-parent) to see choices here.
          </span>
        ) : null}
      </label>
      <label className="field">
        <span>Mother</span>
        <select
          value={motherId}
          onChange={(e) => onMotherId?.(e.target.value)}
          required={mothers.length > 0}
        >
          <option value="">Select mother</option>
          {mothers.map((option) => (
            <option key={option.id} value={option.id}>
              {parentOptionLabel(option)}
            </option>
          ))}
        </select>
        {mothers.length === 0 ? (
          <span className="field-hint">
            Only people on your tree that you added or invited appear in this list.
          </span>
        ) : null}
      </label>
    </div>
  )
}

type PhotoUploadFieldProps = {
  compact?: boolean
  previewUrl?: string | null
  onFileSelect?: (file: File | null) => void
  error?: string
}

export function PhotoUploadField({
  compact,
  previewUrl,
  onFileSelect,
  error,
}: PhotoUploadFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    onFileSelect?.(file)
    event.target.value = ''
  }

  return (
    <div className={compact ? 'photo-upload photo-upload-compact' : 'photo-upload'}>
      <span className="photo-label">Profile picture</span>
      <label className={`photo-box${previewUrl ? ' photo-box-has-preview' : ''}`}>
        <input
          type="file"
          accept="image/png,image/jpeg,.jpg,.jpeg"
          onChange={handleChange}
        />
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="" className="photo-preview" />
            <strong>Change photo</strong>
          </>
        ) : (
          <>
            {DashIcons.upload()}
            <strong>Upload Photo</strong>
            <small>Profile picture · JPG, PNG up to 5MB</small>
          </>
        )}
      </label>
      {error ? <span className="field-hint photo-upload-error">{error}</span> : null}
    </div>
  )
}

export function OccupationEducationFields() {
  return (
    <div className="form-row form-row-2">
      <label className="field">
        <span>Occupation</span>
        <select defaultValue="">
          <option value="">Select occupation</option>
          <option value="professional">Professional</option>
          <option value="student">Student</option>
          <option value="retired">Retired</option>
        </select>
      </label>
      <label className="field">
        <span>Education Level</span>
        <select defaultValue="">
          <option value="">Select education level</option>
          <option value="secondary">Secondary</option>
          <option value="bachelors">Bachelor&apos;s</option>
          <option value="masters">Master&apos;s</option>
        </select>
      </label>
    </div>
  )
}

type ContactFieldsProps = {
  phone?: string
  email?: string
  onPhone?: (value: string) => void
  onEmail?: (value: string) => void
  emailRequired?: boolean
  emailOptionalHint?: boolean
  emailReadOnly?: boolean
  photoPreviewUrl?: string | null
  onPhotoSelect?: (file: File | null) => void
  photoError?: string
}

export function ContactFields({
  phone = '',
  email = '',
  onPhone,
  onEmail,
  emailRequired = false,
  emailOptionalHint = false,
  emailReadOnly = false,
  photoPreviewUrl,
  onPhotoSelect,
  photoError,
}: ContactFieldsProps) {
  return (
    <div className="form-row form-row-photo">
      <div className="form-stack">
        <label className="field">
          <span>Phone Number</span>
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => onPhone?.(e.target.value)}
          />
        </label>
        <label className="field">
          <span>
            Email Address{emailRequired ? ' *' : ''}
          </span>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => onEmail?.(e.target.value)}
            required={emailRequired}
            readOnly={emailReadOnly}
            disabled={emailReadOnly}
            className={emailReadOnly ? 'field-readonly' : undefined}
            aria-readonly={emailReadOnly}
          />
          {emailRequired ? (
            <span className="field-hint">
              We&apos;ll email them a link to join as this role on your tree.
            </span>
          ) : emailOptionalHint ? (
            <span className="field-hint">
              Optional. Add an email if you want to invite them to claim their profile on
              DengiTree.
            </span>
          ) : null}
        </label>
      </div>
      <PhotoUploadField
        previewUrl={photoPreviewUrl}
        onFileSelect={onPhotoSelect}
        error={photoError}
      />
    </div>
  )
}
