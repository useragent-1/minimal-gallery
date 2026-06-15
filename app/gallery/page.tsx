import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '画廊 - MOA 花园房间',
  description: '浏览我们的花园房间和工作室系列',
}

export default function Gallery() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sample gallery items */}
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Link 
              href={`/gallery/${item}`} 
              key={item}
              className="block bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <div className="aspect-w-16 aspect-h-9 bg-gray-300 mb-4"></div>
              <h2 className="text-xl font-semibold">画廊项目 {item}</h2>
              <p className="text-gray-600 mt-2">点击查看详情</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
} 