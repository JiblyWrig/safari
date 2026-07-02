'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useGame, PRESET_LION_COLORS } from '@/lib/store'
import { mp } from '@/lib/multiplayer'
import {
  PawPrint,
  Users,
  User,
  Settings as SettingsIcon,
  BookOpen,
  ArrowLeft,
  Play,
  Wifi,
  WifiOff,
  Loader2,
  Info,
  Trophy,
  Crown,
  Clock,
  Skull,
} from 'lucide-react'
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/leaderboard'

const MANE_PRESETS = ['#6e3f1a', '#3a2412', '#8a5a2b', '#2a1a0e', '#a9722e']

function ColorPicker({
  label,
  value,
  presets,
  onChange,
}: {
  label: string
  value: string
  presets: string[]
  onChange: (c: string) => void
}) {
  return (
    <div>
      <Label className="text-amber-100/90 text-xs mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
              value === c ? 'border-white scale-110 ring-2 ring-amber-400' : 'border-black/40'
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-full bg-transparent cursor-pointer border-2 border-black/40"
        />
      </div>
    </div>
  )
}

function LionPreview({ color, maneColor, isMale = true }: { color: string; maneColor: string; isMale?: boolean }) {
  // simple SVG lion head preview
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="drop-shadow-lg">
        {/* mane (only for males) */}
        {isMale && (
          <>
            <circle cx="48" cy="50" r="34" fill={maneColor} />
            <circle cx="48" cy="50" r="30" fill={maneColor} opacity="0.85" />
          </>
        )}
        {/* head */}
        <circle cx="48" cy="52" r={isMale ? 22 : 20} fill={color} />
        {/* ears */}
        <circle cx="32" cy="34" r="6" fill={color} />
        <circle cx="64" cy="34" r="6" fill={color} />
        {/* snout */}
        <ellipse cx="48" cy="62" rx="10" ry="8" fill={color} />
        <ellipse cx="48" cy="68" rx="3" ry="2.5" fill="#2a2020" />
        {/* eyes */}
        <circle cx="40" cy="48" r="2.6" fill="#1a1a1a" />
        <circle cx="56" cy="48" r="2.6" fill="#1a1a1a" />
      </svg>
      <span className="text-amber-100/60 text-[10px] mt-1">{isMale ? 'Male' : 'Female'}</span>
    </div>
  )
}

export function Menu() {
  const screen = useGame((s) => s.screen)
  const setScreen = useGame((s) => s.setScreen)
  const startGame = useGame((s) => s.startGame)
  const player = useGame((s) => s.player)
  const setPlayer = useGame((s) => s.setPlayer)

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: 'url(/safari-menu-bg.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/40 via-amber-950/55 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 mb-1">
              <PawPrint className="w-6 h-6 text-amber-400" />
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 drop-shadow">
                SAFARI LION
              </h1>
              <PawPrint className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-amber-200/70 text-xs tracking-[0.3em] uppercase">
              3D Multiplayer Simulator
            </p>
          </div>

          <Card className="bg-amber-950/55 backdrop-blur-md border-amber-800/40 shadow-2xl p-5 sm:p-6">
            {screen === 'main' && <MainScreen />}
            {screen === 'multiplayer' && <MultiplayerScreen />}
            {screen === 'settings' && <SettingsScreen />}
            {screen === 'howto' && <HowToPlayScreen />}
            {screen === 'leaderboard' && <LeaderboardScreen />}

            {screen !== 'main' && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/40"
                onClick={() => setScreen('main')}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to menu
              </Button>
            )}
          </Card>

          <p className="text-center text-amber-200/40 text-[10px] mt-4">
            Built with Three.js · React Three Fiber · Socket.IO
          </p>
        </div>
      </div>
    </div>
  )
}

