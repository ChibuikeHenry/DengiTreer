const SELF_KEY = 'dengitree-self-on-tree'

export function hasSelfOnTree(): boolean {
  try {
    return localStorage.getItem(SELF_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSelfOnTree(): void {
  try {
    localStorage.setItem(SELF_KEY, 'true')
  } catch {
    /* ignore */
  }
}
