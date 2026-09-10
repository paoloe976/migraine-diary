import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useDialog } from '../components/Dialog'
import {
  addToProfileList,
  bulkImportEpisodes,
  clearUserData,
  type ImportRow,
} from '../lib/data'
import type { Disability, Severity } from '../lib/types'

const MAP: Record<string, { severity: Severity | null; disability: Disability | null }> = {
  '1': { severity: 'lieve', disability: 'lieve' },
  '2': { severity: 'moderato', disability: 'lieve' },
  '3': { severity: 'moderato', disability: 'moderata' },
  '4': { severity: 'severo', disability: 'moderata' },
  '5': { severity: 'severo', disability: 'elevata' },
}

interface OldRow {
  date: string
  intensity?: string
  location?: string
  medication?: string
  notes?: string
}

interface Parsed {
  rows: ImportRow[]
  meds: string[]
  skipped: Array<{ date: string; notes: string }>
}

function parse(text: string): Parsed {
  const data = JSON.parse(text) as Record<string, OldRow[]>
  const rows: ImportRow[] = []
  const medsSet = new Set<string>()
  const skipped: Array<{ date: string; notes: string }> = []

  for (const list of Object.values(data)) {
    for (const r of list) {
      const intensity = (r.intensity ?? '').trim()
      const location = (r.location ?? '').trim()
      const medication = (r.medication ?? '').trim()
      const notes = (r.notes ?? '').replace(/^"+/, '').trim()

      if (!intensity && !location && !medication) {
        if (notes) skipped.push({ date: r.date, notes })
        continue
      }

      const meds = medication
        .split(/\s*[+/]\s*/)
        .map((m) => m.trim())
        .filter(Boolean)
      meds.forEach((m) => medsSet.add(m))

      const map = MAP[intensity] ?? { severity: null, disability: null }
      const noteParts = [notes, location ? `sede: ${location.toLowerCase()}` : ''].filter(Boolean)

      rows.push({
        start: new Date(`${r.date}T12:00:00`),
        severity: map.severity,
        disability: map.disability,
        meds,
        notes: noteParts.join(' · '),
      })
    }
  }

  rows.sort((a, b) => a.start.getTime() - b.start.getTime())
  return { rows, meds: [...medsSet].sort(), skipped }
}

export default function Import() {
  const { user } = useAuth()
  const dialog = useDialog()
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const addLog = (s: string) => setLog((l) => [...l, s])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setParsed(parse(await file.text()))
    } catch (err) {
      addLog(`Errore lettura file: ${String(err)}`)
    }
  }

  async function doClear() {
    if (!user) return
    const ok = await dialog.confirm({
      message: `Cancellare TUTTI gli episodi, profilassi e questionari di ${user.email}?`,
      confirmLabel: 'Svuota',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const c = await clearUserData(user.uid)
      addLog(
        `Svuotato: ${c.episodes} episodi, ${c.prophylaxis} profilassi, ${c.questionnaires} questionari.`,
      )
    } catch (err) {
      addLog(`Errore svuotamento: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function doImport() {
    if (!user || !parsed) return
    setBusy(true)
    try {
      const n = await bulkImportEpisodes(user.uid, parsed.rows)
      for (const m of parsed.meds) await addToProfileList(user.uid, 'meds', m)
      addLog(`Importati ${n} episodi · ${parsed.meds.length} farmaci aggiunti alla lista.`)
      addLog(`${parsed.skipped.length} righe con solo nota NON importate (elenco sotto).`)
    } catch (err) {
      addLog(`Errore import: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="screen">
      <Link to="/altro" className="back-btn">
        ‹ Altro
      </Link>
      <h1 className="screen-title">Import</h1>
      <p className="screen-sub">Strumento una-tantum · account {user?.email}</p>

      <div className="import-block">
        <h2>1 · Svuota</h2>
        <p>
          Cancella tutti gli episodi, le profilassi e i questionari di questo account. Le liste
          (tipi, farmaci, scatenanti) restano.
        </p>
        <button type="button" className="btn-cancel" disabled={busy} onClick={doClear}>
          Svuota tutto
        </button>
      </div>

      <div className="import-block">
        <h2>2 · Importa headache_data.json</h2>
        <input type="file" accept=".json,application/json" onChange={onFile} disabled={busy} />
        {parsed && (
          <div className="import-preview">
            <p>
              <b>{parsed.rows.length}</b> episodi — dal{' '}
              {parsed.rows[0]?.start.toLocaleDateString('it-IT')} al{' '}
              {parsed.rows[parsed.rows.length - 1]?.start.toLocaleDateString('it-IT')}
            </p>
            <p>
              <b>{parsed.meds.length}</b> farmaci: {parsed.meds.join(', ')}
            </p>
            <p>
              <b>{parsed.skipped.length}</b> righe con solo nota (scartate)
            </p>
            <button type="button" className="btn-done" disabled={busy} onClick={doImport}>
              Importa {parsed.rows.length} episodi
            </button>
            <details className="import-skipped">
              <summary>Righe scartate ({parsed.skipped.length}) — alcune sono profilassi</summary>
              <ul>
                {parsed.skipped.map((s, i) => (
                  <li key={i}>
                    <b>{s.date}</b> — {s.notes}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div className="import-log">
          {log.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
    </section>
  )
}
