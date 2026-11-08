import { NextResponse } from 'next/server'
import { findHottestPlace } from '../../../lib/hottest'

// Node runtime: the RTMA field is ~6 MB and the MADIS query can take ~25 s.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const result = await findHottestPlace()
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        // RTMA updates every 15 minutes; serve stale while the CDN refreshes in the background
        'CDN-Cache-Control': 'max-age=300, stale-while-revalidate=1800',
        'Vercel-CDN-Cache-Control': 'max-age=300, stale-while-revalidate=1800',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
