import React from 'react'
import type { Metadata, Viewport } from 'next'
import '../globals.css'
import './leakcheck.css'

export const metadata: Metadata = {
  title: 'Leakcheck by Dappa',
  description:
    'A free calculator for small businesses that sell on WhatsApp. Find out what missed messages, slow replies and quiet quotes cost you each month.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF6F1' },
    { media: '(prefers-color-scheme: dark)', color: '#1C0817' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Set the theme before first paint so there's no light flash in dark mode.
const themeScript = `(function(){try{var t=localStorage.getItem('lc-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0 }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
