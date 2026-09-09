import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { subscribeEpisodesSince } from '../lib/data'
import type { Episode } from '../lib/types'
import { cap } from '../lib/format'

const MONTHS_BACK = 6
/** Soglia indicativa per la cefalea da uso eccessivo di farmaci (triptani). */
const MED_THRESHOLD = 10
const METER_MAX = 15

interface MonthBucket {
  key: string
  label: string
  isCurrent: boolean
  headacheDays: number
  medDays: number
  byType: Array<[string, number]>
  byMed: Array<[string, number]>
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function buildBuckets(episodes: Episode[], now: Date): MonthBucket[] {
  const months = Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - i), 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
      isCurrent: d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(),
      days: new Set<string>(),
      medDays: new Set<string>(),
      types: new Map<string, number>(),
      meds: new Map<string, number>(),
    }
  })
  const idx = new Map(months.map((m, i) => [m.key, i]))

  for (const e of episodes) {
    const i = idx.get(`${e.start.getFullYear()}-${e.start.getMonth()}`)
    if (i === undefined) continue
    const m = months[i]
    m.days.add(dayKey(e.start))
    const t = e.type ?? 'senza tipo'
    m.types.set(t, (m.types.get(t) ?? 0) + 1)
    if (e.meds.length > 0) {
      m.medDays.add(dayKey(e.start))
      for (const med of e.meds) m.meds.set(med, (m.meds.get(med) ?? 0) + 1)
    } else {
      m.meds.set('nessun farmaco', (m.meds.get('nessun farmaco') ?? 0) + 1)
    }
  }

  return months.map((m) => ({
    key: m.key,
    label: m.label,
    isCurrent: m.isCurrent,
    headacheDays: m.days.size,
    medDays: m.medDays.size,
    byType: [...m.types.entries()].sort((a, b) => b[1] - a[1]),
    byMed: [...m.meds.entries()].sort((a, b) => b[1] - a[1]),
  }))
}

function niceMax(v: number): number {
  return Math.max(4, Math.ceil(v / 2) * 2)
}

export default function Andamento() {
  const { user } = useAuth()
  const now = useMemo(() => new Date(), [])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const since = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1)
    return subscribeEpisodesSince(user.uid, since, setEpisodes)
  }, [user, now])

  const buckets = useMemo(() => buildBuckets(episodes, now), [episodes, now])
  const current = buckets[buckets.length - 1]
  const hasData = episodes.length > 0
  const max = niceMax(Math.max(...buckets.map((b) => b.headacheDays)))
  const drill = selected ? buckets.find((b) => b.key === selected) : null

  // geometria grafico a barre
  const W = 300
  const H = 150
  const padL = 26
  const padB = 26
  const padT = 12
  const baseline = H - padB
  const slot = (W - padL) / MONTHS_BACK
  const barW = Math.min(24, slot * 0.5)

  const meterLevel =
    current.medDays >= MED_THRESHOLD ? 'alto' : current.medDays >= MED_THRESHOLD - 3 ? 'medio' : 'ok'
  const meterNote =
    meterLevel === 'alto'
      ? `${current.medDays} giorni. Sopra la soglia indicativa — vale la pena parlarne col neurologo.`
      : meterLevel === 'medio'
        ? `${current.medDays} giorni. Ti stai avvicinando alla soglia di ${MED_THRESHOLD}.`
        : `${current.medDays} giorni. Sotto la soglia di attenzione.`

  return (
    <section className="screen">
      <h1 className="screen-title">Andamento</h1>
      <p className="screen-sub">ultimi {MONTHS_BACK} mesi</p>

      {!hasData ? (
        <p className="placeholder">
          Registra qualche episodio e qui vedrai i tuoi numeri nel tempo.
        </p>
      ) : (
        <>
          <div className="chart-card">
            <h2>Giorni con mal di testa al mese</h2>
            <p className="chart-cap">tocca un mese per il dettaglio</p>
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
                const on = b.key === selected
                return (
                  <g
                    key={b.key}
                    className="bar-slot"
                    onClick={() => setSelected(on ? null : b.key)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.label}: ${b.headacheDays} giorni`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(on ? null : b.key)
                      }
                    }}
                  >
                    <rect x={cx - slot / 2} y={padT} width={slot} height={baseline - padT + 4} fill="transparent" />
                    <rect
                      className={`bar${on ? ' is-on' : ''}${b.isCurrent ? ' is-current' : ''}`}
                      x={cx - barW / 2}
                      y={b.headacheDays > 0 ? y : baseline - 2}
                      width={barW}
                      height={b.headacheDays > 0 ? h : 2}
                      rx={3}
                    />
                    {b.headacheDays > 0 && (
                      <text className="bar-value" x={cx} y={y - 5} textAnchor="middle">
                        {b.headacheDays}
                      </text>
                    )}
                    <text className="axis" x={cx} y={H - 9} textAnchor="middle">
                      {b.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            {drill && (
              <div className="drill">
                <h3>
                  {cap(drill.label)} · {drill.headacheDays} giorni con mal di testa
                </h3>
                <div className="drill-cols">
                  <DrillList title="per tipo" rows={drill.byType} />
                  <DrillList title="per farmaco" rows={drill.byMed} />
                </div>
              </div>
            )}
          </div>

          <div className="chart-card">
            <h2>Giorni con sintomatico · {cap(current.label)}</h2>
            <p className="chart-cap">triptani e antinfiammatori presi</p>
            <div className="meter">
              <div className="meter-track">
                <div
                  className="meter-fill"
                  data-level={meterLevel}
                  style={{ width: `${Math.min(100, (current.medDays / METER_MAX) * 100)}%` }}
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
