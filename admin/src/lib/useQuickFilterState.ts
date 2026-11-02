import { useState } from 'react'
import type { FilterState } from '../components/AdminSideRail'

const DEFAULT_STATUSES = ['Active', 'Pending Claim', 'Inactive', 'Blocked']
const DEFAULT_ROLES = ['Member', 'Admin']

export function useQuickFilterState() {
  const [statuses, setStatuses] = useState<string[]>([...DEFAULT_STATUSES])
  const [roles, setRoles] = useState<string[]>([...DEFAULT_ROLES])

  function toggleStatus(status: string) {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    )
  }

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  const filterState: FilterState = { statuses, roles }

  function matchesStatusAndRole(rowStatus: string, rowRole?: string): boolean {
    const normStatus = (rowStatus || 'Active').trim()
    const normRole = (rowRole || 'Member').trim()

    // Check status match
    let statusMatches = false
    if (statuses.length === 0) {
      statusMatches = true
    } else {
      statusMatches = statuses.some((s) => {
        if (s === 'Active') return normStatus === 'Active' || normStatus === 'Sent' || normStatus === 'Joined'
        if (s === 'Pending Claim') return normStatus === 'Pending' || normStatus === 'Pending Claim'
        if (s === 'Inactive') return normStatus === 'Inactive' || normStatus === 'Expired'
        if (s === 'Blocked') return normStatus === 'Blocked'
        return normStatus.toLowerCase() === s.toLowerCase()
      })
    }

    // Check role match
    let roleMatches = false
    if (roles.length === 0) {
      roleMatches = true
    } else {
      roleMatches = roles.some((r) => normRole.toLowerCase().includes(r.toLowerCase()))
    }

    return statusMatches && roleMatches
  }

  return {
    filterState,
    toggleStatus,
    toggleRole,
    matchesStatusAndRole,
  }
}
