import { NextRequest, NextResponse } from 'next/server'
import { uploadImage } from '@/app/lib/storage'

export const runtime = 'edge'

// Allow up to 10MB file uploads
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const categoryKey = formData.get('categoryKey') as string
    const albumId = formData.get('albumId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!categoryKey || !albumId) {
      return NextResponse.json({ error: 'categoryKey and albumId required' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `gallery/${categoryKey}/${albumId}/${filename}`

    const bytes = await file.arrayBuffer()
    const url = await uploadImage(bytes, filePath, file.type)

    return NextResponse.json({ success: true, url, filename })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json(
      { error: `Upload error: ${(e as Error).message}` },
      { status: 500 }
    )
  }
}
