import * as THREE from 'three'

/**
 * Procedural canvas-based textures so the game ships with zero external
 * image assets (easy GitHub deploy). All generators are memoized.
 */

const cache = new Map<string, THREE.Texture>()

function makeCanvas(size = 512) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

function valueNoise2D(x: number, y: number, seed = 0) {
  // cheap deterministic hash -> [0,1)
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 13.7) * 43758.5453
  return s - Math.floor(s)
}

function smoothNoise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const tl = valueNoise2D(xi, yi, seed)
  const tr = valueNoise2D(xi + 1, yi, seed)
  const bl = valueNoise2D(xi, yi + 1, seed)
  const br = valueNoise2D(xi + 1, yi + 1, seed)
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  return (
    tl * (1 - u) * (1 - v) +
    tr * u * (1 - v) +
    bl * (1 - u) * v +
    br * u * v
  )
}

function fbm(x: number, y: number, octaves = 4, seed = 0) {
  let total = 0
  let amp = 0.5
  let freq = 1
  let max = 0
  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * freq, y * freq, seed + i) * amp
    max += amp
    amp *= 0.5
    freq *= 2
  }
  return total / max
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function mixColors(a: string, b: string, t: number) {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return `rgb(${Math.round(lerp(ca.r, cb.r, t))}, ${Math.round(
    lerp(ca.g, cb.g, t),
  )}, ${Math.round(lerp(ca.b, cb.b, t))})`
}

/** Savannah grass: golden-green with dry patches and subtle blade noise. */
export function grassTexture(size = 512): THREE.Texture {
  const key = `grass-${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 48, y / 48, 5, 1)
      const patch = fbm(x / 160, y / 160, 3, 7)
      // base grass colors
      let col = mixColors('#6b8a3a', '#9fb557', n)
      // dry / dirt patches
      if (patch > 0.62) {
        col = mixColors(col, '#b69b5e', (patch - 0.62) * 2.4)
      }
      // tiny blade speckle
      const speck = valueNoise2D(x * 0.7, y * 0.7, 3)
      if (speck > 0.86) {
        col = mixColors(col, '#4f6b2c', 0.4)
      }
      const rgb = col.match(/\d+/g)!.map(Number)
      const i = (y * size + x) * 4
      img.data[i] = rgb[0]
      img.data[i + 1] = rgb[1]
      img.data[i + 2] = rgb[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Dry dirt path texture. */
export function dirtTexture(size = 512): THREE.Texture {
  const key = `dirt-${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 40, y / 40, 5, 2)
      const crack = Math.abs(smoothNoise(x / 90, y / 90, 9) - 0.5)
      let col = mixColors('#9c7a45', '#c9a86a', n)
      if (crack < 0.04) col = mixColors(col, '#5e4a2a', 0.7)
      const rgb = col.match(/\d+/g)!.map(Number)
      const i = (y * size + x) * 4
      img.data[i] = rgb[0]
      img.data[i + 1] = rgb[1]
      img.data[i + 2] = rgb[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Rock / stone texture. */
export function rockTexture(size = 512): THREE.Texture {
  const key = `rock-${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 60, y / 60, 5, 4)
      const vein = Math.abs(smoothNoise(x / 120, y / 30, 5) - 0.5)
      let col = mixColors('#6b6660', '#8c8780', n)
      if (vein < 0.05) col = mixColors(col, '#4a4641', 0.6)
      const rgb = col.match(/\d+/g)!.map(Number)
      const i = (y * size + x) * 4
      img.data[i] = rgb[0]
      img.data[i + 1] = rgb[1]
      img.data[i + 2] = rgb[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Sandy ground near water. */
export function sandTexture(size = 512): THREE.Texture {
  const key = `sand-${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 50, y / 50, 4, 6)
      const col = mixColors('#d8c48a', '#efe0a8', n)
      const rgb = col.match(/\d+/g)!.map(Number)
      const i = (y * size + x) * 4
      img.data[i] = rgb[0]
      img.data[i + 1] = rgb[1]
      img.data[i + 2] = rgb[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  cache.set(key, tex)
  return tex
}

/** Tree bark texture. */
export function barkTexture(size = 256): THREE.Texture {
  const key = `bark-${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 16, y / 64, 4, 8)
      const groove = Math.abs(smoothNoise(x / 8, y / 200, 11) - 0.5)
      let col = mixColors('#5b4632', '#7a5d3f', n)
      if (groove < 0.06) col = mixColors(col, '#3d2e1f', 0.7)
      const rgb = col.match(/\d+/g)!.map(Number)
      const i = (y * size + x) * 4
      img.data[i] = rgb[0]
      img.data[i + 1] = rgb[1]
      img.data[i + 2] = rgb[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  cache.set(key, tex)
  return tex
}

/** A generic noise-based bump map for subtle terrain relief. */
export function bumpTexture(size = 512): THREE.Texture {
  const key = `bump-${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 32, y / 32, 5, 3) * 255
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  cache.set(key, tex)
  return tex
}

export { fbm, smoothNoise, valueNoise2D }
