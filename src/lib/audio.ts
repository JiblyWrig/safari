'use client'

/**
 * Procedural audio engine using the Web Audio API.
 * All sounds are synthesized at runtime — zero external assets.
 *
 * Sounds: roar, footstep, hunt-catch, drink, ui-click, ui-hover, death,
 * ambient wind loop, ambient bird chirps.
 */

class AudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  ambientGain: GainNode | null = null
  sfxGain: GainNode | null = null
  windSource: AudioBufferSourceNode | null = null
  started = false
  enabled = true
  volume = 0.6

  // Ensure context exists + resumed (must be triggered by user gesture)
  init() {
    if (this.ctx) return
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)

      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.value = 0.25
      this.ambientGain.connect(this.master)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.8
      this.sfxGain.connect(this.master)
    } catch (e) {
      console.warn('AudioEngine init failed', e)
    }
  }

  resume() {
    this.init()
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.05)
    }
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master && this.ctx && this.enabled) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    }
  }

  // ---- Noise buffer helper ----
  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  // ---- SFX ----

  /** Deep lion roar: layered low oscillators + filtered noise sweep. */
  roar() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(0.9, t + 0.15)
    out.gain.linearRampToValueAtTime(0.7, t + 0.9)
    out.gain.linearRampToValueAtTime(0, t + 1.8)
    out.connect(this.sfxGain)

    // Low growl oscillators
    const freqs = [55, 73, 110]
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = i === 2 ? 'triangle' : 'sawtooth'
      osc.frequency.setValueAtTime(f, t)
      osc.frequency.linearRampToValueAtTime(f * 0.7, t + 1.6)
      const g = ctx.createGain()
      g.gain.value = 0.3 / (i + 1)
      osc.connect(g).connect(out)
      osc.start(t)
      osc.stop(t + 1.8)
      // vibrato
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 5 + i * 2
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 3
      lfo.connect(lfoGain).connect(osc.frequency)
      lfo.start(t)
      lfo.stop(t + 1.8)
    })

    // Breath noise sweep
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer(1.8)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(400, t)
    bp.frequency.linearRampToValueAtTime(1200, t + 0.3)
    bp.frequency.linearRampToValueAtTime(300, t + 1.6)
    bp.Q.value = 2
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.15, t)
    ng.gain.linearRampToValueAtTime(0, t + 1.8)
    noise.connect(bp).connect(ng).connect(out)
    noise.start(t)
    noise.stop(t + 1.8)
  }

  /** Footstep: short filtered noise thud, intensity by speed. */
  footstep(intensity = 1) {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const dur = 0.12
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer(dur)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 180 + intensity * 120
    lp.Q.value = 1
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.25 * intensity, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    noise.connect(lp).connect(g).connect(this.sfxGain)
    noise.start(t)
    noise.stop(t + dur)
  }

  /** Successful hunt catch: ascending bright chord. */
  huntCatch() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const notes = [523, 659, 784, 1047] // C E G C
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      const g = ctx.createGain()
      const start = t + i * 0.06
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.2, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
      osc.connect(g).connect(this.sfxGain!)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  }

  /** Drinking water bubbles. */
  drink() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    for (let i = 0; i < 4; i++) {
      const start = t + i * 0.12
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(200 + Math.random() * 300, start)
      osc.frequency.exponentialRampToValueAtTime(80, start + 0.15)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.12, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.15)
      osc.connect(g).connect(this.sfxGain!)
      osc.start(start)
      osc.stop(start + 0.15)
    }
  }

  /** UI click. */
  uiClick() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 600
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.06)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.08, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    osc.connect(g).connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.08)
  }

  /** UI hover. */
  uiHover() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 880
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.04, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.connect(g).connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  /** Death sound: descending sad tone. */
  death() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(55, t + 1.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.3, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 800
    osc.connect(lp).connect(g).connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 1.2)
  }

  /** Respawn chime. */
  respawn() {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const notes = [392, 523, 659]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      const g = ctx.createGain()
      const start = t + i * 0.1
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.15, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
      osc.connect(g).connect(this.sfxGain!)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  }

  // ---- Ambient ----

  /** Start looping ambient wind + scheduled bird chirps. */
  startAmbient() {
    if (!this.ctx || !this.ambientGain || this.started) return
    this.started = true
    const ctx = this.ctx

    // Wind: looping filtered brown noise
    const wind = ctx.createBufferSource()
    wind.buffer = this.noiseBuffer(4)
    wind.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 350
    windFilter.Q.value = 0.5
    const windGain = ctx.createGain()
    windGain.gain.value = 0.15
    // slow LFO on wind gain for natural gusting
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.08
    lfo.connect(lfoGain).connect(windGain.gain)
    lfo.start()
    wind.connect(windFilter).connect(windGain).connect(this.ambientGain)
    wind.start()
    this.windSource = wind

    // Bird chirps scheduler
    const scheduleBird = () => {
      if (!this.ctx || !this.ambientGain || !this.enabled) {
        this.birdTimer = window.setTimeout(scheduleBird, 3000)
        return
      }
      this.chirp()
      this.birdTimer = window.setTimeout(scheduleBird, 2500 + Math.random() * 6000)
    }
    scheduleBird()
  }

  private birdTimer: number | null = null

  private chirp() {
    if (!this.ctx || !this.ambientGain || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const chirps = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < chirps; i++) {
      const start = t + i * 0.08
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      const base = 1800 + Math.random() * 1400
      osc.frequency.setValueAtTime(base, start)
      osc.frequency.linearRampToValueAtTime(base * 1.3, start + 0.04)
      osc.frequency.linearRampToValueAtTime(base, start + 0.08)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.05, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.08)
      osc.connect(g).connect(this.ambientGain)
      osc.start(start)
      osc.stop(start + 0.08)
    }
  }

  stopAmbient() {
    if (this.windSource) {
      try {
        this.windSource.stop()
      } catch {}
      this.windSource = null
    }
    if (this.birdTimer) {
      clearTimeout(this.birdTimer)
      this.birdTimer = null
    }
    this.started = false
  }
}

export const audio = new AudioEngine()
