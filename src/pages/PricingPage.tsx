import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'
import './PricingPage.css'

type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

const billingPrices: Record<BillingCycle, { amount: string; label: string; period: string }> = {
  monthly: { amount: '₦1,000', label: '/monthly', period: '/month' },
  quarterly: { amount: '₦2,500', label: '/Quarterly', period: '/quarter' },
  yearly: { amount: '₦5,000', label: '/Yearly', period: '/year' },
}

type PricingPageProps = {
  /** When true, shown inside the dashboard (no marketing header). */
  embedded?: boolean
}

export default function PricingPage({ embedded = false }: PricingPageProps) {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const activePricing = billingPrices[billingCycle]
  const concessionTo = embedded ? '/home/concession' : '/concession'

  return (
    <div className={`pricing-page${embedded ? ' pricing-page-embedded' : ''}`}>
      {embedded ? (
        <header className="pricing-embedded-bar">
          <Link to="/home" className="pricing-back-link">
            ← Back to Home
          </Link>
        </header>
      ) : (
        <MarketingHeader />
      )}

      <main className="pricing-main">
        <div className="pricing-hero">
          <div className="pricing-hero-header">
            <div>
              <span className="pricing-tag">PRICING</span>
              <h1 className="pricing-title">
                Choose the plan
                <br />
                that fits your family&apos;s story.
              </h1>
              <p className="pricing-subtitle">
                Whether you are just starting with your immediate family or ready to explore your
                full family history. DengiTree has a plan for you.
              </p>
            </div>
            <Link to={concessionTo} className="btn-concession">
              Need a Concession?
            </Link>
          </div>

          <div className="pricing-grid">
            {/* Free Card */}
            <div className="pricing-card card-free">
              <div className="card-top">
                <div className="card-badge-row">
                  <div className="card-icon-circle icon-free">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7 0 4.8-4.5 9-10 11z" />
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                    </svg>
                  </div>
                  <span className="pill-badge badge-free">Best for beginners</span>
                </div>

                <h2 className="card-plan-title">Free</h2>
                <p className="card-plan-desc">
                  Start with what matters most - your immediate family.
                </p>

                <div className="card-price-wrap">
                  <span className="price-amount">₦0</span>
                  <span className="price-period">/ 7 days</span>
                </div>

                <Link
                  to={embedded ? '/home/tree' : '/signup'}
                  className="btn-card-action btn-free"
                >
                  {embedded ? 'Continue on Free' : 'Get Started'}
                </Link>

                <ul className="card-features">
                  <li>
                    <span className="check-icon">✔</span>
                    See your immediate family (parents, spouse, children, siblings)
                  </li>
                  <li>
                    <span className="check-icon">✔</span>
                    Build and manage your family Tree
                  </li>
                  <li>
                    <span className="check-icon">✔</span>
                    Add and edit your own profile
                  </li>
                  <li>
                    <span className="check-icon">✔</span>
                    Access to basic family history features
                  </li>
                </ul>
              </div>
            </div>

            {/* Premium Card */}
            <div className="pricing-card card-premium">
              <div className="card-premium-head">
                <div className="card-badge-row">
                  <div className="card-icon-circle icon-premium">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <span className="pill-badge badge-popular">Most Popular</span>
                </div>

                <h2 className="card-plan-title-light">Premium</h2>
                <p className="card-plan-desc-light">
                  Start with what matters most - your immediate family.
                </p>

                <div className="premium-price-row">
                  <div className="premium-price-left">
                    <div className="card-price-wrap-light">
                      <span className="price-amount-light">{activePricing.amount}</span>
                      <span className="price-period-light">{activePricing.label}</span>
                    </div>

                    <button
                      type="button"
                      className="btn-card-action btn-upgrade"
                      onClick={() =>
                        embedded
                          ? navigate('/home/settings?plan=premium')
                          : navigate('/signup?plan=premium')
                      }
                    >
                      Upgrade to Premium
                    </button>
                  </div>

                  <div className="premium-billing-options">
                    <label
                      className={`billing-option ${billingCycle === 'monthly' ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="billing-cycle"
                        checked={billingCycle === 'monthly'}
                        onChange={() => setBillingCycle('monthly')}
                      />
                      <span className="radio-dot" />
                      <strong>₦1,000</strong>
                      <span>/monthly</span>
                    </label>

                    <label
                      className={`billing-option ${billingCycle === 'quarterly' ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="billing-cycle"
                        checked={billingCycle === 'quarterly'}
                        onChange={() => setBillingCycle('quarterly')}
                      />
                      <span className="radio-dot" />
                      <strong>₦2,500</strong>
                      <span>/Quarterly</span>
                    </label>

                    <label
                      className={`billing-option ${billingCycle === 'yearly' ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="billing-cycle"
                        checked={billingCycle === 'yearly'}
                        onChange={() => setBillingCycle('yearly')}
                      />
                      <span className="radio-dot" />
                      <strong>₦5,000</strong>
                      <span>/Yearly</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="card-premium-body">
                <ul className="card-features features-premium">
                  <li>
                    <span className="check-icon check-premium">✔</span>
                    See and explore your extended family (grandparents, aunts, uncles, cousins and more)
                  </li>
                  <li>
                    <span className="check-icon check-premium">✔</span>
                    Build a bigger family tree
                  </li>
                  <li>
                    <span className="check-icon check-premium">✔</span>
                    Easy download and sharing of family tree
                  </li>
                  <li>
                    <span className="check-icon check-premium">✔</span>
                    Unlimited family members
                  </li>
                  <li>
                    <span className="check-icon check-premium">✔</span>
                    Priority Support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
