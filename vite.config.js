import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        planner: resolve(__dirname, "planner/index.html"),
        nanjing: resolve(__dirname, "guides/nanjing/index.html"),
        generated: resolve(__dirname, "guides/generated/index.html"),
      },
    },
  },
});
