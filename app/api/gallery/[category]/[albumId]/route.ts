import { NextRequest, NextResponse } from 'next/server'
import { loadGalleryConfig } from '@/app/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { category: string; albumId: string } }
) {
  try {
    const config = await loadGalleryConfig()
    const category = config.categories[params.category]
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    const album = category.albums.find(a => a.id === params.albumId)
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }
    return NextResponse.json(album)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
