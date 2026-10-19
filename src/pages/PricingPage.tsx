import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'
import { useAuth } from '../context/AuthContext'
import {
  formatNaira,
  PREMIUM_CHECKOUT_ENABLED,
  PREMIUM_PLAN_ORDER,
  PREMIUM_PLANS,
  type PremiumPlanId,
} from '../lib/premiumPlans'
import './PricingPage.css'

type PricingPageProps = {
  /** When true, shown inside the dashboard (no marketing header). */
  embedded?: boolean
}

export default function PricingPage({ embedded = false }: PricingPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [billingCycle, setBillingCycle] = useState<PremiumPlanId>('monthly')
  const [checkoutNotice, setCheckoutNotice] = useState('')
  const [paying, setPaying] = useState(false)

  const activePlan = PREMIUM_PLANS[billingCycle]
  const concessionTo = embedded ? '/home/concession' : '/concession'

  async function handleUpgrade() {
    setCheckoutNotice('')
    if (!embedded) {
      navigate(`/signup?plan=premium&billing=${billingCycle}`)
      return
    }
    if (!PREMIUM_CHECKOUT_ENABLED) {
      setCheckoutNotice(
        'Online payment is not available yet. You can still use Free forever, or request a concession while we finish checkout.',
      )
      return
    }
    if (!user) {
      navigate('/login')
      return
    }
    setPaying(true)
    try {
      const { initializePremiumPayment } = await import('../lib/premiumPayment')
      const { authorizationUrl } = await initializePremiumPayment(billingCycle)
      window.location.assign(authorizationUrl)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start payment. Try again.'
      setCheckoutNotice(message)
    } finally {
      setPaying(false)
    }
  }

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

          {!PREMIUM_CHECKOUT_ENABLED ? (
            <p className="pricing-pay-message pricing-checkout-preview" role="status">
              Premium checkout is coming soon — compare plans below. Payment is not charged from
              this screen yet.
            </p>
          ) : null}

          {checkoutNotice ? (
            <p className="pricing-pay-message pricing-pay-success" role="status">
              {checkoutNotice}
            </p>
          ) : null}

          <div className="pricing-grid">
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
                </div>

                <h2 className="card-plan-title">Free forever</h2>
                <p className="card-plan-desc">
                  Start with what matters most — your immediate family.
                </p>

                <div className="card-price-wrap">
                  <span className="price-amount">{formatNaira(0)}</span>
                  <span className="price-period">forever</span>
                </div>

                <Link
                  to={embedded ? '/home/tree' : '/signup'}
                  className="btn-card-action btn-free"
                >
                  {embedded ? 'Continue on Free forever' : 'Get Started'}
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
                  Unlock extended family, downloads, and unlimited members on your tree.
                </p>
                <p className="pricing-one-time-note">
                  One-time payment — no subscription or auto-renewal.
                </p>

                <div className="premium-price-row">
                  <div className="premium-price-left">
                    <div className="card-price-wrap-light">
                      <span className="price-amount-light">
                        {formatNaira(activePlan.amountNaira)}
                      </span>
                      <span className="price-period-light">{activePlan.priceSuffix}</span>
                    </div>

                    <button
                      type="button"
                      className="btn-card-action btn-upgrade"
                      disabled={paying}
                      onClick={() => void handleUpgrade()}
                    >
                      {paying
                        ? 'Opening checkout…'
                        : PREMIUM_CHECKOUT_ENABLED
                          ? 'Pay once — get Premium'
                          : 'Upgrade to Premium'}
                    </button>
                  </div>

                  <div className="premium-billing-options">
                    {PREMIUM_PLAN_ORDER.map((planId) => {
                      const plan = PREMIUM_PLANS[planId]
                      return (
                        <label
                          key={planId}
                          className={`billing-option ${billingCycle === planId ? 'is-selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="billing-cycle"
                            checked={billingCycle === planId}
                            onChange={() => setBillingCycle(planId)}
                          />
                          <span className="radio-dot" />
                          <strong>{formatNaira(plan.amountNaira)}</strong>
                          <span>{plan.pickerLabel}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="card-premium-body">
                <ul className="card-features features-premium">
                  <li>
                    <span className="check-icon check-premium">✔</span>
                    See and explore your extended family (grandparents, aunts, uncles, cousins and
                    more)
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
