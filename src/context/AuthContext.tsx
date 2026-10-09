import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { profileFromAuthUser, saveUserProfile } from '../lib/userProfile'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string, remember: boolean) => Promise<void>
  signup: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: string }).code)
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.'
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.'
      case 'auth/invalid-email':
        return 'Enter a valid email address.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.'
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.'
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email using a different sign-in method.'
      case 'auth/popup-blocked':
        return 'Pop-up was blocked. Allow pop-ups and try again.'
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Console → Authentication → Sign-in method.'
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Firebase Auth. Add it under Authentication → Settings → Authorized domains.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      case 'auth/configuration-not-found':
        return 'Firebase Auth is not set up for this project yet. Enable Email/Password in the Firebase Console.'
      default:
        break
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password, remember) {
        await setPersistence(
          auth,
          remember ? browserLocalPersistence : browserSessionPersistence,
        )
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )
        // Set immediately so ProtectedRoute doesn't bounce back to /login
        // before onAuthStateChanged fires.
        setUser(credential.user)
        setLoading(false)
      },
      async signup(firstName, lastName, email, password) {
        await setPersistence(auth, browserLocalPersistence)
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )
        const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
        if (displayName) {
          await updateProfile(credential.user, { displayName })
        }
        await saveUserProfile(credential.user.uid, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: '',
          email: email.trim(),
        })
        setUser(auth.currentUser ?? credential.user)
        setLoading(false)
      },
      async loginWithGoogle() {
        await setPersistence(auth, browserLocalPersistence)
        googleProvider.setCustomParameters({ prompt: 'select_account' })
        const credential = await signInWithPopup(auth, googleProvider)
        const profile = profileFromAuthUser(credential.user)
        await saveUserProfile(credential.user.uid, profile)
        setUser(credential.user)
        setLoading(false)
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email.trim())
      },
      async logout() {
        setLoading(true)
        try {
          await signOut(auth)
          setUser(null)
        } finally {
          setLoading(false)
        }
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export { getErrorMessage }
