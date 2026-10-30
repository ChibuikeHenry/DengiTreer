import { Link } from 'react-router-dom'

type AdminBrandProps = {
  /** Router path or absolute marketing URL */
  href?: string
  /** Login / dark header */
  onDark?: boolean
}

export default function AdminBrand({ href = '/dashboard', onDark = false }: AdminBrandProps) {
  const className = onDark ? 'admin-brand admin-brand--on-dark' : 'admin-brand'

  const content = (
    <>
      <img src="/favicon.svg" alt="" className="admin-brand-logo" width={32} height={32} />
      <span className="admin-brand-name">DengiTree</span>
    </>
  )

  if (href.startsWith('http')) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  )
}
