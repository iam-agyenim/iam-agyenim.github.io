/* ==========================================================================
   Helpers shared by the home page (main.js) and project pages (project.js).
   ========================================================================== */

window.PF = (() => {
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // *word* becomes italic, everything else is escaped
  const rich = (s = '') => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const safeUrl = (u = '') => (/^(https?:|mailto:|assets\/|\/|#|project\.html)/i.test(String(u).trim()) ? String(u).trim() : '#');
  const isExternal = (u = '') => /^https?:/i.test(u);
  const projectUrl = (id) => `project.html?id=${encodeURIComponent(id)}`;

  const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  const NAME = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };
  const VS = '︎'; // text presentation, so pieces never turn into emoji

  // Photo, looping video, or drawing, plus an optional "Play the video" button.
  function media(p) {
    const m = p.media || {};
    let inner;
    if (m.video) {
      inner = `<video src="${esc(safeUrl(m.video))}" ${m.image ? `poster="${esc(safeUrl(m.image))}"` : ''} muted loop playsinline autoplay></video>`;
    } else if (m.image) {
      inner = `<img src="${esc(safeUrl(m.image))}" alt="${esc(m.alt || p.title)}" loading="lazy" />`;
    } else {
      inner = (window.ART[m.art] || window.ART.board).svg;
    }
    const play = m.embed
      ? `<button class="play-video" type="button" data-video="${esc(toEmbed(m.embed))}" data-title="${esc(p.title)}"><span aria-hidden="true">▶</span> Play the video</button>`
      : '';
    return `<figure class="media${m.image || m.video ? ' has-photo' : ''}">${inner}${play}</figure>`;
  }

  // Turn ordinary share links into embeddable ones.
  function toEmbed(url = '') {
    const u = String(url).trim();
    let m;
    if ((m = /youtu\.be\/([\w-]{6,})/.exec(u)) || (m = /youtube\.com\/(?:watch\?v=|shorts\/|embed\/)([\w-]{6,})/.exec(u))) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u))) return `https://player.vimeo.com/video/${m[1]}`;
    if ((m = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(u))) return `https://drive.google.com/file/d/${m[1]}/preview`;
    if ((m = /editor\.p5js\.org\/([\w-]+)\/(?:sketches|full)\/([\w-]+)/.exec(u))) return `https://editor.p5js.org/${m[1]}/full/${m[2]}`;
    return safeUrl(u);
  }

  const isVideoFile = (u = '') => /\.(mp4|webm|mov)(\?|$)/i.test(u);

  function wireVideos(root = document) {
    root.querySelectorAll('.play-video[data-video]').forEach((btn) => btn.addEventListener('click', () => {
      const fig = btn.closest('.media');
      const frame = document.createElement('iframe');
      frame.src = btn.dataset.video;
      frame.title = `${btn.dataset.title} video`;
      frame.allow = 'autoplay; fullscreen';
      frame.allowFullscreen = true;
      fig.replaceChildren(frame);
    }));
  }

  return { esc, rich, safeUrl, isExternal, projectUrl, GLYPH, NAME, VS, media, toEmbed, isVideoFile, wireVideos };
})();
