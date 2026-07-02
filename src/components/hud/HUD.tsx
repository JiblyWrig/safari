'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGame } from '@/lib/store'
import { stats } from '@/lib/stats'
import { mp } from '@/lib/multiplayer'
import { WORLD_SIZE } from '@/lib/terrain'
import {
  Heart,
  Users,
  LogOut,
  Map as MapIcon,
  Sun,
  Droplets,
  Skull,
  CloudRain,
  Swords,
} from 'lucide-react'
import { usePhotoMode } from './PhotoMode'

const ANIM_LABEL: Record<string, string> = {
  idle: 'Resting',
  walk: 'Walking',
  run: 'Trotting',
  sprint: 'Sprinting',
  jump: 'Leaping',
}

function useHudStats() {
  const [s, setS] = useState({
    health: 1,
    anim: 'idle',
    fps: 0,
    roaring: false,
    attacking: false,
    inWater: false,
    drinking: false,
    playerCount: 1,
    dead: false,
    respawnAt: 0,
    rainIntensity: 0,
  })
  useEffect(() => {
    const id = setInterval(() => {
      setS({
        health: stats.health,
        anim: stats.anim,
        fps: stats.fps,
        roaring: stats.roaring,
        attacking: stats.attacking,
        inWater: stats.inWater,
        drinking: stats.drinking,
        playerCount: mp.players.size + 1,
        dead: stats.dead,
        respawnAt: stats.respawnAt,
        rainIntensity: stats.rainIntensity,
      })
    }, 100)
    return () => clearInterval(id)
  }, [])
  return s
}

function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { player } = useGame()
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const size = 150
    const half = WORLD_SIZE / 2
    const id = setInterval(() => {
      ctx.clearRect(0, 0, size, size)
      // background savannah — always bright day
      ctx.fillStyle = '#7c9a44'
      ctx.fillRect(0, 0, size, size)
      // water hole
      const wx = ((70 + half) / WORLD_SIZE) * size
      const wy = ((70 + half) / WORLD_SIZE) * size
      ctx.fillStyle = '#3f7fa8'
      ctx.beginPath()
      ctx.arc(wx, wy, (22 / WORLD_SIZE) * size, 0, Math.PI * 2)
      ctx.fill()
      // ridge
      const rx = ((-80 + half) / WORLD_SIZE) * size
      const ry = ((-80 + half) / WORLD_SIZE) * size
      ctx.fillStyle = 'rgba(125,119,112,0.6)'
      ctx.beginPath()
      ctx.arc(rx, ry, (38 / WORLD_SIZE) * size, 0, Math.PI * 2)
      ctx.fill()
      // remote players
      mp.players.forEach((p) => {
        const px = ((p.pos.x + half) / WORLD_SIZE) * size
        const py = ((p.pos.z + half) / WORLD_SIZE) * size
        ctx.fillStyle = p.config.color || '#fff'
        ctx.beginPath()
        ctx.arc(px, py, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
      })
      // self
      const sx = ((stats.pos.x + half) / WORLD_SIZE) * size
      const sy = ((stats.pos.z + half) / WORLD_SIZE) * size
      ctx.fillStyle = player.color
      ctx.beginPath()
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      // facing arrow
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(
        sx + Math.sin(stats.yaw) * 8,
        sy + Math.cos(stats.yaw) * 8,
      )
      ctx.stroke()
      // border
      ctx.strokeStyle = 'rgba(60,40,20,0.7)'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, size, size)
    }, 100)
    return () => clearInterval(id)
  }, [player.color])
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={150}
        height={150}
        className="rounded-lg border-2 border-amber-900/40 shadow-xl"
      />
      <div className="absolute -top-2 -right-2 bg-amber-900/80 text-amber-50 rounded-full p-1 shadow-md">
        <MapIcon className="w-3 h-3" />
      </div>
    </div>
  )
}

