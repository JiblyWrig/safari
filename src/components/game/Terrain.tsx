'use client'

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { terrainHeight, WATER_LEVEL, WORLD_SIZE } from '@/lib/terrain'
import { grassTexture, bumpTexture } from '@/lib/textures'

const SEG = 200

export function Terrain({ shadows = true }: { shadows?: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEG, SEG)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const cGrass = new THREE.Color('#7c9a44')
    const cDry = new THREE.Color('#b89a55')
    const cSand = new THREE.Color('#e0cd92')
    const cRock = new THREE.Color('#7d7770')
    const cDark = new THREE.Color('#4f6a2c')
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = terrainHeight(x, z)
      pos.setY(i, y)

      // blend by height/region
      const waterDist = Math.hypot(x - 70, z - 70)
      const ridgeDist = Math.hypot(x + 80, z + 80)
      let t = 0
      tmp.copy(cGrass)
      // dry patches
      const dry = (Math.sin(x * 0.05) * Math.cos(z * 0.04) + 1) * 0.5
      t = THREE.MathUtils.clamp((dry - 0.55) * 2.2, 0, 1) * 0.6
      tmp.lerp(cDry, t)
      // darker low grass in dips
      if (y < -1.5 && waterDist > 26) tmp.lerp(cDark, 0.3)
      // sand near water
      if (waterDist < 30 && y < WATER_LEVEL + 2.2) {
        const s = THREE.MathUtils.clamp(1 - (waterDist - 22) / 8, 0, 1)
        tmp.lerp(cSand, s * 0.85)
      }
      // rock on ridge
      if (ridgeDist < 30 && y > 3) {
        const r = THREE.MathUtils.clamp((y - 3) / 4, 0, 1)
        tmp.lerp(cRock, r * 0.8)
      }
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  const grass = useMemo(() => {
    const t = grassTexture(512)
    t.repeat.set(28, 28)
    return t
  }, [])
  const bump = useMemo(() => {
    const t = bumpTexture(512)
    t.repeat.set(28, 28)
    return t
  }, [])

  return (
    <mesh geometry={geo} receiveShadow={shadows}>
      <meshStandardMaterial
        map={grass}
        bumpMap={bump}
        bumpScale={0.6}
        vertexColors
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  )
}

export function WaterHole() {
  const ref = useRef<THREE.Mesh>(null!)
  const { clock } = useThree()
  useFrame(() => {
    if (ref.current) {
      const m = ref.current.material as THREE.MeshStandardMaterial
      // subtle shimmer
      m.opacity = 0.78 + Math.sin(clock.elapsedTime * 1.5) * 0.04
    }
  })
  return (
    <mesh
      ref={ref}
      position={[70, WATER_LEVEL + 0.05, 70]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[22, 48]} />
      <meshStandardMaterial
        color="#3f7fa8"
        transparent
        opacity={0.8}
        roughness={0.15}
        metalness={0.3}
        emissive="#1c3f5a"
        emissiveIntensity={0.25}
      />
    </mesh>
  )
}

/** A flat dirt clearing at spawn so players start on solid ground. */
export function SpawnClearing() {
  return (
    <mesh
      position={[0, 0.06, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <circleGeometry args={[7, 40]} />
      <meshStandardMaterial color="#b69a5c" roughness={1} />
    </mesh>
  )
}
