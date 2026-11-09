/* ==========================================================================
   Custom Editor.js blocks for project documentation:
     code     — code with a language and optional file name
     gallery  — several images in a grid (process shots, sketches, drawings)
     embed    — an uploaded video, or a YouTube / Vimeo / Drive / p5.js link
   Each tool gets `config.upload(file) → Promise<url>` from admin.js.
   ========================================================================== */

window.DocTools = (() => {
  const h = (tag, cls, attrs = {}) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'text') el.textContent = v; else el.setAttribute(k, v); });
    return el;
  };
  const srcUrl = (u) => (/^(https?:|\/|data:|blob:)/.test(u) ? u : `/${u}`);

  const ICON = {
    code: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
    gallery: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    embed: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
  };

  const LANGS = [
    ['plaintext', 'Plain text'], ['javascript', 'JavaScript / p5.js'], ['typescript', 'TypeScript'],
    ['python', 'Python / CircuitPython'], ['cpp', 'C++ / Arduino'], ['csharp', 'C# / Unity'],
    ['xml', 'HTML'], ['css', 'CSS'], ['json', 'JSON'], ['bash', 'Terminal'], ['java', 'Java'], ['glsl', 'GLSL shader'],
  ];

  /* ------------------------------------------------------------ code */
  class CodeTool {
    static get toolbox() { return { title: 'Code', icon: ICON.code }; }
    static get enableLineBreaks() { return true; }
    static get isReadOnlySupported() { return true; }

    constructor({ data }) {
      this.data = { language: data.language || 'javascript', filename: data.filename || '', code: data.code || '' };
    }

    render() {
      const wrap = h('div', 'dt-code');
      const bar = h('div', 'dt-code-bar');
      this.lang = h('select', 'dt-code-lang', { 'aria-label': 'Language' });
      LANGS.forEach(([v, label]) => {
        const o = h('option', '', { value: v, text: label });
        if (v === this.data.language) o.selected = true;
        this.lang.appendChild(o);
      });
      this.file = h('input', 'dt-code-file', { type: 'text', placeholder: 'File name (optional), e.g. code.py', 'aria-label': 'File name' });
      this.file.value = this.data.filename;
      bar.append(this.lang, this.file);

      this.area = h('textarea', 'dt-code-area', { placeholder: 'Paste or type code…', spellcheck: 'false', rows: '6', 'aria-label': 'Code' });
      this.area.value = this.data.code;
      const grow = () => { this.area.style.height = 'auto'; this.area.style.height = `${this.area.scrollHeight + 2}px`; };
      this.area.addEventListener('input', grow);
      requestAnimationFrame(grow);
      // Tab indents instead of jumping to the next block.
      this.area.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          const { selectionStart: s, selectionEnd: t, value } = this.area;
          this.area.value = `${value.slice(0, s)}  ${value.slice(t)}`;
          this.area.selectionStart = this.area.selectionEnd = s + 2;
          this.area.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      wrap.append(bar, this.area);
      return wrap;
    }

    save() { return { language: this.lang.value, filename: this.file.value.trim(), code: this.area.value }; }
    validate(d) { return d.code.trim().length > 0; }
  }

  /* --------------------------------------------------------- gallery */
  class GalleryTool {
    static get toolbox() { return { title: 'Gallery', icon: ICON.gallery }; }
    static get isReadOnlySupported() { return true; }

    constructor({ data, config, api }) {
      this.api = api;
      this.upload = config.upload;
      this.data = { images: Array.isArray(data.images) ? data.images : [], caption: data.caption || '' };
    }

    render() {
      this.wrap = h('div', 'dt-gallery');
      this.grid = h('div', 'dt-gallery-grid');
      const add = h('label', 'dt-btn');
      add.innerHTML = '<span>+ Add images</span>';
      this.input = h('input', '', { type: 'file', accept: 'image/*', multiple: '' });
      this.input.hidden = true;
      add.appendChild(this.input);
      this.input.addEventListener('change', () => this.addFiles([...this.input.files]));
      this.status = h('span', 'dt-status');
      this.caption = h('input', 'dt-caption', { type: 'text', placeholder: 'Gallery caption (optional)' });
      this.caption.value = this.data.caption;
      const tools = h('div', 'dt-row');
      tools.append(add, this.status);
      this.wrap.append(this.grid, tools, this.caption);
      this.draw();
      return this.wrap;
    }

    draw() {
      this.grid.replaceChildren(...this.data.images.map((im, i) => {
        const cell = h('div', 'dt-gallery-cell');
        const img = h('img', '', { src: srcUrl(im.url), alt: '' });
        const cap = h('input', 'dt-caption small', { type: 'text', placeholder: 'Caption' });
        cap.value = im.caption || '';
        cap.addEventListener('input', () => { im.caption = cap.value; });
        const rm = h('button', 'dt-x', { type: 'button', title: 'Remove image', 'aria-label': 'Remove image', text: '×' });
        rm.addEventListener('click', () => { this.data.images.splice(i, 1); this.draw(); this.changed(); });
        const left = h('button', 'dt-move', { type: 'button', title: 'Move left', 'aria-label': 'Move left', text: '‹' });
        left.disabled = i === 0;
        left.addEventListener('click', () => { const a = this.data.images; [a[i - 1], a[i]] = [a[i], a[i - 1]]; this.draw(); this.changed(); });
        cell.append(img, rm, left, cap);
        return cell;
      }));
      this.grid.hidden = !this.data.images.length;
    }

    async addFiles(files) {
      for (const [n, file] of files.entries()) {
        this.status.textContent = `Uploading ${n + 1} of ${files.length}…`;
        try {
          const url = await this.upload(file);
          this.data.images.push({ url, caption: '' });
          this.draw();
          this.changed();
        } catch (err) {
          this.status.textContent = err.message;
          return;
        }
      }
      this.status.textContent = '';
      this.input.value = '';
    }

    changed() {
      // Nudge Editor.js so it notices the change and the admin marks it unsaved.
      this.caption.dispatchEvent(new Event('input', { bubbles: true }));
    }

    save() {
      return { images: this.data.images.map((im) => ({ url: im.url, caption: (im.caption || '').trim() })), caption: this.caption.value.trim() };
    }
    validate(d) { return d.images.length > 0; }
  }

  /* ----------------------------------------------------------- embed */
  class EmbedTool {
    static get toolbox() { return { title: 'Video / embed', icon: ICON.embed }; }
    static get isReadOnlySupported() { return true; }

    constructor({ data, config }) {
      this.upload = config.upload;
      this.toEmbed = config.toEmbed;
      this.data = { url: data.url || '', caption: data.caption || '' };
    }

    render() {
      const wrap = h('div', 'dt-embed');
      const row = h('div', 'dt-row');
      this.url = h('input', 'dt-url', { type: 'text', placeholder: 'Paste a YouTube, Vimeo, Google Drive or p5.js link…' });
      this.url.value = this.data.url;
      const up = h('label', 'dt-btn');
      up.innerHTML = '<span>Upload video</span>';
      const file = h('input', '', { type: 'file', accept: 'video/mp4,video/webm' });
      file.hidden = true;
      up.appendChild(file);
      row.append(this.url, up);
      this.status = h('span', 'dt-status');
      this.preview = h('div', 'dt-embed-preview');
      this.caption = h('input', 'dt-caption', { type: 'text', placeholder: 'Caption (optional)' });
      this.caption.value = this.data.caption;

      this.url.addEventListener('change', () => this.show());
      file.addEventListener('change', async () => {
        if (!file.files[0]) return;
        this.status.textContent = 'Uploading video…';
        try {
          this.url.value = await this.upload(file.files[0]);
          this.status.textContent = '';
          this.show();
          this.url.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) { this.status.textContent = err.message; }
      });
      wrap.append(row, this.status, this.preview, this.caption);
      this.show();
      return wrap;
    }

    show() {
      const u = this.url.value.trim();
      this.preview.replaceChildren();
      this.preview.hidden = !u;
      if (!u) return;
      if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) {
        this.preview.appendChild(h('video', '', { src: srcUrl(u), controls: '', preload: 'metadata' }));
      } else {
        this.preview.appendChild(h('iframe', '', { src: this.toEmbed(u), allowfullscreen: '', loading: 'lazy', title: 'Preview' }));
      }
    }

    save() { return { url: this.url.value.trim(), caption: this.caption.value.trim() }; }
    validate(d) { return Boolean(d.url); }
  }

  return { CodeTool, GalleryTool, EmbedTool };
})();
