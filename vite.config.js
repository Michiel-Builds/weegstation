import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react({
    jsxRuntime: "automatic"
  })],
  build: {
    sourcemap: false,
    outDir: "dist",
    emptyOutDir: false,
  },
  server: {
    port: 5174,
  },
});
