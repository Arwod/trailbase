import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import eslint from "vite-plugin-eslint";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [solid({ ssr: true }), tailwindcss(), eslint()],
  ssr: {
    noExternal: true,
  },
});
