import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Collect relevant environment info
  const envKeys = Object.keys(process.env).filter(k =>
    /BLOB|DEPLOY|CREDENTIAL|PAGES|EDGEONE|KV|GALLERY/i.test(k)
  ).sort()

  const envInfo: Record<string, string> = {}
  for (const key of envKeys) {
    const val = process.env[key] || ''
    // Mask sensitive values but show if they exist and their length
    envInfo[key] = val.length > 0 ? `[set, ${val.length} chars]` : '[empty]'
  }

  return NextResponse.json({
    cwd: process.cwd(),
    nodeVersion: process.version,
    platform: process.platform,
    isEdgeOne_detected: process.cwd().startsWith('/var/user'),
    globalThis_GALLERY_KV: typeof (globalThis as any).GALLERY_KV,
    relevantEnvVars: envInfo,
    allEnvKeyCount: Object.keys(process.env).length,
  })
}
