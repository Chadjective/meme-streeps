import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    hmr: {
      // Use polling fallback for environments where WebSocket fails
      protocol: 'ws',
    },
  },
});
