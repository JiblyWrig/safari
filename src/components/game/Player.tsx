'use client'

import * as THREE from 'three'
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Lion, type LionAnimState } from './Lion'
import { input } from '@/lib/input'
import { terrainHeight, isInWater, WATER_LEVEL } from '@/lib/terrain'
import { mp, type AnimState } from '@/lib/multiplayer'
import { useGame } from '@/lib/store'
import { stats } from '@/lib/stats'

const WALK_SPEED = 5
const RUN_SPEED = 9
const SPRINT_SPEED = 14
const ACCEL = 14
const TURN_SPEED = 9
const GRAVITY = 22
const JUMP_FORCE = 8.5
const SPRINT_DRAIN = 0.32
const STAMINA_REGEN = 0.18

export function Player() {
  const { camera } = useThree()
  const lionRef = useRef<THREE.Group>(null!)
  const lionState = useRef<LionAnimState>({
    anim: 'idle',
    speed: 0,
    roarAt: 0,
  })

  // movement state
  const pos = useRef(new THREE.Vector3(0, 0, 8))
  const vel = useRef(new THREE.Vector3())
  const vy = useRef(0)
  const onGround = useRef(true)
  const yaw = useRef(0) // lion facing
  const camYaw = useRef(0)
  const camPitch = useRef(0.45)
  const stamina = useRef(1)
  const lastSend = useRef(0)
  const fpsCounter = useRef({ frames: 0, t: 0 })

  const player = useGame((s) => s.player)
  const settings = useGame((s) => s.settings)
  const mode = useGame((s) => s.mode)
  const roomId = useGame((s) => s.roomId)

  // initialize position on ground
  useEffect(() => {
    pos.current.set(0, terrainHeight(0, 8), 8)
    yaw.current = Math.PI
    camYaw.current = Math.PI
  }, [])

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05) // clamp for stability
    const time = performance.now()

    // ---- FPS ----
    fpsCounter.current.frames++
    fpsCounter.current.t += deltaRaw
    if (fpsCounter.current.t >= 0.5) {
      stats.fps = Math.round(fpsCounter.current.frames / fpsCounter.current.t)
      fpsCounter.current.frames = 0
      fpsCounter.current.t = 0
    }

    // ---- Mouse look ----
    const { dx, dy } = input.consumeMouse()
    const sens = 0.0024 * settings.sensitivity
    camYaw.current -= dx * sens
    camPitch.current += (settings.invertY ? 1 : -1) * dy * sens
    camPitch.current = THREE.MathUtils.clamp(camPitch.current, 0.12, 1.2)

    // ---- Input direction relative to camera ----
    const fwd = input.keys.forward ? 1 : 0
    const back = input.keys.back ? 1 : 0
    const left = input.keys.left ? 1 : 0
    const right = input.keys.right ? 1 : 0
    const moveZ = fwd - back
    const moveX = right - left
    const hasInput = moveZ !== 0 || moveX !== 0

    const sinY = Math.sin(camYaw.current)
    const cosY = Math.cos(camYaw.current)
    // forward vector (where camera looks horizontally)
    const fX = sinY
    const fZ = cosY
    // right vector
    const rX = cosY
    const rZ = -sinY
    let dirX = fX * moveZ + rX * moveX
    let dirZ = fZ * moveZ + rZ * moveX
    const dirLen = Math.hypot(dirX, dirZ)
    if (dirLen > 0) {
      dirX /= dirLen
      dirZ /= dirLen
    }

    // ---- Stamina + target speed ----
    const wantSprint = input.keys.sprint && hasInput && stamina.current > 0.02
    let targetSpeed = 0
    let anim: AnimState = 'idle'
    if (hasInput) {
      if (wantSprint) {
        targetSpeed = SPRINT_SPEED
        anim = 'sprint'
        stamina.current = Math.max(0, stamina.current - SPRINT_DRAIN * delta)
      } else if (input.keys.sprint) {
        targetSpeed = RUN_SPEED
        anim = 'run'
      } else {
        targetSpeed = WALK_SPEED
        anim = 'walk'
      }
    } else {
      stamina.current = Math.min(1, stamina.current + STAMINA_REGEN * delta * 2)
    }
    if (!onGround.current) anim = 'jump'
    if (wantSprint) stamina.current = Math.max(0, stamina.current - 0) // already drained
    // regen when not sprinting
    if (!wantSprint) {
      stamina.current = Math.min(1, stamina.current + STAMINA_REGEN * delta)
    }

    // ---- Acceleration ----
    const targetVX = dirX * targetSpeed
    const targetVZ = dirZ * targetSpeed
    const accel = hasInput ? ACCEL : ACCEL * 1.6
    vel.current.x = THREE.MathUtils.lerp(vel.current.x, targetVX, 1 - Math.exp(-accel * delta))
    vel.current.z = THREE.MathUtils.lerp(vel.current.z, targetVZ, 1 - Math.exp(-accel * delta))

    // ---- Turn lion toward movement ----
    const speed = Math.hypot(vel.current.x, vel.current.z)
    if (speed > 0.4) {
      const targetYaw = Math.atan2(vel.current.x, vel.current.z)
      // shortest arc lerp
      let diff = targetYaw - yaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      yaw.current += diff * (1 - Math.exp(-TURN_SPEED * delta))
    }

    // ---- Jump + gravity ----
    if (input.keys.jump && onGround.current) {
      vy.current = JUMP_FORCE
      onGround.current = false
    }
    vy.current -= GRAVITY * delta

    // ---- Integrate ----
    pos.current.x += vel.current.x * delta
    pos.current.z += vel.current.z * delta
    pos.current.y += vy.current * delta

    // ---- Ground collision ----
    const groundY = terrainHeight(pos.current.x, pos.current.z)
    if (pos.current.y <= groundY) {
      pos.current.y = groundY
      vy.current = 0
      onGround.current = true
    }

    // ---- World bounds ----
    const bound = 116
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -bound, bound)
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -bound, bound)

    // ---- Water feedback ----
    const inWater = isInWater(pos.current.x, pos.current.z)

    // ---- Apply to lion group ----
    if (lionRef.current) {
      lionRef.current.position.copy(pos.current)
      lionRef.current.rotation.y = yaw.current
    }

    // ---- Lion animation state ----
    const normSpeed = THREE.MathUtils.clamp(speed / SPRINT_SPEED, 0, 1)
    lionState.current.anim = anim
    lionState.current.speed = normSpeed

    // ---- Roar ----
    if (input.consumeRoar()) {
      lionState.current.roarAt = performance.now()
      if (mode === 'multi') mp.sendEmote('roar')
    }

    // ---- Camera (third person) ----
    const cp = camPitch.current
    const cy = camYaw.current
    const dist = settings.cameraDistance
    const height = settings.cameraHeight
    const camDirX = Math.sin(cy) * Math.cos(cp)
    const camDirY = Math.sin(cp)
    const camDirZ = Math.cos(cy) * Math.cos(cp)
    const eyeY = 1.7
    const camX = pos.current.x - camDirX * dist
    const camY = pos.current.y + eyeY + camDirY * dist + height * 0.0
    const camZ = pos.current.z - camDirZ * dist
    // raise camera so it sits above based on height setting
    const finalCamY = camY + (1 - cp) * height
    camera.position.lerp(
      new THREE.Vector3(camX, finalCamY, camZ),
      1 - Math.exp(-12 * delta),
    )
    camera.lookAt(pos.current.x, pos.current.y + eyeY * 0.8, pos.current.z)

    // ---- Stats for HUD ----
    stats.speed = speed
    stats.stamina = stamina.current
    stats.anim = anim
    stats.pos.copy(pos.current)
    stats.yaw = yaw.current
    stats.roaring = lionState.current.roarAt > 0 && performance.now() - lionState.current.roarAt < 1400
    stats.inWater = inWater

    // ---- Multiplayer sync (~18Hz) ----
    if (mode === 'multi' && mp.connected) {
      if (time - lastSend.current > 55) {
        lastSend.current = time
        mp.sendState(
          [
            +pos.current.x.toFixed(2),
            +pos.current.y.toFixed(2),
            +pos.current.z.toFixed(2),
          ],
          +yaw.current.toFixed(3),
          anim,
          +speed.toFixed(2),
        )
      }
    }
  })

  // join room on mount (multi)
  useEffect(() => {
    if (mode === 'multi' && mp.connected) {
      mp.joinRoom(roomId, player)
    }
  }, [mode, roomId, player])

  return (
    <group ref={lionRef}>
      <Lion
        color={player.color}
        maneColor={player.maneColor}
        stateRef={lionState}
        initialAnim="idle"
        castShadow={settings.shadows}
      />
    </group>
  )
}
