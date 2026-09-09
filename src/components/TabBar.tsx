import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Oggi', icon: '◉' },
  { to: '/calendario', label: 'Calendario', icon: '▦' },
  { to: '/andamento', label: 'Andamento', icon: '📈' },
  { to: '/altro', label: 'Altro', icon: '☰' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => (isActive ? 'is-on' : undefined)}
        >
          <span className="ic" aria-hidden="true">
            {t.icon}
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
