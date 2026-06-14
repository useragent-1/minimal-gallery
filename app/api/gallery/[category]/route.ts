import { NextRequest, NextResponse } from 'next/server'
import { loadGalleryConfig } from '@/app/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const config = await loadGalleryConfig()
    const category = config.categories[params.category]
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ key: params.category, ...category })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
