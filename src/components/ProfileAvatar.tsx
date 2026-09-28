type ProfileAvatarProps = {
  photoURL?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'tree'
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
  className = '',
}: ProfileAvatarProps) {
  const initials = initialsFromName(name || '?')

  return (
    <span
      className={`profile-avatar profile-avatar-${size}${className ? ` ${className}` : ''}`}
      aria-hidden={photoURL ? undefined : true}
    >
      {photoURL ? (
        <img src={photoURL} alt={name ? `${name} profile` : ''} />
      ) : (
        <span className="profile-avatar-initials">{initials}</span>
      )}
    </span>
  )
}
