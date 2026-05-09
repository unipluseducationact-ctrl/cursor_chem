import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_SHELLS, validAnglesForShell, type ElectronSlot } from '../data/elements'

const CX = 220
// Slightly lower center so the outer shell doesn't clip at the bottom
const CY = 220
const R0 = 52
const DR = 54
const PAIR_SPREAD_DEG = 11

// Order to suggest visually even filling first (top, bottom, right, left, then diagonals...).
const PREFERRED_FILL_ORDER = [0, 180, 90, 270, 45, 135, 225, 315]

function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360
}

function nearestValidAngle(valid: number[], targetDeg: number): number {
  const t = normalizeAngle(targetDeg)
  let best = valid[0]!
  let bestD = Infinity
  for (const a of valid) {
    const d = Math.abs(((a - t + 180) % 360) - 180)
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best
}

function pairAnglesAt(valid: number[], centerDeg: number, spreadDeg: number): [number, number] {
  let a1 = nearestValidAngle(valid, centerDeg - spreadDeg)
  let a2 = nearestValidAngle(valid, centerDeg + spreadDeg)
  if (a1 !== a2) return [a1, a2]
  const i = valid.indexOf(a1)
  if (i >= 0 && valid.length > 1) {
    a2 = valid[(i + 1) % valid.length]!
  }
  return [a1, a2]
}

function preferredAnglesForShell(shellIndex: number): number[] {
  const valid = validAnglesForShell(shellIndex).map(normalizeAngle)
  const set = new Set(valid)
  const out: number[] = []
  for (const a of PREFERRED_FILL_ORDER) {
    if (set.has(a)) out.push(a)
  }
  for (const a of valid) {
    if (!out.includes(a)) out.push(a)
  }
  return out
}

function preferredAnglesForOuterShell(shellIndex: number): number[] {
  const valid = validAnglesForShell(shellIndex).map(normalizeAngle)
  const centers = PREFERRED_FILL_ORDER
  const out: number[] = []
  for (const c of centers) {
    const [a, b] = pairAnglesAt(valid, c, PAIR_SPREAD_DEG)
    out.push(a, b)
  }
  // Fill any remaining valid angles not covered by pairs (should be none for 16-angle shells)
  for (const a of valid) {
    if (!out.includes(a)) out.push(a)
  }
  return out
}

function radiusForShell(shellIndex: number): number {
  return R0 + shellIndex * DR
}

export function shellXY(shellIndex: number, angleDeg: number): { x: number; y: number } {
  const r = radiusForShell(shellIndex)
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + r * Math.sin(rad),
    y: CY - r * Math.cos(rad),
  }
}

function slotKey(s: ElectronSlot): string {
  return `${s.shellIndex}:${s.angleDeg}`
}

