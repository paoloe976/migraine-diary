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

/**
 * Zone su una vista di PROFILO. Silhouette tracciata dal riferimento
 * (naso a DESTRA = profilo destro; per il profilo sinistro si specchia).
 */
const ZONES: readonly ProfileZone[] = [
  { key: 'vertice', lateral: false, cx: 76, cy: 17, rx: 22, ry: 9 },
  { key: 'fronte', lateral: false, cx: 97, cy: 41, rx: 14, ry: 11 },
  { key: 'tempia', lateral: true, cx: 90, cy: 64, rx: 12, ry: 12 },
  { key: 'orbita', lateral: true, cx: 114, cy: 72, rx: 10, ry: 8 },
  { key: 'zigomo', lateral: true, cx: 106, cy: 99, rx: 12, ry: 10 },
  { key: 'occipite', lateral: false, cx: 31, cy: 63, rx: 15, ry: 15 },
  { key: 'nuca', lateral: false, cx: 45, cy: 118, rx: 14, ry: 12 },
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

// --- disegno (silhouette tracciata dall'immagine di riferimento) ---

const HEAD_W = 138
const HEAD_H = 190

const HEAD_PATH =
  'M83.5,181.5 Q79.8,182.1 73.9,182.0 Q67.9,181.9 61.8,180.9 Q55.7,180.0 52.3,179.2 Q48.8,178.3 41.5,175.7 Q34.2,173.0 28.8,171.7 Q23.4,170.4 17.4,169.5 Q11.4,168.7 10.2,168.3 Q9.0,168.0 8.5,167.5 Q7.9,166.9 7.9,166.1 Q7.9,165.3 9.2,162.5 Q10.4,159.7 14.5,153.5 Q18.7,147.3 20.6,143.7 Q22.4,140.1 24.3,133.9 Q26.1,127.8 26.8,123.4 Q27.4,118.9 27.4,115.4 Q27.4,111.9 26.5,108.0 Q25.6,104.1 23.7,100.4 Q21.9,96.7 17.1,88.9 Q12.4,81.1 11.4,78.9 Q10.4,76.6 9.5,73.9 Q8.7,71.1 8.2,67.9 Q7.8,64.8 7.8,61.1 Q7.8,57.4 8.8,51.6 Q9.8,45.9 11.4,41.6 Q13.0,37.3 14.4,34.6 Q15.9,32.0 18.1,29.0 Q20.2,26.0 22.8,23.4 Q25.5,20.7 29.1,18.2 Q32.7,15.7 36.0,14.2 Q39.4,12.6 43.0,11.4 Q46.6,10.2 50.5,9.3 Q54.4,8.5 58.9,8.1 Q63.5,7.8 66.2,7.9 Q68.9,7.9 71.6,8.3 Q74.4,8.7 78.7,9.7 Q82.9,10.7 87.2,12.3 Q91.5,13.9 94.9,15.7 Q98.3,17.6 101.3,19.8 Q104.3,22.0 106.4,24.2 Q108.6,26.4 111.9,30.9 Q115.1,35.5 116.2,37.9 Q117.3,40.3 118.2,43.1 Q119.0,45.9 120.5,52.9 Q122.0,60.0 121.8,62.5 Q121.6,65.0 120.3,67.8 Q119.0,70.7 119.1,72.3 Q119.2,73.9 121.7,78.6 Q124.2,83.3 126.9,87.1 Q129.6,90.9 130.0,92.1 Q130.5,93.3 130.4,94.1 Q130.3,94.8 129.5,95.9 Q128.7,96.9 126.2,98.2 Q123.6,99.4 122.8,100.3 Q122.0,101.3 121.9,102.9 Q121.8,104.5 122.1,106.5 Q122.3,108.5 121.3,110.1 Q120.3,111.7 120.6,113.5 Q120.9,115.4 119.2,117.5 Q117.5,119.7 117.4,121.1 Q117.3,122.6 117.8,125.3 Q118.3,128.0 117.7,129.6 Q117.2,131.2 116.4,132.1 Q115.6,133.1 114.6,133.8 Q113.5,134.4 112.0,134.8 Q110.4,135.1 103.9,134.3 Q97.4,133.5 93.7,133.5 Q90.0,133.5 88.3,134.0 Q86.7,134.6 85.8,135.5 Q84.9,136.3 81.7,145.4 Q78.6,154.5 78.5,157.2 Q78.4,159.9 78.8,160.7 Q79.1,161.6 83.3,166.6 Q87.5,171.6 88.8,174.0 Q90.1,176.4 90.2,177.5 Q90.3,178.6 89.7,179.3 Q89.1,180.0 88.1,180.5 Q87.2,180.9 83.5,181.5 Z'

/** Orecchio: piccola curva nello stile del contorno. */
const EAR_PATH = 'M55,83 c-5,0 -9,5 -8,11 c1,5 5,8 10,7'

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

  // l'immagine è un profilo DESTRO: per il sinistro si specchia
  const flip = side === 'sx'

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
        viewBox={`0 0 ${HEAD_W} ${HEAD_H}`}
        role="group"
        aria-label={`Profilo ${side === 'sx' ? 'sinistro' : 'destro'}`}
      >
        <g transform={flip ? `translate(${HEAD_W},0) scale(-1,1)` : undefined}>
          <path className="skull" d={HEAD_PATH} />
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
