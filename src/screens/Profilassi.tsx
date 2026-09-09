import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useDialog } from '../components/Dialog'
import {
  createProphylaxis,
  deleteProphylaxis,
  subscribeProphylaxis,
  updateProphylaxis,
} from '../lib/data'
import type { Cadence, Prophylaxis } from '../lib/types'
import { fromMonthInput, monthYearLabel, toMonthInput } from '../lib/format'

const CADENCES: Array<[Cadence, string]> = [
  ['giornaliera', 'Giornaliera'],
  ['settimanale', 'Settimanale'],
  ['mensile', 'Mensile'],
  ['altro', 'Altro'],
]

function periodLabel(p: Prophylaxis): string {
  const from = p.start ? `dal ${monthYearLabel(p.start)}` : ''
  const to = p.end ? ` al ${monthYearLabel(p.end)}` : ''
  return (from + to).trim() || '—'
}

function byStartDesc(a: Prophylaxis, b: Prophylaxis) {
  return (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0)
}

export default function Profilassi() {
  const { user } = useAuth()
  const [items, setItems] = useState<Prophylaxis[]>([])
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeProphylaxis(user.uid, setItems)
  }, [user])

  const current = items.filter((i) => !i.end).sort(byStartDesc)
  const past = items.filter((i) => i.end).sort(byStartDesc)

  return (
    <section className="screen">
      <Link to="/altro" className="back-btn">
        ‹ Altro
      </Link>
      <h1 className="screen-title">Profilassi</h1>
      <p className="screen-sub">
        Le terapie preventive che fai o hai fatto. Compaiono nel report per la visita.
      </p>

      {current.length > 0 && (
        <>
          <p className="section-label">In corso</p>
          {current.map((p) => (
            <ProfRow key={p.id} p={p} onClick={() => setEditId(p.id)} />
          ))}
        </>
      )}
      {past.length > 0 && (
        <>
          <p className="section-label">Concluse</p>
          {past.map((p) => (
            <ProfRow key={p.id} p={p} onClick={() => setEditId(p.id)} />
          ))}
        </>
      )}
      {items.length === 0 && <p className="placeholder">Nessuna terapia registrata.</p>}

      <button
        type="button"
        className="el-add"
        onClick={() => user && setEditId(createProphylaxis(user.uid))}
      >
        + Aggiungi terapia
      </button>

      {editId && user && (
        <ProfSheet
          uid={user.uid}
          item={items.find((i) => i.id === editId)}
          id={editId}
          onClose={() => setEditId(null)}
        />
      )}
    </section>
  )
}

function ProfRow({ p, onClick }: { p: Prophylaxis; onClick: () => void }) {
  return (
    <button type="button" className="prof-row" onClick={onClick}>
      <span className="prof-main">
        <b>{p.drug || 'Senza nome'}</b>
        <span>{periodLabel(p)}</span>
        {p.note && <span className="prof-note">{p.note}</span>}
      </span>
      <span className={`prof-badge${p.end ? ' is-past' : ''}`}>
        {p.end ? 'conclusa' : p.cadence}
      </span>
    </button>
  )
}

function ProfSheet({
  uid,
  id,
  item,
  onClose,
}: {
  uid: string
  id: string
  item: Prophylaxis | undefined
  onClose: () => void
}) {
  const dialog = useDialog()
  const [draft, setDraft] = useState<Prophylaxis | undefined>(item)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setDraft((prev) => prev ?? item)
  }, [item])

  function patch(p: Partial<Prophylaxis>) {
    setDraft((d) => (d ? { ...d, ...p } : d))
    void updateProphylaxis(uid, id, p)
  }

  function close() {
    if (draft && draft.drug.trim() === '') void deleteProphylaxis(uid, id)
    setClosing(true)
    window.setTimeout(onClose, 200)
  }

  async function remove() {
    const ok = await dialog.confirm({
      message: 'Eliminare questa terapia?',
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) {
      void deleteProphylaxis(uid, id)
      setClosing(true)
      window.setTimeout(onClose, 200)
    }
  }

  return (
    <>
      <div
        className={`backdrop${closing ? '' : ' is-open'}`}
        onClick={close}
        aria-hidden="true"
      />
      <div className={`sheet${closing ? '' : ' is-open'}`} role="dialog" aria-label="Terapia">
        <div className="sheet-head">
          <div className="grabber" />
          <div className="sheet-head-row">
            <span className="saved-badge">
              <span className="tick" aria-hidden="true">
                💉
              </span>
              Terapia di profilassi
            </span>
            <button type="button" className="sheet-x" onClick={close} aria-label="Chiudi">
              ✕
            </button>
          </div>
        </div>

        {!draft ? (
          <p className="sheet-loading">…</p>
        ) : (
          <>
            <div className="field">
              <label>Farmaco e dose</label>
              <input
                className="note-input"
                value={draft.drug}
                onChange={(e) => patch({ drug: e.target.value })}
                placeholder="es. Emgality 120 mg"
              />
            </div>

            <div className="field">
              <label>Cadenza</label>
              <div className="chips">
                {CADENCES.map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip${draft.cadence === k ? ' is-on' : ''}`}
                    onClick={() => patch({ cadence: k })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Inizio</label>
              <input
                type="month"
                className="date-input"
                value={draft.start ? toMonthInput(draft.start) : ''}
                onChange={(e) =>
                  patch({ start: e.target.value ? fromMonthInput(e.target.value) : null })
                }
              />
            </div>

            <div className="field">
              <label>Fine</label>
              <label className="rt-check">
                <input
                  type="checkbox"
                  checked={!draft.end}
                  onChange={(e) =>
                    patch({ end: e.target.checked ? null : (draft.start ?? new Date()) })
                  }
                />
                Ancora in corso
              </label>
              {draft.end && (
                <input
                  type="month"
                  className="date-input"
                  style={{ marginTop: 8 }}
                  value={toMonthInput(draft.end)}
                  onChange={(e) =>
                    e.target.value && patch({ end: fromMonthInput(e.target.value) })
                  }
                />
              )}
            </div>

            <div className="field">
              <label>Note</label>
              <textarea
                className="note-input"
                rows={2}
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="es. anche per la pressione"
              />
            </div>

            <div className="sheet-actions">
              <button type="button" className="btn-cancel" onClick={remove}>
                Elimina
              </button>
              <button type="button" className="btn-done" onClick={close}>
                Fatto
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
