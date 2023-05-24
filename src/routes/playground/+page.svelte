<script lang="ts">
  import EmptyState from "../../examples/empty-state.svelte";
  import AsyncDataFetching from "../../examples/async-data-fetching.svelte";
</script>

<div>
  <EmptyState />
  <AsyncDataFetching />
</div>

<style>
  div {
    justify-content: center;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 150px 100px;
  }
</style>
