import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
            if (id.includes('recharts')) return 'charts'
            if (id.includes('@tanstack')) return 'query'
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'ui'
            if (id.includes('zustand')) return 'store'
            if (id.includes('supabase')) return 'supabase'
            if (id.includes('xlsx') || id.includes('jspdf')) return 'export'
            return 'vendor-misc'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },
})
