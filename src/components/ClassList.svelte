<script lang="ts">
  import type { ClassEntry } from '../data/classes';

  let { classes, base }: { classes: ClassEntry[]; base: string } = $props();

  const ROLES = ['All', 'Support', 'Control', 'Striker', 'Explorer'];
  const STATUSES = ['All', 'Released', 'Playtest', 'Coming soon'];
  const badge: Record<string, string> = {
    Released: 'ws-badge ws-badge--released label',
    Playtest: 'ws-badge ws-badge--dev label',
    'Coming soon': 'ws-badge ws-badge--soon label',
  };

  let role = $state('All');
  let status = $state('All');

  const shown = $derived(
    classes.filter(
      (c) => (role === 'All' || c.roles.includes(role)) && (status === 'All' || c.status === status),
    ),
  );
  const reset = () => {
    role = 'All';
    status = 'All';
  };
</script>

<section aria-labelledby="filter-title">
  <h2 id="filter-title" class="skip">Filter classes</h2>
  <div class="filters">
    <div class="filter-row">
      <p class="filter-row__label label">Role</p>
      <div class="chips" role="group" aria-label="Filter by role">
        {#each ROLES as o}
          <button type="button" class="chip control" aria-pressed={role === o} onclick={() => (role = o)}>{o}</button>
        {/each}
      </div>
    </div>
    <div class="filter-row">
      <p class="filter-row__label label">Status</p>
      <div class="chips" role="group" aria-label="Filter by status">
        {#each STATUSES as o}
          <button type="button" class="chip control" aria-pressed={status === o} onclick={() => (status = o)}>{o}</button>
        {/each}
      </div>
    </div>
  </div>
  <p class="result-line caption" aria-live="polite">Showing {shown.length} of {classes.length} {classes.length === 1 ? 'class' : 'classes'}</p>
</section>

<section aria-label="Class list" style="padding-bottom: 80px">
  {#if shown.length}
    <div class="ws-cards">
      {#each shown as k (k.slug)}
        <article class={k.status === 'Coming soon' ? 'ws-card ws-card--soon' : 'ws-card'}>
          <div class="ws-card__art ws-card__art--sm" aria-hidden="true">
            <span class="ws-orn ws-orn--bloom ws-orn--lg" style="color: var(--band-gold)"></span>
          </div>
          <div class="ws-card__body">
            <div><span class={badge[k.status]}>{k.status}</span></div>
            <h3 class="ws-card__title section-heading">{k.title}</h3>
            <p class="ws-card__desc rules-text">{k.tagline}</p>
            <dl class="class-facts">
              <div><dt class="label">Primary ability</dt><dd class="table-text">{k.ability}</dd></div>
              <div><dt class="label">Hit die</dt><dd class="table-text">{k.hitDie}</dd></div>
            </dl>
            <ul class="ws-tags" aria-label="Roles">
              {#each k.roles as r}<li class="ws-tag ws-tag--sage label">{r}</li>{/each}
            </ul>
            <div class="ws-card__foot">
              {#if k.status !== 'Coming soon'}
                <a class="ws-btn ws-btn--sm control" href={`${base}/classes/${k.slug}/`}>Read the class</a>
                {#if k.simulator}<a class="ws-btn ws-btn--secondary ws-btn--sm control" href={`${base}/simulator/?class=${k.slug}`}>Simulate</a>{/if}
              {:else}
                <button class="ws-btn ws-btn--sm control" type="button" disabled>Coming soon</button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="empty">
      <p class="body" style="margin: 0 0 16px">No class matches both filters yet.</p>
      <button type="button" class="ws-btn ws-btn--secondary ws-btn--sm control" onclick={reset}>Show all classes</button>
    </div>
  {/if}
</section>
