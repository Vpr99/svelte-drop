import adapter from "@sveltejs/adapter-vercel";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".md"],

  kit: { adapter: adapter() },
  package: {
    dir: "client",
    emitTypes: true,
  },
};

export default config;
