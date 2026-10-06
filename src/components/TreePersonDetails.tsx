import ProfileAvatar, { type AvatarGenderTone } from './ProfileAvatar'
import { formatBioForDisplay, hasBio } from '../lib/bio'
import { memberPrivacyShortLabel } from '../lib/memberPrivacy'
import type { MemberPrivacy } from '../lib/memberPrivacy'

type TreePersonDetailsProps = {
  photoURL: string | null
  displayName: string
  nameLabel: string
  bio: string
  privacy: MemberPrivacy
  avatarClassName?: string
  className?: string
  roleLabel?: string
  variant?: 'default' | 'pedigree'
  youBadge?: boolean
  yearsLabel?: string | null
  avatarGenderTone?: AvatarGenderTone
}

export default function TreePersonDetails({
  photoURL,
  displayName,
  nameLabel,
  bio,
  privacy,
  avatarClassName,
  className = '',
  roleLabel,
  variant = 'default',
  youBadge = false,
  yearsLabel = null,
  avatarGenderTone = 'neutral',
}: TreePersonDetailsProps) {
  const bioText = formatBioForDisplay(bio)
  const pedigree = variant === 'pedigree'

  return (
    <div className={`tree-person-card ${className}`.trim()}>
      {youBadge ? (
        <span
          className={`profile-avatar profile-avatar-tree tree-person-avatar tree-person-avatar-you pedigree-you-badge ${avatarClassName ?? ''}`.trim()}
        >
          YOU
        </span>
      ) : (
        <ProfileAvatar
          photoURL={photoURL}
          name={displayName}
          size="tree"
          genderTone={avatarGenderTone}
          className={`tree-person-avatar ${pedigree ? 'tree-person-avatar-pedigree' : ''} ${avatarClassName ?? ''}`.trim()}
        />
      )}
      <span className="tree-person-name" title={displayName}>
        {nameLabel}
      </span>
      {roleLabel ? <span className="tree-person-role">{roleLabel}</span> : null}
      {pedigree && yearsLabel ? (
        <span className="tree-person-years">{yearsLabel}</span>
      ) : null}
      {!pedigree ? (
        <>
          <p
            className={`tree-person-bio${hasBio(bio) ? '' : ' is-empty'}`}
            title={bioText}
          >
            {bioText}
          </p>
          <span className="tree-person-privacy" title={memberPrivacyShortLabel(privacy)}>
            {memberPrivacyShortLabel(privacy)}
          </span>
        </>
      ) : null}
    </div>
  )
}
