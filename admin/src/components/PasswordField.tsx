import { useId, useState } from 'react'
import { IconEye, IconEyeOff } from './AdminIcons'

type PasswordFieldProps = {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}

export default function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required,
}: PasswordFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [visible, setVisible] = useState(false)

  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <div className="admin-password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <button
          type="button"
          className="admin-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
    </div>
  )
}
