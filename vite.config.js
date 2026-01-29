import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Use a fixed port so the dev server URL is predictable.
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 5174,
    strictPort: true
  }
})
