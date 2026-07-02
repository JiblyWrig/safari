import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---- Types -----------------------------------------------------------------
type AnimState = 'idle' | 'walk' | 'run' | 'sprint' | 'jump'
interface PlayerConfig {
  name: string
  color: string // lion body color
  maneColor: string
  isMale: boolean
}
interface PlayerState {
  id: string
  config: PlayerConfig
  pos: [number, number, number]
  rot: number // yaw
  anim: AnimState
  vel: number
  lastSeen: number
}
interface ChatMessage {
  id: string
  playerId: string
  name: string
  content: string
  timestamp: number
}

interface Room {
  id: string
  players: Map<string, PlayerState>
}

const rooms = new Map<string, Room>()

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId)
  if (!room) {
    room = { id: roomId, players: new Map() }
    rooms.set(roomId, room)
    console.log(`[room] created ${roomId}`)
  }
  return room
}

function serializeRoom(room: Room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    config: p.config,
    pos: p.pos,
    rot: p.rot,
    anim: p.anim,
    vel: p.vel,
  }))
}

const genId = () => Math.random().toString(36).slice(2, 10)

// ---- Connection handling ---------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[socket] connected ${socket.id}`)
  let currentRoomId: string | null = null

  socket.on('join-room', (data: { roomId: string; config: PlayerConfig }) => {
    const { roomId, config } = data
    const room = getOrCreateRoom(roomId)

    // Leave previous room if any
    if (currentRoomId && currentRoomId !== roomId) {
      leaveRoom(socket, currentRoomId)
    }

    currentRoomId = roomId
    socket.join(roomId)

    const player: PlayerState = {
      id: socket.id,
      config: {
        name: (config?.name || 'Lion').slice(0, 24),
        color: config?.color || '#c98a3a',
        maneColor: config?.maneColor || '#7a4a1e',
        isMale: config?.isMale !== false,
      },
      pos: [0, 0, 0],
      rot: 0,
      anim: 'idle',
      vel: 0,
      lastSeen: Date.now(),
    }
    room.players.set(socket.id, player)

    // Send current room state to the new player
    socket.emit('room-state', { roomId, players: serializeRoom(room) })

    // Notify others
    socket.to(roomId).emit('player-joined', {
      player: {
        id: player.id,
        config: player.config,
        pos: player.pos,
        rot: player.rot,
        anim: player.anim,
        vel: player.vel,
      },
    })

    console.log(
      `[room:${roomId}] ${player.config.name} joined (${room.players.size} players)`,
    )
  })

  socket.on(
    'state-update',
    (data: {
      pos: [number, number, number]
      rot: number
      anim: AnimState
      vel: number
    }) => {
      if (!currentRoomId) return
      const room = rooms.get(currentRoomId)
      if (!room) return
      const player = room.players.get(socket.id)
      if (!player) return
      player.pos = data.pos
      player.rot = data.rot
      player.anim = data.anim
      player.vel = data.vel
      player.lastSeen = Date.now()

      // Broadcast to others (client interpolation smooths this)
      socket.to(currentRoomId).emit('state-update', {
        id: socket.id,
        pos: data.pos,
        rot: data.rot,
        anim: data.anim,
        vel: data.vel,
      })
    },
  )

  socket.on('chat', (data: { content: string }) => {
    if (!currentRoomId) return
    const room = rooms.get(currentRoomId)
    if (!room) return
    const player = room.players.get(socket.id)
    if (!player) return
    const content = (data?.content || '').toString().slice(0, 200).trim()
    if (!content) return
    const msg: ChatMessage = {
      id: genId(),
      playerId: socket.id,
      name: player.config.name,
      content,
      timestamp: Date.now(),
    }
    io.to(currentRoomId).emit('chat', msg)
  })

  socket.on('emote', (data: { emote: string }) => {
    if (!currentRoomId) return
    socket.to(currentRoomId).emit('emote', {
      id: socket.id,
      emote: data?.emote || 'roar',
    })
  })

  socket.on('leave-room', () => {
    if (currentRoomId) {
      leaveRoom(socket, currentRoomId)
      currentRoomId = null
    }
  })

  socket.on('disconnect', () => {
    if (currentRoomId) {
      leaveRoom(socket, currentRoomId)
      currentRoomId = null
    }
    console.log(`[socket] disconnected ${socket.id}`)
  })

  socket.on('error', (err) => {
    console.error(`[socket] error ${socket.id}:`, err)
  })
})

function leaveRoom(socket: any, roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return
  const player = room.players.get(socket.id)
  room.players.delete(socket.id)
  socket.leave(roomId)
  if (player) {
    socket.to(roomId).emit('player-left', { id: socket.id })
    console.log(
      `[room:${roomId}] ${player.config.name} left (${room.players.size} players)`,
    )
  }
  if (room.players.size === 0) {
    rooms.delete(roomId)
    console.log(`[room] removed empty ${roomId}`)
  }
}

// Render/Railway/Fly set PORT automatically. Fall back to 3003 for local dev.
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[lion-multiplayer] socket.io server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[lion-multiplayer] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[lion-multiplayer] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
