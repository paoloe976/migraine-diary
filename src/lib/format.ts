import type { Episode, Severity } from './types'

export const SEVERITY_LABEL: Record<Severity, string> = {
  lieve: 'Lieve',
  moderato: 'Moderato',
  severo: 'Severo',
}

export const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** Giorni distinti con almeno un episodio, e giorni con almeno un farmaco. */
export function monthStats(episodes: Episode[]): { headacheDays: number; medDays: number } {
  const days = new Set<string>()
  const medDays = new Set<string>()
  for (const e of episodes) {
    const k = dayKey(e.start)
    days.add(k)
    if (e.meds.length > 0) medDays.add(k)
  }
  return { headacheDays: days.size, medDays: medDays.size }
}

export function episodeTitle(e: Episode): string {
  const d = cap(
    e.start.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
  )
  return e.severity ? `${d} · ${SEVERITY_LABEL[e.severity]}` : d
}

export function episodeSubtitle(e: Episode): string {
  const parts: string[] = []
  if (e.type) parts.push(e.type)
  if (e.meds.length) parts.push(e.meds.join(', '))
  if (e.notes && parts.length === 0) parts.push(e.notes)
  if (parts.length === 0) {
    parts.push(e.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
  }
  return parts.join(' · ')
}

// ---- input <-> Date ----

const pad = (n: number) => String(n).padStart(2, '0')

export const toDateInput = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const toTimeInput = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export function withDate(base: Date, dateStr: string): Date {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(base)
  d.setFullYear(y, m - 1, day)
  return d
}

export function withTime(base: Date, timeStr: string): Date {
  const [h, min] = timeStr.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, min, 0, 0)
  return d
}
