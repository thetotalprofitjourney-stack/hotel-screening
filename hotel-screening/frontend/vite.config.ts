import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      // Permitir que la aplicación se incruste en iframes desde cualquier origen
      // En producción, deberías configurar estos headers en tu servidor web (nginx, etc.)
      'Content-Security-Policy': "frame-ancestors *",
    }
  }
})
