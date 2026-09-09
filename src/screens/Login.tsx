import { useState, type FormEvent } from 'react'
import { registerWithEmail, signInWithEmail, signInWithGoogle } from '../lib/data'

function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email o password non corretti.'
    case 'auth/email-already-in-use':
      return 'Esiste già un account con questa email.'
    case 'auth/weak-password':
      return 'La password deve avere almeno 6 caratteri.'
    case 'auth/invalid-email':
      return 'Email non valida.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    case 'auth/network-request-failed':
      return 'Nessuna connessione.'
    default:
      return 'Qualcosa è andato storto. Riprova.'
  }
}

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    run(() =>
      mode === 'signin'
        ? signInWithEmail(email, password)
        : registerWithEmail(email, password),
    )
  }

  return (
    <div className="login">
      <div className="login-head">
        <h1>Diario dell'emicrania</h1>
        <p>Tieni traccia del mal di testa in un tocco.</p>
      </div>

      <button
        type="button"
        className="btn-google"
        onClick={() => run(signInWithGoogle)}
        disabled={busy}
      >
        Continua con Google
      </button>

      <div className="login-or">
        <span>oppure</span>
      </div>

      <form className="login-form" onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          minLength={6}
          required
        />
        {error && <p className="login-err">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {mode === 'signin' ? 'Accedi' : 'Crea account'}
        </button>
      </form>

      <button
        type="button"
        className="login-switch"
        onClick={() => {
          setError('')
          setMode(mode === 'signin' ? 'signup' : 'signin')
        }}
      >
        {mode === 'signin'
          ? 'Non hai un account? Creane uno'
          : 'Hai già un account? Accedi'}
      </button>
    </div>
  )
}
