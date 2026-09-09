import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { saveQuestionnaire } from '../lib/data'
import type { QKind } from '../lib/types'
import { QUESTIONNAIRES, scoredItemIds, type QItem, type QSection } from '../lib/questionnaires'

type Answers = Record<string, number | null>

export default function QuestionarioForm() {
  const { kind } = useParams<{ kind: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<Answers>({})

  const def = kind && kind in QUESTIONNAIRES ? QUESTIONNAIRES[kind as QKind] : null
  if (!def) {
    return (
      <section className="screen">
        <Link to="/questionari" className="back-btn">
          ‹ Questionari
        </Link>
        <p className="placeholder">Questionario non trovato.</p>
      </section>
    )
  }

  const notWorking = def.gate && answers[def.gate.id] === 0
  const showSections = !def.gate || answers[def.gate.id] === 1

  function set(id: string, value: number | null) {
    setAnswers((a) => ({ ...a, [id]: value }))
  }
  function setNum(id: string, raw: string, max = 99) {
    setAnswers((a) => {
      if (raw.trim() === '') {
        const next = { ...a }
        delete next[id]
        return next
      }
      return { ...a, [id]: Math.max(0, Math.min(max, Math.round(Number(raw) || 0))) }
    })
  }

  const gateAnswered = !def.gate || answers[def.gate.id] != null
  const sectionsComplete =
    notWorking || scoredItemIds(def).every((id) => id in answers)
  const complete = gateAnswered && sectionsComplete

  function submit() {
    if (!user || !complete) return
    saveQuestionnaire(user.uid, def!.kind, answers)
    navigate('/questionari')
  }

  const preview = def.score(answers)

  return (
    <section className="screen q-form">
      <Link to="/questionari" className="back-btn">
        ‹ Questionari
      </Link>
      <h1 className="screen-title">{def.title}</h1>
      <p className="screen-sub">
        {def.subtitle} · {def.period}
      </p>
      <p className="q-intro">{def.intro}</p>

      {def.gate && (
        <div className="q-item">
          <p className="q-text">{def.gate.text}</p>
          <div className="q-opts q-opts-inline">
            <button
              type="button"
              className={`q-opt${answers[def.gate.id] === 1 ? ' is-on' : ''}`}
              onClick={() => set(def!.gate!.id, 1)}
            >
              Sì
            </button>
            <button
              type="button"
              className={`q-opt${answers[def.gate.id] === 0 ? ' is-on' : ''}`}
              onClick={() => set(def!.gate!.id, 0)}
            >
              No
            </button>
          </div>
        </div>
      )}

      {notWorking && (
        <p className="q-gate-end">
          Il questionario si ferma qui: riguarda le difficoltà sul lavoro.
        </p>
      )}

      {showSections &&
        def.sections.map((section, si) => (
          <Section key={si} section={section} answers={answers} onSet={set} onSetNum={setNum} />
        ))}

      {preview && (
        <p className="q-preview">
          Punteggio: <b>{preview.label}</b>
        </p>
      )}

      <button type="button" className="btn-done q-submit" disabled={!complete} onClick={submit}>
        Salva
      </button>
    </section>
  )
}

function Section({
  section,
  answers,
  onSet,
  onSetNum,
}: {
  section: QSection
  answers: Answers
  onSet: (id: string, v: number | null) => void
  onSetNum: (id: string, raw: string, max?: number) => void
}) {
  return (
    <div className="q-section">
      {section.title && <h2 className="q-section-title">{section.title}</h2>}
      {section.items.map((item) => (
        <QItemRow
          key={item.id}
          item={item}
          scale={section.scale}
          value={item.id in answers ? answers[item.id] : undefined}
          answered={item.id in answers}
          onSet={onSet}
          onSetNum={onSetNum}
        />
      ))}
    </div>
  )
}

function QItemRow({
  item,
  scale,
  value,
  answered,
  onSet,
  onSetNum,
}: {
  item: QItem
  scale?: QSection['scale']
  value: number | null | undefined
  answered: boolean
  onSet: (id: string, v: number | null) => void
  onSetNum: (id: string, raw: string, max?: number) => void
}) {
  return (
    <div className="q-item">
      <p className="q-text">{item.text}</p>
      {item.note && <p className="q-note">{item.note}</p>}

      {item.kind === 'number' ? (
        <div className="q-num-row">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={item.max ?? 99}
            className="q-num"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onSetNum(item.id, e.target.value, item.max)}
          />
          <span>{item.max === 10 ? '/ 10' : 'giorni'}</span>
        </div>
      ) : (
        <div className="q-opts">
          {(scale ?? []).map((choice) => (
            <button
              key={choice.label}
              type="button"
              className={`q-opt${answered && value === choice.value ? ' is-on' : ''}`}
              onClick={() => onSet(item.id, choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
