// Lint do backend: aponta erros prováveis (variável não usada, promessa
// esquecida, any implícito...) antes de o código rodar. A FORMATAÇÃO
// (aspas, espaços, quebras de linha) é trabalho do Prettier, não daqui.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Parâmetros com "_" na frente são ignorados de propósito (ex.: o
      // `_next` obrigatório na assinatura do errorHandler do Express).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
