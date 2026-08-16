import { Inter } from 'next/font/google';
import AppShell from '@/components/AppShell';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

// next/font fontu build sırasında indirip kendi sunucumuzdan sunar: render'ı
// bloklayan Google Fonts isteği ve yazı tipi sıçraması (FOUT) ortadan kalkar.
const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata = {
  title: 'Velora',
  description: 'Rusça/Almanca kelime kartları, yatırım ve görev takibi',
  applicationName: 'Velora',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Velora' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#131211' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
