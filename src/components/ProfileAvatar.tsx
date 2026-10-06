export type AvatarGenderTone = 'male' | 'female' | 'neutral' | 'you'

type ProfileAvatarProps = {
  photoURL?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'tree'
  genderTone?: AvatarGenderTone
  className?: string
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase()
}

export default function ProfileAvatar({
  photoURL,
  name = '',
  size = 'md',
  genderTone = 'neutral',
  className = '',
}: ProfileAvatarProps) {
  const initials = initialsFromName(name || '?')
  const toneClass =
    genderTone === 'you'
      ? ' profile-avatar-you-tone'
      : genderTone === 'male'
        ? ' profile-avatar-male'
        : genderTone === 'female'
          ? ' profile-avatar-female'
          : ''

  return (
    <span
      className={`profile-avatar profile-avatar-${size}${toneClass}${className ? ` ${className}` : ''}`}
      aria-hidden={photoURL ? undefined : true}
    >
      {photoURL ? (
        <img src={photoURL} alt={name ? `${name} profile` : ''} />
      ) : size === 'tree' ? (
        <svg
          className="profile-avatar-svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <span className="profile-avatar-initials">{initials}</span>
      )}
    </span>
  )
}
