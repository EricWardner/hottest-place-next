import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hottest Place',
  description: 'Where is the hottest (or coldest) place in the US right now?',
}

// Runs while the HTML is parsed, before first paint: a shared #coldest link gets the
// cold styling immediately instead of flashing the server-rendered hot view.
// ModeToggle keeps data-mode in sync after hydration.
const MODE_SCRIPT = `if(location.hash==="#coldest")document.documentElement.setAttribute("data-mode","cold")`

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
