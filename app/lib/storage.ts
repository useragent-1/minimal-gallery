/**
 * Storage abstraction layer
 * - EdgeOne deployment: uses KV (global GALLERY_KV) + Blob (@edgeone/pages-blob)
 * - Local development: uses JSON file + local filesystem
 */

import type { GalleryConfig } from '@/app/types/config'

// Detect EdgeOne runtime
function isEdgeOne(): boolean {
  try {
    return typeof (globalThis as any).GALLERY_KV !== 'undefined'
  } catch {
    return false
  }
}

// ==================== KV Storage (Gallery Config) ====================

let localConfigCache: GalleryConfig | null = null

async function loadLocalConfig(): Promise<GalleryConfig> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const configPath = path.join(process.cwd(), 'app', 'config', 'gallery.json')
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(raw) as GalleryConfig
  } catch {
    // Fallback to imported JSON
    const mod = await import('@/app/config/gallery.json')
    return mod.default as GalleryConfig
  }
}

async function saveLocalConfig(config: GalleryConfig): Promise<void> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const configPath = path.join(process.cwd(), 'app', 'config', 'gallery.json')
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function loadGalleryConfig(): Promise<GalleryConfig> {
  if (isEdgeOne()) {
    const kv = (globalThis as any).GALLERY_KV
    const data = await kv.get('gallery_config')
    if (data) return JSON.parse(data) as GalleryConfig
    // First time - load from default and save to KV
    const defaultConfig = (await import('@/app/config/gallery.json')).default as GalleryConfig
    await kv.put('gallery_config', JSON.stringify(defaultConfig))
    return defaultConfig
  }
  // Local mode
  if (!localConfigCache) {
    localConfigCache = await loadLocalConfig()
  }
  return JSON.parse(JSON.stringify(localConfigCache))
}

export async function saveGalleryConfig(config: GalleryConfig): Promise<void> {
  if (isEdgeOne()) {
    const kv = (globalThis as any).GALLERY_KV
    await kv.put('gallery_config', JSON.stringify(config))
    return
  }
  // Local mode
  localConfigCache = config
  await saveLocalConfig(config)
}

// ==================== Blob Storage (Image Files) ====================

let blobStore: any = null

async function getBlobStore() {
  if (!blobStore) {
    const { getStore } = await import('@edgeone/pages-blob')
    blobStore = getStore('gallery')
  }
  return blobStore
}

export async function uploadImage(
  fileBuffer: ArrayBuffer,
  filePath: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (isEdgeOne()) {
    const store = await getBlobStore()
    const key = `/images/${filePath}`
    await store.set(key, fileBuffer, { contentType })
    return key
  }
  // Local mode - save to public directory
  const fs = await import('fs/promises')
  const path = await import('path')
  const fullPath = path.join(process.cwd(), 'public', 'images', filePath)
  const dir = path.dirname(fullPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(fullPath, Buffer.from(fileBuffer))
  return `/images/${filePath}`
}

export async function deleteImage(imageUrl: string): Promise<void> {
  if (isEdgeOne()) {
    const store = await getBlobStore()
    await store.delete(imageUrl)
    return
  }
  // Local mode - delete from public directory
  const fs = await import('fs/promises')
  const path = await import('path')
  const fullPath = path.join(process.cwd(), 'public', imageUrl)
  try {
    await fs.unlink(fullPath)
  } catch {
    // File may not exist
  }
}

export async function getImageUrl(imageUrl: string): Promise<string> {
  // On EdgeOne, Blob images are served via a function endpoint
  // For now, return the URL directly (EdgeOne will serve it)
  if (isEdgeOne()) {
    return `/api/image?key=${encodeURIComponent(imageUrl)}`
  }
  return imageUrl
}
