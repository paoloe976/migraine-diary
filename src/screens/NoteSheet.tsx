import { useEffect, useState } from 'react'
import {
  DEFAULT_NOTE_TAGS,
  deleteDayNote,
  subscribeDayNote,
  updateDayNote,
} from '../lib/data'
import type { DayNote, DayNotePatch } from '../lib/types'
import { toDateInput, withDate } from '../lib/format'
import { useDialog } from '../components/Dialog'

interface Props {
  uid: string
  noteId: string
  isNew: boolean
  /** kept = true se la nota è stata tenuta, false se eliminata. */
  onClose: (kept: boolean) => void
}

export default function NoteSheet({ uid, noteId, isNew, onClose }: Props) {
  const [draft, setDraft] = useState<DayNote | null>(null)
  const [closing, setClosing] = useState(false)
  const dialog = useDialog()

  // Primo snapshot come base; le modifiche successive sono locali (unico editor).
  useEffect(() => {
    return subscribeDayNote(uid, noteId, (n) => setDraft((prev) => prev ?? n))
  }, [uid, noteId])

  function patch(p: DayNotePatch) {
    setDraft((prev) => (prev ? { ...prev, ...p } : prev))
    void updateDayNote(uid, noteId, p)
  }

  function close(kept = true) {
    // una nota senza testo né etichette non serve a nulla: la si scarta
    if (kept && draft && !draft.text.trim() && draft.tags.length === 0) {
      void deleteDayNote(uid, noteId)
    }
    setClosing(true)
    window.setTimeout(() => onClose(kept), 200)
  }

  async function remove() {
    const ok = await dialog.confirm({
      message: 'Eliminare questa nota?',
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) {
      void deleteDayNote(uid, noteId)
      close(false)
    }
  }

  function toggleTag(t: string) {
    if (!draft) return
    patch({
      tags: draft.tags.includes(t)
        ? draft.tags.filter((x) => x !== t)
        : [...draft.tags, t],
    })
  }

  async function addTag() {
    const value = (await dialog.prompt({ message: 'Nuova etichetta' }))?.trim().toLowerCase()
    if (!value || !draft || draft.tags.includes(value)) return
    patch({ tags: [...draft.tags, value] })
  }

  const shownTags = draft
    ? [...DEFAULT_NOTE_TAGS, ...draft.tags.filter((t) => !DEFAULT_NOTE_TAGS.includes(t))]
    : DEFAULT_NOTE_TAGS

  return (
    <>
      <div
        className={`backdrop${closing ? '' : ' is-open'}`}
        onClick={() => close()}
        aria-hidden="true"
      />
      <div className={`sheet${closing ? '' : ' is-open'}`} role="dialog" aria-label="Nota">
        <div className="sheet-head">
          <div className="grabber" />
          <div className="sheet-head-row">
            <span className={`saved-badge${isNew ? ' is-new' : ''}`}>
              <span className="tick" aria-hidden="true">
                {isNew ? '✓' : '✎'}
              </span>
              {isNew ? 'Nota salvata' : 'Modifica nota'}
            </span>
            <button type="button" className="sheet-x" onClick={() => close()} aria-label="Chiudi">
              ✕
            </button>
          </div>
        </div>

        {!draft ? (
          <p className="sheet-loading">…</p>
        ) : (
          <>
            <div className="when-field">
              <label>Giorno</label>
              <div className="when-datetime">
                <input
                  type="date"
                  className="date-input"
                  value={toDateInput(draft.date)}
                  onChange={(e) =>
                    e.target.value && patch({ date: withDate(draft.date, e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Nota</label>
              <textarea
                className="note-input"
                rows={3}
                autoFocus={isNew}
                value={draft.text}
                onChange={(e) => patch({ text: e.target.value })}
                placeholder="Cosa vuoi ricordare di questo giorno…"
              />
            </div>

            <div className="field">
              <label>Etichette</label>
              <div className="chips">
                {shownTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip${draft.tags.includes(t) ? ' is-on' : ''}`}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))}
                <button type="button" className="chip ghost" onClick={addTag}>
                  + Altro
                </button>
              </div>
            </div>

            <div className="sheet-actions">
              <button type="button" className="btn-cancel" onClick={remove}>
                Elimina
              </button>
              <button type="button" className="btn-done" onClick={() => close()}>
                Fatto
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
