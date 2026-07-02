'use client'

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import { getDecorations, terrainHeight, type Decoration } from '@/lib/terrain'
import { barkTexture } from '@/lib/textures'

// ---------------------------------------------------------------------------
// Individual decoration components
// ---------------------------------------------------------------------------

function AcaciaTree({ d }: { d: Decoration }) {
  const bark = useMemo(() => {
    const t = barkTexture(256)
    t.repeat.set(2, 3)
    return t
  }, [])
  const canopyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5d7a38',
        roughness: 0.9,
        flatShading: true,
      }),
    [],
  )
  return (
    <group position={[d.x, d.y, d.z]} scale={d.scale} rotation={[0, d.rot, 0]}>
      {/* trunk */}
      <mesh castShadow position={[0, 2.2, 0]} material-toneMapped={false}>
        <cylinderGeometry args={[0.18, 0.34, 4.4, 7]} />
        <meshStandardMaterial map={bark} color="#6b5238" roughness={0.95} />
      </mesh>
      {/* branches */}
      <mesh castShadow position={[0.6, 3.8, 0]} rotation={[0, 0, -0.8]}>
        <cylinderGeometry args={[0.07, 0.12, 1.8, 6]} />
        <meshStandardMaterial map={bark} color="#6b5238" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[-0.7, 3.6, 0.2]} rotation={[0, 0, 0.9]}>
        <cylinderGeometry args={[0.07, 0.12, 1.8, 6]} />
        <meshStandardMaterial map={bark} color="#6b5238" roughness={0.95} />
      </mesh>
      {/* flat canopy discs */}
      <mesh castShadow position={[0, 4.3, 0]} material={canopyMat}>
        <sphereGeometry args={[1.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
      </mesh>
      <mesh castShadow position={[0.9, 4.0, 0]} material={canopyMat}>
        <sphereGeometry args={[1.0, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
      </mesh>
      <mesh castShadow position={[-1.0, 3.9, 0.2]} material={canopyMat}>
        <sphereGeometry args={[1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
      </mesh>
    </group>
  )
}

function DeadTree({ d }: { d: Decoration }) {
  const bark = useMemo(() => {
    const t = barkTexture(256)
    t.repeat.set(2, 3)
    return t
  }, [])
  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5a4a36', roughness: 1 }),
    [],
  )
  return (
    <group position={[d.x, d.y, d.z]} scale={d.scale} rotation={[0, d.rot, 0]}>
      <mesh castShadow position={[0, 2.0, 0]} material={woodMat}>
        <cylinderGeometry args={[0.14, 0.28, 4, 6]} />
      </mesh>
      <mesh castShadow position={[0.7, 3.2, 0]} rotation={[0.4, 0.5, -1.0]} material={woodMat}>
        <cylinderGeometry args={[0.05, 0.1, 2.0, 5]} />
      </mesh>
      <mesh castShadow position={[-0.6, 3.0, 0.1]} rotation={[0.2, -0.4, 1.1]} material={woodMat}>
        <cylinderGeometry args={[0.05, 0.1, 1.8, 5]} />
      </mesh>
      <mesh castShadow position={[0.1, 3.6, 0.4]} rotation={[-0.5, 0.2, -0.2]} material={woodMat}>
        <cylinderGeometry args={[0.04, 0.08, 1.4, 5]} />
      </mesh>
    </group>
  )
}

function TermiteMound({ d }: { d: Decoration }) {
  return (
    <group position={[d.x, d.y, d.z]} scale={d.scale} rotation={[0, d.rot, 0]}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[0.9, 2.2, 9]} />
        <meshStandardMaterial color="#9a6b3f" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0.3, 0.4, 0.3]} scale={0.5}>
        <coneGeometry args={[0.7, 1.4, 8]} />
        <meshStandardMaterial color="#8a5e36" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Instanced decorations (grass tufts, bushes, rocks)
// ---------------------------------------------------------------------------

function GrassTufts({ items }: { items: Decoration[] }) {
  return (
    <Instances limit={items.length} castShadow={false} receiveShadow={false}>
      <coneGeometry args={[0.12, 0.6, 4]} />
      <meshStandardMaterial color="#6f8a3a" roughness={1} flatShading />
      {items.map((d, i) => (
        <Instance
          key={i}
          position={[d.x, d.y + 0.3 * d.scale, d.z]}
          scale={[d.scale, d.scale * 1.4, d.scale]}
          rotation={[0, d.rot, 0]}
          color={d.variant === 0 ? '#6f8a3a' : d.variant === 1 ? '#7d9a44' : '#8aa84e'}
        />
      ))}
    </Instances>
  )
}

function Bushes({ items }: { items: Decoration[] }) {
  return (
    <Instances limit={items.length * 3} castShadow receiveShadow>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#5d7a36" roughness={1} flatShading />
      {items.map((d, i) =>
        [0, 1, 2].map((j) => (
          <Instance
            key={`${i}-${j}`}
            position={[
              d.x + (j - 1) * 0.4 * d.scale,
              d.y + 0.4 * d.scale,
              d.z + (j === 1 ? 0.35 : -0.1) * d.scale,
            ]}
            scale={d.scale * (0.8 + (j === 1 ? 0.3 : 0))}
            color={j === 1 ? '#5d7a36' : '#6c8a3e'}
          />
        )),
      )}
    </Instances>
  )
}

function Rocks({ items }: { items: Decoration[] }) {
  return (
    <Instances limit={items.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color="#7d7770" roughness={0.95} flatShading />
      {items.map((d, i) => (
        <Instance
          key={i}
          position={[d.x, d.y + 0.3 * d.scale, d.z]}
          scale={[d.scale, d.scale * 0.7, d.scale]}
          rotation={[d.rot, d.rot * 1.7, d.rot * 0.5]}
          color={d.variant === 0 ? '#7d7770' : d.variant === 1 ? '#8a847d' : '#6e6962'}
        />
      ))}
    </Instances>
  )
}

// ---------------------------------------------------------------------------
// Wandering zebra herd (ambient life)
// ---------------------------------------------------------------------------

function Zebra({
  seed,
  centerX,
  centerZ,
}: {
  seed: number
  centerX: number
  centerZ: number
}) {
  const ref = useRef<THREE.Group>(null!)
  const legRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  const phase = useRef(seed * 7.3)
  const t = useRef(0)
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.8 }),
    [],
  )
  const stripeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#222018', roughness: 0.8 }),
    [],
  )

  useFrame((_, delta) => {
    t.current += delta
    const time = t.current
    // wander on a slow loop
    const r = 6
    const spd = 0.18
    const ang = time * spd + seed
    const x = centerX + Math.cos(ang) * r
    const z = centerZ + Math.sin(ang) * r
    const y = terrainHeight(x, z)
    const yaw = Math.atan2(-Math.sin(ang), -Math.cos(ang)) + Math.PI / 2
    if (ref.current) {
      ref.current.position.set(x, y, z)
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        yaw,
        0.1,
      )
    }
    // legs
    const p = time * 6 + seed
    const swings = [
      Math.sin(p),
      Math.sin(p + Math.PI),
      Math.sin(p + Math.PI),
      Math.sin(p),
    ]
    swings.forEach((s, i) => {
      if (legRefs.current[i]) legRefs.current[i]!.rotation.x = s * 0.4
    })
  })

  return (
    <group ref={ref}>
      {/* body */}
      <mesh castShadow position={[0, 1.1, 0]} material={bodyMat}>
        <boxGeometry args={[0.5, 0.7, 1.7]} />
      </mesh>
      {/* stripes (dark bands) */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((z, i) => (
        <mesh key={i} position={[0, 1.1, z]} material={stripeMat}>
          <boxGeometry args={[0.52, 0.72, 0.12]} />
        </mesh>
      ))}
      {/* neck + head */}
      <mesh castShadow position={[0, 1.45, 1.0]} rotation={[-0.4, 0, 0]} material={bodyMat}>
        <cylinderGeometry args={[0.18, 0.22, 0.6, 7]} />
      </mesh>
      <mesh castShadow position={[0, 1.7, 1.3]} material={bodyMat}>
        <boxGeometry args={[0.3, 0.32, 0.5]} />
      </mesh>
      {/* legs */}
      {[
        [-0.18, 0.7],
        [0.18, 0.7],
        [-0.18, -0.7],
        [0.18, -0.7],
      ].map(([x, z], i) => (
        <group
          key={i}
          ref={(el) => {
            legRefs.current[i] = el
          }}
          position={[x, 0.75, z]}
        >
          <mesh castShadow position={[0, -0.38, 0]} material={bodyMat}>
            <cylinderGeometry args={[0.07, 0.06, 0.76, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Environment({ shadows = true }: { shadows?: boolean }) {
  const decos = useMemo(() => getDecorations(1337), [])
  const groups = useMemo(() => {
    const g: Record<string, Decoration[]> = {
      acacia: [],
      deadtree: [],
      rock: [],
      bush: [],
      termite: [],
      grass: [],
    }
    for (const d of decos) g[d.type].push(d)
    return g
  }, [decos])

  const zebras = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        seed: i * 1.7,
        centerX: -30 + (i % 3) * 14,
        centerZ: -10 + Math.floor(i / 3) * 18,
      })),
    [],
  )

  return (
    <group>
      {groups.acacia.map((d, i) => (
        <AcaciaTree key={`acacia-${i}`} d={d} />
      ))}
      {groups.deadtree.map((d, i) => (
        <DeadTree key={`dead-${i}`} d={d} />
      ))}
      {groups.termite.map((d, i) => (
        <TermiteMound key={`termite-${i}`} d={d} />
      ))}
      <GrassTufts items={groups.grass} />
      <Bushes items={groups.bush} />
      <Rocks items={groups.rock} />
      {zebras.map((z, i) => (
        <Zebra key={`zebra-${i}`} {...z} />
      ))}
    </group>
  )
}
