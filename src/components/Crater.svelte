<script lang="ts">
  import { url } from '../lib/url';
  import { ERAS, CHARTED, KNOWLEDGE_LABEL, RELICS, RARITIES, tabsFor, type Knowledge } from '../data/crater';

  let eraId = $state(2);
  let mapFrame: HTMLIFrameElement | undefined = $state();

  // The island map is a same-origin page: size the frame to its content so the page has one scrollbar.
  function fitMap() {
    const doc = mapFrame?.contentDocument;
    if (!doc) return;
    const size = () => { if (mapFrame) mapFrame.style.height = Math.ceil(doc.body.getBoundingClientRect().height) + 'px'; };
    size();
    new ResizeObserver(size).observe(doc.body);
  }
  const mapTheme = () => (typeof document !== 'undefined' && document.querySelector('.site')?.getAttribute('data-theme')) || 'dark';
  let layer = $state(1);
  let tabId = $state('overview');
  let rarity = $state('All');

  const era = $derived(ERAS[eraId - 1]);
  const tabs = $derived(tabsFor(era));
  const tab = $derived(tabs.find((t) => t.id === tabId) ?? tabs[0]);

  const know = (n: number, e = eraId): Knowledge => {
    const [c, p, r] = CHARTED[e];
    return n <= c ? 'charted' : n <= p ? 'partial' : n <= r ? 'rumored' : 'uncharted';
  };
  const nameOf = (n: number, k: Knowledge) => (k === 'uncharted' ? 'Uncharted' : k === 'rumored' ? '[RUMORED NAME]' : `[LAYER ${n} NAME]`);
  const themeOf = (k: Knowledge) =>
    k === 'charted' ? '[THEME]' : k === 'partial' ? '[THEME] · partly charted' : k === 'rumored' ? 'Only rumors reach the rim' : 'No map has come back';
  const shade = (n: number) => 100 - (n - 1) * 6;

  const layers = $derived(
    Array.from({ length: 13 }, (_, i) => {
      const n = i + 1;
      const k = know(n);
      return { n, k, name: nameOf(n, k), theme: themeOf(k) };
    }),
  );
  const knownCount = $derived(layers.filter((l) => l.k === 'charted').length);
  const k = $derived(know(layer));
  const sel = $derived({ n: layer, k, name: nameOf(layer, k), theme: themeOf(k) });

  const catalogued = $derived(RELICS.filter((r) => ['charted', 'partial'].includes(know(r.layer))));
  const relics = $derived(catalogued.filter((r) => rarity === 'All' || r.rarity === rarity));
  const here = $derived(catalogued.filter((r) => r.layer === layer));

  const creatures = $derived.by(() => {
    const named = k === 'charted' ? 3 : k === 'partial' ? 1 : 0;
    const unnamed = k === 'charted' ? 1 : 2;
    return [
      ...Array.from({ length: named }, () => ({ unknown: false, art: '[CREATURE ART]', title: '[CREATURE NAME]', type: '[SIZE] [TYPE]', desc: '[PLAYER-SAFE DESCRIPTION: what delvers know and how to recognize it.]' })),
      ...Array.from({ length: unnamed }, () => ({ unknown: true, art: '?', title: 'Unnamed creature', type: 'Sighted, not yet catalogued', desc: '[WHAT DELVERS REPORT SEEING]' })),
    ];
  });
  const overview = $derived(
    k === 'charted' ? `[LAYER ${layer} OVERVIEW: what the layer looks like, how it feels to travel, and what delvers come here for.]`
    : k === 'partial' ? '[PARTIAL OVERVIEW: what the few delvers who returned describe. Large parts are unmapped.]'
    : '[RUMOR: what is whispered on the rim about this layer. Nothing is confirmed.]',
  );
  const descentLabel = $derived(layer === 13 ? 'The bottom' : `Descending to layer ${layer + 1}`);
  const descent = $derived(
    layer === 13 ? '[WHAT IS KNOWN ON THE RIM ABOUT THE BOTTOM, PLAYER-SAFE ONLY.]'
    : k === 'charted' ? '[HOW DELVERS DESCEND: the usual route, gear, time and hazards on the way to the next layer.]'
    : k === 'partial' ? '[WHAT DELVERS BELIEVE ABOUT THE WAY DOWN: routes tried, few confirmed.]'
    : 'No reliable route down is known in this era. [RUMORED ROUTE, IF ANY.]',
  );

  const RIMS = [[40,180,27,2,1],[65,167,25,1.5,.94],[90,154,23,1.5,.88],[115,141,21,1.5,.82],[140,128,19,1.5,.76],[165,115,17,1.5,.7],[190,102,15,1.5,.64],[215,89,13,1.5,.58],[240,76,11,1.5,.52],[265,63,9,1.5,.46],[290,50,8,1.5,.4],[315,37,6,1.5,.34],[340,24,4,1.5,.28]];
