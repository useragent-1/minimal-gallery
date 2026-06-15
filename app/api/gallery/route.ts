import { NextResponse } from 'next/server'
import { loadGalleryConfig } from '@/app/lib/storage'

export const runtime = 'edge'

export async function GET() {
  try {
    const config = await loadGalleryConfig()
    return NextResponse.json(config)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
