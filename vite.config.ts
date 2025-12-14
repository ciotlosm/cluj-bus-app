import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Ensure single React instance
      'react': 'react',
      'react-dom': 'react-dom'
    }
  },
  build: {
    // Optimize bundle size
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
        sw: './public/sw.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'sw' ? 'sw.js' : '[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Simplified code splitting - let Vite handle it automatically
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('zustand') || id.includes('axios')) {
              return 'vendor';
            }
          }
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Optimize for production
    reportCompressedSize: false
  },
  // Development server configuration
  server: {
    hmr: {
      port: 5176, // Use different port for HMR WebSocket
    },
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    cors: true,
    // Prevent caching in development
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      // Proxy API requests to avoid CORS issues
      '/api/tranzy': {
        target: 'https://api.tranzy.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tranzy/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Log headers being sent
            console.log('Proxying request:', req.method, req.url, '→', proxyReq.getHeader('host') + proxyReq.path);
            console.log('Headers:', {
              'Authorization': proxyReq.getHeader('Authorization'),
              'X-API-Key': proxyReq.getHeader('X-API-Key'),
              'X-Agency-Id': proxyReq.getHeader('X-Agency-Id'),
              'Content-Type': proxyReq.getHeader('Content-Type')
            });
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Proxy response:', proxyRes.statusCode, req.url);
            if (proxyRes.statusCode === 403) {
              console.log('403 Error - Authentication failed. Check API key.');
            }
          });
        },
      },

    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'axios'],
    exclude: ['fast-check'], // Exclude test dependencies from optimization
  },
  
  // Development-specific settings
  define: {
    // Ensure proper development mode
    __DEV__: JSON.stringify(true),
  },
  
  // CSS handling
  css: {
    devSourcemap: true, // Enable CSS source maps in development
  },
  
  // Clear cache on startup in development
  clearScreen: false, // Keep terminal history visible
})
