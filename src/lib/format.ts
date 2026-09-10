import type { Episode, MedEfficacy, Severity } from './types'

export const SEVERITY_LABEL: Record<Severity, string> = {
  lieve: 'Lieve',
  moderato: 'Moderato',
  severo: 'Severo',
}

export const MED_EFFICACY_LABEL: Record<MedEfficacy, string> = {
  efficace: 'efficace',
  parziale: 'parziale',
  non_efficace: 'non efficace',
}

export const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Bucket di durata dell'attacco, allineati a ICHD-3. */
export const DURATION_BUCKETS = ['< 4 h', '4–12 h', '12–24 h', '> 24 h']

/** Sceglie il bucket di durata dato inizio e fine. */
export function durationBucket(start: Date, end: Date): string {
  const h = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
  if (h < 4) return DURATION_BUCKETS[0]
  if (h < 12) return DURATION_BUCKETS[1]
  if (h < 24) return DURATION_BUCKETS[2]
  return DURATION_BUCKETS[3]
}

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** "35 min", "circa un'ora", "circa 6 ore" — tempo trascorso in forma discorsiva. */
export function elapsedLabel(from: Date, to: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000))
  if (mins < 60) return `${mins} min`
  const h = Math.round(mins / 60)
  return h === 1 ? "circa un'ora" : `circa ${h} ore`
}

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

export const toMonthInput = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

export function fromMonthInput(value: string): Date {
  const [y, m] = value.split('-').map(Number)
  return new Date(y, m - 1, 1, 12)
}

export const monthYearLabel = (d: Date): string =>
  cap(d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))
