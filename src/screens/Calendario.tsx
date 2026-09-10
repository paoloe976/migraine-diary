import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useShell } from '../components/AppShell'
import { getEarliestEpisodeDate, subscribeMonthEpisodes } from '../lib/data'
import type { Episode, Severity } from '../lib/types'
import { MONTHS, WEEKDAYS, monthGrid } from '../lib/calendar'
import { SEVERITY_LABEL, cap, monthStats } from '../lib/format'
import { locationSummary } from '../components/HeadMap'

function episodesByDay(episodes: Episode[], month0: number): Map<number, Episode[]> {
  const map = new Map<number, Episode[]>()
  for (const e of episodes) {
    const startDay = e.start.getMonth() === month0 ? e.start.getDate() : 1
    const endDay = e.end && e.end.getMonth() === month0 ? e.end.getDate() : startDay
    for (let d = startDay; d <= endDay; d += 1) {
      const arr = map.get(d) ?? []
      arr.push(e)
      map.set(d, arr)
    }
  }
  return map
}

function detailLine(e: Episode): string {
  return (
    [
      e.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      locationSummary(e.headZones),
      e.triggers.join(', '),
      e.meds.join(', '),
      e.notes,
    ]
      .filter(Boolean)
      .join(' · ') || 'nessun dettaglio'
  )
}

export default function Calendario() {
  const { user } = useAuth()
  const { openLog, openLogForDate } = useShell()
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [earliest, setEarliest] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) return
    getEarliestEpisodeDate(user.uid).then(setEarliest)
  }, [user])

  useEffect(() => {
    if (!user) return
    setSelectedDay(null)
    return subscribeMonthEpisodes(user.uid, year, month, setEpisodes)
  }, [user, year, month])

  const byDay = useMemo(() => episodesByDay(episodes, month), [episodes, month])
  const grid = monthGrid(year, month)
  const stats = monthStats(episodes)
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const years: number[] = []
  if (earliest) {
    for (let y = earliest.getFullYear(); y <= today.getFullYear(); y += 1) years.push(y)
  }

  function goToYear(y: number) {
    setYear(y)
    if (y === today.getFullYear() && month > today.getMonth()) setMonth(today.getMonth())
  }

  const selectedEpisodes = selectedDay ? (byDay.get(selectedDay) ?? []) : []

  return (
    <section className="screen">
      <h1 className="screen-title">Calendario</h1>

      <div className="cal-head">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mese precedente">
          ‹
        </button>
        <b>
          {cap(MONTHS[month])} {year}
        </b>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Mese successivo">
          ›
        </button>
      </div>

      {years.length > 1 && (
        <div className="year-chips">
          {years.map((y) => (
            <button
              type="button"
              key={y}
              className={y === year ? 'is-on' : undefined}
              onClick={() => goToYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="cal-stats">
        <span>
          <b>{stats.headacheDays}</b> giorni con mal di testa
        </span>
        <span>
          <b>{stats.medDays}</b> con farmaco
        </span>
      </div>

      <div className="weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="grid">
        {grid.map((day, i) => {
          if (day === null) return <div key={i} className="day empty" />
          const eps = byDay.get(day) ?? []
          const severities = [
            ...new Set(eps.map((e) => e.severity).filter((s): s is Severity => s !== null)),
          ]
          const marks: Array<Severity | 'none'> =
            severities.length > 0 ? severities : eps.length > 0 ? ['none'] : []
          const hasMed = eps.some((e) => e.meds.length > 0)
          const isToday = isCurrentMonth && day === today.getDate()

          return (
            <button
              key={i}
              type="button"
              className={[
                'day',
                isToday ? 'today' : '',
                day === selectedDay ? 'is-sel' : '',
                eps.length > 0 ? 'has-episode' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedDay(day)}
            >
              <span>{day}</span>
              <span className="marks">
                {marks.map((s, k) => (
                  <i key={k} className={`m-${s}`} />
                ))}
                {hasMed && <i className="m-med" />}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDay !== null && (
        <div className="day-detail">
          <h2>
            {cap(
              new Date(year, month, selectedDay).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
            )}
          </h2>

          {selectedEpisodes.length === 0 ? (
            <p className="d-empty">Nessun episodio in questa data.</p>
          ) : (
            selectedEpisodes.map((e) => (
              <button
                key={e.id}
                type="button"
                className="d-ep"
                onClick={() => openLog(e.id)}
              >
                <span className={`sev-dot sev-${e.severity ?? 'none'}`} aria-hidden="true" />
                <span className="d-ep-main">
                  <b>
                    {e.severity ? SEVERITY_LABEL[e.severity] : 'Episodio'}
                    {e.type ? ` · ${e.type}` : ''}
                  </b>
                  <p>{detailLine(e)}</p>
                </span>
                <span className="chev" aria-hidden="true">
                  ›
                </span>
              </button>
            ))
          )}

          <button
            type="button"
            className="d-add"
            onClick={() => openLogForDate(new Date(year, month, selectedDay))}
          >
            + Aggiungi episodio
          </button>
        </div>
      )}

      <div className="cal-legend">
        <span>
          <i className="m-lieve" /> lieve
        </span>
        <span>
          <i className="m-moderato" /> moderato
        </span>
        <span>
          <i className="m-severo" /> severo
        </span>
        <span>
          <i className="m-med" /> con farmaco
        </span>
      </div>
    </section>
  )
}
