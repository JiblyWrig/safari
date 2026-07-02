'use client'

import * as THREE from 'three'
import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, AdaptiveDpr } from '@react-three/drei'
import { Terrain, WaterHole, SpawnClearing } from './Terrain'
import { Environment } from './Environment'
import { Player } from './Player'
import { RemoteLions } from './RemoteLions'
import { useGame } from '@/lib/store'
import { stats } from '@/lib/stats'
import { WORLD_SIZE } from '@/lib/terrain'

/** Directional sun that follows the player so shadows stay crisp. */
function SunLight() {
  const light = useRef<THREE.DirectionalLight>(null!)
  const target = useRef<THREE.Object3D>(null!)
  const { scene } = useThree()
  useEffect(() => {
    if (target.current) scene.add(target.current)
  }, [scene])
  useFrame(() => {
    if (light.current && target.current) {
      light.current.position.set(
        stats.pos.x + 40,
        60,
        stats.pos.z + 30,
      )
      target.current.position.set(stats.pos.x, 0, stats.pos.z)
      light.current.target = target.current
    }
  })
  return (
    <>
      <directionalLight
        ref={light}
        intensity={2.4}
        color="#fff2d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <object3D ref={target} />
    </>
  )
}

function Scene() {
  const shadows = useGame((s) => s.settings.shadows)
  const graphics = useGame((s) => s.settings.graphics)
  return (
    <>
      <hemisphereLight args={['#bcd8ff', '#6b5536', 0.65]} />
      <ambientLight intensity={0.25} />
      <SunLight />
      <fog attach="fog" args={['#e7d6a8', 60, 170]} />
      <Sky
        distance={4500}
        sunPosition={[40, 60, 30]}
        inclination={0.49}
        azimuth={0.25}
        turbidity={6}
        rayleigh={1.2}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />
      <Terrain shadows={shadows} />
      <WaterHole />
      <SpawnClearing />
      <Suspense fallback={null}>
        <Environment shadows={shadows} />
      </Suspense>
      <Player />
      <RemoteLions />
      {graphics !== 'low' && <AdaptiveDpr pixelated />}
    </>
  )
}

export function GameScene() {
  const graphics = useGame((s) => s.settings.graphics)
  const shadows = useGame((s) => s.settings.shadows)

  const dpr: [number, number] =
    graphics === 'high' ? [1, 2] : graphics === 'medium' ? [1, 1.5] : [0.7, 1]

  return (
    <Canvas
      shadows={shadows}
      dpr={dpr}
      camera={{ fov: 60, near: 0.1, far: 600, position: [0, 8, 18] }}
      gl={{ antialias: graphics !== 'low', powerPreference: 'high-performance' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
