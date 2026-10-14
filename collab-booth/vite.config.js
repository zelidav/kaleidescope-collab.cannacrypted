import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const mpVersion = JSON.parse(readFileSync('node_modules/@mediapipe/tasks-vision/package.json', 'utf8')).version;
const api = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  define: { __MP_VERSION__: JSON.stringify(mpVersion) },
  server: {
    host: true,
    proxy: { '/api': api, '/media': api, '/p/': api },
  },
});
