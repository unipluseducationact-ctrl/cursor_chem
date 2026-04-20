import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_SHELLS, validAnglesForShell, type ElectronSlot } from '../data/elements'

const CX = 220
// Slightly lower center so the outer shell doesn't clip at the bottom
const CY = 220
const R0 = 52
const DR = 54
const SNAP_PX = 56

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
  const poolRef = useRef<HTMLDivElement>(null)
  const placementsRef = useRef(placements)
  placementsRef.current = placements
  const shellCountRef = useRef(shellCount)
  shellCountRef.current = shellCount

  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null)
  const originRef = useRef<ElectronSlot | null | 'pool'>('pool')

  const findNearestSlot = useCallback((clientX: number, clientY: number): ElectronSlot | null => {
    const svg = svgRef.current
    const sc = shellCountRef.current
    if (!svg || sc <= 0) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const svgP = pt.matrixTransform(ctm.inverse())
    let best: ElectronSlot | null = null
    let bestD = Infinity
    for (let s = 0; s < sc; s++) {
      for (const ang of validAnglesForShell(s)) {
        const { x, y } = shellXY(s, ang)
        const d = Math.hypot(svgP.x - x, svgP.y - y)
        if (d < bestD) {
          bestD = d
          best = { shellIndex: s, angleDeg: ang }
        }
      }
    }
    if (best && bestD <= SNAP_PX) return best
    return null
  }, [])

  const isOverPool = (clientX: number, clientY: number) => {
    const el = poolRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return (
      clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
    )
  }

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

  const addShell = () => {
    if (readOnly) return
    if (shellCount < MAX_SHELLS) onShellCountChange(shellCount + 1)
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

  const finishDrag = useCallback(
    (id: number, clientX: number, clientY: number) => {
      if (isOverPool(clientX, clientY)) {
        applyPlacement(id, null)
      } else {
        const slot = findNearestSlot(clientX, clientY)
        if (slot) applyPlacement(id, slot)
        else if (originRef.current !== 'pool' && originRef.current) {
          applyPlacement(id, originRef.current)
        } else {
          applyPlacement(id, null)
        }
      }
      setDraggingId(null)
      setFloatPos(null)
    },
    [findNearestSlot]
  )

  const onPointerDownElectron = (id: number, e: React.PointerEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    const cur = placementsRef.current[id]
    originRef.current = cur === null ? 'pool' : cur
    setDraggingId(id)
    setFloatPos({ x: e.clientX, y: e.clientY })

    const move = (ev: PointerEvent) => {
      setFloatPos({ x: ev.clientX, y: ev.clientY })
    }
    const up = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      finishDrag(id, ev.clientX, ev.clientY)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  const poolIds = placements
    .map((p, i) => (p === null ? i : -1))
    .filter((i) => i >= 0)

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
          <circle
            key={s}
            cx={CX}
            cy={CY}
            r={radiusForShell(s)}
            className="bohr-shell"
            fill="none"
          />
        ))}

        {placements.map((p, id) => {
          if (!p || draggingId === id) return null
          const { x, y } = shellXY(p.shellIndex, p.angleDeg)
          return (
            <g key={`e-ring-${id}`}>
              <circle
                cx={x}
                cy={y}
                r={24}
                className="bohr-hit"
                onPointerDown={(e) => onPointerDownElectron(id, e)}
                style={{ cursor: readOnly ? 'default' : 'grab' }}
              />
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

      <div className="electron-pool-label">{t('electronPool')}</div>
      <div ref={poolRef} className="electron-pool">
        {poolIds.map((id) => (
          <button
            key={`pool-${id}`}
            type="button"
            className="electron-pool__item"
            disabled={readOnly}
            onPointerDown={(e) => onPointerDownElectron(id, e)}
            aria-label={`Electron ${id + 1}`}
          >
            ×
          </button>
        ))}
      </div>

      {draggingId !== null && floatPos && (
        <div
          className="electron-float"
          style={{ left: floatPos.x - 18, top: floatPos.y - 18 }}
        >
          ×
        </div>
      )}

      <p className="bohr-meta">
        Z = {atomicNumber} · {t('electronPool')}: {poolIds.length} / {atomicNumber}
      </p>
    </div>
  )
}
