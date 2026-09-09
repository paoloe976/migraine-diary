import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const ICON: Record<string, ReactNode> = {
  oggi: (
    <>
      <circle cx="11" cy="11" r="8" />
      <circle cx="11" cy="11" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4.5" width="16" height="14.5" rx="2.5" />
      <line x1="3" y1="9" x2="19" y2="9" />
      <line x1="7.5" y1="2.5" x2="7.5" y2="6" />
      <line x1="14.5" y1="2.5" x2="14.5" y2="6" />
    </>
  ),
  andamento: (
    <>
      <polyline points="3,16 8.5,10 12,13 19,5.5" />
      <circle cx="19" cy="5.5" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  altro: (
    <>
      <line x1="4" y1="7" x2="18" y2="7" />
      <line x1="4" y1="11" x2="18" y2="11" />
      <line x1="4" y1="15" x2="18" y2="15" />
    </>
  ),
}

const TABS = [
  { to: '/', label: 'Oggi', icon: 'oggi' },
  { to: '/calendario', label: 'Calendario', icon: 'calendario' },
  { to: '/andamento', label: 'Andamento', icon: 'andamento' },
  { to: '/altro', label: 'Altro', icon: 'altro' },
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
          <svg
            className="ic"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {ICON[t.icon]}
          </svg>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
