import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ensureUserDoc, onAuthChange, type AuthUser } from './data'

interface AuthState {
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export const useAuth = (): AuthState => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    // Se l'inizializzazione di Auth non risponde (storage bloccato, ecc.)
    // dopo qualche secondo mostriamo comunque il login invece di restare
    // sullo splash.
    const fallback = window.setTimeout(() => {
      setState((s) => (s.loading ? { user: null, loading: false } : s))
    }, 5000)

    const unsub = onAuthChange(async (user) => {
      window.clearTimeout(fallback)
      if (user) {
        try {
          await ensureUserDoc(user)
        } catch {
          // offline al primo avvio: il doc verrà creato al prossimo accesso online
        }
      }
      setState({ user, loading: false })
    })

    return () => {
      window.clearTimeout(fallback)
      unsub()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
