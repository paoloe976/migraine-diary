import type { QKind } from './types'

export type { QKind }

export interface QChoice {
  label: string
  value: number | null
}

export interface QItem {
  id: string
  text: string
  /** 'number' = campo numerico (giorni); 'choice' = scelta dalla scala della sezione */
  kind: 'number' | 'choice'
  note?: string
  /** conta nel punteggio (default true) */
  scored?: boolean
  max?: number
}

export interface QSection {
  title?: string
  hint?: string
  scale?: QChoice[]
  items: QItem[]
}

export interface QScore {
  /** valore numerico principale (per lo storico/andamento) */
  value: number
  /** riga da mostrare: "Grado III · moderata" */
  label: string
}

export interface QDef {
  kind: QKind
  title: string
  subtitle: string
  period: string
  intro: string
  /** domanda filtro: se la risposta è "No" il questionario finisce (HEADWORK) */
  gate?: { id: string; text: string }
  sections: QSection[]
  /** true se ogni item della sezione ha bisogno di una risposta per salvare */
  score: (a: Record<string, number | null>) => QScore | null
}

// ---------------------------------------------------------------- MIDAS

const midas: QDef = {
  kind: 'midas',
  title: 'MIDAS',
  subtitle: 'Disabilità da mal di testa',
  period: 'ultimi 3 mesi',
  intro:
    'Rispondi pensando a TUTTI i mal di testa degli ultimi 3 mesi. Scrivi 0 se non hai svolto quell’attività. Non contare dal diario: conta la tua percezione.',
  sections: [
    {
      items: [
        {
          id: 'q1',
          kind: 'number',
          text: 'Giorni di assenza dal lavoro o da scuola a causa del mal di testa',
        },
        {
          id: 'q2',
          kind: 'number',
          text: 'Giorni in cui il rendimento a lavoro/scuola si è ridotto di metà o più',
          note: 'non contare i giorni già indicati sopra',
        },
        {
          id: 'q3',
          kind: 'number',
          text: 'Giorni in cui non hai svolto i lavori di casa',
        },
        {
          id: 'q4',
          kind: 'number',
          text: 'Giorni in cui il rendimento nei lavori di casa si è ridotto di metà o più',
          note: 'non contare i giorni già indicati sopra',
        },
        {
          id: 'q5',
          kind: 'number',
          text: 'Giorni in cui non hai partecipato ad attività familiari, sociali o di svago',
        },
        {
          id: 'a',
          kind: 'number',
          scored: false,
          text: 'In totale, per quanti giorni hai avuto mal di testa? (somma i giorni anche se un mal di testa è durato più giorni)',
        },
        {
          id: 'b',
          kind: 'number',
          scored: false,
          max: 10,
          text: 'Su una scala da 0 a 10, quanto è stata l’intensità media del dolore? (0 = nessun dolore, 10 = dolore fortissimo)',
        },
      ],
    },
  ],
  score: (a) => {
    const q = ['q1', 'q2', 'q3', 'q4', 'q5'].map((k) => a[k])
    if (q.some((v) => v == null)) return null
    const total = (q as number[]).reduce((s, v) => s + v, 0)
    const grade =
      total <= 5
        ? 'I (minima)'
        : total <= 10
          ? 'II (lieve)'
          : total <= 20
            ? 'III (moderata)'
            : 'IV (grave)'
    return { value: total, label: `${total} · grado ${grade}` }
  },
}

// ---------------------------------------------------------------- HIT-6

const HIT6_SCALE: QChoice[] = [
  { label: 'Mai', value: 6 },
  { label: 'Raramente', value: 8 },
  { label: 'Qualche volta', value: 10 },
  { label: 'Molto spesso', value: 11 },
  { label: 'Sempre', value: 13 },
]

const hit6: QDef = {
  kind: 'hit6',
  title: 'HIT-6',
  subtitle: 'Impatto del mal di testa sulla vita',
  period: 'ultime 4 settimane',
  intro: 'Per ogni domanda scegli la risposta che descrive meglio come ti senti di solito.',
  sections: [
    {
      scale: HIT6_SCALE,
      items: [
        { id: 'q1', kind: 'choice', text: 'Quando hai mal di testa, quanto spesso il dolore è forte?' },
        {
          id: 'q2',
          kind: 'choice',
          text: 'Quanto spesso il mal di testa limita la tua capacità di svolgere le attività quotidiane abituali (lavori di casa, lavoro, studio, attività con gli altri)?',
        },
        {
          id: 'q3',
          kind: 'choice',
          text: 'Quando hai mal di testa, quanto spesso vorresti poterti sdraiare?',
        },
        {
          id: 'q4',
          kind: 'choice',
          text: 'Nelle ultime 4 settimane, quanto spesso ti sei sentito/a troppo stanco/a per lavorare o svolgere le attività quotidiane a causa del mal di testa?',
        },
        {
          id: 'q5',
          kind: 'choice',
          text: 'Nelle ultime 4 settimane, quanto spesso hai avuto la sensazione di non poterne più o ti sei sentito/a irritato/a a causa del mal di testa?',
        },
        {
          id: 'q6',
          kind: 'choice',
          text: 'Nelle ultime 4 settimane, quanto spesso il mal di testa ha limitato la tua capacità di concentrarti sul lavoro o sulle attività quotidiane?',
        },
      ],
    },
  ],
  score: (a) => {
    const q = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((k) => a[k])
    if (q.some((v) => v == null)) return null
    const total = (q as number[]).reduce((s, v) => s + v, 0)
    const band =
      total <= 49
        ? 'impatto scarso o assente'
        : total <= 55
          ? 'qualche impatto'
          : total <= 59
            ? 'impatto sostanziale'
            : 'impatto grave'
    return { value: total, label: `${total} — ${band}` }
  },
}

