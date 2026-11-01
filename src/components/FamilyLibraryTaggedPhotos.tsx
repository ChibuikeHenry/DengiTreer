import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  untagSelfFromFamilyLibraryPhoto,
  subscribePhotosTaggedMember,
  type FamilyLibraryPhoto,
} from '../lib/familyLibrary'
import { getCallableErrorMessage } from '../lib/invitations'

type FamilyLibraryTaggedPhotosProps = {
  ownerUid: string
  memberId: string
  memberFirstName?: string
  heading?: string
  emptyHint?: string
  showLibraryLink?: boolean
  /** When true, show Untag me on each photo (viewer must be the tagged person). */
  allowSelfUntag?: boolean
  viewerUid?: string | null
}

export default function FamilyLibraryTaggedPhotos({
  ownerUid,
  memberId,
  memberFirstName,
  heading,
  emptyHint,
  showLibraryLink = true,
  allowSelfUntag = false,
  viewerUid = null,
}: FamilyLibraryTaggedPhotosProps) {
  const [photos, setPhotos] = useState<FamilyLibraryPhoto[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [untaggingId, setUntaggingId] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerUid || !memberId) {
      setPhotos([])
      setReady(true)
      return
    }
    setReady(false)
    setError('')
    return subscribePhotosTaggedMember(
      ownerUid,
      memberId,
      (next) => {
        setPhotos(next)
        setReady(true)
      },
      (err) => {
        setError(err.message)
        setReady(true)
      },
    )
  }, [ownerUid, memberId])

  async function handleUntag(photo: FamilyLibraryPhoto) {
    if (!allowSelfUntag || !ownerUid) return
    const ok = window.confirm(
      'Remove your tag from this photo? It will no longer appear on your profile.',
    )
    if (!ok) return
    setUntaggingId(photo.id)
    setError('')
    try {
      await untagSelfFromFamilyLibraryPhoto(ownerUid, photo.id, {
        viewerUid,
        selfMemberId: memberId,
      })
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    } catch (err) {
      setError(getCallableErrorMessage(err) || 'Could not untag you from this photo.')
    } finally {
      setUntaggingId(null)
    }
  }

  const title =
    heading ??
    (memberFirstName ? `Photos of ${memberFirstName}` : 'Photo library')

  return (
    <section className="claimed-card family-library-profile-section">
      <div className="family-library-profile-head">
        <h2>{title}</h2>
        {showLibraryLink ? (
          <Link to="/home/photos" className="family-library-profile-link">
            Open photo library
          </Link>
        ) : null}
      </div>
      {error ? (
        <p className="modal-form-error" role="alert">
          {error}
        </p>
      ) : null}
      {!ready ? (
        <p className="family-library-muted">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="family-library-muted">
          {emptyHint ??
            'No tagged photos yet. Upload images in My library and tag this person.'}
        </p>
      ) : (
        <ul className="family-library-profile-grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <figure className="family-library-profile-figure">
                <img src={photo.downloadUrl} alt={photo.caption || 'Photo'} loading="lazy" />
                {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
                {allowSelfUntag ? (
                  <button
                    type="button"
                    className="family-library-untag-btn"
                    disabled={untaggingId === photo.id}
                    onClick={() => void handleUntag(photo)}
                  >
                    {untaggingId === photo.id ? 'Untagging…' : 'Untag me'}
                  </button>
                ) : null}
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
