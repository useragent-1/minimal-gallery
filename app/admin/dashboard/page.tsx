'use client'

import { useEffect, useState } from 'react'
import { adminGetGallery } from '@/app/utils/api'
import { FolderTree, Image, ImageIcon } from 'lucide-react'
import type { GalleryConfig } from '@/app/types/config'

export default function DashboardPage() {
  const [config, setConfig] = useState<GalleryConfig | null>(null)

  useEffect(() => {
    adminGetGallery().then(setConfig).catch(() => {})
  }, [])

  const categories = config ? Object.keys(config.categories) : []
  const totalAlbums = categories.reduce((sum, key) => sum + (config!.categories[key].albums?.length || 0), 0)
  const totalPhotos = categories.reduce((sum, key) => {
    return sum + (config!.categories[key].albums?.reduce((s, a) => s + (a.photos?.length || 0), 0) || 0)
  }, 0)

  const stats = [
    { label: '分类', value: categories.length, icon: FolderTree, color: 'bg-blue-50 text-blue-600' },
    { label: '相册', value: totalAlbums, icon: ImageIcon, color: 'bg-green-50 text-green-600' },
    { label: '照片', value: totalPhotos, icon: Image, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                <Icon size={20} />
              </div>
              <p className="text-3xl font-semibold text-gray-900">{config ? stat.value : '-'}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {config && (
        <div className="mt-8 bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">分类概览</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {categories.map(key => {
              const cat = config.categories[key]
              return (
                <div key={key} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{cat.title}</p>
                    <p className="text-sm text-gray-500">{cat.description}</p>
                  </div>
                  <span className="text-sm text-gray-400">{cat.albums?.length || 0} 个相册</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
