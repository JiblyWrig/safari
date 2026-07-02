'use client'

import * as THREE from 'three'
import type { AnimState } from './multiplayer'

/**
 * Per-frame game stats written by the Player controller and read by the HUD
 * via requestAnimationFrame. Avoids React re-renders on every frame.
 */
export const stats = {
  speed: 0, // m/s
  stamina: 1, // 0..1
  anim: 'idle' as AnimState,
  pos: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  fps: 0,
  roaring: false,
  inWater: false,
}

export function resetStats() {
  stats.speed = 0
  stats.stamina = 1
  stats.anim = 'idle'
  stats.pos.set(0, 0, 0)
  stats.yaw = 0
  stats.fps = 0
  stats.roaring = false
  stats.inWater = false
}
