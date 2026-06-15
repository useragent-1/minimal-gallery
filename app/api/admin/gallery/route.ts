import { NextRequest, NextResponse } from 'next/server'
import { loadGalleryConfig, saveGalleryConfig, deleteImage } from '@/app/lib/storage'
import type { GalleryConfig, Album, Photo } from '@/app/types/config'

export const runtime = 'edge'

function checkAuth(req: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  return authHeader.slice(7) === password
}

// GET /api/admin/gallery - Get full config for admin
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const config = await loadGalleryConfig()
  return NextResponse.json(config)
}

// POST /api/admin/gallery - Full CRUD dispatcher
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body
  const config = await loadGalleryConfig()

  switch (action) {
    case 'createCategory': {
      const { key, title, description, detail } = body
      if (!key || !title) {
        return NextResponse.json({ error: 'key and title required' }, { status: 400 })
      }
      if (config.categories[key]) {
        return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
      }
      config.categories[key] = { title, description: description || '', detail: detail || '', albums: [] }
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true, key })
    }

    case 'updateCategory': {
      const { key, title, description, detail } = body
      if (!key || !config.categories[key]) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      if (title !== undefined) config.categories[key].title = title
      if (description !== undefined) config.categories[key].description = description
      if (detail !== undefined) config.categories[key].detail = detail
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true })
    }

    case 'deleteCategory': {
      const { key } = body
      if (!key || !config.categories[key]) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      delete config.categories[key]
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true })
    }

    case 'createAlbum': {
      const { categoryKey, id, title, description, detail, coverImage } = body
      if (!categoryKey || !id || !title) {
        return NextResponse.json({ error: 'categoryKey, id, title required' }, { status: 400 })
      }
      if (!config.categories[categoryKey]) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      const album: Album = {
        id,
        title,
        description: description || '',
        detail: detail || '',
        coverImage: coverImage || '',
        photoCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        photos: []
      }
      config.categories[categoryKey].albums.push(album)
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true, album })
    }

    case 'updateAlbum': {
      const { categoryKey, albumId, title, description, detail, coverImage } = body
      if (!categoryKey || !albumId) {
        return NextResponse.json({ error: 'categoryKey and albumId required' }, { status: 400 })
      }
      const cat = config.categories[categoryKey]
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      const album = cat.albums.find(a => a.id === albumId)
      if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      if (title !== undefined) album.title = title
      if (description !== undefined) album.description = description
      if (detail !== undefined) album.detail = detail
      if (coverImage !== undefined) album.coverImage = coverImage
      album.photoCount = album.photos.length
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true })
    }

    case 'deleteAlbum': {
      const { categoryKey, albumId } = body
      if (!categoryKey || !albumId) {
        return NextResponse.json({ error: 'categoryKey and albumId required' }, { status: 400 })
      }
      const cat = config.categories[categoryKey]
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      cat.albums = cat.albums.filter(a => a.id !== albumId)
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true })
    }

    case 'addPhoto': {
      const { categoryKey, albumId, url, title, description } = body
      if (!categoryKey || !albumId || !url || !title) {
        return NextResponse.json({ error: 'categoryKey, albumId, url, title required' }, { status: 400 })
      }
      const cat = config.categories[categoryKey]
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      const album = cat.albums.find(a => a.id === albumId)
      if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      const photo: Photo = {
        id: `${albumId}-${Date.now()}`,
        url,
        title,
        description: description || ''
      }
      album.photos.push(photo)
      album.photoCount = album.photos.length
      if (!album.coverImage) album.coverImage = url
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true, photo })
    }

    case 'updatePhoto': {
      const { categoryKey, albumId, photoId, title, description, url } = body
      const cat = config.categories[categoryKey]
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      const album = cat.albums.find(a => a.id === albumId)
      if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      const photo = album.photos.find(p => p.id === photoId)
      if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
      if (title !== undefined) photo.title = title
      if (description !== undefined) photo.description = description
      if (url !== undefined) photo.url = url
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true })
    }

    case 'deletePhoto': {
      const { categoryKey, albumId, photoId } = body
      const cat = config.categories[categoryKey]
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      const album = cat.albums.find(a => a.id === albumId)
      if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      const photo = album.photos.find(p => p.id === photoId)
      if (photo) {
        await deleteImage(photo.url)
      }
      album.photos = album.photos.filter(p => p.id !== photoId)
      album.photoCount = album.photos.length
      await saveGalleryConfig(config)
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
