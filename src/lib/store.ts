import { create } from 'zustand'

export type GamePhase = 'menu' | 'playing'
export type MenuScreen =
  | 'main'
  | 'multiplayer'
  | 'settings'
  | 'howto'
  | 'lobby'
export type GameMode = 'single' | 'multi'

export interface PlayerConfig {
  name: string
  color: string
  maneColor: string
}

export interface Settings {
  sensitivity: number
  invertY: boolean
  cameraDistance: number
  cameraHeight: number
  showFps: boolean
  showMinimap: boolean
  graphics: 'low' | 'medium' | 'high'
  shadows: boolean
}

interface GameState {
  phase: GamePhase
  screen: MenuScreen
  mode: GameMode
  roomId: string
  player: PlayerConfig
  settings: Settings
  connected: boolean
  playerCount: number

  setPhase: (p: GamePhase) => void
  setScreen: (s: MenuScreen) => void
  setMode: (m: GameMode) => void
  setRoomId: (r: string) => void
  setPlayer: (p: Partial<PlayerConfig>) => void
  setSettings: (s: Partial<Settings>) => void
  setConnected: (c: boolean) => void
  setPlayerCount: (n: number) => void

  startGame: (mode: GameMode) => void
  exitToMenu: () => void
}

const LION_COLORS = ['#c98a3a', '#a9722e', '#d9a85a', '#8a5a2b', '#b8742f']

export const PRESET_LION_COLORS = LION_COLORS

export const useGame = create<GameState>((set) => ({
  phase: 'menu',
  screen: 'main',
  mode: 'single',
  roomId: 'safari-1',
  player: {
    name: 'Simba',
    color: LION_COLORS[0],
    maneColor: '#6e3f1a',
  },
  settings: {
    sensitivity: 1,
    invertY: false,
    cameraDistance: 9,
    cameraHeight: 4.5,
    showFps: false,
    showMinimap: true,
    graphics: 'high',
    shadows: true,
  },
  connected: false,
  playerCount: 1,

  setPhase: (p) => set({ phase: p }),
  setScreen: (s) => set({ screen: s }),
  setMode: (m) => set({ mode: m }),
  setRoomId: (r) => set({ roomId: r }),
  setPlayer: (p) => set((st) => ({ player: { ...st.player, ...p } })),
  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
  setConnected: (c) => set({ connected: c }),
  setPlayerCount: (n) => set({ playerCount: n }),

  startGame: (mode) => set({ phase: 'playing', mode }),
  exitToMenu: () =>
    set({ phase: 'menu', screen: 'main', mode: 'single', connected: false }),
}))
