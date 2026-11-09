/* ==========================================================================
   Admin editor
   Holds a working copy of content.json, edits it through forms, and saves
   the whole thing with PUT /api/content. Every input carries a data-path
   ("projects.2.title") that says where its value lives.
   ========================================================================== */

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const srcUrl = (u) => (/^(https?:|\/|data:)/.test(u) ? u : `/${u}`);

  const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  const PIECE_NAME = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };
  const VS = '︎';
  const FILES = 'abcdefgh';

  let state = null;     // working copy
  let saved = '';       // JSON of the last saved version
  let view = 'site';
  let errors = [];
  const idTouched = new Set(); // projects whose URL id was typed by hand

  /* --------------------------------------------------------------- api */
  async function call(method, url, body) {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Admin': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/login') { showLogin('Your session ended. Please log in again.'); }
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { data, status: res.status });
    return data;
  }

  /* -------------------------------------------------------------- paths */
  function get(path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
  }
  function set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const obj = keys.reduce((o, k) => o[k], state);
    obj[last] = value;
  }

  /* ------------------------------------------------------------- status */
  const isDirty = () => JSON.stringify(state) !== saved;
  function refreshStatus() {
    const dirty = isDirty();
    const st = $('#status');
    st.textContent = dirty ? 'Unsaved changes' : 'All changes saved';
    st.classList.toggle('dirty', dirty);
    $('#save').classList.toggle('dirty', dirty);
  }

  let toastTimer;
  function toast(msg, bad = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('bad', bad);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* -------------------------------------------------------------- login */
  function showLogin(note) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    if (note) $('#login-note').textContent = note;
    $('#password').focus();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    try {
      await call('POST', '/api/login', { password: $('#password').value });
      $('#password').value = '';
      await start();
    } catch (err) {
      $('#login-error').textContent = err.message;
    }
  });

  async function boot() {
    const s = await fetch('/api/session', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null);
    if (!s) { showLogin(); $('#login-error').textContent = 'The admin server is not running. Start it with npm start.'; return; }
    if (!s.configured) { showLogin(); $('#login-error').textContent = 'Set ADMIN_PASSWORD in .env, then restart the server.'; return; }
    if (s.authed) start(); else showLogin();
  }

  async function start() {
    state = await call('GET', '/api/content');
    saved = JSON.stringify(state);
    $('#login').hidden = true;
    $('#app').hidden = false;
    renderAll();
  }

  /* ------------------------------------------------------------ render */
  function renderAll() {
    renderSide();
    renderMain();
    refreshStatus();
  }

  function renderSide() {
    const current = view.replace(/^doc:/, 'project:');
    const item = (v, label, glyph = '', extra = '') =>
      `<button type="button" class="nav-item${current === v ? ' on' : ''}" data-action="nav" data-view="${v}">
        <span class="g">${glyph}</span><span class="t">${esc(label)}</span>${extra}</button>`;
    $('#side').innerHTML = `
      <h2>Page</h2>
      ${item('site', 'Name & hero', '◐')}
      ${item('board', 'Board & sections', '▦')}
      ${item('contact', 'Contact', '✉')}
      ${item('categories', 'Categories', '#')}
      <h2>Projects</h2>
      ${state.projects.map((p, i) => item(`project:${i}`, p.title || 'Untitled', p.piece ? GLYPH[p.piece.type] + VS : '·', p.featured ? '<span class="star">★</span>' : '')).join('')}
      <button type="button" class="btn small add" data-action="add-project">+ Add project</button>`;
  }

  function field(label, path, opts = {}) {
    const { kind = 'text', type = 'text', help = '', rows = 3, placeholder = '' } = opts;
    let v = get(path);
    if (kind === 'list') v = (v || []).join(', ');
    if (kind === 'paras') v = (v || []).join('\n\n');
    v = v == null ? '' : v;
    const attrs = `data-path="${path}" data-kind="${kind}" placeholder="${esc(placeholder)}"`;
    const input = type === 'textarea'
      ? `<textarea ${attrs} rows="${rows}">${esc(v)}</textarea>`
      : `<input type="${type}" ${attrs} value="${esc(v)}" />`;
    return `<label class="field"><span>${label}</span>${input}${help ? `<small>${help}</small>` : ''}</label>`;
  }

  function linksEditor(path, labelPh = 'Label', urlPh = 'https://…') {
    const list = get(path) || [];
    return `<div class="repeat">
      ${list.map((l, i) => `<div class="repeat-row two">
        <input type="text" data-path="${path}.${i}.label" value="${esc(l.label)}" placeholder="${labelPh}" aria-label="Link label" />
        <input type="text" data-path="${path}.${i}.url" value="${esc(l.url)}" placeholder="${urlPh}" aria-label="Link address" />
        <button type="button" class="btn small link" data-action="remove-item" data-path="${path}" data-index="${i}">Remove</button>
      </div>`).join('')}
      <button type="button" class="btn small" data-action="add-item" data-path="${path}" data-template='{"label":"","url":""}'>+ Add link</button>
    </div>`;
  }

  function errorBox() {
    if (!errors.length) return '';
    return `<div class="errors" role="alert"><b>Not saved yet. Please fix:</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
  }

  function renderMain() {
    const main = $('#main');
    closeEditor();
    let html = '';
    if (view === 'site') html = siteView();
    else if (view === 'board') html = boardView();
    else if (view === 'contact') html = contactView();
    else if (view === 'categories') html = categoriesView();
    else if (view.startsWith('project:')) html = projectView(Number(view.split(':')[1]));
    else if (view.startsWith('doc:')) html = docView(Number(view.split(':')[1]));
    main.innerHTML = `<div class="main-inner${view.startsWith('doc:') ? ' wide' : ''}">${errorBox()}${html}</div>`;
    if (view.startsWith('doc:')) openEditor(Number(view.split(':')[1]));
  }

  /* ------------------------------------------------- documentation */
  let editor = null;
  let editorIndex = -1;

  function closeEditor() {
    if (editor) {
      const e = editor;
      editor = null;
      e.isReady.then(() => e.destroy()).catch(() => {});
    }
    editorIndex = -1;
  }

  // Push what's in the editor into the working copy.
  async function syncEditor() {
    if (!editor || editorIndex < 0) return;
    const out = await editor.save();
    state.projects[editorIndex].doc = { time: out.time, version: out.version, blocks: out.blocks };
    refreshStatus();
  }

  function docSummary(p) {
    const blocks = (p.doc && p.doc.blocks) || [];
    if (!blocks.length) return 'Nothing written yet.';
    const count = (t) => blocks.filter((b) => b.type === t).length;
    const words = blocks.reduce((n, b) => n + (b.type === 'paragraph' ? String(b.data.text || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0), 0);
    const pics = count('image') + blocks.filter((b) => b.type === 'gallery').reduce((n, b) => n + (b.data.images || []).length, 0);
    return [`${words} words`, pics && `${pics} image${pics > 1 ? 's' : ''}`, count('code') && `${count('code')} code block${count('code') > 1 ? 's' : ''}`, count('embed') && `${count('embed')} video${count('embed') > 1 ? 's' : ''}`]
      .filter(Boolean).join(' · ');
  }

  function docView(i) {
    const p = state.projects[i];
    if (!p) { view = 'site'; return siteView(); }
    return `
      <div class="doc-head">
        <button type="button" class="btn small ghost" data-action="nav" data-view="project:${i}">← Project details</button>
        <span class="muted mono-sm">Documentation</span>
        <a class="btn small ghost" href="project.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">View page ↗</a>
      </div>
      <div class="doc-paper">
        <p class="doc-paper-meta">${esc(p.meta || '')}</p>
        <h1 class="doc-paper-title">${esc(p.title || 'Untitled project')}</h1>
        <p class="doc-paper-pitch">${esc(p.pitch || '')}</p>
        <div id="doc-editor" class="doc-editor"></div>
      </div>
      <p class="help doc-help">Click <b>+</b> (or press <b>Tab</b> on an empty line) to add a heading, image, gallery, code, video, quote, list, table or divider. Select text to make it bold, italic, a link, highlighted or code. Drag blocks with <b>⋮⋮</b> to reorder. <b>⌘S</b> saves.</p>`;
  }

  function openEditor(i) {
    if (!window.EditorJS) {
      $('#doc-editor').innerHTML = '<p class="error">The editor could not load. Check your internet connection and reload.</p>';
      return;
    }
    const p = state.projects[i];
    editorIndex = i;
    const upload = (file) => uploadFile(file);
    const { CodeTool, GalleryTool, EmbedTool } = window.DocTools;
    editor = new window.EditorJS({
      holder: 'doc-editor',
      data: p.doc && Array.isArray(p.doc.blocks) ? { blocks: p.doc.blocks } : { blocks: [] },
      placeholder: 'Tell the story of this project: the idea, the process, what broke, what you learned…',
      autofocus: !(p.doc && p.doc.blocks && p.doc.blocks.length),
      tools: {
        header: { class: window.Header, inlineToolbar: true, config: { levels: [2, 3, 4], defaultLevel: 2, placeholder: 'Heading' } },
        list: { class: window.EditorjsList, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
        image: {
          class: window.ImageTool,
          config: {
            captionPlaceholder: 'Caption (optional)',
            buttonContent: 'Upload an image',
            uploader: {
              uploadByFile: (file) => upload(file).then((url) => ({ success: 1, file: { url } })),
              uploadByUrl: (url) => Promise.resolve({ success: 1, file: { url } }),
            },
          },
        },
        gallery: { class: GalleryTool, config: { upload } },
        code: { class: CodeTool },
        embed: { class: EmbedTool, config: { upload, toEmbed: window.PF.toEmbed } },
        quote: { class: window.Quote, inlineToolbar: true, config: { quotePlaceholder: 'Quote', captionPlaceholder: 'Who said it' } },
        table: { class: window.Table, inlineToolbar: true, config: { rows: 3, cols: 3, withHeadings: true } },
        delimiter: window.Delimiter,
        marker: window.Marker,
        inlineCode: window.InlineCode,
        underline: window.Underline,
      },
      onChange: () => { syncEditor().catch(() => {}); },
    });
  }

  function siteView() {
    return `
      <div class="view-head"><h1>Name &amp; hero</h1></div>
      <section class="card">
        <h2>Your name</h2>
        <div class="row">
          ${field('First name', 'site.firstName', { help: 'Shown large, in red italic.' })}
          ${field('Last name', 'site.lastName', { help: 'A dash splits it into two words on the page.' })}
        </div>
      </section>
      <section class="card">
        <h2>Around the name</h2>
        <div class="row">
          ${field('Roles', 'site.roles', { kind: 'list', help: 'Separate with commas. Shown as “Artist × Technologist”.' })}
          ${field('Places', 'site.places', { help: 'Top right of the page.' })}
        </div>
        ${field('Personal quote', 'site.quote', { type: 'textarea', rows: 2, help: 'Leave empty to hide the quote.' })}
        <div class="row">
          ${field('Quote signed by', 'site.quoteAuthor')}
          ${field('Disciplines', 'site.disciplines', { kind: 'list', help: 'Separate with commas. Listed on the right.' })}
        </div>
      </section>
      <section class="card">
        <h2>Search & sharing</h2>
        ${field('Browser tab title', 'site.title')}
        ${field('Description', 'site.description', { type: 'textarea', rows: 2, help: 'Used by Google and link previews.' })}
        ${field('Footer line', 'site.footer')}
      </section>`;
  }

  function boardView() {
    return `
      <div class="view-head"><h1>Board &amp; sections</h1></div>
      <section class="card">
        <h2>The chess board</h2>
        <div class="row">
          ${field('Heading', 'board.title')}
          ${field('Second line (red italic)', 'board.subtitle')}
        </div>
        ${field('Panel title before a piece is picked', 'board.introTitle')}
        ${field('Panel text before a piece is picked', 'board.introText', { type: 'textarea', rows: 2 })}
        <p class="help">Pieces come from your projects. Open a project to choose its piece and square.</p>
      </section>
      <section class="card">
        <h2>Work section</h2>
        ${field('Heading', 'work.title')}
      </section>`;
  }

  function contactView() {
    return `
      <div class="view-head"><h1>Contact</h1></div>
      <section class="card">
        ${field('Heading', 'contact.title')}
        ${field('Text', 'contact.text', { type: 'textarea', rows: 2 })}
        ${field('Email', 'contact.email', { type: 'email' })}
      </section>
      <section class="card">
        <h2>Links</h2>
        <p class="help">For a file you uploaded, use its path, like assets/media/cv.pdf.</p>
        ${linksEditor('contact.links')}
      </section>`;
  }

  function categoriesView() {
    const list = state.categories;
    return `
      <div class="view-head"><h1>Categories</h1></div>
      <section class="card">
        <p class="help">These are the filter buttons above your work. Tick them on each project. The id is a short code (lowercase, dashes) and shouldn't change once projects use it.</p>
        <div class="repeat">
          ${list.map((c, i) => `<div class="repeat-row">
            <input type="text" data-path="categories.${i}.id" value="${esc(c.id)}" placeholder="id, e.g. sound" aria-label="Category id" />
            <input type="text" data-path="categories.${i}.label" value="${esc(c.label)}" placeholder="Label, e.g. Sound & music" aria-label="Category label" />
            <button type="button" class="btn small link" data-action="remove-item" data-path="categories" data-index="${i}">Remove</button>
          </div>`).join('')}
          <button type="button" class="btn small" data-action="add-item" data-path="categories" data-template='{"id":"","label":""}'>+ Add category</button>
        </div>
      </section>`;
  }

  function mediaPreview(p) {
    const m = p.media || {};
    if (m.video) return `<video src="${esc(srcUrl(m.video))}" muted loop autoplay playsinline></video>`;
    if (m.image) return `<img src="${esc(srcUrl(m.image))}" alt="" />`;
    return (window.ART[m.art] || window.ART.board).svg;
  }

  function picker(i) {
    const p = state.projects[i];
    const taken = new Map();
    state.projects.forEach((q, j) => { if (j !== i && q.piece) taken.set(q.piece.square, q); });
    let cells = '';
    for (let row = 7; row >= 0; row--) {
      for (let col = 0; col < 8; col++) {
        const sq = `${FILES[col]}${row + 1}`;
        const other = taken.get(sq);
        const me = p.piece.square === sq;
        const dark = (row + col) % 2 === 0;
        const glyph = me ? GLYPH[p.piece.type] + VS : other ? GLYPH[other.piece.type] + VS : '';
        cells += `<button type="button" class="${dark ? 'd' : ''}${me ? ' me' : ''}" data-action="square" data-square="${sq}"
          ${other ? `disabled title="${esc(other.title)}"` : `title="${sq}"`} aria-label="${sq}${other ? `, taken by ${esc(other.title)}` : ''}">${glyph}</button>`;
      }
    }
    return `<div><div class="picker" role="group" aria-label="Choose a square">${cells}</div>
      <p class="picker-cap">On ${esc(p.piece.square)} · click a free square to move it</p></div>`;
  }

  function projectView(i) {
    const p = state.projects[i];
    if (!p) { view = 'site'; return siteView(); }
    const base = `projects.${i}`;
    const artOptions = Object.entries(window.ART)
      .map(([k, a]) => `<option value="${k}"${p.media.art === k ? ' selected' : ''}>${esc(a.label)}</option>`).join('');
    const pieceOptions = ['', ...Object.keys(GLYPH)]
      .map((k) => `<option value="${k}"${(p.piece ? p.piece.type : '') === k ? ' selected' : ''}>${k ? `${GLYPH[k]}${VS} ${PIECE_NAME[k]}` : 'Not on the board'}</option>`).join('');

    return `
      <div class="view-head">
        <h1>${esc(p.title || 'Untitled project')}</h1>
        <div class="tools">
          <button type="button" class="btn small" data-action="move" data-dir="-1" ${i === 0 ? 'disabled' : ''}>↑ Move up</button>
          <button type="button" class="btn small" data-action="move" data-dir="1" ${i === state.projects.length - 1 ? 'disabled' : ''}>↓ Move down</button>
          <a class="btn small ghost" href="project.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">View page ↗</a>
        </div>
      </div>

      <section class="card doc-card">
        <div>
          <h2>Documentation</h2>
          <p class="doc-card-title">The project page's story: process, drawings, code and videos.</p>
          <p class="muted">${esc(docSummary(p))}</p>
        </div>
        <button type="button" class="btn primary" data-action="nav" data-view="doc:${i}">${(p.doc && p.doc.blocks && p.doc.blocks.length) ? 'Continue writing' : 'Start writing'} →</button>
      </section>

      <section class="card">
        <h2>Basics</h2>
        <div class="row">
          ${field('Title', `${base}.title`)}
          ${field('URL id', `${base}.id`, { help: `Link: yoursite.com/#${esc(p.id)}` })}
        </div>
        ${field('Meta line', `${base}.meta`, { placeholder: '2026 · Course name · Installation', help: 'The small line above the title.' })}
        ${field('One-line pitch', `${base}.pitch`, { type: 'textarea', rows: 2 })}
        <label class="check"><input type="checkbox" data-path="${base}.featured" data-kind="bool" ${p.featured ? 'checked' : ''} /> Feature this project (large card at the top of Work, story shown open)</label>
        <div class="field"><span>Categories</span>
          <div class="checks">${state.categories.map((c) => `<label class="check"><input type="checkbox" data-action="category" data-id="${esc(c.id)}" ${p.categories.includes(c.id) ? 'checked' : ''} /> ${esc(c.label)}</label>`).join('') || '<span class="help">Add categories first.</span>'}</div>
        </div>
      </section>

      <section class="card">
        <h2>The story</h2>
        ${field('Section title', `${base}.howTitle`, { placeholder: 'How I made it' })}
        ${field('Text', `${base}.how`, { type: 'textarea', kind: 'paras', rows: 7, help: 'Leave an empty line between paragraphs. Wrap words in *stars* to make them italic.' })}
        ${field('Tools', `${base}.tools`, { kind: 'list', help: 'Separate with commas.' })}
        <div class="field"><span>Links</span>${linksEditor(`${base}.links`, 'Code, Video…')}</div>
      </section>

      <section class="card">
        <h2>Picture</h2>
        <div class="media-row">
          <div class="preview">${mediaPreview(p)}</div>
          <div class="field" style="gap:14px">
            <label class="field"><span>Photo</span>
              <div class="file-line">
                <input type="text" data-path="${base}.media.image" value="${esc(p.media.image)}" placeholder="Upload, or paste a link" />
                <button type="button" class="btn small" data-action="upload" data-path="${base}.media.image" data-accept="image/*">Upload</button>
              </div></label>
            <label class="field"><span>Video file (plays silently on loop)</span>
              <div class="file-line">
                <input type="text" data-path="${base}.media.video" value="${esc(p.media.video)}" placeholder="Upload an MP4, or paste a link" />
                <button type="button" class="btn small" data-action="upload" data-path="${base}.media.video" data-accept="video/mp4,video/webm">Upload</button>
              </div></label>
            ${field('Describe the photo', `${base}.media.alt`, { help: 'For people using screen readers.' })}
            <label class="field"><span>Drawing (shown when there is no photo)</span><select data-path="${base}.media.art">${artOptions}</select></label>
            ${field('“Play the video” link', `${base}.media.embed`, { help: 'A YouTube or Google Drive embed link. For Drive, use the link that ends in /preview.' })}
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Chess piece</h2>
        <label class="field"><span>Piece</span><select data-action="piece-type">${pieceOptions}</select>
          <small>King moves one step, Queen anywhere, Rook straight, Bishop diagonal, Knight in an L, Pawn forward (and becomes a Queen on the last row).</small></label>
        ${p.piece ? `<div class="piece-row">
          ${picker(i)}
          <div class="field" style="gap:14px">
            ${field('Why this piece?', `${base}.piece.why`, { type: 'textarea', rows: 3, help: 'Shown in italics when someone picks it up.' })}
            ${p.piece.type === 'P' ? field('When it promotes', `${base}.piece.promotion`, { type: 'textarea', rows: 2, help: 'Shown when the pawn reaches the last row.' }) : ''}
          </div>
        </div>` : ''}
      </section>

      <section class="card danger-zone">
        <p class="muted">Remove this project from the site. You can bring it back from History.</p>
        <button type="button" class="btn danger" data-action="delete-project">Delete project</button>
      </section>`;
  }

  /* ------------------------------------------------------------ editing */
  function freeSquare(except) {
    const taken = new Set(state.projects.filter((p, j) => j !== except && p.piece).map((p) => p.piece.square));
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const sq = `${FILES[f]}${r + 1}`;
      if (!taken.has(sq)) return sq;
    }
    return 'a1';
  }

  const main = $('#main');

  main.addEventListener('input', (e) => {
    const el = e.target;
    const path = el.dataset.path;
    if (!path) return;
    const kind = el.dataset.kind || 'text';
    let v = el.value;
    if (kind === 'list') v = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (kind === 'paras') v = v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    else if (kind === 'bool') v = el.checked;
    set(path, v);

    // Keep the URL id in step with the title until it's edited by hand.
    const m = /^projects\.(\d+)\.(title|id)$/.exec(path);
    if (m) {
      const i = Number(m[1]);
      if (m[2] === 'id') idTouched.add(i);
      if (m[2] === 'title' && !idTouched.has(i) && state.projects[i]._new) {
        state.projects[i].id = slugify(v);
        const idInput = main.querySelector(`[data-path="projects.${i}.id"]`);
        if (idInput) idInput.value = state.projects[i].id;
      }
      $('.view-head h1', main).textContent = state.projects[i].title || 'Untitled project';
      renderSide();
    }
    if (/\.media\.(image|video)$/.test(path)) $('.preview', main).innerHTML = mediaPreview(state.projects[Number(path.split('.')[1])]);
    refreshStatus();
  });

  main.addEventListener('change', (e) => {
    const el = e.target;
    const i = view.startsWith('project:') ? Number(view.split(':')[1]) : -1;
    if (el.dataset.path && /\.media\.art$/.test(el.dataset.path)) {
      set(el.dataset.path, el.value);
      $('.preview', main).innerHTML = mediaPreview(state.projects[i]);
      refreshStatus();
    }
    if (el.dataset.action === 'category') {
      const cats = new Set(state.projects[i].categories);
      if (el.checked) cats.add(el.dataset.id); else cats.delete(el.dataset.id);
      state.projects[i].categories = state.categories.map((c) => c.id).filter((id) => cats.has(id));
      refreshStatus();
    }
    if (el.dataset.action === 'piece-type') {
      const p = state.projects[i];
      if (!el.value) p.piece = null;
      else p.piece = { why: '', promotion: '', ...(p.piece || { square: freeSquare(i) }), type: el.value };
      renderAll();
    }
    if (el.dataset.path && el.dataset.kind === 'bool') renderSide();
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.tagName === 'INPUT' || btn.tagName === 'SELECT') return;
    const action = btn.dataset.action;
    const i = view.startsWith('project:') ? Number(view.split(':')[1]) : -1;

    if (action === 'nav') { view = btn.dataset.view; renderAll(); main.scrollTop = 0; }
    if (action === 'add-item') { get(btn.dataset.path).push(JSON.parse(btn.dataset.template)); renderMain(); refreshStatus(); }
    if (action === 'remove-item') { get(btn.dataset.path).splice(Number(btn.dataset.index), 1); renderMain(); refreshStatus(); }
    if (action === 'square') { state.projects[i].piece.square = btn.dataset.square; renderMain(); refreshStatus(); }

    if (action === 'add-project') {
      state.projects.push({
        _new: true, id: `project-${state.projects.length + 1}`, title: '', featured: false, meta: '',
        categories: [], pitch: '', howTitle: 'How I made it', how: [], tools: [], links: [],
        media: { art: 'board', image: '', video: '', embed: '', alt: '' }, piece: null,
      });
      view = `project:${state.projects.length - 1}`;
      renderAll();
      $('[data-path$=".title"]', main).focus();
    }

    if (action === 'move') {
      const j = i + Number(btn.dataset.dir);
      const list = state.projects;
      [list[i], list[j]] = [list[j], list[i]];
      view = `project:${j}`;
      renderAll();
    }

    if (action === 'delete-project') {
      if (!confirm(`Delete “${state.projects[i].title || 'this project'}”? It disappears from the site when you save.`)) return;
      state.projects.splice(i, 1);
      view = 'site';
      renderAll();
    }

    if (action === 'upload') pickFile(btn.dataset.path, btn.dataset.accept);
    if (action === 'save') save();
    if (action === 'history') openHistory();
    if (action === 'restore') restore(btn.dataset.name);
    if (action === 'logout') {
      if (isDirty() && !confirm('You have unsaved changes. Log out anyway?')) return;
      await call('POST', '/api/logout').catch(() => {});
      saved = JSON.stringify(state); // nothing left to warn about
      showLogin('You are logged out.');
    }
  });

  /* ------------------------------------------------------------ uploads */
  async function uploadFile(file) {
    if (file.size > 40 * 1024 * 1024) throw new Error('Files must be 40 MB or smaller.');
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read that file.'));
      r.readAsDataURL(file);
    });
    const { url } = await call('POST', '/api/upload', { filename: file.name, data });
    return url;
  }

  function pickFile(path, accept) {
    const input = $('#file');
    input.accept = accept || '';
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      toast(`Uploading ${file.name}…`);
      try {
        const url = await uploadFile(file);
        set(path, url);
        renderMain();
        refreshStatus();
        toast('Uploaded. Save to publish it.');
      } catch (err) {
        toast(err.message, true);
      }
    };
    input.click();
  }

  /* --------------------------------------------------------------- save */
  async function save() {
    const btn = $('#save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await syncEditor();
      const body = clone(state);
      body.projects.forEach((p) => delete p._new);
      const { content } = await call('PUT', '/api/content', body);
      state = content;
      saved = JSON.stringify(state);
      idTouched.clear();
      // Keep the writing view as it is, so the cursor stays where it was.
      if (view.startsWith('doc:') && !errors.length) { renderSide(); refreshStatus(); }
      else { errors = []; renderAll(); }
      toast('Saved. Your site is updated.');
    } catch (err) {
      errors = (err.data && err.data.errors) || [err.message];
      renderMain();
      main.scrollTop = 0;
      toast('Not saved. See the list at the top.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !$('#app').hidden) { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', (e) => { if (state && isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ------------------------------------------------------------ history */
  async function openHistory() {
    const list = $('#backups');
    list.innerHTML = '<li>Loading…</li>';
    $('#history').showModal();
    try {
      const { backups } = await call('GET', '/api/backups');
      list.innerHTML = backups.length
        ? backups.map((b) => `<li><span>${new Date(b.time).toLocaleString()}</span>
            <button type="button" class="btn small" data-action="restore" data-name="${esc(b.name)}">Restore</button></li>`).join('')
        : '<li class="muted">Nothing yet. A copy appears here after your first save.</li>';
    } catch (err) {
      list.innerHTML = `<li class="error">${esc(err.message)}</li>`;
    }
  }

  async function restore(name) {
    if (isDirty() && !confirm('Restoring will throw away your unsaved changes. Continue?')) return;
    try {
      const { content } = await call('POST', '/api/backups/restore', { name });
      state = content;
      saved = JSON.stringify(state);
      view = 'site';
      errors = [];
      $('#history').close();
      renderAll();
      toast('Restored. Your site is updated.');
    } catch (err) {
      toast(err.message, true);
    }
  }

  boot();
})();
