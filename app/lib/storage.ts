/**
 * Storage abstraction layer
 * - EdgeOne deployment: uses KV (global GALLERY_KV) + Blob (@edgeone/pages-blob)
 * - Local development: uses JSON file + local filesystem
 */

import type { GalleryConfig } from '@/app/types/config'
import defaultConfigData from '@/app/config/gallery.json'

// ==================== Runtime Detection ====================

export function isEdgeOne(): boolean {
  // 1. Check if GALLERY_KV is bound globally (Edge Functions runtime)
  try {
    if (typeof GALLERY_KV !== 'undefined') {
      return true
    }
  } catch {}
  
  try {
    if (typeof (globalThis as any).GALLERY_KV !== 'undefined') {
      return true
    }
  } catch {}

  // 2. Check if we have our EdgeOne environment variables configured
  if (process.env.EDGEONE_PROJECT_ID || process.env.PAGES_BLOB_PROJECT_ID) {
    return true
  }

  // 3. Check for standard EdgeOne platform variables
  if (process.env.EDGEONE_VERSION || process.env.EDGEONE_PAGES || process.env.PAGES_BLOB_DEPLOY_CREDENTIAL) {
    return true
  }

  // 4. Check working directory as a fallback
  try {
    const cwd = process.cwd()
    if (cwd.startsWith('/var/user') || cwd.startsWith('/opt/edgeone') || cwd.includes('edgeone') || cwd.includes('makers')) {
      return true
    }
  } catch {}

  return false
}

function getKV(): any {
  try {
    if (typeof GALLERY_KV !== 'undefined' && typeof GALLERY_KV.get === 'function') {
      return GALLERY_KV
    }
  } catch {}
  try {
    const kv = (globalThis as any).GALLERY_KV
    if (kv && typeof kv.get === 'function') return kv
  } catch {}
  return null
}

// ==================== KV Storage (Gallery Config) ====================

let localConfigCache: GalleryConfig | null = null

// Hides Node.js native modules from the Edge Runtime bundler
async function getFsAndPath() {
  const fsName = 'fs/promises'
  const pathName = 'path'
  const fs = await import(fsName)
  const path = await import(pathName)
  return { fs, path }
}

async function loadDefaultConfig(): Promise<GalleryConfig> {
  return JSON.parse(JSON.stringify(defaultConfigData)) as GalleryConfig
}

async function loadLocalConfig(): Promise<GalleryConfig> {
  const { fs, path } = await getFsAndPath()
  const configPath = path.join(process.cwd(), 'app', 'config', 'gallery.json')
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(raw) as GalleryConfig
  } catch {
    return loadDefaultConfig()
  }
}

async function saveLocalConfig(config: GalleryConfig): Promise<void> {
  const { fs, path } = await getFsAndPath()
  const configPath = path.join(process.cwd(), 'app', 'config', 'gallery.json')
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function loadGalleryConfig(): Promise<GalleryConfig> {
  if (isEdgeOne()) {
    const kv = getKV()
    if (kv) {
      try {
        const data = await kv.get('gallery_config')
        if (data) {
          const parsed = JSON.parse(data) as GalleryConfig
          if (parsed && parsed.categories && Object.keys(parsed.categories).length > 0) {
            return parsed
          }
        }
        // If config is empty or invalid in KV, reset to default config
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

export async function getBlobStore() {
  if (!blobStore) {
    const { getStore } = await import('@edgeone/pages-blob')
    
    // In Next.js container runtime on EdgeOne Pages, the platform does not automatically
    // inject the deploy credentials. We retrieve them from the environment variables.
    const projectId = process.env.EDGEONE_PROJECT_ID || process.env.PAGES_BLOB_PROJECT_ID
    const token = process.env.EDGEONE_TOKEN || process.env.PAGES_BLOB_DEPLOY_CREDENTIAL || process.env.EDGEONE_API_TOKEN

    if (projectId && token) {
      blobStore = getStore({
        name: 'gallery',
        projectId: projectId,
        token: token
      })
    } else {
      blobStore = getStore('gallery')
    }
  }
  return blobStore
}

function getStoreKey(url: string): string {
  // Strip leading slash if present because EdgeOne Blob keys must not start with /
  return url.startsWith('/') ? url.slice(1) : url
}

export async function uploadImage(
  fileBuffer: ArrayBuffer,
  filePath: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (isEdgeOne()) {
    try {
      const store = await getBlobStore()
      const key = `images/${filePath}`
      // EdgeOne Blob store.set options only support onlyIfNew and cacheControl.
      // contentType is not a supported option for store.set in the SDK, so we omit it here.
      await store.set(key, fileBuffer)
      return `/images/${filePath}`
    } catch (e: any) {
      // If Blob SDK fails, provide detailed error
      throw new Error(`Blob storage error: ${e.message}. ` +
        `Please ensure you have configured 'EDGEONE_PROJECT_ID' and 'EDGEONE_TOKEN' (or 'PAGES_BLOB_DEPLOY_CREDENTIAL') in your EdgeOne Pages project Environment Variables. ` +
        `This is required because Next.js runs in a Node.js container environment on EdgeOne Pages, which is considered outside of the Edge Functions runtime and requires explicit project ID and token credentials.`)
    }
  }
  // Local mode - save to public directory
  const { fs, path } = await getFsAndPath()
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
      await store.delete(getStoreKey(imageUrl))
    } catch (e) {
      console.warn('Blob delete failed:', e)
    }
    return
  }
  // Local mode
  const { fs, path } = await getFsAndPath()
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

