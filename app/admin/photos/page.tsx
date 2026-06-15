'use client'

import { useEffect, useState, useRef } from 'react'
import { adminGetGallery, adminFetch, adminUploadImage } from '@/app/utils/api'
import type { GalleryConfig, Album } from '@/app/types/config'
import { Plus, Pencil, Trash2, X, Upload, Loader2, CheckCircle } from 'lucide-react'

export default function PhotosPage() {
  const [config, setConfig] = useState<GalleryConfig | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<{ catKey: string; albumId: string; photo: any } | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', url: '' })
  const [editCategory, setEditCategory] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadAlbum, setUploadAlbum] = useState('')
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = () => adminGetGallery().then(setConfig).catch(() => {})
  useEffect(() => { load() }, [])

  const categoryKeys = config ? Object.keys(config.categories) : []
  const albums: { catKey: string; album: Album }[] = []
  if (config) {
    const catKeys = selectedCategory ? [selectedCategory] : Object.keys(config.categories)
    for (const key of catKeys) {
      for (const album of (config.categories[key]?.albums || [])) {
        if (!selectedAlbum || album.id === selectedAlbum) {
          albums.push({ catKey: key, album })
        }
      }
    }
  }

  const allPhotos: { catKey: string; albumId: string; albumTitle: string; photo: any }[] = []
  for (const { catKey, album } of albums) {
    for (const photo of (album.photos || [])) {
      allPhotos.push({ catKey, albumId: album.id, albumTitle: album.title, photo })
    }
  }

  const openEdit = (catKey: string, albumId: string, photo: any) => {
    setEditingPhoto({ catKey, albumId, photo })
    setEditForm({ title: photo.title, description: photo.description, url: photo.url })
    setEditCategory(catKey)
    setEditAlbum(albumId)
    setShowEdit(true)
  }

  const handleEditSave = async () => {
    if (!editingPhoto || !editAlbum) return
    await adminFetch('updatePhoto', {
      categoryKey: editingPhoto.catKey,
      albumId: editingPhoto.albumId,
      photoId: editingPhoto.photo.id,
      title: editForm.title,
      description: editForm.description,
      url: editForm.url,
      targetCategoryKey: editCategory,
      targetAlbumId: editAlbum,
    })
    setShowEdit(false)
    showToast('照片已更新')
    load()
  }

  const handleDelete = async (catKey: string, albumId: string, photoId: string) => {
    if (!confirm('确定删除此照片吗？')) return
    await adminFetch('deletePhoto', { categoryKey: catKey, albumId, photoId })
    showToast('照片已删除')
    load()
  }

  const openUpload = () => {
    setUploadCategory('')
    setUploadAlbum('')
    setUploadFiles([])
    setShowUpload(true)
  }

  const handleUpload = async () => {
    if (!uploadCategory || !uploadAlbum || uploadFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of uploadFiles) {
        const result = await adminUploadImage(file, uploadCategory, uploadAlbum)
        await adminFetch('addPhoto', {
          categoryKey: uploadCategory,
          albumId: uploadAlbum,
          url: result.url,
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
        })
      }
      setShowUpload(false)
      setUploadFiles([])
      showToast(`成功上传 ${uploadFiles.length} 张照片`)
      load()
    } catch (e) {
      alert('上传失败：' + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">照片管理</h1>
        <button
          onClick={openUpload}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          <Upload size={16} /> 上传照片
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={selectedCategory}
          onChange={e => { setSelectedCategory(e.target.value); setSelectedAlbum('') }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
        >
          <option value="">全部分类</option>
          {categoryKeys.map(key => (
            <option key={key} value={key}>{config!.categories[key].title}</option>
          ))}
        </select>
        <select
          value={selectedAlbum}
          onChange={e => setSelectedAlbum(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          disabled={!selectedCategory}
        >
          <option value="">全部相册</option>
          {selectedCategory && config?.categories[selectedCategory]?.albums?.map(album => (
            <option key={album.id} value={album.id}>{album.title}</option>
          ))}
        </select>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {allPhotos.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-xl">未找到照片</div>
        )}
        {allPhotos.map(({ catKey, albumId, albumTitle, photo }) => (
          <div key={photo.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
            <div className="aspect-square bg-gray-100 relative">
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => openEdit(catKey, albumId, photo)} className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(catKey, albumId, photo.id)} className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate">{photo.title}</p>
              <p className="text-xs text-gray-400 truncate">{albumTitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">上传照片</h2>
              <button onClick={() => { setShowUpload(false); setUploadFiles([]) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">选择分类</label>
                  <select
                    value={uploadCategory}
                    onChange={e => { setUploadCategory(e.target.value); setUploadAlbum('') }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                  >
                    <option value="">请选择分类</option>
                    {categoryKeys.map(key => (
                      <option key={key} value={key}>{config!.categories[key].title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">选择相册</label>
                  <select
                    value={uploadAlbum}
                    onChange={e => setUploadAlbum(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                    disabled={!uploadCategory}
                  >
                    <option value="">请选择相册</option>
                    {uploadCategory && config?.categories[uploadCategory]?.albums?.map(album => (
                      <option key={album.id} value={album.id}>{album.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-sm text-gray-500">点击选择照片</p>
                <p className="text-xs text-gray-400 mt-1">支持多文件上传</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={e => setUploadFiles(Array.from(e.target.files || []))}
              />
              {uploadFiles.length > 0 && (
                <div className="text-sm text-gray-600">
                  已选择 {uploadFiles.length} 个文件（{(uploadFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB）
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowUpload(false); setUploadFiles([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">取消</button>
              <button
                onClick={handleUpload}
                disabled={!uploadCategory || !uploadAlbum || uploadFiles.length === 0 || uploading}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editingPhoto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">编辑照片</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={editCategory}
                    onChange={e => {
                      const nextCat = e.target.value
                      setEditCategory(nextCat)
                      const firstAlbumId = config?.categories[nextCat]?.albums?.[0]?.id || ''
                      setEditAlbum(firstAlbumId)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white"
                  >
                    {categoryKeys.map(key => (
                      <option key={key} value={key}>{config!.categories[key].title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">相册</label>
                  <select
                    value={editAlbum}
                    onChange={e => setEditAlbum(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white"
                    disabled={!editCategory}
                  >
                    <option value="">请选择相册</option>
                    {editCategory && config?.categories[editCategory]?.albums?.map(album => (
                      <option key={album.id} value={album.id}>{album.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  value={editForm.url}
                  onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                />
                {editForm.url && <img src={editForm.url} alt="预览" className="mt-2 w-32 h-24 object-cover rounded-lg" />}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">取消</button>
              <button 
                onClick={handleEditSave} 
                disabled={!editAlbum}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                保存
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
