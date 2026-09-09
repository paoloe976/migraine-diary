import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Diario dell'emicrania",
        short_name: 'Emicrania',
        description: 'Diario personale del mal di testa',
        lang: 'it',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // TODO: aggiungere le icone in public/ e referenziarle qui
        icons: [],
      },
    }),
  ],
})
