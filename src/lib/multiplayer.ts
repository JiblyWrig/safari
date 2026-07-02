'use client'

import { io, type Socket } from 'socket.io-client'
import * as THREE from 'three'
import type { PlayerConfig } from './store'

export type AnimState = 'idle' | 'walk' | 'run' | 'sprint' | 'jump'

export interface RemotePlayer {
  id: string
  config: PlayerConfig
  pos: THREE.Vector3
  targetPos: THREE.Vector3
  rot: number
  targetRot: number
  anim: AnimState
  vel: number
  lastUpdate: number
}

export interface ChatMsg {
  id: string
  playerId: string
  name: string
  content: string
  timestamp: number
}

type Listener = () => void

class MultiplayerClient {
  socket: Socket | null = null
  players = new Map<string, RemotePlayer>()
  chat: ChatMsg[] = []
  connected = false
  roomId: string | null = null
  selfId: string | null = null

  private listeners = new Set<Listener>()

  on(l: Listener) {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  private emit() {
    this.listeners.forEach((l) => l())
  }

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket?.connected) {
        resolve(true)
        return
      }
      // Never put port in URL; Caddy forwards via XTransformPort query.
      // Server uses engine.io path '/', so the client must match (default is
      // '/socket.io'). We pass the gateway port via the `query` option so it
      // is appended to every polling/websocket request.
      //
      // For external deployment (GitHub → Vercel + separate socket host), set
      // NEXT_PUBLIC_MULTIPLAYER_URL to the socket.io server origin; the client
      // then connects there directly with path '/'.
      const mpUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL
      const socket = mpUrl
        ? io(mpUrl, {
            path: '/',
            transports: ['polling', 'websocket'],
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 8,
            reconnectionDelay: 1000,
            timeout: 8000,
          })
        : io({
            path: '/',
            query: { XTransformPort: 3003 },
            transports: ['polling', 'websocket'],
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 8,
            reconnectionDelay: 1000,
            timeout: 8000,
          })
      this.socket = socket

      const ok = () => {
        this.connected = true
        this.selfId = socket.id ?? null
        this.emit()
        resolve(true)
      }
      socket.on('connect', ok)
      socket.on('disconnect', () => {
        this.connected = false
        this.emit()
      })
      socket.on('connect_error', () => {
        if (!this.connected) resolve(false)
      })

      socket.on('room-state', (data: { roomId: string; players: any[] }) => {
        this.roomId = data.roomId
        this.players.clear()
        for (const p of data.players) {
          if (p.id === this.selfId) continue
          this.upsertPlayer(p)
        }
        this.emit()
      })

      socket.on('player-joined', (data: { player: any }) => {
        this.upsertPlayer(data.player)
        this.emit()
      })

      socket.on('player-left', (data: { id: string }) => {
        this.players.delete(data.id)
        this.emit()
      })

      socket.on('state-update', (data: any) => {
        const p = this.players.get(data.id)
        if (!p) {
          this.upsertPlayer(data)
          return
        }
        p.targetPos.set(data.pos[0], data.pos[1], data.pos[2])
        // shortest-arc target rotation
        p.targetRot = data.rot
        p.anim = data.anim
        p.vel = data.vel
        p.lastUpdate = performance.now()
      })

      socket.on('chat', (msg: ChatMsg) => {
        this.chat = [...this.chat.slice(-49), msg]
        this.emit()
      })

      socket.on('emote', (data: { id: string; emote: string }) => {
        const p = this.players.get(data.id)
        if (p) {
          ;(p as any)._emote = data.emote
          ;(p as any)._emoteTime = performance.now()
        }
      })

      setTimeout(() => {
        if (!this.connected) resolve(false)
      }, 8500)
    })
  }

  private upsertPlayer(p: any) {
    const existing = this.players.get(p.id)
    const pos = p.pos
      ? new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2])
      : new THREE.Vector3()
    if (existing) {
      existing.config = p.config ?? existing.config
      existing.targetPos.copy(pos)
      existing.targetRot = p.rot ?? existing.targetRot
      existing.anim = p.anim ?? existing.anim
      existing.vel = p.vel ?? existing.vel
      existing.lastUpdate = performance.now()
    } else {
      this.players.set(p.id, {
        id: p.id,
        config: p.config ?? { name: 'Lion', color: '#c98a3a', maneColor: '#6e3f1a' },
        pos: pos.clone(),
        targetPos: pos.clone(),
        rot: p.rot ?? 0,
        targetRot: p.rot ?? 0,
        anim: p.anim ?? 'idle',
        vel: p.vel ?? 0,
        lastUpdate: performance.now(),
      })
    }
  }

  joinRoom(roomId: string, config: PlayerConfig) {
    this.socket?.emit('join-room', { roomId, config })
  }

  sendState(pos: [number, number, number], rot: number, anim: AnimState, vel: number) {
    if (!this.socket?.connected) return
    this.socket.emit('state-update', { pos, rot, anim, vel })
  }

  sendChat(content: string) {
    this.socket?.emit('chat', { content })
  }

  sendEmote(emote: string) {
    this.socket?.emit('emote', { emote })
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
    this.connected = false
    this.players.clear()
    this.chat = []
    this.roomId = null
    this.selfId = null
    this.emit()
  }
}

export const mp = new MultiplayerClient()
