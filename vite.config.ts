/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Configuración de Vite (servidor de desarrollo y build) y de Vitest (pruebas).
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Alias "@" -> carpeta src, para importar como "@/utils/format"
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