function ordinalLabel(n: number): string {
  const s = n % 100
  if (s >= 11 && s <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

type Props = {
  atomicNumber: number
  centerLabel?: string
  shellCount: number
  onShellCountChange: (n: number) => void
  placements: (ElectronSlot | null)[]
  onPlacementsChange: (next: (ElectronSlot | null)[]) => void
  readOnly?: boolean
}

export function BohrDiagram({
  atomicNumber,
  centerLabel,
  shellCount,
  onShellCountChange,
  placements,
  onPlacementsChange,
  readOnly,
}: Props) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const placementsRef = useRef(placements)
  placementsRef.current = placements
  const shellCountRef = useRef(shellCount)
  shellCountRef.current = shellCount

  const applyPlacement = (electronId: number, slot: ElectronSlot | null) => {
    const prev = placementsRef.current
    const next = [...prev]
    const prevAtTarget =
      slot !== null
        ? next.findIndex(
            (p, i) => i !== electronId && p !== null && slotKey(p) === slotKey(slot)
          )
        : -1
    if (prevAtTarget >= 0) next[prevAtTarget] = null
    next[electronId] = slot
    onPlacementsChange(next)
  }

  const nextPoolId = useCallback((): number | null => {
    const prev = placementsRef.current
    const i = prev.findIndex((p) => p === null)
    return i >= 0 ? i : null
  }, [])

  const nextSlotInShell = useCallback(
    (shellIndex: number): ElectronSlot | null => {
      const sc = shellCountRef.current
      if (shellIndex < 0 || shellIndex >= sc) return null
      const prev = placementsRef.current
      const taken = new Set(
        prev
          .filter((p): p is ElectronSlot => !!p && p.shellIndex === shellIndex)
          .map((p) => slotKey(p))
      )
      const angles =
        shellIndex === 0 ? preferredAnglesForShell(shellIndex) : preferredAnglesForOuterShell(shellIndex)
      for (const a of angles) {
        const slot = { shellIndex, angleDeg: a }
        if (!taken.has(slotKey(slot))) return slot
      }
      return null
    },
    []
  )

  const addElectronToShell = useCallback(
    (shellIndex: number) => {
      if (readOnly) return
      const id = nextPoolId()
      if (id === null) return
      const slot = nextSlotInShell(shellIndex)
      if (!slot) return
      applyPlacement(id, slot)
    },
    [nextPoolId, nextSlotInShell, readOnly]
  )

  const addShell = () => {
    if (readOnly) return
    if (shellCount < MAX_SHELLS) onShellCountChange(shellCount + 1)
  }

  const reverseLast = () => {
    if (readOnly) return
    const prev = placementsRef.current
    // Undo: remove the most recently assigned electron (highest id with a slot).
    for (let id = prev.length - 1; id >= 0; id--) {
      if (prev[id] !== null) {
        applyPlacement(id, null)
        break
      }
    }
  }

  const removeShell = () => {
    if (readOnly) return
    if (shellCount <= 0) return
    const nextCount = shellCount - 1
    const newPlacements = placementsRef.current.map((p) => {
      if (!p || p.shellIndex >= nextCount) return null
      return p
    })
    onPlacementsChange(newPlacements)
    onShellCountChange(nextCount)
  }

  const perShellPlaced = useMemo(() => {
    const counts = Array.from({ length: Math.max(0, shellCount) }, () => 0)
    for (const p of placements) {
      if (!p) continue
      if (p.shellIndex >= 0 && p.shellIndex < counts.length) counts[p.shellIndex] += 1
    }
    return counts
  }, [placements, shellCount])

  const remaining = useMemo(() => placements.filter((p) => p === null).length, [placements])

  const nucleusLabel = centerLabel?.trim() || '?'
  const nucleusFontSize = nucleusLabel.length >= 3 ? 14 : nucleusLabel.length === 2 ? 16 : 18

  return (
    <div className="bohr-wrap">
      <p className="bohr-wrap__title">{t('diagramTitle')}</p>
      <div className="bohr-controls">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={addShell}
          disabled={readOnly || shellCount >= MAX_SHELLS}
        >
          {t('addShell')}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={removeShell}
          disabled={readOnly || shellCount <= 0}
        >
          {t('removeShell')}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={reverseLast}
          disabled={readOnly || remaining === atomicNumber}
        >
          {t('reverse')}
        </button>
      </div>
      <svg
        ref={svgRef}
        className="bohr-svg"
        viewBox="0 0 440 440"
        role="img"
        aria-label={t('diagramTitle')}
      >
        <text
          x={CX}
          y={CY + 6}
          textAnchor="middle"
          className="bohr-nucleus-q"
          style={{ fontSize: nucleusFontSize }}
        >
          {nucleusLabel}
        </text>

        {Array.from({ length: shellCount }, (_, s) => (
          <g key={s}>
            <circle
              cx={CX}
              cy={CY}
              r={radiusForShell(s)}
              className="bohr-shell"
              fill="none"
              pointerEvents="none"
            />
            <circle
              cx={CX}
              cy={CY}
              r={radiusForShell(s)}
              fill="none"
              stroke="transparent"
              strokeWidth={26}
              pointerEvents="stroke"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addElectronToShell(s)
              }}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}
            />
          </g>
        ))}

        {placements.map((p, id) => {
          if (!p) return null
          const { x, y } = shellXY(p.shellIndex, p.angleDeg)
          return (
            <g key={`e-ring-${id}`}>
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                className="bohr-electron"
                pointerEvents="none"
              >
                ×
              </text>
            </g>
          )
        })}
      </svg>

      <div className="shell-boxes" aria-label={t('electronBoxesLabel')}>
        {Array.from({ length: shellCount }, (_, i) => {
          const shellLabel = `${ordinalLabel(i + 1)}`
          const n = perShellPlaced[i] ?? 0
          return (
            <div key={i} className="shell-box" aria-label={`${shellLabel}: ${n}`}>
              <div className="shell-box__label">{shellLabel}</div>
              <div className="shell-box__slots" aria-hidden="true">
                {Array.from({ length: n }, (_, j) => (
                  <span key={j} className="shell-box__e">
                    ×
                  </span>
                ))}
              </div>
              <div className="shell-box__count">
                {n}
              </div>
            </div>
          )
        })}
      </div>

      <p className="bohr-meta">
        Z = {atomicNumber} · {t('remainingElectrons', { remaining, total: atomicNumber })}
      </p>
    </div>
  )
}
