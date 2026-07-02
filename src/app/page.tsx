'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGame } from '@/lib/store'
import { mp } from '@/lib/multiplayer'
import { input } from '@/lib/input'
import { Menu } from '@/components/menu/Menu'
import { HUD } from '@/components/hud/HUD'
import { ChatPanel } from '@/components/hud/ChatPanel'
import { ClickToPlay } from '@/components/hud/ClickToPlay'
import { resetStats } from '@/lib/stats'

// Three.js Canvas must be client-only and not SSR'd.
const GameScene = dynamic(
  () => import('@/components/game/GameScene').then((m) => m.GameScene),
  { ssr: false },
)

export default function Page() {
  const phase = useGame((s) => s.phase)
  const mode = useGame((s) => s.mode)
  const exitToMenu = useGame((s) => s.exitToMenu)

  // When returning to the menu, tear down multiplayer + input.
  useEffect(() => {
    if (phase === 'menu') {
      if (mp.connected) mp.disconnect()
      input.exitPointerLock()
      resetStats()
    }
  }, [phase])

  // Cleanup on full unmount.
  useEffect(() => {
    return () => {
      mp.disconnect()
      input.uninstall()
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
    </main>
  )
}
