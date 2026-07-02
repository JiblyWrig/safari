'use client'

import * as THREE from 'three'
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Lion, type LionAnimState } from './Lion'
import { input } from '@/lib/input'
import { terrainHeight, isInWater } from '@/lib/terrain'
import { mp, type AnimState } from '@/lib/multiplayer'
import { useGame } from '@/lib/store'
import { stats } from '@/lib/stats'
import { audio } from '@/lib/audio'

const WALK_SPEED = 5
const RUN_SPEED = 9
const SPRINT_SPEED = 14
const ACCEL = 14
const TURN_SPEED = 9
const GRAVITY = 22
const JUMP_FORCE = 8.5
const HEALTH_REGEN = 0.06 // per second when resting
const RESPAWN_DELAY = 4000 // ms
const ATTACK_RANGE = 3.2
const ATTACK_COOLDOWN = 600 // ms between attacks

export function Player() {
  const { camera } = useThree()
  const lionRef = useRef<THREE.Group>(null!)
  const lionState = useRef<LionAnimState>({
    anim: 'idle',
    speed: 0,
    roarAt: 0,
    attackAt: 0,
  })

  // movement state
  const pos = useRef(new THREE.Vector3(0, 0, 8))
  const vel = useRef(new THREE.Vector3())
  const vy = useRef(0)
  const onGround = useRef(true)
  const yaw = useRef(0) // lion facing
  const camYaw = useRef(0)
  const camPitch = useRef(0.45)
  const health = useRef(1)
  const dead = useRef(false)
  const respawnAt = useRef(0)
  const lastSend = useRef(0)
  const lastAttack = useRef(0)
  const fpsCounter = useRef({ frames: 0, t: 0 })
  // footstep timing
  const stepAccum = useRef(0)
  const lastDrinkSound = useRef(0)

  const player = useGame((s) => s.player)
  const settings = useGame((s) => s.settings)
  const mode = useGame((s) => s.mode)
  const roomId = useGame((s) => s.roomId)

  // initialize position on ground
  useEffect(() => {
    pos.current.set(0, terrainHeight(0, 8), 8)
    yaw.current = Math.PI
    camYaw.current = Math.PI
    health.current = 1
    dead.current = false
  }, [])

  // sync audio enabled/volume with settings
  useEffect(() => {
    audio.setEnabled(settings.audioEnabled)
    audio.setVolume(settings.volume)
  }, [settings.audioEnabled, settings.volume])

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

    // ---- Death / respawn ----
    if (dead.current) {
      stats.dead = true
      stats.health = 0
      if (time >= respawnAt.current) {
        // respawn
        dead.current = false
        health.current = 1
        stamina.current = 1
        pos.current.set(0, terrainHeight(0, 8), 8)
        vel.current.set(0, 0, 0)
        yaw.current = Math.PI
        camYaw.current = Math.PI
        audio.respawn()
        stats.dead = false
        stats.respawnAt = 0
      } else {
        stats.respawnAt = respawnAt.current
        // still update camera + stats but don't move
        if (lionRef.current) {
          lionRef.current.position.copy(pos.current)
          lionRef.current.rotation.y = yaw.current
        }
        return
      }
    }

    // ---- Mouse look ----
    const { dx, dy } = input.consumeMouse()
    const sens = 0.0024 * settings.sensitivity
    camYaw.current -= dx * sens
    // Inverted Y: mouse up → look up (pitch increases). settings.invertY flips back.
    camPitch.current += (settings.invertY ? -1 : 1) * dy * sens
    camPitch.current = THREE.MathUtils.clamp(camPitch.current, 0.12, 1.2)

    // ---- Input direction relative to camera ----
    let moveZ = 0
    let moveX = 0
    if (input.isTouch && (Math.abs(input.touchMove.x) > 0.1 || Math.abs(input.touchMove.y) > 0.1)) {
      // virtual joystick
      moveX = input.touchMove.x
      moveZ = input.touchMove.y
    } else {
      const fwd = input.keys.forward ? 1 : 0
      const back = input.keys.back ? 1 : 0
      const left = input.keys.left ? 1 : 0
      const right = input.keys.right ? 1 : 0
      moveZ = fwd - back
      // Inverted strafe so A = left, D = right (matches on-screen direction)
      moveX = left - right
    }
    const hasInput = Math.abs(moveZ) > 0.05 || Math.abs(moveX) > 0.05

    const sinY = Math.sin(camYaw.current)
    const cosY = Math.cos(camYaw.current)
    const fX = sinY
    const fZ = cosY
    const rX = cosY
    const rZ = -sinY
    let dirX = fX * moveZ + rX * moveX
    let dirZ = fZ * moveZ + rZ * moveX
    const dirLen = Math.hypot(dirX, dirZ)
    let moveMag = 1 // analog magnitude for speed scaling (0..1)
    if (dirLen > 0) {
      if (input.isTouch) {
        // analog: keep magnitude for speed, normalize for direction
        moveMag = Math.min(1, dirLen)
        dirX /= dirLen
        dirZ /= dirLen
      } else {
        dirX /= dirLen
        dirZ /= dirLen
      }
    }

    // ---- Speed (infinite sprint — no stamina drain) ----
    // Rain slows the lion (wet fur, muddy ground)
    const rainSlow = 1 - stats.rainIntensity * 0.25
    const wantSprint = input.keys.sprint && hasInput
    let targetSpeed = 0
    let anim: AnimState = 'idle'
    if (hasInput) {
      if (wantSprint) {
        targetSpeed = SPRINT_SPEED * rainSlow
        anim = 'sprint'
      } else if (input.keys.sprint) {
        targetSpeed = RUN_SPEED * moveMag * rainSlow
        anim = moveMag > 0.7 ? 'run' : 'walk'
      } else {
        targetSpeed = WALK_SPEED * moveMag * rainSlow
        anim = moveMag > 0.5 ? 'walk' : 'walk'
      }
    }
    if (!onGround.current) anim = 'jump'

    // ---- Health ----
    // Resting (idle) regenerates health
    if (!hasInput && onGround.current) {
      health.current = Math.min(1, health.current + HEALTH_REGEN * delta)
    }
    // Death check
    if (health.current <= 0 && !dead.current) {
      dead.current = true
      respawnAt.current = time + RESPAWN_DELAY
      audio.death()
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
    const drinking = inWater && speed < 1.5
    if (drinking) {
      health.current = Math.min(1, health.current + delta * 0.15)
      // periodic drink sound
      if (time - lastDrinkSound.current > 1500) {
        lastDrinkSound.current = time
        audio.drink()
      }
    }

    // ---- Apply to lion group ----
    if (lionRef.current) {
      lionRef.current.position.copy(pos.current)
      lionRef.current.rotation.y = yaw.current
    }

    // ---- Lion animation state ----
    const normSpeed = THREE.MathUtils.clamp(speed / SPRINT_SPEED, 0, 1)
    lionState.current.anim = anim
    lionState.current.speed = normSpeed

    // ---- Footsteps (synced to gait) ----
    if (onGround.current && speed > 0.5) {
      const stepInterval = anim === 'sprint' ? 0.22 : anim === 'run' ? 0.32 : 0.5
      stepAccum.current += delta
      if (stepAccum.current >= stepInterval) {
        stepAccum.current = 0
        audio.footstep(normSpeed)
      }
    } else {
      stepAccum.current = 0
    }

    // ---- Roar ----
    if (input.consumeRoar()) {
      lionState.current.roarAt = performance.now()
      audio.roar()
      if (mode === 'multi') mp.sendEmote('roar')
    }

    // ---- Attack (left-click) ----
    if (input.consumeAttack() && time - lastAttack.current > ATTACK_COOLDOWN) {
      lastAttack.current = time
      lionState.current.attackAt = performance.now()
      audio.footstep(1.2) // swipe whoosh approximation
      // hit detection: check prey in front of the lion
      const fx = pos.current.x + Math.sin(yaw.current) * ATTACK_RANGE
      const fz = pos.current.z + Math.cos(yaw.current) * ATTACK_RANGE
      const w = window as any
      const preys = w.__preyPositions as
        | { x: number; z: number; type: string }[]
        | undefined
      if (preys) {
        for (const p of preys) {
          if (Math.hypot(p.x - fx, p.z - fz) < 2.4) {
            stats.hunts++
            stats.huntToastAt = time
            audio.huntCatch()
            // queue the catch for prey components to process
            if (!w.__pendingCatches) w.__pendingCatches = []
            w.__pendingCatches.push({ x: p.x, z: p.z, at: time })
            break // one hit per swing
          }
        }
      }
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
    const camY = pos.current.y + eyeY + camDirY * dist
    const camZ = pos.current.z - camDirZ * dist
    const finalCamY = camY + (1 - cp) * height
    camera.position.lerp(
      new THREE.Vector3(camX, finalCamY, camZ),
      1 - Math.exp(-12 * delta),
    )
    camera.lookAt(pos.current.x, pos.current.y + eyeY * 0.8, pos.current.z)

    // ---- Stats for HUD ----
    stats.speed = speed
    stats.health = health.current
    stats.anim = anim
    stats.pos.copy(pos.current)
    stats.yaw = yaw.current
    stats.roaring = lionState.current.roarAt > 0 && performance.now() - lionState.current.roarAt < 1400
    stats.attacking = lionState.current.attackAt > 0 && performance.now() - lionState.current.attackAt < 500
    stats.inWater = inWater
    stats.drinking = drinking
    stats.dead = dead.current
    stats.respawnAt = respawnAt.current
    // cache name+color for leaderboard submit (resetStats doesn't clear these)
    stats.__lastName = player.name
    stats.__lastColor = player.color

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
    <group ref={lionRef} scale={player.isMale ? 1 : 0.88}>
      <Lion
        color={player.color}
        maneColor={player.maneColor}
        stateRef={lionState}
        initialAnim="idle"
        castShadow={settings.shadows}
        isMale={player.isMale}
      />
    </group>
  )
}
