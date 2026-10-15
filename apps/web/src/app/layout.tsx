import type {Metadata, Viewport} from 'next';
import {Geist} from 'next/font/google';
import './globals.css';

const geist = Geist({subsets: ['latin'], variable: '--font-geist'});
export const metadata: Metadata = {
  title: {default: 'HouseFamily', template: '%s · HouseFamily'},
  description: 'One calm, private place for everything your home needs.',
  applicationName: 'HouseFamily',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: {url: '/brand/icon-48.png', sizes: '48x48', type: 'image/png'},
    apple: {url: '/brand/icon-180.png', sizes: '180x180', type: 'image/png'},
  },
  appleWebApp: {capable: true, statusBarStyle: 'default', title: 'HouseFamily'},
  formatDetection: {telephone: false},
};
export const viewport: Viewport = {themeColor: '#F8F7F4', width: 'device-width', initialScale: 1, viewportFit: 'cover'};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" className={geist.variable}><body>{children}</body></html>;
}
