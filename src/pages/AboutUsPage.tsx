import AboutOrgChart from '../components/AboutOrgChart'
import MarketingHeader from '../components/MarketingHeader'
import './FeaturesPage.css'
import './AboutUsPage.css'

const pillars = [
  {
    title: 'Connect',
    description: 'Bring your family together across generations.',
    icon: 'connect' as const,
  },
  {
    title: 'Discover',
    description: 'Find new relatives and reconnect with your roots.',
    icon: 'discover' as const,
  },
  {
    title: 'Preserve',
    description: "Keep your family's stories, photos and history safe.",
    icon: 'preserve' as const,
  },
  {
    title: 'Build',
    description: 'Create a lasting legacy for future generation',
    icon: 'build' as const,
  },
] as const

const team = [
  {
    name: 'Abubakar Isimbabi',
    role: 'CEO',
    jobTitle: 'Chief Executive Officer',
    bio: 'Abubakar is the visionary behind DengiTree. with a passion for technology and family legacy, he leads the team in building a platform that connects people, preserve heritage and creates lasting impact for generations to come.',
    theme: 'green' as const,
  },
  {
    name: 'Chinyere Achoromadu',
    role: 'Product Designer',
    jobTitle: 'Product Designer',
    bio: 'Chinyere brings ideas to life through thoughtful and user-centered design. She focuses on creating simple, beautiful and intuitive experience that makes DengiTree easy and enjoyable for everyone',
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
    bio: 'Halima supports the Lead Developer by helping improve DengiTree features. He assists with testing, trouble shooting, and day-to-day development task. Her teamwork and attention to details help the development team deliver smoothly.',
    theme: 'tan' as const,
  },
] as const

function PillarIcon({ type }: { type: (typeof pillars)[number]['icon'] }) {
  switch (type) {
    case 'connect':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'discover':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      )
    case 'preserve':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'build':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      )
  }
}

function SocialIcons({ theme }: { theme: (typeof team)[number]['theme'] }) {
  return (
    <div className={`about-social about-social--${theme}`} role="group" aria-label="Social links">
      <a href="#" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      </a>
      <a href="#" aria-label="Email" onClick={(e) => e.preventDefault()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </a>
    </div>
  )
}

export default function AboutUsPage() {
  return (
    <div className="about-page">
      <MarketingHeader />

      <main className="about-main">
        <div className="about-frame">
          <section className="about-hero">
            <div className="about-hero-top">
              <div className="about-hero-copy">
                <p className="feat-pill">About DengiTree</p>
                <h1>
                  Preserving Families.
                  <br />
                  Building Legacies.
                </h1>
                <p className="about-lede">
                  DengiTree is a modern family network platform designed to help you connect,
                  share and preserve your family&apos;s story. whether you are reuniting with
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

              <div className="about-hero-org">
                <AboutOrgChart />
              </div>
            </div>
          </section>

          <section className="about-team-section" aria-labelledby="about-team-heading">
            <div className="about-team-band">
              <div className="about-team-intro">
                <div className="about-team-intro-copy">
                  <h2 id="about-team-heading">Meet the Team</h2>
                  <p>
                    We are passionate teem of builders, Creators and dreamers, united by one
                    mission to help families stay connected. share their stories and build a
                    lasting legacy.
                  </p>
                </div>
                <div className="about-team-accent" aria-hidden="true">
                  <span>Different skills.</span>
                  <span>One purpose.</span>
                </div>
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
        </div>
      </main>
    </div>
  )
}
