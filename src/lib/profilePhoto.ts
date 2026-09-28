import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import type { InviteRole } from './invitations'
import { storage } from './firebase'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png'])

export function validateProfilePhoto(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Please choose a JPG or PNG image.'
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be 5MB or smaller.'
  }
  return null
}

async function uploadImage(objectPath: string, file: File): Promise<string> {
  const validationError = validateProfilePhoto(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const objectRef = ref(storage, objectPath)
  await uploadBytes(objectRef, file, { contentType: file.type })
  return getDownloadURL(objectRef)
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  return uploadImage(`users/${uid}/profile/profile.${ext}`, file)
}

export async function uploadFamilyMemberPhoto(
  uid: string,
  role: InviteRole,
  file: File,
): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const stamp = Date.now()
  return uploadImage(`users/${uid}/family/${role}/${stamp}/profile.${ext}`, file)
}
