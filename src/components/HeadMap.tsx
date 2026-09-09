import type { Laterality } from '../lib/types'

type Side = 'dx' | 'sx' | 'centro'

interface Zone {
  name: string
  side: Side
  cx: number
  cy: number
  rx: number
  ry: number
}

/**
 * Vista frontale (patiente di fronte: la sua destra è alla nostra sinistra)
 * e vista posteriore (la sua destra è alla nostra sinistra anche di spalle).
 */
const ZONES: readonly Zone[] = [
  { name: 'fronte', side: 'centro', cx: 72, cy: 52, rx: 32, ry: 14 },
  { name: 'tempia destra', side: 'dx', cx: 40, cy: 76, rx: 11, ry: 15 },
  { name: 'tempia sinistra', side: 'sx', cx: 104, cy: 76, rx: 11, ry: 15 },
  { name: 'zona occhio destra', side: 'dx', cx: 56, cy: 92, rx: 12, ry: 8 },
  { name: 'zona occhio sinistra', side: 'sx', cx: 88, cy: 92, rx: 12, ry: 8 },
  { name: 'vertice', side: 'centro', cx: 228, cy: 50, rx: 32, ry: 14 },
  { name: 'parietale destra', side: 'dx', cx: 198, cy: 80, rx: 13, ry: 17 },
  { name: 'parietale sinistra', side: 'sx', cx: 258, cy: 80, rx: 13, ry: 17 },
  { name: 'occipite', side: 'centro', cx: 228, cy: 116, rx: 27, ry: 15 },
  { name: 'nuca', side: 'centro', cx: 228, cy: 146, rx: 18, ry: 11 },
]

const SIDE_BY_NAME = new Map(ZONES.map((z) => [z.name, z.side]))

export function lateralityFromZones(zoneNames: string[]): Laterality | null {
  if (zoneNames.length === 0) return null
  const sides = new Set(zoneNames.map((n) => SIDE_BY_NAME.get(n)))
  if (sides.has('dx') && sides.has('sx')) return 'bilaterale'
  if (sides.has('dx')) return 'dx'
  if (sides.has('sx')) return 'sx'
  return 'diffusa'
}

export const LATERALITY_LABEL: Record<Laterality, string> = {
  sx: 'lato sinistro',
  dx: 'lato destro',
  bilaterale: 'bilaterale',
  diffusa: 'mediano / diffuso',
}

const SKULL_PATH =
  'M72,24 C42,24 28,48 28,86 C28,108 32,128 42,146 C50,160 60,174 72,174 C84,174 94,160 102,146 C112,128 116,108 116,86 C116,48 102,24 72,24 Z'

export default function HeadMap({
  value,
  onChange,
}: {
  value: string[]
  onChange: (zones: string[]) => void
}) {
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name])

  return (
    <svg className="headmap" viewBox="0 0 300 210" role="group" aria-label="Dove fa male">
      <defs>
        <path id="skull-shape" d={SKULL_PATH} />
      </defs>

      <use href="#skull-shape" className="skull" />
      <ellipse className="feat" cx="27" cy="98" rx="5" ry="9" />
      <ellipse className="feat" cx="117" cy="98" rx="5" ry="9" />
      <path className="feat" d="M72,100 q-4,9 -2.5,13 q2.5,2 5,0" />

      <g transform="translate(156,0)">
        <use href="#skull-shape" className="skull" />
        <ellipse className="feat" cx="27" cy="98" rx="5" ry="9" />
        <ellipse className="feat" cx="117" cy="98" rx="5" ry="9" />
      </g>

      {ZONES.map((z) => (
        <ellipse
          key={z.name}
          className={`zone${value.includes(z.name) ? ' is-on' : ''}`}
          cx={z.cx}
          cy={z.cy}
          rx={z.rx}
          ry={z.ry}
          role="button"
          tabIndex={0}
          aria-pressed={value.includes(z.name)}
          onClick={() => toggle(z.name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle(z.name)
            }
          }}
        >
          <title>{z.name}</title>
        </ellipse>
      ))}

      <text className="hlabel" x="72" y="197">
        FRONTE
      </text>
      <text className="hlabel" x="228" y="197">
        RETRO
      </text>
    </svg>
  )
}
