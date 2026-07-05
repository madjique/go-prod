import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const APP_BASE = '/go-prod/'
const THEME_COLOR = '#FB923C'

export default defineConfig({
  base: APP_BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: null,
      registerType: 'autoUpdate',
      manifest: {
        name: 'Go Prod',
        short_name: 'Go Prod',
        description: 'A productivity PWA for planning days, weeks, and AI-assisted focus.',
        theme_color: THEME_COLOR,
        background_color: '#ffffff',
        display: 'standalone',
        scope: APP_BASE,
        start_url: APP_BASE,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
})
