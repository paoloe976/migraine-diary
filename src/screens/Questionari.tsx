import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { subscribeQuestionnaires } from '../lib/data'
import type { QKind, QuestionnaireEntry } from '../lib/types'
import { QUESTIONNAIRES } from '../lib/questionnaires'

const ORDER: QKind[] = ['midas', 'hit6', 'headwork']

export default function Questionari() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<QuestionnaireEntry[]>([])

  useEffect(() => {
    if (!user) return
    return subscribeQuestionnaires(user.uid, setEntries)
  }, [user])

  return (
    <section className="screen">
      <Link to="/altro" className="back-btn">
        ‹ Altro
      </Link>
      <h1 className="screen-title">Questionari</h1>
      <p className="screen-sub">
        Quelli che chiede il tuo centro cefalee. Si rispondono a percezione, non contando dal
        diario. I punteggi finiscono nel report.
      </p>

      {ORDER.map((kind) => {
        const def = QUESTIONNAIRES[kind]
        const last = entries.find((e) => e.kind === kind)
        const score = last ? def.score(last.answers) : null
        const hasHistory = entries.some((e) => e.kind === kind)
        return (
          <div className="quest-card" key={kind}>
            <div className="qc-head">
              <b>{def.title}</b>
              <span className={`qc-band${score ? '' : ' none'}`}>
                {score ? score.label : 'mai compilato'}
              </span>
            </div>
            <p className="qc-meta">
              {def.subtitle} · {def.period}
              {last && ` · compilato il ${last.date.toLocaleDateString('it-IT')}`}
            </p>
            <div className="qc-actions">
              <Link to={`/questionari/${kind}`} className="qc-btn primary">
                {last ? 'Compila di nuovo' : 'Compila'}
              </Link>
              {hasHistory && (
                <Link to={`/questionari/${kind}/storico`} className="qc-btn">
                  Storico
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
