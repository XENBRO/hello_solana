const { defineConfig } = require("vite");

module.exports = defineConfig({
  root: "public",
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});