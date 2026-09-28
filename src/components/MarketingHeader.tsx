import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Features', to: '/#features' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Pricing', to: '/#pricing' },
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

export default function MarketingHeader() {
  return (
    <header className="mkt-header">
      <MarketingLogo />
      <nav className="mkt-nav" aria-label="Primary">
        {navItems.map((item) =>
          item.to.startsWith('/#') ? (
            <a key={item.to} href={item.to}>
              {item.label}
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
      <div className="mkt-header-actions">
        <Link className="mkt-btn-outline" to="/login">
          Log in
        </Link>
        <Link className="mkt-btn-primary" to="/signup">
          Get Started
        </Link>
      </div>
    </header>
  )
}
