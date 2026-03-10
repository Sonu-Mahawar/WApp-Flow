import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/webhooks": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    target: "es2015",
    // Split large bundles into smaller chunks for faster page load
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
          "vendor-ui": ["lucide-react"],
          "vendor-utils": ["axios", "zustand", "react-hot-toast"],
        },
      },
    },
  },
});
