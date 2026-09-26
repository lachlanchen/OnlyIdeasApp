import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], define: { global: 'globalThis' }, server: { proxy: { '/api': 'http://127.0.0.1:18628', '/content': 'http://127.0.0.1:18628' } }, build: { chunkSizeWarningLimit: 1600 } })
