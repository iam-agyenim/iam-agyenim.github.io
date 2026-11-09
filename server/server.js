/* ==========================================================================
   Portfolio server: serves the site and a small admin API.
   No dependencies — plain Node (18+).

     npm start            → http://localhost:5173  (site)
                            http://localhost:5173/admin  (editor)

   Settings come from environment variables or a .env file in the project root:
     ADMIN_PASSWORD   required to log in to /admin (8+ characters)
     SESSION_SECRET   optional; keeps you logged in across restarts
     PORT             optional; default 5173
     COOKIE_SECURE    set to 1 when serving over https
   ========================================================================== */

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content.json');
const BACKUPS = path.join(ROOT, 'data', 'backups');
const MEDIA = path.join(ROOT, 'assets', 'media');
const KEEP_BACKUPS = 30;

/* ---------------------------------------------------------------- config */
loadEnv(path.join(ROOT, '.env'));
const PORT = Number(process.env.PORT) || 5173;
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_HOURS = 8;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

/* ------------------------------------------------------------------ auth */
const COOKIE = 'ra_admin';

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function makeToken() {
  const exp = String(Date.now() + SESSION_HOURS * 3600 * 1000);
  return `${exp}.${sign(exp)}`;
}

function isAuthed(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return good.length === given.length && crypto.timingSafeEqual(good, given);
}

function passwordMatches(given) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function cookieHeader(req, value, maxAge) {
  const secure = process.env.COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

// Slow down password guessing: 8 failed tries per 15 minutes per address.
const failures = new Map();
function tooManyFailures(ip) {
  const now = Date.now();
  const list = (failures.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  failures.set(ip, list);
  return list.length >= 8;
}

/* ------------------------------------------------------------ validation */
const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SQUARE = /^[a-h][1-8]$/;

const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, max = 400) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean) : []);
const linkList = (v) => (Array.isArray(v) ? v : [])
  .map((l) => ({ label: str(l && l.label, 80), url: str(l && l.url, 1000) }))
  .filter((l) => l.label && l.url);

// Documentation is Editor.js output: { time, version, blocks: [{ id, type, data }] }.
// Text is cleaned again when the page renders it, so here we only check shape and size.
const DOC_TYPES = new Set(['paragraph', 'header', 'list', 'image', 'gallery', 'code', 'quote', 'delimiter', 'table', 'embed']);
function validateDoc(doc, label, errors) {
  if (!doc || !Array.isArray(doc.blocks)) return null;
  if (doc.blocks.length > 1000) errors.push(`${label}: the documentation has more than 1000 blocks.`);
  const blocks = doc.blocks
    .filter((b) => b && DOC_TYPES.has(b.type) && b.data && typeof b.data === 'object' && !Array.isArray(b.data))
    .slice(0, 1000)
    .map((b) => ({ id: str(b.id, 40), type: b.type, data: JSON.parse(JSON.stringify(b.data)) }));
  if (Buffer.byteLength(JSON.stringify(blocks)) > 3 * 1024 * 1024) errors.push(`${label}: the documentation is too long (over 3 MB of text).`);
  return { time: Number(doc.time) || Date.now(), version: str(doc.version, 20), blocks };
}

