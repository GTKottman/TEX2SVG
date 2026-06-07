import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "app",
  build: {
    outDir: resolve(__dirname, "dist-app"),
    emptyOutDir: true,
  },
});
