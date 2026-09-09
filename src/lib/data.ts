/**
 * Unico punto di accesso ai dati dell'applicazione.
 *
 * Tutto il resto del codice importa da qui e non conosce Firestore né Firebase Auth.
 * Se un domani si cambia backend (Supabase, Postgres self-hosted, ...) si riscrive
 * solo questo file.
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

// --- Autenticazione ---

export interface AuthUser {
  uid: string
  email: string | null
  name: string | null
}

function toAuthUser(u: User | null): AuthUser | null {
  return u ? { uid: u.uid, email: u.email, name: u.displayName } : null
}

/** Notifica login/logout. Restituisce la funzione di unsubscribe. */
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => callback(toAuthUser(u)))
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

// --- Diario ---
// TODO: modello dati e operazioni CRUD dopo l'analisi del prodotto.
// Ogni operazione filtrerà per uid dell'utente corrente (isolamento multiutente),
// coerentemente con le security rules di Firestore.
