import AboutOrgChart from '../components/AboutOrgChart'
import MarketingHeader from '../components/MarketingHeader'
import './FeaturesPage.css'
import './AboutUsPage.css'

const pillars = [
  {
    title: 'Connect.',
    description: 'Bring your family together across generations.',
    icon: 'connect' as const,
  },
  {
    title: 'Discover.',
    description: 'Find new relatives and reconnect with your roots.',
    icon: 'discover' as const,
  },
  {
    title: 'Preserve.',
    description: "Keep your family's stories, photos and history safe.",
    icon: 'preserve' as const,
  },
  {
    title: 'Build.',
    description: 'Create a lasting legacy for future generation.',
    icon: 'build' as const,
  },
] as const

const team = [
  {
    name: 'Abubakar Isimbabi',
    role: 'CEO',
    jobTitle: 'Chief Executive Officer',
    bio: 'Abubakar is the visionary behind DengiTree. With a passion for technology and family legacy, he leads the team in building a platform that connects people, preserves heritage and creates lasting impact for generations to come.',
    theme: 'green' as const,
  },
  {
    name: 'Chinyere Achoromadu',
    role: 'Product Designer',
    jobTitle: 'Product Designer',
    bio: 'Chinyere brings ideas to life through thoughtful and user-centered design. She focuses on creating simple, beautiful and intuitive experiences that make DengiTree easy and enjoyable for everyone.',
    theme: 'purple' as const,
  },
  {
    name: 'Henry Nwachinemere',
    role: 'Lead Developer',
    jobTitle: 'Lead Developer',
    bio: 'Henry leads the development of DengiTree, turning ideas into reliable, secure and scalable technology. He ensures the platform runs smoothly and continues to grow with the needs of our users.',
    theme: 'blue' as const,
  },
  {
    name: 'Halima Mamman Biu',
    role: 'Developer',
    jobTitle: 'Developer',
    bio: 'Halima supports the Lead Developer by helping improve DengiTree features. She assists with testing, troubleshooting, and day-to-day development tasks. Her teamwork and attention to detail help the development team deliver smoothly.',
    theme: 'tan' as const,
  },
] as const

function PillarIcon({ type }: { type: (typeof pillars)[number]['icon'] }) {
  switch (type) {
    case 'connect':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'discover':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 22V12M12 12c-2.8 0-5-2-5-4.5V5h10v2.5c0 2.5-2.2 4.5-5 4.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8 8c1.2-1.5 2.6-2.5 4-2.5s2.8 1 4 2.5M7 5h10"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'preserve':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'build':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

function SocialIcons({ theme }: { theme: (typeof team)[number]['theme'] }) {
  return (
    <div className={`about-social about-social--${theme}`}>
      <a href="#" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zm1.777 13.019H3.555V9h3.559v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <a href="#" aria-label="Email" onClick={(e) => e.preventDefault()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  )
}

export default function AboutUsPage() {
  return (
    <div className="about-page">
      <MarketingHeader />

      <main>
        <section className="about-hero">
          <div className="about-hero-inner">
            <div className="about-hero-copy">
              <p className="feat-pill">About DengiTree</p>
              <h1>Preserving Families. Building Legacies.</h1>
              <p className="about-lede">
                DengiTree is a modern family network platform designed to help you connect,
                share and preserve your family&apos;s story. Whether you are reuniting with
                loved ones, discovering new connections, or capturing cherished memories,
                DengiTree makes it simple, safe and meaningful.
              </p>

              <ul className="about-pillars">
                {pillars.map((item) => (
                  <li key={item.title}>
                    <span className="about-pillar-icon">
                      <PillarIcon type={item.icon} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="about-hero-visual">
              <AboutOrgChart />
            </div>
          </div>
        </section>

        <section className="about-team-section" aria-labelledby="about-team-heading">
          <div className="about-team-band">
            <div className="about-team-intro">
              <div>
                <h2 id="about-team-heading">Meet the Team</h2>
                <p>
                  We are a passionate team of builders, creators and dreamers, united by one
                  mission to help families stay connected, share their stories and build a
                  lasting legacy.
                </p>
              </div>
              <p className="about-team-accent" aria-hidden="true">
                Different skills. One purpose.
              </p>
            </div>

            <ul className="about-team-grid">
              {team.map((member) => (
                <li key={member.name}>
                  <article className={`about-team-card about-team-card--${member.theme}`}>
                    <div className="about-team-media">
                      <div className="about-team-avatar" aria-hidden="true" />
                      <span className={`about-role-pill about-role-pill--${member.theme}`}>
                        {member.role}
                      </span>
                    </div>
                    <h3>{member.name}</h3>
                    <p className="about-team-job">{member.jobTitle}</p>
                    <p className="about-team-bio">{member.bio}</p>
                    <SocialIcons theme={member.theme} />
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
