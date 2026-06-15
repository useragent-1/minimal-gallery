import './globals.css'
import type { Metadata } from 'next'
import { Inter, Cormorant } from 'next/font/google'
import ConditionalNavbar from './components/ConditionalNavbar'

const inter = Inter({ subsets: ['latin'] })
const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'Nimmal 画廊',
  description: '用影像讲述视觉故事',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={`${inter.className} ${cormorant.className}`}>
        <ConditionalNavbar />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  )
} 