function PlayerSetup() {
  const player = useGame((s) => s.player)
  const setPlayer = useGame((s) => s.setPlayer)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LionPreview color={player.color} maneColor={player.maneColor} isMale={player.isMale} />
        <div className="flex-1 space-y-3">
          <div>
            <Label htmlFor="lionname" className="text-amber-100/90 text-xs mb-1.5 block">
              Lion Name
            </Label>
            <Input
              id="lionname"
              value={player.name}
              onChange={(e) => setPlayer({ name: e.target.value.slice(0, 24) })}
              placeholder="Enter your lion's name…"
              className="bg-black/40 border-amber-800/50 text-amber-50 placeholder:text-amber-200/30"
            />
          </div>
          {/* Gender toggle */}
          <div>
            <Label className="text-amber-100/90 text-xs mb-1.5 block">Gender</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlayer({ isMale: true })}
                className={`h-9 rounded-lg text-sm font-medium border transition-all ${
                  player.isMale
                    ? 'bg-amber-600 text-amber-950 border-amber-400 shadow-md'
                    : 'bg-black/30 text-amber-200/70 border-amber-800/40 hover:bg-amber-900/40'
                }`}
              >
                🦁 Male
              </button>
              <button
                onClick={() => setPlayer({ isMale: false })}
                className={`h-9 rounded-lg text-sm font-medium border transition-all ${
                  !player.isMale
                    ? 'bg-amber-600 text-amber-950 border-amber-400 shadow-md'
                    : 'bg-black/30 text-amber-200/70 border-amber-800/40 hover:bg-amber-900/40'
                }`}
              >
                🐾 Female
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker
          label="Fur Color"
          value={player.color}
          presets={PRESET_LION_COLORS}
          onChange={(c) => setPlayer({ color: c })}
        />
        <ColorPicker
          label="Mane Color"
          value={player.maneColor}
          presets={MANE_PRESETS}
          onChange={(c) => setPlayer({ maneColor: c })}
        />
      </div>
    </div>
  )
}

function MainScreen() {
  const startGame = useGame((s) => s.startGame)
  const setScreen = useGame((s) => s.setScreen)
  return (
    <div className="space-y-5">
      <PlayerSetup />
      <div className="space-y-2.5 pt-2">
        <Button
          className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-amber-950 border-0 shadow-lg"
          onClick={() => startGame('single')}
        >
          <Play className="w-5 h-5 mr-2" />
          Play Solo
        </Button>
        <Button
          variant="secondary"
          className="w-full h-11 bg-amber-800/70 hover:bg-amber-700/70 text-amber-50 border-amber-700/40"
          onClick={() => setScreen('multiplayer')}
        >
          <Users className="w-5 h-5 mr-2" />
          Multiplayer
        </Button>
        <div className="grid grid-cols-3 gap-2.5">
          <Button
            variant="secondary"
            className="h-10 bg-amber-900/50 hover:bg-amber-800/50 text-amber-100 border-amber-800/40"
            onClick={() => setScreen('howto')}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            How
          </Button>
          <Button
            variant="secondary"
            className="h-10 bg-amber-900/50 hover:bg-amber-800/50 text-amber-100 border-amber-800/40"
            onClick={() => setScreen('leaderboard')}
          >
            <Trophy className="w-4 h-4 mr-1.5" />
            Ranks
          </Button>
          <Button
            variant="secondary"
            className="h-10 bg-amber-900/50 hover:bg-amber-800/50 text-amber-100 border-amber-800/40"
            onClick={() => setScreen('settings')}
          >
            <SettingsIcon className="w-4 h-4 mr-1.5" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  )
}

