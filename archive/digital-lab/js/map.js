/* ==========================================================================
   RICHMOND / DIGITAL LAB — atlas
   A faint, living topographic map behind the home screen. Every project is
   a summit; related work is linked; a small viewport wanders between them.
   The agent can point at places on it, and your journey is traced on it.
   ========================================================================== */
(() => {
  const L = window.LAB;
  const { ITEMS, esc } = L;
  const REDUCED = window.REDUCED_MOTION;
  const TAU = Math.PI * 2;
  const bySlug = (s) => ITEMS.find((i) => i.slug === s);

  // node positions inside the map region (0..1)
  const POS = {
    'gesture-arm': [0.22, 0.06], 'campus-explorer-vr': [0.7, 0.02], 'learnai': [0.94, 0.22],
    'news-intelligence': [0.5, 0.3], 'voice-car': [0.1, 0.44], 'finger': [0.36, 0.6],
    'air-harp': [0.8, 0.5], 'mirror-of-expectation': [0.62, 0.78], 'holographic-mirror': [0.94, 0.9], 'digital-diet': [0.18, 0.9],
  };
  const tagset = (it) => new Set([...(it.tags || []), ...it.cats, ...it.stack.map((s) => s.toLowerCase())].filter((x) => !['experiments', 'unfinished', 'weird'].includes(x)));
  const EDGES = [];
  ITEMS.forEach((a, i) => ITEMS.forEach((b, j) => {
    if (j <= i) return;
    const A = tagset(a);
    const shared = [...tagset(b)].filter((x) => A.has(x)).length;
    if (shared >= 2) EDGES.push([a.slug, b.slug, shared]);
  }));

  /* ------------------------------------------------ DOM */
  const layer = document.createElement('div');
  layer.className = 'atlas';
  layer.innerHTML = `<canvas aria-hidden="true"></canvas>
    <nav class="atlas-nodes" aria-label="Map of the lab">${ITEMS.map((it) =>
      `<a href="${it.href}" data-slug="${it.slug}"><i></i><span>${it.no} ${esc(it.short.toUpperCase())}</span></a>`).join('')}</nav>
    <div class="atlas-win" aria-hidden="true"><canvas></canvas><span></span></div>`;
  document.body.insertBefore(layer, document.querySelector('main'));
  const cv = layer.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const win = layer.querySelector('.atlas-win');
  const winVis = new VisCanvas(win.querySelector('canvas'), null, 0);
  const nodeEls = Object.fromEntries([...layer.querySelectorAll('.atlas-nodes a')].map((a) => [a.dataset.slug, a]));

  let W = 0, H = 0, wide = true;
  const region = () => (wide ? { x: W * 0.56, y: H * 0.14, w: W * 0.4, h: H * 0.72 } : { x: W * 0.08, y: H * 0.1, w: W * 0.84, h: H * 0.8 });
  const px = (slug) => { const r = region(); const [u, v] = POS[slug] || [0.5, 0.5]; return [r.x + u * r.w, r.y + v * r.h]; };

  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight; wide = W >= 1000;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ITEMS.forEach((it) => {
      const [x, y] = px(it.slug);
      const el = nodeEls[it.slug];
      const flip = x + el.offsetWidth + 16 > W;
      el.classList.toggle('flip', flip);
      el.style.transform = `translate(${flip ? x - el.offsetWidth + 4 : x - 4}px, ${y - 7}px)`;
    });
    placeWindow();
  }

  /* ------------------------------------------------ focus + wandering */
  let focus = null, prev = null, focusAt = 0, pinnedUntil = 0, lastWander = 0;
  let marked = new Set(), markedUntil = 0;
  let journey = [];
  const readJourney = () => { try { journey = JSON.parse(sessionStorage.getItem('rdl:journey') || '[]').filter((s) => POS[s]); } catch { journey = []; } };

  function placeWindow() {
    if (!focus) return;
    const [x, y] = px(focus);
    const ww = 168, left = x + ww + 40 > W ? x - ww - 22 : x + 22;
    win.style.transform = `translate(${left}px, ${Math.max(70, Math.min(H - 170, y - 50))}px)`;
  }
  function setFocus(slug, pinMs = 0) {
    if (!POS[slug]) return;
    if (slug !== focus) { prev = focus; focus = slug; focusAt = performance.now(); }
    if (pinMs) pinnedUntil = performance.now() + pinMs;
    const it = bySlug(slug);
    win.classList.remove('on');
    setTimeout(() => {
      winVis.set(it.vis, it.hue);
      win.querySelector('span').textContent = `FIG. ${it.no} — ${it.short.toUpperCase()}`;
      placeWindow();
      win.classList.add('on');
    }, REDUCED ? 0 : 280);
    Object.entries(nodeEls).forEach(([s, el]) => el.classList.toggle('focus', s === slug));
  }
  function wander(now) {
    if (now < pinnedUntil || now - lastWander < 5200) return;
    lastWander = now;
    const near = EDGES.filter((e) => e[0] === focus || e[1] === focus).map((e) => (e[0] === focus ? e[1] : e[0])).filter((s) => s !== prev);
    const pool = near.length && Math.random() < 0.75 ? near : ITEMS.map((i) => i.slug).filter((s) => s !== focus);
    setFocus(pool[Math.floor(Math.random() * pool.length)]);
  }

  /* ------------------------------------------------ drawing */
  const CELL = 16;
  let field = new Float32Array(0), cols = 0, rows = 0;
  function computeField(t) {
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
    if (field.length !== cols * rows) field = new Float32Array(cols * rows);
    const s = Math.min(W, H) / 3.2;
    const peaks = ITEMS.map((it) => {
      const [x, y] = px(it.slug);
      const lift = it.slug === focus ? 0.6 * Math.min(1, (performance.now() - focusAt) / 1200) : 0;
      return [x, y, (it.kind === 'work' ? 1.5 : 1.1) + lift + (marked.has(it.slug) ? 0.5 : 0)];
    });
    const sig2 = 2 * Math.pow(Math.min(W, H) * 0.075, 2);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * CELL, y = j * CELL, u = x / s, v = y / s;
        let f = 0.45 * Math.sin(u * 1.3 + t * 0.06) + 0.45 * Math.sin(v * 1.7 - t * 0.045) + 0.3 * Math.sin((u - v) * 2.2 + t * 0.035) + 0.2 * Math.sin(u * 3.1 + v * 2.3 - t * 0.05);
        for (const [px_, py_, hgt] of peaks) {
          const dx = x - px_, dy = y - py_;
          const d2 = dx * dx + dy * dy;
          if (d2 < sig2 * 5) f += hgt * Math.exp(-d2 / sig2);
        }
        field[j * cols + i] = f;
      }
    }
  }
  function contours() {
    const lerp = (a, b, lv) => (lv - a) / (b - a || 1e-6);
    for (let k = 0, lv = -1.2; lv <= 2.6; lv += 0.28, k++) {
      const major = k % 4 === 0;
      ctx.strokeStyle = major ? 'rgba(236,233,226,.11)' : 'rgba(236,233,226,.05)';
      ctx.lineWidth = major ? 1 : 0.8;
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x = i * CELL, y = j * CELL;
          const T = [x + CELL * lerp(a, b, lv), y], R = [x + CELL, y + CELL * lerp(b, c, lv)];
          const B = [x + CELL * lerp(d, c, lv), y + CELL], Lf = [x, y + CELL * lerp(a, d, lv)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (idx) {
            case 1: case 14: seg(Lf, B); break;
            case 2: case 13: seg(B, R); break;
            case 3: case 12: seg(Lf, R); break;
            case 4: case 11: seg(T, R); break;
            case 5: seg(Lf, T); seg(B, R); break;
            case 6: case 9: seg(T, B); break;
            case 7: case 8: seg(Lf, T); break;
            case 10: seg(T, R); seg(Lf, B); break;
          }
        }
      }
      ctx.stroke();
    }
  }
  function frame(t, now) {
    ctx.clearRect(0, 0, W, H);
    computeField(t);
    contours();
    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(236,233,226,.22)';
    // edge ticks + coordinates (Abu Dhabi)
    ctx.strokeStyle = 'rgba(236,233,226,.14)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 80; x < W; x += 80) { ctx.moveTo(x + 0.5, H - 6); ctx.lineTo(x + 0.5, H); }
    for (let y = 80; y < H; y += 80) { ctx.moveTo(W - 6, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.textAlign = 'right';
    if (W >= 600) ctx.fillText('N 24.4539°  E 54.3773°', W - 14, H - 14);
    if (W >= 600) ctx.fillText(`ELEV ${(1.2 + Math.sin(t * 0.3) * 0.2).toFixed(2)} · ${ITEMS.length} SUMMITS`, W - 14, H - 28);
    ctx.textAlign = 'left';
    if (!wide) return;

    // related work
    ctx.setLineDash([2, 5]);
    EDGES.forEach(([a, b, n]) => {
      const hot = a === focus || b === focus;
      ctx.strokeStyle = hot ? 'rgba(236,233,226,.3)' : `rgba(236,233,226,${0.05 + n * 0.015})`;
      const [x1, y1] = px(a), [x2, y2] = px(b);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.setLineDash([]);
    // the visitor's journey
    if (journey.length > 1) {
      ctx.strokeStyle = 'rgba(242,210,27,.4)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      journey.forEach((s, i) => { const [x, y] = px(s); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      const [lx, ly] = px(journey[journey.length - 1]);
      ctx.fillStyle = 'rgba(242,210,27,.7)'; ctx.fillText('YOU', lx + 10, ly + 16);
    }
    // wandering route from the previous stop
    if (prev && focus) {
      const p = Math.min(1, (now - focusAt) / 1400);
      const [x1, y1] = px(prev), [x2, y2] = px(focus);
      ctx.strokeStyle = 'rgba(236,233,226,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); ctx.stroke();
    }
    // focus + marked rings
    const ring = (slug, color, phase) => {
      const [x, y] = px(slug);
      const k = ((now / 1000 + phase) % 2) / 2;
      ctx.strokeStyle = color.replace('A', String(0.5 * (1 - k)));
      ctx.beginPath(); ctx.arc(x, y, 6 + k * 26, 0, TAU); ctx.stroke();
    };
    if (focus) ring(focus, 'rgba(236,233,226,A)', 0);
    if (now < markedUntil) marked.forEach((s, i) => ring(s, 'rgba(242,210,27,A)', i * 0.3));
    else if (marked.size) { marked = new Set(); Object.values(nodeEls).forEach((el) => el.classList.remove('hl')); }
  }

  /* ------------------------------------------------ loop */
  let raf = 0, tick = 0;
  const active = () => document.body.classList.contains('is-home');
  function loop(now) {
    raf = 0;
    if (!active()) return;
    if (tick++ % 2 === 0) {
      if (tick % 60 === 1) readJourney();
      if (wide) wander(now);
      frame(now / 1000, now);
    }
    raf = requestAnimationFrame(loop);
  }
  function start() {
    readJourney();
    resize();
    if (!focus && wide) setFocus(journey[journey.length - 1] || ITEMS[0].slug);
    if (REDUCED) { frame(12, performance.now()); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { if (active()) { resize(); if (REDUCED) frame(12, performance.now()); } });
  document.addEventListener('lab:route', () => { if (active()) start(); });
  layer.addEventListener('pointerover', (e) => { const a = e.target.closest('a[data-slug]'); if (a) setFocus(a.dataset.slug, 8000); });

  L.map = {
    active,
    focus(slugs) {
      const valid = [].concat(slugs).filter((s) => POS[s]);
      if (!valid.length) return;
      marked = new Set(valid); markedUntil = performance.now() + 9000;
      Object.entries(nodeEls).forEach(([s, el]) => el.classList.toggle('hl', marked.has(s)));
      if (wide) setFocus(valid[0], 12000);
      if (REDUCED) frame(12, performance.now());
    },
  };
  if (active()) start();
})();
