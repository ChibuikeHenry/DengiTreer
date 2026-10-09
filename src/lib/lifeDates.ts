export function yearFromDateString(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  const match = value.trim().match(/^(\d{4})/)
  if (!match) return null
  const year = Number.parseInt(match[1], 10)
  return Number.isFinite(year) ? year : null
}

/** Display line under relationship, e.g. (1948-2019) or (Living). */
export function formatLifeYearsLine(
  dateOfBirth: string | null | undefined,
  dateOfDeath: string | null | undefined,
  memberStatus: 'living' | 'deceased',
): string | null {
  const birthYear = yearFromDateString(dateOfBirth)
  const deathYear = yearFromDateString(dateOfDeath)

  if (birthYear != null && deathYear != null) {
    return `(${birthYear}-${deathYear})`
  }
  if (birthYear != null && memberStatus === 'deceased') {
    return `(${birthYear})`
  }
  return null
}

export function formatDisplayDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = Date.parse(value.trim())
  if (Number.isNaN(parsed)) return value.trim()
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeDateField(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const today = getTodayString()
  if (trimmed > today) return today
  return trimmed
}
