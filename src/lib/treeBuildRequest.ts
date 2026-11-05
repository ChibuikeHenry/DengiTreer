import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import { BUILD_MY_TREE_MAX_BYTES, BUILD_MY_TREE_PRICE_NAIRA } from './buildMyTreeService'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120) || 'family-data'
}

/** Any non-empty file under the size limit is allowed. */
export function isTreeBuildUploadFile(file: File): boolean {
  return file.size > 0 && file.size <= BUILD_MY_TREE_MAX_BYTES
}

/** @deprecated Use isTreeBuildUploadFile — kept for older imports. */
export const isTreeBuildSpreadsheet = isTreeBuildUploadFile

export async function uploadTreeBuildFile(
  uid: string,
  file: File,
): Promise<{
  storagePath: string
  downloadUrl: string
}> {
  const stamp = Date.now()
  const storagePath = `users/${uid}/tree-build/${stamp}-${safeFileName(file.name)}`
  const objectRef = ref(storage, storagePath)
  const contentType =
    file.type && file.type !== 'application/octet-stream'
      ? file.type
      : 'application/octet-stream'
  await uploadBytes(objectRef, file, { contentType })
  const downloadUrl = await getDownloadURL(objectRef)
  return { storagePath, downloadUrl }
}

/** @deprecated Use uploadTreeBuildFile */
export const uploadTreeBuildSpreadsheet = uploadTreeBuildFile

export type TreeBuildRequestInput = {
  uid: string
  fullName: string
  email: string
  phone: string
  notes: string
  fileName: string
  fileStoragePath: string
  fileDownloadUrl: string
  checkoutEnabled: boolean
}

export async function createTreeBuildRequest(input: TreeBuildRequestInput): Promise<string> {
  const doc = await addDoc(collection(db, 'treeBuildRequests'), {
    uid: input.uid,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim() || null,
    notes: input.notes.trim() || null,
    fileName: input.fileName,
    fileStoragePath: input.fileStoragePath,
    fileDownloadUrl: input.fileDownloadUrl,
    amountNaira: BUILD_MY_TREE_PRICE_NAIRA,
    status: input.checkoutEnabled ? 'awaiting_payment' : 'queued',
    paymentStatus: 'pending',
    createdAt: serverTimestamp(),
  })
  return doc.id
}
