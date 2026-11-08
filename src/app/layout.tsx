import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { COLD_HASH } from '../lib/types'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hottest Place',
  description: 'Where is the hottest (or coldest) place in the US right now?',
}

// Runs while the HTML is parsed, before first paint: a shared #coldest link shows
// the cold view (both are server-rendered; globals.css picks one) instead of
// flashing the hot one. ModeToggle keeps data-mode in sync after hydration.
const MODE_SCRIPT = `if(location.hash===${JSON.stringify(COLD_HASH)})document.documentElement.setAttribute("data-mode","cold")`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <main className="flex min-h-screen flex-col items-center justify-between p-32">
          <div className="grid grid-cols-1 gap-32 justify-items-center font-mono">{children}</div>
        </main>
      </body>
    </html>
  )
}
