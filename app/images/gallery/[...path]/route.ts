import { NextRequest, NextResponse } from 'next/server'
import { isEdgeOne, getBlobStore } from '@/app/lib/storage'

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

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join('/')
  const key = `images/gallery/${filePath}`

  if (!isEdgeOne()) {
    // Local mode fallback
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const fullPath = path.join(process.cwd(), 'public', 'images', 'gallery', filePath)
      const buffer = await fs.readFile(fullPath)
      const contentType = getContentTypeFromKey(filePath)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
        },
      })
    } catch {
      return NextResponse.json({ error: 'Image not found locally' }, { status: 404 })
    }
  }

  try {
    const store = await getBlobStore()
    const buffer = await store.get(key, { type: 'arrayBuffer' })

    if (!buffer) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const contentType = getContentTypeFromKey(key)

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
