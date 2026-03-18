import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/annotation-parser/',
  build: {
    rollupOptions: {
      output: {
        // Prevent filenames starting with underscore (GitHub Pages/Jekyll issue)
        sanitizeFileName: (name) => {
          // Remove leading underscore and ensure valid filename
          const sanitized = name.replace(/^_/, '').replace(/[^a-zA-Z0-9.-]/g, '-')
          return sanitized || 'chunk'
        },
      },
    },
  },
})
