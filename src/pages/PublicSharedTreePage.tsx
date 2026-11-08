import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PedigreeTreeDiagram from '../components/PedigreeTreeDiagram'
import {
  fetchPublicTreeShare,
  getCallableErrorMessage,
} from '../lib/treePublicShare'
import {
  publicMembersToTreeMembers,
  treeMembersForPublicPedigree,
  type PublicTreeSnapshotDoc,
} from '../lib/publicTreeSnapshot'
import { DEFAULT_MEMBER_PRIVACY } from '../lib/memberPrivacy'
import type { MemberModalKind } from './HomePage'
import '../dashboard.css'
import './public-shared-tree.css'

export default function PublicSharedTreePage() {
  const { token = '' } = useParams<{ token: string }>()
  const [snapshot, setSnapshot] = useState<PublicTreeSnapshotDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void fetchPublicTreeShare(token)
      .then((doc) => {
        if (cancelled) return
        if (!doc) {
          setSnapshot(null)
          setError('This shared tree link is invalid or has been turned off.')
          return
        }
        setSnapshot(doc)
      })
      .catch((err) => {
        if (cancelled) return
        setSnapshot(null)
        setError(getCallableErrorMessage(err) || 'Could not load this shared tree.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const members = useMemo(() => {
    if (!snapshot) return []
    return treeMembersForPublicPedigree(
      publicMembersToTreeMembers(snapshot.members),
      snapshot.center.selfMemberIds,
    )
  }, [snapshot])

  const noopOpenModal = (_kind: MemberModalKind) => {}

  return (
    <div className="public-tree-page">
      <header className="public-tree-bar">
        <Link to="/" className="public-tree-brand">
          DengiTree
        </Link>
        <p className="public-tree-bar-note">View-only shared family tree</p>
        <div className="public-tree-bar-actions">
          <Link to="/login" className="public-tree-link-btn">
            Log in
          </Link>
          <Link to="/signup" className="public-tree-cta">
            Get Started
          </Link>
        </div>
      </header>

      <main className="public-tree-main">
        {loading ? (
          <p className="public-tree-status">Loading family tree…</p>
        ) : error || !snapshot ? (
          <section className="public-tree-empty" role="alert">
            <h1>Tree unavailable</h1>
            <p>{error || 'This shared tree could not be found.'}</p>
            <Link to="/" className="public-tree-cta">
              Go to DengiTree
            </Link>
          </section>
        ) : (
          <>
            <header className="public-tree-head">
              <h1>{snapshot.ownerDisplayName}&apos;s family tree</h1>
              <p>Shared on DengiTree · Sign in is not required to view this link.</p>
            </header>
            <div className="public-tree-canvas ft-canvas ft-canvas-starter ft-canvas-immersive">
              <PedigreeTreeDiagram
                maxScale={1.25}
                members={members}
                openModal={noopOpenModal}
                selfPhotoURL={snapshot.center.photoURL}
                selfName={snapshot.center.displayName}
                selfHasProfileName={Boolean(snapshot.center.displayName.trim())}
                selfBio={snapshot.center.bio}
                selfPrivacy={DEFAULT_MEMBER_PRIVACY}
                selfDateOfBirth={snapshot.center.dateOfBirth}
                selfPositionLabel={snapshot.center.positionLabel}
                selfGender={snapshot.center.gender}
                viewerUid={null}
                allowAdds={false}
                centerProfileHref={null}
                centerRoleLabel="Tree center"
                exploreHint={false}
                allowMemberEdit={false}
                centerSelfMemberIds={snapshot.center.selfMemberIds}
                centerFatherMemberId={snapshot.center.treeFatherMemberId}
                centerMotherMemberId={snapshot.center.treeMotherMemberId}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
