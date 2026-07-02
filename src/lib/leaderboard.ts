'use client'

export interface LeaderboardEntry {
  id: string
  name: string
  hunts: number
  survived: number
  mode: string
  color: string
  createdAt: string
}

export async function fetchLeaderboard(
  limit = 10,
  mode?: 'single' | 'multi',
): Promise<LeaderboardEntry[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (mode) params.set('mode', mode)
    const res = await fetch(`/api/leaderboard?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.entries || []
  } catch {
    return []
  }
}

export async function submitScore(
  name: string,
  hunts: number,
  survivedSec: number,
  mode: 'single' | 'multi',
  color: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, hunts, survived: survivedSec, mode, color }),
    })
    return res.ok
  } catch {
    return false
  }
}
