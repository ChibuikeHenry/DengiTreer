import { Link } from 'react-router-dom'

type Props = {
  /** dashboard = left-aligned sidebar; auth = centered; marketing = landing header */
  variant?: 'dashboard' | 'auth' | 'marketing'
  /** When set, wraps in Link to this path */
  to?: string
  showTagline?: boolean
  className?: string
}

function LogoMark() {
  return (
    <img
      src="/favicon.svg"
      alt=""
      className="brand-logo-mark"
      width={36}
      height={36}
      decoding="async"
    />
  )
}

export default function BrandLogo({
  variant = 'dashboard',
  to,
  showTagline = true,
  className = '',
}: Props) {
  const rootClass = `brand-logo brand-logo-${variant}${className ? ` ${className}` : ''}`

  const inner = (
    <>
      <div className="brand-logo-row">
        <LogoMark />
        <div className="brand-logo-text">
          <span className="brand-logo-name">DengiTree</span>
          <span className="brand-logo-line" aria-hidden="true" />
        </div>
      </div>
      {showTagline ? (
        <span className="brand-logo-tag">Your Family. Your Story. Connected.</span>
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={rootClass}>
        {inner}
      </Link>
    )
  }

  return <div className={rootClass}>{inner}</div>
}
