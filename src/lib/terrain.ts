import { fbm } from './textures'

export const WORLD_SIZE = 240 // world spans -120..120 on X and Z
export const WATER_LEVEL = -1.4

/**
 * Terrain height function. Used by both the visual mesh and the player
 * controller so the lion always sits on the ground. Smooth rolling savannah
 * hills with a watering-hole depression in the SE quadrant and a small
 * rocky ridge in the NW.
 */
export function terrainHeight(x: number, z: number): number {
  // base rolling hills
  let h = fbm(x * 0.012, z * 0.012, 4, 10) * 8 - 3
  // gentle large-scale undulation
  h += Math.sin(x * 0.03) * Math.cos(z * 0.025) * 1.6
  // ridge in NW
  const ridgeDist = Math.hypot(x + 80, z + 80)
  if (ridgeDist < 38) {
    h += (1 - ridgeDist / 38) * 7
  }
  // watering hole depression (SE)
  const waterDist = Math.hypot(x - 70, z - 70)
  if (waterDist < 26) {
    const t = 1 - waterDist / 26
    h -= t * t * 9
  }
  // flatten spawn area near origin
  const spawnDist = Math.hypot(x, z)
  if (spawnDist < 14) {
    const t = spawnDist / 14
    h *= t * t
  }
  return h
}

export type DecorationType =
  | 'acacia'
  | 'rock'
  | 'bush'
  | 'termite'
  | 'grass'
  | 'deadtree'

export interface Decoration {
  type: DecorationType
  x: number
  z: number
  y: number
  scale: number
  rot: number
  variant: number
}

// Mulberry32 deterministic PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DECORATION_COUNTS: Record<DecorationType, number> = {
  acacia: 60,
  deadtree: 12,
  rock: 40,
  bush: 80,
  termite: 14,
  grass: 220,
}

let cachedDecorations: Decoration[] | null = null

export function getDecorations(seed = 1337): Decoration[] {
  if (cachedDecorations) return cachedDecorations
  const rng = mulberry32(seed)
  const out: Decoration[] = []
  const half = WORLD_SIZE / 2 - 6

  const place = (type: DecorationType) => {
    const count = DECORATION_COUNTS[type]
    for (let i = 0; i < count; i++) {
      // try a few times to find a valid spot
      for (let attempt = 0; attempt < 8; attempt++) {
        const x = (rng() * 2 - 1) * half
        const z = (rng() * 2 - 1) * half
        const y = terrainHeight(x, z)
        if (y < WATER_LEVEL + 0.3) continue // not in water
        if (Math.hypot(x, z) < 8) continue // keep spawn clear
        // spread out trees a bit
        if ((type === 'acacia' || type === 'deadtree') && attempt < 4) {
          let tooClose = false
          for (const d of out) {
            if (
              (d.type === 'acacia' || d.type === 'deadtree') &&
              Math.hypot(d.x - x, d.z - z) < 9
            ) {
              tooClose = true
              break
            }
          }
          if (tooClose) continue
        }
        const scale =
          type === 'grass'
            ? 0.6 + rng() * 0.8
            : type === 'bush'
              ? 0.7 + rng() * 0.7
              : type === 'termite'
                ? 0.8 + rng() * 0.6
                : 0.85 + rng() * 0.7
        out.push({
          type,
          x,
          z,
          y,
          scale,
          rot: rng() * Math.PI * 2,
          variant: Math.floor(rng() * 3),
        })
        break
      }
    }
  }

  ;(Object.keys(DECORATION_COUNTS) as DecorationType[]).forEach(place)
  cachedDecorations = out
  return out
}

/** True if a position is inside the watering hole (used to block walking underwater). */
export function isInWater(x: number, z: number): boolean {
  const waterDist = Math.hypot(x - 70, z - 70)
  return waterDist < 22 && terrainHeight(x, z) < WATER_LEVEL + 0.2
}
