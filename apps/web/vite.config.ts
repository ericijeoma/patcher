import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true, // Highly recommended for keeping bundle size small
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
  },
});
