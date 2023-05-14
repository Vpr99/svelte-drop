import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import icons from "unplugin-icons/vite";
import kitDocs from "@svelteness/kit-docs/node";

export default defineConfig({
  plugins: [
    // @ts-expect-error type mismatch with unplugin-icons' vite export.
    icons({ compiler: "svelte" }),
    /**
     * There's something weird in the kitDocs plugin that causes vitest
     * to run in an infinite loop. Disable it when running tests.
     * @see https://vitest.dev/guide/#configuring-vitest
     */
    !process.env.VITEST && kitDocs(),
    sveltekit(),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
