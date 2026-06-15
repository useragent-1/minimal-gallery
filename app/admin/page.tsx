'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin } from '@/app/utils/api'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminLogin(password)
      router.push('/admin/dashboard')
    } catch {
      setError('密码错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">管理员登录</h1>
        <p className="text-sm text-gray-500 mb-8 text-center">请输入密码以访问管理面板</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
