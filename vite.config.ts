import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Detta är den magiska raden som gör att dina nuvarande Vercel-nycklar fungerar:
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
