/**
 * Colore d'accento scelto dall'utente. Preferenza cosmetica per-dispositivo
 * (localStorage): applicata subito all'avvio per non avere sfarfallii.
 *
 * Tutti i campioni sono tenui (fotofobia). Esclusi ambra (= "moderato") e
 * rosso (riservato a "severo" e agli avvisi).
 */
export interface AccentOption {
  id: string
  label: string
  value: string
}

export const ACCENTS: AccentOption[] = [
  { id: 'blu', label: 'Blu polvere', value: '#7ba6c9' },
  { id: 'pervinca', label: 'Pervinca', value: '#8f8fd9' },
  { id: 'lavanda', label: 'Lavanda', value: '#bd9bd4' },
  { id: 'acqua', label: 'Verde acqua', value: '#5fb0b8' },
]

export const DEFAULT_ACCENT = ACCENTS[0]

const KEY = 'accent'

export function getAccentId(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_ACCENT.id
  } catch {
    return DEFAULT_ACCENT.id
  }
}

export function applyAccent(id: string): void {
  const opt = ACCENTS.find((a) => a.id === id) ?? DEFAULT_ACCENT
  document.documentElement.style.setProperty('--accent', opt.value)
}

export function setAccent(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* modalità privata: si applica comunque per la sessione */
  }
  applyAccent(id)
}
