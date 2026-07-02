'use client'

import * as THREE from 'three'
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { terrainHeight, isInWater, WORLD_SIZE } from '@/lib/terrain'
import { stats } from '@/lib/stats'
import { mp } from '@/lib/multiplayer'
import { audio } from '@/lib/audio'

const WARTHOG_COUNT = 6
const FLEE_RADIUS = 12
const CATCH_RADIUS = 2.5
const GRAZE_SPEED = 1.2
const FLEE_SPEED = 9
const RESPAWN_DELAY = 7000

interface WarthogState {
  pos: THREE.Vector3
  vel: THREE.Vector3
  yaw: number
  state: 'graze' | 'flee'
  wanderTarget: THREE.Vector3
  wanderTimer: number
  fleeJinkTimer: number // erratic direction change timer
  caught: boolean
  respawnAt: number
  legPhase: number
  scale: number
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomSpawn(rng: () => number): THREE.Vector3 {
  const half = WORLD_SIZE / 2 - 12
  for (let i = 0; i < 30; i++) {
    const x = (rng() * 2 - 1) * half
    const z = (rng() * 2 - 1) * half
    if (isInWater(x, z)) continue
    if (Math.hypot(x, z) < 16) continue
    return new THREE.Vector3(x, terrainHeight(x, z), z)
  }
  return new THREE.Vector3(-20, 0, -20)
}

function nearestLion(pos: THREE.Vector3) {
  let bestX = stats.pos.x
  let bestZ = stats.pos.z
  let bestD = Math.hypot(stats.pos.x - pos.x, stats.pos.z - pos.z)
  mp.players.forEach((p) => {
    const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z)
    if (d < bestD) {
      bestD = d
      bestX = p.pos.x
      bestZ = p.pos.z
    }
  })
  return { dist: bestD, x: bestX, z: bestZ }
}

/** Count lions within radius (for pack hunting — prey flee slower when surrounded). */
function countNearbyLions(pos: THREE.Vector3, radius: number): number {
  let count = 0
  if (Math.hypot(stats.pos.x - pos.x, stats.pos.z - pos.z) < radius) count++
  mp.players.forEach((p) => {
    if (Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < radius) count++
  })
  return count
}

