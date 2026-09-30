import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import EditFamilyMemberModal from '../components/EditFamilyMemberModal'
import ProfileAvatar from '../components/ProfileAvatar'
import UpcomingBadge from '../components/UpcomingBadge'
import { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { formatBioForDisplay } from '../lib/bio'
import { memberPrivacyLabel } from '../lib/memberPrivacy'
import {
  memberRelationshipLabel,
  roleLabel,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { resolveUserProfileForForm } from '../lib/userProfile'
import { hasSelfOnTree } from '../lib/treeStorage'
import type { DashboardContext } from './HomePage'

export default function PeoplePage() {
  const { user } = useAuth()
  const { openModal, treeVersion } = useOutletContext<DashboardContext>()
  const [members, setMembers] = useState<TreeMember[]>([])
  const [selfName, setSelfName] = useState('')
  const [selfBio, setSelfBio] = useState('')
  const [query, setQuery] = useState('')
  const [editingMember, setEditingMember] = useState<TreeMember | null>(null)
  const selfOnTree = useMemo(() => hasSelfOnTree(), [treeVersion])

  useEffect(() => {
    if (!user?.uid) return
    return subscribeTreeMembers(user.uid, setMembers)
  }, [user?.uid, treeVersion])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const profile = await resolveUserProfileForForm(user)
      if (cancelled) return
      const name = [profile.firstName, profile.middleName, profile.lastName]
        .filter(Boolean)
        .join(' ')
      setSelfName(name || user.displayName?.trim() || 'You')
      setSelfBio(profile.bio?.trim() ?? '')
    })()
    return () => {
      cancelled = true
    }
  }, [user, treeVersion])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        roleLabel(m.role).toLowerCase().includes(q),
    )
  }, [members, query])

  const totalCount = (selfOnTree ? 1 : 0) + members.length

  return (
    <div className="home upcoming-page people-page">
      <header className="upcoming-head">
        <div>
          <h1>People</h1>
          <p>Browse everyone on your tree, search by name, and manage how they appear.</p>
        </div>
        <button
          type="button"
          className="upcoming-primary-btn"
          onClick={() => (selfOnTree ? openModal('parent') : openModal('yourself'))}
        >
          + Add person
        </button>
      </header>

      <div className="upcoming-toolbar">
        <label className="upcoming-search">
          <span className="sr-only">Search people</span>
          {DashIcons.search()}
          <input
            type="search"
            placeholder="Search by name or relationship…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="upcoming-toolbar-meta">
          <UpcomingBadge label="Filters coming soon" />
          <span className="upcoming-count">{totalCount} people</span>
        </div>
      </div>

      <section className="home-card upcoming-panel">
        {selfOnTree ? (
          <ul className="people-list">
            <li className="people-row people-row-you">
              <ProfileAvatar photoURL={user?.photoURL} name={selfName} size="md" />
              <div className="people-row-body">
                <strong>{selfName}</strong>
                <span>You</span>
                <span className="people-row-bio">{formatBioForDisplay(selfBio)}</span>
              </div>
              <Link to="/home/profile" className="people-row-action">
                Edit profile
              </Link>
            </li>
            {filtered.map((member) => (
              <li key={member.id} className="people-row">
                <ProfileAvatar
                  photoURL={member.photoURL}
                  name={member.displayName}
                  size="md"
                />
                <div className="people-row-body">
                  <strong>{member.displayName}</strong>
                  <span>
                    {memberRelationshipLabel(member) ?? roleLabel(member.role)}
                    {member.memberStatus === 'deceased' ? ' · Deceased' : ''}
                    {member.profileClaimed ? ' · Profile claimed' : ''}
                    {' · '}
                    {memberPrivacyLabel(member.privacy)}
                  </span>
                  <span className="people-row-bio">{formatBioForDisplay(member.bio)}</span>
                </div>
                {member.inviterCanEdit ? (
                  <button
                    type="button"
                    className="people-row-action"
                    onClick={() => setEditingMember(member)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Edit profile
                  </button>
                ) : (
                  <span
                    className="people-row-action people-row-muted"
                    title="This person has signed up and claimed their profile. Only they can edit their profile."
                  >
                    View only · Profile claimed
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <EditFamilyMemberModal
          open={editingMember !== null}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdated={() => {}}
        />

        {!selfOnTree && members.length === 0 ? (
          <div className="upcoming-empty">
            <div className="upcoming-empty-icon">{DashIcons.people()}</div>
            <h2>Your family directory starts here</h2>
            <p>Add yourself to the tree, then invite relatives. Everyone you add will show up in this list.</p>
            <button type="button" className="upcoming-primary-btn" onClick={() => openModal('yourself')}>
              Add yourself
            </button>
          </div>
        ) : null}

        {selfOnTree && filtered.length === 0 && members.length > 0 ? (
          <p className="upcoming-hint">No matches for &ldquo;{query}&rdquo;.</p>
        ) : null}

        {selfOnTree && members.length === 0 ? (
          <div className="upcoming-inline-cta">
            <p>Only you are on the tree so far.</p>
            <Link to="/home/tree">Add family members from the tree view</Link>
          </div>
        ) : null}
      </section>

      <section className="home-card upcoming-preview-card">
        <h2>Planned for People</h2>
        <ul className="upcoming-feature-list">
          <li>Merge duplicate profiles</li>
          <li>Export contact list</li>
          <li>Living / deceased filters</li>
        </ul>
      </section>
    </div>
  )
}
