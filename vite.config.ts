import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@analyzer': path.resolve(__dirname, './src/analyzer'),
      '@analyzer-components': path.resolve(__dirname, './src/analyzer/components'),
      '@analyzer-redux': path.resolve(__dirname, './src/analyzer/redux'),
      '@analyzer-hooks': path.resolve(__dirname, './src/analyzer/hooks'),
      '@analyzer-enums': path.resolve(__dirname, './src/analyzer/enums.ts'),
      '@analyzer-helpers': path.resolve(__dirname, './src/analyzer/helpers.ts'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/Gemini.png', 'apple-icon-180.png', 'favicon-196.png'],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'MySwing',
        short_name: 'MySwing',
        description: '動画のアップロード・再生・管理',
        theme_color: '#f5f5f5',
        background_color: '#f5f5f5',
        display: 'standalone',
        start_url: '/',
        lang: 'ja',
        icons: [
          { src: '/icons/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
        ]
      }
    })
  ],
})
