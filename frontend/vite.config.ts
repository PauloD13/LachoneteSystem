/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, o Vite (porta 5173) repassa ao backend (3000)
    // tudo o que começa com /api. Para o navegador é um servidor só, como
    // no deploy, em que o próprio backend serve as telas.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    // Testes unitários (npm test): arquivos *.test.ts ao lado do código.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
