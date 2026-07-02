'use client'

class InputManager {
  keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    roar: false,
  }
  mouseDX = 0
  mouseDY = 0
  pointerLocked = false
  private installed = false
  private lockedEl: HTMLElement | null = null

  install() {
    if (this.installed) return
    this.installed = true
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
  }

  uninstall() {
    if (!this.installed) return
    this.installed = false
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
  }

  requestPointerLock(el: HTMLElement) {
    this.lockedEl = el
    el.requestPointerLock?.()
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock?.()
  }

  private onPointerLockChange = () => {
    this.pointerLocked = !!document.pointerLockElement
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.pointerLocked) return
    this.mouseDX += e.movementX
    this.mouseDY += e.movementY
  }

  private setKey(code: string, down: boolean) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = down
        break
      case 'KeyS':
      case 'ArrowDown':
        this.keys.back = down
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = down
        break
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = down
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = down
        break
      case 'Space':
        this.keys.jump = down
        break
      case 'KeyR':
        this.keys.roar = down
        break
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // Avoid stealing typing in inputs
    const t = e.target as HTMLElement
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    this.setKey(e.code, true)
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.setKey(e.code, false)
  }

  /** Call once per frame to consume mouse delta. */
  consumeMouse() {
    const dx = this.mouseDX
    const dy = this.mouseDY
    this.mouseDX = 0
    this.mouseDY = 0
    return { dx, dy }
  }

  consumeRoar(): boolean {
    const r = this.keys.roar
    this.keys.roar = false
    return r
  }
}

export const input = new InputManager()
