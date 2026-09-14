import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

const frontendRoot = __dirname;
const projectRoot = path.resolve(frontendRoot, "..");

export default defineConfig({
  root: frontendRoot,
  envDir: frontendRoot,
  // Critical for Electron so built assets resolve from the app folder.
  base: "./",
  plugins: [
    react(),
    electron({
      main: {
        entry: path.resolve(projectRoot, "electron", "main.ts"),
        vite: {
          build: {
            outDir: path.resolve(projectRoot, "dist-electron"),
            emptyOutDir: true,
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(frontendRoot, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "dist"),
    emptyOutDir: true,
  },
});
