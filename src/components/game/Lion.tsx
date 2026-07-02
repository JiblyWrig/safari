'use client'

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { AnimState } from '@/lib/multiplayer'

export interface LionAnimState {
  anim: AnimState
  speed: number // 0..1 normalized gait intensity
  roarAt: number // performance.now() ms when roar triggered, 0 = none
  attackAt: number // performance.now() ms when attack triggered, 0 = none
}

interface LionProps {
  color?: string
  maneColor?: string
  stateRef?: React.MutableRefObject<LionAnimState>
  initialAnim?: AnimState
  castShadow?: boolean
  nameTag?: string
  isMale?: boolean
}

export function Lion({
  color = '#c98a3a',
  maneColor = '#6e3f1a',
  stateRef,
  initialAnim = 'idle',
  castShadow = true,
  nameTag,
  isMale = true,
}: LionProps) {
  // Refs to animated bones
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const neck = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const jaw = useRef<THREE.Mesh>(null!)
  const mane = useRef<THREE.Mesh>(null!)
  const tail = useRef<THREE.Group>(null!)
  const tail2 = useRef<THREE.Group>(null!)
  const legFL = useRef<THREE.Group>(null!)
  const legFR = useRef<THREE.Group>(null!)
  const legBL = useRef<THREE.Group>(null!)
  const legBR = useRef<THREE.Group>(null!)
  const kneeFL = useRef<THREE.Group>(null!)
  const kneeFR = useRef<THREE.Group>(null!)
  const kneeBL = useRef<THREE.Group>(null!)
  const kneeBR = useRef<THREE.Group>(null!)

  const internal = useRef<LionAnimState>({
    anim: initialAnim,
    speed: 0,
    roarAt: 0,
    attackAt: 0,
  })
  const st = stateRef ?? internal
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta
    const time = t.current
    const { anim, speed, roarAt, attackAt } = st.current

    // ---- Gait parameters ----
    let freq = 0
    let amp = 0
    let bob = 0
    if (anim === 'walk') {
      freq = 4.2
      amp = 0.5 * (0.4 + speed * 0.6)
      bob = 0.04
    } else if (anim === 'run') {
      freq = 7.5
      amp = 0.85
      bob = 0.12
    } else if (anim === 'sprint') {
      freq = 10
      amp = 1.05
      bob = 0.18
    } else if (anim === 'jump') {
      freq = 0
      amp = 0
      bob = 0
    } else {
      // idle breathing
      bob = Math.sin(time * 1.6) * 0.015
    }

    const phase = time * freq
    // diagonal gait: FL+BR together, FR+BL together
    const sFL = Math.sin(phase)
    const sFR = Math.sin(phase + Math.PI)
    const sBL = Math.sin(phase + Math.PI)
    const sBR = Math.sin(phase)

    const swing = amp * 0.7
    const kneeBend = Math.max(0, Math.sin(phase)) * amp * 0.9

    // legs swing around X axis (forward/back)
    if (legFL.current) legFL.current.rotation.x = sFL * swing
    if (legFR.current) legFR.current.rotation.x = sFR * swing
    if (legBL.current) legBL.current.rotation.x = sBL * swing + 0.1
    if (legBR.current) legBR.current.rotation.x = sBR * swing + 0.1
    // knees bend
    if (kneeFL.current) kneeFL.current.rotation.x = -kneeBend - 0.2
    if (kneeFR.current) kneeFR.current.rotation.x = -kneeBend - 0.2
    if (kneeBL.current)
      kneeBL.current.rotation.x =
        -Math.max(0, Math.sin(phase + Math.PI)) * amp * 1.1 - 0.3
    if (kneeBR.current)
      kneeBR.current.rotation.x =
        -Math.max(0, Math.sin(phase)) * amp * 1.1 - 0.3

    // body bob + slight pitch
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(phase)) * bob + bob * 1.5
      body.current.rotation.x = Math.sin(phase) * amp * 0.03
      body.current.rotation.z = Math.sin(phase) * amp * 0.02
    }

    // neck/head subtle counter-bob + look ahead
    if (neck.current) {
      neck.current.rotation.x =
        -Math.abs(Math.sin(phase)) * bob * 0.8 + (anim === 'sprint' ? -0.12 : -0.02)
    }
    if (head.current) {
      head.current.rotation.x = Math.sin(time * 0.7) * 0.04
      head.current.rotation.y = Math.sin(time * 0.5) * 0.05
    }

    // tail sway
    if (tail.current) {
      tail.current.rotation.z = Math.sin(time * 2.2) * 0.3 + 0.1
      tail.current.rotation.x = Math.sin(time * 1.8) * 0.15
    }
    if (tail2.current) {
      tail2.current.rotation.z = Math.sin(time * 2.6 + 0.5) * 0.4
    }

    // ---- Roar envelope ----
    let roarEnv = 0
    if (roarAt > 0) {
      const e = (performance.now() - roarAt) / 1400
      if (e >= 0 && e < 1) {
        roarEnv = Math.sin(Math.min(1, e) * Math.PI)
      }
    }
    if (neck.current) {
      neck.current.rotation.x += -0.6 * roarEnv
    }
    if (jaw.current) {
      jaw.current.rotation.x = 0.5 * roarEnv
    }
    if (mane.current) {
      const s = 1 + 0.12 * roarEnv
      mane.current.scale.set(s, s, s)
    }

    // ---- Attack paw swing ----
    // The right front paw swings forward and up in a 0.5s arc.
    let attackEnv = 0
    if (attackAt > 0) {
      const e = (performance.now() - attackAt) / 500
      if (e >= 0 && e < 1) {
        // sharp rise, smooth fall
        attackEnv = Math.sin(e * Math.PI)
      }
    }
    if (legFR.current && kneeFR.current) {
      // Override the gait swing with the attack swing (stronger)
      legFR.current.rotation.x = -1.4 * attackEnv + legFR.current.rotation.x * (1 - attackEnv)
      kneeFR.current.rotation.x = -1.2 * attackEnv + kneeFR.current.rotation.x * (1 - attackEnv)
    }
    // slight body lunge forward during attack
    if (body.current) {
      body.current.rotation.x += attackEnv * 0.12
    }
  })

  // ---- Materials ----
  const furMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0,
      }),
    [color],
  )
  const maneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: maneColor,
        roughness: 0.95,
        metalness: 0,
      }),
    [maneColor],
  )
  const darkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3a2a1a',
        roughness: 0.7,
      }),
    [],
  )
  const eyeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        roughness: 0.3,
        emissive: '#3a2a00',
        emissiveIntensity: 0.2,
      }),
    [],
  )
  const noseMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a2020', roughness: 0.6 }),
    [],
  )
  const pawMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: 0.8 }),
    [],
  )

  // Leg renderer (plain helper, not a component — avoids re-creation lint)
  const renderLeg = (
    hipRef: React.RefObject<THREE.Group>,
    kneeRef: React.RefObject<THREE.Group>,
    x: number,
    z: number,
  ) => (
    <group ref={hipRef} position={[x, 1.12, z]}>
      <mesh castShadow={castShadow} material={furMat} position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.13, 0.11, 0.56, 8]} />
      </mesh>
      <group ref={kneeRef} position={[0, -0.56, 0]}>
        <mesh castShadow={castShadow} material={furMat} position={[0, -0.27, 0.02]}>
          <cylinderGeometry args={[0.1, 0.085, 0.56, 8]} />
        </mesh>
        <mesh castShadow={castShadow} material={pawMat} position={[0, -0.56, 0.04]}>
          <boxGeometry args={[0.17, 0.1, 0.2]} />
        </mesh>
      </group>
    </group>
  )

  return (
    <group ref={root}>
      <group ref={body} position={[0, 0, 0]}>
        {/* torso */}
        <mesh castShadow={castShadow} material={furMat} position={[0, 1.35, 0]}>
          <boxGeometry args={[0.72, 0.78, 2.1]} />
        </mesh>
        {/* chest (front, +Z) */}
        <mesh castShadow={castShadow} material={furMat} position={[0, 1.4, 1.0]}>
          <sphereGeometry args={[0.5, 12, 10]} />
        </mesh>
        {/* rump (back, -Z) */}
        <mesh castShadow={castShadow} material={furMat} position={[0, 1.45, -1.05]}>
          <sphereGeometry args={[0.52, 12, 10]} />
        </mesh>
        {/* belly underline (slightly darker) */}
        <mesh material={darkMat} position={[0, 1.05, 0]}>
          <boxGeometry args={[0.6, 0.4, 1.7]} />
        </mesh>

        {/* neck */}
        <group ref={neck} position={[0, 1.55, 0.95]}>
          <mesh
            castShadow={castShadow}
            material={furMat}
            position={[0, 0.18, 0.25]}
            rotation={[-0.3, 0, 0]}
          >
            <cylinderGeometry args={[0.28, 0.34, 0.7, 10]} />
          </mesh>

          {/* head group */}
          <group ref={head} position={[0, 0.5, 0.6]}>
            <mesh castShadow={castShadow} material={furMat}>
              <sphereGeometry args={[0.34, 14, 12]} />
            </mesh>
            <mesh
              castShadow={castShadow}
              material={furMat}
              position={[0, -0.1, 0.34]}
              rotation={[0.4, 0, 0]}
            >
              <coneGeometry args={[0.2, 0.45, 10]} />
            </mesh>
            <mesh material={noseMat} position={[0, -0.18, 0.55]}>
              <sphereGeometry args={[0.07, 8, 8]} />
            </mesh>
            <mesh ref={jaw} material={darkMat} position={[0, -0.18, 0.32]}>
              <boxGeometry args={[0.26, 0.12, 0.34]} />
            </mesh>
            <mesh material={eyeMat} position={[0.14, 0.12, 0.26]}>
              <sphereGeometry args={[0.055, 8, 8]} />
            </mesh>
            <mesh material={eyeMat} position={[-0.14, 0.12, 0.26]}>
              <sphereGeometry args={[0.055, 8, 8]} />
            </mesh>
            <mesh
              castShadow={castShadow}
              material={furMat}
              position={[0.2, 0.3, -0.05]}
              rotation={[0, 0, -0.3]}
            >
              <coneGeometry args={[0.12, 0.22, 6]} />
            </mesh>
            <mesh
              castShadow={castShadow}
              material={furMat}
              position={[-0.2, 0.3, -0.05]}
              rotation={[0, 0, 0.3]}
            >
              <coneGeometry args={[0.12, 0.22, 6]} />
            </mesh>

            {/* mane (males) */}
            {isMale && (
              <mesh ref={mane} castShadow={castShadow} material={maneMat} position={[0, 0.05, -0.12]}>
                <torusGeometry args={[0.42, 0.26, 10, 18]} />
              </mesh>
            )}
          </group>
        </group>

        {/* tail */}
        <group ref={tail} position={[0, 1.5, -1.15]}>
          <mesh castShadow={castShadow} material={furMat} position={[0, -0.15, -0.1]} rotation={[0.6, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.04, 0.6, 6]} />
          </mesh>
          <group ref={tail2} position={[0, -0.4, -0.3]}>
            <mesh castShadow={castShadow} material={furMat} position={[0, -0.2, -0.1]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.03, 0.5, 6]} />
            </mesh>
            <mesh castShadow={castShadow} material={maneMat} position={[0, -0.45, -0.32]}>
              <coneGeometry args={[0.12, 0.3, 8]} />
            </mesh>
          </group>
        </group>

        {/* legs */}
        {renderLeg(legFL, kneeFL, -0.24, 0.78)}
        {renderLeg(legFR, kneeFR, 0.24, 0.78)}
        {renderLeg(legBL, kneeBL, -0.24, -0.78)}
        {renderLeg(legBR, kneeBR, 0.24, -0.78)}
      </group>

      {nameTag && <NameTag text={nameTag} />}
    </group>
  )
}

function NameTag({ text }: { text: string }) {
  return (
    <Html position={[0, 2.7, 0]} center distanceFactor={14} occlude={false}>
      <div
        style={{
          background: 'rgba(20,16,12,0.78)',
          color: '#ffe9c4',
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,200,120,0.35)',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {text}
      </div>
    </Html>
  )
}

export type { AnimState }
