import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hottest Place',
  description: 'Where is the hottest place in the US right now?',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="flex min-h-screen flex-col items-center justify-between p-32">
          <div className="grid grid-cols-1 gap-32 justify-items-center font-mono">{children}</div>
        </main>
      </body>
    </html>
  )
}
