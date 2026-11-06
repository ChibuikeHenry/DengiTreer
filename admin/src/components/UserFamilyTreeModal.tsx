import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import { useUserFamilyTree, type AdminTreeMember } from '../lib/useUserFamilyTree'
import { IconTree } from './AdminNavIcons'

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
  const [activeUserId, setActiveUserId] = useState<string | null>(userId)
  const [history, setHistory] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    setActiveUserId(userId)
    setHistory([])
  }, [userId])

  const { ownerName, ownerEmail, ownerPhotoUrl, ownerRole, ownerStatus, ownerJoined, members, loading } =
    useUserFamilyTree(activeUserId)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!userId || !activeUserId) return null

  function handleNavigateToUser(targetUid: string) {
    if (targetUid === activeUserId) return
    setHistory((prev) => [...prev, { id: activeUserId!, name: ownerName || 'Previous Tree' }])
    setActiveUserId(targetUid)
  }

  function handleGoBack() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory((prev) => prev.slice(0, prev.length - 1))
    setActiveUserId(last.id)
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={handleGoBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#e2edd6',
                  border: '1px solid #c8e0b8',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#163706',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ← Back to {history[history.length - 1].name}
              </button>
            ) : null}

            {/* Owner Photo / Avatar */}
            {ownerPhotoUrl ? (
              <img
                src={ownerPhotoUrl}
                alt={ownerName}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #34611d',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#163706',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getInitials(ownerName || '?')}
              </div>
            )}

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
                          <MemberCard key={m.id} member={m} onNavigate={handleNavigateToUser} />
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
                          <MemberCard key={m.id} member={m} onNavigate={handleNavigateToUser} />
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
                      {selfMember ? <MemberCard member={selfMember} isSelf onNavigate={handleNavigateToUser} /> : null}
                      {spouse.map((m) => (
                        <MemberCard key={m.id} member={m} onNavigate={handleNavigateToUser} />
                      ))}
                      {siblings.map((m) => (
                        <MemberCard key={m.id} member={m} onNavigate={handleNavigateToUser} />
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
                          <MemberCard key={m.id} member={m} onNavigate={handleNavigateToUser} />
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
                          <MemberCard key={m.id} member={m} onNavigate={handleNavigateToUser} />
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
                      <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const canNavigate = Boolean(m.targetTreeUid && m.targetTreeUid !== activeUserId)
                      return (
                        <tr key={m.id} style={m.isSelf ? { background: '#f5faf0' } : undefined}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              {m.photoUrl ? (
                                <img
                                  src={m.photoUrl}
                                  alt={m.name}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid #34611d',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: m.isSelf ? '#163706' : '#5c6456',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {getInitials(m.name)}
                                </div>
                              )}
                              <div>
                                <strong style={{ color: '#163706' }}>{m.name}</strong>
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
                              </div>
                            </div>
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
                          <td style={{ textAlign: 'right' }}>
                            {m.targetTreeUid === activeUserId || m.isSelf ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#eef6e8',
                                  color: '#163706',
                                  border: '1px solid #c8e0b8',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                <IconTree size={14} />
                                Viewing Tree
                              </span>
                            ) : canNavigate ? (
                              <button
                                type="button"
                                onClick={() => handleNavigateToUser(m.targetTreeUid!)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#34611d',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}
                              >
                                <IconTree size={14} />
                                View Tree
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Unclaimed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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

function MemberCard({
  member,
  isSelf = false,
  onNavigate,
}: {
  member: AdminTreeMember
  isSelf?: boolean
  onNavigate: (uid: string) => void
}) {
  const initials = getInitials(member.name)
  const canNavigate = Boolean(member.targetTreeUid && !isSelf)

  return (
    <div
      onClick={() => {
        if (canNavigate && member.targetTreeUid) {
          onNavigate(member.targetTreeUid)
        }
      }}
      style={{
        background: isSelf ? '#eef7e6' : '#ffffff',
        border: isSelf ? '2px solid #34611d' : '1px solid #d4e3c7',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        minWidth: '165px',
        maxWidth: '220px',
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        cursor: canNavigate ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (canNavigate) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 6px 14px rgba(22, 55, 6, 0.12)'
        }
      }}
      onMouseLeave={(e) => {
        if (canNavigate) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'
        }
      }}
    >
      {/* Member Photo or Initials */}
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt={member.name}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: isSelf ? '2px solid #34611d' : '1px solid #c9dcb8',
            margin: '0 auto 0.45rem',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: isSelf ? '#163706' : '#5c6456',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.45rem',
          }}
        >
          {initials}
        </div>
      )}

      <strong
        style={{
          display: 'block',
          fontSize: '0.85rem',
          color: '#163706',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {member.name}
      </strong>
      <span style={{ fontSize: '0.75rem', color: '#5c6456', fontWeight: 600 }}>
        {member.relationship}
      </span>

      <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        <StatusBadge variant={member.claimed ? 'Claimed' : 'Unclaimed'} />
        {isSelf ? (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#163706',
              background: '#eef6e8',
              padding: '0.15rem 0.45rem',
              borderRadius: '6px',
              border: '1px solid #c8e0b8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            <IconTree size={12} /> Viewing Tree
          </span>
        ) : canNavigate ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (member.targetTreeUid) onNavigate(member.targetTreeUid)
            }}
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#ffffff',
              background: '#34611d',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <IconTree size={12} /> View Tree
          </button>
        ) : null}
      </div>
    </div>
  )
}
