# Richmond Agyenim-Boateng · Portfolio

Artist and technologist · Interactive Media, NYU Abu Dhabi.

A cream, chess-themed portfolio with a small admin editor. Plain HTML, CSS and
JavaScript, plus a tiny Node server with no packages to install.

## Run it

```bash
npm start
```

- Site: http://localhost:5173
- Admin: http://localhost:5173/admin

The admin password lives in `.env` as `ADMIN_PASSWORD` (a random one was
generated for you; change it to anything 8+ characters and restart). `.env` is
never served and never committed. See `.env.example` for the other settings.

## Editing content

Everything on the page (your name, the quote, the board text, every project,
contact links, filter categories) is stored in **`content.json`**. Edit it in
the admin, or by hand.

In the admin you can:

- change the hero, board text, contact details and categories
- add, delete and reorder projects, and choose which one is featured
- upload photos and videos (saved in `assets/media/`)
- give each project a chess piece and pick its square on a mini board
- undo a save from **History** (a copy is kept in `data/backups/` before every
  save; the last 30 are kept)

Every save is checked first: duplicate project ids, two pieces on one square
and missing titles are caught and listed instead of breaking the site.

In project text, wrap words in `*stars*` to make them italic.

## Project pages and documentation

Every project has its own page at `project.html?id=<project-id>`. Clicking a
card, its title, or "Open project" on the board opens it. The page shows the
picture or video, the facts (category, tools, chess piece, links), the short
"How I made it" text, then the documentation.

To write documentation: open a project in the admin and press **Start writing**.
It's a block editor, like WordPress:

- **+** (or Tab on an empty line) adds a block: text, heading, list, checklist,
  image, gallery, code, video/embed, quote, table or divider
- select text for **bold**, *italic*, links, highlight, underline and `code`
- drag blocks by their **⋮⋮** handle to reorder them
- **Image** uploads a photo or drawing (caption, border, background, stretch)
- **Gallery** shows several images in a grid; click any image on the page to
  see it large
- **Code** has a language picker (Python, Arduino/C++, p5.js, C#/Unity…) and
  an optional file name; it's colour-highlighted on the page with a Copy button
- **Video / embed** takes an uploaded MP4, or a YouTube, Vimeo, Google Drive or
  p5.js editor link

The documentation is saved in `content.json` with everything else (on Save or
⌘S). Uploaded files go to `assets/media/`. The editor itself is
[Editor.js](https://editorjs.io), loaded from a CDN, so the admin needs an
internet connection.

## Structure

```
index.html        page shell; filled in from content.json
content.json      ALL CONTENT
css/style.css     site styles; cream palette tokens at the top
js/main.js        renders the home page, name hover, chess board, filters
js/project.js     renders a project page and its documentation
js/common.js      helpers shared by both pages
project.html      project page shell
js/art.js         drawn illustrations for projects without a photo
admin/            the editor (index.html, admin.css, admin.js, doc-tools.js)
server/server.js  static files + admin API (login, save, upload, history)
assets/           CV, plus assets/media/ for uploads
archive/          the previous "Digital Lab" site (not served)
```

## The board

Every project with a piece is placed on the board and moves the way the
project thinks: the King (Disco House) one careful step, the Queen (Robotic Arm)
anywhere, Rooks in straight lines, Bishops on diagonals, the Knight (Air Harp)
in an L, and the Pawn (The Finger) forward until it promotes to a Queen.

## Deploying

The admin writes files to disk, so it needs a host that runs Node and keeps
files between restarts:

- **Render, Railway or Fly.io** with a persistent disk, or any small VPS. Start
  command: `npm start`. Set `ADMIN_PASSWORD`, `SESSION_SECRET` and
  `COOKIE_SECURE=1` as environment variables.
- **Static hosting** (GitHub Pages, Netlify, Vercel) also works for the public
  site: edit locally in the admin, then push `content.json` and `assets/media/`.
  The admin itself won't work there, since those hosts can't save files.

## Security notes

- The password is checked in constant time; 8 wrong tries from one address
  locks login for 15 minutes.
- Sessions are signed, HttpOnly, SameSite=Strict cookies that last 8 hours.
- Every change needs a custom header that other websites can't send, so a
  malicious page can't make changes while you're logged in.
- `server/`, `data/`, `archive/`, `.env` and other dotfiles are never served.
- Uploads are limited to images, MP4/WebM video and PDF, 40 MB each.
