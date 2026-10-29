import { useEffect, useState, type ReactNode, type SVGProps } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'
import DashboardTreeSearch from './DashboardTreeSearch'
import ProfileAvatar from './ProfileAvatar'

type IconProps = SVGProps<SVGSVGElement>

function iconProps(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    ...props,
  }
}

export const DashIcons = {
  home: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tree: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M12 22v-7" />
      <path d="M9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
      <path d="M6.5 15.5a3.5 3.5 0 0 0 5.5 2.9" />
      <path d="M17.5 15.5a3.5 3.5 0 0 1-5.5 2.9" />
      <path d="M8 6a4 4 0 0 1 8 0" />
    </svg>
  ),
  people: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  mail: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  leaf: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  folders: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  image: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  user: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  settings: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  bell: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  help: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
  search: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  chevron: (p: IconProps = {}) => (
    <svg {...iconProps({ width: 16, height: 16, ...p })}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  star: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  userPlus: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  trendingUp: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  ),
  close: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  calendar: (p: IconProps = {}) => (
    <svg {...iconProps({ width: 18, height: 18, ...p })}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  ),
  upload: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  menu: (p: IconProps = {}) => (
    <svg {...iconProps(p)}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
}

const navItems = [
  { to: '/home', label: 'Home', icon: DashIcons.home },
  { to: '/home/tree', label: 'Family Tree', icon: DashIcons.tree },
  { to: '/home/people', label: 'People', icon: DashIcons.people },
  { to: '/home/invitations', label: 'Invitations', icon: DashIcons.mail },
  { to: '/home/discoveries', label: 'Discoveries', icon: DashIcons.leaf },
  { to: '/home/manage', label: 'Manage Trees', icon: DashIcons.folders },
  { to: '/home/photos', label: 'Family Library', icon: DashIcons.image },
  {
    to: '/home/build-my-tree',
    label: 'Build my tree',
    icon: DashIcons.upload,
    badge: 'Paid',
  },
  {
    to: '/home/clean-up-my-tree',
    label: 'Clean up my tree',
    icon: DashIcons.tree,
    badge: 'Paid',
  },
  { to: '/home/profile', label: 'Profile', icon: DashIcons.user },
  { to: '/home/settings', label: 'Settings', icon: DashIcons.settings },
] as const

type DashboardLayoutProps = {
  children: ReactNode
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onCloseSidebar: () => void
  treeImmersive?: boolean
  treeVersion?: number
}

export default function DashboardLayout({
  children,
  sidebarOpen,
  onToggleSidebar,
  onCloseSidebar,
  treeImmersive = false,
  treeVersion = 0,
}: DashboardLayoutProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [displayName, setDisplayName] = useState('Member')
  const [headerPhotoURL, setHeaderPhotoURL] = useState<string | null>(null)
  const [headerGender, setHeaderGender] = useState<string | null>(null)
  const firstName = displayName.split(' ')[0] || 'Member'

  useEffect(() => {
    if (!user) {
      setDisplayName('Member')
      setHeaderPhotoURL(null)
      setHeaderGender(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const name = profileFullName(profile) || user.displayName?.trim() || 'Member'
      setDisplayName(name)
      setHeaderPhotoURL(user.photoURL ?? profile.photoURL ?? null)
      setHeaderGender(profile.gender ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div
      className={`dash${sidebarOpen ? ' dash-sidebar-open' : ''}${treeImmersive ? ' dash-tree-immersive' : ''}`}
    >
      <div
        className="dash-overlay"
        onClick={onCloseSidebar}
        aria-hidden={!sidebarOpen}
      />

      <aside className="dash-sidebar" aria-label="Dashboard">
        <div className="dash-brand">
          <span className="dash-brand-name">DengiTree</span>
          <span className="dash-brand-tag">Your Family. Your Story. Connected.</span>
        </div>

        <nav className="dash-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/home'}
              className={({ isActive }) =>
                `dash-nav-item${isActive ? ' is-active' : ''}`
              }
              onClick={onCloseSidebar}
            >
              {item.icon()}
              <span>{item.label}</span>
              {'badge' in item && item.badge ? (
                <span className="dash-nav-badge">{item.badge}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="dash-premium">
          <div className="dash-premium-icon">{DashIcons.star()}</div>
          <p className="dash-premium-title">Go Premium</p>
          <p className="dash-premium-text">
            Unlock advanced features and Preserve for family legacy.
          </p>
          <Link
            to="/home/premium"
            className="dash-premium-btn"
            onClick={onCloseSidebar}
          >
            Explore Premium
          </Link>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            type="button"
            className="dash-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Open menu"
          >
            {DashIcons.menu()}
          </button>

          <DashboardTreeSearch treeVersion={treeVersion} />

          <div className="dash-top-actions">
            <button type="button" className="dash-icon-btn" aria-label="Notifications">
              {DashIcons.bell()}
            </button>
            <button type="button" className="dash-icon-btn" aria-label="Help">
              {DashIcons.help()}
            </button>
            <div className="dash-user-menu">
              <Link
                to="/home/profile"
                className="dash-user-link"
                title="View profile"
                aria-label={`View profile for ${displayName}`}
              >
                <ProfileAvatar
                  photoURL={headerPhotoURL}
                  name={displayName}
                  gender={headerGender}
                  size="md"
                  className="dash-avatar"
                />
                <span className="dash-user-meta">
                  <strong>{displayName}</strong>
                  <span>New Member</span>
                </span>
              </Link>
              <button
                type="button"
                className="dash-user-menu-toggle"
                aria-label="Account menu"
                aria-haspopup="true"
              >
                {DashIcons.chevron()}
              </button>
              <div className="dash-user-dropdown">
                <p className="dash-user-greeting">Hi, {firstName}</p>
                <button type="button" onClick={() => navigate('/home/profile')}>
                  Edit profile
                </button>
                <button type="button" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="dash-content">{children}</div>
      </div>
    </div>
  )
}
