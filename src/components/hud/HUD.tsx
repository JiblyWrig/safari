'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGame } from '@/lib/store'
import { stats } from '@/lib/stats'
import { mp } from '@/lib/multiplayer'
import { terrainHeight, WATER_LEVEL, WORLD_SIZE } from '@/lib/terrain'
import {
  Heart,
  Gauge,
  Users,
  LogOut,
  Crosshair,
  Map as MapIcon,
} from 'lucide-react'

const ANIM_LABEL: Record<string, string> = {
  idle: 'Resting',
  walk: 'Walking',
  run: 'Trotting',
  sprint: 'Sprinting',
  jump: 'Leaping',
}

function useHudStats() {
  const [s, setS] = useState({
    speed: 0,
    stamina: 1,
    anim: 'idle',
    fps: 0,
    roaring: false,
    inWater: false,
    playerCount: 1,
  })
  useEffect(() => {
    const id = setInterval(() => {
      setS({
        speed: stats.speed,
        stamina: stats.stamina,
        anim: stats.anim,
        fps: stats.fps,
        roaring: stats.roaring,
        inWater: stats.inWater,
        playerCount: mp.players.size + 1,
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
      // background savannah
      ctx.fillStyle = '#7c9a44'
      ctx.fillRect(0, 0, size, size)
      // dry patches
      ctx.fillStyle = 'rgba(184,154,85,0.5)'
      for (let i = 0; i < 5; i++) {
        const x = ((Math.sin(i * 2.3) + 1) / 2) * size
        const y = ((Math.cos(i * 1.7) + 1) / 2) * size
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fill()
      }
      // water hole
      const wx = ((70 + half) / WORLD_SIZE) * size
      const wy = ((70 + half) / WORLD_SIZE) * size
      ctx.fillStyle = '#3f7fa8'
      ctx.beginPath()
      ctx.arc(wx, wy, ((22) / WORLD_SIZE) * size, 0, Math.PI * 2)
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

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          {showMinimap && <Minimap />}
          <Badge
            variant="secondary"
            className="bg-amber-900/70 text-amber-50 border-amber-700/50 backdrop-blur-sm w-fit"
          >
            <Users className="w-3 h-3 mr-1" />
            {mode === 'multi' ? `${s.playerCount} in savannah` : 'Solo'}
          </Badge>
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

      {/* Bottom-left: vitals */}
      <div className="absolute bottom-4 left-3 sm:left-4 flex flex-col gap-2 w-48">
        <div className="bg-black/55 backdrop-blur-md rounded-xl p-3 border border-amber-900/40 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-amber-100/90 text-xs font-semibold flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              Stamina
            </span>
            <span className="text-amber-50/70 text-[10px] font-mono">
              {Math.round(s.stamina * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-black/50 rounded-full overflow-hidden border border-amber-950/50">
            <div
              className="h-full rounded-full transition-[width] duration-100"
              style={{
                width: `${s.stamina * 100}%`,
                background:
                  s.stamina > 0.3
                    ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                    : 'linear-gradient(90deg,#b91c1c,#ef4444)',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 mb-1">
            <span className="text-amber-100/90 text-xs font-semibold flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-300" />
              Speed
            </span>
            <span className="text-amber-50/80 text-[10px] font-mono">
              {s.speed.toFixed(1)} m/s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-700/70 text-amber-50 border-amber-600/40 text-[10px] py-0">
              {ANIM_LABEL[s.anim] ?? s.anim}
            </Badge>
            {s.roaring && (
              <Badge className="bg-red-700/80 text-red-50 border-red-600/40 text-[10px] py-0 animate-pulse">
                ROAR!
              </Badge>
            )}
            {s.inWater && (
              <Badge className="bg-sky-700/70 text-sky-50 border-sky-600/40 text-[10px] py-0">
                Water
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
          <span><kbd className="font-mono text-amber-200">R</kbd> Roar</span>
          <span className="text-amber-700">·</span>
          <span><kbd className="font-mono text-amber-200">Mouse</kbd> Look</span>
        </div>
      </div>
    </div>
  )
}
