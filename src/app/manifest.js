// Web App Manifest — Next.js bunu /manifest.webmanifest olarak sunar ve
// otomatik <link rel="manifest"> ekler. Uygulamayı "kurulabilir" yapar.
export default function manifest() {
  return {
    name: 'Velora',
    short_name: 'Velora',
    description: 'Rusça kelime kartları, yatırım ve görev takibi',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#4da8da',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
