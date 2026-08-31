import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'راوی',
        short_name: 'راوی',
        description: 'روایت زنده‌ی رویدادها',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#15159C',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // درخواست‌های /api رو کش نکن — همیشه باید دیتای تازه بیاد
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
});
