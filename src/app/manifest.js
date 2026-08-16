// Web App Manifest — Next.js bunu /manifest.webmanifest olarak sunar ve
// otomatik <link rel="manifest"> ekler. Uygulamayı "kurulabilir" yapar.
export default function manifest() {
  return {
    name: 'Velora',
    short_name: 'Velora',
    description: 'Rusça/Almanca kelime kartları, yatırım ve görev takibi',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#131211',
    theme_color: '#4a3aa7',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
