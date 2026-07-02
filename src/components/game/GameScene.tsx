'use client'

import * as THREE from 'three'
import { useRef, useEffect, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sky, Stars, AdaptiveDpr } from '@react-three/drei'
import { Terrain, WaterHole, SpawnClearing } from './Terrain'
import { Environment } from './Environment'
import { Gazelles } from './Gazelles'
import { Warthogs } from './Warthogs'
import { Player } from './Player'
import { RemoteLions } from './RemoteLions'
import { DustParticles } from './DustParticles'
import { Weather } from './Weather'
import { useGame } from '@/lib/store'
import { stats } from '@/lib/stats'

const DAY_LENGTH = 180 // default seconds for a full day/night cycle

// Color stops for fog/lighting across the day cycle
const FOG_DAY = new THREE.Color('#e7d6a8')
const FOG_NIGHT = new THREE.Color('#15203a')
const FOG_DUSK = new THREE.Color('#d97a3a')
const SUN_DAY = new THREE.Color('#fff2d6')
const SUN_DUSK = new THREE.Color('#ff9a4a')
const HEMI_DAY = new THREE.Color('#bcd8ff')
const HEMI_NIGHT = new THREE.Color('#3a4a6a')

function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color) {
  out.r = a.r + (b.r - a.r) * t
  out.g = a.g + (b.g - a.g) * t
  out.b = a.b + (b.b - a.b) * t
  return out
}

/**
 * Day/night cycle. Drives the directional sun, ambient/hemisphere lights, fog
 * colour, sky sun position, and star opacity — all via refs so there are zero
 * React re-renders per frame.
 */
function DayNight() {
  const sunRef = useRef<THREE.DirectionalLight>(null!)
  const sunTarget = useRef<THREE.Object3D>(null!)
  const ambRef = useRef<THREE.AmbientLight>(null!)
  const hemiRef = useRef<THREE.HemisphereLight>(null!)
  const skyRef = useRef<any>(null!)
  const starsRef = useRef<any>(null!)
  const fogRef = useRef<THREE.Fog>(null!)

  const tmpColor = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    // Always day — no night cycle. Freeze at a bright mid-morning sun height.
    stats.dayTime = 0.4
    const t = stats.dayTime
    const sunAngle = t * Math.PI * 2 - Math.PI / 2
    const sunHeight = Math.sin(sunAngle) // ~0.95 at t=0.4 → high noon
    const sunX = Math.cos(sunAngle)
    stats.isNight = false

    // sun position relative to player
    const px = stats.pos.x
    const pz = stats.pos.z
    const sunDist = 55
    const sunY = Math.max(-30, sunHeight * 70)
    if (sunRef.current && sunTarget.current) {
      sunRef.current.position.set(
        px + sunX * sunDist,
        sunY,
        pz + sunDist * 0.6,
      )
      sunTarget.current.position.set(px, 0, pz)
      sunRef.current.target = sunTarget.current
      // sun intensity: bright at noon, 0 at night; dimmed by rain
      const dayFactor = Math.max(0, sunHeight)
      const rainDim = 1 - stats.rainIntensity * 0.6
      sunRef.current.intensity = (0.05 + dayFactor * 2.6) * rainDim
      // sun colour: white at noon, orange near horizon
      if (sunHeight > 0.35) {
        sunRef.current.color.copy(SUN_DAY)
      } else if (sunHeight > 0) {
        lerpColor(SUN_DUSK, SUN_DAY, sunHeight / 0.35, tmpColor)
        sunRef.current.color.copy(tmpColor)
      } else {
        sunRef.current.color.copy(SUN_DUSK)
      }
      sunRef.current.visible = sunHeight > -0.15
    }

    // ambient + hemisphere (dimmed by rain)
    const nightFactor = Math.max(0, -sunHeight)
    const dayFactor2 = Math.max(0, sunHeight)
    const rainAmbient = 1 - stats.rainIntensity * 0.4
    if (ambRef.current) {
      ambRef.current.intensity =
        (0.12 + dayFactor2 * 0.22 + nightFactor * 0.06) * rainAmbient
    }
    if (hemiRef.current) {
      lerpColor(HEMI_NIGHT, HEMI_DAY, dayFactor2, tmpColor)
      hemiRef.current.color.copy(tmpColor)
      hemiRef.current.intensity = (0.3 + dayFactor2 * 0.55) * rainAmbient
    }

    // fog colour: blend night ↔ dusk ↔ day; greyer + denser when raining
    if (fogRef.current) {
      if (sunHeight > 0.25) {
        fogRef.current.color.copy(FOG_DAY)
      } else if (sunHeight > -0.05) {
        const k = (sunHeight + 0.05) / 0.3
        lerpColor(FOG_DUSK, FOG_DAY, k, fogRef.current.color)
      } else {
        const k = Math.min(1, (-sunHeight) / 0.35)
        lerpColor(FOG_DUSK, FOG_NIGHT, k, fogRef.current.color)
      }
      // tint fog grey + bring it closer when raining
      if (stats.rainIntensity > 0.02) {
        fogRef.current.color.lerp(
          new THREE.Color('#7a8090'),
          stats.rainIntensity * 0.5,
        )
        fogRef.current.near = 55 - stats.rainIntensity * 25
        fogRef.current.far = 175 - stats.rainIntensity * 60
      } else {
        fogRef.current.near = 55
        fogRef.current.far = 175
      }
    }

    // sky sun position (drei Sky uses a material with uniforms)
    if (skyRef.current?.material?.uniforms?.sunPosition) {
      skyRef.current.material.uniforms.sunPosition.value.set(
        sunX * 100,
        sunHeight * 100,
        30,
      )
    }

    // stars opacity (visible at night)
    if (starsRef.current?.material) {
      const op = Math.max(0, Math.min(1, (-sunHeight - 0.05) / 0.35))
      starsRef.current.material.opacity = op
      starsRef.current.visible = op > 0.01
    }
  })

  return (
    <>
      <fog ref={fogRef} attach="fog" args={['#e7d6a8', 55, 175]} />
      <directionalLight
        ref={sunRef}
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
      <ambientLight ref={ambRef} intensity={0.25} />
      <hemisphereLight ref={hemiRef} args={['#bcd8ff', '#6b5536', 0.65]} />
      <object3D ref={sunTarget} />
      <Sky
        ref={skyRef}
        distance={4500}
        sunPosition={[40, 60, 30]}
        turbidity={6}
        rayleigh={1.2}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />
      <Stars
        ref={starsRef}
        radius={200}
        depth={60}
        count={1800}
        factor={5}
        saturation={0}
        fade
        speed={0.3}
      />
    </>
  )
}

function Scene() {
  const shadows = useGame((s) => s.settings.shadows)
  const graphics = useGame((s) => s.settings.graphics)
  return (
    <>
      <DayNight />
      <Terrain shadows={shadows} />
      <WaterHole />
      <SpawnClearing />
      <Suspense fallback={null}>
        <Environment shadows={shadows} />
      </Suspense>
      <Gazelles />
      <Warthogs />
      <Player />
      <RemoteLions />
      <DustParticles />
      <Weather />
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
