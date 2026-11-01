import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { outDir: "out/main" } },
  preload: { plugins: [externalizeDepsPlugin()], build: { outDir: "out/preload" } },
  renderer: {
    root: "src/renderer",
    resolve: { alias: { "@": path.resolve(__dirname, "src/renderer/src") } },
    plugins: [react(), tailwindcss()],
    base: "./",
    build: { outDir: "out/renderer", emptyOutDir: true }
  }
});
