import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAxDe2Gm_SfRKrju5les_mYNkwgRrL3ihs',
  authDomain: 'dengitree.firebaseapp.com',
  projectId: 'dengitree',
  storageBucket: 'dengitree.firebasestorage.app',
  messagingSenderId: '337660527133',
  appId: '1:337660527133:web:08c6b941b8bc46455abcf4',
  measurementId: 'G-8J340ZNKN1',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