export function HUD() {
  const s = useHudStats()
  const exitToMenu = useGame((st) => st.exitToMenu)
  const mode = useGame((st) => st.mode)
  const showMinimap = useGame((st) => st.settings.showMinimap)
  const photoMode = usePhotoMode()

  if (photoMode) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          {showMinimap && <Minimap />}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-amber-900/70 text-amber-50 border-amber-700/50 backdrop-blur-sm"
            >
              <Users className="w-3 h-3 mr-1" />
              {mode === 'multi' ? `${s.playerCount} in savannah` : 'Solo'}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-black/50 text-amber-300 border-white/10 backdrop-blur-sm"
            >
              <Sun className="w-3 h-3 mr-1" />
              Day
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {s.fps > 0 && (
            <Badge
              variant="secondary"
              className="bg-black/50 text-emerald-300 border-white/10 backdrop-blur-sm font-mono"
            >
              {s.fps} FPS
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-auto bg-red-900/80 hover:bg-red-800 text-red-50 border-red-700/50 backdrop-blur-sm"
            onClick={exitToMenu}
          >
            <LogOut className="w-4 h-4 mr-1" />
            Leave
          </Button>
        </div>
      </div>

      {/* Bottom-left: vitals (health + status only) */}
      <div className="absolute bottom-4 left-3 sm:left-4 flex flex-col gap-2 w-48">
        <div className="bg-black/55 backdrop-blur-md rounded-xl p-3 border border-amber-900/40 shadow-xl">
          {/* Health */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-amber-100/90 text-xs font-semibold flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              Health
            </span>
            <span className="text-amber-50/70 text-[10px] font-mono">
              {Math.round(s.health * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-black/50 rounded-full overflow-hidden border border-amber-950/50">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${s.health * 100}%`,
                background:
                  s.health > 0.4
                    ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                    : 'linear-gradient(90deg,#b91c1c,#ef4444)',
              }}
            />
          </div>
          {/* Status badges */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            <Badge className="bg-amber-700/70 text-amber-50 border-amber-600/40 text-[10px] py-0">
              {ANIM_LABEL[s.anim] ?? s.anim}
            </Badge>
            {s.attacking && (
              <Badge className="bg-orange-600/80 text-orange-50 border-orange-500/40 text-[10px] py-0 animate-pulse">
                <Swords className="w-3 h-3 mr-0.5" />
                Swipe!
              </Badge>
            )}
            {s.roaring && (
              <Badge className="bg-red-700/80 text-red-50 border-red-600/40 text-[10px] py-0 animate-pulse">
                ROAR!
              </Badge>
            )}
            {s.drinking && (
              <Badge className="bg-sky-600/80 text-sky-50 border-sky-500/40 text-[10px] py-0 animate-pulse">
                <Droplets className="w-3 h-3 mr-0.5" />
                Drinking
              </Badge>
            )}
            {s.inWater && !s.drinking && (
              <Badge className="bg-sky-700/70 text-sky-50 border-sky-600/40 text-[10px] py-0">
                Water
              </Badge>
            )}
            {s.rainIntensity > 0.1 && (
              <Badge className="bg-slate-600/70 text-sky-50 border-slate-500/40 text-[10px] py-0 animate-pulse">
                <CloudRain className="w-3 h-3 mr-0.5" />
                Rain
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bottom-center: controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:block">
        <div className="bg-black/45 backdrop-blur-md rounded-full px-4 py-1.5 border border-amber-900/40 shadow-lg flex items-center gap-3 text-[11px] text-amber-100/80">
          <span><kbd className="font-mono text-amber-200">WASD</kbd> Move</span>
          <span className="text-amber-700">·</span>
          <span><kbd className="font-mono text-amber-200">Shift</kbd> Sprint</span>
          <span className="text-amber-700">·</span>
          <span><kbd className="font-mono text-amber-200">Space</kbd> Jump</span>
          <span className="text-amber-700">·</span>
          <span><kbd className="font-mono text-amber-200">Click</kbd> Attack</span>
          <span className="text-amber-700">·</span>
          <span><kbd className="font-mono text-amber-200">R</kbd> Roar</span>
          <span className="text-amber-700">·</span>
          <span><kbd className="font-mono text-amber-200">Mouse</kbd> Look</span>
        </div>
      </div>

      {/* Death overlay */}
      {s.dead && <DeathOverlay respawnAt={s.respawnAt} />}
    </div>
  )
}

function DeathOverlay({ respawnAt }: { respawnAt: number }) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((respawnAt - performance.now()) / 1000)))
    }, 100)
    return () => clearInterval(id)
  }, [respawnAt])
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-red-950/60 backdrop-blur-sm pointer-events-none">
      <div className="text-center px-8 py-6 bg-black/70 rounded-2xl border-2 border-red-800/60 shadow-2xl">
        <Skull className="w-16 h-16 text-red-400 mx-auto mb-3 animate-pulse" />
        <h2 className="text-3xl font-black text-red-100 mb-1 tracking-wider">YOU FELL</h2>
        <p className="text-red-200/70 text-sm mb-3">
          Your lion has collapsed…
        </p>
        <p className="text-amber-200 text-lg font-semibold">
          Respawning in {remaining}s
        </p>
      </div>
    </div>
  )
}
