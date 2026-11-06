import { useEffect } from 'react'
import StatusBadge from './StatusBadge'
import { useUserFamilyTree, type AdminTreeMember } from '../lib/useUserFamilyTree'

type UserFamilyTreeModalProps = {
  userId: string | null
  onClose: () => void
}

function getInitials(name: string): string {
  const parts = name.replace(/\(Self\)/i, '').trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function UserFamilyTreeModal({ userId, onClose }: UserFamilyTreeModalProps) {
  const { ownerName, ownerEmail, ownerRole, ownerStatus, ownerJoined, members, loading } =
    useUserFamilyTree(userId)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!userId) return null

  // Group members into pedigree tiers
  const selfMember = members.find((m) => m.isSelf)
  const parents = members.filter((m) => !m.isSelf && (m.rawRole === 'father' || m.rawRole === 'mother' || m.rawRole === 'parent'))
  const grandparents = members.filter((m) => !m.isSelf && m.rawRole === 'grandparent')
  const spouse = members.filter((m) => !m.isSelf && m.rawRole === 'spouse')
  const siblings = members.filter((m) => !m.isSelf && m.rawRole === 'sibling')
  const children = members.filter((m) => !m.isSelf && m.rawRole === 'child')
  const others = members.filter(
    (m) =>
      !m.isSelf &&
      !parents.includes(m) &&
      !grandparents.includes(m) &&
      !spouse.includes(m) &&
      !siblings.includes(m) &&
      !children.includes(m),
  )

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
          maxWidth: '1000px',
          maxHeight: '90vh',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #c9dcb8',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            background: '#f4f8f0',
            borderBottom: '1px solid #d4e5c3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#163706', margin: 0 }}>
                {loading ? 'Loading Family Tree…' : `${ownerName}'s Family Tree`}
              </h2>
              <span className="dt-role-pill">{ownerRole}</span>
              <StatusBadge variant={ownerStatus as any} />
            </div>
            {ownerEmail ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#5c6456' }}>
                {ownerEmail} · Joined {ownerJoined} · <strong>{members.length} Total Members</strong>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#e2edd6',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#163706',
              transition: 'all 0.15s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#5c6456' }}>
              Loading family tree details from Firebase…
            </div>
          ) : (
            <>
              {/* Visual Family Tree Diagram */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#163706', marginBottom: '1rem' }}>
                  🌳 Family Tree Visual Layout
                </h3>

                <div
                  style={{
                    background: '#fafcf8',
                    border: '1px solid #dce8d0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    alignItems: 'center',
                  }}
                >
                  {/* Grandparents Tier */}
                  {grandparents.length > 0 ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#68775f', fontWeight: 700 }}>
                        Grandparents Generation
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {grandparents.map((m) => (
                          <MemberCard key={m.id} member={m} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Parents Tier */}
                  {parents.length > 0 ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#68775f', fontWeight: 700 }}>
                        Parents Generation
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {parents.map((m) => (
                          <MemberCard key={m.id} member={m} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Self & Spouse & Siblings Tier */}
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#68775f', fontWeight: 700 }}>
                      Self, Spouse & Siblings Generation
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {selfMember ? <MemberCard member={selfMember} isSelf /> : null}
                      {spouse.map((m) => (
                        <MemberCard key={m.id} member={m} />
                      ))}
                      {siblings.map((m) => (
                        <MemberCard key={m.id} member={m} />
                      ))}
                    </div>
                  </div>

                  {/* Children Tier */}
                  {children.length > 0 ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#68775f', fontWeight: 700 }}>
                        Children Generation
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {children.map((m) => (
                          <MemberCard key={m.id} member={m} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Other Relatives */}
                  {others.length > 0 ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#68775f', fontWeight: 700 }}>
                        Other Relatives
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {others.map((m) => (
                          <MemberCard key={m.id} member={m} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Members Table */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#163706', marginBottom: '0.75rem' }}>
                  📋 All Family Members ({members.length})
                </h3>
                <table className="dt-data-table">
                  <thead>
                    <tr>
                      <th scope="col">Member Name</th>
                      <th scope="col">Relationship</th>
                      <th scope="col">Email</th>
                      <th scope="col">Life Status</th>
                      <th scope="col">Account Status</th>
                      <th scope="col">Added On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} style={m.isSelf ? { background: '#f5faf0' } : undefined}>
                        <td>
                          <strong>{m.name}</strong>
                          {m.isSelf ? (
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#163706',
                                color: '#ffffff',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '999px',
                              }}
                            >
                              Tree Owner
                            </span>
                          ) : null}
                        </td>
                        <td>{m.relationship}</td>
                        <td>{m.email ?? '—'}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              background: m.memberStatus === 'deceased' ? '#fee2e2' : '#eef6e8',
                              color: m.memberStatus === 'deceased' ? '#991b1b' : '#163706',
                            }}
                          >
                            {m.memberStatus === 'deceased' ? 'Deceased' : 'Living'}
                          </span>
                        </td>
                        <td>
                          <StatusBadge variant={m.claimed ? 'Claimed' : 'Unclaimed'} />
                        </td>
                        <td>{m.addedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MemberCard({ member, isSelf = false }: { member: AdminTreeMember; isSelf?: boolean }) {
  const initials = getInitials(member.name)
  return (
    <div
      style={{
        background: isSelf ? '#eef7e6' : '#ffffff',
        border: isSelf ? '2px solid #34611d' : '1px solid #d4e3c7',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        minWidth: '160px',
        maxWidth: '220px',
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: isSelf ? '#163706' : '#5c6456',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.4rem',
        }}
      >
        {initials}
      </div>
      <strong style={{ display: 'block', fontSize: '0.85rem', color: '#163706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {member.name}
      </strong>
      <span style={{ fontSize: '0.75rem', color: '#5c6456', fontWeight: 600 }}>
        {member.relationship}
      </span>
      <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
        <StatusBadge variant={member.claimed ? 'Claimed' : 'Unclaimed'} />
      </div>
    </div>
  )
}
