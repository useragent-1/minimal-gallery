import { NextRequest, NextResponse } from 'next/server'
import galleryConfig from '@/app/config/gallery.json'
import type { GalleryConfig } from '@/app/types/config'

const config = galleryConfig as GalleryConfig

export async function GET(
  _req: NextRequest,
  { params }: { params: { category: string } }
) {
  const category = config.categories[params.category]
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }
  return NextResponse.json({ key: params.category, ...category })
}
