import { useEffect, useState, type ReactNode } from 'react'
import {
  addToProfileList,
  deleteEpisode,
  subscribeEpisode,
  subscribeProfile,
  updateEpisode,
  DEFAULT_TYPES,
} from '../lib/data'
import type {
  Disability,
  Episode,
  EpisodePatch,
  Laterality,
  Profile,
  Severity,
} from '../lib/types'
import { SEVERITY_LABEL, toDateInput, toTimeInput, withDate, withTime } from '../lib/format'

const PAIN_QUALITY = ['Pulsante', 'Gravativo / a cerchio', 'Trafittivo', 'A fitte']
const SYMPTOMS = ['Nausea', 'Vomito', 'Fastidio luce / rumori', 'Aura']
const DEFAULT_TRIGGERS = [
  'Stress',
  'Poco sonno',
  'Pasto saltato',
  'Vino / alcol',
  'Meteo',
  'Mestruazioni',
  'Schermi a lungo',
  'Sforzo fisico',
]
const SEDE: [Laterality, string][] = [
  ['sx', 'Sinistra'],
  ['dx', 'Destra'],
  ['bilaterale', 'Bilaterale'],
  ['diffusa', 'Diffusa'],
]
const DISABILITY: [Disability, string][] = [
  ['tutto', 'Faccio tutto'],
  ['fatica', 'A fatica'],
  ['niente', 'Non ci riesco'],
]

interface Props {
  uid: string
  episodeId: string
  isNew: boolean
  onClose: () => void
}

