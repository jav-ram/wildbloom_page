<script lang="ts">
  import { onMount } from 'svelte';
  import { CREATURES } from '../data/below-the-light';
  import { url } from '../lib/url';

  let q = $state('');
  let layer = $state<number | null>(null);

  // Open with ?q=… to prefill the search, or ?layer=N to list one layer.
  onMount(() => {
    const p = new URLSearchParams(location.search);
    q = p.get('q') ?? '';
    const l = Number(p.get('layer'));
    layer = Number.isInteger(l) && l > 0 ? l : null;
  });

  const needle = $derived(q.trim().toLowerCase());
  const shown = $derived(
    CREATURES.filter(
      (c) =>
        (layer === null || c.layer === layer) &&
        (!needle || [c.name, c.habitat, c.text].some((s) => s.toLowerCase().includes(needle))),
    ),
  );
  const total = $derived(CREATURES.filter((c) => layer === null || c.layer === layer).length);
</script>

<div class="search-row">
  <label class="label" for="creature-search">Search creatures</label>
  <input id="creature-search" type="search" placeholder="Name, habitat or description" autocomplete="off" bind:value={q} />
  <p class="caption muted" aria-live="polite" style="margin: 0">
    {#if layer !== null}Layer {layer} ·{" "}{/if}Showing {shown.length} of {total} {total === 1 ? 'creature' : 'creatures'}
    {#if layer !== null}· <a class="ws-link" href="?" onclick={(e) => { e.preventDefault(); layer = null; }}>show all layers</a>{/if}
  </p>
</div>

{#if shown.length}
  <div class="creature-list" style="margin-top: 24px">
    {#each shown as c (c.name)}
      <article class="creature creature--link">
        <div class="creature__art caption" aria-hidden="true">[CREATURE ART]</div>
        <div class="creature__body">
          <h2 class="sub-heading"><a class="creature__link" href={url(`below-the-light/creatures/${c.slug}/`)}>{c.name}</a></h2>
          <p class="caption muted">Layer {c.layer} · Habitat: {c.habitat}</p>
          <p class="rules-text">{c.text}</p>
        </div>
      </article>
    {/each}
  </div>
{:else}
  <div class="empty" style="margin-top: 24px">
    <p class="body" style="margin: 0 0 16px">No creature matches “{q}”.</p>
    <button type="button" class="ws-btn ws-btn--secondary ws-btn--sm control" onclick={() => { q = ''; layer = null; }}>Show all creatures</button>
  </div>
{/if}
