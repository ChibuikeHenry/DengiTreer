import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'
import './FeaturesPage.css'

const featureCards = [
  {
    title: 'Create Family Trees',
    description: 'Build and manage your family tree with ease',
  },
  {
    title: 'Capture Stories',
    description: "Preserve your family's history and special moments.",
  },
  {
    title: 'Stay Connected',
    description: 'Invite relatives and keep everyone in the loop.',
  },
  {
    title: 'Safe and Secure',
    description: 'Your family data is protected and only accessible to you.',
  },
  {
    title: 'Access Anywhere',
    description: 'Use DengiTree on any device, anytime, anywhere.',
  },
] as const

const processSteps = [
  {
    number: '1',
    title: 'Create Your Account',
    description: 'Sign up in minutes and set up your profile.',
    icon: 'userPlus' as const,
  },
  {
    number: '2',
    title: 'Add Family Members',
    description: 'Invite your family and fill in their details.',
    icon: null,
  },
  {
    number: '3',
    title: 'Build Your Family Tree',
    description: 'Add parents, siblings, children, spouse and more.',
    icon: null,
  },
  {
    number: '4',
    title: 'Share and Preserve',
    description: 'Add stories, photos, documents and memories.',
    icon: null,
  },
  {
    number: '5',
    title: 'Keep it Growing',
    description: 'Stay connected and continue building your legacy.',
    icon: null,
  },
] as const

function UserPlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function FeaturesPage() {
  return (
    <div className="features-page">
      <MarketingHeader />

      <main>
        <section className="feat-hero">
          <div className="feat-hero-inner">
            <div className="feat-hero-copy">
              <p className="feat-pill">Features</p>
              <h1>
                Everything you need to build, preserve and share your family legacy.
              </h1>
              <p className="feat-lede">
                DengiTree gives you the tools to create your family tree, connect with
                loved ones, and keep your family history alive for generations.
              </p>
              <Link className="feat-cta" to="/signup">
                Get Started Free
                <ArrowIcon />
              </Link>
            </div>

            <div className="feat-hero-visual" aria-hidden="true">
              <div className="feat-tree-card">
                <div className="mini-tree">
                  <div className="mini-row">
                    <div className="mini-person">
                      <span className="mini-avatar" />
                      <span>Grandfather</span>
                    </div>
                    <div className="mini-person">
                      <span className="mini-avatar" />
                      <span>Grandmother</span>
                    </div>
                  </div>
                  <div className="mini-connector" />
                  <div className="mini-row">
                    <div className="mini-person">
                      <span className="mini-avatar" />
                      <span>Father</span>
                    </div>
                    <div className="mini-person">
                      <span className="mini-avatar" />
                      <span>Mother</span>
                    </div>
                  </div>
                  <div className="mini-connector" />
                  <div className="mini-row mini-row-bottom">
                    <div className="mini-person">
                      <span className="mini-avatar" />
                      <span>Son</span>
                    </div>
                    <div className="mini-person">
                      <span className="mini-avatar" />
                      <span>Daughter</span>
                    </div>
                    <div className="mini-add">+</div>
                  </div>
                </div>
              </div>

              <ul className="feat-tags">
                <li>Family Tree</li>
                <li>Stories &amp; History</li>
                <li>Media Gallery</li>
                <li>Documents</li>
              </ul>

              <div className="feat-photo">
                <img
                  src="/images/hero-family.png"
                  alt=""
                  width={280}
                  height={280}
                />
              </div>
            </div>
          </div>

          <div className="feat-cards">
            {featureCards.map((card) => (
              <article className="feat-card" key={card.title}>
                <div className="feat-card-icon" />
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="feat-process-band">
          <div className="feat-process-intro">
            <p className="feat-pill">Features</p>
            <h2>Building your family legacy is simple.</h2>
            <p>
              Get started in just a few easy steps and begin your journey to connect,
              preserve and share your family story.
            </p>
            <Link className="feat-cta" to="/signup">
              Get Started Free
              <ArrowIcon />
            </Link>
          </div>

          <ol className="feat-steps">
            {processSteps.map((step, index) => (
              <li key={step.number}>
                <div className="feat-step-visual">
                  <span className="feat-step-badge">{step.number}</span>
                  <div className="feat-step-circle">
                    {step.icon === 'userPlus' ? <UserPlusIcon /> : null}
                  </div>
                  {index < processSteps.length - 1 ? (
                    <span className="feat-step-line" aria-hidden="true" />
                  ) : null}
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="feat-bottom-cta">
          <div>
            <h2>Your family&apos;s story matters.</h2>
            <p>
              Every generation adds a new chapter. DengiTree helps you keep it all in
              one place.
            </p>
          </div>
          <Link className="feat-cta" to="/signup">
            Get Started Free
            <ArrowIcon />
          </Link>
        </section>
      </main>
    </div>
  )
}
