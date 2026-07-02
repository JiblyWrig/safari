'use client'

import { useEffect, useState } from 'react'
import { input } from '@/lib/input'
import { Camera, Eye } from 'lucide-react'

/**
 * Photo mode: press P to toggle. Hides the HUD + shows a subtle "PHOTO MODE"
 * indicator + hint to exit. The HUD components check input.photoMode and
 * hide themselves.
 */
export function PhotoMode() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setActive(input.photoMode)
    }, 100)
    return () => clearInterval(id)
  }, [])

  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center pb-20">
      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-5 py-2.5 border border-amber-700/40 shadow-2xl">
        <Camera className="w-5 h-5 text-amber-300" />
        <span className="text-amber-100 font-semibold text-sm tracking-wider">
          PHOTO MODE
        </span>
        <span className="text-amber-200/50 text-xs">·</span>
        <span className="text-amber-200/70 text-xs">
          Press <kbd className="font-mono text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">P</kbd> to exit
        </span>
        <Eye className="w-4 h-4 text-amber-400/70" />
      </div>
    </div>
  )
}

/** Helper for other components to check if photo mode is active. */
export function usePhotoMode() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setActive(input.photoMode), 100)
    return () => clearInterval(id)
  }, [])
  return active
}
