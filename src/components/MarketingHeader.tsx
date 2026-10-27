import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Features', to: '/#features' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Explore', to: '/#explore' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About US', to: '/about' },
  { label: 'Blog', to: '/#blog' },
] as const

export function MarketingLogo() {
  return (
    <Link className="mkt-logo" to="/">
      <span className="mkt-logo-name">DengiTree</span>
      <span className="mkt-logo-tag">Your Family. Your Story. Connected.</span>
    </Link>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    'aria-hidden': true as const,
  }
  if (open) {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function NavItem({
  item,
  onNavigate,
}: {
  item: (typeof navItems)[number]
  onNavigate?: () => void
}) {
  if (item.to.startsWith('/#')) {
    return (
      <a href={item.to} onClick={onNavigate}>
        {item.label}
      </a>
    )
  }
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => (isActive ? 'is-active' : undefined)}
      onClick={onNavigate}
    >
      {item.label}
    </NavLink>
  )
}

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  const mobileMenu =
    menuOpen && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className="mkt-mobile-backdrop"
              role="presentation"
              onClick={closeMenu}
            />
            <div id={panelId} className="mkt-mobile-menu is-open">
              <nav className="mkt-mobile-nav" aria-label="Mobile">
                {navItems.map((item) => (
                  <NavItem key={item.to} item={item} onNavigate={closeMenu} />
                ))}
              </nav>
              <div className="mkt-mobile-actions">
                <Link className="mkt-btn-outline" to="/login" onClick={closeMenu}>
                  Log in
                </Link>
                <Link className="mkt-btn-primary" to="/signup" onClick={closeMenu}>
                  Get Started
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <>
      <header className={`mkt-header${menuOpen ? ' mkt-header-menu-open' : ''}`}>
        <MarketingLogo />
        <nav className="mkt-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="mkt-header-actions mkt-header-actions-desktop">
          <Link className="mkt-btn-outline" to="/login">
            Log in
          </Link>
          <Link className="mkt-btn-primary" to="/signup">
            Get Started
          </Link>
        </div>
        <button
          type="button"
          className="mkt-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls={panelId}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </header>
      {mobileMenu}
    </>
  )
}
