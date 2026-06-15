/**
 * Storage abstraction layer
 * - EdgeOne deployment: uses KV (global GALLERY_KV) + Blob (@edgeone/pages-blob)
 * - Local development: uses JSON file + local filesystem
 */

import type { GalleryConfig } from '@/app/types/config'

// ==================== Runtime Detection ====================

export function isEdgeOne(): boolean {
  try {
    if (typeof (globalThis as any).GALLERY_KV !== 'undefined') {
      return true
    }
  } catch {}

  try {
    const cwd = process.cwd()
    if (cwd.startsWith('/var/user') || cwd.startsWith('/opt/edgeone')) {
      return true
    }
  } catch {}

  try {
    if (process.env.EDGEONE_VERSION || process.env.EDGEONE_PAGES) {
      return true
    }
  } catch {}

  return false
}

function getKV(): any {
  try {
    const kv = (globalThis as any).GALLERY_KV
    if (kv && typeof kv.get === 'function') return kv
  } catch {}
  return null
}

// ==================== KV Storage (Gallery Config) ====================

let localConfigCache: GalleryConfig | null = null

async function loadDefaultConfig(): Promise<GalleryConfig> {
  const mod = await import('@/app/config/gallery.json')
  return JSON.parse(JSON.stringify(mod.default)) as GalleryConfig
}

async function loadLocalConfig(): Promise<GalleryConfig> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const configPath = path.join(process.cwd(), 'app', 'config', 'gallery.json')
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(raw) as GalleryConfig
  } catch {
    return loadDefaultConfig()
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
    const kv = getKV()
    if (kv) {
      try {
        const data = await kv.get('gallery_config')
        if (data) return JSON.parse(data) as GalleryConfig
        const defaultConfig = await loadDefaultConfig()
        await kv.put('gallery_config', JSON.stringify(defaultConfig))
        return defaultConfig
      } catch (e) {
        console.warn('KV read failed:', e)
      }
    }
    // KV not available, use deployed default config
    return loadDefaultConfig()
  }

  // Local mode
  if (!localConfigCache) {
    localConfigCache = await loadLocalConfig()
  }
  return JSON.parse(JSON.stringify(localConfigCache))
}

export async function saveGalleryConfig(config: GalleryConfig): Promise<void> {
  if (isEdgeOne()) {
    const kv = getKV()
    if (kv) {
      try {
        await kv.put('gallery_config', JSON.stringify(config))
        return
      } catch (e) {
        console.warn('KV write failed:', e)
      }
    }
    // KV not available - changes won't persist across restarts
    console.warn('No KV storage available, config changes will not persist')
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
    try {
      const store = await getBlobStore()
      const key = `/images/${filePath}`
      await store.set(key, fileBuffer, { contentType })
      return key
    } catch (e: any) {
      // If Blob SDK fails, provide detailed error
      throw new Error(`Blob storage error: ${e.message}. ` +
        `This usually means PAGES_BLOB_DEPLOY_CREDENTIAL is not configured. ` +
        `Check EdgeOne Pages console to ensure Blob storage is enabled for this project.`)
    }
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
    try {
      const store = await getBlobStore()
      await store.delete(imageUrl)
    } catch (e) {
      console.warn('Blob delete failed:', e)
    }
    return
  }
  // Local mode
  const fs = await import('fs/promises')
  const path = await import('path')
  const fullPath = path.join(process.cwd(), 'public', imageUrl)
  try {
    await fs.unlink(fullPath)
  } catch {}
}

export async function getImageUrl(imageUrl: string): Promise<string> {
  if (isEdgeOne()) {
    return `/api/image?key=${encodeURIComponent(imageUrl)}`
  }
  return imageUrl
}
