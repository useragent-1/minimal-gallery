'use client'

import { useEffect, useState } from 'react'
import { adminGetGallery, adminFetch } from '@/app/utils/api'
import type { GalleryConfig, Album } from '@/app/types/config'
import { Plus, Pencil, Trash2, X, CheckCircle } from 'lucide-react'

export default function AlbumsPage() {
  const [config, setConfig] = useState<GalleryConfig | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<{ catKey: string; album: Album } | null>(null)
  const [form, setForm] = useState({ categoryKey: '', id: '', title: '', description: '', detail: '', coverImage: '' })
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = () => adminGetGallery().then(setConfig).catch(() => {})
  useEffect(() => { load() }, [])

  const categoryKeys = config ? Object.keys(config.categories) : []
  const currentAlbums = config && selectedCategory ? (config.categories[selectedCategory]?.albums || []) : []

  const openCreate = () => {
    setEditingAlbum(null)
    setForm({ categoryKey: selectedCategory || categoryKeys[0] || '', id: '', title: '', description: '', detail: '', coverImage: '' })
    setShowModal(true)
  }

  const openEdit = (catKey: string, album: Album) => {
    setEditingAlbum({ catKey, album })
    setForm({
      categoryKey: catKey,
      id: album.id,
      title: album.title,
      description: album.description,
      detail: album.detail || '',
      coverImage: album.coverImage,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editingAlbum) {
      await adminFetch('updateAlbum', {
        categoryKey: editingAlbum.catKey,
        albumId: editingAlbum.album.id,
        title: form.title,
        description: form.description,
        detail: form.detail,
        coverImage: form.coverImage,
      })
    } else {
      const id = `${form.categoryKey}-${Date.now()}`
      await adminFetch('createAlbum', {
        categoryKey: form.categoryKey,
        id,
        title: form.title,
        description: form.description,
        detail: form.detail,
        coverImage: form.coverImage,
      })
    }
    setShowModal(false)
    showToast(editingAlbum ? '相册已更新' : '相册已创建')
    load()
  }

  const handleDelete = async (catKey: string, albumId: string) => {
    if (!confirm('确定删除此相册及其所有照片吗？')) return
    await adminFetch('deleteAlbum', { categoryKey: catKey, albumId })
    showToast('相册已删除')
    load()
  }

  // Show all albums across categories if no category selected
  const allAlbums: { catKey: string; album: Album }[] = []
  if (config) {
    const keys = selectedCategory ? [selectedCategory] : Object.keys(config.categories)
    for (const key of keys) {
      for (const album of (config.categories[key]?.albums || [])) {
        allAlbums.push({ catKey: key, album })
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">相册管理</h1>
        <button
          onClick={openCreate}
          disabled={categoryKeys.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
        >
          <Plus size={16} /> 新建相册
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!selectedCategory ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          全部
        </button>
        {categoryKeys.map(key => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === key ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {config!.categories[key].title}
          </button>
        ))}
      </div>

      {/* Album grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAlbums.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-xl">未找到相册</div>
        )}
        {allAlbums.map(({ catKey, album }) => (
          <div key={`${catKey}-${album.id}`} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
              {album.coverImage ? (
                <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">无封面</div>
              )}
            </div>
            <div className="p-4">
              <p className="font-medium text-gray-900">{album.title}</p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{album.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{album.photos?.length || 0} 张照片 · {catKey}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(catKey, album)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(catKey, album.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingAlbum ? '编辑相册' : '新建相册'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={form.categoryKey}
                  onChange={e => setForm(f => ({ ...f, categoryKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                  disabled={!!editingAlbum}
                >
                  {categoryKeys.map(key => (
                    <option key={key} value={key}>{config!.categories[key].title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">封面图片 URL</label>
                <input
                  value={form.coverImage}
                  onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                  placeholder="/images/gallery/..."
                />
                {form.coverImage && (
                  <img src={form.coverImage} alt="封面预览" className="mt-2 w-32 h-20 object-cover rounded-lg" />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">取消</button>
              <button
                onClick={handleSave}
                disabled={!form.title || !form.categoryKey}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                {editingAlbum ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg">
          <CheckCircle size={16} />
          <span className="text-sm">{toast}</span>
        </div>
      )}
    </div>
  )
}
