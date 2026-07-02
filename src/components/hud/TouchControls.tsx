'use client'

import { useEffect, useRef, useState } from 'react'
import { input } from '@/lib/input'
import { audio } from '@/lib/audio'
import { Footprints, Zap, ArrowUp, Volume2, VolumeX } from 'lucide-react'

/**
 * Mobile touch controls: virtual joystick (left) + look area (right) +
 * sprint/jump/roar buttons. Only renders on touch devices.
 */
export function TouchControls() {
  // Lazy init: input.isTouch is set during input.install() which runs on mount.
  // Use a lazy initializer so we don't setState in an effect (lint rule).
  const [isTouch] = useState(() => input.isTouch)
  const [sprintHeld, setSprintHeld] = useState(false)
  const [muted, setMuted] = useState(false)
  const joyRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef<HTMLDivElement>(null)
  const joyId = useRef<number | null>(null)
  const lookId = useRef<number | null>(null)
  const lookLast = useRef<{ x: number; y: number } | null>(null)

  if (!isTouch) return null

  // ---- Virtual joystick (left) ----
  const joyStart = (e: React.TouchEvent) => {
    e.preventDefault()
    joyId.current = e.changedTouches[0].identifier
    joyMove(e)
  }
  const joyMove = (e: React.TouchEvent) => {
    if (joyId.current === null) return
    const t = Array.from(e.changedTouches).find(
      (t) => t.identifier === joyId.current,
    )
    if (!t || !joyRef.current) return
    const rect = joyRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = t.clientX - cx
    let dy = t.clientY - cy
    const max = rect.width / 2
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }
    // normalized: y is inverted (up = forward = positive)
    input.setTouchMove(dx / max, -dy / max)
  }
  const joyEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    joyId.current = null
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0, 0)'
    }
    input.setTouchMove(0, 0)
  }

  // ---- Look area (right) ----
  const lookStart = (e: React.TouchEvent) => {
    e.preventDefault()
    lookId.current = e.changedTouches[0].identifier
    lookLast.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    }
  }
  const lookMove = (e: React.TouchEvent) => {
    if (lookId.current === null) return
    const t = Array.from(e.changedTouches).find(
      (t) => t.identifier === lookId.current,
    )
    if (!t || !lookLast.current) return
    const dx = t.clientX - lookLast.current.x
    const dy = t.clientY - lookLast.current.y
    lookLast.current = { x: t.clientX, y: t.clientY }
    input.addTouchLook(dx * 1.4, dy * 1.4)
  }
  const lookEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    lookId.current = null
    lookLast.current = null
  }

  // ---- Action buttons ----
  const press = (key: keyof typeof input.keys, on: boolean) => {
    input.keys[key] = on
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    audio.setEnabled(!next)
  }

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* Look area — right half of screen (above buttons) */}
      <div
        ref={lookRef}
        className="absolute right-0 top-0 bottom-32 w-1/2 pointer-events-auto touch-none"
        onTouchStart={lookStart}
        onTouchMove={lookMove}
        onTouchEnd={lookEnd}
        onTouchCancel={lookEnd}
      />

      {/* Virtual joystick — bottom left */}
      <div
        ref={joyRef}
        className="absolute bottom-24 left-6 w-32 h-32 rounded-full pointer-events-auto touch-none"
        style={{
          background: 'radial-gradient(circle, rgba(20,16,12,0.5) 0%, rgba(20,16,12,0.3) 70%, transparent 100%)',
          border: '2px solid rgba(255,200,120,0.35)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 2px 8px rgba(0,0,0,0.3)',
        }}
        onTouchStart={joyStart}
        onTouchMove={joyMove}
        onTouchEnd={joyEnd}
        onTouchCancel={joyEnd}
      >
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #fbbf24, #b45309)',
            border: '2px solid rgba(255,233,180,0.6)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            marginLeft: '-28px',
            marginTop: '-28px',
          }}
        />
      </div>

      {/* Action buttons — bottom right */}
      <div className="absolute bottom-24 right-6 flex flex-col gap-3 items-end">
        {/* Sprint toggle */}
        <button
          className={`pointer-events-auto w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all touch-none ${
            sprintHeld
              ? 'bg-amber-500 border-amber-300 text-amber-950 scale-95 shadow-lg shadow-amber-500/40'
              : 'bg-amber-900/70 border-amber-600/50 text-amber-100'
          }`}
          onTouchStart={(e) => {
            e.preventDefault()
            setSprintHeld(true)
            press('sprint', true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            setSprintHeld(false)
            press('sprint', false)
          }}
        >
          <Zap className="w-6 h-6" />
        </button>

        <div className="flex gap-3">
          {/* Jump */}
          <button
            className="pointer-events-auto w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm border-2 bg-amber-900/70 border-amber-600/50 text-amber-100 active:bg-amber-500 active:text-amber-950 active:scale-95 transition-all touch-none"
            onTouchStart={(e) => {
              e.preventDefault()
              press('jump', true)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              press('jump', false)
            }}
          >
            <ArrowUp className="w-6 h-6" />
          </button>

          {/* Roar */}
          <button
            className="pointer-events-auto w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm border-2 bg-red-900/70 border-red-600/50 text-red-100 active:bg-red-500 active:text-red-950 active:scale-95 transition-all touch-none"
            onTouchStart={(e) => {
              e.preventDefault()
              press('roar', true)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              press('roar', false)
            }}
          >
            <Footprints className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mute toggle — top right */}
      <button
        className="pointer-events-auto absolute top-20 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 border border-amber-800/40 text-amber-200 backdrop-blur-sm touch-none"
        onClick={toggleMute}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  )
}
