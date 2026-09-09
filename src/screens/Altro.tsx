import { useAuth } from '../lib/auth'
import { logout } from '../lib/data'

export default function Altro() {
  const { user } = useAuth()

  return (
    <section className="screen">
      <h1 className="screen-title">Altro</h1>
      <p className="screen-sub">{user?.email ?? user?.name}</p>

      <ul className="settings-list">
        <li>
          <span className="ic" aria-hidden="true">
            🧩
          </span>
          Tipi di mal di testa
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </li>
        <li>
          <span className="ic" aria-hidden="true">
            💊
          </span>
          I miei farmaci
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </li>
        <li>
          <span className="ic" aria-hidden="true">
            💉
          </span>
          Profilassi in corso
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </li>
        <li>
          <span className="ic" aria-hidden="true">
            📋
          </span>
          Questionari clinici
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </li>
        <li>
          <span className="ic" aria-hidden="true">
            📤
          </span>
          Esporta / stampa diario
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </li>
      </ul>

      <button type="button" className="btn-logout" onClick={() => void logout()}>
        Esci
      </button>

      <p className="build-note">
        Fase 1: «Oggi» e registrazione episodi. Calendario, andamento, questionari,
        profilassi e stampa arrivano nelle fasi successive.
      </p>
    </section>
  )
}
