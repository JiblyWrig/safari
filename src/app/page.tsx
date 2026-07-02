'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGame } from '@/lib/store'
import { mp } from '@/lib/multiplayer'
import { input } from '@/lib/input'
import { audio } from '@/lib/audio'
import { submitScore } from '@/lib/leaderboard'
import { Menu } from '@/components/menu/Menu'
import { HUD } from '@/components/hud/HUD'
import { ChatPanel } from '@/components/hud/ChatPanel'
import { ClickToPlay } from '@/components/hud/ClickToPlay'
import { TouchControls } from '@/components/hud/TouchControls'
import { PhotoMode } from '@/components/hud/PhotoMode'
import { stats, resetStats } from '@/lib/stats'

// Three.js Canvas must be client-only and not SSR'd.
const GameScene = dynamic(
  () => import('@/components/game/GameScene').then((m) => m.GameScene),
  { ssr: false },
)

export default function Page() {
  const phase = useGame((s) => s.phase)
  const mode = useGame((s) => s.mode)

  // When returning to the menu, submit score + tear down multiplayer/input/audio.
  useEffect(() => {
    if (phase === 'menu') {
      // Submit the session score to the leaderboard (fire-and-forget).
      if (stats.sessionStart > 0) {
        const survivedSec = Math.round(
          (performance.now() - stats.sessionStart) / 1000,
        )
        if (stats.hunts > 0 || survivedSec > 15) {
          submitScore(
            stats.__lastName || 'Lion',
            stats.hunts,
            survivedSec,
            mode,
            stats.__lastColor || '#c98a3a',
          )
        }
      }
      if (mp.connected) mp.disconnect()
      input.exitPointerLock()
      audio.stopAmbient()
      resetStats()
    }
  }, [phase, mode])

  // When entering the game, start ambient audio (after first user gesture).
  useEffect(() => {
    if (phase === 'playing') {
      audio.resume()
      audio.startAmbient()
    }
  }, [phase])

  // First-gesture audio unlock: any click resumes the AudioContext.
  useEffect(() => {
    const unlock = () => {
      audio.resume()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Cleanup on full unmount.
  useEffect(() => {
    return () => {
      mp.disconnect()
      input.uninstall()
      audio.stopAmbient()
    }
  }, [])

  if (phase === 'menu') {
    return (
      <main className="min-h-screen w-full">
        <Menu />
      </main>
    )
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-amber-950">
      <GameScene />
      <HUD />
      <ChatPanel />
      <ClickToPlay />
      <TouchControls />
      <PhotoMode />
    </main>
  )
}
