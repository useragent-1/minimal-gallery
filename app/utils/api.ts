const API_BASE = ''

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('admin_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ====== Public Gallery API ======

export async function fetchGalleryData() {
  const res = await fetch(`${API_BASE}/api/gallery`)
  if (!res.ok) throw new Error('Failed to fetch gallery')
  return res.json()
}

export async function fetchCategory(category: string) {
  const res = await fetch(`${API_BASE}/api/gallery/${category}`)
  if (!res.ok) throw new Error('Failed to fetch category')
  return res.json()
}

export async function fetchAlbum(category: string, albumId: string) {
  const res = await fetch(`${API_BASE}/api/gallery/${category}/${albumId}`)
  if (!res.ok) throw new Error('Failed to fetch album')
  return res.json()
}

// ====== Admin API ======

export async function adminLogin(password: string) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('Invalid password')
  const data = await res.json()
  sessionStorage.setItem('admin_token', data.token)
  return data
}

export function adminLogout() {
  sessionStorage.removeItem('admin_token')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export async function adminFetch(action: string, payload: Record<string, any> = {}) {
  const res = await fetch(`${API_BASE}/api/admin/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, ...payload }),
  })
  if (res.status === 401) {
    adminLogout()
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function adminGetGallery() {
  const res = await fetch(`${API_BASE}/api/admin/gallery`, {
    headers: authHeaders(),
  })
  if (res.status === 401) {
    adminLogout()
    throw new Error('Session expired')
  }
  if (!res.ok) throw new Error('Failed to fetch admin gallery')
  return res.json()
}

export async function adminUploadImage(file: File, categoryKey: string, albumId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('categoryKey', categoryKey)
  formData.append('albumId', albumId)

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (res.status === 401) {
    adminLogout()
    throw new Error('登录已过期')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const errData = await res.json()
      detail = errData.error || ''
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`上传失败 (${res.status})${detail ? ': ' + detail : ''}`)
  }
  return res.json()
}
