import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import { BUILD_MY_TREE_PRICE_NAIRA } from './buildMyTreeService'

const SPREADSHEET_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
])

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120) || 'family-data.xlsx'
}

export function isTreeBuildSpreadsheet(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return true
  return SPREADSHEET_TYPES.has(file.type)
}

export async function uploadTreeBuildSpreadsheet(uid: string, file: File): Promise<{
  storagePath: string
  downloadUrl: string
}> {
  const stamp = Date.now()
  const storagePath = `users/${uid}/tree-build/${stamp}-${safeFileName(file.name)}`
  const objectRef = ref(storage, storagePath)
  const contentType =
    file.type && file.type !== 'application/octet-stream'
      ? file.type
      : file.name.endsWith('.csv')
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  await uploadBytes(objectRef, file, { contentType })
  const downloadUrl = await getDownloadURL(objectRef)
  return { storagePath, downloadUrl }
}

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
