type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export default function LoadingSpinner({
  size = 'md',
  label = 'Loading',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <span
      className={`dash-spinner dash-spinner-${size}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
    />
  )
}
