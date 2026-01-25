import type { Metadata, Viewport } from 'next';
import './globals.css';
import OfflineIndicator from '@/components/offline-indicator';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { IOSInstallPrompt } from '@/components/pwa/ios-install-prompt';
import { headers } from 'next/headers';

// PWA Metadata
export const metadata: Metadata = {
  title: 'COR Pathways - Construction Safety Management',
  description: 'Complete COR 2020 certification platform for construction companies in Ontario',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['COR', 'construction', 'safety', 'IHSA', 'Ontario', 'certification', 'COR 2020'],
  authors: [{ name: 'COR Pathways' }],
  creator: 'COR Pathways',
  publisher: 'COR Pathways',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icons/icon-96x96.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-touch-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/apple-touch-icon-114x114.png', sizes: '114x114', type: 'image/png' },
      { url: '/icons/apple-touch-icon-76x76.png', sizes: '76x76', type: 'image/png' },
      { url: '/icons/apple-touch-icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/apple-touch-icon-60x60.png', sizes: '60x60', type: 'image/png' },
      { url: '/icons/apple-touch-icon-57x57.png', sizes: '57x57', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'COR Pathways',
    startupImage: [
      // iPhone 15 Pro Max, 15 Plus, 14 Pro Max (430x932 @3x)
      {
        url: '/splash/apple-splash-1290-2796.jpg',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2796-1290.jpg',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 15 Pro, 15, 14 Pro (393x852 @3x)
      {
        url: '/splash/apple-splash-1179-2556.jpg',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2556-1179.jpg',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 14, 13, 12 (390x844 @3x)
      {
        url: '/splash/apple-splash-1170-2532.jpg',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2532-1170.jpg',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 14 Plus, 13 Pro Max, 12 Pro Max (428x926 @3x)
      {
        url: '/splash/apple-splash-1284-2778.jpg',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2778-1284.jpg',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 13 Mini, 12 Mini, 11 Pro, XS, X (375x812 @3x)
      {
        url: '/splash/apple-splash-1125-2436.jpg',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2436-1125.jpg',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 11, XR (414x896 @2x)
      {
        url: '/splash/apple-splash-828-1792.jpg',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1792-828.jpg',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPhone 11 Pro Max, XS Max (414x896 @3x)
      {
        url: '/splash/apple-splash-1242-2688.jpg',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2688-1242.jpg',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone SE 3rd/2nd gen, 8, 7, 6s (375x667 @2x)
      {
        url: '/splash/apple-splash-750-1334.jpg',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1334-750.jpg',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPhone 8 Plus, 7 Plus, 6s Plus (414x736 @3x)
      {
        url: '/splash/apple-splash-1242-2208.jpg',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2208-1242.jpg',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPad Pro 12.9" (1024x1366 @2x)
      {
        url: '/splash/apple-splash-2048-2732.jpg',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2732-2048.jpg',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Pro 11" (834x1194 @2x)
      {
        url: '/splash/apple-splash-1668-2388.jpg',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2388-1668.jpg',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Air 4th/5th gen, iPad 10th gen (820x1180 @2x)
      {
        url: '/splash/apple-splash-1640-2360.jpg',
        media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2360-1640.jpg',
        media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad 9th gen, Air 3rd gen (810x1080 @2x)
      {
        url: '/splash/apple-splash-1620-2160.jpg',
        media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2160-1620.jpg',
        media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Mini 6th gen (744x1133 @2x)
      {
        url: '/splash/apple-splash-1488-2266.jpg',
        media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2266-1488.jpg',
        media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad 9.7" (768x1024 @2x)
      {
        url: '/splash/apple-splash-1536-2048.jpg',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-2048-1536.jpg',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'COR Pathways',
    title: 'COR Pathways - Construction Safety Management',
    description: 'Complete COR 2020 certification platform for construction companies in Ontario',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COR Pathways',
    description: 'Complete COR 2020 certification platform',
    images: ['/twitter-image.png'],
  },
};

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0066CC',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';

  return (
    <html lang="en" className="dark">
      <head>
        {/* PWA primary color */}
        <meta name="theme-color" content="#0066CC" />

        {/* iOS Specific - Enhanced */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="COR Pathways" />

        {/* Prevent phone number detection */}
        <meta name="format-detection" content="telephone=no" />

        {/* Disable tap highlight on mobile */}
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Android specific */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* MS Tile */}
        <meta name="msapplication-TileColor" content="#0066CC" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* iOS Touch Icons - All sizes */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
      </head>
      <body className="antialiased">
        <OfflineIndicator />
        <InstallPrompt />
        <IOSInstallPrompt />
        {children}
      </body>
    </html>
  );
}
