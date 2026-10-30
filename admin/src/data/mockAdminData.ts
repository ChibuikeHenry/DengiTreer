export type TreeRow = {
  id: string
  treeName: string
  owner: string
  ownerIsEmail?: boolean
  members: number
  status: 'Active' | 'Pending'
  created: string
}

export type MemberRow = {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Member'
  status: 'Active' | 'Pending'
  joined: string
}

export type InvitationRow = {
  id: string
  email: string
  invitedBy: string
  role: 'Admin' | 'Member'
  status: 'Pending' | 'Sent' | 'Expired'
  sent: string
}

export type ActivityRow = {
  user: string
  action: string
  time: string
}

export const statCards = [
  { title: 'Total Users', value: '1,247', trend: '+12% this month', up: true },
  { title: 'Active Trees', value: '892', trend: '+8% this month', up: true },
  { title: 'Pending Invites', value: '34', trend: '-3% this month', up: false },
  { title: 'Reports (30d)', value: '12', trend: '+2 this month', up: true },
] as const

export const recentActivity: ActivityRow[] = [
  { user: 'John Doe', action: 'Created family tree', time: '2 hours ago' },
  { user: 'Jane Smith', action: 'Accepted invitation', time: '5 hours ago' },
  { user: 'Admin User', action: 'Updated user role', time: '1 day ago' },
  { user: 'Mary Johnson', action: 'Invited new member', time: '2 days ago' },
]

export const familyTrees: TreeRow[] = [
  {
    id: '1',
    treeName: 'The Smith Family',
    owner: 'John Smith',
    members: 24,
    status: 'Active',
    created: 'Jan 15, 2024',
  },
  {
    id: '2',
    treeName: 'Johnson Heritage',
    owner: 'Mary Johnson',
    members: 18,
    status: 'Active',
    created: 'Feb 3, 2024',
  },
  {
    id: '3',
    treeName: 'Williams Legacy',
    owner: 'david@email.com',
    ownerIsEmail: true,
    members: 31,
    status: 'Pending',
    created: 'Mar 10, 2024',
  },
  {
    id: '4',
    treeName: 'Brown Family Tree',
    owner: 'Sarah Brown',
    members: 12,
    status: 'Active',
    created: 'Apr 22, 2024',
  },
  {
    id: '5',
    treeName: 'Davis Connections',
    owner: 'Tom Davis',
    members: 9,
    status: 'Active',
    created: 'May 5, 2024',
  },
]

export const members: MemberRow[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@email.com',
    role: 'Admin',
    status: 'Active',
    joined: 'Jan 10, 2024',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@email.com',
    role: 'Member',
    status: 'Active',
    joined: 'Feb 15, 2024',
  },
  {
    id: '3',
    name: 'Admin User',
    email: 'admin@dengitree.com',
    role: 'Admin',
    status: 'Active',
    joined: 'Dec 1, 2023',
  },
  {
    id: '4',
    name: 'New User',
    email: 'newuser@email.com',
    role: 'Member',
    status: 'Pending',
    joined: 'Mar 20, 2024',
  },
  {
    id: '5',
    name: 'Sarah Brown',
    email: 'sarah@email.com',
    role: 'Member',
    status: 'Active',
    joined: 'Apr 2, 2024',
  },
]

export const invitationsTab: InvitationRow[] = [
  {
    id: '1',
    email: 'newuser@email.com',
    invitedBy: 'John Doe',
    role: 'Member',
    status: 'Pending',
    sent: 'Mar 20, 2024',
  },
  {
    id: '2',
    email: 'invite@example.com',
    invitedBy: 'Jane Smith',
    role: 'Admin',
    status: 'Pending',
    sent: 'Mar 18, 2024',
  },
  {
    id: '3',
    email: 'family@email.com',
    invitedBy: 'Admin User',
    role: 'Member',
    status: 'Expired',
    sent: 'Mar 1, 2024',
  },
]

export const invitationsPage: InvitationRow[] = [
  {
    id: '1',
    email: 'newuser@email.com',
    invitedBy: 'John Doe',
    role: 'Member',
    status: 'Pending',
    sent: 'Mar 20, 2024',
  },
  {
    id: '2',
    email: 'invite@example.com',
    invitedBy: 'Jane Smith',
    role: 'Admin',
    status: 'Sent',
    sent: 'Mar 18, 2024',
  },
  {
    id: '3',
    email: 'family@email.com',
    invitedBy: 'Admin User',
    role: 'Member',
    status: 'Expired',
    sent: 'Mar 1, 2024',
  },
]
