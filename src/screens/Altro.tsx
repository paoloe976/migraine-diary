import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { logout } from '../lib/data'

function Row({ icon, label, to }: { icon: string; label: string; to?: string }) {
  const body = (
    <>
      <span className="ic" aria-hidden="true">
        {icon}
      </span>
      {label}
      <span className="chev" aria-hidden="true">
        {to ? '›' : ''}
      </span>
    </>
  )
  return to ? (
    <li className="is-link">
      <Link to={to}>{body}</Link>
    </li>
  ) : (
    <li className="is-soon">
      {body}
      <span className="soon-tag">presto</span>
    </li>
  )
}

export default function Altro() {
  const { user } = useAuth()

  const rows: Array<[string, string, string?]> = [
    ['📤', 'Esporta / stampa diario', '/stampa'],
    ['🧩', 'Tipi di mal di testa', '/liste/tipi'],
    ['💊', 'I miei farmaci', '/liste/farmaci'],
    ['⚡', 'Cause scatenanti', '/liste/scatenanti'],
    ['💉', 'Profilassi in corso', '/profilassi'],
    ['📋', 'Questionari clinici', '/questionari'],
  ]

  return (
    <section className="screen">
      <h1 className="screen-title">Altro</h1>
      <p className="screen-sub">{user?.email ?? user?.name}</p>

      <ul className="settings-list">
        {rows.map(([icon, label, to]) => (
          <Row key={label} icon={icon} label={label} to={to} />
        ))}
      </ul>

      <button type="button" className="btn-logout" onClick={() => void logout()}>
        Esci
      </button>
    </section>
  )
}
