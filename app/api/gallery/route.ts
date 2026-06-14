import { NextRequest, NextResponse } from 'next/server'
import galleryConfig from '@/app/config/gallery.json'
import type { GalleryConfig } from '@/app/types/config'

const config = galleryConfig as GalleryConfig

export async function GET() {
  return NextResponse.json(config)
}
