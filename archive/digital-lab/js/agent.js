/* ==========================================================================
   RICHMOND / DIGITAL LAB — agent
   A portfolio an agent can operate. The same tool layer is driven either by
   Claude (via /api/agent, when deployed with a key) or by a local rule-based
   planner (always available, works offline and on any static host).
   ========================================================================== */
(() => {
  const L = window.LAB;
  const { D, ITEMS, state, esc, pad, go, print, openTerm } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = window.REDUCED_MOTION;
  const API = 'api/agent';
  const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCED ? 0 : ms));
  const ss = {
    get(k, d) { try { const v = sessionStorage.getItem('rdl:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem('rdl:' + k, JSON.stringify(v)); } catch {} },
  };

  const bySlug = (s) => ITEMS.find((i) => i.slug === s);
  const PAGES = ['home', 'work', 'lab', 'writing', 'about', 'contact'];
  const WORK_SECTIONS = ['question', 'idea', 'process', 'system', 'challenges', 'stack', 'result', 'next', 'ask-the-lab'];
  const PAGE_SECTIONS = ['experience', 'tools'];
  const CATS = D.categories.map((c) => c.id);
  const LINKS = {
    cv: { label: 'CV / PDF ↗', href: D.person.cv, ext: true },
    github: { label: 'GITHUB ↗', href: D.person.github, ext: true },
    linkedin: { label: 'LINKEDIN ↗', href: D.person.linkedin, ext: true },
    email: { label: D.person.email, href: `mailto:${D.person.email}` },
  };

  /* ================================================ memory */
  let journey = ss.get('journey', []);
  let persona = ss.get('persona', null);
  let lastResults = [];
  let route = { page: 'home', slug: null };
  let pendingSection = null;
  let pendingHighlight = null;

  /* ================================================ output */
  const termOut = $('#term-out');
  const link = (it) => `<a href="${it.href}">${it.no} / ${esc(it.short.toUpperCase())}</a>`;
  const say = async (lines, cls = 'agent') => {
    openTerm(true);
    for (const l of [].concat(lines)) { print(l === '' ? '&nbsp;' : l, cls); await sleep(55); }
  };
  const spinner = (label) => {
    print(`<span class="dim">${esc(label)}</span><span class="spin"></span>`, 'agent');
    return termOut.lastElementChild;
  };
  const itemBlock = (it, extra) => [
    `${link(it)}`,
    `   <span class="dim">${esc(it.discipline)}${it.kind === 'lab' ? ' · ' + esc(it.status.toUpperCase()) : ''}</span>`,
    `   ${esc(extra || it.summary || it.notes)}`,
  ].join('\n');
  const buttons = (btns) => `<span class="tbtns">${btns.join('')}</span>`;
  const linkBtns = (keys) => buttons(keys.filter((k) => LINKS[k]).map((k) =>
    `<a class="tbtn" href="${LINKS[k].href}" ${LINKS[k].ext ? 'target="_blank" rel="noopener"' : ''}>${esc(LINKS[k].label)}</a>`));

  /* ================================================ UI actions (the tools) */
  function scrollToSection(section) {
    const el = $(`#sec-${section}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    return true;
  }
  function pulse(slugs) {
    const els = slugs.flatMap((s) => $$(`#collection [data-id="${s}"]`));
    els.forEach((el) => { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); });
    const first = $(`#collection.mode-canvas .tile[data-id="${slugs[0]}"], #collection.mode-index .row[data-id="${slugs[0]}"]`);
    first?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
  }
  const onMap = () => L.map && L.map.active();
  function mark(slugs) {
    if ($('#collection')) pulse(slugs);
    else if (onMap()) L.map.focus(slugs);
  }
  function navigateTo(it, section) {
    const here = route.slug === it.slug && (route.page === 'work' ? it.kind === 'work' : it.kind === 'lab');
    if (it.kind === 'lab') {
      if (here) {
        const li = $(`#lab-${it.slug}`);
        li?.classList.add('open');
        li?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      } else go(it.href);
      return;
    }
    if (here) { if (section) scrollToSection(section); else window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else { pendingSection = section || null; go(it.href); }
  }

  const TOOLS = {
    navigate({ page, section }) {
      if (!PAGES.includes(page)) throw new Error(`unknown page "${page}". valid: ${PAGES.join(', ')}`);
      if (section && !PAGE_SECTIONS.includes(section)) section = null;
      if (route.page === page && !route.slug) { if (section) scrollToSection(section); }
      else { pendingSection = section || null; go(page === 'home' ? '#/' : `#/${page}`); }
      return `navigated to ${page}${section ? ' → ' + section : ''}`;
    },
    open_item({ slug, section }) {
      const it = bySlug(slug);
      if (!it) throw new Error(`no item "${slug}". valid slugs: ${ITEMS.map((i) => i.slug).join(', ')}`);
      if (section && (it.kind !== 'work' || !WORK_SECTIONS.includes(section))) section = null;
      navigateTo(it, section);
      lastResults = [it];
      return `opened ${it.title}${section ? ' at section ' + section : ''}`;
    },
    filter_collection({ category, view }) {
      if (!CATS.includes(category)) throw new Error(`unknown category "${category}". valid: ${CATS.join(', ')}`);
      state.filter = category;
      if (view === 'canvas' || view === 'index') state.mode = view;
      if (onMap()) {
        L.map.focus(ITEMS.filter((i) => category === 'all' || i.cats.includes(category)).map((i) => i.slug));
      } else if ($('#collection')) {
        L.applyFilter(); L.applyMode();
        $('#collection').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      } else go('#/work');
      const n = ITEMS.filter((i) => category === 'all' || i.cats.includes(category)).length;
      return onMap() ? `${n} ${category === 'all' ? '' : category + ' '}items marked on the map` : `collection filtered to ${category}: ${n} items visible`;
    },
    highlight_items({ slugs }) {
      const valid = [].concat(slugs || []).filter(bySlug);
      if (!valid.length) throw new Error('no valid slugs');
      if ($('#collection') || onMap()) mark(valid);
      else { pendingHighlight = valid; go('#/work'); }
      lastResults = valid.map(bySlug);
      return `highlighted ${valid.join(', ')}`;
    },
    start_tour({ title, stops, outro }) {
      const clean = [].concat(stops || []).filter((s) => s && (bySlug(s.target) || PAGES.includes(s.target))).slice(0, 8);
      if (clean.length < 2) throw new Error('a tour needs at least 2 valid stops (item slugs or page names)');
      tour.start({ title: String(title || 'YOUR TOUR').slice(0, 40), stops: clean, outro: outro ? String(outro).slice(0, 200) : null });
      return `tour started with ${clean.length} stops; the visitor is now at stop 1 (${clean[0].target})`;
    },
    show_links({ links }) {
      const keys = [].concat(links || []).filter((k) => LINKS[k]);
      if (!keys.length) throw new Error(`valid links: ${Object.keys(LINKS).join(', ')}`);
      print(linkBtns(keys), 'agent');
      return `showed links: ${keys.join(', ')}`;
    },
  };

  /* ================================================ tours */
  const tourEl = document.createElement('div');
  tourEl.className = 'tour';
  tourEl.setAttribute('role', 'region');
  tourEl.setAttribute('aria-label', 'Guided tour');
  $('#term').before(tourEl);

  const tour = {
    data: ss.get('tour', null),
    save() { ss.set('tour', this.data); },
    start(t) { this.data = { ...t, i: 0 }; this.save(); this.goto(0); },
    stopLabel(s) { const it = bySlug(s.target); return it ? it.short.toUpperCase() : s.target.toUpperCase(); },
    goto(i) {
      if (!this.data) return;
      const n = this.data.stops.length;
      this.data.i = Math.max(0, Math.min(n - 1, i));
      this.save();
      const s = this.data.stops[this.data.i];
      const it = bySlug(s.target);
      openTerm(false);
      if (it) navigateTo(it, s.section);
      else TOOLS.navigate({ page: s.target, section: s.section });
      this.render();
      if (this.data.i === n - 1 && this.data.outro) say([`<span class="ok">${esc(this.data.outro)}</span>`, linkBtns(['cv', 'github', 'email'])]);
    },
    next() { if (this.data && this.data.i < this.data.stops.length - 1) this.goto(this.data.i + 1); else this.end(); },
    prev() { if (this.data) this.goto(this.data.i - 1); },
    end() { if (!this.data) return; this.data = null; this.save(); this.render(); print('<span class="dim">tour ended. type <b>tour</b> to start another.</span>', 'agent'); },
    sync() {
      if (!this.data) return;
      const idx = this.data.stops.findIndex((s) => s.target === route.slug || (!route.slug && s.target === route.page));
      if (idx >= 0 && idx !== this.data.i) { this.data.i = idx; this.save(); }
      this.render();
    },
    render() {
      document.body.classList.toggle('tour-on', !!this.data);
      if (!this.data) { tourEl.innerHTML = ''; return; }
      const { title, stops, i } = this.data;
      const s = stops[i];
      tourEl.innerHTML = `
        <span class="t-title">TOUR · ${esc(title.toUpperCase())}</span>
        <span class="t-count">${pad(i + 1)} / ${pad(stops.length)}</span>
        <span class="t-now"><b>${esc(this.stopLabel(s))}</b> <span>— ${esc(s.reason || '')}</span></span>
        <span class="t-ctl">
          <button data-tour-go="prev" ${i === 0 ? 'disabled' : ''} aria-label="Previous stop">←</button>
          <button data-tour-go="next">${i === stops.length - 1 ? 'FINISH' : 'NEXT →'}</button>
          <button data-tour-go="end" aria-label="End tour">×</button>
        </span>`;
    },
  };

  const t = (target, reason, section) => ({ target, reason, section });
  const PERSONAS = {
    hiring: {
      title: 'For recruiters',
      intro: ['You have 3 minutes. Here’s the short version:', '→ software projects  → engineering stack  → experience  → CV'],
      stops: [
        t('learnai', 'Generative AI + full-stack TypeScript', 'process'),
        t('news-intelligence', 'Python NLP / ML pipeline', 'system'),
        t('gesture-arm', 'Computer vision driving real hardware', 'process'),
        t('about', 'Internships, web development, tools', 'experience'),
      ],
      outro: 'That’s the short version. The full CV and code are one click away.',
    },
    developer: {
      title: 'For developers',
      intro: ['Straight to the systems. Architecture first, polish second.'],
      stops: [
        t('learnai', 'Multi-stage LLM pipeline with strict JSON contracts', 'system'),
        t('news-intelligence', 'NLP stages feeding semantic search', 'system'),
        t('gesture-arm', 'Real-time CV → robot control loop', 'system'),
        t('voice-car', 'Browser speech → serial → Arduino', 'system'),
      ],
      outro: 'Source for most of this is on GitHub.',
    },
    researcher: {
      title: 'For researchers',
      intro: ['Let’s explore the experimental side: questions before products.'],
      stops: [
        t('mirror-of-expectation', 'HCI: can an interface change self-perception?'),
        t('gesture-arm', 'Embodied interaction: hand → machine', 'question'),
        t('finger', 'Capstone: did we need the robot at all?'),
        t('holographic-mirror', 'Spatial display without a screen'),
        t('campus-explorer-vr', 'Presence before arrival', 'question'),
      ],
      outro: 'Most of these are open questions. Richmond is happy to talk about them.',
    },
    designer: {
      title: 'For designers',
      intro: ['Let’s look at interaction and visual work.'],
      stops: [
        t('digital-diet', 'Attention as a nutrition label'),
        t('campus-explorer-vr', 'Wayfinding in 360°', 'process'),
        t('mirror-of-expectation', 'An installation about identity'),
        t('air-harp', 'An instrument with no surface'),
      ],
      outro: 'That’s the interaction side of the lab.',
    },
    explorer: {
      title: 'Wandering',
      intro: ['No agenda. Here’s a path through the stranger corners.'],
      stops: [
        t('air-harp', 'Invisible strings'),
        t('gesture-arm', 'A robot that copies your hand'),
        t('holographic-mirror', 'Things floating in glass'),
        t('learnai', 'A course from one sentence'),
        t('finger', 'Why we stopped building the robot'),
      ],
      outro: 'End of the path. The collection has more.',
    },
  };
  let pendingTour = null;

  async function choosePersona(id, custom) {
    const p = custom || PERSONAS[id];
    if (!p) return;
    persona = id; ss.set('persona', id);
    pendingTour = { title: p.title, stops: p.stops, outro: p.outro };
    await say([...p.intro.map(esc), '', `<span class="ok">YOUR TOUR</span>`,
      ...p.stops.map((s, i) => `${pad(i + 1)}  ${bySlug(s.target) ? link(bySlug(s.target)) : `<a href="#/${s.target}">${s.target.toUpperCase()}</a>`}  <span class="dim">${esc(s.reason)}</span>`),
      buttons([`<button class="tbtn on" data-tour-start>[ START TOUR ]</button>`, `<button class="tbtn" data-tour-skip>no thanks</button>`])]);
    if (id === 'hiring' || id === 'developer') print(linkBtns(['cv', 'github']), 'agent');
  }

  /* ================================================ local planner */
  const STOP = new Set(("a an the me my show find any some projects project work works things thing that this these those with involving involve about in on of for to and or is are do does did you your richmond richmond's his he has i im i'm am what which where can could please want see look looking related relevant using use used built build made make give tell list all something anything stuff there here it its from by get let's lets").split(' '));
  const SYN = { cv: 'computer vision', vision: 'computer vision', ml: 'machine learning', robot: 'robotics', robots: 'robotics', robotic: 'robotics', ar: 'xr', 'front-end': 'frontend', 'back-end': 'backend', ui: 'frontend', speech: 'speech recognition', llms: 'llm', genai: 'generative ai', immersive: 'immersive', sensor: 'sensors', embedded: 'embedded', audio: 'sound', experimental: 'experiments', experiment: 'experiments', physical: 'hardware', ts: 'typescript', js: 'javascript' };
  const docText = (it) => [it.title, it.short, it.discipline, ...it.cats, ...it.stack, ...(it.tags || []), it.summary, it.question, it.notes, ...(it.idea || []), it.challenges, it.result, ...(it.process || []).map((p) => p.t + ' ' + p.d)].filter(Boolean).join(' \n ').toLowerCase();
  const VOCAB = [...new Set(ITEMS.flatMap((i) => [...(i.tags || []), ...i.stack.map((s) => s.toLowerCase()), ...i.cats]))].sort((a, b) => b.length - a.length);

  function terms(q) {
    let s = ' ' + q.toLowerCase().replace(/[^\w#.+'’\-\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const found = [];
    for (const v of VOCAB) if (s.includes(' ' + v + ' ')) { found.push(v); s = s.split(' ' + v + ' ').join(' '); }
    s.split(' ').filter((w) => w.length > 1 && !STOP.has(w)).forEach((w) => found.push(SYN[w] || w.replace(/s$/, '')));
    return [...new Set(found)];
  }
  function search(q, kind) {
    const ts = terms(q);
    if (!ts.length) return [];
    return ITEMS.filter((it) => !kind || it.kind === kind).map((it) => {
      const text = docText(it);
      let score = 0;
      for (const w of ts) {
        if ((it.tags || []).includes(w)) score += 5;
        if (it.stack.some((s) => s.toLowerCase() === w)) score += 4;
        if (it.cats.includes(w)) score += 4;
        if (it.title.toLowerCase().includes(w) || it.short.toLowerCase().includes(w)) score += 4;
        if (it.discipline.toLowerCase().includes(w)) score += 3;
        else if (w.length > 2 && new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)) score += 1;
      }
      if (score && it.kind === 'work') score += 2;
      return { it, score };
    }).filter((r) => r.score >= 2).sort((a, b) => b.score - a.score).map((r) => r.it);
  }
  const mentioned = (q) => {
    const s = q.toLowerCase();
    return ITEMS.filter((it) => [it.slug, it.title, it.short, ...it.slug.split('-').filter((w) => w.length > 3 && !['campus', 'mirror'].includes(w))]
      .some((k) => s.includes(k.toLowerCase())));
  };
  const currentItem = () => (route.slug ? bySlug(route.slug) : null);
  const overlap = (a, b) => {
    const A = new Set([...(a.tags || []), ...a.cats, ...a.stack.map((s) => s.toLowerCase())]);
    return [...new Set([...(b.tags || []), ...b.cats, ...b.stack.map((s) => s.toLowerCase())])].filter((x) => A.has(x) && x !== 'experiments' && x !== 'unfinished');
  };

  async function customTour(title, q, hiring = /hir|recruit|role|job|position/.test(q)) {
    const hits = search(q).slice(0, 4);
    if (hits.length < 2) return false;
    const ts = terms(q);
    await choosePersona(hiring ? 'hiring' : persona || 'explorer', {
      title,
      intro: [`Building a tour around: ${ts.slice(0, 4).join(', ')}.`],
      stops: [...hits.map((it) => t(it.slug, `${it.discipline}${it.kind === 'lab' ? ' · ' + it.status : ''}`, it.kind === 'work' ? 'process' : undefined)),
        ...(hiring ? [t('about', 'Experience and tools', 'experience')] : [])],
      outro: hiring ? 'That covers the relevant work. CV and contact below.' : 'End of the tour.',
    });
    return true;
  }

  async function answerAbout(it, q) {
    const s = q.toLowerCase();
    const act = (section) => { if (it.kind === 'work') navigateTo(it, section); else navigateTo(it); };
    if (it.kind === 'lab') {
      act();
      return say([itemBlock(it, it.notes), `   <span class="dim">question:</span> ${esc(it.question)}`, `   <span class="dim">materials:</span> ${esc(it.stack.join(' · '))}`,
        `<span class="dim">This is ${it.status === 'concept' ? 'a concept' : 'an ' + it.status.replace(/^in /, 'in-')} rather than a finished product; the documentation is thin on purpose.</span>`]);
    }
    if (/architect|system|diagram|pipeline|how.*(fit|connect)|structure/.test(s)) {
      act('system');
      return say([`${link(it)} <span class="dim">— system</span>`, `<pre class="tpre">${esc(it.system)}</pre>`]);
    }
    if (/difficult|hard|challeng|problem|struggl|tricky|fail/.test(s)) {
      act('challenges');
      return say([`${link(it)} <span class="dim">— what was difficult</span>`, esc(it.challenges)]);
    }
    if (/how|process|work|step|made|pipeline/.test(s)) {
      act('process');
      return say([`${link(it)} <span class="dim">— process</span>`, ...it.process.map((p, i) => `${pad(i + 1)} ${esc(p.t.padEnd(9))} <span class="dim">${esc(p.d)}</span>`)]);
    }
    if (/next|future|improv|would you|roadmap/.test(s)) { act('next'); return say([`${link(it)} <span class="dim">— next</span>`, esc(it.next)]); }
    if (/result|outcome|did it|success/.test(s)) { act('result'); return say([`${link(it)} <span class="dim">— result</span>`, esc(it.result)]); }
    if (/code|github|repo|source/.test(s)) {
      return say(it.github ? [`${link(it)} source → <a href="${it.github}" target="_blank" rel="noopener">${esc(it.github.replace('https://', ''))}</a>`] : [`${link(it)}: the source isn’t public. <a href="mailto:${D.person.email}">Ask Richmond</a> for a walkthrough.`]);
    }
    if (/relat|similar|connect|like this|else/.test(s)) return related([it.slug]);
    if (/stack|tech|language|tool|built with|librar|framework/.test(s)) { act('stack'); return say([`${link(it)} <span class="dim">— stack</span>`, it.stack.map(esc).join(' · ')]); }
    if (/why/.test(s)) {
      const extra = terms(q).filter((w) => !['why', 'choose', 'chose', 'pick'].includes(w));
      const docs = [...it.idea, ...it.process.map((p) => p.d), it.challenges];
      const evidence = docs.filter((d) => extra.some((w) => d.toLowerCase().includes(w)));
      act('idea');
      return say([`${link(it)} <span class="dim">— from the documentation</span>`, ...(evidence.length ? evidence : it.idea).slice(0, 3).map((x) => '→ ' + esc(x)),
        `<span class="dim">The docs don’t record every design decision. For the full reasoning, <a href="mailto:${D.person.email}">ask Richmond</a>.</span>`]);
    }
    act('question');
    return say([itemBlock(it), `   <span class="dim">question:</span> ${esc(it.question)}`, `   <span class="dim">stack:</span> ${esc(it.stack.join(' · '))}`,
      '<span class="dim">ask: how does it work · what was difficult · show the architecture</span>']);
  }

  async function related(seed) {
    const seen = seed.map(bySlug).filter(Boolean);
    if (!seen.length) return say(['You haven’t opened anything yet. Try <b>show me something weird</b>, or pick a tile in the collection.']);
    const lines = [];
    if (seen.length > 1) {
      const counts = {};
      seen.forEach((it) => new Set([...(it.tags || []), ...it.cats, ...it.stack.map((x) => x.toLowerCase())]).forEach((x) => { counts[x] = (counts[x] || 0) + 1; }));
      const shared = Object.entries(counts).filter(([x, n]) => n >= 2 && !['experiments', 'unfinished', 'weird'].includes(x)).sort((a, b) => b[1] - a[1]).map(([x]) => x);
      lines.push('You have explored:', ...seen.map((it) => '   ' + link(it)), '');
      lines.push(shared.length ? `${seen.length === 2 ? 'Both' : 'They'} share <span class="ok">${esc(shared.slice(0, 5).join(' · '))}</span>.` : 'Different materials, different stacks.',
        'Each turns a human signal (a hand, a voice, a question, a place) into a new kind of interaction.');
    }
    const recs = ITEMS.filter((it) => !seed.includes(it.slug))
      .map((it) => ({ it, s: seen.reduce((n, x) => n + overlap(x, it).length, 0) }))
      .filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map((r) => r.it);
    if (recs.length) {
      lines.push('', seen.length > 1 ? 'You might also want to see:' : `Related to ${link(seen[0])}:`,
        ...recs.map((it) => `   → ${link(it)}  <span class="dim">${esc(overlap(seen[seen.length - 1], it).slice(0, 3).join(' · ') || it.discipline)}</span>`));
      lastResults = recs;
      mark(recs.map((r) => r.slug));
    }
    return say(lines);
  }

  async function localAsk(raw) {
    const q = raw.trim();
    const s = q.toLowerCase();
    const here = currentItem();
    const named = mentioned(q);

    if (/^(open|go|go there|open it|that one)$/.test(s)) { if (!L.agent.openLast()) say(['Nothing to open yet. Ask for something first.']); return; }
    if (/^(hi|hello|hey|yo|sup|good (morning|evening|afternoon))\b/.test(s)) return say(['Hello. This is Richmond’s lab. Ask for something, e.g. <i>find projects involving computer vision</i>, or type <b>help</b>.']);

    // goals / personas
    const role = /\b(hir(e|ing)|recruit\w*|talent|hr)\b/.test(s);
    if (role || /\b(i'?m|i am) an? (software )?(developer|engineer|programmer)\b/.test(s)) {
      const extra = terms(q).filter((w) => !/^(hir|hire|hiring|recruit|role|engineer|engineering|developer|software|position|job|intern|internship|talent|hr|looking)/.test(w));
      if (extra.length && await customTour(`For: ${extra.slice(0, 2).join(' ')} role`, extra.join(' '), role)) return;
      return choosePersona(role ? 'hiring' : 'developer');
    }
    if (/\bresearch(er)?\b/.test(s) && /\b(i'?m|i am|as a)\b/.test(s)) return choosePersona('researcher');
    if (/\bdesign(er)?\b/.test(s) && /\b(i'?m|i am|as a)\b/.test(s)) return choosePersona('designer');
    if (/just (exploring|looking|browsing|wandering)|no agenda/.test(s)) return choosePersona('explorer');
    if (/\btour\b|best (demonstrate|show)|strongest|showcase/.test(s)) {
      const key = Object.keys(PERSONAS).find((k) => s.includes(k.slice(0, 5)));
      if (key) return choosePersona(key);
      const topic = q.replace(/\b(tour|give me a|start a|build a|build me a|the projects? that|best (demonstrate|show)s?|strongest|showcase|of)\b/gi, ' ');
      if (await customTour('Your tour', topic)) return;
      return say(['Which kind of tour? ' + Object.keys(PERSONAS).map((k) => `<b>tour ${k}</b>`).join(' · ')]);
    }

    // curiosity
    if (/weird|strange|odd|surprise|random|unexpected|something (fun|cool|different|interesting)/.test(s)) {
      const pool = ITEMS.filter((it) => (it.tags || []).includes('weird') && it.slug !== lastResults[0]?.slug);
      const it = pool[Math.floor(Math.random() * pool.length)];
      await say('<span class="dim">Searching the lab…</span>');
      await sleep(380);
      lastResults = [it];
      mark([it.slug]);
      return say(['Found:', '', itemBlock(it, it.question), `   <span class="dim">status:</span> <span class="ok">${esc((it.status || 'project').toUpperCase())}</span>`, '', '<span class="dim">type <b>open</b> to go there.</span>']);
    }
    if (/unfinished|in progress|incomplete|wip|work in progress|prototypes?|concepts?|ideas|experiments?\b|the lab/.test(s) && !named.length) {
      const lab = ITEMS.filter((it) => it.kind === 'lab');
      lastResults = lab;
      mark(lab.map((i) => i.slug));
      return say(['<span class="ok">LAB / UNFINISHED</span>', '', ...lab.map((it) => `${link(it)}  <span class="dim">${esc(it.status.toUpperCase())}</span>`), '',
        'These are experiments rather than finished products.', '<span class="dim">type <b>open</b> for the first, or <b>lab</b> to see them all.</span>']);
    }

    // journey / relations
    if (/connect|in common|what links|relat|similar|recommend|what (should|else)|where next|what next/.test(s) && !(named.length === 1 && !/these|them|both/.test(s))) {
      if (/these|them|both|i('ve| have) (seen|viewed|looked)|so far/.test(s) || !here) return related(journey.slice(-4));
      return related([here.slug]);
    }
    if (/\bcompare\b|\bvs\.?\b|versus|differen(ce|t) between/.test(s) && named.length >= 2) {
      const [a, b] = named;
      const row = (k, fa, fb) => `${k.padEnd(10)} <span class="dim">${esc(fa)}</span>\n${''.padEnd(10)} <span class="dim">${esc(fb)}</span>`;
      TOOLS.highlight_items({ slugs: [a.slug, b.slug] });
      return say([`${link(a)}  vs  ${link(b)}`, '', row('FIELD', a.discipline, b.discipline), row('STACK', a.stack.join(', '), b.stack.join(', ')), row('QUESTION', a.question, b.question),
        `SHARED     <span class="ok">${esc(overlap(a, b).join(' · ') || 'nothing obvious')}</span>`]);
    }

    // questions about a specific project
    const strong = /\b(how|why|difficult|hard|challeng|architect|system|diagram|stack|tech|process|result|outcome|next|future|code|github|repo|source|explain|built)/.test(s);
    const target = named.length === 1 ? named[0] : (named.length === 0 && here && (strong || /\b(this|it|project|here)\b/.test(s)) ? here : null);
    const qWords = /\b(how|why|what|which|difficult|hard|challeng|architect|system|diagram|stack|tech|process|result|outcome|next|future|code|github|repo|source|explain|tell|about|show)/;
    if (target && (qWords.test(s) || named.length === 1)) {
      if (named.length === 1 && /^(open|go to|show|take me to|see)\b/.test(s) && !qWords.test(s.replace(/^(show)\b/, ''))) { TOOLS.open_item({ slug: target.slug }); return say([`opening ${link(target)}…`]); }
      return answerAbout(target, q);
    }

    // about richmond
    if (/\b(cv|resume|résumé)\b/.test(s)) return say(['Richmond’s CV:', linkBtns(['cv'])]);
    if (/contact|email|reach|get in touch|hire him|talk to/.test(s)) return say(['Best way to reach Richmond:', linkBtns(['email', 'linkedin', 'github'])]);
    if (/experience|intern|worked|job|background|career/.test(s)) {
      TOOLS.navigate({ page: 'about', section: 'experience' });
      return say(D.about.experience.map((x) => `${esc(x.when.padEnd(14))} ${esc(x.role)} <span class="dim">— ${esc(x.org)}</span>`));
    }
    if (/\b(tech )?stack|skills|languages|tools|technolog/.test(s) && !terms(q).some((w) => VOCAB.includes(w))) {
      TOOLS.navigate({ page: 'about', section: 'tools' });
      return say([D.about.tools.map(esc).join(' · ')]);
    }
    if (/who (is|are)|about (him|richmond|you)|whoami|introduce/.test(s)) return L.CMDS.whoami();

    // category filter
    const cat = CATS.find((c) => c !== 'all' && new RegExp(`\\b${c.replace(/s$/, '')}s?\\b`).test(s));
    const rest = terms(q).filter((w) => w !== cat && !CATS.includes(w));
    if (cat && rest.length === 0) {
      const res = TOOLS.filter_collection({ category: cat });
      lastResults = ITEMS.filter((i) => i.cats.includes(cat));
      return say([`${res}.`, ...lastResults.map((it) => '   ' + link(it))]);
    }

    // search
    const hits = search(q);
    if (hits.length) {
      lastResults = hits;
      const noun = hits.every((h) => h.kind === 'lab') ? 'experiment' : hits.every((h) => h.kind === 'work') ? 'project' : 'item';
      await say([`Found ${hits.length} ${noun}${hits.length === 1 ? '' : 's'}.`, '', ...hits.slice(0, 5).map((it) => itemBlock(it) + '\n')]);
      mark(hits.map((h) => h.slug));
      return say([`<span class="dim">type <b>open</b> for ${hits[0].short}, <b>open ${hits[Math.min(1, hits.length - 1)].no}</b> for another, or ask how one works.</span>`]);
    }
    return say([`Nothing in the lab matches “${esc(q)}” yet.`, '<span class="dim">try: <i>computer vision</i> · <i>show me something weird</i> · <i>i’m hiring</i> · <b>help</b></span>']);
  }

  /* ================================================ Claude (remote) */
  let mode = 'probing';
  let convo = ss.get('convo', []);
  const modeEl = document.createElement('span');
  modeEl.className = 'agent-mode';
  $('#term-form').insertBefore(modeEl, $('#term-toggle'));
  const setMode = (m) => { mode = m; modeEl.textContent = m === 'remote' ? '● agent' : m === 'local' ? '○ local agent' : ''; modeEl.title = m === 'remote' ? 'Answers by Claude, operating this site' : 'Rule-based agent running in your browser'; };
  setMode('probing');
  fetch(API, { method: 'GET' }).then((r) => r.ok ? r.json() : { ready: false }).then((j) => setMode(j.ready ? 'remote' : 'local')).catch(() => setMode('local'));

  const renderText = (text) => esc(text.trim())
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (m, slug) => (bySlug(slug) ? link(bySlug(slug)) : m))
    .replace(/\*\*(.+?)\*\*/g, '$1');
  const visitorContext = () => `<visitor_context>\npage: ${route.page}${route.slug ? '/' + route.slug : ''}\nviewed this session: ${journey.join(', ') || 'nothing yet'}\nstated goal: ${persona || 'unknown'}\ntour active: ${tour.data ? tour.data.title : 'no'}\n</visitor_context>\n\n`;

  async function remoteAsk(q) {
    if (convo.length > 28) convo = [];
    convo.push({ role: 'user', content: [{ type: 'text', text: visitorContext() + q }] });
    const spin = spinner('thinking');
    let step = 0;
    try {
      for (; step < 6; step++) {
        const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: convo }) });
        if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
        const data = await r.json();
        if (data.stop_reason === 'refusal') { convo = []; spin.remove(); return say(['I can only help with Richmond’s work here.']); }
        convo.push({ role: 'assistant', content: data.content });
        for (const b of data.content) if (b.type === 'text' && b.text.trim()) { spin.remove(); print(renderText(b.text), 'agent'); }
        if (data.stop_reason !== 'tool_use') break;
        const results = data.content.filter((b) => b.type === 'tool_use').map((b) => {
          try {
            const fn = TOOLS[b.name];
            if (!fn) throw new Error(`unknown tool ${b.name}`);
            print(`<span class="dim">↳ ${esc(b.name.replace(/_/g, ' '))}</span>`, 'agent');
            return { type: 'tool_result', tool_use_id: b.id, content: String(fn(b.input || {})) };
          } catch (e) {
            return { type: 'tool_result', tool_use_id: b.id, content: String(e.message), is_error: true };
          }
        });
        convo.push({ role: 'user', content: results });
      }
    } catch (e) {
      spin.remove();
      convo = [];
      if (step === 0 && (!e.status || [404, 405, 501, 503].includes(e.status))) { setMode('local'); return localAsk(q); }
      if (e.status === 429) { print('<span class="dim">the lab is busy, so answering locally for now.</span>', 'agent'); return localAsk(q); }
      print(`<span class="err">agent error (${esc(e.message)}), falling back to the local agent.</span>`, 'agent');
      return localAsk(q);
    } finally {
      spin.remove();
      // history must end on a finished assistant turn, or the next request is invalid
      const last = convo[convo.length - 1];
      if (last && (last.role !== 'assistant' || last.content.some((b) => b.type === 'tool_use'))) convo = [];
      ss.set('convo', convo);
    }
  }

  /* ================================================ public API + wiring */
  let busy = false;
  async function ask(q) {
    if (busy) return;
    busy = true;
    openTerm(true);
    try { if (mode === 'remote') await remoteAsk(q); else await localAsk(q); }
    finally { busy = false; }
  }

  L.agent = {
    ask,
    openLast() {
      if (!lastResults.length) return false;
      TOOLS.open_item({ slug: lastResults[0].slug });
      print(`opening ${link(lastResults[0])}…`, 'agent');
      return true;
    },
  };
  Object.assign(L.CMDS, {
    tour: (arg) => {
      if (!arg) return say(['Pick a tour: ' + Object.keys(PERSONAS).map((k) => `<b>tour ${k}</b>`).join(' · '), '<span class="dim">or describe one: <i>show me the projects that best demonstrate AI</i></span>']);
      if (PERSONAS[arg]) return choosePersona(arg);
      if (arg === 'end' || arg === 'stop') return tour.end();
      if (arg === 'next') return tour.next();
      if (arg === 'prev' || arg === 'back') return tour.prev();
      return ask('tour ' + arg);
    },
    journey: () => journey.length
      ? say(['You have explored:', ...journey.map((s, i) => `   ${pad(i + 1)} ${link(bySlug(s))}`), '', '<span class="dim">ask <i>what connects these?</i></span>'])
      : say(['Nothing yet. Open a project and I’ll remember the path.']),
    agent: () => say([mode === 'remote'
      ? '● agent: <span class="ok">Claude</span>, operating this site through tools (open, filter, highlight, tour).'
      : '○ agent: <span class="ok">local</span>, a rule-based planner running in your browser. Deploy with an API key to use Claude.',
    '<span class="dim">it acts on the site rather than just chatting. it only knows what’s documented here.</span>']),
  });

  document.addEventListener('lab:route', (e) => {
    route = e.detail;
    if ((route.page === 'work' || route.page === 'lab') && route.slug && bySlug(route.slug)) {
      journey = journey.filter((s) => s !== route.slug).concat(route.slug).slice(-12);
      ss.set('journey', journey);
    }
    if (pendingSection) { const sct = pendingSection; pendingSection = null; setTimeout(() => scrollToSection(sct), REDUCED ? 0 : 450); }
    if (pendingHighlight) { const h = pendingHighlight; pendingHighlight = null; setTimeout(() => pulse(h), 200); }
    tour.sync();
  });

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goal]');
    if (g) { print(esc(g.textContent), 'cmd'); return choosePersona(g.dataset.goal); }
    if (e.target.closest('[data-tour-start]') && pendingTour) { tour.start(pendingTour); pendingTour = null; return; }
    if (e.target.closest('[data-tour-skip]')) { pendingTour = null; return print('<span class="dim">ok. the collection is all yours.</span>', 'agent'); }
    const tg = e.target.closest('[data-tour-go]');
    if (tg) return tour[tg.dataset.tourGo]();
    const a = e.target.closest('[data-ask]');
    if (a) { print(esc(a.dataset.ask), 'cmd'); return ask(a.dataset.ask); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('.ask-form');
    if (!f) return;
    e.preventDefault();
    const inp = $('input', f);
    const q = inp.value.trim();
    if (!q) return;
    inp.value = '';
    print(esc(q), 'cmd');
    ask(q);
  });
  document.addEventListener('keydown', (e) => {
    if (!tour.data || /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') tour.next();
    else if (e.key === 'ArrowLeft') tour.prev();
  });

  // the first route rendered before this script loaded
  {
    const [a, b] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    route = { page: a || 'home', slug: b || null };
    if ((a === 'work' || a === 'lab') && b && bySlug(b) && !journey.includes(b)) { journey.push(b); ss.set('journey', journey); }
  }
  tour.render();
  tour.sync();
})();
