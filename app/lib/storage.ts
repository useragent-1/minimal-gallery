/**
 * Storage abstraction layer
 * - EdgeOne deployment: uses KV (if available) + Edge Function proxy for Blob
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

// ==================== Edge Function Proxy ====================

const PROXY_BASE = process.env.EDGEONE_ORIGIN || 'https://minimal.bbroot.com'

async function proxyCall(action: string, options: {
  method?: string
  body?: any
  formData?: FormData
  key?: string
}): Promise<any> {
  const url = new URL(`/api/blob-proxy?action=${action}`, PROXY_BASE)
  if (options.key) url.searchParams.set('key', options.key)

  const headers: Record<string, string> = {}
  let body: any = undefined

  if (options.formData) {
    body = options.formData
  } else if (options.body) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'POST',
    headers,
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Proxy ${action} failed (${res.status}): ${text}`)
  }

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  if (ct.includes('image/')) return res.arrayBuffer()
  return res.text()
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
    // Try KV first
    const kv = getKV()
    if (kv) {
      try {
        const data = await kv.get('gallery_config')
        if (data) return JSON.parse(data) as GalleryConfig
        const defaultConfig = await loadDefaultConfig()
        await kv.put('gallery_config', JSON.stringify(defaultConfig))
        return defaultConfig
      } catch (e) {
        console.warn('KV read failed, trying proxy:', e)
      }
    }

    // Try proxy (Edge Function)
    try {
      const result = await proxyCall('getConfig')
      if (result.success && result.config) return result.config as GalleryConfig
    } catch (e) {
      console.warn('Proxy getConfig failed:', e)
    }

    // Final fallback: use deployed JSON
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
    // Try KV first
    const kv = getKV()
    if (kv) {
      try {
        await kv.put('gallery_config', JSON.stringify(config))
        return
      } catch (e) {
        console.warn('KV write failed, trying proxy:', e)
      }
    }

    // Use proxy
    await proxyCall('saveConfig', { body: { config } })
    return
  }

  // Local mode
  localConfigCache = config
  await saveLocalConfig(config)
}

// ==================== Blob Storage (Image Files) ====================

export async function uploadImage(
  fileBuffer: ArrayBuffer,
  filePath: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (isEdgeOne()) {
    // Use Edge Function proxy
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer], { type: contentType }), filePath)
    formData.append('filePath', filePath)

    const result = await proxyCall('upload', { formData })
    return result.url
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
      await proxyCall('deleteImage', { body: { key: imageUrl } })
    } catch (e) {
      console.warn('Delete image failed:', e)
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
