import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function git(cmd: string, fallback: string): string {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return fallback
  }
}

// Versione: major fisso (da alzare a mano per i rilasci grossi) + numero di
// commit come minor → si incrementa da solo a ogni push.
const APP_MAJOR = 1
const APP_VERSION = `${APP_MAJOR}.${git('rev-list --count HEAD', '0')}`
const APP_SHA = git('rev-parse --short HEAD', 'dev')
const APP_BUILD_DATE = new Date().toISOString().slice(0, 10)

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_SHA__: JSON.stringify(APP_SHA),
    __APP_BUILD_DATE__: JSON.stringify(APP_BUILD_DATE),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: "Diario dell'emicrania",
        short_name: 'Emicrania',
        description: 'Diario personale del mal di testa',
        lang: 'it',
        theme_color: '#15151d',
        background_color: '#15151d',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
