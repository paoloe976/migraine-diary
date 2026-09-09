import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  getEarliestEpisodeDate,
  subscribeEpisodesInRange,
  subscribeProphylaxis,
} from '../lib/data'
import type { Episode, Prophylaxis, Severity } from '../lib/types'
import { SEVERITY_LABEL, cap, monthYearLabel, toDateInput } from '../lib/format'
import { MONTHS, WEEKDAYS, monthGrid } from '../lib/calendar'
import { locationSummary } from '../components/HeadMap'

const SEV_RANK: Record<Severity, number> = { lieve: 1, moderato: 2, severo: 3 }

function tally(items: string[]): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function parseInputDate(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

interface MonthData {
  year: number
  month0: number
  headacheDays: number
  medDays: number
  cells: Array<{ day: number | null; sev: Severity | 'none' | null; med: boolean }>
}

function buildMonths(episodes: Episode[], start: Date, end: Date): MonthData[] {
  const out: MonthData[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur < end) {
    const y = cur.getFullYear()
    const m = cur.getMonth()
    const dayInfo = new Map<number, { sev: Severity | null; med: boolean }>()
    for (const e of episodes) {
      if (e.start.getFullYear() !== y || e.start.getMonth() !== m) continue
      const d = e.start.getDate()
      const info = dayInfo.get(d) ?? { sev: null, med: false }
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
        return { day, sev: info ? (info.sev ?? 'none') : null, med: info?.med ?? false }
      }),
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

// --- grafico a linea (spline) ---

function smoothPath(p: Array<[number, number]>): string {
  if (p.length === 0) return ''
  if (p.length === 1) return `M${p[0][0]},${p[0][1]}`
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

function TrendChart({
  months,
  prophylaxis,
}: {
  months: MonthData[]
  prophylaxis: Prophylaxis[]
}) {
  const W = 640
  const H = 210
  const padL = 26
  const padR = 12
  const padT = 14
  const padB = 46
  const n = months.length
  const vals = months.map((m) => m.headacheDays)
  const maxV = Math.max(10, Math.ceil((Math.max(0, ...vals) + 1) / 10) * 10)
  const avg = n ? vals.reduce((s, v) => s + v, 0) / n : 0

  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR))
  const y = (v: number) => H - padB - (v / maxV) * (H - padB - padT)

  const line = smoothPath(months.map((m, i) => [x(i), y(m.headacheDays)]))
  const step = Math.max(1, Math.round(n / 9))
  const ticks = months
    .map((m, i) => ({ m, i }))
    .filter(({ i }) => i % step === 0 || i === n - 1)

  const dateToX = (d: Date) => {
    const idx = months.findIndex(
      (m) => m.year === d.getFullYear() && m.month0 === d.getMonth(),
    )
    if (idx >= 0) return x(idx)
    const first = new Date(months[0]?.year ?? 0, months[0]?.month0 ?? 0)
    return d < first ? x(0) : x(n - 1)
  }
  const bands = prophylaxis
    .filter((p) => p.start && p.drug)
    .map((p) => {
      const a = dateToX(p.start as Date)
      const b = p.end ? dateToX(p.end) : x(n - 1)
      return { p, x1: Math.min(a, b), x2: Math.max(a, b) }
    })
    .filter((b) => b.x2 - b.x1 > 2)

  return (
    <svg className="report-trend" viewBox={`0 0 ${W} ${H}`}>
      {bands.map((b, i) => (
        <g key={b.p.id}>
          <rect
            className="rt-band"
            x={b.x1}
            y={padT}
            width={b.x2 - b.x1}
            height={H - padB - padT}
          />
          <text
            className="rt-band-lbl"
            x={(b.x1 + b.x2) / 2}
            y={padT + 7 + i * 9}
            textAnchor="middle"
          >
            {b.p.drug}
          </text>
        </g>
      ))}
      {[0, maxV / 2, maxV].map((v) => (
        <g key={v}>
          <line className="rb-grid" x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} />
          <text className="rb-lbl" x={padL - 5} y={y(v) + 3} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      <line className="rt-avg" x1={padL} y1={y(avg)} x2={W - padR} y2={y(avg)} />
      <text className="rt-avg-lbl" x={padL + 3} y={y(avg) - 4} textAnchor="start">
        media {avg.toFixed(1)}
      </text>
      <path className="rt-line" d={line} />
      {ticks.map(({ m, i }) => (
        <text
          key={i}
          className="rb-lbl"
          x={x(i)}
          y={H - padB + 14}
          textAnchor="end"
          transform={`rotate(-40 ${x(i)} ${H - padB + 14})`}
        >
          {MONTHS[m.month0].slice(0, 3)} {`'${String(m.year).slice(2)}`}
        </text>
      ))}
    </svg>
  )
}


export default function Stampa() {
  const { user } = useAuth()
  const now = useMemo(() => new Date(), [])

  const [from, setFrom] = useState(
    () => new Date(now.getFullYear(), now.getMonth() - 2, 1),
  )
  const [to, setTo] = useState(() => new Date(now))
  const [earliest, setEarliest] = useState<Date | null>(null)
  const [showCalendar, setShowCalendar] = useState(true)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [prophylaxis, setProphylaxis] = useState<Prophylaxis[]>([])

  const rangeStart = useMemo(
    () => new Date(from.getFullYear(), from.getMonth(), 1),
    [from],
  )
  const rangeEnd = useMemo(() => new Date(to.getFullYear(), to.getMonth() + 1, 1), [to])

  useEffect(() => {
    if (!user) return
    getEarliestEpisodeDate(user.uid).then(setEarliest)
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeProphylaxis(user.uid, setProphylaxis)
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeEpisodesInRange(user.uid, rangeStart, rangeEnd, setEpisodes)
  }, [user, rangeStart, rangeEnd])

  const sorted = useMemo(
    () => [...episodes].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [episodes],
  )
  const months = useMemo(
    () => buildMonths(episodes, rangeStart, rangeEnd),
    [episodes, rangeStart, rangeEnd],
  )
  const monthCount = Math.max(1, months.length)

  const headacheDays = months.reduce((s, m) => s + m.headacheDays, 0)
  const medDays = months.reduce((s, m) => s + m.medDays, 0)
  const overThreshold = months.some((m) => m.medDays >= 10)

  const byType = tally(sorted.map((e) => e.type ?? 'senza tipo'))
  const byMed = tally(sorted.flatMap((e) => e.meds))
  const byZone = tally(sorted.flatMap((e) => e.headZones))
  const byTrigger = tally(sorted.flatMap((e) => e.triggers))

  const fromLabel = rangeStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const toLabel = to.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const genLabel = now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    const prev = document.title
    document.title = `Diario emicrania ${toDateInput(rangeStart)} ${toDateInput(to)}`
    return () => {
      document.title = prev
    }
  }, [rangeStart, to])

  useEffect(() => {
    const root = document.documentElement
    const prevRoot = root.style.background
    const prevBody = document.body.style.background
    root.style.background = '#fff'
    document.body.style.background = '#fff'
    return () => {
      root.style.background = prevRoot
      document.body.style.background = prevBody
    }
  }, [])

  function applyMonths(nMonths: number) {
    setFrom(new Date(now.getFullYear(), now.getMonth() - (nMonths - 1), 1))
    setTo(new Date(now))
  }
  function applyYear() {
    setFrom(new Date(now.getFullYear(), 0, 1))
    setTo(new Date(now))
  }
  function applyAll() {
    if (earliest) setFrom(new Date(earliest))
    setTo(new Date(now))
  }


  return (
    <div className="print-page">
      <div className="report-toolbar">
        <div className="rt-row">
          <Link to="/altro" className="rt-back">
            ‹ Indietro
          </Link>
          <button type="button" className="rt-print" onClick={() => window.print()}>
            Stampa / Salva PDF
          </button>
        </div>
        <div className="rt-row rt-range">
          <label>
            Da
            <input
              type="date"
              value={toDateInput(from)}
              max={toDateInput(to)}
              onChange={(e) => e.target.value && setFrom(parseInputDate(e.target.value))}
            />
          </label>
          <label>
            A
            <input
              type="date"
              value={toDateInput(to)}
              min={toDateInput(from)}
              max={toDateInput(now)}
              onChange={(e) => e.target.value && setTo(parseInputDate(e.target.value))}
            />
          </label>
          <div className="rt-presets">
            <button type="button" onClick={() => applyMonths(3)}>
              3m
            </button>
            <button type="button" onClick={() => applyMonths(6)}>
              6m
            </button>
            <button type="button" onClick={() => applyMonths(12)}>
              12m
            </button>
            <button type="button" onClick={applyYear}>
              {now.getFullYear()}
            </button>
            {earliest && (
              <button type="button" onClick={applyAll}>
                tutto
              </button>
            )}
          </div>
          <label className="rt-check">
            <input
              type="checkbox"
              checked={showCalendar}
              onChange={(e) => setShowCalendar(e.target.checked)}
            />
            Calendario
          </label>
        </div>
      </div>

      <article className="paper">
        <table className="paper-frame">
          <thead>
            <tr>
              <td />
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td />
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
                <header className="paper-head">
                  <div>
                    <h1>Diario dell'emicrania</h1>
                    <p>{user?.email ?? user?.name}</p>
                  </div>
                  <p className="paper-period">
                    {cap(fromLabel)} – {toLabel}
                    <br />
                    <span>generato il {genLabel}</span>
                  </p>
                </header>

                <section className="report-kpis">
                  <div>
                    <b>{headacheDays}</b>
                    <span>giorni con mal di testa</span>
                    <i>~{(headacheDays / monthCount).toFixed(1)}/mese</i>
                  </div>
                  <div className={overThreshold ? 'kpi-warn' : undefined}>
                    <b>{medDays}</b>
                    <span>giorni con sintomatico</span>
                    <i>~{(medDays / monthCount).toFixed(1)}/mese</i>
                  </div>
                  <div>
                    <b>{sorted.length}</b>
                    <span>episodi registrati</span>
                  </div>
                </section>
                {overThreshold && (
                  <p className="report-flag">
                    In almeno un mese i giorni con sintomatico raggiungono la soglia
                    indicativa di 10 (rischio cefalea da uso eccessivo di farmaci).
                  </p>
                )}

                <section className="report-section">
                  <h2>Andamento</h2>
                  <TrendChart months={months} prophylaxis={prophylaxis} />
                  <p className="report-cap">
                    giorni con mal di testa per mese · linea tratteggiata = media del periodo
                    {prophylaxis.some((p) => p.start && p.drug) &&
                      ' · fasce = periodi di profilassi'}
                  </p>
                </section>

                {prophylaxis.length > 0 && (
                  <section className="report-section report-tallies">
                    <div>
                      <h3>Profilassi</h3>
                      <p>
                        {[...prophylaxis]
                          .sort(
                            (a, b) =>
                              (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0),
                          )
                          .map((p) => {
                            const when = p.start
                              ? `dal ${monthYearLabel(p.start)}${p.end ? ` al ${monthYearLabel(p.end)}` : ''}`
                              : ''
                            return `${p.drug || 'senza nome'} (${p.cadence}${when ? `, ${when}` : ''})`
                          })
                          .join(' · ')}
                      </p>
                    </div>
                  </section>
                )}

                {showCalendar && (
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
                      pallino pieno = intensità (verde lieve, ambra moderata, rosso severa) ·
                      cerchio = giorno con farmaco
                    </p>
                  </section>
                )}

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
                          <td>
                            {e.start.toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </td>
                          <td>
                            {e.start.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td>{e.type ?? '—'}</td>
                          <td>{e.severity ? SEVERITY_LABEL[e.severity] : '—'}</td>
                          <td>{locationSummary(e.headZones) || '—'}</td>
                          <td>{e.meds.join(', ') || '—'}</td>
                          <td>{e.disability ? cap(e.disability) : '—'}</td>
                          <td>
                            {[e.triggers.join(', '), e.notes].filter(Boolean).join(' — ') || ''}
                          </td>
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
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  )
}
