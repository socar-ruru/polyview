import type { Metadata } from 'next'
import { DEFAULT_APP_TITLE } from '@/lib/constants'
import './globals.css'

const title = process.env.APP_TITLE?.trim() || DEFAULT_APP_TITLE

export const metadata: Metadata = {
  title,
  description: 'Browse and render files from a private GitHub repository.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
