import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: 'hidden',
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
    __PROJECT_ID__: JSON.stringify(process.env.PROJECT_ID || '@monitor/web'),
  },
});
