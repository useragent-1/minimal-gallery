import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'images', 'gallery')

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // Create directory
  const dir = path.join(UPLOAD_DIR, categoryKey, albumId)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  // Save file
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filepath = path.join(dir, filename)
  const bytes = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(bytes))

  const url = `/images/gallery/${categoryKey}/${albumId}/${filename}`
  return NextResponse.json({ success: true, url, filename })
}