</script>

<main>
  <!-- HERO -->
  <div class="wrap">
    <section class="hero" aria-labelledby="crater-title" style="padding-bottom: 48px">
      <div>
        <p class="ws-kicker label">Setting hub · D&amp;D 5e · Building now</p>
        <h1 id="crater-title" class="page-title">The Crater</h1>
        <p class="lore-text lede" style="color: var(--ink-muted)">{era.num} · {era.name}. {era.summary}</p>
        <p class="body lede">{era.intro}</p>
        <ul class="jump control" aria-label="On this page">
          <li><a class="ws-link" href="#setting">The setting</a></li>
          {#if eraId === 1}<li><a class="ws-link" href="#island">The island</a></li>{/if}
          <li><a class="ws-link" href="#descent">The descent</a></li>
          <li><a class="ws-link" href="#relics">Relics</a></li>
          <li><a class="ws-link" href="#running">Running the Crater</a></li>
        </ul>
      </div>
      <figure class="crater-fig">
        <svg class="crater-svg" viewBox="0 0 400 380" aria-hidden="true">
          {#if era.lit}<ellipse class="halo" cx="200" cy="40" rx="60" ry="14"></ellipse>{/if}
          <path d="M20 40 L176 340 M380 40 L224 340" fill="none" stroke="var(--gold-soft)" stroke-width="1"></path>
          {#each RIMS as [cy, rx, ry, sw, op]}
            <ellipse class="rim" cx="200" cy={cy} rx={rx} ry={ry} stroke-width={sw} opacity={op}></ellipse>
          {/each}
          <line class={era.lit ? 'rod' : 'rod rod--out'} x1="200" y1="4" x2="200" y2="346"></line>
          {#if !era.lit}
            <ellipse class="new-crater" cx="44" cy="10" rx="26" ry="6"></ellipse>
            <ellipse class="new-crater" cx="44" cy="10" rx="12" ry="3"></ellipse>
            <ellipse class="new-crater" cx="360" cy="12" rx="22" ry="5"></ellipse>
            <ellipse class="new-crater" cx="360" cy="12" rx="10" ry="2.5"></ellipse>
          {/if}
        </svg>
        <figcaption class="caption">
          {era.lit ? 'Thirteen layers, and a light seen across the world.' : 'Thirteen layers. The light has gone out, and two new craters have appeared.'}
        </figcaption>
      </figure>
    </section>
  </div>

  <!-- ERA BAR -->
  <div class="era-bar">
    <div class="wrap era-bar__inner">
      <p class="era-bar__label label">When you are</p>
      <div class="era-group" role="group" aria-label="Choose an era">
        {#each ERAS as e}
          <button type="button" class="era-btn" aria-pressed={e.id === eraId} onclick={() => (eraId = e.id)}>
            <span class="era-btn__num label">{e.num}</span><span class="era-btn__name">{e.name}</span>
          </button>
        {/each}
      </div>
      <div class="light-status">
        <span class={era.lit ? 'light-dot' : 'light-dot light-dot--out'} aria-hidden="true"></span>
        <p class="label">{era.lit ? 'The light shines' : 'The light has gone out'}</p>
      </div>
    </div>
  </div>

  <!-- SETTING -->
  <section id="setting" class="section" aria-labelledby="setting-title">
    <div class="wrap">
      <div class="sec-head">
        <div><p class="ws-kicker label">Player-safe lore</p><h2 id="setting-title" class="chapter-heading ws-h">The Setting</h2></div>
      </div>
      <div class="tabs" role="tablist" aria-label="Setting topics">
        {#each tabs as t}
          <button type="button" role="tab" class="tab control" aria-selected={t.id === tab.id} onclick={() => (tabId = t.id)}>{t.label}</button>
        {/each}
      </div>
      <div role="tabpanel" aria-label={tab.label}>
        <p class="era-note caption"><span class={era.lit ? 'light-dot' : 'light-dot light-dot--out'} aria-hidden="true"></span>Seen from {era.num} · {era.name}</p>
        <div class="topic-grid">
          {#each tab.topics as tp}
            <article class="topic"><h3 class="sub-heading">{tp.title}</h3><p class="body">{tp.text}</p></article>
          {/each}
        </div>
        {#if tab.id === 'religion'}
          <aside class="ws-callout ws-callout--lore"><p class="ws-callout__label label">Lore</p><p class="lore-text">“[A LINE OF THE CULT’S PRAYER OR SAYING]” — [SOURCE]</p></aside>
        {/if}
      </div>
    </div>
  </section>

  <!-- ISLAND (era 1 only) -->
  {#if eraId === 1}
    <section id="island" class="section section--sunken" aria-labelledby="island-title">
      <div class="wrap">
        <div class="sec-head">
          <div><p class="ws-kicker label">Interactive map</p><h2 id="island-title" class="chapter-heading ws-h">The Island</h2></div>
          <p class="rules-text muted" style="max-width: 46ch">Walk a party across the island under fog of war, hour by hour, until they find the way to the rim. Switch to Player view to share the screen.</p>
        </div>
        <iframe
          bind:this={mapFrame}
          class="island-frame"
          title="Interactive island map"
          src={url(`island-map.html?theme=${mapTheme()}`)}
          onload={fitMap}
          loading="lazy"
        ></iframe>
      </div>
    </section>
  {/if}

  <!-- DESCENT -->
  <section id="descent" class="section section--sunken" aria-labelledby="descent-title">
    <div class="wrap">
      <div class="sec-head">
        <div><p class="ws-kicker label">Where you are</p><h2 id="descent-title" class="chapter-heading ws-h">The Descent</h2></div>
        <p class="rules-text muted" style="max-width: 46ch">Thirteen layers. The deeper you go, the less is known. What is charted depends on the era.</p>
      </div>
      <div class="descent">
        <nav class={era.lit ? 'gauge' : 'gauge gauge--out'} aria-label="Layers of the Crater">
          <div class="gauge__head"><p class="label">Depth gauge</p><p class="caption muted">{knownCount} of 13 charted</p></div>
          <ol class="gauge__list">
            {#each layers as l}
              <li>
                <button
                  type="button"
                  class={'layer-btn' + (l.k === 'uncharted' ? ' is-uncharted' : '')}
                  style={`background-color: color-mix(in srgb, var(--surface-raised) ${shade(l.n)}%, #000)`}
                  aria-current={l.n === layer ? 'true' : 'false'}
                  aria-label={`Layer ${l.n}, ${KNOWLEDGE_LABEL[l.k]}`}
                  onclick={() => (layer = l.n)}
                >
                  <span class="layer-num">{l.n}</span>
                  <span class="rail" aria-hidden="true"><span class={`node node--${l.k}`}></span></span>
                  <span class="layer-text"><span class="layer-name">{l.name}</span><span class="layer-theme">{l.theme}</span></span>
                  <span class={`know know--${l.k}`}>{KNOWLEDGE_LABEL[l.k]}</span>
                </button>
              </li>
            {/each}
          </ol>
          <p class="gauge__foot caption">{era.lit ? 'Gold line: the light of the Crater.' : 'The light has gone out. Six adventurers reached the bottom.'}</p>
        </nav>

        <div class="layer-panel" style={`background-color: color-mix(in srgb, var(--surface) ${shade(layer)}%, #000)`} aria-live="polite">
          <div class="layer-panel__head">
            <div>
              <p class="ws-kicker label">Layer {sel.n} of 13</p>
              <h3 class="chapter-heading">{sel.name}</h3>
              <p class="caption muted">{sel.theme}</p>
            </div>
            <span class={`know know--${sel.k}`}>{KNOWLEDGE_LABEL[sel.k]} in {era.num}</span>
          </div>

          {#if sel.k === 'uncharted'}
            <div class="uncharted-box">
              <p class="section-heading" style="color: var(--ink-muted)">Uncharted</p>
              <p class="body">No delver has returned from this layer with a map in {era.name}. Nothing about it is known on the rim.</p>
              <p class="caption muted">Try a later era, or climb back to a charted layer.</p>
            </div>
          {:else}
            <div>
              <section aria-label="Overview">
                <h4 class="sub-heading" style="color: var(--accent); margin: 0 0 8px">Overview</h4>
                <p class="body ws-prose">{overview}</p>
              </section>

              <section class="sub-sec" aria-label="Known creatures">
                <h4 class="sub-heading">Known Creatures</h4>
                <div class="creature-grid">
                  {#each creatures as c}
                    <article class={c.unknown ? 'creature creature--unknown' : 'creature'}>
                      <div class="creature__art caption" aria-hidden="true">{c.art}</div>
                      <div class="creature__body">
                        <h5 class="sub-heading">{c.title}</h5>
                        <p class="caption muted">{c.type}</p>
                        <p class="rules-text">{c.desc}</p>
                      </div>
                    </article>
                  {/each}
                </div>
              </section>

              <section class="sub-sec" aria-label="Relics found here">
                <h4 class="sub-heading">Relics Found Here</h4>
                {#if here.length}
                  <div class="relic-grid relic-grid--panel">
                    {#each here as r}
                      <article class="ws-relic ws-corners">
                        <h5 class="ws-relic__name sub-heading">{r.title}</h5>
                        <p class="ws-relic__type caption">{r.type}</p>
                        <ul class="ws-relic__meta"><li class="ws-badge ws-badge--plain label">{r.rarity}</li><li class="ws-tag label">{r.attuneText}</li></ul>
                        <p class="rules-text">{r.desc}</p>
                      </article>
                    {/each}
                  </div>
                {:else}
                  <p class="body muted">No relic from this layer has been catalogued in {era.name}.</p>
                {/if}
              </section>

              <section class="sub-sec" aria-label="Descending further">
                <aside class="ws-callout ws-callout--rules" style="max-width: none">
                  <p class="ws-callout__label label">{descentLabel}</p>
                  <p class="rules-text">{descent}</p>
                </aside>
              </section>
            </div>
          {/if}

          <div class="ws-btn-row" style="justify-content: space-between; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--gold-soft)">
            <button type="button" class="ws-btn ws-btn--secondary ws-btn--sm control" onclick={() => (layer = Math.max(1, layer - 1))} disabled={layer === 1}>Climb to layer {Math.max(1, layer - 1)}</button>
            <button type="button" class="ws-btn ws-btn--sm control" onclick={() => (layer = Math.min(13, layer + 1))} disabled={layer === 13}>Descend to layer {Math.min(13, layer + 1)}</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- RELICS -->
  <section id="relics" class="section" aria-labelledby="relics-title">
    <div class="wrap">
      <div class="sec-head">
        <div><p class="ws-kicker label">Catalogue</p><h2 id="relics-title" class="chapter-heading ws-h">Relics</h2></div>
        <p class="rules-text muted">{catalogued.length} relics catalogued as of {era.num}. Deeper finds appear as layers are charted.</p>
      </div>
      <div class="filters">
        <div class="filter-row">
          <p class="filter-row__label label">Rarity</p>
          <div class="chips" role="group" aria-label="Filter relics by rarity">
            {#each RARITIES as o}
              <button type="button" class="chip control" aria-pressed={rarity === o} onclick={() => (rarity = o)}>{o}</button>
            {/each}
          </div>
        </div>
      </div>
      <div class="relic-grid">
        {#each relics as r}
          <article class="ws-relic ws-corners">
            <h3 class="ws-relic__name section-heading">{r.title}</h3>
            <p class="ws-relic__type caption">{r.type}</p>
            <ul class="ws-relic__meta"><li class="ws-badge ws-badge--plain label">{r.rarity}</li><li class="ws-tag label">{r.attuneText}</li><li class="ws-tag ws-tag--sage label">Layer {r.layer}</li></ul>
            <p class="rules-text">{r.desc}</p>
            <p class="ws-relic__lore lore-text">“{r.lore}”</p>
          </article>
        {/each}
      </div>
      {#if relics.length === 0}
        <div class="empty"><p class="body" style="margin: 0">No catalogued relic of this rarity in {era.name}.</p></div>
      {/if}
    </div>
  </section>

  <!-- RUNNING THE CRATER -->
  <section id="running" class="section section--sunken" aria-labelledby="running-title">
    <div class="wrap">
      <div class="sec-head">
        <div><p class="ws-kicker label">For the table</p><h2 id="running-title" class="chapter-heading ws-h">Running the Crater</h2></div>
        <p class="rules-text muted" style="max-width: 46ch">Rules for the climb back up, and advice for running a descent. No spoilers: secrets stay in the book.</p>
      </div>
      <div class="ascent">
        <div>
          <aside class="ws-callout ws-callout--rules">
            <p class="ws-callout__label label">Rules · The Ascent</p>
            <p class="rules-text"><b>[RULE NAME].</b> [HOW CLIMBING BACK UP WORKS: when it applies, what the character rolls, and what happens on a failure.]</p>
          </aside>
          <aside class="ws-callout ws-callout--rules">
            <p class="ws-callout__label label">Rules · Proof of Depth</p>
            <p class="rules-text"><b>[RULE NAME].</b> [HOW A DELVER PROVES THE DEPTH THEY REACHED, IF THIS HAS A RULE.]</p>
          </aside>
          <h3 class="sub-heading" style="color: var(--accent); margin: 32px 0 8px">Tips for DMs</h3>
          <ul class="ws-bullets rules-text">
            <li>[TIP: pacing a descent across sessions]</li>
            <li>[TIP: choosing the era for your campaign]</li>
            <li>[TIP: making the ascent a real decision]</li>
            <li>[TIP: using patrons and guilds as hooks]</li>
          </ul>
        </div>
        <div class="ws-tablewrap" role="region" aria-label="Ascent by layer" tabindex="0">
          <table class="ws-table ws-table--fit">
            <caption class="section-heading">Ascent by Layer</caption>
            <thead><tr><th scope="col" class="table-head">Layer</th><th scope="col" class="table-head ws-left">Effect of ascending</th></tr></thead>
            <tbody>
              {#each ['1', '2', '3', '4', '5', '6'] as n}
                <tr><th scope="row" class="table-text">{n}</th><td class="table-text ws-left">[EFFECT]</td></tr>
              {/each}
              <tr><th scope="row" class="table-text">7–13</th><td class="table-text ws-left">[EFFECT, OR “RELEASED WITH THE LAYER”]</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</main>
