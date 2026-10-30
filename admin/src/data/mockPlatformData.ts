export const platformStats = [
  { label: 'Total Users', value: '3,500', tone: 'green' as const },
  { label: 'Claimed Accounts', value: '2,000', tone: 'mint' as const },
  { label: 'Unclaimed Profiles', value: '750', tone: 'yellow' as const },
  { label: 'Pending Invitations', value: '700', tone: 'lavender' as const },
  { label: 'Concession Request', value: '50', tone: 'purple' as const },
  { label: 'Total Families', value: '1,250', tone: 'sage' as const },
]

export const operationsQueue = [
  { label: 'Profile Claims Awaiting Review', tone: 'green' as const },
  { label: 'Relationship Dispute', tone: 'yellow' as const },
  { label: 'Invitation Delivery Issues', tone: 'blue' as const },
  { label: 'Privacy Requests', tone: 'purple' as const },
]

export const adminQuickActions = [
  'Review Profile Claim',
  'Review Concession',
  'Manage Invitation',
  'Export User Report',
]

export const recentPlatformActivity = [
  {
    event: 'Profile Claimed',
    category: 'Profile Management',
    status: 'Completed' as const,
    time: 'Sep 16, 2026 10:24 AM',
  },
  {
    event: 'Invitation Sent',
    category: 'Invitations',
    status: 'Completed' as const,
    time: 'Sep 16, 2026 9:02 AM',
  },
  {
    event: 'Concession Request',
    category: 'Billing',
    status: 'Pending' as const,
    time: 'Sep 15, 2026 4:18 PM',
  },
]

export const chartMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar']
export const chartPoints = [12, 14, 16, 19, 22]
