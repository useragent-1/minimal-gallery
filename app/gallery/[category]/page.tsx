'use client'

import { useState, useEffect } from 'react'
import GalleryContent from './GalleryContent'
import { fetchCategory } from '@/app/utils/api'

export default function CategoryPage({ params }: { params: { category: string } }) {
  const { category } = params
  const [info, setInfo] = useState<{ title: string; description: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategory(category)
      .then(data => setInfo({ title: data.title, description: data.description }))
      .catch(() => setInfo({ title: 'Gallery', description: 'Photo Gallery' }))
      .finally(() => setLoading(false))
  }, [category])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  return <GalleryContent category={category} info={info || { title: 'Gallery', description: '' }} />
}
