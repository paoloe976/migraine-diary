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
  MedEfficacy,
  Profile,
  Severity,
} from '../lib/types'
import {
  DURATION_BUCKETS,
  SEVERITY_LABEL,
  toDateInput,
  toTimeInput,
  withDate,
  withTime,
} from '../lib/format'
import { useDialog } from '../components/Dialog'
import HeadMap, { lateralityFromZones, locationSummary } from '../components/HeadMap'

const PAIN_QUALITY = ['Pulsante', 'Gravativo / a cerchio', 'Trafittivo', 'A fitte']
const SYMPTOMS = ['Nausea', 'Vomito', 'Fastidio luce / rumori', 'Aura']
const EFFICACY: Array<[MedEfficacy, string]> = [
  ['efficace', 'Efficace'],
  ['parziale', 'Parziale'],
  ['non_efficace', 'Non efficace'],
]
const PROMPT_MESSAGE: Record<keyof Profile, string> = {
  types: 'Nuovo tipo di mal di testa',
  meds: 'Nome del farmaco',
  triggers: 'Nuova causa scatenante',
}
const DISABILITY: Array<[key: Disability, label: string, support: string]> = [
  ['lieve', 'Lieve', 'Svolgo normalmente le mie attività'],
  ['moderata', 'Moderata', 'Svolgo a fatica le mie attività'],
  ['elevata', 'Elevata', 'Non sono in grado di svolgere le mie attività'],
]


interface Props {
  uid: string
  episodeId: string
  isNew: boolean
  /** kept = true se l'episodio è stato tenuto (Fatto / X / tap fuori), false se eliminato. */
  onClose: (kept: boolean) => void
}

export default function LogSheet({ uid, episodeId, isNew, onClose }: Props) {
  const [draft, setDraft] = useState<Episode | null>(null)
  const [profile, setProfile] = useState<Profile>({ types: DEFAULT_TYPES, meds: [], triggers: [] })
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)
  const dialog = useDialog()

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

  function close(kept = true) {
    setClosing(true)
    window.setTimeout(() => onClose(kept), 200)
  }

  async function remove() {
    const ok = await dialog.confirm({
      message: 'Eliminare questo episodio?',
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) {
      void deleteEpisode(uid, episodeId)
      close(false)
    }
  }

  async function addCustom(field: keyof Profile, select: (value: string) => void) {
    const value = (await dialog.prompt({ message: PROMPT_MESSAGE[field] }))?.trim()
    if (!value) return
    await addToProfileList(uid, field, value)
    select(value)
  }

  const triggerOptions = profile.triggers

  return (
    <>
      <div
        className={`backdrop${closing ? '' : ' is-open'}`}
        onClick={() => close()}
        aria-hidden="true"
      />
      <div className={`sheet${closing ? '' : ' is-open'}`} role="dialog" aria-label="Episodio">
        <div className="sheet-head">
          <div className="grabber" />
          <div className="sheet-head-row">
            <span className={`saved-badge${isNew ? ' is-new' : ''}`}>
              <span className="tick" aria-hidden="true">
                {isNew ? '✓' : '✎'}
              </span>
              {isNew ? 'Episodio registrato' : 'Modifica episodio'}
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
              <span>{expanded ? 'Nascondi dettagli' : 'Aggiungi dettagli'}</span>
              <span className="expander-caret" aria-hidden="true">
                {expanded ? '▴' : '▾'}
              </span>
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

                <Field label="Durata">
                  <div className="chips">
                    {DURATION_BUCKETS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`chip${draft.duration === d ? ' is-on' : ''}`}
                        onClick={() =>
                          patch(
                            draft.duration === d
                              ? { duration: null, end: null }
                              : { duration: d },
                          )
                        }
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {draft.end && (
                    <p className="field-support">
                      Attacco concluso — togli la durata per riaprirlo
                    </p>
                  )}
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

                {draft.meds.length > 0 && (
                  <Field label="Efficacia del farmaco">
                    <div className="chips">
                      {EFFICACY.map(([k, lbl]) => (
                        <button
                          key={k}
                          type="button"
                          className={`chip${draft.medEfficacy === k ? ' is-on' : ''}`}
                          onClick={() =>
                            patch({ medEfficacy: draft.medEfficacy === k ? null : k })
                          }
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                <Field label="Sintomi">
                  <Chips
                    multi
                    options={SYMPTOMS}
                    value={draft.symptoms}
                    onChange={(v) => patch({ symptoms: v })}
                  />
                </Field>

                <Field label="Dove fa male" hint="tocca le zone">
                  <HeadMap
                    value={draft.headZones}
                    onChange={(zones) =>
                      patch({ headZones: zones, laterality: lateralityFromZones(zones) })
                    }
                  />
                  <p className="field-support">
                    {draft.headZones.length === 0
                      ? 'Nessuna zona selezionata'
                      : locationSummary(draft.headZones)}
                  </p>
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
                  {draft.disability && (
                    <p className="field-support">
                      {DISABILITY.find(([k]) => k === draft.disability)?.[2]}
                    </p>
                  )}
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
  // voci scelte nell'episodio ma non più nella lista (es. dopo un rename):
  // vanno comunque mostrate, altrimenti non si possono togliere
  const shown = [...options, ...value.filter((v) => !options.includes(v))]
  return (
    <div className="chips">
      {shown.map((o) => (
        <button
          key={o}
          type="button"
          className={`chip${value.includes(o) ? ' is-on' : ''}${
            options.includes(o) ? '' : ' orphan'
          }`}
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
