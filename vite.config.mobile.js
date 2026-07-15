import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react({ jsxRuntime: "automatic" })],
  build: {
    sourcemap: false,
    outDir: "dist-mobile",
    emptyOutDir: true,
    rollupOptions: {
      input: "index-mobile.html",
    },
  },
  server: {
    port: 5175,
  },
});
