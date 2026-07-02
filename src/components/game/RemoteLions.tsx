'use client'

import * as THREE from 'three'
import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Lion, type LionAnimState } from './Lion'
import { mp, type RemotePlayer } from '@/lib/multiplayer'
import { terrainHeight } from '@/lib/terrain'

/** Subscribe to the remote-player id set so React re-renders on join/leave. */
function useRemotePlayerIds(): string[] {
  const [ids, setIds] = useState<string[]>(() => Array.from(mp.players.keys()))
  useEffect(() => {
    const update = () => setIds(Array.from(mp.players.keys()))
    const off = mp.on(update)
    update()
    return () => {
      off()
    }
  }, [])
  return ids
}

function RemoteLion({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null!)
  const stateRef = useRef<LionAnimState>({
    anim: 'idle',
    speed: 0,
    roarAt: 0,
  })
  const yaw = useRef(0)
  const lastEmoteSeen = useRef(0)

  useFrame((_, delta) => {
    const p: RemotePlayer | undefined = mp.players.get(id)
    if (!p) return
    const g = group.current
    if (!g) return

    // interpolate position
    const lerpF = 1 - Math.exp(-10 * Math.min(delta, 0.05))
    p.pos.lerp(p.targetPos, lerpF)
    g.position.copy(p.pos)
    // keep on terrain if they haven't reported y well
    const groundY = terrainHeight(p.pos.x, p.pos.z)
    if (g.position.y < groundY) g.position.y = groundY

    // shortest-arc yaw
    let diff = p.targetRot - yaw.current
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    yaw.current += diff * lerpF
    g.rotation.y = yaw.current

    // anim
    stateRef.current.anim = p.anim
    stateRef.current.speed = Math.min(1, p.vel / 14)

    // emote
    const emoteTime = (p as any)._emoteTime as number | undefined
    if (emoteTime && emoteTime !== lastEmoteSeen.current) {
      lastEmoteSeen.current = emoteTime
      stateRef.current.roarAt = emoteTime
    }
  })

  const p = mp.players.get(id)
  const config = p?.config
  const name = config?.name ?? 'Lion'
  const color = config?.color ?? '#c98a3a'
  const maneColor = config?.maneColor ?? '#6e3f1a'
  const isMale = config?.isMale !== false

  return (
    <group ref={group} scale={isMale ? 1 : 0.88}>
      <Lion
        color={color}
        maneColor={maneColor}
        stateRef={stateRef}
        initialAnim="idle"
        nameTag={name}
        isMale={isMale}
      />
    </group>
  )
}

export function RemoteLions() {
  const ids = useRemotePlayerIds()
  return (
    <group>
      {ids.map((id) => (
        <RemoteLion key={id} id={id} />
      ))}
    </group>
  )
}
