import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useDialog } from '../components/Dialog'
import { deleteQuestionnaire, subscribeQuestionnaires } from '../lib/data'
import type { QKind, QuestionnaireEntry } from '../lib/types'
import { QUESTIONNAIRES } from '../lib/questionnaires'

export default function QuestionarioStorico() {
  const { kind } = useParams<{ kind: string }>()
  const { user } = useAuth()
  const dialog = useDialog()
  const [entries, setEntries] = useState<QuestionnaireEntry[]>([])
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeQuestionnaires(user.uid, setEntries)
  }, [user])

  const def = kind && kind in QUESTIONNAIRES ? QUESTIONNAIRES[kind as QKind] : null
  if (!def) return null

  const mine = entries.filter((e) => e.kind === def.kind)
  const allItems = def.sections.flatMap((s) => s.items)
  const scaleLabel = (v: number | null): string => {
    for (const s of def.sections) {
      const c = s.scale?.find((x) => x.value === v)
      if (c) return c.label
    }
    return v == null ? '—' : String(v)
  }

  async function remove(id: string) {
    const ok = await dialog.confirm({
      message: 'Eliminare questa compilazione?',
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok && user) void deleteQuestionnaire(user.uid, id)
  }

  return (
    <section className="screen">
      <Link to="/questionari" className="back-btn">
        ‹ Questionari
      </Link>
      <h1 className="screen-title">{def.title} — storico</h1>

      {mine.length === 0 && <p className="placeholder">Nessuna compilazione.</p>}

      {mine.map((e) => {
        const score = def.score(e.answers)
        const isOpen = open === e.id
        return (
          <div className="hist-entry" key={e.id}>
            <button
              type="button"
              className="hist-row"
              onClick={() => setOpen(isOpen ? null : e.id)}
            >
              <span>
                <b>{e.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                <span className="hist-score">{score ? score.label : 'incompleto'}</span>
              </span>
              <span className="chev" aria-hidden="true">
                {isOpen ? '▴' : '▾'}
              </span>
            </button>
            {isOpen && (
              <div className="hist-detail">
                {def.gate && (
                  <p>
                    <span>{def.gate.text}</span>{' '}
                    <b>{e.answers[def.gate.id] === 1 ? 'Sì' : 'No'}</b>
                  </p>
                )}
                {allItems.map((item) => (
                  <p key={item.id}>
                    <span>{item.text}</span>{' '}
                    <b>
                      {item.kind === 'number'
                        ? (e.answers[item.id] ?? '—')
                        : scaleLabel(e.answers[item.id] ?? null)}
                    </b>
                  </p>
                ))}
                <div className="hist-actions">
                  <Link
                    to={`/questionari/${def.kind}/stampa/${e.id}`}
                    className="hist-print"
                  >
                    Stampa PDF
                  </Link>
                  <button type="button" className="hist-del" onClick={() => remove(e.id)}>
                    Elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
