/* ==========================================================================
   Project page: project.html?id=<project-id>
   Shows the project's picture and facts, then its documentation — the blocks
   written in the admin's editor (text, headings, images, galleries, code,
   quotes, lists, tables, videos and embeds).
   ========================================================================== */

(() => {
  const { esc, rich, safeUrl, isExternal, projectUrl, GLYPH, NAME, VS, media, toEmbed, isVideoFile, wireVideos } = window.PF;
  const $ = (s, el = document) => el.querySelector(s);
  const root = $('#project');
  const id = new URLSearchParams(location.search).get('id');

  fetch('content.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then(render)
    .catch((err) => {
      console.error(err);
      root.innerHTML = '<p class="load-error">Could not load this project.</p>';
    });

  function render(data) {
    const { site, categories, projects } = data;
    $('#foot-name').textContent = `${site.firstName} ${site.lastName}`;
    $('#foot-line').textContent = site.footer || '';
    $('#year').textContent = new Date().getFullYear();

    const i = projects.findIndex((p) => p.id === id);
    const p = projects[i];
    if (!p) {
      document.title = `Not found · ${site.firstName} ${site.lastName}`;
      root.innerHTML = `<section class="missing"><p class="num mono">404</p><h1>That project isn't on the board.</h1><p><a class="btn" href="./#work">See all work</a></p></section>`;
      return;
    }

    document.title = `${p.title} · ${site.firstName} ${site.lastName}`;
    $('meta[name="description"]').setAttribute('content', p.pitch || site.description || '');

    const catLabels = (p.categories || [])
      .map((c) => (categories.find((x) => x.id === c) || {}).label)
      .filter(Boolean);
    const blocks = ((p.doc && p.doc.blocks) || []);
    const how = (p.how || []).filter(Boolean);

    const facts = [
      catLabels.length && `<div><dt class="mono">Category</dt><dd>${catLabels.map(esc).join(', ')}</dd></div>`,
      (p.tools || []).length && `<div><dt class="mono">Tools</dt><dd><ul class="tools">${p.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></dd></div>`,
      p.piece && GLYPH[p.piece.type] && `<div><dt class="mono">On the board</dt><dd><span class="glyph">${GLYPH[p.piece.type]}${VS}</span> ${NAME[p.piece.type]}${p.piece.why ? ` · <em>${rich(p.piece.why)}</em>` : ''}</dd></div>`,
      (p.links || []).length && `<div><dt class="mono">Links</dt><dd class="links">${p.links.map((l) => `<a href="${esc(safeUrl(l.url))}"${isExternal(l.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)} ↗</a>`).join('')}</dd></div>`,
    ].filter(Boolean).join('');

    const prev = projects[(i - 1 + projects.length) % projects.length];
    const next = projects[(i + 1) % projects.length];

    root.innerHTML = `
      <article class="case">
        <header class="case-head">
          <p class="crumb mono"><a href="./#work">Work</a> <span>/</span> ${esc(p.title)}</p>
          <p class="meta mono">${p.piece && GLYPH[p.piece.type] ? `<b class="glyph" aria-hidden="true">${GLYPH[p.piece.type]}${VS}</b> ` : ''}${esc(p.meta || '')}</p>
          <h1 class="case-title">${esc(p.title)}</h1>
          <p class="case-pitch">${rich(p.pitch || '')}</p>
        </header>

        <div class="case-media">${media(p)}</div>

        <div class="case-body">
          <aside class="case-facts"><dl>${facts}</dl></aside>
          <div class="doc" id="doc">
            ${how.length ? `<section class="doc-summary">${p.howTitle ? `<h2 class="doc-kicker mono">${esc(p.howTitle)}</h2>` : ''}${how.map((t) => `<p>${rich(t)}</p>`).join('')}</section>` : ''}
            ${blocks.length ? `<div class="doc-blocks">${blocks.map(block).join('')}</div>` : ''}
          </div>
        </div>

        <nav class="case-nav" aria-label="More projects">
          <a href="${projectUrl(prev.id)}" class="case-nav-item"><span class="mono">← Previous</span><b>${esc(prev.title)}</b></a>
          <a href="${projectUrl(next.id)}" class="case-nav-item next"><span class="mono">Next →</span><b>${esc(next.title)}</b></a>
        </nav>
      </article>`;

    wireVideos(root);
    wireCode(root);
    wireLightbox(root);
    highlight();
  }

  /* ---------------------------------------------------- inline HTML */
  // Editor.js stores inline formatting as HTML. Keep only safe tags.
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'CODE', 'A', 'BR', 'SUB', 'SUP']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'NOSCRIPT', 'TEXTAREA', 'SELECT']);
  function clean(html = '') {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html);
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) return;
        if (child.nodeType === Node.ELEMENT_NODE && DROP.has(child.tagName)) { child.remove(); return; }
        if (child.nodeType !== Node.ELEMENT_NODE || !ALLOWED.has(child.tagName)) {
          if (child.nodeType === Node.ELEMENT_NODE) { walk(child); child.replaceWith(...child.childNodes); } else child.remove();
          return;
        }
        const href = child.tagName === 'A' ? child.getAttribute('href') : null;
        [...child.attributes].forEach((a) => child.removeAttribute(a.name));
        if (child.tagName === 'A') {
          const url = safeUrl(href || '');
          child.setAttribute('href', url);
          if (isExternal(url)) { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener'); }
        }
        walk(child);
      });
    };
    walk(tpl.content);
    return tpl.innerHTML;
  }

  /* --------------------------------------------------------- blocks */
  const caption = (c) => (c && String(c).replace(/<[^>]*>/g, '').trim() ? `<figcaption>${clean(c)}</figcaption>` : '');
  const img = (url, alt = '') => `<img src="${esc(safeUrl(url))}" alt="${esc(String(alt).replace(/<[^>]*>/g, ''))}" loading="lazy" data-zoom />`;

  function list(items = [], style = 'unordered') {
    const tag = style === 'ordered' ? 'ol' : 'ul';
    const cls = style === 'checklist' ? ' class="checklist"' : '';
    return `<${tag}${cls}>${items.map((it) => {
      const item = typeof it === 'string' ? { content: it, items: [] } : it || {};
      const checked = style === 'checklist' && item.meta && item.meta.checked;
      return `<li${checked ? ' data-checked' : ''}>${clean(item.content)}${(item.items || []).length ? list(item.items, style) : ''}</li>`;
    }).join('')}</${tag}>`;
  }

  function block(b) {
    const d = (b && b.data) || {};
    switch (b && b.type) {
      case 'paragraph':
        return d.text ? `<p>${clean(d.text)}</p>` : '';
      case 'header': {
        const level = Math.min(4, Math.max(2, Number(d.level) || 2));
        return `<h${level}>${clean(d.text)}</h${level}>`;
      }
      case 'list':
        return list(d.items, d.style);
      case 'image': {
        const url = d.file && d.file.url;
        if (!url) return '';
        const cls = ['doc-image', d.stretched && 'wide', d.withBorder && 'bordered', d.withBackground && 'backed'].filter(Boolean).join(' ');
        return `<figure class="${cls}">${img(url, d.caption)}${caption(d.caption)}</figure>`;
      }
      case 'gallery': {
        const imgs = (d.images || []).filter((x) => x && x.url);
        if (!imgs.length) return '';
        return `<figure class="doc-gallery n${Math.min(imgs.length, 4)}"><div class="doc-gallery-grid">${imgs.map((x) => `<div>${img(x.url, x.caption)}${x.caption ? `<span class="mono">${esc(x.caption)}</span>` : ''}</div>`).join('')}</div>${caption(d.caption)}</figure>`;
      }
      case 'code': {
        if (!d.code) return '';
        const lang = String(d.language || 'plaintext').replace(/[^\w+-]/g, '');
        const label = d.filename ? esc(d.filename) : esc(LANG_NAMES[lang] || lang);
        return `<figure class="doc-code"><div class="doc-code-bar mono"><span>${label}</span><button type="button" class="copy">Copy</button></div><pre><code class="language-${lang}">${esc(d.code)}</code></pre></figure>`;
      }
      case 'quote':
        return d.text ? `<blockquote class="doc-quote"><p>${clean(d.text)}</p>${d.caption ? `<cite class="mono">${clean(d.caption)}</cite>` : ''}</blockquote>` : '';
      case 'delimiter':
        return `<div class="doc-sep" aria-hidden="true">♟${VS} ♟${VS} ♟${VS}</div>`;
      case 'table': {
        const rows = d.content || [];
        if (!rows.length) return '';
        const head = d.withHeadings ? rows[0] : null;
        const body = d.withHeadings ? rows.slice(1) : rows;
        return `<div class="doc-table"><table>${head ? `<thead><tr>${head.map((c) => `<th>${clean(c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${clean(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      case 'embed': {
        if (!d.url) return '';
        const inner = isVideoFile(d.url)
          ? `<video src="${esc(safeUrl(d.url))}" controls playsinline preload="metadata"></video>`
          : `<iframe src="${esc(toEmbed(d.url))}" title="${esc(String(d.caption || 'Embedded media').replace(/<[^>]*>/g, ''))}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen loading="lazy"></iframe>`;
        return `<figure class="doc-embed"><div class="doc-embed-frame">${inner}</div>${caption(d.caption)}</figure>`;
      }
      default:
        return '';
    }
  }

  const LANG_NAMES = {
    plaintext: 'Text', javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', cpp: 'C++ / Arduino',
    csharp: 'C#', xml: 'HTML', css: 'CSS', json: 'JSON', bash: 'Terminal', java: 'Java', glsl: 'GLSL',
  };

  /* -------------------------------------------------------- behaviour */
  function wireCode(scope) {
    scope.querySelectorAll('.doc-code .copy').forEach((btn) => btn.addEventListener('click', async () => {
      const code = btn.closest('.doc-code').querySelector('code').textContent;
      try { await navigator.clipboard.writeText(code); btn.textContent = 'Copied'; }
      catch { btn.textContent = 'Press ⌘C'; }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    }));
  }

  function highlight() {
    const run = () => window.hljs && document.querySelectorAll('.doc-code code').forEach((el) => {
      if (!el.className.includes('plaintext')) window.hljs.highlightElement(el);
    });
    if (window.hljs) run(); else window.addEventListener('load', run, { once: true });
  }

  function wireLightbox(scope) {
    const box = $('#lightbox');
    scope.querySelectorAll('img[data-zoom]').forEach((im) => im.addEventListener('click', () => {
      $('#lightbox-img').src = im.src;
      $('#lightbox-img').alt = im.alt;
      $('#lightbox-cap').textContent = im.alt;
      box.showModal();
    }));
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  }
})();
