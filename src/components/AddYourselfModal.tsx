import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { updateProfile } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { uploadProfilePhoto } from '../lib/profilePhoto'
import { resolveUserProfileForForm, saveUserProfile } from '../lib/userProfile'
import ModalFrame from './ModalFrame'
import {
  ContactFields,
  MemberBioField,
  OccupationEducationFields,
  PersonalInfoFields,
} from './familyFormFields'
import { useDefaultMemberPrivacy } from '../hooks/useDefaultMemberPrivacy'
import MemberPrivacyFields from './MemberPrivacyFields'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddYourselfModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState<'living' | 'deceased'>('living')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [privacy, setPrivacy] = useDefaultMemberPrivacy(open)
  const photo = usePhotoPicker()
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!open) {
      setFirstName('')
      setMiddleName('')
      setLastName('')
      setDob('')
      setGender('')
      setStatus('living')
      setEmail('')
      setPhone('')
      setBio('')
      photo.reset()
      return
    }
    if (!user) return

    let cancelled = false
    setPrefillLoading(true)
    setFormError('')
    photo.reset()

    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      setFirstName(profile.firstName)
      setMiddleName(profile.middleName)
      setLastName(profile.lastName)
      setEmail(profile.email || user.email?.trim() || '')
      setPhone(profile.phone ?? '')
      setBio(profile.bio ?? '')
      setPrefillLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, photo.reset, user])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    setFormError('')
    setSubmitting(true)

    try {
      let photoURL = user.photoURL ?? undefined
      if (photo.file) {
        photoURL = await uploadProfilePhoto(user.uid, photo.file)
        await updateProfile(user, { photoURL })
      }

      await saveUserProfile(user.uid, {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        photoURL,
        bio: bio.trim(),
        profilePrivacy: privacy,
      })

      onSuccess()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save your profile. Try again.'
      if (message.includes('storage/unauthorized') || message.includes('403')) {
        setFormError(
          'Photo upload is not enabled yet. Deploy Storage rules or try again without a photo.',
        )
      } else {
        setFormError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add Yourself"
      description="We've filled in details from your account. Update anything that isn't right before you continue."
      submitLabel="Add Yourself"
      submittingText="Adding yourself…"
      onSubmit={handleSubmit}
      submitting={prefillLoading || submitting}
      formError={formError}
    >
      <section className="modal-section">
        <h3>1. Personal Information</h3>
        <PersonalInfoFields
          namePrefix="yourself"
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

      <section className="modal-section">
        <h3>2. Relationship details</h3>
        <label className="field">
          <span>Marital Status</span>
          <select defaultValue="">
            <option value="">Select marital status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </label>
      </section>

      <section className="modal-section">
        <h3>3. Contact Information (Optional)</h3>
        <ContactFields
          phone={phone}
          email={email}
          onPhone={setPhone}
          onEmail={setEmail}
          emailReadOnly
          photoPreviewUrl={photo.previewUrl ?? user?.photoURL ?? null}
          onPhotoSelect={photo.selectFile}
          photoError={photo.error}
        />
        <p className="field-hint">
          Email comes from your sign-up account and can&apos;t be changed here.
        </p>
      </section>

      <section className="modal-section">
        <h3>4. About you (Optional)</h3>
        <MemberBioField bio={bio} onBioChange={setBio} idPrefix="yourself" />
      </section>

      <MemberPrivacyFields
        privacy={privacy}
        onPrivacyChange={setPrivacy}
        sectionNumber={5}
      />

      <section className="modal-section">
        <h3>6. Additional Information (Optional)</h3>
        <OccupationEducationFields />
      </section>
    </ModalFrame>
  )
}
