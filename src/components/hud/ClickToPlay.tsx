'use client'

import { useEffect, useState } from 'react'
import { input } from '@/lib/input'
import { Crosshair, MousePointerClick } from 'lucide-react'

export function ClickToPlay() {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    input.install()
    const onPLC = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onPLC)
    return () => {
      document.removeEventListener('pointerlockchange', onPLC)
    }
  }, [])

  const requestLock = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) input.requestPointerLock(canvas)
  }

  if (locked) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <Crosshair className="w-5 h-5 text-white/40 drop-shadow" />
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm cursor-pointer"
      onClick={requestLock}
    >
      <div className="text-center px-6 py-5 bg-amber-950/70 rounded-2xl border border-amber-700/40 shadow-2xl">
        <MousePointerClick className="w-9 h-9 text-amber-300 mx-auto mb-2" />
        <p className="text-amber-50 font-semibold text-lg">Click to look around</p>
        <p className="text-amber-200/70 text-sm mt-1">
          Move your mouse to control the camera. Press <kbd className="font-mono text-amber-200">Esc</kbd> to release.
        </p>
      </div>
    </div>
  )
}
