import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { getEarliestEpisodeDate, subscribeEpisodesInRange } from '../lib/data'
import type { Episode } from '../lib/types'
import { cap } from '../lib/format'
import { MONTHS } from '../lib/calendar'

const WINDOW_OPTIONS = [6, 12, 24]
/** Soglia indicativa per la cefalea da uso eccessivo di farmaci (triptani). */
const MED_THRESHOLD = 10
const METER_MAX = 15

interface MonthBucket {
  key: string
  year: number
  month0: number
  label: string
  isCurrent: boolean
  headacheDays: number
  medDays: number
  byType: Array<[string, number]>
  byMed: Array<[string, number]>
}

const keyOf = (y: number, m: number) => `${y}-${m}`
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** monthDelta({y,m}, n) -> mese spostato di n */
function shift(y: number, m: number, n: number): { y: number; m: number } {
  const d = new Date(y, m + n, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
}

function buildBuckets(
  episodes: Episode[],
  endY: number,
  endM: number,
  now: Date,
  window: number,
): MonthBucket[] {
  const slots = Array.from({ length: window }, (_, i) => {
    const { y, m } = shift(endY, endM, -(window - 1 - i))
    return {
      key: keyOf(y, m),
      year: y,
      month0: m,
      label: MONTHS[m].slice(0, 3),
      isCurrent: y === now.getFullYear() && m === now.getMonth(),
      days: new Set<string>(),
      medDays: new Set<string>(),
      types: new Map<string, number>(),
      meds: new Map<string, number>(),
    }
  })
  const idx = new Map(slots.map((s, i) => [s.key, i]))

  for (const e of episodes) {
    const i = idx.get(keyOf(e.start.getFullYear(), e.start.getMonth()))
    if (i === undefined) continue
    const s = slots[i]
    s.days.add(dayKey(e.start))
    s.types.set(e.type ?? 'senza tipo', (s.types.get(e.type ?? 'senza tipo') ?? 0) + 1)
    if (e.meds.length > 0) {
      s.medDays.add(dayKey(e.start))
      for (const med of e.meds) s.meds.set(med, (s.meds.get(med) ?? 0) + 1)
    } else {
      s.meds.set('nessun farmaco', (s.meds.get('nessun farmaco') ?? 0) + 1)
    }
  }

  return slots.map((s) => ({
    key: s.key,
    year: s.year,
    month0: s.month0,
    label: s.label,
    isCurrent: s.isCurrent,
    headacheDays: s.days.size,
    medDays: s.medDays.size,
    byType: [...s.types.entries()].sort((a, b) => b[1] - a[1]),
    byMed: [...s.meds.entries()].sort((a, b) => b[1] - a[1]),
  }))
}

const niceMax = (v: number) => Math.max(4, Math.ceil(v / 2) * 2)

export default function Andamento() {
  const { user } = useAuth()
  const now = useMemo(() => new Date(), [])

  const [end, setEnd] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [win, setWin] = useState(6)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [earliest, setEarliest] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) return
    getEarliestEpisodeDate(user.uid).then(setEarliest)
  }, [user])

  useEffect(() => {
    if (!user) return
    const start = shift(end.y, end.m, -(win - 1))
    const from = new Date(start.y, start.m, 1)
    const to = new Date(end.y, end.m + 1, 1)
    return subscribeEpisodesInRange(user.uid, from, to, setEpisodes)
  }, [user, end, win])

  const buckets = useMemo(
    () => buildBuckets(episodes, end.y, end.m, now, win),
    [episodes, end, now, win],
  )

  // selezione: mantiene il mese scelto se ancora in finestra, altrimenti l'ultimo
  useEffect(() => {
    setSelectedKey((prev) => {
      if (prev && buckets.some((b) => b.key === prev)) return prev
      const cur = buckets.find((b) => b.isCurrent)
      return (cur ?? buckets[buckets.length - 1]).key
    })
  }, [buckets])

  const selected = buckets.find((b) => b.key === selectedKey) ?? buckets[buckets.length - 1]
  const max = niceMax(Math.max(...buckets.map((b) => b.headacheDays)))

  const asMonths = (y: number, m: number) => y * 12 + m
  const prevEnd = shift(end.y, end.m, -1)
  const canGoBack =
    !earliest ||
    asMonths(prevEnd.y, prevEnd.m) >= asMonths(earliest.getFullYear(), earliest.getMonth())
  const canGoFwd = asMonths(end.y, end.m) < asMonths(now.getFullYear(), now.getMonth())

  const years: number[] = []
  if (earliest) {
    for (let y = earliest.getFullYear(); y <= now.getFullYear(); y += 1) years.push(y)
  }

  function goToYear(y: number) {
    setEnd(y === now.getFullYear() ? { y, m: now.getMonth() } : { y, m: 11 })
  }

  // geometria grafico
  const W = 300
  const H = 150
  const padL = 26
  const padB = 26
  const padT = 12
  const baseline = H - padB
  const slot = (W - padL) / win
  const barW = Math.min(24, slot * 0.62)
  const labelEvery = win <= 6 ? 1 : win <= 12 ? 2 : 3
  const showValues = win <= 12
  const last = buckets[buckets.length - 1]
  const first = buckets[0]

  const rangeLabel = `${first.label} ${first.year !== last.year ? first.year : ''} – ${last.label} ${last.year}`.replace('  ', ' ')

  const level =
    selected.medDays >= MED_THRESHOLD
      ? 'alto'
      : selected.medDays >= MED_THRESHOLD - 3
        ? 'medio'
        : 'ok'
  const meterNote =
    level === 'alto'
      ? `${selected.medDays} giorni. Sopra la soglia indicativa.`
      : level === 'medio'
        ? `${selected.medDays} giorni. Vicino alla soglia di ${MED_THRESHOLD}.`
        : `${selected.medDays} giorni. Sotto la soglia di attenzione.`

  const hasAny = earliest !== null

  return (
    <section className="screen">
      <h1 className="screen-title">Andamento</h1>

      {!hasAny ? (
        <p className="placeholder">
          Registra qualche episodio e qui vedrai i tuoi numeri nel tempo.
        </p>
      ) : (
        <>
          <div className="trend-nav">
            <button
              type="button"
              onClick={() => setEnd(shift(end.y, end.m, -1))}
              disabled={!canGoBack}
              aria-label="Periodo precedente"
            >
              ‹
            </button>
            <b>{rangeLabel}</b>
            <button
              type="button"
              onClick={() => setEnd(shift(end.y, end.m, 1))}
              disabled={!canGoFwd}
              aria-label="Periodo successivo"
            >
              ›
            </button>
          </div>

          {years.length > 1 && (
            <div className="year-chips">
              {years.map((y) => (
                <button
                  type="button"
                  key={y}
                  className={buckets.some((b) => b.year === y) ? 'is-on' : undefined}
                  onClick={() => goToYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="chart-card">
            <h2>Giorni con mal di testa al mese</h2>
            <p className="chart-cap">tocca un mese per cambiare il dettaglio</p>
            <svg
              className="bar-chart"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={buckets.map((b) => `${b.label} ${b.headacheDays}`).join(', ')}
            >
              {[0, max / 2, max].map((v) => {
                const y = baseline - (v / max) * (baseline - padT)
                return (
                  <g key={v}>
                    <line className="grid" x1={padL} y1={y} x2={W} y2={y} />
                    <text className="axis" x={padL - 6} y={y + 3} textAnchor="end">
                      {v}
                    </text>
                  </g>
                )
              })}
              {buckets.map((b, i) => {
                const cx = padL + slot * i + slot / 2
                const h = (b.headacheDays / max) * (baseline - padT)
                const y = baseline - h
                const on = b.key === selectedKey
                return (
                  <g
                    key={b.key}
                    className="bar-slot"
                    onClick={() => setSelectedKey(b.key)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.label}: ${b.headacheDays} giorni`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedKey(b.key)
                      }
                    }}
                  >
                    <rect
                      x={cx - slot / 2}
                      y={padT}
                      width={slot}
                      height={baseline - padT + 4}
                      fill="transparent"
                    />
                    <rect
                      className={`bar${on ? ' is-on' : ''}${b.isCurrent ? ' is-current' : ''}`}
                      x={cx - barW / 2}
                      y={b.headacheDays > 0 ? y : baseline - 2}
                      width={barW}
                      height={b.headacheDays > 0 ? h : 2}
                      rx={Math.min(3, barW / 3)}
                    />
                    {b.headacheDays > 0 && (showValues || on) && (
                      <text className="bar-value" x={cx} y={y - 5} textAnchor="middle">
                        {b.headacheDays}
                      </text>
                    )}
                    {(buckets.length - 1 - i) % labelEvery === 0 && (
                      <text className="axis" x={cx} y={H - 9} textAnchor="middle">
                        {b.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            <div className="drill">
              <h3>
                {cap(MONTHS[selected.month0])} {selected.year} · {selected.headacheDays} giorni
                con mal di testa
              </h3>
              {selected.headacheDays === 0 ? (
                <p className="chart-cap">nessun episodio in questo mese</p>
              ) : (
                <div className="drill-cols">
                  <DrillList title="per tipo" rows={selected.byType} />
                  <DrillList title="per farmaco" rows={selected.byMed} />
                </div>
              )}
            </div>

            <div className="win-chips">
              <span className="win-label">Mesi da visualizzare</span>
              <div className="win-opts">
                {WINDOW_OPTIONS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={win === n ? 'is-on' : undefined}
                    onClick={() => setWin(n)}
                  >
                    {n} mesi
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h2>
              Giorni con sintomatico · {cap(MONTHS[selected.month0])} {selected.year}
            </h2>
            <p className="chart-cap">triptani e antinfiammatori presi</p>
            <div className="meter">
              <div className="meter-track">
                <div
                  className="meter-fill"
                  data-level={level}
                  style={{
                    width: `${Math.min(100, (selected.medDays / METER_MAX) * 100)}%`,
                  }}
                />
                <div
                  className="meter-mark"
                  style={{ left: `${(MED_THRESHOLD / METER_MAX) * 100}%` }}
                />
              </div>
              <div className="meter-scale">
                <span>0</span>
                <span>soglia {MED_THRESHOLD}</span>
                <span>{METER_MAX}</span>
              </div>
            </div>
            <p className="meter-note">{meterNote}</p>
          </div>
        </>
      )}
    </section>
  )
}

function DrillList({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const max = Math.max(...rows.map((r) => r[1]), 1)
  return (
    <div className="drill-list">
      <span className="drill-h">{title}</span>
      <ul>
        {rows.map(([name, n]) => (
          <li key={name}>
            <span className="drill-bar" style={{ width: `${(n / max) * 100}%` }} />
            <span className="drill-name">{name}</span>
            <b>{n}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