function MultiplayerScreen() {
  const startGame = useGame((s) => s.startGame)
  const roomId = useGame((s) => s.roomId)
  const setRoomId = useGame((s) => s.setRoomId)
  const setConnected = useGame((s) => s.setConnected)
  const setPlayerCount = useGame((s) => s.setPlayerCount)
  const player = useGame((s) => s.player)
  const setPlayer = useGame((s) => s.setPlayer)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle')
  const [err, setErr] = useState('')

  const connect = async () => {
    setStatus('connecting')
    setErr('')
    try {
      const ok = await mp.connect()
      if (!ok) {
        setStatus('failed')
        setErr(
          'Could not reach the multiplayer server. The Safari lives on solo mode — you can still play, or retry.',
        )
        return
      }
      mp.joinRoom(roomId || 'safari-1', player)
      setConnected(true)
      setPlayerCount(mp.players.size + 1)
      setStatus('connected')
      // small delay so the room state arrives
      setTimeout(() => {
        setPlayerCount(mp.players.size + 1)
        startGame('multi')
      }, 350)
    } catch (e: any) {
      setStatus('failed')
      setErr(e?.message || 'Connection error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-amber-50">Multiplayer Safari</h2>
      </div>
      <p className="text-amber-100/70 text-xs leading-relaxed">
        Roam the savannah with other lions in real time. Share the room name with
        friends so you end up in the same world.
      </p>
      <PlayerSetup />
      <div>
        <Label htmlFor="room" className="text-amber-100/90 text-xs mb-1.5 block">
          Room Name
        </Label>
        <Input
          id="room"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.replace(/\s+/g, '-').slice(0, 24))}
          placeholder="e.g. pride-1"
          className="bg-black/40 border-amber-800/50 text-amber-50 placeholder:text-amber-200/30"
        />
        <p className="text-amber-200/50 text-[10px] mt-1">
          Players in the same room see each other.
        </p>
      </div>

      {status === 'failed' && (
        <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-lg p-2.5 text-red-200 text-xs">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {status === 'connected' && (
        <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/50 rounded-lg p-2.5 text-emerald-200 text-xs">
          <Wifi className="w-4 h-4" />
          Connected! Entering the savannah…
        </div>
      )}

      <Button
        className="w-full h-11 font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-amber-950 border-0"
        onClick={connect}
        disabled={status === 'connecting' || status === 'connected'}
      >
        {status === 'connecting' ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Connecting…
          </>
        ) : status === 'connected' ? (
          <>
            <Wifi className="w-5 h-5 mr-2" />
            Joining…
          </>
        ) : (
          <>
            <PawPrint className="w-5 h-5 mr-2" />
            Enter Safari
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-xs">
        <Badge
          variant="secondary"
          className={`backdrop-blur-sm ${
            mp.connected
              ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700/40'
              : 'bg-red-900/50 text-red-200 border-red-800/40'
          }`}
        >
          {mp.connected ? (
            <>
              <Wifi className="w-3 h-3 mr-1" /> Server online
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" /> Not connected
            </>
          )}
        </Badge>
        <Button
          variant="link"
          size="sm"
          className="text-amber-300/70 hover:text-amber-200 px-0 h-auto"
          onClick={() => startGame('single')}
        >
          Play solo instead →
        </Button>
      </div>
    </div>
  )
}

function SettingsScreen() {
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-amber-50">Settings</h2>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <Label className="text-amber-100/90">Mouse Sensitivity</Label>
          <span className="text-amber-200/70 font-mono">{settings.sensitivity.toFixed(2)}</span>
        </div>
        <Slider
          value={[settings.sensitivity]}
          min={0.3}
          max={2.5}
          step={0.05}
          onValueChange={(v) => setSettings({ sensitivity: v[0] })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <Label className="text-amber-100/90">Camera Distance</Label>
          <span className="text-amber-200/70 font-mono">{settings.cameraDistance.toFixed(1)}</span>
        </div>
        <Slider
          value={[settings.cameraDistance]}
          min={5}
          max={16}
          step={0.5}
          onValueChange={(v) => setSettings({ cameraDistance: v[0] })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <Label className="text-amber-100/90">Camera Height</Label>
          <span className="text-amber-200/70 font-mono">{settings.cameraHeight.toFixed(1)}</span>
        </div>
        <Slider
          value={[settings.cameraHeight]}
          min={1}
          max={9}
          step={0.5}
          onValueChange={(v) => setSettings({ cameraHeight: v[0] })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-amber-100/90 text-xs">Graphics Quality</Label>
        <Select
          value={settings.graphics}
          onValueChange={(v) => setSettings({ graphics: v as any })}
        >
          <SelectTrigger className="bg-black/40 border-amber-800/50 text-amber-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low (Performance)</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High (Best visuals)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-amber-100/90 text-xs">Shadows</Label>
        <Switch
          checked={settings.shadows}
          onCheckedChange={(c) => setSettings({ shadows: c })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-amber-100/90 text-xs">Show Minimap</Label>
        <Switch
          checked={settings.showMinimap}
          onCheckedChange={(c) => setSettings({ showMinimap: c })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-amber-100/90 text-xs">Invert Mouse Y</Label>
        <Switch
          checked={settings.invertY}
          onCheckedChange={(c) => setSettings({ invertY: c })}
        />
      </div>

      {/* Day length */}
      <div className="space-y-2 pt-2 border-t border-amber-900/30">
        <div className="flex justify-between text-xs">
          <Label className="text-amber-100/90">Day Length</Label>
          <span className="text-amber-200/70 font-mono">
            {Math.round(settings.dayLength)}s
          </span>
        </div>
        <Slider
          value={[settings.dayLength]}
          min={60}
          max={600}
          step={30}
          onValueChange={(v) => setSettings({ dayLength: v[0] })}
        />
        <p className="text-amber-200/40 text-[10px]">
          Time for a full day/night cycle. Shorter = faster nights.
        </p>
      </div>

      {/* Audio */}
      <div className="pt-2 border-t border-amber-900/30">
        <div className="flex items-center justify-between">
          <Label className="text-amber-100/90 text-xs">Sound Effects</Label>
          <Switch
            checked={settings.audioEnabled}
            onCheckedChange={(c) => setSettings({ audioEnabled: c })}
          />
        </div>
        <div className="space-y-2 mt-3">
          <div className="flex justify-between text-xs">
            <Label className="text-amber-100/90">Volume</Label>
            <span className="text-amber-200/70 font-mono">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <Slider
            value={[settings.volume]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setSettings({ volume: v[0] })}
          />
        </div>
      </div>
    </div>
  )
}

function HowToPlayScreen() {
  const rows: { keys: string; desc: string }[] = [
    { keys: 'W A S D', desc: 'Move your lion (relative to camera)' },
    { keys: 'Mouse', desc: 'Look around / orbit the camera' },
    { keys: 'Shift', desc: 'Sprint (unlimited — no stamina!)' },
    { keys: 'Left Click', desc: 'Attack with a paw swing' },
    { keys: 'Space', desc: 'Jump / pounce' },
    { keys: 'R', desc: 'Roar!' },
    { keys: 'P', desc: 'Photo mode (hide HUD for screenshots)' },
    { keys: 'Esc', desc: 'Release the mouse cursor' },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-amber-50">How to Play</h2>
      </div>
      <p className="text-amber-100/70 text-xs leading-relaxed">
        You are a lion on the African savannah. Explore the golden plains, find
        the watering hole, dodge the rocky ridge, and meet a herd of zebra. Hunt
        gazelles for score, drink at the watering hole to restore stamina, and
        watch the world cycle from day to night. In multiplayer, other
        players&apos; lions roam the same world — roar to say hello!
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.keys}
            className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-amber-900/30"
          >
            <kbd className="font-mono text-amber-300 text-xs bg-amber-950/60 px-2 py-1 rounded border border-amber-800/40 min-w-[72px] text-center">
              {r.keys}
            </kbd>
            <span className="text-amber-100/80 text-xs text-right flex-1 ml-3">
              {r.desc}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-amber-900/30 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-100/80">
          <p className="font-semibold text-amber-200 mb-1">🦌 Hunting</p>
          Gazelles and warthogs roam the plains. Sprint close to scare them into
          fleeing, then chase one down to catch it — each catch adds to your
          hunt score! Warthogs flee erratically — a harder catch.
        </div>
        <div className="bg-sky-950/40 border border-sky-800/40 rounded-lg p-3 text-xs text-amber-100/80">
          <p className="font-semibold text-sky-200 mb-1">💧 Drinking</p>
          Stand still in the watering hole to drink — your stamina and health
          refill fast. Use it before a long sprint or a hunt.
        </div>
        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg p-3 text-xs text-amber-100/80">
          <p className="font-semibold text-indigo-200 mb-1">🌗 Day &amp; Night</p>
          The savannah cycles through dawn, day, dusk, and night. Stars come out
          at night and the world grows dark — plan your hunts by daylight.
        </div>
        <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3 text-xs text-amber-100/80">
          <p className="font-semibold text-red-200 mb-1">❤️ Health</p>
          Sprinting with low stamina drains your health (exhaustion). If your
          health hits zero, you collapse and respawn at the spawn point after 4
          seconds. Rest or drink to recover.
        </div>
      </div>
      <div className="bg-amber-900/30 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-100/80">
        <p className="font-semibold text-amber-200 mb-1">Tip</p>
        Sprinting drains stamina (the amber bar). Let it regen by walking or
        resting. Watch your stamina before a long chase — and listen for the
        roar, footsteps, and ambient sounds!
      </div>
    </div>
  )
}

function LeaderboardScreen() {
  const [filter, setFilter] = useState<'all' | 'single' | 'multi'>('all')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-amber-50">Leaderboard</h2>
      </div>
      <p className="text-amber-100/70 text-xs leading-relaxed">
        Top hunters of the savannah. Your score is saved automatically when you
        leave the game.
      </p>

      {/* Filter tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-black/30 rounded-lg p-1">
        {(['all', 'single', 'multi'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 rounded-md text-xs font-medium transition-all ${
              filter === f
                ? 'bg-amber-600 text-amber-950 shadow'
                : 'text-amber-200/70 hover:bg-amber-900/40'
            }`}
          >
            {f === 'all' ? 'All' : f === 'single' ? 'Solo' : 'Multi'}
          </button>
        ))}
      </div>

      <LeaderboardList key={filter} filter={filter} />
    </div>
  )
}

function LeaderboardList({ filter }: { filter: 'all' | 'single' | 'multi' }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLeaderboard(15, filter === 'all' ? undefined : (filter as any)).then(
      (e) => {
        if (!cancelled) {
          setEntries(e)
          setLoaded(true)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [filter])

  const loading = !loaded

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  const medal = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-amber-200/50 text-sm">
        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
        No scores yet. Be the first hunter!
      </div>
    )
  }
  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
      {entries.map((e, i) => (
        <div
          key={e.id}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all ${
            i < 3
              ? 'bg-gradient-to-r from-amber-900/60 to-amber-800/30 border-amber-600/50 shadow-md'
              : 'bg-black/25 border-amber-900/30'
          }`}
        >
          <span
            className={`font-bold text-sm min-w-[36px] text-center ${
              i < 3 ? 'text-amber-200' : 'text-amber-300/60'
            }`}
          >
            {medal(i)}
          </span>
          <div
            className="w-3 h-3 rounded-full shrink-0 border border-black/30"
            style={{ background: e.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-amber-50 text-sm font-semibold truncate">
              {e.name}
              {i === 0 && <Crown className="inline w-3.5 h-3.5 ml-1 text-amber-300" />}
            </p>
            <p className="text-amber-200/50 text-[10px] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(e.survived)}
              <span className="text-amber-700">·</span>
              <span
                className={
                  e.mode === 'multi' ? 'text-emerald-400' : 'text-sky-400'
                }
              >
                {e.mode === 'multi' ? 'MP' : 'Solo'}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-amber-200 font-bold text-lg leading-none">
              {e.hunts}
            </p>
            <p className="text-amber-300/50 text-[9px] uppercase tracking-wide">
              hunts
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
