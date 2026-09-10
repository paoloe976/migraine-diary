import { useMemo, useState } from 'react'
import { updateEpisode } from '../lib/data'
import type { Episode, MedEfficacy } from '../lib/types'
import { DURATION_BUCKETS, durationBucket, elapsedLabel } from '../lib/format'

const EFFICACY: Array<[MedEfficacy, string]> = [
  ['efficace', 'Efficace'],
  ['parziale', 'Parziale'],
  ['non_efficace', 'Non efficace'],
]

interface Props {
  uid: string
  episode: Episode
  onClose: () => void
}

export default function ConcludeSheet({ uid, episode, onClose }: Props) {
  const now = useMemo(() => new Date(), [])
  const [closing, setClosing] = useState(false)
  const hasMed = episode.meds.length > 0

  const [duration, setDuration] = useState(
    () => episode.duration ?? durationBucket(episode.start, now),
  )
  const [efficacy, setEfficacy] = useState<MedEfficacy | null>(
    () => (hasMed ? (episode.medEfficacy ?? 'efficace') : null),
  )

  function close() {
    setClosing(true)
    window.setTimeout(onClose, 200)
  }

  function save() {
    void updateEpisode(uid, episode.id, {
      end: new Date(),
      duration,
      ...(hasMed ? { medEfficacy: efficacy } : {}),
    })
    close()
  }

  const startTime = episode.start.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <div
        className={`backdrop${closing ? '' : ' is-open'}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        className={`sheet${closing ? '' : ' is-open'}`}
        role="dialog"
        aria-label="Fine dell'attacco"
      >
        <div className="sheet-head">
          <div className="grabber" />
          <div className="sheet-head-row">
            <span className="sheet-title">
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              Mi è passato
            </span>
            <button type="button" className="sheet-x" onClick={close} aria-label="Chiudi">
              ✕
            </button>
          </div>
        </div>

        <p className="conclude-sub">
          Iniziato alle {startTime} · {elapsedLabel(episode.start, now)} fa
        </p>

        <div className="field">
          <label>Quanto è durato</label>
          <div className="chips">
            {DURATION_BUCKETS.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip${duration === d ? ' is-on' : ''}`}
                onClick={() => setDuration(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {hasMed && (
          <div className="field">
            <label>Il farmaco ({episode.meds.join(', ')}) ha funzionato?</label>
            <div className="chips">
              {EFFICACY.map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  className={`chip${efficacy === k ? ' is-on' : ''}`}
                  onClick={() => setEfficacy(efficacy === k ? null : k)}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn-cancel" onClick={close}>
            Annulla
          </button>
          <button type="button" className="btn-done" onClick={save}>
            Salva
          </button>
        </div>
      </div>
    </>
  )
}