export default function LogSheet({ uid, episodeId, isNew, onClose }: Props) {
  const [draft, setDraft] = useState<Episode | null>(null)
  const [profile, setProfile] = useState<Profile>({ types: DEFAULT_TYPES, meds: [], triggers: [] })
  const [expanded, setExpanded] = useState(!isNew)
  const [closing, setClosing] = useState(false)

  // Prende il PRIMO snapshot come base; le modifiche successive sono locali
  // (questo foglio è l'unico editor dell'episodio) per evitare sfarfallii.
  useEffect(() => {
    return subscribeEpisode(uid, episodeId, (e) => {
      setDraft((prev) => prev ?? e)
    })
  }, [uid, episodeId])

  useEffect(() => subscribeProfile(uid, setProfile), [uid])

  function patch(p: EpisodePatch) {
    setDraft((prev) => (prev ? { ...prev, ...p } : prev))
    void updateEpisode(uid, episodeId, p)
  }

  function close() {
    setClosing(true)
    window.setTimeout(onClose, 200)
  }

  function remove() {
    if (window.confirm('Eliminare questo episodio?')) {
      void deleteEpisode(uid, episodeId)
      close()
    }
  }

  async function addCustom(field: keyof Profile, select: (value: string) => void) {
    const value = window.prompt('Aggiungi')?.trim()
    if (!value) return
    await addToProfileList(uid, field, value)
    select(value)
  }

  const triggerOptions = [
    ...DEFAULT_TRIGGERS,
    ...profile.triggers.filter((t) => !DEFAULT_TRIGGERS.includes(t)),
  ]

  return (
    <>
      <div
        className={`backdrop${closing ? '' : ' is-open'}`}
        onClick={close}
        aria-hidden="true"
      />
      <div className={`sheet${closing ? '' : ' is-open'}`} role="dialog" aria-label="Episodio">
        <div className="grabber" />
        <span className={`saved-badge${isNew ? ' is-new' : ''}`}>
          <span className="tick" aria-hidden="true">
            {isNew ? '✓' : '✎'}
          </span>
          {isNew ? 'Episodio registrato' : 'Modifica episodio'}
        </span>

        {!draft ? (
          <p className="sheet-loading">…</p>
        ) : (
          <>
            <div className="when-field">
              <label>Quando</label>
              <div className="when-datetime">
                <input
                  type="date"
                  className="date-input"
                  value={toDateInput(draft.start)}
                  onChange={(e) =>
                    e.target.value && patch({ start: withDate(draft.start, e.target.value) })
                  }
                />
                <input
                  type="time"
                  className="time-input"
                  value={toTimeInput(draft.start)}
                  onChange={(e) =>
                    e.target.value && patch({ start: withTime(draft.start, e.target.value) })
                  }
                />
              </div>
            </div>

            <p className="ask">
              Quanto è forte? <span className="opt">— facoltativo</span>
            </p>
            <div className="pills">
              {(['lieve', 'moderato', 'severo'] as Severity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-sev={s}
                  className={`pill${draft.severity === s ? ' is-on' : ''}`}
                  onClick={() => patch({ severity: draft.severity === s ? null : s })}
                >
                  {SEVERITY_LABEL[s]}
                </button>
              ))}
            </div>

            <p className="stop-note">Puoi fermarti qui. Riapri l'episodio quando vuoi.</p>

            <button
              type="button"
              className="expander"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Nascondi dettagli ▴' : 'Aggiungi dettagli ▾'}
            </button>

            {expanded && (
              <div className="details">
                <Field label="Che tipo di mal di testa?">
                  <Chips
                    options={profile.types}
                    value={draft.type ? [draft.type] : []}
                    onChange={(v) => patch({ type: v[0] ?? null })}
                    addLabel="+ Nuovo"
                    onAdd={() => addCustom('types', (v) => patch({ type: v }))}
                  />
                </Field>

                <Field label="Qualità del dolore">
                  <Chips
                    multi
                    options={PAIN_QUALITY}
                    value={draft.painQuality}
                    onChange={(v) => patch({ painQuality: v })}
                  />
                </Field>

                <Field
                  label="Farmaco preso"
                  hint={profile.meds.length ? undefined : 'compaiono qui man mano che li usi'}
                >
                  <Chips
                    multi
                    options={profile.meds}
                    value={draft.meds}
                    onChange={(v) => patch({ meds: v })}
                    addLabel="+ Aggiungi"
                    onAdd={() =>
                      addCustom('meds', (v) => patch({ meds: [...draft.meds, v] }))
                    }
                  />
                </Field>

                <Field label="Sintomi">
                  <Chips
                    multi
                    options={SYMPTOMS}
                    value={draft.symptoms}
                    onChange={(v) => patch({ symptoms: v })}
                  />
                </Field>

                <Field label="Dove fa male">
                  <div className="chips">
                    {SEDE.map(([k, lbl]) => (
                      <button
                        key={k}
                        type="button"
                        className={`chip${draft.laterality === k ? ' is-on' : ''}`}
                        onClick={() =>
                          patch({ laterality: draft.laterality === k ? null : k })
                        }
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Disabilità">
                  <div className="chips">
                    {DISABILITY.map(([k, lbl]) => (
                      <button
                        key={k}
                        type="button"
                        className={`chip${draft.disability === k ? ' is-on' : ''}`}
                        onClick={() =>
                          patch({ disability: draft.disability === k ? null : k })
                        }
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Probabile causa scatenante"
                  hint="da riempire quando serve"
                >
                  <Chips
                    multi
                    options={triggerOptions}
                    value={draft.triggers}
                    onChange={(v) => patch({ triggers: v })}
                    addLabel="+ Altro"
                    onAdd={() =>
                      addCustom('triggers', (v) => patch({ triggers: [...draft.triggers, v] }))
                    }
                  />
                </Field>

                <Field label="Note">
                  <textarea
                    className="note-input"
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    placeholder="Qualsiasi altra cosa utile…"
                  />
                </Field>
              </div>
            )}

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

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint && <p className="field-hint">{hint}</p>}
      {children}
    </div>
  )
}

function Chips({
  options,
  value,
  onChange,
  multi,
  addLabel,
  onAdd,
}: {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  multi?: boolean
  addLabel?: string
  onAdd?: () => void
}) {
  function toggle(o: string) {
    if (value.includes(o)) onChange(value.filter((x) => x !== o))
    else onChange(multi ? [...value, o] : [o])
  }
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`chip${value.includes(o) ? ' is-on' : ''}`}
          onClick={() => toggle(o)}
        >
          {o}
        </button>
      ))}
      {addLabel && (
        <button type="button" className="chip ghost" onClick={onAdd}>
          {addLabel}
        </button>
      )}
    </div>
  )
}
