'use client'

import { useState, useEffect } from 'react'
import AlbumContent from './AlbumContent'
import { fetchAlbum } from '@/app/utils/api'
import { Album } from '@/app/types/config'

export default function AlbumPage({ params }: { params: { category: string; albumId: string } }) {
  const { category, albumId } = params
  const [albumData, setAlbumData] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlbum(category, albumId)
      .then(data => setAlbumData(data))
      .catch(() => setAlbumData(null))
      .finally(() => setLoading(false))
  }, [category, albumId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!albumData) {
    return <div>Album not found</div>
  }

  return <AlbumContent albumData={albumData} category={category} />
}
