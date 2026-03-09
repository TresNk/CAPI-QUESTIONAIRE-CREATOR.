/**
 * Simplified Vite config for local development on Node.js < 20.
 * The main vite.config.ts requires Node.js v20+ (Cloudflare / Mocha plugins).
 * Run with: npx vite --config vite.dev.config.ts
 */
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
