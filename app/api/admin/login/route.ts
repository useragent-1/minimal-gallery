import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { password } = body
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  if (password === adminPassword) {
    return NextResponse.json({ success: true, token: password })
  }
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