function validate(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return { errors: ['Content must be an object.'] };
  const s = input.site || {};
  const site = {
    title: str(s.title, 200),
    description: str(s.description, 400),
    firstName: str(s.firstName, 60),
    lastName: str(s.lastName, 80),
    roles: strList(s.roles, 40),
    places: str(s.places, 200),
    quote: str(s.quote, 300),
    quoteAuthor: str(s.quoteAuthor, 80),
    disciplines: strList(s.disciplines, 40),
    footer: str(s.footer, 200),
  };
  if (!site.firstName) errors.push('Site: first name is required.');

  const b = input.board || {};
  const board = { title: str(b.title, 120), subtitle: str(b.subtitle, 120), introTitle: str(b.introTitle, 120), introText: str(b.introText, 400) };
  const work = { title: str((input.work || {}).title, 80) || 'Work' };

  const categories = (Array.isArray(input.categories) ? input.categories : [])
    .map((c) => ({ id: str(c && c.id, 40).toLowerCase(), label: str(c && c.label, 60) }))
    .filter((c) => c.id || c.label);
  const catIds = new Set();
  categories.forEach((c, i) => {
    if (!SLUG.test(c.id)) errors.push(`Category ${i + 1}: id must be lowercase letters, numbers and dashes.`);
    else if (c.id === 'all') errors.push('Category id "all" is reserved.');
    else if (catIds.has(c.id)) errors.push(`Category "${c.id}" is listed twice.`);
    if (!c.label) errors.push(`Category ${i + 1}: label is required.`);
    catIds.add(c.id);
  });

  const c = input.contact || {};
  const contact = { title: str(c.title, 120), text: str(c.text, 400), email: str(c.email, 200), links: linkList(c.links) };

  const ids = new Set();
  const squares = new Map();
  const projects = (Array.isArray(input.projects) ? input.projects : []).map((p, i) => {
    p = p || {};
    const m = p.media || {};
    const piece = p.piece && PIECES.includes(p.piece.type)
      ? { type: p.piece.type, square: str(p.piece.square, 2).toLowerCase(), why: str(p.piece.why, 400), promotion: str(p.piece.promotion, 400) }
      : null;
    const out = {
      id: str(p.id, 80).toLowerCase(),
      title: str(p.title, 160),
      featured: Boolean(p.featured),
      meta: str(p.meta, 200),
      categories: strList(p.categories, 40).filter((x) => catIds.has(x)),
      pitch: str(p.pitch, 600),
      howTitle: str(p.howTitle, 60),
      how: strList(p.how, 4000),
      tools: strList(p.tools, 80),
      links: linkList(p.links),
      media: { art: str(m.art, 40), image: str(m.image, 1000), video: str(m.video, 1000), embed: str(m.embed, 1000), alt: str(m.alt, 300) },
      piece,
    };
    const label = out.title || `Project ${i + 1}`;
    out.doc = validateDoc(p.doc, label, errors);
    if (!out.title) errors.push(`Project ${i + 1}: title is required.`);
    if (!SLUG.test(out.id)) errors.push(`${label}: the URL id must be lowercase letters, numbers and dashes.`);
    else if (ids.has(out.id)) errors.push(`${label}: another project already uses the id "${out.id}".`);
    ids.add(out.id);
    if (piece) {
      if (!SQUARE.test(piece.square)) errors.push(`${label}: board square must look like "e4".`);
      else if (squares.has(piece.square)) errors.push(`${label}: square ${piece.square} is already taken by ${squares.get(piece.square)}.`);
      else squares.set(piece.square, label);
    }
    return out;
  });

  return { errors, value: { site, board, work, categories, contact, projects } };
}

