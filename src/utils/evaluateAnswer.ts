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
    // Validate distribution across shells, not exact angular positions.
    // Students can place electrons anywhere on a shell; only the shell counts matter.
    const expectedCounts = element.shellCounts
    const maxShell = Math.max(expectedCounts.length, shellCount)
    const placedCounts = Array.from({ length: maxShell }, () => 0)

    for (const p of placements) {
      if (!p) continue
      if (p.shellIndex < 0 || p.shellIndex >= maxShell) {
        reasons.push('reason_wrongElectrons')
        break
      }
      placedCounts[p.shellIndex]++
    }

    if (!reasons.includes('reason_wrongElectrons')) {
      for (let i = 0; i < maxShell; i++) {
        const expectedInShell = expectedCounts[i] ?? 0
        if (placedCounts[i] !== expectedInShell) {
          reasons.push('reason_wrongElectrons')
          break
        }
      }
    }
  }

  const uniq = [...new Set(reasons)]
  return { correct: uniq.length === 0, reasons: uniq }
}
