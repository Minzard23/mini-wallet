import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Saat development, request ke /api diteruskan ke backend (port 3000).
    // Browser menganggap frontend & backend satu alamat -> cookie httpOnly aman & lancar.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
