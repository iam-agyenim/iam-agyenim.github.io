/* ==========================================================================
   Richmond Agyenim-Boateng · portfolio
   Loads content.json, draws the page from it, then wires up:
   - The name: letters grow heavier as the pointer comes near
   - The board: every project with a piece moves by real chess rules
   - Work filters, click-to-load video, scroll reveals
   ========================================================================== */

(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const { esc, rich, safeUrl, isExternal, projectUrl, GLYPH, NAME, VS, media, wireVideos } = window.PF;
  const FILES = 'abcdefgh';

  fetch('content.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((data) => {
      render(data);
      interact(data);
      // The page was empty when the browser tried to jump to #project-id.
      const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    })
    .catch((err) => {
      console.error(err);
      $('main').insertAdjacentHTML('afterbegin', '<p class="wrap load-error">Could not load content.json.</p>');
    });

  /* ============================================================ render */
  function render(data) {
    const { site, board, work, categories, contact, projects } = data;

    document.title = site.title || `${site.firstName} ${site.lastName}`;
    $('meta[name="description"]').setAttribute('content', site.description || '');

    // hero
    $('#roles').innerHTML = (site.roles || []).map(esc).join('<span class="sep">×</span>');
    $('#places').textContent = site.places || '';
    $('#name').setAttribute('aria-label', `${site.firstName} ${site.lastName}`);
    $('#first-name').textContent = site.firstName;
    const parts = (site.lastName || '').split('-');
    $('#last-name').innerHTML = parts
      .map((p) => `<span data-split>${esc(p)}</span>`)
      .join('<span class="dash" aria-hidden="true">–</span>');
    $('#quote').hidden = !site.quote;
    $('#quote-text').textContent = site.quote || '';
    $('#quote-author').textContent = site.quoteAuthor ? `— ${site.quoteAuthor}` : '';
    $('#disciplines').innerHTML = (site.disciplines || []).map(esc).join('<br />');

    // board headings
    const about = data.about || {};
    $('#about').hidden = !(about.text || '').trim();
    $('#about-title').textContent = about.title || 'About';
    $('#about-text').innerHTML = String(about.text || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');
    const exploring = String(about.exploring || '').split('\n').map((t) => t.trim()).filter(Boolean);
    $('#about-exploring-wrap').hidden = !exploring.length;
    $('#about-exploring-title').textContent = about.exploringTitle || 'Now exploring';
    $('#about-exploring').innerHTML = exploring.map((t) => `<li>${esc(t)}</li>`).join('');

    $('#board-heading').textContent = board.title;
    $('#board-sub').textContent = board.subtitle;

    // work
    $('#work-title').textContent = work.title;
    $('#filters').innerHTML = [{ id: 'all', label: 'All' }, ...categories]
      .map((c, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-filter="${esc(c.id)}" aria-pressed="${!i}">${esc(c.label)}</button>`)
      .join('');
    const featured = projects.filter((p) => p.featured);
    const rest = projects.filter((p) => !p.featured);
    $('#featured').innerHTML = featured.map((p) => projectCard(p, true)).join('');
    $('#grid').innerHTML = rest.map((p) => projectCard(p, false)).join('');

    // contact
    $('#contact-title').textContent = contact.title;
    $('#contact-text').textContent = contact.text;
    const mail = $('#contact-email');
    mail.textContent = contact.email;
    mail.href = `mailto:${contact.email}`;
    $('#contact-links').innerHTML = (contact.links || [])
      .map((l) => `<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`)
      .join('');

    $('#foot-name').textContent = `${site.firstName} ${site.lastName}`;
    $('#foot-line').textContent = site.footer || '';
    $('#year').textContent = new Date().getFullYear();
  }

  function projectCard(p, featured) {
    const href = projectUrl(p.id);
    const glyph = p.piece && GLYPH[p.piece.type] ? `<b class="glyph" aria-hidden="true">${GLYPH[p.piece.type]}${VS}</b> ` : '';
    const how = (p.how || []).filter(Boolean);
    const story = featured
      ? `<div class="story">${how.map((t) => `<p>${rich(t)}</p>`).join('')}</div>`
      : how.length
        ? `<details><summary>${esc(p.howTitle || 'How I made it')}</summary>${how.map((t) => `<p>${rich(t)}</p>`).join('')}</details>`
        : '';
    const tools = (p.tools || []).length
      ? `<ul class="tools" aria-label="Tools">${p.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
      : '';
    const links = `<p class="links"><a class="open-link" href="${href}">Open project →</a>${(p.links || []).map((l) => `<a href="${esc(safeUrl(l.url))}"${isExternal(l.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)} ↗</a>`).join('')}</p>`;
    // A card with a "Play the video" button keeps its picture clickable for the video.
    const pic = p.media && p.media.embed
      ? media(p)
      : `<a class="media-link" href="${href}" tabindex="-1" aria-hidden="true">${media(p)}</a>`;
    return `
      <article class="project${featured ? ' featured' : ''}" data-cat="${esc((p.categories || []).join(' '))}" id="${esc(p.id)}">
        ${pic}
        <div class="project-body">
          <p class="meta mono">${glyph}${esc(p.meta || '')}</p>
          <h3><a href="${href}">${esc(p.title)}</a></h3>
          <p class="pitch">${rich(p.pitch || '')}</p>
          ${story}${tools}${links}
        </div>
      </article>`;
  }

  /* ======================================================= interaction */
  function interact(data) {
    nameHover();
    chess(data);
    filters();
    wireVideos();
    reveal();
  }

  /* ---------------------------------------------------------- the name */
  function nameHover() {
    const letters = [];
    $$('[data-split]').forEach((word) => {
      const text = word.textContent;
      word.textContent = '';
      word.setAttribute('aria-hidden', 'true');
      [...text].forEach((c) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        word.appendChild(s);
        letters.push(s);
      });
    });
    if (reduceMotion) return;

    const hero = $('.hero');
    let pending = false;
    let pointer = null;

    const weigh = () => {
      pending = false;
      if (!pointer) return;
      const reach = Math.max(180, innerWidth * 0.16);
      letters.forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - pointer.x, r.top + r.height / 2 - pointer.y);
        const k = Math.max(0, 1 - d / reach);
        el.style.setProperty('--w', Math.round(300 + 560 * k * k));
        el.style.setProperty('--lift', `${(-0.04 * k).toFixed(3)}em`);
      });
    };

    hero.addEventListener('pointermove', (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!pending) { pending = true; requestAnimationFrame(weigh); }
    });
    hero.addEventListener('pointerleave', () => {
      pointer = null;
      letters.forEach((el) => { el.style.removeProperty('--w'); el.style.removeProperty('--lift'); });
    });

    // A wave through the name once fonts are in.
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      letters.forEach((el, i) => {
        setTimeout(() => {
          if (pointer) return;
          el.style.setProperty('--w', 820);
          setTimeout(() => { if (!pointer) el.style.removeProperty('--w'); }, 420);
        }, 300 + i * 55);
      });
    });
  }

  /* --------------------------------------------------------- the board */
  function chess(data) {
    const toSq = (s) => {
      const m = /^([a-h])([1-8])$/.exec((s || '').toLowerCase());
      return m ? { f: FILES.indexOf(m[1]), r: Number(m[2]) - 1 } : null;
    };
    const START = data.projects
      .filter((p) => p.piece && GLYPH[p.piece.type] && toSq(p.piece.square))
      .map((p) => ({
        type: p.piece.type, ...toSq(p.piece.square),
        title: p.title, card: p.id, why: p.piece.why || '', pitch: p.pitch || '',
        promotion: p.piece.promotion || 'Promoted. It made it across the board and became a queen.',
      }));

    const board = $('#chess');
    const squaresEl = $('.squares', board);
    const piecesEl = $('.pieces', board);
    const panelBody = $('#panel-body');
    const logEl = $('#log');
    const intro = () => `
      <p class="panel-piece mono">Your move</p>
      <h3 class="panel-title">${esc(data.board.introTitle)}</h3>
      <p class="panel-text">${esc(data.board.introText)}</p>`;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const s = document.createElement('span');
        if ((row + col) % 2 === 1) s.className = 'd';
        if (col === 0) s.dataset.rank = 8 - row;
        squaresEl.appendChild(s);
      }
    }

    let pieces = [];
    let selected = null;
    let moveNo = 0;
    let touched = false;
    const sq = (f, r) => `${FILES[f]}${r + 1}`;
    const at = (f, r) => pieces.find((p) => p.f === f && p.r === r);
    const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;

    function place(p) {
      p.el.style.setProperty('--f', p.f);
      p.el.style.setProperty('--r', p.r);
      p.el.setAttribute('aria-label', `${NAME[p.type]}: ${p.title}, on ${sq(p.f, p.r)}`);
      p.el.firstChild.textContent = GLYPH[p.type] + VS;
    }

    function build() {
      piecesEl.replaceChildren();
      pieces = [];
      START.forEach((d) => {
        if (at(d.f, d.r)) return; // two pieces on one square: keep the first
        const p = { ...d };
        p.el = document.createElement('button');
        p.el.type = 'button';
        p.el.className = 'piece';
        p.el.appendChild(document.createElement('span'));
        p.el.addEventListener('click', () => { touched = true; select(p); });
        piecesEl.appendChild(p.el);
        pieces.push(p);
        place(p);
      });
    }

    function movesFor(p) {
      const out = [];
      const slide = (dirs) => dirs.forEach(([df, dr]) => {
        let f = p.f + df, r = p.r + dr;
        while (onBoard(f, r) && !at(f, r)) { out.push([f, r]); f += df; r += dr; }
      });
      const step = (dirs) => dirs.forEach(([df, dr]) => {
        const f = p.f + df, r = p.r + dr;
        if (onBoard(f, r) && !at(f, r)) out.push([f, r]);
      });
      const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      switch (p.type) {
        case 'K': step([...ORTHO, ...DIAG]); break;
        case 'Q': slide([...ORTHO, ...DIAG]); break;
        case 'R': slide(ORTHO); break;
        case 'B': slide(DIAG); break;
        case 'N': step([[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]); break;
        case 'P':
          if (onBoard(p.f, p.r + 1) && !at(p.f, p.r + 1)) {
            out.push([p.f, p.r + 1]);
            if (p.r === 1 && !at(p.f, p.r + 2)) out.push([p.f, p.r + 2]);
          }
          break;
      }
      return out;
    }

    const clearTargets = () => $$('.target', piecesEl).forEach((t) => t.remove());

    function showPanel(html) {
      panelBody.innerHTML = html;
      panelBody.classList.remove('swap');
      void panelBody.offsetWidth;
      panelBody.classList.add('swap');
    }

    function describe(p) {
      showPanel(`
        <p class="panel-piece mono"><b>${GLYPH[p.type]}${VS}</b> ${NAME[p.type]} · ${sq(p.f, p.r)}</p>
        <h3 class="panel-title">${esc(p.title)}</h3>
        ${p.why ? `<p class="panel-why">${rich(p.why)}</p>` : ''}
        <p class="panel-text">${rich(p.pitch)}</p>
        <a class="panel-link" href="${projectUrl(p.card)}">Open the project →</a>`);
    }

    function select(p) {
      if (selected) selected.el.classList.remove('sel');
      clearTargets();
      if (selected === p) { selected = null; return; }
      selected = p;
      p.el.classList.add('sel');
      describe(p);
      const moves = movesFor(p);
      moves.forEach(([f, r]) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'target';
        t.style.setProperty('--f', f);
        t.style.setProperty('--r', r);
        t.setAttribute('aria-label', `Move ${p.title} to ${sq(f, r)}`);
        t.addEventListener('click', () => { touched = true; move(p, f, r); });
        piecesEl.appendChild(t);
      });
      if (!moves.length) logEl.textContent = `${p.title} is boxed in. Move something else first.`;
    }

    function move(p, f, r) {
      const from = sq(p.f, p.r);
      $$('.trail', piecesEl).forEach((t) => t.remove());
      const trail = document.createElement('span');
      trail.className = 'trail';
      trail.style.setProperty('--f', p.f);
      trail.style.setProperty('--r', p.r);
      piecesEl.prepend(trail);

      clearTargets();
      p.el.classList.remove('sel');
      p.el.classList.add('moving');
      p.f = f; p.r = r;
      moveNo++;

      if (p.type === 'P' && r === 7) {
        p.type = 'Q';
        p.el.classList.add('promoted');
        p.why = p.promotion;
      }
      place(p);
      setTimeout(() => p.el.classList.remove('moving'), 520);
      logEl.textContent = `${moveNo}. ${GLYPH[p.type]}${VS} ${from} → ${sq(f, r)}`;
      describe(p);
      selected = null;
    }

    function autoMove() {
      const movable = pieces.filter((p) => movesFor(p).length);
      if (!movable.length) return;
      const p = movable[Math.floor(Math.random() * movable.length)];
      const moves = movesFor(p);
      const [f, r] = moves[Math.floor(Math.random() * moves.length)];
      select(p);
      setTimeout(() => move(p, f, r), reduceMotion ? 0 : 650);
    }

    function reset() {
      selected = null;
      moveNo = 0;
      build();
      logEl.textContent = 'No moves yet.';
      showPanel(intro());
    }

    reset();
    $('#auto').addEventListener('click', () => { touched = true; autoMove(); });
    $('#reset').addEventListener('click', () => { touched = true; reset(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selected) { selected.el.classList.remove('sel'); clearTargets(); selected = null; }
    });

    // Until the visitor touches the board, it plays a few moves by itself.
    if (!reduceMotion && 'IntersectionObserver' in window) {
      let idle = null;
      let played = 0;
      new IntersectionObserver(([entry]) => {
        clearInterval(idle);
        if (entry.isIntersecting && !touched && played < 6) {
          idle = setInterval(() => {
            if (touched || played >= 6) { clearInterval(idle); return; }
            played++;
            autoMove();
          }, 2600);
        }
      }, { threshold: 0.5 }).observe(board);
    }
  }

  /* ----------------------------------------------------------- filters */
  function filters() {
    const chips = $$('.chip');
    const projects = $$('.project');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle('on', on);
        c.setAttribute('aria-pressed', on);
      });
      projects.forEach((p) => {
        p.hidden = f !== 'all' && !p.dataset.cat.split(' ').includes(f);
      });
    }));
  }

  /* ----------------------------------------------------------- reveal */
  function reveal() {
    const revealables = $$('.section-head, .play-grid, .project, .contact > *');
    if (!('IntersectionObserver' in window) || reduceMotion) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealables.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
  }
})();
