import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import icons from "unplugin-icons/vite";
import kitDocs from "@svelteness/kit-docs/node";

export default defineConfig({
  plugins: [
    // @ts-expect-error type mismatch with unplugin-icons' vite export.
    icons({ compiler: "svelte" }),
    kitDocs(),
    sveltekit(),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
