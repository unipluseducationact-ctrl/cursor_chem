/** Discrete angle (degrees), 0 = top, clockwise. Shell 0 uses 2 positions; outer shells use 8 (45° steps). */

export interface ElectronSlot {
  shellIndex: number
  angleDeg: number
}

export interface ElementData {
  z: number
  symbol: string
  nameEn: string
  nameZh: string
  massNumber: number
  /** Electrons per shell from inner (K) to outer, e.g. [2,8,8,1] for K */
  shellCounts: number[]
  expectedShells: number
  templateSlots: ElectronSlot[]
}

function evenlySpacedAngles(count: number): number[] {
  if (count <= 0) return []
  const step = 360 / count
  const angles: number[] = []
  for (let i = 0; i < count; i++) angles.push(i * step)
  return angles
}

const SHELL0_ANGLES = evenlySpacedAngles(6)
const SHELL1PLUS_ANGLES = evenlySpacedAngles(16)

// Order to suggest visually even filling first (top, bottom, right, left, then diagonals...).
const PREFERRED_FILL_ORDER = [0, 180, 90, 270, 45, 135, 225, 315]

function preferredOrderForAngles(angles: number[]): number[] {
  const set = new Set(angles.map((a) => ((a % 360) + 360) % 360))
  const ordered: number[] = []
  for (const a of PREFERRED_FILL_ORDER) {
    if (set.has(a)) ordered.push(a)
  }
  for (const a of angles) {
    const norm = ((a % 360) + 360) % 360
    if (!ordered.includes(norm)) ordered.push(norm)
  }
  return ordered
}

function anglesForShell(shellIndex: number, count: number): number[] {
  if (count <= 0) return []
  const all = validAnglesForShell(shellIndex)
  const order = preferredOrderForAngles(all)
  return order.slice(0, Math.min(count, all.length))
}

export function shellCountsToSlots(shellCounts: number[]): ElectronSlot[] {
  const slots: ElectronSlot[] = []
  shellCounts.forEach((n, shellIndex) => {
    if (n === 0) return
    anglesForShell(shellIndex, n).forEach((angleDeg) => {
      slots.push({ shellIndex, angleDeg })
    })
  })
  return slots
}

function make(
  z: number,
  symbol: string,
  nameEn: string,
  nameZh: string,
  massNumber: number,
  shellCounts: number[]
): ElementData {
  const nonZero = shellCounts.filter((n) => n > 0)
  const expectedShells = nonZero.length
  const trimmed = [...shellCounts]
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === 0) trimmed.pop()
  return {
    z,
    symbol,
    nameEn,
    nameZh,
    massNumber,
    shellCounts: trimmed.length ? trimmed : shellCounts,
    expectedShells,
    templateSlots: shellCountsToSlots(shellCounts),
  }
}

/** Elements 1–20 (H–Ca). Mass numbers are common teaching isotopes. */
export const ELEMENTS: ElementData[] = [
  make(1, 'H', 'Hydrogen', '氫', 1, [1]),
  make(2, 'He', 'Helium', '氦', 4, [2]),
  make(3, 'Li', 'Lithium', '鋰', 7, [2, 1]),
  make(4, 'Be', 'Beryllium', '鈹', 9, [2, 2]),
  make(5, 'B', 'Boron', '硼', 11, [2, 3]),
  make(6, 'C', 'Carbon', '碳', 12, [2, 4]),
  make(7, 'N', 'Nitrogen', '氮', 14, [2, 5]),
  make(8, 'O', 'Oxygen', '氧', 16, [2, 6]),
  make(9, 'F', 'Fluorine', '氟', 19, [2, 7]),
  make(10, 'Ne', 'Neon', '氖', 20, [2, 8]),
  make(11, 'Na', 'Sodium', '鈉', 23, [2, 8, 1]),
  make(12, 'Mg', 'Magnesium', '鎂', 24, [2, 8, 2]),
  make(13, 'Al', 'Aluminium', '鋁', 27, [2, 8, 3]),
  make(14, 'Si', 'Silicon', '矽', 28, [2, 8, 4]),
  make(15, 'P', 'Phosphorus', '磷', 31, [2, 8, 5]),
  make(16, 'S', 'Sulfur', '硫', 32, [2, 8, 6]),
  make(17, 'Cl', 'Chlorine', '氯', 35, [2, 8, 7]),
  make(18, 'Ar', 'Argon', '氬', 40, [2, 8, 8]),
  make(19, 'K', 'Potassium', '鉀', 39, [2, 8, 8, 1]),
  make(20, 'Ca', 'Calcium', '鈣', 40, [2, 8, 8, 2]),
]

export const ELEMENT_BY_Z = new Map(ELEMENTS.map((e) => [e.z, e]))

export const MAX_SHELLS = 4

/** All valid snap angles for a shell index (for hit-testing). */
export function validAnglesForShell(shellIndex: number): number[] {
  // Shell capacities for this quiz:
  // - shell 0 (K): max 6
  // - shell 1+ (L/M/N...): max 16 (including shell 4+ per requirements)
  if (shellIndex === 0) return [...SHELL0_ANGLES]
  return [...SHELL1PLUS_ANGLES]
}

export function slotKey(shellIndex: number, angleDeg: number): string {
  return `${shellIndex}:${angleDeg}`
}
