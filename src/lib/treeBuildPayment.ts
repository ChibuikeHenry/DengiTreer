import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

const initializeTreeBuildPaymentFn = httpsCallable<
  { requestId: string },
  { authorizationUrl: string; reference: string }
>(functions, 'initializeTreeBuildPayment')

const verifyTreeBuildPaymentFn = httpsCallable<
  { reference: string },
  { ok: boolean; requestId: string | null }
>(functions, 'verifyTreeBuildPayment')

export async function initializeTreeBuildPayment(requestId: string) {
  const result = await initializeTreeBuildPaymentFn({ requestId })
  return result.data
}

export async function verifyTreeBuildPayment(reference: string) {
  const result = await verifyTreeBuildPaymentFn({ reference })
  return result.data
}
