import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// L'application est publiée sur GitHub Pages à l'adresse https://<compte>.github.io/quanto/
export default defineConfig({
  base: '/quanto/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Quanto — Vos recettes à la bonne mesure',
        short_name: 'Quanto',
        description: 'Vos recettes de cuisine et de pâtisserie, recalculées pour le bon nombre de personnes ou le bon moule.',
        lang: 'fr',
        start_url: '/quanto/',
        scope: '/quanto/',
        display: 'standalone',
        theme_color: '#A84F2D',
        background_color: '#FBF7F0',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Seules les polices des alphabets latins sont gardées hors ligne (le reste est inutile en français).
        globPatterns: ['**/*.{js,css,html,ico,png,svg}', '**/*latin*.woff2'],
      },
    }),
  ],
})
