import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'travelin — Your travel companion',
    template: '%s · travelin',
  },
  description:
    'Plan, track, and remember every trip. Itinerary, bookings, expenses, and memories — all in one place.',
  keywords: [
    'travel app',
    'trip planner',
    'itinerary',
    'expense tracker',
    'travel companion',
    'Southeast Asia travel',
  ],
  authors: [{ name: 'mifmelse' }],
  creator: 'mifmelse',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ),
  openGraph: {
    title: 'travelin — Your travel companion',
    description:
      'Plan, track, and remember every trip. Itinerary, bookings, expenses, and memories — all in one place.',
    url: '/',
    siteName: 'travelin',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'travelin — Your travel companion',
    description:
      'Plan, track, and remember every trip. Itinerary, bookings, expenses, and memories — all in one place.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1A1F' },
  ],
  width: 'device-width',
  initialScale: 1,
}

const themeInitScript = `
(function() {
  try {
    var pref = localStorage.getItem('travelin-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var resolved = pref === 'light' || pref === 'dark' ? pref : (pref === 'system' || pref === null ? system : 'light');
    if (resolved === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
