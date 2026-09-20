import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { readFileSync } from "node:fs";

const customHttps = process.env.LITA_HTTPS_KEY && process.env.LITA_HTTPS_CERT
  ? {
      key: readFileSync(process.env.LITA_HTTPS_KEY),
      cert: readFileSync(process.env.LITA_HTTPS_CERT),
    }
  : undefined;

export default defineConfig({
  plugins: customHttps ? [] : [basicSsl()],
  server: {
    https: customHttps,
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
});
