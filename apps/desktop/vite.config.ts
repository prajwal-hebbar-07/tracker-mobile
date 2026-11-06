import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tauri loads the dev server from a fixed port and the built files from dist/.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { target: 'safari17', outDir: 'dist' },
})
