import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DashIcons } from './DashboardLayout'
import ProfileAvatar from './ProfileAvatar'
import { useAuth } from '../context/AuthContext'
import {
  buildTreeSearchEntries,
  filterTreeSearchEntries,
  type TreeSearchEntry,
} from '../lib/treeSearch'
import {
  positionLabel,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { hasSelfOnTree } from '../lib/treeStorage'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'

type DashboardTreeSearchProps = {
  treeVersion: number
  className?: string
  inputClassName?: string
}

export default function DashboardTreeSearch({
  treeVersion,
  className = 'dash-search',
  inputClassName,
}: DashboardTreeSearchProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const exploreRootUid = searchParams.get('explore')?.trim() || null
  const treeOwnerUid = exploreRootUid ?? user?.uid ?? null

  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [members, setMembers] = useState<TreeMember[]>([])
  const [selfName, setSelfName] = useState('')
  const [selfPosition, setSelfPosition] = useState<string | null>(null)
  const [selfPhotoURL, setSelfPhotoURL] = useState<string | null>(null)
  const [selfGender, setSelfGender] = useState<string | null>(null)
  const [joinedFamily, setJoinedFamily] = useState(false)

  useEffect(() => {
    if (!treeOwnerUid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(treeOwnerUid, setMembers)
  }, [treeOwnerUid, treeVersion])

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

  const viewerUid = user?.uid ?? null
  const includeSelf =
    Boolean(viewerUid) &&
    treeOwnerUid === viewerUid &&
    (hasSelfOnTree() || members.length > 0 || joinedFamily)

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

  const results = useMemo(
    () =>
      filterTreeSearchEntries(query, allEntries, members, {
        selfName,
        selfPosition,
        includeSelf,
      }),
    [query, allEntries, members, selfName, selfPosition, includeSelf],
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query, results.length])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function openProfile(entry: TreeSearchEntry) {
    setOpen(false)
    setQuery('')
    if (entry.kind === 'self') {
      navigate('/home/profile')
      return
    }
    if (!entry.memberId || !treeOwnerUid) return
    navigate(`/home/member/${encodeURIComponent(entry.memberId)}`, {
      state: { treeOwnerUid },
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && query.trim()) {
      setOpen(true)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const pick = results[activeIndex]
      if (pick) openProfile(pick)
    }
  }

  const showList = open && query.trim().length > 0

  return (
    <div className={`dash-search-wrap${showList ? ' is-open' : ''}`} ref={rootRef}>
      <label className={className}>
        <span className="sr-only">Search family tree</span>
        {DashIcons.search()}
        <input
          ref={inputRef}
          type="search"
          className={inputClassName}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && results[activeIndex]
              ? `${listboxId}-${results[activeIndex].key}`
              : undefined
          }
          placeholder="Search for people, relationships, or families..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </label>

      {showList ? (
        <ul className="dash-search-results" id={listboxId} role="listbox">
          {results.length ? (
            results.map((entry, index) => (
              <li key={entry.key} role="presentation">
                <button
                  type="button"
                  id={`${listboxId}-${entry.key}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`dash-search-result${index === activeIndex ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openProfile(entry)}
                >
                  <ProfileAvatar
                    photoURL={entry.kind === 'self' ? selfPhotoURL : members.find((m) => m.id === entry.memberId)?.photoURL}
                    name={entry.name}
                    gender={entry.kind === 'self' ? selfGender : members.find((m) => m.id === entry.memberId)?.gender}
                    size="sm"
                  />
                  <span className="dash-search-result-text">
                    <strong>{entry.name}</strong>
                    <span>{entry.subtitle}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="dash-search-empty" role="option" aria-disabled="true">
              No matches for &ldquo;{query.trim()}&rdquo;
            </li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
