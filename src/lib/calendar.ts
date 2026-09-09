export const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
]

/**
 * Celle della griglia mensile, da lunedì a domenica.
 * `null` = cella di riempimento (giorno di un altro mese).
 */
export function monthGrid(year: number, month0: number): Array<number | null> {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  // getDay(): 0 = domenica. Vogliamo 0 = lunedì.
  const lead = (new Date(year, month0, 1).getDay() + 6) % 7

  const cells: Array<number | null> = []
  for (let i = 0; i < lead; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
