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
  title: 'Nimmal Gallery',
  description: 'A collection of visual stories',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${cormorant.className}`}>
        <ConditionalNavbar />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  )
} 