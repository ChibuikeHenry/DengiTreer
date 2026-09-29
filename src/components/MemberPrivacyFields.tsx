import {
  MEMBER_PRIVACY_OPTIONS,
  type MemberPrivacy,
} from '../lib/memberPrivacy'

type Props = {
  privacy: MemberPrivacy
  onPrivacyChange: (value: MemberPrivacy) => void
  sectionNumber?: number
}

export default function MemberPrivacyFields({
  privacy,
  onPrivacyChange,
  sectionNumber = 5,
}: Props) {
  return (
    <section className="modal-section">
      <h3>{sectionNumber}. Privacy settings</h3>
      <label className="field">
        <span>Who can view this person&apos;s information?</span>
        <span className="sr-only">Privacy</span>
        <select
          value={privacy}
          onChange={(e) => onPrivacyChange(e.target.value as MemberPrivacy)}
        >
          {MEMBER_PRIVACY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className="privacy-note">
        You can change this later under Settings → Privacy or on the Invitations page.
      </p>
    </section>
  )
}
