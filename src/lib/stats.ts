'use client'

import * as THREE from 'three'
import type { AnimState } from './multiplayer'

/**
 * Per-frame game stats written by the Player controller and read by the HUD
 * via requestAnimationFrame. Avoids React re-renders on every frame.
 */
export const stats = {
  speed: 0, // m/s
  stamina: 1, // kept for compat (unused now — infinite sprint)
  health: 1, // 0..1 (1 = full health)
  anim: 'idle' as AnimState,
  pos: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  fps: 0,
  roaring: false,
  attacking: false, // paw swing in progress
  inWater: false,
  drinking: false,
  dead: false,
  respawnAt: 0,
  // --- hunting ---
  hunts: 0, // number of prey caught
  huntToastAt: 0, // performance.now() ms of last catch (for HUD toast)
  // --- session ---
  sessionStart: 0, // performance.now() ms when game started
  __lastName: 'Lion', // cached for leaderboard submit after reset
  __lastColor: '#c98a3a',
  // --- environment ---
  dayTime: 0.4, // 0..1 cycle (0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk)
  isNight: false,
  // --- weather ---
  rainIntensity: 0, // 0..1 current rain strength
  isRaining: false,
}

export function resetStats() {
  stats.speed = 0
  stats.stamina = 1
  stats.health = 1
  stats.anim = 'idle'
  stats.pos.set(0, 0, 0)
  stats.yaw = 0
  stats.fps = 0
  stats.roaring = false
  stats.attacking = false
  stats.inWater = false
  stats.drinking = false
  stats.dead = false
  stats.respawnAt = 0
  stats.hunts = 0
  stats.huntToastAt = 0
  stats.sessionStart = performance.now()
  stats.dayTime = 0.4
  stats.isNight = false
  stats.rainIntensity = 0
  stats.isRaining = false
}
