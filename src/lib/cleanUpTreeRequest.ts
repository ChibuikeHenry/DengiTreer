import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { CLEAN_UP_MY_TREE_PRICE_NAIRA } from './cleanUpMyTreeService'

export type CleanUpTreeRequestInput = {
  uid: string
  fullName: string
  email: string
  phone: string
  notes: string
  issues: string[]
  checkoutEnabled: boolean
}

export async function createCleanUpTreeRequest(input: CleanUpTreeRequestInput): Promise<string> {
  const doc = await addDoc(collection(db, 'treeCleanupRequests'), {
    uid: input.uid,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim() || null,
    notes: input.notes.trim() || null,
    issues: input.issues.filter(Boolean),
    amountNaira: CLEAN_UP_MY_TREE_PRICE_NAIRA,
    status: input.checkoutEnabled ? 'awaiting_payment' : 'queued',
    paymentStatus: 'pending',
    createdAt: serverTimestamp(),
  })
  return doc.id
}
