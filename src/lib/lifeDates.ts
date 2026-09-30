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

export function normalizeDateField(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}
