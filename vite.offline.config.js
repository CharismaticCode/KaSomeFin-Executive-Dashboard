// Builds the whole dashboard into ONE html file that opens straight from disk
// (double-click), without Vercel: `npm run build:offline` → dist-offline/index.html
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: "dist-offline", emptyOutDir: true },
});
