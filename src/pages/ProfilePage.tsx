import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import LoadingSpinner from '../components/LoadingSpinner'
import ProfileAvatar from '../components/ProfileAvatar'
import {
  ContactFields,
  MemberBioField,
  OccupationEducationFields,
  ParentSelectFields,
  PersonalInfoFields,
} from '../components/familyFormFields'
import {
  MEMBER_PRIVACY_OPTIONS,
  parseMemberPrivacy,
  type MemberPrivacy,
} from '../lib/memberPrivacy'
import { useAuth } from '../context/AuthContext'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { uploadProfilePhoto } from '../lib/profilePhoto'
import { resolveUserProfileForForm, saveUserProfile } from '../lib/userProfile'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const photo = usePhotoPicker()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [profilePrivacy, setProfilePrivacy] = useState<MemberPrivacy>('family_members')
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setLoading(true)
    setFormError('')
    setSavedMessage('')

    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setFirstName(profile.firstName)
      setMiddleName(profile.middleName)
      setLastName(profile.lastName)
      setEmail(profile.email || user.email?.trim() || '')
      setPhone(profile.phone ?? '')
      setGender(profile.gender ?? '')
      setDob(profile.dateOfBirth ?? '')
      setPhotoURL(user.photoURL ?? profile.photoURL ?? null)
      setBio(profile.bio ?? '')
      setProfilePrivacy(
        parseMemberPrivacy(profile.profilePrivacy ?? profile.defaultMemberPrivacy),
      )
      setFatherId(profile.treeFatherMemberId ?? '')
      setMotherId(profile.treeMotherMemberId ?? '')
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const displayName =
    [firstName, middleName, lastName].map((p) => p.trim()).filter(Boolean).join(' ') ||
    user?.displayName?.trim() ||
    'Your profile'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    setFormError('')
    setSavedMessage('')
    setSubmitting(true)

    try {
      let nextPhotoURL = photoURL ?? user.photoURL ?? undefined
      if (photo.file) {
        nextPhotoURL = await uploadProfilePhoto(user.uid, photo.file)
      }

      const displayNameSave = [firstName, middleName, lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ')

      await updateProfile(user, {
        ...(displayNameSave ? { displayName: displayNameSave } : {}),
        ...(nextPhotoURL ? { photoURL: nextPhotoURL } : {}),
      })

      await saveUserProfile(user.uid, {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        photoURL: nextPhotoURL,
        gender: gender.trim(),
        dateOfBirth: dob.trim(),
        bio: bio.trim(),
        profilePrivacy,
        treeFatherMemberId: fatherId,
        treeMotherMemberId: motherId,
      })

      if (nextPhotoURL) setPhotoURL(nextPhotoURL)
      photo.reset()
      setSavedMessage('Profile saved.')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save your profile. Try again.'
      if (message.includes('storage/unauthorized') || message.includes('403')) {
        setFormError('Could not upload photo. Check Storage rules or try again without a photo.')
      } else {
        setFormError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="home profile-page">
      <header className="profile-head profile-head-with-back">
        <button
          type="button"
          className="ft-back"
          aria-label="Go back"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <div>
          <h1>Profile</h1>
          <p>Update your name, photo, and contact details. This is your account on DengiTree.</p>
        </div>
      </header>

      <form
        className="home-card profile-card"
        onSubmit={handleSubmit}
        aria-busy={submitting}
      >
        {submitting ? (
          <div className="profile-saving-overlay" aria-live="polite">
            <LoadingSpinner size="lg" label="Saving profile" />
            <strong>Saving your profile…</strong>
            <span>Uploading photo and updating your details</span>
          </div>
        ) : null}

        <div className="profile-hero">
          <ProfileAvatar
            photoURL={photo.previewUrl ?? photoURL}
            name={displayName}
            size="lg"
            gender={gender}
            className="profile-hero-avatar"
          />
          <div>
            <strong>{displayName}</strong>
            <span className="profile-hero-email">{email || user?.email}</span>
          </div>
        </div>

        {loading ? (
          <div className="profile-loading-block">
            <LoadingSpinner size="lg" label="Loading profile" />
            <p>Loading your profile…</p>
          </div>
        ) : (
          <>
            <section className="profile-section">
              <h2>Personal information</h2>
              <PersonalInfoFields
                namePrefix="profile"
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

            <section className="profile-section">
              <h2>Your parents on the family tree</h2>
              <p className="field-hint">
                Choose who is your father and mother on your tree. To add new parent records, go
                to{' '}
                <Link to="/home/tree">Family Tree</Link> and use Add Parent.
              </p>
              <ParentSelectFields
                active={!loading}
                mode="sibling"
                fatherId={fatherId}
                motherId={motherId}
                onFatherId={setFatherId}
                onMotherId={setMotherId}
                emptyFathersHint="No fathers on your tree yet. Add a parent on the Family Tree page, then select them here."
                emptyMothersHint="No mothers on your tree yet. Add a parent on the Family Tree page, then select them here."
              />
            </section>

            <section className="profile-section">
              <h2>Contact &amp; photo</h2>
              <ContactFields
                phone={phone}
                email={email}
                onPhone={setPhone}
                onEmail={setEmail}
                emailReadOnly
                photoPreviewUrl={photo.previewUrl ?? photoURL}
                onPhotoSelect={photo.selectFile}
                photoError={photo.error}
              />
              <p className="field-hint">
                Email comes from your sign-in account and can&apos;t be changed here.
              </p>
            </section>

            <section className="profile-section">
              <h2>Bio &amp; tree visibility</h2>
              <MemberBioField bio={bio} onBioChange={setBio} idPrefix="profile" />
              <label className="field">
                <span>Who can view your information on the family tree?</span>
                <select
                  value={profilePrivacy}
                  onChange={(e) =>
                    setProfilePrivacy(e.target.value as MemberPrivacy)
                  }
                >
                  {MEMBER_PRIVACY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="profile-section">
              <h2>Additional information (optional)</h2>
              <OccupationEducationFields />
            </section>
          </>
        )}

        {formError ? (
          <p className="modal-form-error" role="alert">
            {formError}
          </p>
        ) : null}
        {savedMessage ? (
          <p className="profile-saved" role="status">
            {savedMessage}
          </p>
        ) : null}

        <div className="profile-actions">
          <Link
            to="/home"
            className={`profile-cancel${submitting ? ' profile-cancel-disabled' : ''}`}
            aria-disabled={submitting}
            onClick={(e) => submitting && e.preventDefault()}
          >
            Back to Home
          </Link>
          <button
            type="submit"
            className="btn-auth-primary profile-save"
            disabled={loading || submitting}
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" label="Saving profile" />
                Saving…
              </>
            ) : (
              'Save profile'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
