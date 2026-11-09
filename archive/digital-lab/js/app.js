/* ==========================================================================
   RICHMOND / DIGITAL LAB — app
   Hash router, views, collection canvas, command line.
   ========================================================================== */
(() => {
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { return localStorage.getItem('rdl:' + k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('rdl:' + k, v); } catch {} },
  };

  /* ------------------------------------------------ unified collection */
  const ITEMS = [
    ...D.projects.map((p) => ({ ...p, kind: 'work', href: `#/work/${p.slug}` })),
    ...D.lab.map((p) => ({ ...p, kind: 'lab', href: `#/lab/${p.slug}`, year: '—', short: p.title })),
  ].map((it, i) => ({ ...it, no: pad(i + 1) }));
  const findItem = (q) => {
    q = String(q).toLowerCase().trim();
    return ITEMS.find((it) => it.no === pad(+q) || it.slug === q || it.slug.startsWith(q) || it.title.toLowerCase().includes(q));
  };

  const state = {
    filter: 'all',
    mode: store.get('mode', 'canvas'),
    labFilter: 'all',
    noteFilter: 'all',
  };

  /* ------------------------------------------------ vis lifecycle */
  let mounted = [];
  const mountVis = (root) => {
    $$('canvas[data-vis]', root).forEach((c) => mounted.push(new VisCanvas(c, c.dataset.vis, c.dataset.hue)));
  };
  const unmountVis = () => { mounted.forEach((v) => v.destroy()); mounted = []; };
  const bg = new VisCanvas($('#bg'), null, 0);
  const peekEl = $('.peek');
  const peek = new VisCanvas($('canvas', peekEl), null, 0);
  const bgOn = (kind, hue) => { bg.set(kind, hue); document.body.classList.add('bg-on'); };
  const bgOff = () => document.body.classList.remove('bg-on');

  /* ------------------------------------------------ header status */
  const counter = $('#counter');
  const setCounter = (txt) => { counter.textContent = txt; };
  const clock = $('#clock');
  const tick = () => {
    try {
      clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: D.person.timezone }).format(new Date()) + ' AUH';
    } catch { clock.textContent = ''; }
  };
  tick(); setInterval(tick, 30000);

  /* ================================================ views */
  const disciplines = () => `<ul class="disc">${D.disciplines.map((d, i) => `<li style="animation-delay:${0.4 + i * 0.09}s">${d}</li>`).join('')}</ul>`;

  const collection = () => {
    const count = (c) => (c === 'all' ? ITEMS.length : ITEMS.filter((it) => it.cats.includes(c)).length);
    const match = (it) => state.filter === 'all' || it.cats.includes(state.filter);
    return `
    <section class="coll mode-${state.mode}" id="collection" aria-label="Collection">
      <div class="bar">
        <div class="filters" role="group" aria-label="Filter">${D.categories.map((c) =>
          `<button data-filter="${c.id}" class="${state.filter === c.id ? 'on' : ''}" aria-pressed="${state.filter === c.id}">${c.label}<sup>${pad(count(c.id))}</sup></button>`).join('')}
        </div>
        <div class="modes" role="group" aria-label="View">
          <button data-mode="canvas" class="${state.mode === 'canvas' ? 'on' : ''}">CANVAS</button>
          <button data-mode="index" class="${state.mode === 'index' ? 'on' : ''}">INDEX</button>
        </div>
      </div>
      <div class="field">${ITEMS.map((it) => `
        <a class="tile ${it.kind} ${match(it) ? '' : 'off'}" href="${it.href}" data-id="${it.slug}" style="--x:${it.pos.x}%;--y:${it.pos.y}px">
          <div class="thumb"><canvas data-vis="${it.vis}" data-hue="${it.hue}" aria-hidden="true"></canvas><span class="tag">${it.kind === 'lab' ? 'LAB · ' + it.status.toUpperCase() : 'WORK · ' + it.year}</span></div>
          <div class="cap"><span class="no">${it.no}</span><h3>${esc(it.short)}</h3><p>${esc(it.discipline)}</p></div>
          <div class="hover"><p class="stack">${it.stack.map(esc).join(' · ')}</p><span class="go">→ EXPLORE</span></div>
        </a>`).join('')}
      </div>
      <div class="index" role="list">
        <div class="row head" aria-hidden="true"><span>NO</span><span>TITLE</span><span class="d">DISCIPLINE</span><span class="s">STACK</span><span class="y">YEAR</span><span class="k">TYPE</span></div>
        ${ITEMS.map((it) => `
        <a role="listitem" class="row ${match(it) ? '' : 'off'}" href="${it.href}" data-id="${it.slug}">
          <span class="no">${it.no}</span><span class="t">${esc(it.title)}</span><span class="d">${esc(it.discipline)}</span>
          <span class="s">${it.stack.map(esc).join(', ')}</span><span class="y">${it.year}</span><span class="k ${it.kind}">${it.kind.toUpperCase()}</span>
        </a>`).join('')}
      </div>
    </section>`;
  };

  const footer = () => `
    <footer class="foot">
      <span>© ${new Date().getFullYear()} ${esc(D.person.name)}</span>
      <span>Built by hand · HTML, CSS, JS · no templates</span>
      <nav><a href="${D.person.github}" target="_blank" rel="noopener">GitHub ↗</a><a href="${D.person.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a><a href="mailto:${D.person.email}">Email</a></nav>
    </footer>`;

  const V = {};

  const SUGGEST = ['show me something weird', 'i’m hiring', 'find projects involving computer vision', 'what is unfinished?', 'work', 'about'];

  V.home = () => ({
    counter: `${pad(ITEMS.length)} ITEMS`,
    html: `
    <div class="home">
      <section class="home-top">
        <p class="mono home-meta">${esc(D.person.name)} — ${esc(D.person.location)}</p>
        <h1><span class="line"><span>Richmond<span class="slash">/</span></span></span><span class="line"><span>Digital Lab</span></span></h1>
        ${disciplines()}
      </section>
      <section class="home-bottom">
        <p class="lede">A collection of things I build, <em>break,</em> explore, and rethink.</p>
        <div class="home-console"></div>
        <div class="try" role="group" aria-label="Suggestions"><span class="mono">try</span>${SUGGEST.map((q) => `<button data-cmd="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      </section>
    </div>`,
  });

  V.work = () => ({
    counter: `${pad(ITEMS.length)} ITEMS`,
    html: `
    <div class="page">
      <header class="page-head">
        <p class="mono" style="color:var(--mute)">$ ls ./work ./lab</p>
        <h1>Work</h1>
        <p class="lede">Software, AI, interactive systems and hardware. <em>Filter it, or just wander.</em></p>
      </header>
      ${collection()}
    </div>${footer()}`,
  });

  V.project = (slug) => {
    const i = D.projects.findIndex((p) => p.slug === slug);
    if (i < 0) return V.missing(`work/${slug}`);
    const p = D.projects[i];
    const prev = D.projects[(i - 1 + D.projects.length) % D.projects.length];
    const next = D.projects[(i + 1) % D.projects.length];
    const media = p.media
      ? p.media.type === 'video'
        ? `<video src="${p.media.src}" ${p.media.poster ? `poster="${p.media.poster}"` : ''} autoplay muted loop playsinline></video>`
        : `<img src="${p.media.src}" alt="${esc(p.title)}" />`
      : `<canvas data-vis="${p.vis}" data-hue="${p.hue}" aria-hidden="true"></canvas>`;
    let n = 0;
    const sec = (title, body) => `<section class="p-sec" id="sec-${title.toLowerCase().replace(/^the /, '').replace(/\s+/g, '-')}"><h2><b>${pad(++n)}</b>${title}</h2><div>${body}</div></section>`;
    return {
      counter: `${pad(i + 1)} / ${pad(D.projects.length)}`,
      path: `~/work/${p.slug}`,
      html: `
      <article class="page project" style="--hue:${p.hue}">
        <a class="back" href="#/work">← INDEX</a>
        <header class="p-head">
          <p class="mono" style="color:var(--mute)">${pad(i + 1)} / ${pad(D.projects.length)} — ${p.cats.map((c) => c.toUpperCase()).join(' · ')}</p>
          <h1>${esc(p.title)}</h1>
          <p class="p-disc">${esc(p.discipline)}</p>
          <dl class="p-meta">
            <div><dt>YEAR</dt><dd>${p.year}</dd></div>
            <div><dt>ROLE</dt><dd>${esc(p.role)}</dd></div>
            <div><dt>STACK</dt><dd>${p.stack.map(esc).join('<br>')}</dd></div>
            <div><dt>SOURCE</dt><dd>${p.github ? `<a href="${p.github}" target="_blank" rel="noopener">GitHub ↗</a>` : '<span style="color:var(--dim)">Private</span>'}</dd></div>
          </dl>
        </header>
        <figure class="p-hero">${media}<figcaption>FIG. 01 — ${p.media ? esc(p.title) : 'live sketch of the system'}</figcaption></figure>
        <p class="p-summary">${esc(p.summary)}</p>
        ${sec('THE QUESTION', `<p class="q">${esc(p.question)}</p>`)}
        ${sec('THE IDEA', p.idea.map((x) => `<p>${esc(x)}</p>`).join(''))}
        ${sec('PROCESS', `<ol class="steps">${p.process.map((s, k) => `<li><span class="sn">${pad(k + 1)} —</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('')}</ol>`)}
        ${sec('SYSTEM', `<pre class="sys" aria-label="System diagram">${esc(p.system)}</pre>`)}
        ${p.challenges ? sec('CHALLENGES', `<p>${esc(p.challenges)}</p>`) : ''}
        ${p.gallery ? sec('DOCUMENTATION', `<div class="gallery">${p.gallery.map((g) => `<figure><img src="${g.src}" alt="${esc(g.caption || '')}" loading="lazy" /><figcaption>${esc(g.caption || '')}</figcaption></figure>`).join('')}</div>`) : ''}
        ${sec('STACK', `<ul class="chips">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`)}
        ${sec('RESULT', `<p>${esc(p.result)}</p>`)}
        ${sec('NEXT', `<p>${esc(p.next)}</p>`)}
        ${sec('ASK THE LAB', `<div class="ask" data-ask-slug="${p.slug}">
          <ul class="ask-chips">${ASK_PROMPTS.map((q) => `<li><button data-ask="${esc(q)}">&gt; ${esc(q)}</button></li>`).join('')}</ul>
          <form class="ask-form"><label class="mono" for="ask-in">richmond@lab:~/work/${p.slug}$</label><input id="ask-in" type="text" placeholder="ask anything about this project" autocomplete="off" spellcheck="false" /></form>
          <p class="ask-note mono">Answers come only from this project’s documentation.</p>
        </div>`)}
        <nav class="pager" aria-label="More projects">
          <a href="#/work/${prev.slug}"><span class="mono">← PREV</span><strong>${esc(prev.short)}</strong></a>
          <a href="#/work/${next.slug}"><span class="mono">NEXT →</span><strong>${esc(next.short)}</strong></a>
        </nav>
      </article>${footer()}`,
    };
  };

  const ASK_PROMPTS = ['How does it work?', 'What was difficult?', 'Show me the architecture', 'What would come next?', 'What is this related to?'];

  const LAB_TYPES = [
    { id: 'all', label: 'ALL' }, { id: 'experiments', label: 'EXPERIMENTS' },
    { id: 'prototypes', label: 'PROTOTYPES' }, { id: 'ideas', label: 'IDEAS' },
  ];
  V.lab = (open) => ({
    counter: `${pad(D.lab.length)} EXPERIMENTS`,
    path: '~/lab',
    html: `
    <div class="page">
      <header class="page-head">
        <p class="mono" style="color:var(--mute)">$ cd ./lab</p>
        <h1>Richmond Lab</h1>
        <p class="lede">Experiments, unfinished ideas, prototypes and questions. <em>Not everything here needs to become a product.</em></p>
      </header>
      <div class="bar" style="margin-bottom:24px"><div class="filters" data-group="lab">${LAB_TYPES.map((c) =>
        `<button data-lab-filter="${c.id}" class="${state.labFilter === c.id ? 'on' : ''}">${c.label}</button>`).join('')}</div></div>
      <ol class="lab-list">${D.lab.map((l, i) => `
        <li class="lab-item ${open === l.slug ? 'open' : ''} ${state.labFilter === 'all' || l.type === state.labFilter ? '' : 'off'}" id="lab-${l.slug}" data-type="${l.type}">
          <button class="lab-q" aria-expanded="${open === l.slug}" aria-controls="lab-body-${l.slug}">
            <span class="no">L-${pad(i + 1)}</span><span class="name">${esc(l.title)}</span>
            <span class="q">${esc(l.question)}</span><span class="st">${esc(l.status)}</span><span class="x" aria-hidden="true">+</span>
          </button>
          <div class="lab-body" id="lab-body-${l.slug}"><div><div class="lab-inner">
            <div class="vis"><canvas data-vis="${l.vis}" data-hue="${l.hue}" aria-hidden="true"></canvas></div>
            <div>
              <p>${esc(l.notes)}</p>
              <dl><dt>FIELD</dt><dd>${esc(l.discipline)}</dd><dt>MATERIALS</dt><dd>${l.stack.map(esc).join(' · ')}</dd><dt>STATUS</dt><dd style="color:var(--accent)">${esc(l.status.toUpperCase())}</dd></dl>
            </div>
          </div></div></div>
        </li>`).join('')}
      </ol>
    </div>${footer()}`,
    after() {
      if (open) setTimeout(() => $(`#lab-${open}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    },
  });

  V.writing = () => ({
    counter: `${pad(D.writing.length)} NOTES`,
    path: '~/writing',
    html: `
    <div class="page">
      <header class="page-head">
        <p class="mono" style="color:var(--mute)">$ cat ./notes/*</p>
        <h1>Notes / Writing</h1>
        <p class="lede">Process, technology and the thinking between projects.</p>
      </header>
      <div class="bar" style="margin-bottom:0"><div class="filters">${D.writingTags.map((c) =>
        `<button data-note-filter="${c.id}" class="${state.noteFilter === c.id ? 'on' : ''}">${c.label}</button>`).join('')}</div></div>
      <ol class="notes">${D.writing.map((w) => `
        <li class="note ${state.noteFilter === 'all' || w.tag === state.noteFilter ? '' : 'off'}" data-tag="${w.tag}">
          <a href="#/writing/${w.slug}">
            <div class="d">${w.date}<br><span class="badge">${w.tag}</span></div>
            <div><h2>${esc(w.title)}</h2><p class="ex">${w.excerpt.map((x) => `<span>${esc(x)}</span>`).join('')}</p></div>
            <div class="r">${w.status === 'soon' ? 'SOON' : 'READ →'}</div>
          </a>
        </li>`).join('')}
      </ol>
    </div>${footer()}`,
  });

  V.note = (slug) => {
    const w = D.writing.find((x) => x.slug === slug);
    if (!w) return V.missing(`writing/${slug}`);
    return {
      counter: w.date,
      path: `~/writing/${slug}`,
      html: `
      <article class="page article">
        <a class="back" href="#/writing">← NOTES</a>
        <p class="mono" style="color:var(--mute);margin-top:48px">${w.date} · ${w.tag}</p>
        <h1>${esc(w.title)}</h1>
        <div class="body">${(w.body || w.excerpt).map((x) => `<p>${esc(x)}</p>`).join('')}</div>
        ${w.body ? '' : `<p class="soon">&gt; this note is still being written.<br>&gt; status: ${w.status}<br>&gt; check back soon, or <a href="mailto:${D.person.email}" style="color:var(--fg)">ask me about it</a>.</p>`}
      </article>${footer()}`,
    };
  };

  V.about = () => {
    const a = D.about;
    return {
      counter: 'ABOUT',
      path: '~/about',
      html: `
      <div class="page">
        <header class="page-head">
          <p class="mono" style="color:var(--mute)">$ whoami</p>
          <h1>${esc(D.person.name)}</h1>
        </header>
        <p class="statement">I work somewhere between <em>software,</em> interaction, and physical computing.</p>
        <div class="about-grid">
          <h2>CURRENTLY STUDYING</h2>
          <div><ul class="big-list">${a.studying.map((s, i) => `<li class="${i === 1 ? 'plus' : ''}">${esc(s)}</li>`).join('')}</ul></div>
          <h2>INTERESTED IN</h2>
          <div><ul class="big-list">${a.interests.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
          <h2 id="sec-tools">TOOLS</h2>
          <div><ul class="tools">${a.tools.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
          <h2>CURRENTLY</h2>
          <div><ul class="now">${a.currently.map(([k, v]) => `<li><b>${k}</b><span>→</span>${esc(v)}</li>`).join('')}</ul></div>
          <h2 id="sec-experience">EXPERIENCE</h2>
          <div><ol class="xp">${a.experience.map((x) => `<li><span class="w">${x.when}</span><div><h3>${esc(x.role)} <small>— ${esc(x.org)}</small></h3><p>${esc(x.d)}</p></div></li>`).join('')}</ol></div>
          <h2>ELSEWHERE</h2>
          <div class="btns" style="padding-bottom:96px">
            <a href="${D.person.cv}" target="_blank" rel="noopener">[ CV / PDF ↗ ]</a>
            <a href="${D.person.github}" target="_blank" rel="noopener">[ GITHUB ↗ ]</a>
            <a href="${D.person.linkedin}" target="_blank" rel="noopener">[ LINKEDIN ↗ ]</a>
            <a href="#/contact">[ CONTACT ]</a>
          </div>
        </div>
      </div>${footer()}`,
    };
  };

  V.contact = () => ({
    counter: 'CONTACT',
    path: '~/contact',
    html: `
    <div class="page contact">
      <p class="mono" style="color:var(--mute)">$ mail richmond</p>
      <p class="lede" style="margin-top:32px">Collaborations, internships, research, or just a good question. Say hello.</p>
      <a class="mail" href="mailto:${D.person.email}">${D.person.email}</a>
      <ul class="links">
        <li><a href="${D.person.github}" target="_blank" rel="noopener">GITHUB <span>↗</span></a></li>
        <li><a href="${D.person.linkedin}" target="_blank" rel="noopener">LINKEDIN <span>↗</span></a></li>
        <li><a href="${D.person.cv}" target="_blank" rel="noopener">CV / PDF <span>↗</span></a></li>
      </ul>
    </div>${footer()}`,
  });

  V.missing = (p) => ({
    counter: '404',
    html: `
    <div class="page contact">
      <p class="mono" style="color:var(--mute)">$ open ${esc(p)}</p>
      <p class="mail" style="border:0;color:var(--mute)">No such file<br>or directory.</p>
      <div class="btns"><a href="#/">[ cd ~ ]</a><a href="#/work">[ WORK ]</a></div>
    </div>`,
  });

  /* ================================================ router */
  const view = $('#view');
  const hoverable = matchMedia('(hover: hover)').matches;
  const term = $('#term'), input = $('#term-in');
  let current = '';
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const [a, b] = parts;
    let v;
    if (!a) v = V.home();
    else if (a === 'work') v = b ? V.project(b) : V.work();
    else if (a === 'lab') v = V.lab(b);
    else if (a === 'writing') v = b ? V.note(b) : V.writing();
    else if (a === 'about') v = V.about();
    else if (a === 'contact') v = V.contact();
    else v = V.missing(parts.join('/'));

    const key = parts.join('/');
    const home = !a;
    document.body.classList.toggle('is-home', home);
    const sameLab = a === 'lab' && current.startsWith('lab');
    current = key;
    bgOff(); hidePeek();
    unmountVis();
    view.innerHTML = v.html;
    mountVis(view);
    const slot = $('.home-console', view);
    if (slot) { slot.appendChild(term); term.classList.add('open'); if (hoverable) setTimeout(() => input.focus({ preventScroll: true }), 60); }
    else if (term.parentElement !== document.body) { document.body.appendChild(term); term.classList.remove('open'); }
    setCounter(v.counter);
    $('#term-path').textContent = v.path || (a ? `~/${a}` : '~');
    $$('.nav a').forEach((l) => l.classList.toggle('on', l.dataset.nav === a || (a === 'contact' && l.dataset.nav === 'about')));
    document.title = a ? `${(v.title || a).replace(/^\w/, (c) => c.toUpperCase())} — Richmond / Digital Lab` : 'Richmond / Digital Lab';
    if (b && a === 'work') document.title = `${D.projects.find((p) => p.slug === b)?.title || '404'} — Richmond / Digital Lab`;
    if (!sameLab) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    v.after?.();
    if (!sameLab) view.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('lab:route', { detail: { page: a || 'home', slug: b || null } }));
  }
  window.addEventListener('hashchange', route);

  /* ================================================ interactions */
  const applyFilter = () => {
    const coll = $('#collection');
    if (!coll) return;
    const match = (id) => { const it = ITEMS.find((x) => x.slug === id); return state.filter === 'all' || it.cats.includes(state.filter); };
    $$('.tile, .row[data-id]', coll).forEach((el) => el.classList.toggle('off', !match(el.dataset.id)));
    $$('[data-filter]', coll).forEach((b) => { const on = b.dataset.filter === state.filter; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  };
  const applyMode = () => {
    const coll = $('#collection');
    if (!coll) return;
    coll.classList.toggle('mode-canvas', state.mode === 'canvas');
    coll.classList.toggle('mode-index', state.mode === 'index');
    $$('[data-mode]', coll).forEach((b) => b.classList.toggle('on', b.dataset.mode === state.mode));
    store.set('mode', state.mode);
  };

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cmd]');
    if (c) { input.value = c.dataset.cmd; $('#term-form').requestSubmit(); return; }
    const f = e.target.closest('[data-filter]');
    if (f) { state.filter = f.dataset.filter; applyFilter(); return; }
    const m = e.target.closest('[data-mode]');
    if (m) { state.mode = m.dataset.mode; applyMode(); return; }
    const lf = e.target.closest('[data-lab-filter]');
    if (lf) {
      state.labFilter = lf.dataset.labFilter;
      $$('[data-lab-filter]').forEach((b) => b.classList.toggle('on', b === lf));
      $$('.lab-item').forEach((li) => li.classList.toggle('off', !(state.labFilter === 'all' || li.dataset.type === state.labFilter)));
      return;
    }
    const nf = e.target.closest('[data-note-filter]');
    if (nf) {
      state.noteFilter = nf.dataset.noteFilter;
      $$('[data-note-filter]').forEach((b) => b.classList.toggle('on', b === nf));
      $$('.note').forEach((li) => li.classList.toggle('off', !(state.noteFilter === 'all' || li.dataset.tag === state.noteFilter)));
      return;
    }
    const lq = e.target.closest('.lab-q');
    if (lq) {
      const li = lq.parentElement;
      const open = !li.classList.contains('open');
      li.classList.toggle('open', open);
      lq.setAttribute('aria-expanded', open);
    }
  });

  // hover: tiles light up the backdrop, index rows show a floating preview

  let peekOn = false;
  function hidePeek() { peekOn = false; peekEl.classList.remove('on'); }
  document.addEventListener('pointerover', (e) => {
    if (!hoverable) return;
    const tile = e.target.closest('.tile');
    const row = e.target.closest('a.row[data-id]');
    const it = (tile || row) && ITEMS.find((x) => x.slug === (tile || row).dataset.id);
    if (tile && it) { bgOn(it.vis, it.hue); setCounter(`${it.no} / ${pad(ITEMS.length)}`); }
    if (row && it) { peek.set(it.vis, it.hue); peekOn = true; peekEl.classList.add('on'); setCounter(`${it.no} / ${pad(ITEMS.length)}`); }
  });
  document.addEventListener('pointerout', (e) => {
    const from = e.target.closest('.tile, a.row[data-id]');
    if (!from || from.contains(e.relatedTarget)) return;
    bgOff(); hidePeek();
    const coll = $('#collection');
    if (coll) setCounter(`${pad(ITEMS.length)} ITEMS`);
  });
  document.addEventListener('pointermove', (e) => {
    if (!peekOn) return;
    const w = peekEl.offsetWidth, h = peekEl.offsetHeight;
    const x = Math.min(e.clientX + 24, innerWidth - w - 12), y = Math.min(Math.max(12, e.clientY - h / 2), innerHeight - h - 60);
    peekEl.style.translate = `${x}px ${y}px`;
  });

  /* ================================================ command line */
  const out = $('#term-out');
  const hist = []; let hi = 0;
  const print = (html, cls = '') => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  };
  const openTerm = (on = true) => term.classList.toggle('open', on);
  const go = (h) => { location.hash = h; };

  const HELP = `<span class="ok">RICHMOND / DIGITAL LAB: available commands</span>

  <b>work</b> · <b>lab</b> · <b>writing</b> · <b>about</b> · <b>contact</b>   go to a section
  <b>ls</b> [work|lab|writing]         list items
  <b>open</b> &lt;no|name&gt;              open an item, e.g. <i>open 01</i> or <i>open arm</i>
  <b>filter</b> &lt;category&gt;           ${D.categories.map((c) => c.id).join(' | ')}
  <b>view</b> canvas|index             switch collection layout
  <b>whoami</b> · <b>stack</b> · <b>now</b>          about me
  <b>cv</b> · <b>github</b> · <b>linkedin</b> · <b>email</b>  links
  <b>tour</b> [hiring|developer|researcher|designer|explorer]
  <b>journey</b> · <b>agent</b>                what you've seen · agent status
  <b>clear</b> · <b>exit</b>                    tidy up

<span class="ok">Or just ask.</span> e.g. <i>find projects involving computer vision</i>
  <i>show me something weird</i> · <i>i'm hiring for a frontend role</i>
<span class="dim">tip: press / anywhere to focus · ↑↓ for history · tab to complete</span>`;

  const CMDS = {
    help: () => print(HELP),
    ls: (arg) => {
      const list = arg === 'writing'
        ? D.writing.map((w) => `  ${w.date.padEnd(8)} <a href="#/writing/${w.slug}">${esc(w.title)}</a> <span class="dim">[${w.status}]</span>`)
        : ITEMS.filter((it) => !arg || it.kind === arg).map((it) => `  ${it.no}  <a href="${it.href}">${esc(it.title)}</a>${' '.repeat(Math.max(1, 34 - it.title.length))} <span class="dim">${esc(it.discipline)}</span>`);
      print(list.join('\n') || '<span class="err">nothing here</span>');
    },
    open: (arg) => {
      if (!arg && window.LAB.agent?.openLast()) return;
      if (!arg) return print('<span class="err">usage: open &lt;no|name&gt;</span>');
      const it = findItem(arg);
      if (!it) return print(`<span class="err">open: ${esc(arg)}: no such project</span>`);
      print(`opening <span class="ok">${esc(it.title)}</span>…`);
      go(it.href);
    },
    cd: (arg) => {
      if (!arg || arg === '~' || arg === '/' || arg === '..') return go('#/');
      if (CMDS[arg] && ['work', 'lab', 'writing', 'about', 'contact'].includes(arg)) return go(`#/${arg}`);
      print(`<span class="err">cd: ${esc(arg)}: no such directory</span>`);
    },
    work: () => go('#/work'), lab: () => go('#/lab'), writing: () => go('#/writing'),
    about: () => go('#/about'), contact: () => go('#/contact'), home: () => go('#/'),
    filter: (arg = 'all') => {
      if (!D.categories.some((c) => c.id === arg)) return print(`<span class="err">filter: unknown category. try: ${D.categories.map((c) => c.id).join(', ')}</span>`);
      state.filter = arg;
      if (!$('#collection')) go('#/work');
      setTimeout(() => { applyFilter(); $('#collection')?.scrollIntoView({ behavior: 'smooth' }); }, 30);
      print(`filter → <span class="ok">${arg}</span>`);
    },
    view: (arg) => {
      if (!['canvas', 'index'].includes(arg)) return print('<span class="err">usage: view canvas|index</span>');
      state.mode = arg; applyMode();
      if (!$('#collection')) go('#/work');
      print(`view → <span class="ok">${arg}</span>`);
    },
    whoami: () => print(`${esc(D.person.name)}\nInteractive Media + Computer Science @ NYU Abu Dhabi\n${esc(D.about.statement)}`),
    stack: () => print(D.about.tools.join(' · ')),
    now: () => print(D.about.currently.map(([k, v]) => `  ${k.padEnd(10)} → ${esc(v)}`).join('\n')),
    cv: () => { window.open(D.person.cv, '_blank', 'noopener'); print('opening CV…'); },
    github: () => { window.open(D.person.github, '_blank', 'noopener'); print('opening github…'); },
    linkedin: () => { window.open(D.person.linkedin, '_blank', 'noopener'); print('opening linkedin…'); },
    email: () => { print(`<a href="mailto:${D.person.email}">${D.person.email}</a>`); location.href = `mailto:${D.person.email}`; },
    date: () => print(new Date().toString()),
    clear: () => { out.innerHTML = ''; },
    exit: () => { openTerm(false); input.blur(); },
    sudo: () => print('<span class="err">permission denied. nice try.</span>'),
    rm: () => print('<span class="err">rm: this lab keeps its failures. they’re part of the work.</span>'),
    hello: () => print('hi 👋  type <b>help</b> to look around.'),
  };
  CMDS.hi = CMDS.hello; CMDS.man = CMDS.help; CMDS['?'] = CMDS.help; CMDS.projects = CMDS.work; CMDS.blog = CMDS.writing; CMDS.mail = CMDS.email;

  $('#term-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = '';
    if (!raw) return;
    hist.push(raw); hi = hist.length;
    openTerm(true);
    print(esc(raw), 'cmd');
    const [cmd, ...rest] = raw.split(/\s+/);
    const fn = CMDS[cmd.toLowerCase()];
    if (fn) fn(rest.join(' ').toLowerCase() || undefined);
    else if (window.LAB.agent) window.LAB.agent.ask(raw);
    else if (findItem(raw) && raw.length > 2) CMDS.open(raw);
    else print(`<span class="err">command not found: ${esc(cmd)}</span>  <span class="dim">try help</span>`);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value.toLowerCase();
      const pool = [...Object.keys(CMDS), ...ITEMS.map((it) => 'open ' + it.slug), ...D.categories.map((c) => 'filter ' + c.id)];
      const hit = pool.filter((c) => c.startsWith(v));
      if (hit.length === 1) input.value = hit[0] + ' ';
      else if (hit.length > 1) { openTerm(true); print(hit.slice(0, 16).join('   '), 'dim'); }
    } else if (e.key === 'Escape') { openTerm(false); input.blur(); }
  });
  input.addEventListener('focus', () => { if (!out.childElementCount && !document.body.classList.contains('is-home')) print(HELP); openTerm(true); });
  $('#term-toggle').addEventListener('click', () => openTerm(!term.classList.contains('open')));
  out.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) openTerm(false); });
  document.addEventListener('pointerdown', (e) => { if (!term.contains(e.target) && !document.body.classList.contains('is-home')) openTerm(false); });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
    if (!typing && (e.key === '/' || e.key === '`') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); input.focus(); }
  });

  // the home screen compresses once there is a conversation
  new MutationObserver(() => document.body.classList.toggle('talking', out.childElementCount > 0)).observe(out, { childList: true });
  let ph = 0;
  setInterval(() => {
    if (!document.body.classList.contains('is-home') || document.activeElement === input && input.value) return;
    input.placeholder = ['ask the lab anything…', ...SUGGEST.slice(0, 4).map((q) => `try: ${q}`)][ph++ % 5];
  }, 3200);

  window.LAB = { D, ITEMS, state, findItem, esc, pad, go, print, openTerm, applyFilter, applyMode, CMDS, input };
  route();
})();
