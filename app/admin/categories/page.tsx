'use client'

import { useEffect, useState } from 'react'
import { adminGetGallery, adminFetch } from '@/app/utils/api'
import type { GalleryConfig, Category } from '@/app/types/config'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

export default function CategoriesPage() {
  const [config, setConfig] = useState<GalleryConfig | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState({ key: '', title: '', description: '', detail: '' })

  const load = () => adminGetGallery().then(setConfig).catch(() => {})
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingKey(null)
    setForm({ key: '', title: '', description: '', detail: '' })
    setShowModal(true)
  }

  const openEdit = (key: string, cat: Category) => {
    setEditingKey(key)
    setForm({ key, title: cat.title, description: cat.description, detail: cat.detail || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editingKey) {
      await adminFetch('updateCategory', {
        key: editingKey,
        title: form.title,
        description: form.description,
        detail: form.detail,
      })
    } else {
      await adminFetch('createCategory', {
        key: form.key,
        title: form.title,
        description: form.description,
        detail: form.detail,
      })
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (key: string) => {
    if (!confirm(`确定删除分类"${key}"吗？这将同时删除其中所有相册和照片。`)) return
    await adminFetch('deleteCategory', { key })
    load()
  }

  const categories = config ? Object.entries(config.categories) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">分类管理</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          <Plus size={16} /> 新建分类
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
        {categories.length === 0 && (
          <div className="p-8 text-center text-gray-400">暂无分类</div>
        )}
        {categories.map(([key, cat]) => (
          <div key={key} className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{cat.title} <span className="text-gray-400 font-normal text-sm">({key})</span></p>
              <p className="text-sm text-gray-500">{cat.description}</p>
              <p className="text-xs text-gray-400 mt-1">{cat.albums?.length || 0} 个相册</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(key, cat)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(key)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingKey ? '编辑分类' : '新建分类'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {!editingKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标识（URL slug）</label>
                  <input
                    value={form.key}
                    onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                    placeholder="例如 nature"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                  placeholder="例如 自然风光"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详情</label>
                <textarea
                  value={form.detail}
                  onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">取消</button>
              <button
                onClick={handleSave}
                disabled={!form.title || (!editingKey && !form.key)}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                {editingKey ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
