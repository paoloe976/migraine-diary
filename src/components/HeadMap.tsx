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
 * Lateralità dal punto di vista della PERSONA.
 * - Vista frontale: la sua destra è alla nostra sinistra (come uno specchio).
 * - Vista posteriore: la sua destra è alla nostra destra.
 */
const ZONES: readonly Zone[] = [
  // --- fronte (testa centrata su x = 72) ---
  { name: 'fronte', side: 'centro', cx: 72, cy: 44, rx: 30, ry: 12 },
  { name: 'tempia destra', side: 'dx', cx: 40, cy: 64, rx: 10, ry: 13 },
  { name: 'tempia sinistra', side: 'sx', cx: 104, cy: 64, rx: 10, ry: 13 },
  { name: 'zona occhio destra', side: 'dx', cx: 56, cy: 82, rx: 11, ry: 8 },
  { name: 'zona occhio sinistra', side: 'sx', cx: 88, cy: 82, rx: 11, ry: 8 },
  // --- retro (testa centrata su x = 228) ---
  { name: 'vertice', side: 'centro', cx: 228, cy: 44, rx: 30, ry: 12 },
  { name: 'parietale sinistra', side: 'sx', cx: 200, cy: 72, rx: 12, ry: 15 },
  { name: 'parietale destra', side: 'dx', cx: 256, cy: 72, rx: 12, ry: 15 },
  { name: 'occipite', side: 'centro', cx: 228, cy: 104, rx: 25, ry: 14 },
  { name: 'nuca', side: 'centro', cx: 228, cy: 130, rx: 17, ry: 10 },
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
  'M72,28 C46,28 30,48 30,78 C30,98 36,116 48,128 C57,138 64,146 72,146 C80,146 87,138 96,128 C108,116 114,98 114,78 C114,48 98,28 72,28 Z'

function FaceOutline({ face = false }: { face?: boolean }) {
  return (
    <>
      <use href="#skull-shape" className="skull" />
      <path className="feat" d="M31,78 c-7,1 -9,8 -5,13 c2,3 6,4 8,1" />
      <path className="feat" d="M113,78 c7,1 9,8 5,13 c-2,3 -6,4 -8,1" />
      {face && (
        <>
          <path className="feat" d="M72,84 q-4,11 -3,16 q3,2 6,0" />
          <path className="feat" d="M64,112 h16" />
        </>
      )}
    </>
  )
}

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
    <svg className="headmap" viewBox="0 0 300 188" role="group" aria-label="Dove fa male">
      <defs>
        <path id="skull-shape" d={SKULL_PATH} />
      </defs>

      <FaceOutline face />
      <g transform="translate(156,0)">
        <FaceOutline />
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

      {/* orientamento: lato della PERSONA */}
      <text className="hlabel" x="13" y="90">DX</text>
      <text className="hlabel" x="131" y="90">SX</text>
      <text className="hlabel" x="169" y="90">SX</text>
      <text className="hlabel" x="287" y="90">DX</text>

      <text className="hlabel" x="72" y="180">FRONTE</text>
      <text className="hlabel" x="228" y="180">RETRO</text>
    </svg>
  )
}
