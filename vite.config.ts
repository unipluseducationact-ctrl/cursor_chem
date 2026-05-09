import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build can be embedded (iframe) under any path.
  // This is required for Uni+ S3 CH05 to serve it from `public/worksheets/cursor-chem/`.
  base: './',
  plugins: [react()],
})
