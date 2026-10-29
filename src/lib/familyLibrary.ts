import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import { validateProfilePhoto } from './profilePhoto'

/** Tag for the signed-in tree owner on their own profile. */
export const FAMILY_LIBRARY_SELF_TAG = '__self__'

export const FAMILY_LIBRARY_MAX_BYTES = 5 * 1024 * 1024

export type FamilyLibraryPhoto = {
  id: string
  storagePath: string
  downloadUrl: string
  caption: string
  taggedMemberIds: string[]
  createdAt: Date | null
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').slice(0, 80) || 'photo.jpg'
}

function mapPhotoDoc(id: string, data: Record<string, unknown>): FamilyLibraryPhoto {
  const created = data.createdAt as Timestamp | null | undefined
  return {
    id,
    storagePath: String(data.storagePath ?? ''),
    downloadUrl: String(data.downloadUrl ?? ''),
    caption: String(data.caption ?? ''),
    taggedMemberIds: Array.isArray(data.taggedMemberIds)
      ? data.taggedMemberIds.map((v) => String(v)).filter(Boolean)
      : [],
    createdAt: created?.toDate?.() ?? null,
  }
}

export function validateFamilyLibraryPhoto(file: File): string | null {
  return validateProfilePhoto(file)
}

export async function uploadFamilyLibraryPhoto(
  ownerUid: string,
  file: File,
): Promise<{ storagePath: string; downloadUrl: string }> {
  const err = validateFamilyLibraryPhoto(file)
  if (err) throw new Error(err)

  const stamp = Date.now()
  const storagePath = `users/${ownerUid}/family-library/${stamp}-${safeFileName(file.name)}`
  const objectRef = ref(storage, storagePath)
  await uploadBytes(objectRef, file, { contentType: file.type })
  const downloadUrl = await getDownloadURL(objectRef)
  return { storagePath, downloadUrl }
}

export async function createFamilyLibraryPhoto(
  ownerUid: string,
  file: File,
  options?: { caption?: string; taggedMemberIds?: string[] },
): Promise<string> {
  const { storagePath, downloadUrl } = await uploadFamilyLibraryPhoto(ownerUid, file)
  const taggedMemberIds = [...new Set((options?.taggedMemberIds ?? []).filter(Boolean))]
  const refDoc = await addDoc(collection(db, 'users', ownerUid, 'familyLibrary'), {
    storagePath,
    downloadUrl,
    caption: options?.caption?.trim() ?? '',
    taggedMemberIds,
    createdAt: serverTimestamp(),
  })
  return refDoc.id
}

export function subscribeFamilyLibraryPhotos(
  ownerUid: string,
  onChange: (photos: FamilyLibraryPhoto[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'users', ownerUid, 'familyLibrary'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapPhotoDoc(d.id, d.data())))
    },
    (err) => onError?.(err),
  )
}

export function subscribePhotosTaggedMember(
  ownerUid: string,
  memberId: string,
  onChange: (photos: FamilyLibraryPhoto[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'users', ownerUid, 'familyLibrary'),
    where('taggedMemberIds', 'array-contains', memberId),
  )
  return onSnapshot(
    q,
    (snap) => {
      const photos = snap.docs
        .map((d) => mapPhotoDoc(d.id, d.data()))
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      onChange(photos)
    },
    (err) => onError?.(err),
  )
}

export async function updateFamilyLibraryPhotoTags(
  ownerUid: string,
  photoId: string,
  taggedMemberIds: string[],
): Promise<void> {
  const unique = [...new Set(taggedMemberIds.filter(Boolean))]
  await updateDoc(doc(db, 'users', ownerUid, 'familyLibrary', photoId), {
    taggedMemberIds: unique,
  })
}

export async function updateFamilyLibraryPhotoCaption(
  ownerUid: string,
  photoId: string,
  caption: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', ownerUid, 'familyLibrary', photoId), {
    caption: caption.trim(),
  })
}

export async function deleteFamilyLibraryPhoto(
  ownerUid: string,
  photo: Pick<FamilyLibraryPhoto, 'id' | 'storagePath'>,
): Promise<void> {
  await deleteDoc(doc(db, 'users', ownerUid, 'familyLibrary', photo.id))
  if (photo.storagePath) {
    try {
      await deleteObject(ref(storage, photo.storagePath))
    } catch {
      /* storage object may already be gone */
    }
  }
}
