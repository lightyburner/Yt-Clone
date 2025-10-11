import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    // Only set production API URL if explicitly provided
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || (process.env.NODE_ENV === 'production' ? 'https://yt-clone-il3g.onrender.com' : undefined)
    )
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
})
