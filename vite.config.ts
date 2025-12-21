import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Clean, minimal Vite configuration for clean architecture
export default defineConfig({
  plugins: [react()],
  
  // Simple build configuration
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Simple chunk splitting
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@mui/material') || id.includes('@mui/icons-material')) {
              return 'mui-vendor';
            }
            if (id.includes('zustand') || id.includes('axios')) {
              return 'vendor';
            }
          }
        }
      }
    }
  },
  
  // Development server
  server: {
    port: 5175,
    proxy: {
      // Proxy API requests to avoid CORS
      '/api/tranzy': {
        target: 'https://api.tranzy.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tranzy/, '')
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'axios', '@mui/material']
  }
})