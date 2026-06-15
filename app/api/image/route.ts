import { NextRequest, NextResponse } from 'next/server'
import { isEdgeOne } from '@/app/lib/storage'

const PROXY_BASE = process.env.EDGEONE_ORIGIN || 'https://minimal.bbroot.com'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'key parameter required' }, { status: 400 })
  }

  if (!isEdgeOne()) {
    return NextResponse.redirect(new URL(key, req.url))
  }

  try {
    // Use Edge Function proxy to serve image from Blob
    const proxyUrl = new URL('/api/blob-proxy?action=getImage', PROXY_BASE)
    proxyUrl.searchParams.set('key', key)
    const res = await fetch(proxyUrl.toString())

    if (!res.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