/* --------------------------------------------------------------- storage */
async function saveContent(value) {
  await fsp.mkdir(BACKUPS, { recursive: true });
  if (fs.existsSync(CONTENT)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fsp.copyFile(CONTENT, path.join(BACKUPS, `content-${stamp}.json`));
    const old = (await listBackups()).slice(KEEP_BACKUPS);
    await Promise.all(old.map((b) => fsp.unlink(path.join(BACKUPS, b.name)).catch(() => {})));
  }
  const tmp = `${CONTENT}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await fsp.rename(tmp, CONTENT);
}

async function listBackups() {
  if (!fs.existsSync(BACKUPS)) return [];
  const names = (await fsp.readdir(BACKUPS)).filter((n) => /^content-[\w-]+\.json$/.test(n));
  const stats = await Promise.all(names.map(async (name) => ({ name, time: (await fsp.stat(path.join(BACKUPS, name))).mtimeMs })));
  return stats.sort((a, b) => b.time - a.time);
}

const UPLOAD_TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'application/pdf': 'pdf',
};
const MAX_UPLOAD = 40 * 1024 * 1024;

async function saveUpload({ filename, data }) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(data || ''));
  if (!m || !UPLOAD_TYPES[m[1]]) throw httpError(415, 'Use a JPG, PNG, WebP, GIF, AVIF, MP4, WebM or PDF file.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_UPLOAD) throw httpError(413, 'Files must be 40 MB or smaller.');
  const base = String(filename || 'file').replace(/\.[^.]*$/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'file';
  const name = `${base}-${crypto.randomBytes(3).toString('hex')}.${UPLOAD_TYPES[m[1]]}`;
  await fsp.mkdir(MEDIA, { recursive: true });
  await fsp.writeFile(path.join(MEDIA, name), buf);
  return `assets/media/${name}`;
}

async function listUploads() {
  if (!fs.existsSync(MEDIA)) return [];
  const names = (await fsp.readdir(MEDIA)).filter((n) => !n.startsWith('.'));
  const items = await Promise.all(names.map(async (n) => {
    const st = await fsp.stat(path.join(MEDIA, n));
    return { url: `assets/media/${n}`, size: st.size, time: st.mtimeMs };
  }));
  return items.sort((a, b) => b.time - a.time);
}

/* ------------------------------------------------------------------ http */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
// Never served: server code, backups, old site, packages, dotfiles (.env).
const BLOCKED = new Set(['server', 'data', 'archive', 'node_modules', 'package.json', 'package-lock.json']);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function send(res, status, body, headers = {}) {
  const json = typeof body !== 'string';
  res.writeHead(status, {
    'Content-Type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(json ? JSON.stringify(body) : body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(httpError(413, 'That request is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(httpError(400, 'The request body must be JSON.')); }
    });
    req.on('error', reject);
  });
}

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const mutating = req.method !== 'GET';

  // Every change must come from the admin page itself: a custom header can't be
  // sent cross-site without CORS, which this server never allows.
  if (mutating && req.headers['x-admin'] !== '1') throw httpError(403, 'Missing admin header.');

  if (route === 'GET /api/session') return send(res, 200, { authed: isAuthed(req), configured: PASSWORD.length >= 8 });

  if (route === 'POST /api/login') {
    if (PASSWORD.length < 8) throw httpError(503, 'Set ADMIN_PASSWORD (8+ characters) in .env, then restart the server.');
    const ip = req.socket.remoteAddress || 'unknown';
    if (tooManyFailures(ip)) throw httpError(429, 'Too many tries. Wait 15 minutes and try again.');
    const { password } = await readBody(req, 10_000);
    if (!passwordMatches(password || '')) {
      failures.get(ip).push(Date.now());
      throw httpError(401, 'That password is not right.');
    }
    failures.delete(ip);
    return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(req, makeToken(), SESSION_HOURS * 3600) });
  }

  if (route === 'POST /api/logout') return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(req, '', 0) });

  if (!isAuthed(req)) throw httpError(401, 'Please log in again.');

  if (route === 'GET /api/content') {
    return send(res, 200, JSON.parse(await fsp.readFile(CONTENT, 'utf8')));
  }

  if (route === 'PUT /api/content') {
    const { errors, value } = validate(await readBody(req, 20 * 1024 * 1024));
    if (errors.length) return send(res, 422, { error: 'Some fields need fixing.', errors });
    await saveContent(value);
    return send(res, 200, { ok: true, content: value });
  }

  if (route === 'POST /api/upload') {
    const url = await saveUpload(await readBody(req, Math.ceil(MAX_UPLOAD * 1.4)));
    return send(res, 200, { url });
  }

  if (route === 'GET /api/uploads') return send(res, 200, { files: await listUploads() });

  if (route === 'GET /api/backups') {
    return send(res, 200, { backups: (await listBackups()).map((b) => ({ name: b.name, time: b.time })) });
  }

  if (route === 'POST /api/backups/restore') {
    const { name } = await readBody(req, 10_000);
    if (!/^content-[\w-]+\.json$/.test(String(name))) throw httpError(400, 'Unknown backup.');
    const file = path.join(BACKUPS, name);
    if (!fs.existsSync(file)) throw httpError(404, 'That backup no longer exists.');
    const { errors, value } = validate(JSON.parse(await fsp.readFile(file, 'utf8')));
    if (errors.length) return send(res, 422, { error: 'That backup is not valid.', errors });
    await saveContent(value);
    return send(res, 200, { ok: true, content: value });
  }

  throw httpError(404, 'No such API route.');
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Method not allowed.');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/admin') return send(res, 301, '', { Location: '/admin/' });
  if (rel.endsWith('/')) rel += 'index.html';
  const segments = rel.split('/').filter(Boolean);
  if (segments.some((s) => s.startsWith('.')) || BLOCKED.has(segments[0])) throw httpError(404, 'Not found.');

  const file = path.join(ROOT, ...segments);
  if (!file.startsWith(ROOT + path.sep)) throw httpError(404, 'Not found.');
  let stat;
  try { stat = await fsp.stat(file); } catch { throw httpError(404, 'Not found.'); }
  if (!stat.isFile()) throw httpError(404, 'Not found.');

  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
    // Pages, content and code are checked every time; photos and video may be cached.
    'Cache-Control': /\.(html|json|js|css)$/.test(file) ? 'no-cache' : 'public, max-age=300',
  };
  if (segments[0] === 'admin') headers['X-Frame-Options'] = 'DENY';
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await serveStatic(req, res, url);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something went wrong on the server.' : err.message });
    else res.end();
  }
});

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(`Port ${PORT} is already in use — the portfolio is probably already running at http://localhost:${PORT}`);
  console.error(`To run another copy, pick a different port:  PORT=${PORT + 1} npm start`);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Portfolio:  http://localhost:${PORT}`);
  console.log(`Admin:      http://localhost:${PORT}/admin`);
  if (PASSWORD.length < 8) console.warn('⚠  ADMIN_PASSWORD is not set (or shorter than 8 characters). Add it to .env to use /admin.');
});
