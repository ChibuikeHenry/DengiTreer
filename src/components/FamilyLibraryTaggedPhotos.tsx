import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  subscribePhotosTaggedMember,
  type FamilyLibraryPhoto,
} from '../lib/familyLibrary'

type FamilyLibraryTaggedPhotosProps = {
  ownerUid: string
  memberId: string
  memberFirstName?: string
  heading?: string
  emptyHint?: string
  showLibraryLink?: boolean
}

export default function FamilyLibraryTaggedPhotos({
  ownerUid,
  memberId,
  memberFirstName,
  heading,
  emptyHint,
  showLibraryLink = true,
}: FamilyLibraryTaggedPhotosProps) {
  const [photos, setPhotos] = useState<FamilyLibraryPhoto[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

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

  const title =
    heading ??
    (memberFirstName ? `Photos of ${memberFirstName}` : 'Family Library photos')

  return (
    <section className="claimed-card family-library-profile-section">
      <div className="family-library-profile-head">
        <h2>{title}</h2>
        {showLibraryLink ? (
          <Link to="/home/photos" className="family-library-profile-link">
            Open Family Library
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
            'No tagged photos yet. Upload images in Family Library and tag this person.'}
        </p>
      ) : (
        <ul className="family-library-profile-grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <figure className="family-library-profile-figure">
                <img src={photo.downloadUrl} alt={photo.caption || 'Family photo'} loading="lazy" />
                {photo.caption ? (
                  <figcaption>{photo.caption}</figcaption>
                ) : null}
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
