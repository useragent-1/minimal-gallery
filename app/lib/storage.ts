/**
 * Storage abstraction layer
 * - EdgeOne deployment: uses KV (if available) + Blob (@edgeone/pages-blob)
 * - Local development: uses JSON file + local filesystem
 */

import type { GalleryConfig } from '@/app/types/config'

// ==================== Runtime Detection ====================

let _isEdgeOne: boolean | null = null

export function isEdgeOne(): boolean {
  if (_isEdgeOne !== null) return _isEdgeOne

  // Method 1: KV binding is available
  try {
    if (typeof (globalThis as any).GALLERY_KV !== 'undefined') {
      _isEdgeOne = true
      return true
    }
  } catch {}

  // Method 2: Detect EdgeOne Pages runtime by filesystem path
  // On EdgeOne Pages, process.cwd() returns /var/user or similar
  try {
    const cwd = process.cwd()
    if (cwd.startsWith('/var/user') || cwd.startsWith('/opt/edgeone')) {
      _isEdgeOne = true
      return true
    }
  } catch {}

  // Method 3: Check for EdgeOne-specific environment variables
  try {
    if (process.env.EDGEONE_VERSION || process.env.EDGEONE_PAGES) {
      _isEdgeOne = true
      return true
    }
  } catch {}

  _isEdgeOne = false
  return false
}

/** Get KV binding if available */
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

/** Try loading config from Blob storage (for EdgeOne when KV is unavailable) */
async function loadBlobConfig(): Promise<GalleryConfig | null> {
  try {
    const store = await getBlobStore()
    const data = await store.get('/config/gallery.json')
    if (data) {
      const text = typeof data === 'string' ? data : await data.text()
      return JSON.parse(text) as GalleryConfig
    }
  } catch {}
  return null
}

/** Save config to Blob storage (for EdgeOne when KV is unavailable) */
async function saveBlobConfig(config: GalleryConfig): Promise<void> {
  try {
    const store = await getBlobStore()
    await store.set('/config/gallery.json', JSON.stringify(config), {
      contentType: 'application/json',
    })
  } catch (e) {
    console.error('Failed to save config to Blob:', e)
  }
}

export async function loadGalleryConfig(): Promise<GalleryConfig> {
  // Priority: KV → Blob → local file
  if (isEdgeOne()) {
    // Try KV first
    const kv = getKV()
    if (kv) {
      try {
        const data = await kv.get('gallery_config')
        if (data) return JSON.parse(data) as GalleryConfig
        // First time - seed from default config
        const defaultConfig = await loadDefaultConfig()
        await kv.put('gallery_config', JSON.stringify(defaultConfig))
        return defaultConfig
      } catch (e) {
        console.warn('KV read failed, trying Blob fallback:', e)
      }
    }

    // KV not available, try Blob
    const blobConfig = await loadBlobConfig()
    if (blobConfig) return blobConfig

    // Final fallback: use deployed JSON and seed to Blob for future writes
    const defaultConfig = await loadDefaultConfig()
    await saveBlobConfig(defaultConfig)
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
    // Try KV first
    const kv = getKV()
    if (kv) {
      try {
        await kv.put('gallery_config', JSON.stringify(config))
        return
      } catch (e) {
        console.warn('KV write failed, trying Blob fallback:', e)
      }
    }

    // KV not available, use Blob
    await saveBlobConfig(config)
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
    try {
      const store = await getBlobStore()
      await store.delete(imageUrl)
    } catch (e) {
      console.warn('Blob delete failed:', e)
    }
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
  if (isEdgeOne()) {
    return `/api/image?key=${encodeURIComponent(imageUrl)}`
  }
  return imageUrl
}
