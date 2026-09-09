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
 * Vista provvisoria fronte + retro. Nella Fase 2 diventa un profilo unico
 * con toggle Sinistro/Destro (vedi memoria/prodotto).
 *
 * Lateralità dal punto di vista della PERSONA:
 * - fronte: la sua destra è alla nostra sinistra (specchio)
 * - retro: la sua destra è alla nostra destra
 */
const ZONES: readonly Zone[] = [
  { name: 'fronte', side: 'centro', cx: 72, cy: 44, rx: 30, ry: 12 },
  { name: 'tempia destra', side: 'dx', cx: 40, cy: 64, rx: 10, ry: 13 },
  { name: 'tempia sinistra', side: 'sx', cx: 104, cy: 64, rx: 10, ry: 13 },
  { name: 'orbita destra', side: 'dx', cx: 56, cy: 82, rx: 11, ry: 8 },
  { name: 'orbita sinistra', side: 'sx', cx: 88, cy: 82, rx: 11, ry: 8 },
  { name: 'vertice', side: 'centro', cx: 228, cy: 44, rx: 30, ry: 12 },
  { name: 'parietale sinistra', side: 'sx', cx: 200, cy: 70, rx: 12, ry: 15 },
  { name: 'parietale destra', side: 'dx', cx: 256, cy: 70, rx: 12, ry: 15 },
  { name: 'occipite', side: 'centro', cx: 228, cy: 100, rx: 25, ry: 13 },
  { name: 'nuca', side: 'centro', cx: 228, cy: 124, rx: 17, ry: 10 },
]

// --- traduzione zone -> testo ---

const LATERAL: Array<[suffix: string, side: 'sx' | 'dx']> = [
  [' sinistra', 'sx'],
  [' destra', 'dx'],
]

function parseZone(zone: string): { region: string; side: 'sx' | 'dx' | null } {
  for (const [suffix, side] of LATERAL) {
    if (zone.endsWith(suffix)) return { region: zone.slice(0, -suffix.length), side }
  }
  return { region: zone, side: null }
}

function italianList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

/** Lato memorizzato (per statistiche/stampa): null se nessuna zona laterale. */
export function lateralityFromZones(zoneNames: string[]): Laterality | null {
  const sides = new Set(zoneNames.map((z) => parseZone(z).side).filter(Boolean))
  if (sides.has('sx') && sides.has('dx')) return 'bilaterale'
  if (sides.has('sx')) return 'sx'
  if (sides.has('dx')) return 'dx'
  return null
}

/** Riassunto leggibile: "temporale e orbitale, sinistra" / "occipite". */
export function locationSummary(zoneNames: string[]): string {
  if (zoneNames.length === 0) return ''
  const parsed = zoneNames.map(parseZone)
  const regions = [...new Set(parsed.map((p) => p.region))]
  const laterality = lateralityFromZones(zoneNames)
  const suffix =
    laterality === 'bilaterale'
      ? ', bilaterale'
      : laterality === 'sx'
        ? ', sinistra'
        : laterality === 'dx'
          ? ', destra'
          : ''
  return italianList(regions) + suffix
}

const SKULL_PATH =
  'M72,26 C47,26 32,45 32,73 C32,93 35,110 45,122 C53,132 62,138 72,138 C82,138 91,132 99,122 C109,110 112,93 112,73 C112,45 97,26 72,26 Z'

function FaceOutline({ face = false }: { face?: boolean }) {
  return (
    <>
      <use href="#skull-shape" className="skull" />
      <path className="feat" d="M32,74 c-7,1 -9,8 -5,13 c2,3 6,4 8,1" />
      <path className="feat" d="M112,74 c7,1 9,8 5,13 c-2,3 -6,4 -8,1" />
      {face && (
        <>
          <path className="feat" d="M72,82 q-4,10 -3,14 q3,2 6,0" />
          <path className="feat" d="M64,106 h16" />
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
    <svg className="headmap" viewBox="0 0 300 178" role="group" aria-label="Dove fa male">
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

      <text className="hlabel" x="13" y="86">DX</text>
      <text className="hlabel" x="131" y="86">SX</text>
      <text className="hlabel" x="169" y="86">SX</text>
      <text className="hlabel" x="287" y="86">DX</text>

      <text className="hlabel" x="72" y="170">FRONTE</text>
      <text className="hlabel" x="228" y="170">RETRO</text>
    </svg>
  )
}
