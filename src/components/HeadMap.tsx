import { useState } from 'react'
import type { Laterality } from '../lib/types'

interface ProfileZone {
  key: string
  lateral: boolean
  cx: number
  cy: number
  rx: number
  ry: number
}

/** Zone su una vista di PROFILO (naso a sinistra, nuca a destra). */
const ZONES: readonly ProfileZone[] = [
  { key: 'fronte', lateral: false, cx: 52, cy: 40, rx: 17, ry: 11 },
  { key: 'tempia', lateral: true, cx: 70, cy: 62, rx: 13, ry: 13 },
  { key: 'orbita', lateral: true, cx: 41, cy: 86, rx: 12, ry: 9 },
  { key: 'zigomo', lateral: true, cx: 53, cy: 111, rx: 13, ry: 10 },
  { key: 'vertice', lateral: false, cx: 100, cy: 26, rx: 26, ry: 11 },
  { key: 'occipite', lateral: false, cx: 143, cy: 70, rx: 16, ry: 15 },
  { key: 'nuca', lateral: false, cx: 123, cy: 122, rx: 15, ry: 11 },
]

const REGION_LABEL: Record<string, string> = {
  fronte: 'fronte',
  tempia: 'temporale',
  orbita: 'orbitale',
  zigomo: 'zigomo',
  vertice: 'vertice',
  occipite: 'occipite',
  nuca: 'nuca',
}

// --- traduzione zone -> testo (indipendente dalla vista) ---

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

/** Lato memorizzato (statistiche/stampa): null se nessuna zona laterale. */
export function lateralityFromZones(zoneNames: string[]): Laterality | null {
  const sides = new Set(zoneNames.map((z) => parseZone(z).side).filter(Boolean))
  if (sides.has('sx') && sides.has('dx')) return 'bilaterale'
  if (sides.has('sx')) return 'sx'
  if (sides.has('dx')) return 'dx'
  return null
}

/** "temporale e orbitale, sinistra" · "occipite" */
export function locationSummary(zoneNames: string[]): string {
  if (zoneNames.length === 0) return ''
  const regions = [
    ...new Set(zoneNames.map((z) => REGION_LABEL[parseZone(z).region] ?? parseZone(z).region)),
  ]
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

// --- disegno ---

const PROFILE_PATH =
  'M100,16 C136,16 162,40 165,80 C167,106 160,126 146,137 C139,142 131,146 121,147 C102,150 74,151 60,146 C54,144 49,138 47,131 C46,126 47,120 45,115 C40,112 31,111 24,107 C21,105 22,100 26,97 C33,94 41,92 44,85 C46,78 43,71 45,62 C47,42 50,22 72,17 C80,15 90,15 100,16 Z'

const EAR_PATH =
  'M80,80 c-8,-1 -13,6 -12,14 c1,7 8,11 14,9 c-5,-2 -8,-6 -7,-11 c1,-4 5,-8 5,-11 Z'

export default function HeadMap({
  value,
  onChange,
}: {
  value: string[]
  onChange: (zones: string[]) => void
}) {
  const hasLeft = value.some((z) => z.endsWith(' sinistra'))
  const hasRight = value.some((z) => z.endsWith(' destra'))
  const [side, setSide] = useState<'sx' | 'dx'>(hasRight && !hasLeft ? 'dx' : 'sx')

  const sideWord = side === 'sx' ? 'sinistra' : 'destra'
  const nameFor = (z: ProfileZone) => (z.lateral ? `${z.key} ${sideWord}` : z.key)
  const isSelected = (z: ProfileZone) => value.includes(nameFor(z))
  const toggle = (z: ProfileZone) => {
    const n = nameFor(z)
    onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n])
  }

  return (
    <div className="headmap-wrap">
      <div className="side-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={side === 'sx'}
          className={side === 'sx' ? 'is-on' : undefined}
          onClick={() => setSide('sx')}
        >
          Sinistro
          {hasLeft && <i className="side-dot" aria-hidden="true" />}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={side === 'dx'}
          className={side === 'dx' ? 'is-on' : undefined}
          onClick={() => setSide('dx')}
        >
          Destro
          {hasRight && <i className="side-dot" aria-hidden="true" />}
        </button>
      </div>

      <svg
        className="headmap"
        viewBox="0 0 200 172"
        role="group"
        aria-label={`Profilo ${side === 'sx' ? 'sinistro' : 'destro'}`}
      >
        <g transform={side === 'dx' ? 'translate(200,0) scale(-1,1)' : undefined}>
          <path className="skull" d={PROFILE_PATH} />
          <path className="feat" d={EAR_PATH} />
          {ZONES.map((z) => (
            <ellipse
              key={z.key}
              className={`zone${isSelected(z) ? ' is-on' : ''}`}
              cx={z.cx}
              cy={z.cy}
              rx={z.rx}
              ry={z.ry}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected(z)}
              onClick={() => toggle(z)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(z)
                }
              }}
            >
              <title>{REGION_LABEL[z.key]}</title>
            </ellipse>
          ))}
        </g>
      </svg>
    </div>
  )
}
