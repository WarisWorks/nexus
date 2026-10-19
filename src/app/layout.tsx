import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://nexus-interactive-universe.warisruzi.chatgpt.site'),
  title: 'NEXUS — Beyond the Interface',
  description: 'An interactive journey through chrome, light, and impossible worlds. Six connected 3D environments. Nothing is static.',
  openGraph: { title: 'NEXUS — Beyond the Interface', description: 'A new dimension of digital experience.', type: 'website' },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#08090b', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
