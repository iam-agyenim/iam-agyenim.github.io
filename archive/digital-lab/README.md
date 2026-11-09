# RICHMOND / DIGITAL LAB

Portfolio of Richmond Agyenim-Boateng. It's a static site (HTML, CSS and JS with no build step) plus one optional serverless endpoint that lets Claude operate the site.

> Not an AI chatbot inside a portfolio: a portfolio an AI agent can operate.

## Run locally

```bash
python3 -m http.server 5173
```

Open http://localhost:5173. The agent runs in **local mode** (a rule-based planner in the browser). To run the Claude-powered agent locally:

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npx vercel dev
```

## Structure

```
index.html        page shell: header, command line
css/style.css     all styles
js/data.js        ALL CONTENT: projects, lab, writing, about  ← edit this (also read by the API)
js/visuals.js     generative sketches used as project visuals
js/app.js         router, views, collection canvas, terminal commands
js/agent.js       the agent: tools, tours, visitor journey, local planner, Claude loop
api/agent.js      serverless endpoint: system prompt + tool definitions → Claude
assets/           CV and (later) photos / videos
```

## The agent

```
visitor ─▶ terminal / Ask the Lab / goal picker
              │
              ▼
        js/agent.js ── plans with Claude (/api/agent) or the local planner
              │
              ▼
          TOOLS (run on the page)
          open_item · navigate · filter_collection · highlight_items · start_tour · show_links
```

- **Level 1, assistant:** answers questions using only the documentation in `data.js`.
- **Level 2, navigator:** filters the collection, opens projects, and scrolls to a project's process or architecture.
- **Level 3, curator:** reads the visitor's goal ("I'm hiring for a frontend role") and builds and runs a guided tour.
- **Memory:** it remembers which projects the visitor has opened this session, so "what connects these?" works.

The browser runs the loop and executes the tools. `/api/agent` makes one Claude call per step, with a frozen system prompt and tool list that visitors can't change. If the endpoint is missing, offline or rate-limited, the site falls back to the local planner, so it never breaks.

**Model:** `claude-opus-5` by default, at `effort: low` for fast replies, with server-side refusal fallbacks and prompt caching. Change it with `ANTHROPIC_MODEL`.

**Grounding:** answers come from `data.js`. To improve them, give each project better `challenges`, `process` and `idea` text.

## Deploy (Vercel)

1. Push this folder to GitHub and import it in Vercel. No framework and no build command are needed.
2. Add the env var `ANTHROPIC_API_KEY`. Optionally add `ALLOWED_ORIGINS=https://your-domain.com`.
3. **Set a monthly spend limit** in the Anthropic Console. The endpoint is public; it has per-IP rate limiting and size caps, but a spend limit is the real safety net.

Without a key the site still deploys and works, using the local agent. It also works on Netlify or GitHub Pages without the API.

## Common edits

- **Add real media to a project:** add `media: { type: 'video', src: 'assets/arm.mp4', poster: 'assets/arm.jpg' }` and optionally `gallery: [...]` in `js/data.js`.
- **Publish a note:** add `body: ['paragraph', ...]` to a writing entry.
- **Change curated tours:** edit `PERSONAS` in `js/agent.js`.
- **Move a tile on the canvas:** change its `pos: { x: <percent>, y: <px> }`.
