<script lang="ts">
  import type { NavbarConfig } from "@svelteness/kit-docs";
  import "@svelteness/kit-docs/client/polyfills/index.js";
  import "@svelteness/kit-docs/client/styles/normalize.css";
  import "@svelteness/kit-docs/client/styles/theme.css";
  import "@svelteness/kit-docs/client/styles/vars.css";
  import { page } from "$app/stores";
  import {
    Button,
    KitDocs,
    KitDocsLayout,
    createSidebarContext,
  } from "@svelteness/kit-docs";

  export let data;

  $: ({ meta, sidebar } = data);

  const navbar: NavbarConfig = {
    links: [{ title: "Documentation", slug: "/docs", match: /\/docs/ }],
  };

  const { activeCategory } = createSidebarContext(sidebar);

  $: category = $activeCategory ? `${$activeCategory}: ` : "";
  $: title = meta ? `${category}${meta.title} | KitDocs` : null;
  $: description = meta?.description;
</script>

<svelte:head>
  {#key $page.url.pathname}
    {#if title}
      <title>{title}</title>
    {/if}
    {#if description}
      <meta name="description" content={description} />
    {/if}
  {/key}
</svelte:head>

<KitDocs {meta}>
  <KitDocsLayout {navbar} {sidebar}>
    <div class="logo" slot="navbar-left">
      <Button href="/">Svelte ⬇️</Button>
    </div>

    <slot />
  </KitDocsLayout>
</KitDocs>

<style>
  :global(:root) {
    --kd-color-brand-rgb: 233, 127, 6;
  }

  :global(:root.dark) {
    --kd-color-brand-rgb: 213, 149, 76;
  }

  .logo :global(a) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo :global(svg) {
    height: 36px;
    overflow: hidden;
  }
</style>
