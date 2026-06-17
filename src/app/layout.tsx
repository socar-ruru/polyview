import type { Metadata } from 'next'
import { DEFAULT_APP_TITLE } from '@/lib/constants'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const title = process.env.APP_TITLE?.trim() || DEFAULT_APP_TITLE

export const metadata: Metadata = {
  title,
  description: 'Browse and render files from a GitHub repo or local directory.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
