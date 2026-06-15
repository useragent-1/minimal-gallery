/**
 * Edge Function proxy for all Blob storage operations
 * Handles: upload, getConfig, saveConfig, getImage
 * The Next.js server forwards requests here via /api/blob-proxy?action=xxx
 */

import { getStore } from '@edgeone/pages-blob'

const BLOB_STORE = 'gallery'
const CONFIG_KEY = '/config/gallery.json'

export async function onRequest({ request }) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  try {
    const store = getStore(BLOB_STORE)

    switch (action) {
      case 'upload': {
        const formData = await request.formData()
        const file = formData.get('file')
        const filePath = formData.get('filePath')
        if (!file || !filePath) {
          return json({ error: 'Missing file or filePath' }, 400)
        }
        const buffer = await file.arrayBuffer()
        const key = `/images/${filePath}`
        await store.set(key, buffer, { contentType: file.type || 'image/jpeg' })
        return json({ success: true, url: key })
      }

      case 'getConfig': {
        const data = await store.get(CONFIG_KEY, { type: 'text' })
        if (data) return json({ success: true, config: JSON.parse(data) })
        return json({ success: false, config: null })
      }

      case 'saveConfig': {
        const body = await request.json()
        await store.set(CONFIG_KEY, JSON.stringify(body.config), {
          contentType: 'application/json',
        })
        return json({ success: true })
      }

      case 'getImage': {
        const key = url.searchParams.get('key')
        if (!key) return json({ error: 'Missing key' }, 400)
        const buffer = await store.get(key, { type: 'arrayBuffer' })
        if (!buffer) return json({ error: 'Image not found' }, 404)
        return new Response(buffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }

      case 'deleteImage': {
        const body = await request.json()
        await store.delete(body.key)
        return json({ success: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