// ---------------------------------------------------------------- HEADWORK

const HW_DIFF: QChoice[] = [
  { label: 'Nessuna', value: 0 },
  { label: 'Lieve', value: 1 },
  { label: 'Media', value: 2 },
  { label: 'Grave', value: 3 },
  { label: 'Non ci sono mai riuscito/a', value: 4 },
  { label: 'Non applicabile', value: null },
]

const HW_LIMIT: QChoice[] = [
  { label: 'Per nulla', value: 0 },
  { label: 'Poco', value: 1 },
  { label: 'Abbastanza', value: 2 },
  { label: 'Molto', value: 3 },
  { label: 'Del tutto', value: 4 },
  { label: 'Non applicabile', value: null },
]

const headwork: QDef = {
  kind: 'headwork',
  title: 'HEADWORK',
  subtitle: 'Difficoltà sul lavoro legate alla cefalea',
  period: 'ultimi 30 giorni',
  intro: 'Le domande riguardano le difficoltà che la cefalea può aver creato nel lavoro.',
  gate: { id: 'worked', text: 'Lavori?' },
  sections: [
    {
      title: 'Negli ultimi 30 giorni, quanta difficoltà hai avuto — a causa della cefalea — nel…',
      scale: HW_DIFF,
      items: [
        { id: 'a1', kind: 'choice', text: 'Prestare attenzione ai compiti lavorativi' },
        { id: 'a2', kind: 'choice', text: 'Risolvere problemi organizzativi sul lavoro' },
        { id: 'a3', kind: 'choice', text: 'Iniziare un compito sul lavoro' },
        { id: 'a4', kind: 'choice', text: 'Gestire i problemi lavorativi' },
        { id: 'a5', kind: 'choice', text: 'Leggere e scrivere' },
        { id: 'a6', kind: 'choice', text: 'Usare il computer' },
        { id: 'a7', kind: 'choice', text: 'Rispondere al telefono' },
        { id: 'a8', kind: 'choice', text: 'Guidare l’automobile' },
        { id: 'a9', kind: 'choice', text: 'Spostarti da un posto all’altro' },
        { id: 'a10', kind: 'choice', text: 'Parlare e interagire con altre persone' },
        { id: 'a11', kind: 'choice', text: 'Capire quello che viene detto' },
      ],
    },
    {
      title:
        'Negli ultimi 30 giorni, quanto questi fattori hanno limitato o impedito la tua capacità di lavorare?',
      scale: HW_LIMIT,
      items: [
        { id: 'e1', kind: 'choice', text: 'Rumori nell’ambiente' },
        { id: 'e2', kind: 'choice', text: 'Odori nell’ambiente' },
        { id: 'e3', kind: 'choice', text: 'Luminosità nell’ambiente' },
        { id: 'e4', kind: 'choice', text: 'Orario di lavoro prolungato' },
        { id: 'e5', kind: 'choice', text: 'Atteggiamento negativo dei colleghi' },
        { id: 'e6', kind: 'choice', text: 'Aria condizionata' },
      ],
    },
  ],
  score: (a) => {
    if (a.worked === 0) return { value: 0, label: 'non applicabile (non lavora)' }
    const sub = (ids: string[]) => {
      const vals = ids.map((k) => a[k]).filter((v): v is number => typeof v === 'number')
      if (vals.length === 0) return null
      return Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length * 4)) * 100)
    }
    const act = sub(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11'])
    const env = sub(['e1', 'e2', 'e3', 'e4', 'e5', 'e6'])
    if (act == null && env == null) return null
    return {
      value: act ?? 0,
      label: `attività ${act ?? '—'}/100 · fattori ambientali ${env ?? '—'}/100`,
    }
  },
}

// ----------------------------------------------------------------

export const QUESTIONNAIRES: Record<QKind, QDef> = { midas, hit6, headwork }

export function scoredItemIds(def: QDef): string[] {
  return def.sections
    .flatMap((s) => s.items)
    .filter((i) => i.scored !== false)
    .map((i) => i.id)
}
