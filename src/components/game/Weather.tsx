'use client'

import * as THREE from 'three'
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { stats } from '@/lib/stats'

const MAX_DROPS = 2500
const RAIN_AREA = 60 // rain follows player within this radius
const DROP_FALL = 30 // units/sec
const DROP_SLANT = 4 // horizontal drift

/**
 * Weather system: random rain storms that come and go.
 * Rain darkens the scene (handled in GameScene via stats.rainIntensity
 * affecting fog/light intensity). Rain follows the player.
 *
 * Storm cycle: clear (60-120s) → building (5s) → raining (40-80s) → clearing (8s) → clear...
 */
function rainDropTexture() {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 16
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 16)
  g.addColorStop(0, 'rgba(180,200,230,0)')
  g.addColorStop(0.5, 'rgba(180,200,230,0.6)')
  g.addColorStop(1, 'rgba(200,220,240,0.9)')
  ctx.fillStyle = g
  ctx.fillRect(3, 0, 2, 16)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

export function Weather() {
  const pointsRef = useRef<THREE.Points>(null!)
  const poolRef = useRef<{
    pos: Float32Array
    vel: Float32Array
    geometry: THREE.BufferGeometry
  } | null>(null)

  // storm scheduler state
  const storm = useRef<{
    phase: 'clear' | 'building' | 'raining' | 'clearing'
    timer: number // seconds remaining in current phase
    target: number // target intensity for current phase
  }>({
    phase: 'clear',
    timer: 45 + Math.random() * 60, // first storm in 45-105s
    target: 0,
  })

  const tex = useMemo(() => rainDropTexture(), [])
  const materialRef = useRef<THREE.PointsMaterial | null>(null)
  if (materialRef.current === null) {
    materialRef.current = new THREE.PointsMaterial({
      map: tex,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      color: '#b8c8e0',
      blending: THREE.NormalBlending,
    })
  }
  const material = materialRef.current

  useEffect(() => {
    const pos = new Float32Array(MAX_DROPS * 3)
    const vel = new Float32Array(MAX_DROPS)
    // start all drops above the play area
    for (let i = 0; i < MAX_DROPS; i++) {
      pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA * 2
      pos[i * 3 + 1] = Math.random() * 40 + 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA * 2
      vel[i] = DROP_FALL + Math.random() * 10
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    poolRef.current = { pos, vel, geometry }
    if (pointsRef.current) {
      pointsRef.current.geometry = geometry
    }
  }, [])

  useFrame((_, deltaRaw) => {
    const pool = poolRef.current
    if (!pool) return
    const delta = Math.min(deltaRaw, 0.05)
    const s = storm.current

    // advance storm phase
    s.timer -= delta
    if (s.timer <= 0) {
      if (s.phase === 'clear') {
        s.phase = 'building'
        s.target = 1
        s.timer = 5
      } else if (s.phase === 'building') {
        s.phase = 'raining'
        s.target = 1
        s.timer = 40 + Math.random() * 40
      } else if (s.phase === 'raining') {
        s.phase = 'clearing'
        s.target = 0
        s.timer = 8
      } else {
        s.phase = 'clear'
        s.target = 0
        s.timer = 60 + Math.random() * 60
      }
    }

    // ease intensity toward target
    const easeSpeed = s.phase === 'building' || s.phase === 'clearing' ? 0.4 : 0.8
    stats.rainIntensity += (s.target - stats.rainIntensity) * easeSpeed * delta
    stats.rainIntensity = Math.max(0, Math.min(1, stats.rainIntensity))
    stats.isRaining = stats.rainIntensity > 0.05

    // update rain drop positions (follow player)
    const px = stats.pos.x
    const pz = stats.pos.z
    const activeCount = Math.floor(MAX_DROPS * stats.rainIntensity)
    const pos = pool.pos
    const vel = pool.vel
    for (let i = 0; i < MAX_DROPS; i++) {
      if (i < activeCount) {
        pos[i * 3 + 1] -= vel[i] * delta
        pos[i * 3] += DROP_SLANT * delta
        // recycle when below ground or too far from player
        if (pos[i * 3 + 1] < -2) {
          pos[i * 3] = px + (Math.random() - 0.5) * RAIN_AREA * 2
          pos[i * 3 + 1] = 35 + Math.random() * 15
          pos[i * 3 + 2] = pz + (Math.random() - 0.5) * RAIN_AREA * 2
        } else {
          // keep drops near player (wrap horizontally)
          const dx = pos[i * 3] - px
          const dz = pos[i * 3 + 2] - pz
          if (dx > RAIN_AREA) pos[i * 3] -= RAIN_AREA * 2
          else if (dx < -RAIN_AREA) pos[i * 3] += RAIN_AREA * 2
          if (dz > RAIN_AREA) pos[i * 3 + 2] -= RAIN_AREA * 2
          else if (dz < -RAIN_AREA) pos[i * 3 + 2] += RAIN_AREA * 2
        }
      } else {
        // inactive drops hidden
        pos[i * 3 + 1] = -200
      }
    }
    pool.geometry.getAttribute('position').needsUpdate = true

    if (pointsRef.current) {
      pointsRef.current.visible = stats.rainIntensity > 0.02
      pointsRef.current.position.set(px, 0, pz)
      material.opacity = 0.5 * stats.rainIntensity + 0.1
    }
  })

  return <points ref={pointsRef} material={material} frustumCulled={false} />
}
