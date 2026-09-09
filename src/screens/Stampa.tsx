import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { subscribeEpisodesInRange } from '../lib/data'
import type { Episode, Severity } from '../lib/types'
import { SEVERITY_LABEL, cap } from '../lib/format'
import { MONTHS, WEEKDAYS, monthGrid } from '../lib/calendar'
import { locationSummary } from '../components/HeadMap'

const PERIODS = [3, 6, 12] as const
const SEV_RANK: Record<Severity, number> = { lieve: 1, moderato: 2, severo: 3 }

function tally(items: string[]): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

interface MonthData {
  year: number
  month0: number
  headacheDays: number
  medDays: number
  cells: Array<{ day: number | null; sev: Severity | 'none' | null; med: boolean }>
}

function buildMonths(episodes: Episode[], from: Date, to: Date): MonthData[] {
  const out: MonthData[] = []
  const cur = new Date(from)
  while (cur < to) {
    const y = cur.getFullYear()
    const m = cur.getMonth()
    const dayInfo = new Map<number, { sev: Severity | null; med: boolean; any: boolean }>()
    for (const e of episodes) {
      if (e.start.getFullYear() !== y || e.start.getMonth() !== m) continue
      const d = e.start.getDate()
      const info = dayInfo.get(d) ?? { sev: null, med: false, any: false }
      info.any = true
      if (e.meds.length > 0) info.med = true
      if (e.severity && (!info.sev || SEV_RANK[e.severity] > SEV_RANK[info.sev])) {
        info.sev = e.severity
      }
      dayInfo.set(d, info)
    }
    out.push({
      year: y,
      month0: m,
      headacheDays: dayInfo.size,
      medDays: [...dayInfo.values()].filter((i) => i.med).length,
      cells: monthGrid(y, m).map((day) => {
        if (day === null) return { day: null, sev: null, med: false }
        const info = dayInfo.get(day)
        return {
          day,
          sev: info ? (info.sev ?? 'none') : null,
          med: info?.med ?? false,
        }
      }),
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

export default function Stampa() {
  const { user } = useAuth()
  const now = useMemo(() => new Date(), [])
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(3)
  const [episodes, setEpisodes] = useState<Episode[]>([])

  const from = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - (period - 1), 1),
    [now, period],
  )
  const to = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 1), [now])

  useEffect(() => {
    if (!user) return
    return subscribeEpisodesInRange(user.uid, from, to, setEpisodes)
  }, [user, from, to])

  const sorted = useMemo(
    () => [...episodes].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [episodes],
  )
  const months = useMemo(() => buildMonths(episodes, from, to), [episodes, from, to])

  const headacheDays = months.reduce((s, m) => s + m.headacheDays, 0)
  const medDays = months.reduce((s, m) => s + m.medDays, 0)
  const overThreshold = months.some((m) => m.medDays >= 10)

  const byType = tally(sorted.map((e) => e.type ?? 'senza tipo'))
  const byMed = tally(sorted.flatMap((e) => e.meds))
  const byZone = tally(sorted.flatMap((e) => e.headZones))
  const byTrigger = tally(sorted.flatMap((e) => e.triggers))

  const fromLabel = from.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const toLabel = now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const maxBar = Math.max(
    5,
    Math.ceil(Math.max(...months.map((m) => m.headacheDays)) * 1.25),
  )

  // nome file del PDF (il browser usa document.title)
  useEffect(() => {
    const prev = document.title
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    document.title = `Diario emicrania ${stamp} - ${period} mesi`
    return () => {
      document.title = prev
    }
  }, [period, now])

  return (
    <div className="print-page">
      <div className="report-toolbar">
        <Link to="/altro" className="rt-back">
          ‹ Indietro
        </Link>
        <div className="rt-periods">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={p === period ? 'is-on' : undefined}
              onClick={() => setPeriod(p)}
            >
              {p} mesi
            </button>
          ))}
        </div>
        <button type="button" className="rt-print" onClick={() => window.print()}>
          Stampa / Salva PDF
        </button>
      </div>

      <article className="paper">
        <header className="paper-head">
          <div>
            <h1>Diario dell'emicrania</h1>
            <p>{user?.email ?? user?.name}</p>
          </div>
          <p className="paper-period">
            {fromLabel} – {toLabel}
            <br />
            <span>generato il {toLabel}</span>
          </p>
        </header>

        <section className="report-kpis">
          <div>
            <b>{headacheDays}</b>
            <span>giorni con mal di testa</span>
            <i>~{(headacheDays / period).toFixed(1)}/mese</i>
          </div>
          <div className={overThreshold ? 'kpi-warn' : undefined}>
            <b>{medDays}</b>
            <span>giorni con sintomatico</span>
            <i>~{(medDays / period).toFixed(1)}/mese</i>
          </div>
          <div>
            <b>{sorted.length}</b>
            <span>episodi registrati</span>
          </div>
        </section>
        {overThreshold && (
          <p className="report-flag">
            In almeno un mese i giorni con sintomatico raggiungono la soglia indicativa
            di 10 (rischio cefalea da uso eccessivo di farmaci).
          </p>
        )}

        <section className="report-section">
          <h2>Andamento mensile</h2>
          <svg className="report-bars" viewBox="0 0 300 82">
            <line x1="20" y1="62" x2="298" y2="62" className="rb-axis" />
            <line x1="20" y1="34" x2="298" y2="34" className="rb-grid" />
            <text x="16" y="65" textAnchor="end" className="rb-lbl">
              0
            </text>
            <text x="16" y="37" textAnchor="end" className="rb-lbl">
              {maxBar / 2}
            </text>
            {months.map((m, i) => {
              const slotW = 278 / months.length
              const barW = Math.min(24, slotW * 0.55)
              const cx = 20 + slotW * i + slotW / 2
              const h = (m.headacheDays / maxBar) * 56
              return (
                <g key={`${m.year}-${m.month0}`}>
                  <rect
                    x={cx - barW / 2}
                    y={62 - h}
                    width={barW}
                    height={Math.max(h, m.headacheDays > 0 ? 1.5 : 0)}
                    rx={1.5}
                    className="rb-bar"
                  />
                  {m.headacheDays > 0 && (
                    <text x={cx} y={58 - h} textAnchor="middle" className="rb-val">
                      {m.headacheDays}
                    </text>
                  )}
                  <text x={cx} y={76} textAnchor="middle" className="rb-lbl">
                    {MONTHS[m.month0].slice(0, 3)}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="report-cap">giorni con mal di testa per mese</p>
        </section>

        <section className="report-section report-calendars">
          <h2>Calendario</h2>
          <div className="cal-months">
            {months.map((m) => (
              <div className="rc-month" key={`${m.year}-${m.month0}`}>
                <h3>
                  {cap(MONTHS[m.month0])} {m.year}
                </h3>
                <div className="rc-grid rc-week">
                  {WEEKDAYS.map((w, i) => (
                    <span key={i} className="rc-wd">
                      {w}
                    </span>
                  ))}
                </div>
                <div className="rc-grid">
                  {m.cells.map((c, i) => (
                    <span
                      key={i}
                      className={`rc-day${c.day === null ? ' rc-empty' : ''}${c.sev ? ` sev-${c.sev}` : ''}${c.med ? ' rc-med' : ''}`}
                    >
                      {c.day}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="report-cap">
            pallino pieno = intensità (verde lieve, ambra moderata, rosso severa) · cerchio = giorno con farmaco
          </p>
        </section>

        {(byType.length > 0 || byZone.length > 0 || byTrigger.length > 0) && (
          <section className="report-section report-tallies">
            {byType.length > 0 && (
              <div>
                <h3>Tipi</h3>
                <p>{byType.map(([n, c]) => `${n} (${c})`).join(' · ')}</p>
              </div>
            )}
            {byMed.length > 0 && (
              <div>
                <h3>Farmaci</h3>
                <p>{byMed.map(([n, c]) => `${n} (${c})`).join(' · ')}</p>
              </div>
            )}
            {byZone.length > 0 && (
              <div>
                <h3>Sedi ricorrenti</h3>
                <p>{byZone.map(([n, c]) => `${n} (${c})`).join(' · ')}</p>
              </div>
            )}
            {byTrigger.length > 0 && (
              <div>
                <h3>Possibili scatenanti</h3>
                <p>{byTrigger.map(([n, c]) => `${n} (${c})`).join(' · ')}</p>
              </div>
            )}
          </section>
        )}

        <section className="report-section">
          <h2>Dettaglio episodi</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ora</th>
                <th>Tipo</th>
                <th>Intensità</th>
                <th>Sede</th>
                <th>Farmaco</th>
                <th>Disab.</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td>{e.start.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</td>
                  <td>{e.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{e.type ?? '—'}</td>
                  <td>{e.severity ? SEVERITY_LABEL[e.severity] : '—'}</td>
                  <td>{locationSummary(e.headZones) || '—'}</td>
                  <td>{e.meds.join(', ') || '—'}</td>
                  <td>{e.disability ? cap(e.disability) : '—'}</td>
                  <td>{[e.triggers.join(', '), e.notes].filter(Boolean).join(' — ') || ''}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="report-empty">
                    Nessun episodio nel periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <footer className="paper-foot">
          Dati inseriti dal paziente. Non è un dispositivo medico.
        </footer>
      </article>
    </div>
  )
}
