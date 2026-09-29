const EMPTY_BIO_PLACEHOLDER = 'No bio yet'

export function normalizeBio(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

export function formatBioForDisplay(value: string | null | undefined): string {
  const bio = normalizeBio(value)
  return bio || EMPTY_BIO_PLACEHOLDER
}

export function hasBio(value: string | null | undefined): boolean {
  return normalizeBio(value).length > 0
}
