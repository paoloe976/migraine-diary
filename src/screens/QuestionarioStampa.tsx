import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { subscribeQuestionnaires } from '../lib/data'
import type { QKind, QuestionnaireEntry } from '../lib/types'
import { QUESTIONNAIRES } from '../lib/questionnaires'
import { toDateInput } from '../lib/format'

export default function QuestionarioStampa() {
  const { kind, id } = useParams<{ kind: string; id: string }>()
  const { user } = useAuth()
  const [entries, setEntries] = useState<QuestionnaireEntry[]>([])

  useEffect(() => {
    if (!user) return
    return subscribeQuestionnaires(user.uid, setEntries)
  }, [user])

  const def = kind && kind in QUESTIONNAIRES ? QUESTIONNAIRES[kind as QKind] : null
  const entry = entries.find((e) => e.id === id)

  useEffect(() => {
    const root = document.documentElement
    const prevRoot = root.style.background
    const prevBody = document.body.style.background
    const prevTitle = document.title
    root.style.background = '#fff'
    document.body.style.background = '#fff'
    if (def && entry) {
      document.title = `Questionario ${def.title} ${toDateInput(entry.date)}`
    }
    return () => {
      root.style.background = prevRoot
      document.body.style.background = prevBody
      document.title = prevTitle
    }
  }, [def, entry])

  if (!def) return null

  const score = entry ? def.score(entry.answers) : null
  const dateLabel = entry
    ? entry.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="print-page">
      <div className="report-toolbar">
        <div className="rt-row">
          <Link to={`/questionari/${kind}/storico`} className="rt-back">
            ‹ Storico
          </Link>
          <button type="button" className="rt-print" onClick={() => window.print()}>
            Stampa / Salva PDF
          </button>
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
                {!entry ? (
                  <p>Compilazione non trovata.</p>
                ) : (
                  <>
                    <header className="paper-head">
                      <div>
                        <h1>Questionario {def.title}</h1>
                        <p>
                          {def.subtitle} — {def.period}
                        </p>
                      </div>
                      <p className="paper-period">
                        {user?.email ?? user?.name}
                        <br />
                        <span>compilato il {dateLabel}</span>
                      </p>
                    </header>

                    <p className="q-print-score">
                      <b>Punteggio:</b> {score ? score.label : 'incompleto'}
                    </p>

                    {def.gate && (
                      <p className="q-print-gate">
                        <b>{def.gate.text}</b>{' '}
                        {entry.answers[def.gate.id] === 1 ? 'Sì' : 'No'}
                      </p>
                    )}

                    {(!def.gate || entry.answers[def.gate.id] === 1) &&
                      def.sections.map((section, si) => (
                        <section className="q-print-section" key={si}>
                          {section.title && <h2>{section.title}</h2>}
                          {section.items.map((item) => {
                            const val = item.id in entry.answers ? entry.answers[item.id] : undefined
                            return (
                              <div className="q-print-item" key={item.id}>
                                <p className="q-print-text">
                                  {item.text}
                                  {item.note && <i> — {item.note}</i>}
                                </p>
                                {item.kind === 'number' ? (
                                  <p className="q-print-ans">
                                    {typeof val === 'number' ? val : '—'}{' '}
                                    {item.max === 10 ? '/ 10' : 'giorni'}
                                  </p>
                                ) : (
                                  <div className="q-print-opts">
                                    {(section.scale ?? []).map((c) => {
                                      const on = item.id in entry.answers && val === c.value
                                      return (
                                        <span
                                          key={c.label}
                                          className={on ? 'on' : undefined}
                                        >
                                          {on ? '●' : '○'} {c.label}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </section>
                      ))}

                    <footer className="paper-foot">
                      Compilato dal paziente a percezione. Non è un dispositivo medico.
                    </footer>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  )
}
