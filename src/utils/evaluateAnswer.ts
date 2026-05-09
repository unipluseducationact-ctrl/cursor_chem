import type { ElementData } from '../data/elements'
import type { ElectronSlot } from '../data/elements'

export function normalizeSymbol(input: string): string {
  return input.trim()
}

export function evaluateAnswer(
  element: ElementData,
  symbolInput: string,
  shellCount: number,
  placements: (ElectronSlot | null)[]
): { correct: boolean; reasons: string[] } {
  const reasons: string[] = []
  const yours = normalizeSymbol(symbolInput)
  const expected = element.symbol
  if (yours !== expected) reasons.push('reason_wrongSymbol')
  if (shellCount !== element.expectedShells) reasons.push('reason_wrongShells')

  const allPlaced = placements.length === element.z && placements.every((p) => p !== null)
  if (!allPlaced) reasons.push('reason_wrongElectrons')
  else {
    // Enforce the quiz pattern:
    // - Shell 0 (K): singles spaced out (e.g. 2 electrons opposite).
    // - Shell 1+ (L/M/N…): electrons appear as pairs.
    // This is represented by `element.templateSlots` (shell + snap angle).
    const key = (p: ElectronSlot) => `${p.shellIndex}:${p.angleDeg}`
    const expected = element.templateSlots.slice(0, element.z).map(key).sort()
    const yours = placements
      .filter((p): p is ElectronSlot => p !== null)
      .map(key)
      .sort()
    if (expected.length !== yours.length) {
      reasons.push('reason_wrongElectrons')
    } else {
      for (let i = 0; i < expected.length; i++) {
        if (expected[i] !== yours[i]) {
          reasons.push('reason_wrongElectrons')
          break
        }
      }
    }
  }

  const uniq = [...new Set(reasons)]
  return { correct: uniq.length === 0, reasons: uniq }
}