export function Warthogs() {
  const groupRefs = useRef<(THREE.Group | null)[]>([])
  const legRefs = useRef<(THREE.Group | null)[][]>([])

  const gameStates = useRef<WarthogState[] | null>(null)
  if (gameStates.current === null) {
    const rng = mulberry32(7777)
    gameStates.current = Array.from({ length: WARTHOG_COUNT }).map((_, i) => {
      const pos = randomSpawn(rng)
      return {
        pos,
        vel: new THREE.Vector3(),
        yaw: rng() * Math.PI * 2,
        state: 'graze' as const,
        wanderTarget: pos.clone(),
        wanderTimer: rng() * 4,
        fleeJinkTimer: 0,
        caught: false,
        respawnAt: 0,
        legPhase: rng() * Math.PI * 2,
        scale: 0.75 + rng() * 0.2,
      }
    })
  }

  useEffect(() => {
    const states = gameStates.current
    if (!states) return
    states.forEach((g, i) => {
      const grp = groupRefs.current[i]
      if (grp) {
        grp.position.copy(g.pos)
        grp.rotation.y = g.yaw
        grp.scale.setScalar(g.scale)
      }
    })
  }, [])

  const indices = useMemo(() => Array.from({ length: WARTHOG_COUNT }, (_, i) => i), [])

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6b5440', roughness: 0.9 }),
    [],
  )
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.7 }),
    [],
  )
  const maneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3a2a18', roughness: 1 }),
    [],
  )
  const tuskMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.4 }),
    [],
  )

  useFrame((_, deltaRaw) => {
    const states = gameStates.current
    if (!states) return
    const delta = Math.min(deltaRaw, 0.05)
    const now = performance.now()
    const half = WORLD_SIZE / 2 - 8

    // Publish positions for attack hit detection (append to gazelles' list)
    const w = window as any
    if (!w.__preyPositions) w.__preyPositions = []
    for (let i = 0; i < states.length; i++) {
      if (!states[i].caught) {
        w.__preyPositions.push({ x: states[i].pos.x, z: states[i].pos.z, type: 'warthog' })
      }
    }
    // Handle attack catches
    const pending = w.__pendingCatches as { x: number; z: number; at: number }[] | undefined
    if (pending && pending.length) {
      w.__pendingCatches = []
      for (const c of pending) {
        for (let i = 0; i < states.length; i++) {
          const g = states[i]
          if (g.caught) continue
          if (Math.hypot(g.pos.x - c.x, g.pos.z - c.z) < 2.5) {
            g.caught = true
            g.respawnAt = now + RESPAWN_DELAY
            const grp = groupRefs.current[i]
            if (grp) grp.visible = false
            break
          }
        }
      }
    }

    for (let i = 0; i < states.length; i++) {
      const g = states[i]
      const grp = groupRefs.current[i]
      if (!grp) continue

      if (g.caught) {
        if (now >= g.respawnAt) {
          const rng = mulberry32(now + i * 41)
          const p = randomSpawn(rng)
          g.pos.copy(p)
          g.caught = false
          g.state = 'graze'
          grp.visible = true
        } else {
          continue
        }
      }

      const lion = nearestLion(g.pos)

      if (lion.dist < FLEE_RADIUS) {
        g.state = 'flee'
      } else if (g.state === 'flee' && lion.dist > FLEE_RADIUS + 8) {
        g.state = 'graze'
        g.wanderTimer = 0
      }

      let speed = 0
      if (g.state === 'flee') {
        // erratic flee: jink (change direction) every 0.4s
        g.fleeJinkTimer -= delta
        const dx = g.pos.x - lion.x
        const dz = g.pos.z - lion.z
        const len = Math.hypot(dx, dz) || 1
        // Pack hunting: multiple lions nearby slow the warthog (surrounded)
        const nearbyLions = countNearbyLions(g.pos, FLEE_RADIUS)
        const packSlow = Math.max(0.4, 1 - (nearbyLions - 1) * 0.3)
        const effectiveFleeSpeed = FLEE_SPEED * packSlow
        let fleeX = dx / len
        let fleeZ = dz / len
        if (g.fleeJinkTimer <= 0) {
          g.fleeJinkTimer = 0.3 + Math.random() * 0.3
          // add a perpendicular jink
          const jink = (Math.random() - 0.5) * 1.2
          const perpX = -fleeZ
          const perpZ = fleeX
          fleeX += perpX * jink
          fleeZ += perpZ * jink
          const fl = Math.hypot(fleeX, fleeZ) || 1
          fleeX /= fl
          fleeZ /= fl
        }
        g.vel.x = THREE.MathUtils.lerp(g.vel.x, fleeX * effectiveFleeSpeed, 0.18)
        g.vel.z = THREE.MathUtils.lerp(g.vel.z, fleeZ * effectiveFleeSpeed, 0.18)
        speed = effectiveFleeSpeed

        // (catching is now handled by the left-click attack hit detection)
      } else {
        g.wanderTimer -= delta
        if (g.wanderTimer <= 0) {
          const rng = mulberry32((now * 0.001 + i * 23) | 0)
          g.wanderTarget.set(
            THREE.MathUtils.clamp(g.pos.x + (rng() * 2 - 1) * 14, -half, half),
            0,
            THREE.MathUtils.clamp(g.pos.z + (rng() * 2 - 1) * 14, -half, half),
          )
          g.wanderTimer = 4 + rng() * 4
        }
        const dx = g.wanderTarget.x - g.pos.x
        const dz = g.wanderTarget.z - g.pos.z
        const len = Math.hypot(dx, dz)
        if (len > 1) {
          g.vel.x = THREE.MathUtils.lerp(g.vel.x, (dx / len) * GRAZE_SPEED, 0.04)
          g.vel.z = THREE.MathUtils.lerp(g.vel.z, (dz / len) * GRAZE_SPEED, 0.04)
          speed = GRAZE_SPEED
        } else {
          g.vel.x *= 0.8
          g.vel.z *= 0.8
          speed = 0
        }
      }

      g.pos.x += g.vel.x * delta
      g.pos.z += g.vel.z * delta
      g.pos.x = THREE.MathUtils.clamp(g.pos.x, -half, half)
      g.pos.z = THREE.MathUtils.clamp(g.pos.z, -half, half)
      g.pos.y = terrainHeight(g.pos.x, g.pos.z)

      if (speed > 0.3) {
        const targetYaw = Math.atan2(g.vel.x, g.vel.z)
        let diff = targetYaw - g.yaw
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        g.yaw += diff * (1 - Math.exp(-10 * delta))
      }

      grp.position.copy(g.pos)
      grp.rotation.y = g.yaw
      grp.scale.setScalar(g.scale)

      g.legPhase += delta * (speed > 0.3 ? 7 + speed : 0)
      const swing = Math.sin(g.legPhase) * Math.min(0.6, speed * 0.07)
      const legs = legRefs.current[i]
      if (legs) {
        if (legs[0]) legs[0].rotation.x = swing
        if (legs[1]) legs[1].rotation.x = -swing
        if (legs[2]) legs[2].rotation.x = -swing
        if (legs[3]) legs[3].rotation.x = swing
      }
    }
  })

  return (
    <group>
      {indices.map((i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el
          }}
        >
          {/* body — stocky barrel */}
          <mesh castShadow material={bodyMat} position={[0, 0.7, 0]}>
            <boxGeometry args={[0.42, 0.5, 1.0]} />
          </mesh>
          {/* back ridge mane */}
          <mesh castShadow material={maneMat} position={[0, 0.98, -0.1]}>
            <boxGeometry args={[0.18, 0.22, 0.7]} />
          </mesh>
          {/* head — large, low */}
          <mesh castShadow material={bodyMat} position={[0, 0.62, 0.55]}>
            <boxGeometry args={[0.34, 0.34, 0.4]} />
          </mesh>
          {/* snout */}
          <mesh castShadow material={darkMat} position={[0, 0.55, 0.78]}>
            <boxGeometry args={[0.22, 0.18, 0.2]} />
          </mesh>
          {/* warts (face bumps) */}
          <mesh material={bodyMat} position={[0.14, 0.72, 0.62]}>
            <sphereGeometry args={[0.06, 6, 6]} />
          </mesh>
          <mesh material={bodyMat} position={[-0.14, 0.72, 0.62]}>
            <sphereGeometry args={[0.06, 6, 6]} />
          </mesh>
          {/* tusks — curved up */}
          <mesh material={tuskMat} position={[0.1, 0.5, 0.82]} rotation={[0.4, 0, -0.3]}>
            <coneGeometry args={[0.025, 0.18, 5]} />
          </mesh>
          <mesh material={tuskMat} position={[-0.1, 0.5, 0.82]} rotation={[0.4, 0, 0.3]}>
            <coneGeometry args={[0.025, 0.18, 5]} />
          </mesh>
          {/* eyes */}
          <mesh material={darkMat} position={[0.1, 0.7, 0.74]}>
            <sphereGeometry args={[0.03, 6, 6]} />
          </mesh>
          <mesh material={darkMat} position={[-0.1, 0.7, 0.74]}>
            <sphereGeometry args={[0.03, 6, 6]} />
          </mesh>
          {/* ears */}
          <mesh material={bodyMat} position={[0.15, 0.82, 0.5]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[0.07, 0.14, 5]} />
          </mesh>
          <mesh material={bodyMat} position={[-0.15, 0.82, 0.5]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[0.07, 0.14, 5]} />
          </mesh>
          {/* tail with tuft */}
          <mesh material={bodyMat} position={[0, 0.85, -0.55]} rotation={[0.7, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.015, 0.3, 5]} />
          </mesh>
          <mesh material={maneMat} position={[0, 0.7, -0.72]}>
            <sphereGeometry args={[0.06, 6, 6]} />
          </mesh>
          {/* legs — short stout */}
          {[
            [-0.13, 0.32],
            [0.13, 0.32],
            [-0.13, -0.32],
            [0.13, -0.32],
          ].map(([x, z], li) => (
            <group
              key={li}
              ref={(el) => {
                if (!legRefs.current[i]) legRefs.current[i] = []
                legRefs.current[i][li] = el
              }}
              position={[x, 0.4, z]}
            >
              <mesh castShadow material={darkMat} position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.055, 0.045, 0.4, 5]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}
