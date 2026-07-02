'use client'

import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { terrainHeight, isInWater, WORLD_SIZE } from '@/lib/terrain'
import { stats } from '@/lib/stats'
import { mp } from '@/lib/multiplayer'
import { audio } from '@/lib/audio'

const GAZELLE_COUNT = 12
const FLEE_RADIUS = 16
const CATCH_RADIUS = 2.3
const GRAZE_SPEED = 1.8
const FLEE_SPEED = 11
const RESPAWN_DELAY = 6000 // ms before a caught gazelle reappears

interface GazelleState {
  pos: THREE.Vector3
  vel: THREE.Vector3
  yaw: number
  state: 'graze' | 'flee'
  wanderTarget: THREE.Vector3
  wanderTimer: number
  caught: boolean
  respawnAt: number
  legPhase: number
  scale: number
}

// Mulberry32 PRNG for deterministic spawns
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
  return new THREE.Vector3(20, 0, 20)
}

function nearestLion(pos: THREE.Vector3): { dist: number; x: number; z: number } {
  // player
  let bestX = stats.pos.x
  let bestZ = stats.pos.z
  let bestD = Math.hypot(stats.pos.x - pos.x, stats.pos.z - pos.z)
  // remotes
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

export function Gazelles() {
  const groupRefs = useRef<(THREE.Group | null)[]>([])
  const legRefs = useRef<(THREE.Group | null)[][]>([])

  // Mutable game state — lazy-initialized in a ref (standard React pattern for
  // per-frame mutable state). Accessed only inside useFrame, never during render.
  const gameStates = useRef<GazelleState[] | null>(null)
  if (gameStates.current === null) {
    const rng = mulberry32(2024)
    gameStates.current = Array.from({ length: GAZELLE_COUNT }).map((_, i) => {
      const pos = randomSpawn(rng)
      return {
        pos,
        vel: new THREE.Vector3(),
        yaw: rng() * Math.PI * 2,
        state: 'graze' as const,
        wanderTarget: pos.clone(),
        wanderTimer: rng() * 4,
        caught: false,
        respawnAt: 0,
        legPhase: rng() * Math.PI * 2,
        scale: 0.85 + rng() * 0.25,
      }
    })
  }

  // Set initial positions on group refs after mount
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

  // Static indices for rendering meshes (never mutated)
  const indices = useMemo(() => Array.from({ length: GAZELLE_COUNT }, (_, i) => i), [])

  // shared materials
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c9a574', roughness: 0.85 }),
    [],
  )
  const bellyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f0e2c4', roughness: 0.9 }),
    [],
  )
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3a2a18', roughness: 0.8 }),
    [],
  )
  const hornMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.5 }),
    [],
  )

  useFrame((_, deltaRaw) => {
    const states = gameStates.current
    if (!states) return
    const delta = Math.min(deltaRaw, 0.05)
    const now = performance.now()
    const half = WORLD_SIZE / 2 - 8

    // Publish positions for attack hit detection
    const w = window as any
    if (!w.__preyPositions) w.__preyPositions = []
    const arr: { x: number; z: number; type: string }[] = []
    for (let i = 0; i < states.length; i++) {
      if (!states[i].caught) {
        arr.push({ x: states[i].pos.x, z: states[i].pos.z, type: 'gazelle' })
      }
    }
    w.__preyPositions = arr
    // register catch handler (idempotent)
    if (!w.__catchHandlers) w.__catchHandlers = new Set()
    // Handle attack catches: any prey within range of the click point is caught
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

      // respawn
      if (g.caught) {
        if (now >= g.respawnAt) {
          const rng = mulberry32(now + i * 31)
          const p = randomSpawn(rng)
          g.pos.copy(p)
          g.caught = false
          g.state = 'graze'
          grp.visible = true
        } else {
          continue
        }
      }

      // find nearest lion
      const lion = nearestLion(g.pos)

      // state transition
      if (lion.dist < FLEE_RADIUS) {
        g.state = 'flee'
      } else if (g.state === 'flee' && lion.dist > FLEE_RADIUS + 6) {
        g.state = 'graze'
        g.wanderTimer = 0
      }

      let speed = 0
      if (g.state === 'flee') {
        // run directly away from lion
        const dx = g.pos.x - lion.x
        const dz = g.pos.z - lion.z
        const len = Math.hypot(dx, dz) || 1
        // Pack hunting: multiple lions nearby slow the gazelle (surrounded)
        const nearbyLions = countNearbyLions(g.pos, FLEE_RADIUS)
        const packSlow = Math.max(0.45, 1 - (nearbyLions - 1) * 0.25)
        const effectiveFleeSpeed = FLEE_SPEED * packSlow
        g.vel.x = THREE.MathUtils.lerp(g.vel.x, (dx / len) * effectiveFleeSpeed, 0.12)
        g.vel.z = THREE.MathUtils.lerp(g.vel.z, (dz / len) * effectiveFleeSpeed, 0.12)
        speed = effectiveFleeSpeed

        // (catching is now handled by the left-click attack hit detection)
      } else {
        // graze: wander toward random target, pause occasionally
        g.wanderTimer -= delta
        if (g.wanderTimer <= 0) {
          const rng = mulberry32((now * 0.001 + i * 17) | 0)
          g.wanderTarget.set(
            THREE.MathUtils.clamp(g.pos.x + (rng() * 2 - 1) * 18, -half, half),
            0,
            THREE.MathUtils.clamp(g.pos.z + (rng() * 2 - 1) * 18, -half, half),
          )
          g.wanderTimer = 3 + rng() * 5
        }
        const dx = g.wanderTarget.x - g.pos.x
        const dz = g.wanderTarget.z - g.pos.z
        const len = Math.hypot(dx, dz)
        if (len > 1) {
          g.vel.x = THREE.MathUtils.lerp(g.vel.x, (dx / len) * GRAZE_SPEED, 0.05)
          g.vel.z = THREE.MathUtils.lerp(g.vel.z, (dz / len) * GRAZE_SPEED, 0.05)
          speed = GRAZE_SPEED
        } else {
          g.vel.x *= 0.8
          g.vel.z *= 0.8
          speed = 0
        }
      }

      // integrate
      g.pos.x += g.vel.x * delta
      g.pos.z += g.vel.z * delta
      g.pos.x = THREE.MathUtils.clamp(g.pos.x, -half, half)
      g.pos.z = THREE.MathUtils.clamp(g.pos.z, -half, half)
      g.pos.y = terrainHeight(g.pos.x, g.pos.z)

      // face direction
      if (speed > 0.3) {
        const targetYaw = Math.atan2(g.vel.x, g.vel.z)
        let diff = targetYaw - g.yaw
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        g.yaw += diff * (1 - Math.exp(-9 * delta))
      }

      grp.position.copy(g.pos)
      grp.rotation.y = g.yaw
      grp.scale.setScalar(g.scale)

      // leg animation
      g.legPhase += delta * (speed > 0.3 ? 6 + speed * 0.8 : 0)
      const swing = Math.sin(g.legPhase) * Math.min(0.6, speed * 0.06)
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
          {/* body */}
          <mesh castShadow material={bodyMat} position={[0, 0.95, 0]}>
            <boxGeometry args={[0.38, 0.5, 1.25]} />
          </mesh>
          {/* belly (lighter) */}
          <mesh material={bellyMat} position={[0, 0.78, 0]}>
            <boxGeometry args={[0.34, 0.22, 1.1]} />
          </mesh>
          {/* rump */}
          <mesh castShadow material={bodyMat} position={[0, 1.0, -0.6]}>
            <sphereGeometry args={[0.28, 8, 6]} />
          </mesh>
          {/* chest */}
          <mesh castShadow material={bodyMat} position={[0, 1.0, 0.6]}>
            <sphereGeometry args={[0.24, 8, 6]} />
          </mesh>
          {/* neck */}
          <mesh
            castShadow
            material={bodyMat}
            position={[0, 1.2, 0.78]}
            rotation={[-0.5, 0, 0]}
          >
            <cylinderGeometry args={[0.14, 0.18, 0.45, 7]} />
          </mesh>
          {/* head */}
          <mesh castShadow material={bodyMat} position={[0, 1.42, 0.98]}>
            <boxGeometry args={[0.2, 0.22, 0.32]} />
          </mesh>
          {/* snout */}
          <mesh material={darkMat} position={[0, 1.36, 1.16]}>
            <boxGeometry args={[0.14, 0.12, 0.14]} />
          </mesh>
          {/* horns */}
          <mesh material={hornMat} position={[0.09, 1.58, 0.95]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.025, 0.22, 5]} />
          </mesh>
          <mesh material={hornMat} position={[-0.09, 1.58, 0.95]} rotation={[0, 0, 0.2]}>
            <coneGeometry args={[0.025, 0.22, 5]} />
          </mesh>
          {/* eyes */}
          <mesh material={darkMat} position={[0.08, 1.46, 1.12]}>
            <sphereGeometry args={[0.025, 6, 6]} />
          </mesh>
          <mesh material={darkMat} position={[-0.08, 1.46, 1.12]}>
            <sphereGeometry args={[0.025, 6, 6]} />
          </mesh>
          {/* tail */}
          <mesh material={bodyMat} position={[0, 1.0, -0.85]} rotation={[0.6, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.015, 0.3, 5]} />
          </mesh>
          {/* legs */}
          {[
            [-0.12, 0.45],
            [0.12, 0.45],
            [-0.12, -0.45],
            [0.12, -0.45],
          ].map(([x, z], li) => (
            <group
              key={li}
              ref={(el) => {
                if (!legRefs.current[i]) legRefs.current[i] = []
                legRefs.current[i][li] = el
              }}
              position={[x, 0.75, z]}
            >
              <mesh castShadow material={bodyMat} position={[0, -0.38, 0]}>
                <cylinderGeometry args={[0.05, 0.04, 0.76, 5]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}
