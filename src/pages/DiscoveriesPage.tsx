import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { DashIcons } from '../components/DashboardLayout'
import ProfileAvatar from '../components/ProfileAvatar'
import { useAuth } from '../context/AuthContext'
import {
  positionLabel,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { hasSelfOnTree } from '../lib/treeStorage'
import {
  buildTreeSearchEntries,
  filterTreeSearchEntries,
  type TreeSearchEntry,
} from '../lib/treeSearch'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'
import type { DashboardContext } from './HomePage'

export default function DiscoveriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { treeVersion } = useOutletContext<DashboardContext>()

  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [members, setMembers] = useState<TreeMember[]>([])
  const [selfName, setSelfName] = useState('')
  const [selfPosition, setSelfPosition] = useState<string | null>(null)
  const [selfPhotoURL, setSelfPhotoURL] = useState<string | null>(null)
  const [selfGender, setSelfGender] = useState<string | null>(null)
  const [joinedFamily, setJoinedFamily] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setMembers)
  }, [user?.uid, treeVersion])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void resolveUserProfileForForm(user).then((profile) => {
      if (cancelled) return
      setSelfName(profileFullName(profile) || user.displayName?.trim() || 'You')
      setSelfPosition(positionLabel(profile.familyRole))
      setSelfPhotoURL(user.photoURL ?? profile.photoURL ?? null)
      setSelfGender(profile.gender?.trim() || null)
      setJoinedFamily(Boolean(profile.invitedByUid))
    })
    return () => {
      cancelled = true
    }
  }, [user, treeVersion])

  const includeSelf =
    Boolean(user?.uid) && (hasSelfOnTree() || members.length > 0 || joinedFamily)

  const allEntries = useMemo(
    () =>
      buildTreeSearchEntries({
        selfName,
        selfPosition,
        members,
        includeSelf,
      }),
    [selfName, selfPosition, members, includeSelf],
  )

  const activeQuery = submitted.trim() || query.trim()
  const searching = activeQuery.length > 0

  const results = useMemo(
    () =>
      searching
        ? filterTreeSearchEntries(
            activeQuery,
            allEntries,
            members,
            { selfName, selfPosition, includeSelf },
            0,
          )
        : [],
    [searching, activeQuery, allEntries, members, selfName, selfPosition, includeSelf],
  )

  function runSearch() {
    setSubmitted(query.trim())
  }

  function openProfile(entry: TreeSearchEntry) {
    if (entry.kind === 'self') {
      navigate('/home/profile')
      return
    }
    if (!entry.memberId || !user?.uid) return
    navigate(`/home/member/${encodeURIComponent(entry.memberId)}`, {
      state: { treeOwnerUid: user.uid },
    })
  }

  return (
    <div className="home disc-page">
      <section className="home-card disc-panel">
        <header className="disc-head">
          <h1>Discover Connections</h1>
          <p>
            Find relatives across your tree — search by name, relationship, or details in your
            family network.
          </p>
        </header>

        <form
          className="disc-search-row"
          onSubmit={(event) => {
            event.preventDefault()
            runSearch()
          }}
        >
          <label className="disc-search">
            <span className="sr-only">Search your family tree</span>
            {DashIcons.search()}
            <input
              type="search"
              placeholder="Search by name, relation or location..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (submitted) setSubmitted('')
              }}
            />
          </label>
          <button type="submit" className="disc-search-btn">
            Search
          </button>
        </form>

        {searching ? (
          <section className="disc-results" aria-live="polite">
            <div className="disc-results-head">
              <h2>
                {results.length
                  ? `${results.length} match${results.length === 1 ? '' : 'es'}`
                  : 'No matches'}
              </h2>
              <p>
                Searching your tree for &ldquo;{activeQuery}&rdquo;
              </p>
            </div>
            {results.length ? (
              <ul className="disc-results-list">
                {results.map((entry) => {
                  const member =
                    entry.kind === 'member'
                      ? members.find((m) => m.id === entry.memberId)
                      : null
                  return (
                    <li key={entry.key}>
                      <button
                        type="button"
                        className="disc-result"
                        onClick={() => openProfile(entry)}
                      >
                        <ProfileAvatar
                          photoURL={entry.kind === 'self' ? selfPhotoURL : member?.photoURL}
                          name={entry.name}
                          gender={entry.kind === 'self' ? selfGender : member?.gender}
                          size="md"
                        />
                        <span className="disc-result-text">
                          <strong>{entry.name}</strong>
                          <span>{entry.subtitle}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="disc-results-empty">
                No one on your tree matched that search. Try another name or relationship (for
                example &ldquo;mother&rdquo; or &ldquo;sibling&rdquo;).
              </p>
            )}
          </section>
        ) : (
          <ol className="home-steps disc-steps">
            <li>
              <div className="step-icon-wrap">{DashIcons.people()}</div>
              <p>
                <strong>Find Relative</strong>
                Search your tree by name or relationship above.
              </p>
            </li>
            <li>
              <div className="step-icon-wrap step-icon-empty" />
              <p>
                <strong>Add family members</strong>
                Add your parents, siblings and other relatives.
              </p>
            </li>
            <li>
              <div className="step-icon-wrap">{DashIcons.mail()}</div>
              <p>
                <strong>Invite Relatives</strong>
                Invite family members to join and contribute.
              </p>
            </li>
            <li>
              <div className="step-icon-wrap step-icon-grow">{DashIcons.leaf()}</div>
              <p>
                <strong>Grow your Tree</strong>
                Build branches together and preserve your legacy.
              </p>
            </li>
          </ol>
        )}
      </section>
    </div>
  )
}
