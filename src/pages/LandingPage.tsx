import { Link } from 'react-router-dom'
import './LandingPage.css'

const navLinks = [
  { label: 'Features', href: '/features', external: true },
  { label: 'How It Works', href: '#how-it-works', external: false },
  { label: 'Explore', href: '#explore', external: false },
  { label: 'Pricing', href: '#pricing', external: false },
  { label: 'About US', href: '#about', external: false },
  { label: 'Blog', href: '#blog', external: false },
]

const heroHighlights = [
  { label: 'Collaborative', icon: 'users' },
  { label: 'Verified', icon: 'shield' },
  { label: 'Private & Secure', icon: 'lock' },
  { label: 'For Every Family', icon: 'heart' },
] as const

const features = [
  {
    title: 'Build Together',
    description:
      'Invite relatives to contribute photos, stories, and connections so your tree grows as a shared effort.',
    icon: 'users',
  },
  {
    title: 'Verify Relationship',
    description:
      'Confirm ties with trusted attestations so your family network stays accurate and credible.',
    icon: 'badge',
  },
  {
    title: 'Preserve History',
    description:
      'Capture memories, timelines, and heirlooms in one living archive your family can revisit for generations.',
    icon: 'book',
  },
  {
    title: 'Support All Families',
    description:
      'Flexible structures for biological, chosen, blended, and extended families — every story belongs.',
    icon: 'home',
  },
  {
    title: 'Control Privacy',
    description:
      'Decide who sees what. Share openly with relatives or keep sensitive branches private.',
    icon: 'eye',
  },
  {
    title: 'Discover Connections',
    description:
      'Uncover unexpected links across your network and reconnect with relatives near and far.',
    icon: 'search',
  },
] as const

const steps = [
  {
    number: '1',
    title: 'Create Your Profile',
    description: 'Set up your account and start your family tree in minutes.',
    icon: 'userPlus',
  },
  {
    number: '2',
    title: 'Invite Relative',
    description: 'Send invites so loved ones can join and contribute.',
    icon: 'mail',
  },
  {
    number: '3',
    title: 'Expand Together',
    description: 'Add branches, stories, and photos as your network grows.',
    icon: 'growth',
  },
  {
    number: '4',
    title: 'Preserve & Connect',
    description: 'Keep your legacy safe and stay connected across generations.',
    icon: 'shieldCheck',
  },
] as const

type IconName =
  | 'users'
  | 'shield'
  | 'lock'
  | 'heart'
  | 'badge'
  | 'book'
  | 'home'
  | 'eye'
  | 'search'
  | 'userPlus'
  | 'mail'
  | 'growth'
  | 'shieldCheck'

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (name) {
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )
    case 'badge':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...common}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      )
    case 'userPlus':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )
    case 'growth':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      )
    case 'shieldCheck':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
  }
}

function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-name">DengiTree</span>
      <span className="logo-tagline">Your Family. Your Story. Connected.</span>
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="site" id="top">
      <header className="header animate-rise">
        <Logo />
        <nav className="nav" aria-label="Primary">
          {navLinks.map((link) =>
            link.external ? (
              <Link key={link.href} to={link.href}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ),
          )}
        </nav>
        <div className="header-actions">
          <Link className="btn-outline" to="/login">
            Log in
          </Link>
          <Link className="btn-primary" to="/signup">
            Get Started
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="hero-badge animate-rise">
              A living, collaborative and verified family network.
            </p>
            <h1 className="hero-title animate-rise-1">
              Discover your connections.{' '}
              <span className="text-brand">Preserve your legacy.</span>
            </h1>
            <p className="hero-lede animate-rise-2">
              DengiTree helps families map relationships, verify ties, and keep
              stories alive — privately, securely, and together.
            </p>
            <Link className="btn-primary btn-lg animate-rise-2" to="/signup" id="start">
              Start Your Family Tree
            </Link>
            <ul className="hero-highlights animate-rise-3">
              {heroHighlights.map((item) => (
                <li key={item.label}>
                  <span className="highlight-icon">
                    <Icon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="hero-media animate-rise-2">
            <img
              src="/images/hero-family.png"
              alt="A multi-generational family gathered together and smiling"
              width={960}
              height={720}
            />
          </div>
        </section>

        <section className="features-wrap" id="features">
          <div className="features-panel">
            <header className="section-head">
              <p className="eyebrow">Powerful Features</p>
              <h2>Everything your family needs in one place</h2>
            </header>
            <div className="feature-grid">
              {features.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <div className="feature-icon">
                    <Icon name={feature.icon} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="how" id="how-it-works">
          <header className="section-head">
            <p className="eyebrow">How It Works</p>
            <h2>Simple steps to build your family network</h2>
          </header>
          <ol className="steps">
            {steps.map((step, index) => (
              <li className="step" key={step.number}>
                <div className="step-visual">
                  <div className="step-icon">
                    <Icon name={step.icon} />
                  </div>
                  {index < steps.length - 1 ? (
                    <span className="step-connector" aria-hidden="true" />
                  ) : null}
                </div>
                <div className="step-copy">
                  <h3>
                    <span className="step-number">{step.number}</span>
                    {step.title}
                  </h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cta-banner" id="explore" aria-labelledby="cta-heading">
          <div className="cta-content">
            <h2 id="cta-heading">Your family story deserves to live on.</h2>
            <p>
              Join thousands of families building their legacy with DengiTree.
            </p>
            <div className="cta-actions">
              <Link className="btn-on-brand" to="/signup">
                Start Your Family Tree
              </Link>
              <span className="cta-note">It&apos;s free to get started</span>
            </div>
          </div>
          <div className="cta-media">
            <img
              src="/images/hero-family.png"
              alt="Grandparents and children sharing a joyful moment"
              width={800}
              height={520}
            />
          </div>
        </section>
      </main>

      <footer className="footer" id="about">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>
              DengiTree is a living family network where relatives collaborate,
              verify relationships, and preserve the stories that make a legacy.
            </p>
          </div>

          <div>
            <h3>Product</h3>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#how-it-works">How it Works</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <a href="#security">Security</a>
              </li>
              <li>
                <a href="#mobile">Mobile App</a>
              </li>
            </ul>
          </div>

          <div id="blog">
            <h3>Explore</h3>
            <ul>
              <li>
                <a href="#explore">Family Networks</a>
              </li>
              <li>
                <a href="#explore">Discover Connections</a>
              </li>
              <li>
                <a href="#explore">Community</a>
              </li>
              <li>
                <a href="#blog">Blog</a>
              </li>
            </ul>
          </div>

          <div>
            <h3>Company</h3>
            <ul>
              <li>
                <a href="#about">About Us</a>
              </li>
              <li>
                <a href="#careers">Careers</a>
              </li>
              <li>
                <a href="#help">Help Center</a>
              </li>
              <li>
                <a href="#contact">Contact Us</a>
              </li>
            </ul>
          </div>

          <div className="footer-newsletter" id="pricing">
            <h3>Newsletter</h3>
            <p>Get tips on preserving family history and growing your network.</p>
            <form
              className="newsletter-form"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                placeholder="Enter your email"
                required
              />
              <button className="btn-primary" type="submit">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} DengiTree. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
