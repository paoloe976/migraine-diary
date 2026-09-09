export type Severity = 'lieve' | 'moderato' | 'severo'
export type Disability = 'tutto' | 'fatica' | 'niente'
export type Laterality = 'sx' | 'dx' | 'bilaterale'

/** Un episodio / attacco. L'unità del diario. */
export interface Episode {
  id: string
  /** inizio: data + ora */
  start: Date
  /** fine, opzionale (attacchi di più giorni) */
  end: Date | null
  severity: Severity | null
  /** etichetta del tipo, scelta dalla lista dell'utente */
  type: string | null
  painQuality: string[]
  meds: string[]
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
