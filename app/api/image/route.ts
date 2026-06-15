import { NextRequest, NextResponse } from 'next/server'
import { isEdgeOne, getBlobStore } from '@/app/lib/storage'

export const runtime = 'edge'

/**
 * Image serving endpoint for EdgeOne Blob storage
 * On EdgeOne, images stored in Blob are served via this endpoint
 * In local mode, images are served directly from public/ directory
 */

function getContentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg'
  }
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'key parameter required' }, { status: 400 })
  }

  if (!isEdgeOne()) {
    return NextResponse.redirect(new URL(key, req.url))
  }

  try {
    const store = await getBlobStore()
    
    // Clean key: strip leading slash if present (EdgeOne Blob keys must not start with /)
    const cleanKey = key.startsWith('/') ? key.slice(1) : key
    console.log(`[API IMAGE GET] Attempting to fetch key: ${cleanKey}`)
    const buffer = await store.get(cleanKey, { type: 'arrayBuffer' })

    if (!buffer) {
      console.log(`[API IMAGE GET] Key not found in Blob store: ${cleanKey}`)
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const contentType = getContentTypeFromKey(cleanKey)
    console.log(`[API IMAGE GET] Successfully fetched key: ${cleanKey}, size: ${buffer.byteLength} bytes, content-type: ${contentType}`)

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e: any) {
    console.error(`[API IMAGE ERROR] Key: ${key}, Error:`, e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

