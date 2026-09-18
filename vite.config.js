import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

export default defineConfig({
  server: {
    https: process.env.LITA_HTTPS_KEY && process.env.LITA_HTTPS_CERT
      ? {
          key: readFileSync(process.env.LITA_HTTPS_KEY),
          cert: readFileSync(process.env.LITA_HTTPS_CERT),
        }
      : undefined,
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
});
