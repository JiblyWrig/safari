import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/leaderboard?limit=10&mode=single
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const mode = searchParams.get('mode') // optional filter

    const entries = await db.leaderboardEntry.findMany({
      where: mode ? { mode } : undefined,
      orderBy: [{ hunts: 'desc' }, { survived: 'desc' }],
      take: limit,
    })
    return NextResponse.json({ entries })
  } catch (e: any) {
    console.error('[leaderboard GET]', e?.message)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 },
    )
  }
}

// POST /api/leaderboard  { name, hunts, survived, mode, color }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body?.name || 'Lion').toString().slice(0, 24)
    const hunts = Math.max(0, Math.min(9999, parseInt(body?.hunts) || 0))
    const survived = Math.max(0, Math.min(86400, parseInt(body?.survived) || 0))
    const mode = body?.mode === 'multi' ? 'multi' : 'single'
    const color = (body?.color || '#c98a3a').toString().slice(0, 7)

    // Don't save zero-score entries (avoid clutter)
    if (hunts === 0 && survived < 10) {
      return NextResponse.json({ skipped: true })
    }

    const entry = await db.leaderboardEntry.create({
      data: { name, hunts, survived, mode, color },
    })
    return NextResponse.json({ entry })
  } catch (e: any) {
    console.error('[leaderboard POST]', e?.message)
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 },
    )
  }
}
