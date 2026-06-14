import { NextRequest, NextResponse } from 'next/server'
import galleryConfig from '@/app/config/gallery.json'
import type { GalleryConfig } from '@/app/types/config'

const config = galleryConfig as GalleryConfig

export async function GET(
  _req: NextRequest,
  { params }: { params: { category: string; albumId: string } }
) {
  const category = config.categories[params.category]
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }
  const album = category.albums.find(a => a.id === params.albumId)
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }
  return NextResponse.json(album)
}
