export type Severity = 'lieve' | 'moderato' | 'severo'
export type Disability = 'lieve' | 'moderata' | 'elevata'
export type Laterality = 'sx' | 'dx' | 'bilaterale'
export type MedEfficacy = 'efficace' | 'parziale' | 'non_efficace'

/** Un episodio / attacco. L'unità del diario. */
export interface Episode {
  id: string
  /** inizio: data + ora */
  start: Date
  /** fine, opzionale (attacchi di più giorni) */
  end: Date | null
  severity: Severity | null
  /** durata approssimativa, etichetta bucket ("< 4 h", "4–12 h", …) */
  duration: string | null
  /** etichetta del tipo, scelta dalla lista dell'utente */
  type: string | null
  painQuality: string[]
  meds: string[]
  /** efficacia del/i farmaco/i preso/i (generica, come il diario AIC) */
  medEfficacy: MedEfficacy | null
  symptoms: string[]
  /** zone della testa toccate sulla mappa (Fase 2) */
  headZones: string[]
  laterality: Laterality | null
  disability: Disability | null
  triggers: string[]
  notes: string
  createdAt: Date | null
  updatedAt: Date | null
}

export type EpisodePatch = Partial<Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>>

/** Liste che "imparano" dall'uso, salvate nel doc profilo dell'utente. */
export interface Profile {
  types: string[]
  meds: string[]
  triggers: string[]
}

export type Cadence = 'giornaliera' | 'settimanale' | 'mensile' | 'altro'

/** Una terapia di profilassi (preventiva). */
export interface Prophylaxis {
  id: string
  drug: string
  cadence: Cadence
  /** mese di inizio (giorno 1) */
  start: Date | null
  /** mese di fine; null = in corso */
  end: Date | null
  note: string
  createdAt: Date | null
  updatedAt: Date | null
}

export type ProphylaxisPatch = Partial<Omit<Prophylaxis, 'id' | 'createdAt' | 'updatedAt'>>

/** Una nota di giornata: contesto non legato a un attacco (né alla profilassi). */
export interface DayNote {
  id: string
  /** giorno a cui si riferisce (ora fissata a mezzogiorno) */
  date: Date
  text: string
  /** etichette rapide, es. "ciclo", "sonno", "stress" */
  tags: string[]
  createdAt: Date | null
  updatedAt: Date | null
}

export type DayNotePatch = Partial<Pick<DayNote, 'date' | 'text' | 'tags'>>

export type QKind = 'midas' | 'hit6' | 'headwork'

/** Una compilazione salvata di un questionario. */
export interface QuestionnaireEntry {
  id: string
  kind: QKind
  date: Date
  /** risposte grezze, chiave = id item (per HEADWORK anche `worked`: 0|1) */
  answers: Record<string, number | null>
  createdAt: Date | null
}
