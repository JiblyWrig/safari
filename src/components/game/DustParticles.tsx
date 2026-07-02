'use client'

import * as THREE from 'three'
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { stats } from '@/lib/stats'
import { terrainHeight } from '@/lib/terrain'

const MAX_PARTICLES = 80
const PARTICLE_LIFE = 0.9 // seconds

function dustTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(200,170,120,0.9)')
  g.addColorStop(0.5, 'rgba(180,150,100,0.4)')
  g.addColorStop(1, 'rgba(160,130,80,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

interface ParticlePool {
  pos: Float32Array
  vel: Float32Array
  life: Float32Array
  size: Float32Array
  geometry: THREE.BufferGeometry
}

export function DustParticles() {
  const pointsRef = useRef<THREE.Points>(null!)
  const emitAccum = useRef(0)
  const poolRef = useRef<ParticlePool | null>(null)

  const tex = useMemo(() => dustTexture(), [])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: tex,
        size: 1.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        color: '#d4b88a',
        blending: THREE.NormalBlending,
      }),
    [tex],
  )

  // Create the mutable pool + geometry in an effect so the immutability lint
  // rule doesn't track it. Only accessed in useFrame.
  useEffect(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3)
    const vel = new Float32Array(MAX_PARTICLES * 3)
    const life = new Float32Array(MAX_PARTICLES)
    const size = new Float32Array(MAX_PARTICLES)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pos[i * 3 + 1] = -100 // offscreen
      life[i] = 0
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(size, 1))
    poolRef.current = { pos, vel, life, size, geometry }
    if (pointsRef.current) {
      pointsRef.current.geometry = geometry
    }
  }, [])

  useFrame((_, deltaRaw) => {
    const pool = poolRef.current
    if (!pool) return
    const delta = Math.min(deltaRaw, 0.05)
    const sprinting = stats.anim === 'sprint' && stats.speed > 6

    // emit
    if (sprinting) {
      emitAccum.current += delta
      const emitInterval = 0.04 // emit ~25/sec
      while (emitAccum.current > emitInterval) {
        emitAccum.current -= emitInterval
        // find a dead particle
        for (let i = 0; i < MAX_PARTICLES; i++) {
          if (pool.life[i] <= 0) {
            // emit at a random rear paw
            const back = -1.0 // behind lion center
            const side = (Math.random() - 0.5) * 0.5
            const yaw = stats.yaw
            const cos = Math.cos(yaw)
            const sin = Math.sin(yaw)
            // local (side, 0, back) → world
            const wx = stats.pos.x + (side * cos + back * sin)
            const wz = stats.pos.z + (side * (-sin) + back * cos)
            pool.pos[i * 3] = wx
            pool.pos[i * 3 + 1] = terrainHeight(wx, wz) + 0.1
            pool.pos[i * 3 + 2] = wz
            // velocity: up + backward (opposite to lion facing) + random
            const bx = -sin * (1.5 + Math.random())
            const bz = -cos * (1.5 + Math.random())
            pool.vel[i * 3] = bx + (Math.random() - 0.5) * 0.6
            pool.vel[i * 3 + 1] = 1.2 + Math.random() * 0.8
            pool.vel[i * 3 + 2] = bz + (Math.random() - 0.5) * 0.6
            pool.life[i] = 1.0
            pool.size[i] = 0.6 + Math.random() * 0.5
            break
          }
        }
      }
    } else {
      emitAccum.current = 0
    }

    // update alive particles
    let anyAlive = false
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (pool.life[i] > 0) {
        anyAlive = true
        pool.life[i] -= delta / PARTICLE_LIFE
        pool.pos[i * 3] += pool.vel[i * 3] * delta
        pool.pos[i * 3 + 1] += pool.vel[i * 3 + 1] * delta
        pool.pos[i * 3 + 2] += pool.vel[i * 3 + 2] * delta
        // gravity + drag
        pool.vel[i * 3 + 1] -= 1.5 * delta
        pool.vel[i * 3] *= 0.96
        pool.vel[i * 3 + 2] *= 0.96
        // fade size as life decreases
        pool.size[i] = 1.1 * Math.max(0, pool.life[i])
        if (pool.life[i] <= 0) {
          // move offscreen
          pool.pos[i * 3 + 1] = -100
        }
      }
    }

    // mark geometry for update
    const posAttr = pool.geometry.getAttribute('position') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    const sizeAttr = pool.geometry.getAttribute('size') as THREE.BufferAttribute
    sizeAttr.needsUpdate = true

    if (pointsRef.current) {
      pointsRef.current.visible = anyAlive
    }
  })

  return <points ref={pointsRef} material={material} frustumCulled={false} />
}
