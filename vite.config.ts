import { defineConfig } from 'vite';

// GitHub Pages serves the site at /<repo>/. The workflow sets
// VITE_BASE_PATH=/meme-streeps/ for production builds so built asset URLs
// include that prefix. Locally (dev, preview, other hosts) we stay at '/'.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  server: {
    hmr: {
      // Use polling fallback for environments where WebSocket fails
      protocol: 'ws',
    },
  },
});
