import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages: site nằm ở /phuongntk/tra-cuu/ (đổi base nếu đổi đường dẫn)
export default defineConfig({
  base: '/phuongntk/tra-cuu/',
  plugins: [react(), tailwindcss()],
});
