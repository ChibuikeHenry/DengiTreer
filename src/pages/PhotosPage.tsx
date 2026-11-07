import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import PhotoLightbox from '../components/PhotoLightbox'
import TagFamilyLibraryModal from '../components/TagFamilyLibraryModal'
import { DashIcons } from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import {
  createFamilyLibraryPhoto,
  deleteFamilyLibraryPhoto,
  subscribeFamilyLibraryPhotos,
  subscribePhotosTaggedMember,
  updateFamilyLibraryPhotoTags,
  validateFamilyLibraryPhoto,
  FAMILY_LIBRARY_SELF_TAG,
  type FamilyLibraryPhoto,
} from '../lib/familyLibrary'
import {
  roleLabel,
  subscribeTreeMembers,
  type TreeMember,
} from '../lib/familyTreeMembers'
import { profileFullName, resolveUserProfileForForm } from '../lib/userProfile'
import type { DashboardContext } from './HomePage'

function memberTagLabel(id: string, selfName: string, members: TreeMember[]): string {
  if (id === FAMILY_LIBRARY_SELF_TAG) return selfName || 'You'
  return members.find((m) => m.id === id)?.displayName ?? 'Family member'
}

export default function PhotosPage() {
  const { user } = useAuth()
  const { treeVersion } = useOutletContext<DashboardContext>()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const taggedMemberId = searchParams.get('tagged')?.trim() || null
  const taggedNameParam = searchParams.get('name')?.trim() || null
  const ownerFromQuery = searchParams.get('owner')?.trim() || null
  const libraryOwnerUid = ownerFromQuery || user?.uid || null
  const isOwnLibrary = Boolean(user?.uid && libraryOwnerUid === user.uid)
  const personFilterActive = Boolean(taggedMemberId)
  /** Someone else's tagged album — browse only, no upload/tag/delete. */
  const viewingOtherPerson =
    Boolean(taggedMemberId) && taggedMemberId !== FAMILY_LIBRARY_SELF_TAG
  const canManagePhotos = isOwnLibrary && !viewingOtherPerson

  const [photos, setPhotos] = useState<FamilyLibraryPhoto[]>([])
  const [members, setMembers] = useState<TreeMember[]>([])
  const [selfName, setSelfName] = useState('You')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tagPhoto, setTagPhoto] = useState<FamilyLibraryPhoto | null>(null)
  const [tagSaving, setTagSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<FamilyLibraryPhoto | null>(null)

  useEffect(() => {
    if (!libraryOwnerUid) {
      setPhotos([])
      setLoading(false)
      return
    }
    setLoading(true)
    if (taggedMemberId) {
      return subscribePhotosTaggedMember(
        libraryOwnerUid,
        taggedMemberId,
        (next) => {
          setPhotos(next)
          setLoading(false)
        },
        () => setLoading(false),
      )
    }
    return subscribeFamilyLibraryPhotos(
      libraryOwnerUid,
      (next) => {
        setPhotos(next)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [libraryOwnerUid, taggedMemberId])

  useEffect(() => {
    if (!libraryOwnerUid) return
    return subscribeTreeMembers(libraryOwnerUid, setMembers)
  }, [libraryOwnerUid, treeVersion])

  useEffect(() => {
    if (!user) return
    void resolveUserProfileForForm(user).then((profile) => {
      setSelfName(profileFullName(profile) || user.displayName?.trim() || 'You')
    })
  }, [user, treeVersion])

  const taggedPersonName = useMemo(() => {
    if (!taggedMemberId) return null
    if (taggedNameParam) return taggedNameParam
    if (taggedMemberId === FAMILY_LIBRARY_SELF_TAG) return selfName || 'You'
    return members.find((m) => m.id === taggedMemberId)?.displayName ?? 'this person'
  }, [taggedMemberId, taggedNameParam, members, selfName])

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!user?.uid || !canManagePhotos || uploading) return
      const files = [...fileList]
      if (!files.length) return
      setUploadError('')
      setUploading(true)
      try {
        for (const file of files) {
          const err = validateFamilyLibraryPhoto(file)
          if (err) {
            setUploadError(err)
            continue
          }
          await createFamilyLibraryPhoto(user.uid, file, { taggedMemberIds: [] })
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed. Try again.')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [user?.uid, canManagePhotos, uploading],
  )

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
    if (!canManagePhotos) return
    void uploadFiles(event.dataTransfer.files)
  }

  async function handleSaveTags(taggedMemberIds: string[]) {
    if (!user?.uid || !canManagePhotos || !tagPhoto) return
    setTagSaving(true)
    try {
      await updateFamilyLibraryPhotoTags(user.uid, tagPhoto.id, taggedMemberIds)
      setTagPhoto(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not save tags.')
    } finally {
      setTagSaving(false)
    }
  }

  async function handleDelete(photo: FamilyLibraryPhoto) {
    if (!user?.uid || !canManagePhotos || deletingId) return
    const ok = window.confirm('Remove this photo from your library?')
    if (!ok) return
    setDeletingId(photo.id)
    setUploadError('')
    try {
      await deleteFamilyLibraryPhoto(user.uid, photo)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not delete photo.')
    } finally {
      setDeletingId(null)
    }
  }

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const pageTitle = viewingOtherPerson
    ? `Photos of ${taggedPersonName}`
    : personFilterActive
      ? `Photos of ${taggedPersonName}`
      : 'My library'
  const pageSubtitle = viewingOtherPerson
    ? `View-only · photos tagged with ${taggedPersonName}.`
    : personFilterActive
      ? `Photos tagged with ${taggedPersonName} in this family library.`
      : 'Upload photos, tag people, and show memories on their profiles.'

  return (
    <div className="home upcoming-page photos-page family-library-page">
      <header className="upcoming-head">
        <div>
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
          {personFilterActive ? (
            <p className="family-library-back">
              <Link to="/home/photos">← Back to full photo library</Link>
            </p>
          ) : null}
        </div>
        {canManagePhotos ? (
          <button
            type="button"
            className="upcoming-primary-btn"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {DashIcons.upload()}
            {uploading ? 'Uploading…' : 'Upload photos'}
          </button>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files)
          }}
        />
      </header>

      {canManagePhotos ? (
        <section
          className={`home-card upcoming-panel photos-upload-preview${dragOver ? ' is-drag-over' : ''}`}
        >
          <div
            className="photos-dropzone photos-dropzone-active"
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
          >
            {DashIcons.image()}
            <strong>{uploading ? 'Uploading…' : 'Drag photos here or click to browse'}</strong>
            <span>JPG or PNG, up to 5 MB each</span>
          </div>
        </section>
      ) : null}

      {uploadError ? (
        <p className="modal-form-error family-library-error" role="alert">
          {uploadError}
        </p>
      ) : null}

      <section className="home-card upcoming-panel">
        <div className="photos-section-head">
          <h2>{personFilterActive ? 'Tagged photos' : 'Photo library'}</h2>
          <span className="upcoming-count">{photos.length} photos</span>
        </div>
        {loading ? (
          <p className="family-library-muted">Loading photos…</p>
        ) : photos.length === 0 ? (
          <div className="upcoming-empty upcoming-empty-compact">
            <p>
              {viewingOtherPerson
                ? `No photos tagged with ${taggedPersonName} yet.`
                : personFilterActive
                  ? `No photos tagged with ${taggedPersonName} yet.`
                  : 'No photos yet. Upload your first photo above.'}
            </p>
          </div>
        ) : (
          <ul className="family-library-grid">
            {photos.map((photo) => (
              <li key={photo.id} className="family-library-card">
                <button
                  type="button"
                  className="family-library-thumb"
                  onClick={() => setLightboxPhoto(photo)}
                  aria-label={`Enlarge ${photo.caption || 'photo'}`}
                >
                  <img src={photo.downloadUrl} alt={photo.caption || 'Photo'} loading="lazy" />
                </button>
                <div className="family-library-card-body">
                  {photo.taggedMemberIds.length ? (
                    <ul className="family-library-tags">
                      {photo.taggedMemberIds.map((id) => (
                        <li key={id}>
                          {memberTagLabel(id, selfName, members)}
                          {id !== FAMILY_LIBRARY_SELF_TAG && memberById.get(id)
                            ? ` · ${roleLabel(memberById.get(id)!.role)}`
                            : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="family-library-muted">Not tagged yet</p>
                  )}
                  {canManagePhotos ? (
                    <div className="family-library-card-actions">
                      <button type="button" onClick={() => setTagPhoto(photo)}>
                        Tag people
                      </button>
                      <button
                        type="button"
                        className="family-library-delete"
                        disabled={deletingId === photo.id}
                        onClick={() => void handleDelete(photo)}
                      >
                        {deletingId === photo.id ? 'Removing…' : 'Delete'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManagePhotos ? (
        <TagFamilyLibraryModal
          open={tagPhoto !== null}
          onClose={() => setTagPhoto(null)}
          photoLabel="this photo"
          members={members}
          selfName={selfName}
          initialTaggedIds={tagPhoto?.taggedMemberIds ?? []}
          saving={tagSaving}
          onSave={handleSaveTags}
        />
      ) : null}

      <PhotoLightbox
        open={lightboxPhoto !== null}
        src={lightboxPhoto?.downloadUrl ?? null}
        alt={lightboxPhoto?.caption || 'Photo'}
        onClose={() => setLightboxPhoto(null)}
      />
    </div>
  )
}
