import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import AdminPageToolbar from '../components/AdminPageToolbar'
import { useUserFamilyTree, type AdminTreeMember } from '../lib/useUserFamilyTree'
import { IconTree } from '../components/AdminNavIcons'

export type TreeRequest = {
  id: string
  uid: string
  fullName: string
  email: string
  phone: string
  dateOfBirth?: string
  location?: string
  notes: string
  fileName?: string
  fileDownloadUrl?: string
  intendedTree?: string
  relationshipFocus?: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  timestampMs: number
}

// Default fallback sample requests matching the design screens when Firestore is empty
const INITIAL_SAMPLE_REQUESTS: TreeRequest[] = [
  {
    id: 'req-sample-1',
    uid: 'sample-uid-1',
    fullName: 'Chinyere Achoromadu',
    email: 'chinyereachoromadu44@gmail.com',
    phone: '09034444237',
    dateOfBirth: '07 / 24 / 1988',
    location: 'Lagos, Nigeria',
    notes: 'Please help me build my family tree starting from my parents and siblings.',
    fileName: 'Family_Tree_Data.xlsx',
    fileDownloadUrl: '#',
    intendedTree: 'Paternal & Maternal Lineage',
    relationshipFocus: 'Immediate & Extended Family',
    status: 'pending',
    createdAt: 'OCT.25, 2026 2:30PM',
    timestampMs: Date.now() - 3600000,
  },
  {
    id: 'req-sample-2',
    uid: 'sample-uid-2',
    fullName: 'Chinwe Nwosu',
    email: 'chinwe.nwosu@gmail.com',
    phone: '08023334455',
    dateOfBirth: '11 / 12 / 1990',
    location: 'Abuja, Nigeria',
    notes: 'I have attached my family records excel sheet.',
    fileName: 'Nwosu_Family_Records.xlsx',
    fileDownloadUrl: '#',
    intendedTree: 'Maternal Lineage',
    relationshipFocus: 'Grandparents & Siblings',
    status: 'pending',
    createdAt: 'OCT.24, 2026 2:30PM',
    timestampMs: Date.now() - 86400000,
  },
  {
    id: 'req-sample-3',
    uid: 'sample-uid-3',
    fullName: 'Daniel Peters',
    email: 'daniel4peter@gmail.com',
    phone: '08134445566',
    dateOfBirth: '03 / 15 / 1985',
    location: 'Port Harcourt, Nigeria',
    notes: 'Assistance needed to organize my family records.',
    fileName: 'Peters_Family_Tree.xlsx',
    fileDownloadUrl: '#',
    intendedTree: 'Paternal Lineage',
    relationshipFocus: 'Children & Spouses',
    status: 'in_progress',
    createdAt: 'OCT.23, 2026 2:30PM',
    timestampMs: Date.now() - 172800000,
  },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (!parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDateStr(timestamp: any): string {
  if (!timestamp) return 'OCT.25, 2026 2:30PM'
  try {
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return (
      d
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        .toUpperCase() +
      ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    )
  } catch {
    return 'OCT.25, 2026 2:30PM'
  }
}

type AddRoleType = 'grandparent' | 'parent' | 'sibling' | 'spouse' | 'child'

export default function CreateFamilyTreePage() {
  const [requests, setRequests] = useState<TreeRequest[]>(INITIAL_SAMPLE_REQUESTS)
  const [selectedRequestId, setSelectedRequestId] = useState<string>('req-sample-1')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  // Building Mode State
  const [buildingTreeForUser, setBuildingTreeForUser] = useState<{
    uid: string
    name: string
    email: string
  } | null>(null)

  const [activeAddModalRole, setActiveAddModalRole] = useState<AddRoleType | null>(null)
  const [quickActionsMenuOpen, setQuickActionsMenuOpen] = useState(false)

  // Listen to Firestore treeBuildRequests
  useEffect(() => {
    const q = query(collection(db, 'treeBuildRequests'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const loaded: TreeRequest[] = snap.docs.map((d) => {
            const data = d.data()
            const rawStatus = data.status || 'pending'
            const status: TreeRequest['status'] =
              rawStatus === 'in_progress' || rawStatus === 'queued'
                ? 'in_progress'
                : rawStatus === 'completed'
                  ? 'completed'
                  : 'pending'

            return {
              id: d.id,
              uid: data.uid || d.id,
              fullName: data.fullName || data.name || 'User',
              email: data.email || '',
              phone: data.phone || '—',
              dateOfBirth: data.dateOfBirth || '—',
              location: data.location || '—',
              notes: data.notes || data.message || 'No additional notes provided.',
              fileName: data.fileName || 'Family_Tree_Data.xlsx',
              fileDownloadUrl: data.fileDownloadUrl || '#',
              intendedTree: data.intendedTree || 'Paternal & Maternal Lineage',
              relationshipFocus: data.relationshipFocus || 'Immediate Family',
              status,
              createdAt: formatDateStr(data.createdAt),
              timestampMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
            }
          })
          setRequests(loaded)
          if (loaded.length > 0 && !loaded.some((r) => r.id === selectedRequestId)) {
            setSelectedRequestId(loaded[0].id)
          }
        }
      },
      (err) => {
        console.warn('Error fetching tree build requests:', err)
      },
    )
    return () => unsub()
  }, [])

  // Currently selected request object
  const activeRequest = requests.find((r) => r.id === selectedRequestId) || requests[0]

  // Filtered requests list
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
          ? r.status === 'pending'
          : statusFilter === 'in_progress'
            ? r.status === 'in_progress'
            : r.status === 'completed'

    return matchesSearch && matchesStatus
  })

  // Stats calculation
  const totalCount = requests.length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length
  const completedCount = requests.filter((r) => r.status === 'completed').length

  // Handle Status Update
  async function handleUpdateStatus(reqId: string, newStatus: TreeRequest['status']) {
    setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r)))
    try {
      if (!reqId.startsWith('req-sample-')) {
        await updateDoc(doc(db, 'treeBuildRequests', reqId), {
          status: newStatus,
          updatedAt: serverTimestamp(),
        })
      }
    } catch (err) {
      console.warn('Error updating status:', err)
    }
  }

  // Live User Family Tree data when building tree for user
  const userTreeData = useUserFamilyTree(buildingTreeForUser?.uid ?? null)

  return (
    <>
      <AdminPageToolbar
        title="Create Family Tree"
        subtitle="View and assist users who requested help to create family tree."
      />

      {/* Main Container */}
      <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* VIEW 1: Tree Builder Mode */}
        {buildingTreeForUser ? (
          <TreeBuilderCanvasView
            targetUser={buildingTreeForUser}
            treeData={userTreeData}
            onBack={() => setBuildingTreeForUser(null)}
            onOpenAddModal={(role) => setActiveAddModalRole(role)}
            quickActionsOpen={quickActionsMenuOpen}
            setQuickActionsOpen={setQuickActionsMenuOpen}
          />
        ) : (
          /* VIEW 2: Requests List & Details Panel */
          <>
            {/* Top Stat Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
              }}
            >
              <StatCard
                icon="👥"
                bgColor="#eef6e8"
                iconColor="#163706"
                count={totalCount}
                label="Total Requests"
              />
              <StatCard
                icon="🕒"
                bgColor="#fef3c7"
                iconColor="#92400e"
                count={pendingCount}
                label="Pending Review"
              />
              <StatCard
                icon="⚙"
                bgColor="#dbeafe"
                iconColor="#1e40af"
                count={inProgressCount}
                label="In Progress"
              />
              <StatCard
                icon="✓"
                bgColor="#dcfce7"
                iconColor="#166534"
                count={completedCount}
                label="Completed"
              />
            </div>

            {/* Two-Column Grid: List & Selected Request */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Request List */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #d4d9cf',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                {/* Search & Filter Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #c8d2c2',
                      background: '#f8faf6',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#163706',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">Request ({filteredRequests.length})</option>
                    <option value="pending">Pending ({pendingCount})</option>
                    <option value="in_progress">In Progress ({inProgressCount})</option>
                    <option value="completed">Completed ({completedCount})</option>
                  </select>

                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem 0.45rem 1.8rem',
                        borderRadius: '8px',
                        border: '1px solid #c8d2c2',
                        fontSize: '0.78rem',
                        background: '#ffffff',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: '0.55rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.75rem',
                        color: '#717d6a',
                      }}
                    >
                      🔍
                    </span>
                  </div>
                </div>

                {/* List Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '380px' }}>
                  {filteredRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#717d6a', fontSize: '0.85rem' }}>
                      No build requests found.
                    </div>
                  ) : (
                    filteredRequests.map((req) => {
                      const isSelected = req.id === activeRequest?.id
                      return (
                        <div
                          key={req.id}
                          onClick={() => setSelectedRequestId(req.id)}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #34611d' : '1px solid #e1e7dc',
                            background: isSelected ? '#f2f8ed' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: isSelected ? '#163706' : '#d4e3c7',
                              color: isSelected ? '#ffffff' : '#163706',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(req.fullName)}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                              <strong
                                style={{
                                  fontSize: '0.85rem',
                                  color: '#163706',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {req.fullName}
                              </strong>
                              <StatusPill status={req.status} />
                            </div>

                            <p
                              style={{
                                margin: '0.15rem 0 0',
                                fontSize: '0.74rem',
                                color: '#5c6456',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {req.email}
                            </p>

                            <span style={{ fontSize: '0.68rem', color: '#828e7a', marginTop: '0.1rem', display: 'block' }}>
                              {req.createdAt}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Pagination footer */}
                <div
                  style={{
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #e1e7dc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#5c6456',
                  }}
                >
                  <span>Showing 1-{filteredRequests.length} of {requests.length} requests</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      disabled
                      style={{ border: '1px solid #d0d8c8', background: '#fff', borderRadius: '4px', padding: '0.1rem 0.4rem', cursor: 'not-allowed' }}
                    >
                      &lt;
                    </button>
                    <span style={{ fontWeight: 700, padding: '0.1rem 0.3rem' }}>1</span>
                    <button
                      type="button"
                      disabled
                      style={{ border: '1px solid #d0d8c8', background: '#fff', borderRadius: '4px', padding: '0.1rem 0.4rem', cursor: 'not-allowed' }}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Request Details */}
              {activeRequest ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d4d9cf',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  {/* Selected Request Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e1e7dc',
                      paddingBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: '#163706',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getInitials(activeRequest.fullName)}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#163706' }}>
                            {activeRequest.fullName}
                          </h2>
                          <StatusPill status={activeRequest.status} />
                        </div>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#5c6456' }}>
                          {activeRequest.email} · {activeRequest.createdAt}
                        </p>
                      </div>
                    </div>

                    {/* Button: Start Building Family Tree */}
                    <button
                      type="button"
                      onClick={() =>
                        setBuildingTreeForUser({
                          uid: activeRequest.uid,
                          name: activeRequest.fullName,
                          email: activeRequest.email,
                        })
                      }
                      style={{
                        background: '#163706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.6rem 1.1rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 2px 5px rgba(22, 55, 6, 0.2)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <IconTree size={16} />
                      Start Building Family Tree
                    </button>
                  </div>

                  {/* Grid Cards for Request Details */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                    }}
                  >
                    {/* User Information */}
                    <div
                      style={{
                        background: '#f8faf6',
                        border: '1px solid #dce5d5',
                        borderRadius: '10px',
                        padding: '1rem',
                      }}
                    >
                      <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#163706', margin: '0 0 0.85rem', borderBottom: '1px solid #e1e8db', paddingBottom: '0.4rem' }}>
                        User Information
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#5c6456', fontWeight: 600 }}>Full Name:</span>
                          <strong style={{ color: '#163706' }}>{activeRequest.fullName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#5c6456', fontWeight: 600 }}>Email Address:</span>
                          <span style={{ color: '#163706' }}>{activeRequest.email}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#5c6456', fontWeight: 600 }}>Phone Number:</span>
                          <span style={{ color: '#163706' }}>{activeRequest.phone}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#5c6456', fontWeight: 600 }}>Date of Birth:</span>
                          <span style={{ color: '#163706' }}>{activeRequest.dateOfBirth}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#5c6456', fontWeight: 600 }}>Location:</span>
                          <span style={{ color: '#163706' }}>{activeRequest.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* User's Message */}
                    <div
                      style={{
                        background: '#f8faf6',
                        border: '1px solid #dce5d5',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#163706', margin: '0 0 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>ℹ</span> User's Message
                      </h3>
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e1e8db',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '0.8rem',
                          color: '#2a3325',
                          flex: 1,
                          lineHeight: 1.45,
                        }}
                      >
                        {activeRequest.notes}
                      </div>
                    </div>

                    {/* Upload Excel File */}
                    <div
                      style={{
                        background: '#f8faf6',
                        border: '1px solid #dce5d5',
                        borderRadius: '10px',
                        padding: '1rem',
                      }}
                    >
                      <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#163706', margin: '0 0 0.6rem' }}>
                        Uploaded File
                      </h3>
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px dashed #b8caab',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>📊</span>
                          <div>
                            <strong style={{ fontSize: '0.8rem', color: '#163706', display: 'block' }}>
                              {activeRequest.fileName || 'Family_Tree_Data.xlsx'}
                            </strong>
                            <span style={{ fontSize: '0.7rem', color: '#68775f' }}>Spreadsheet Data</span>
                          </div>
                        </div>

                        {activeRequest.fileDownloadUrl && activeRequest.fileDownloadUrl !== '#' ? (
                          <a
                            href={activeRequest.fileDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#34611d',
                              color: '#ffffff',
                              borderRadius: '6px',
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            Download
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#828e7a' }}>Attached</span>
                        )}
                      </div>
                    </div>

                    {/* Family Tree Details */}
                    <div
                      style={{
                        background: '#f8faf6',
                        border: '1px solid #dce5d5',
                        borderRadius: '10px',
                        padding: '1rem',
                      }}
                    >
                      <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#163706', margin: '0 0 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>ℹ</span> Family Tree Details
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: '#5c6456', fontSize: '0.74rem', display: 'block' }}>Intended Family Tree:</span>
                          <strong style={{ color: '#163706' }}>{activeRequest.intendedTree}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#5c6456', fontSize: '0.74rem', display: 'block' }}>Relationship Focus:</span>
                          <strong style={{ color: '#163706' }}>{activeRequest.relationshipFocus}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Next Steps Panel */}
                  <div
                    style={{
                      background: '#f2f7ee',
                      border: '1px solid #c9dcb8',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#163706', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        💡 Next Steps
                      </h3>
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#5c6456' }}>
                        Review the uploaded file and help the user create their family tree:
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#163706', fontWeight: 600 }}>
                        <span>✓ Check family members list</span>
                        <span>✓ Confirm tree structure</span>
                        <span>✓ Notify user when completed</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {activeRequest.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(activeRequest.id, 'in_progress')}
                          style={{
                            background: '#1e40af',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.55rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Mark as In Progress
                        </button>
                      ) : null}

                      {activeRequest.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(activeRequest.id, 'completed')}
                          style={{
                            background: '#166534',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.55rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Mark as Completed
                        </button>
                      ) : (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#166534',
                            border: '1px solid #86efac',
                            borderRadius: '8px',
                            padding: '0.55rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          ✓ Tree Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Add Relative Modal */}
      {activeAddModalRole && buildingTreeForUser ? (
        <AddRelativeModal
          role={activeAddModalRole}
          targetUid={buildingTreeForUser.uid}
          targetName={buildingTreeForUser.name}
          onClose={() => setActiveAddModalRole(null)}
        />
      ) : null}
    </>
  )
}

/* Stat Card Component */
function StatCard({
  icon,
  bgColor,
  iconColor,
  count,
  label,
}: {
  icon: string
  bgColor: string
  iconColor: string
  count: number
  label: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #d4d9cf',
        borderRadius: '12px',
        padding: '0.85rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: bgColor,
          color: iconColor,
          fontSize: '1.1rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#163706', lineHeight: 1 }}>
          {count}
        </span>
        <span style={{ display: 'block', fontSize: '0.78rem', color: '#5c6456', fontWeight: 600, marginTop: '0.15rem' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

/* Status Pill Badge Component */
function StatusPill({ status }: { status: TreeRequest['status'] }) {
  if (status === 'completed') {
    return (
      <span
        style={{
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #86efac',
          borderRadius: '999px',
          padding: '0.15rem 0.55rem',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        Completed
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span
        style={{
          background: '#dbeafe',
          color: '#1e40af',
          border: '1px solid #93c5fd',
          borderRadius: '999px',
          padding: '0.15rem 0.55rem',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        In Progress
      </span>
    )
  }
  return (
    <span
      style={{
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fde68a',
        borderRadius: '999px',
        padding: '0.15rem 0.55rem',
        fontSize: '0.72rem',
        fontWeight: 700,
      }}
    >
      Pending
    </span>
  )
}

/* Tree Builder Canvas Component */
function TreeBuilderCanvasView({
  targetUser,
  treeData,
  onBack,
  onOpenAddModal,
  quickActionsOpen,
  setQuickActionsOpen,
}: {
  targetUser: { uid: string; name: string; email: string }
  treeData: ReturnType<typeof useUserFamilyTree>
  onBack: () => void
  onOpenAddModal: (role: AddRoleType) => void
  quickActionsOpen: boolean
  setQuickActionsOpen: (open: boolean) => void
}) {
  const { members, loading } = treeData
  const selfMember = members.find((m) => m.isSelf)

  const grandparents = members.filter((m) => !m.isSelf && m.rawRole === 'grandparent')
  const parents = members.filter(
    (m) => !m.isSelf && (m.rawRole === 'father' || m.rawRole === 'mother' || m.rawRole === 'parent'),
  )
  const spouses = members.filter((m) => !m.isSelf && m.rawRole === 'spouse')
  const siblings = members.filter((m) => !m.isSelf && m.rawRole === 'sibling')
  const children = members.filter((m) => !m.isSelf && m.rawRole === 'child')

  const userInitials = getInitials(targetUser.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Back Top Nav Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: '#ffffff',
            border: '1px solid #c9dcb8',
            borderRadius: '8px',
            padding: '0.5rem 0.9rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#163706',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          ← Back to Requests
        </button>

        <span style={{ fontSize: '0.85rem', color: '#5c6456' }}>
          Building tree for: <strong style={{ color: '#163706' }}>{targetUser.name}</strong> ({targetUser.email})
        </span>
      </div>

      {/* Main Builder Grid: Canvas & Quick Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '1.25rem',
          minHeight: '540px',
        }}
      >
        {/* Interactive Tree Canvas */}
        <div
          style={{
            background: '#f6fae2',
            border: '1px solid #d0dfbe',
            borderRadius: '16px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ color: '#5c6456', fontSize: '0.9rem' }}>Loading family tree data…</div>
          ) : members.length <= 1 ? (
            /* Standard Initial Tree Star Layout from Design Screenshots */
            <div
              style={{
                position: 'relative',
                width: '380px',
                height: '380px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Connecting Lines */}
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                {/* Top line to Parent */}
                <line x1="190" y1="190" x2="190" y2="70" stroke="#7e9c6b" strokeWidth="2" />
                {/* Left line to Sibling */}
                <line x1="190" y1="190" x2="70" y2="190" stroke="#7e9c6b" strokeWidth="2" />
                {/* Right line to Spouse */}
                <line x1="190" y1="190" x2="310" y2="190" stroke="#7e9c6b" strokeWidth="2" />
                {/* Bottom line to Child */}
                <line x1="190" y1="190" x2="190" y2="310" stroke="#7e9c6b" strokeWidth="2" />
              </svg>

              {/* Center User Node */}
              <div
                style={{
                  position: 'absolute',
                  left: '150px',
                  top: '150px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#163706',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(22, 55, 6, 0.3)',
                  zIndex: 2,
                }}
              >
                {userInitials}
              </div>

              {/* Top: Add Parent Button */}
              <button
                type="button"
                onClick={() => onOpenAddModal('parent')}
                style={{
                  position: 'absolute',
                  left: '150px',
                  top: '30px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '2px dashed #7e9c6b',
                  color: '#163706',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                <span>Add Parent</span>
              </button>

              {/* Left: Add Sibling Button */}
              <button
                type="button"
                onClick={() => onOpenAddModal('sibling')}
                style={{
                  position: 'absolute',
                  left: '30px',
                  top: '150px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '2px dashed #7e9c6b',
                  color: '#163706',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                <span>Add Sibling</span>
              </button>

              {/* Right: Add Spouse Button */}
              <button
                type="button"
                onClick={() => onOpenAddModal('spouse')}
                style={{
                  position: 'absolute',
                  left: '270px',
                  top: '150px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '2px dashed #7e9c6b',
                  color: '#163706',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                <span>Add Spouse</span>
              </button>

              {/* Bottom: Add Child Button */}
              <button
                type="button"
                onClick={() => onOpenAddModal('child')}
                style={{
                  position: 'absolute',
                  left: '150px',
                  top: '270px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '2px dashed #7e9c6b',
                  color: '#163706',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                <span>Add Child</span>
              </button>
            </div>
          ) : (
            /* Rendered Pedigree Tree Members Diagram */
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              {/* Grandparents */}
              {grandparents.length > 0 ? (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#68775f', fontWeight: 700 }}>Grandparents</span>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    {grandparents.map((m) => (
                      <CanvasMemberPill key={m.id} member={m} />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Parents */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#68775f', fontWeight: 700 }}>Parents</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  {parents.map((m) => (
                    <CanvasMemberPill key={m.id} member={m} />
                  ))}
                  <button
                    type="button"
                    onClick={() => onOpenAddModal('parent')}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2px dashed #7e9c6b',
                      background: '#fff',
                      color: '#163706',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Self, Siblings & Spouses */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#68775f', fontWeight: 700 }}>Self, Siblings & Spouses</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => onOpenAddModal('sibling')}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2px dashed #7e9c6b',
                      background: '#fff',
                      color: '#163706',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Add Sibling"
                  >
                    +
                  </button>
                  {siblings.map((m) => (
                    <CanvasMemberPill key={m.id} member={m} />
                  ))}
                  {selfMember ? <CanvasMemberPill member={selfMember} isSelf /> : null}
                  {spouses.map((m) => (
                    <CanvasMemberPill key={m.id} member={m} />
                  ))}
                  <button
                    type="button"
                    onClick={() => onOpenAddModal('spouse')}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2px dashed #7e9c6b',
                      background: '#fff',
                      color: '#163706',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Add Spouse"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Children */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#68775f', fontWeight: 700 }}>Children</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {children.map((m) => (
                    <CanvasMemberPill key={m.id} member={m} />
                  ))}
                  <button
                    type="button"
                    onClick={() => onOpenAddModal('child')}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2px dashed #7e9c6b',
                      background: '#fff',
                      color: '#163706',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Add Child"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Right Panel */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #d4d9cf',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#163706', margin: 0 }}>
            Quick Actions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
            {/* Add family member with expanded dropdown */}
            <div
              style={{
                border: '1px solid #d0dfbe',
                borderRadius: '12px',
                background: '#f8faf6',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#163706',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>👥</span>
                  <span>Add family member</span>
                </div>
                <span>{quickActionsOpen ? '▲' : '>'}</span>
              </button>

              {/* Sub-menu matching Design Screenshots 1 & 3 */}
              {quickActionsOpen ? (
                <div
                  style={{
                    background: '#eef4ea',
                    borderTop: '1px solid #d0dfbe',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddModal('grandparent')
                      setQuickActionsOpen(false)
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      border: 'none',
                      borderBottom: '1px solid #e1ebdb',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#163706',
                      cursor: 'pointer',
                    }}
                  >
                    Grand Parents
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddModal('parent')
                      setQuickActionsOpen(false)
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      border: 'none',
                      borderBottom: '1px solid #e1ebdb',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#163706',
                      cursor: 'pointer',
                    }}
                  >
                    Parents
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddModal('sibling')
                      setQuickActionsOpen(false)
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      border: 'none',
                      borderBottom: '1px solid #e1ebdb',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#163706',
                      cursor: 'pointer',
                    }}
                  >
                    Siblings
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddModal('spouse')
                      setQuickActionsOpen(false)
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      border: 'none',
                      borderBottom: '1px solid #e1ebdb',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#163706',
                      cursor: 'pointer',
                    }}
                  >
                    Spouse
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddModal('child')
                      setQuickActionsOpen(false)
                    }}
                    style={{
                      padding: '0.65rem 1rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#163706',
                      cursor: 'pointer',
                    }}
                  >
                    Child
                  </button>
                </div>
              ) : null}
            </div>

            {/* Other Quick Action Buttons */}
            <QuickActionButton icon="🍃" label="View Full Tree" onClick={() => {}} />
            <QuickActionButton icon="📥" label="Download Tree" onClick={() => {}} />
            <QuickActionButton icon="📤" label="Share Tree" onClick={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '0.75rem 0.85rem',
        border: '1px solid #d0dfbe',
        borderRadius: '12px',
        background: '#ffffff',
        color: '#163706',
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span>&gt;</span>
    </button>
  )
}

/* Canvas Member Pill Component */
function CanvasMemberPill({
  member,
  isSelf = false,
}: {
  member: AdminTreeMember
  isSelf?: boolean
}) {
  const initials = getInitials(member.name)
  return (
    <div
      style={{
        background: isSelf ? '#163706' : '#ffffff',
        color: isSelf ? '#ffffff' : '#163706',
        border: isSelf ? '2px solid #163706' : '1px solid #b8caab',
        borderRadius: '12px',
        padding: '0.5rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        minWidth: '130px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
      }}
    >
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt={member.name}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid #7e9c6b',
          }}
        />
      ) : (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isSelf ? '#ffffff' : '#5c6456',
            color: isSelf ? '#163706' : '#ffffff',
            fontWeight: 700,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {initials}
        </div>
      )}

      <div style={{ textAlign: 'left', minWidth: 0 }}>
        <strong
          style={{
            display: 'block',
            fontSize: '0.78rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {member.name}
        </strong>
        <span
          style={{
            fontSize: '0.68rem',
            color: isSelf ? '#d4e8c8' : '#5c6456',
            fontWeight: 600,
            display: 'block',
          }}
        >
          {member.relationship}
        </span>
      </div>
    </div>
  )
}

/* Modal for Admin to Add Relative for User */
function AddRelativeModal({
  role,
  targetUid,
  targetName,
  onClose,
}: {
  role: AddRoleType
  targetUid: string
  targetName: string
  onClose: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [parentSlot, setParentSlot] = useState<'father' | 'mother'>('father')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleTitleMap: Record<AddRoleType, string> = {
    grandparent: 'Grandparent',
    parent: 'Parent',
    sibling: 'Sibling',
    spouse: 'Spouse',
    child: 'Child',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    if (!name) {
      setError('Please enter a name.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await addDoc(collection(db, 'invitations'), {
        inviterUid: targetUid,
        inviterName: targetName,
        inviteeName: name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        inviteeEmail: email.trim().toLowerCase() || null,
        role,
        parentSlot: role === 'parent' || role === 'grandparent' ? parentSlot : null,
        memberStatus: 'living',
        status: 'joined',
        createdAt: serverTimestamp(),
      })
      onClose()
    } catch (err: any) {
      console.warn('Error adding family member:', err)
      setError(err?.message || 'Failed to add relative.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 12, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid #c9dcb8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#163706' }}>
            Add {roleTitleMap[role]} for {targetName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#e2edd6',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#163706',
            }}
          >
            ✕
          </button>
        </div>

        {error ? (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              marginBottom: '0.85rem',
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#163706', marginBottom: '0.25rem' }}>
              First Name *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Mary"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #c8d2c2',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#163706', marginBottom: '0.25rem' }}>
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Achoromadu"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #c8d2c2',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#163706', marginBottom: '0.25rem' }}>
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="relative@example.com"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #c8d2c2',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {role === 'parent' || role === 'grandparent' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#163706', marginBottom: '0.25rem' }}>
                Relationship Slot
              </label>
              <select
                value={parentSlot}
                onChange={(e) => setParentSlot(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #c8d2c2',
                  fontSize: '0.85rem',
                  background: '#fff',
                }}
              >
                <option value="father">{role === 'grandparent' ? 'Grandfather' : 'Father'}</option>
                <option value="mother">{role === 'grandparent' ? 'Grandmother' : 'Mother'}</option>
              </select>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1px solid #c8d2c2',
                background: '#fff',
                color: '#163706',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.55rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: '#163706',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Adding…' : `Add ${roleTitleMap[role]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
