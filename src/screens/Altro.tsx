import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { logout } from '../lib/data'
import { ACCENTS, getAccentId, setAccent } from '../lib/theme'

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
  const [accent, setAccentId] = useState(getAccentId)

  function pick(id: string) {
    setAccent(id)
    setAccentId(id)
  }

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

      <p className="section-label">Colore</p>
      <div className="accent-picker">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`accent-swatch${accent === a.id ? ' is-on' : ''}`}
            style={{ background: a.value }}
            onClick={() => pick(a.id)}
            aria-label={a.label}
            aria-pressed={accent === a.id}
            title={a.label}
          />
        ))}
      </div>

      <button type="button" className="btn-logout" onClick={() => void logout()}>
        Esci
      </button>
    </section>
  )
}
