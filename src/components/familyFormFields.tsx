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
          <span className="field-with-icon">
            <input type="date" value={dob} onChange={(e) => onDob(e.target.value)} />
            {DashIcons.calendar()}
          </span>
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

export function ParentSelectFields() {
  return (
    <div className="form-row form-row-2">
      <label className="field">
        <span>Father</span>
        <select defaultValue="">
          <option value="">Select father</option>
          <option value="uche">Uche Achoromadu</option>
        </select>
      </label>
      <label className="field">
        <span>Mother</span>
        <select defaultValue="">
          <option value="">Select mother</option>
          <option value="grace">Grace Achoromadu</option>
        </select>
      </label>
    </div>
  )
}

export function PhotoUploadField({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? 'photo-upload photo-upload-compact' : 'photo-upload'}>
      <span className="photo-label">Add a Photo</span>
      <label className="photo-box">
        <input type="file" accept="image/png,image/jpeg" />
        {DashIcons.upload()}
        <strong>Upload Photo</strong>
        <small>JPG, PNG up to 5MB</small>
      </label>
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

export function ContactFields() {
  return (
    <div className="form-row form-row-photo">
      <div className="form-stack">
        <label className="field">
          <span>Phone Number</span>
          <input type="tel" placeholder="Phone Number" />
        </label>
        <label className="field">
          <span>Email Address</span>
          <input type="email" placeholder="Email Address" />
        </label>
      </div>
      <PhotoUploadField />
    </div>
  )
}
