import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

// ==============================================================================
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Code splitting por rutas
// - Chunk size optimization
// - Gzip y Brotli compression
// - Bundle analyzer
// - CSS code splitting
// - Tree shaking optimizado
// - Source maps solo en development
// ==============================================================================

export default defineConfig({
  plugins: [
    react(),

    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Solo comprimir archivos > 1KB
    }),

    // Brotli compression (mejor ratio)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),

    // Bundle analyzer (solo en build)
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }) as any,
  ],

  server: {
    port: 5173,
    host: true,
  },

  // Build optimizations
  build: {
    // Source maps solo en development
    sourcemap: false,

    // Chunk size warnings
    chunkSizeWarningLimit: 500, // KB

    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunking para mejor cache
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'ui-vendor': ['lucide-react'],
        },

        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }

          return `assets/[name]-[hash][extname]`;
        },

        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Minify options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },

    // CSS code splitting
    cssCodeSplit: true,

    // Assets inline limit (< 4KB serán inlined como base64)
    assetsInlineLimit: 4096,
  },

  // Optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
