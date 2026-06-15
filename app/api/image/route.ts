import { NextRequest, NextResponse } from 'next/server'
import { isEdgeOne } from '@/app/lib/storage'

/**
 * Image serving endpoint for EdgeOne Blob storage
 * On EdgeOne, images stored in Blob are served via this endpoint
 * In local mode, images are served directly from public/ directory
 */

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'key parameter required' }, { status: 400 })
  }

  if (!isEdgeOne()) {
    return NextResponse.redirect(new URL(key, req.url))
  }

  try {
    const { getStore } = await import('@edgeone/pages-blob')
    const store = getStore('gallery')
    const file: any = await store.get(key)

    if (!file) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const buffer = await file.arrayBuffer()
    const contentType = file.type || 'image/jpeg'

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
