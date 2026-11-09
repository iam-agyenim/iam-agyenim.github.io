/* ==========================================================================
   Generative sketches — one per project. Each is a pure draw(ctx,w,h,t,hue,st)
   function; `st` is per-canvas state for anything that needs memory.
   ========================================================================== */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const hsla = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a})`;
  const mono = (px) => `${Math.round(px)}px "JetBrains Mono", ui-monospace, monospace`;

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function grid(ctx, w, h, step, a) {
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step; x < w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
    for (let y = step; y < h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
    ctx.stroke();
  }

  function label(ctx, s, text, x, y, color, align = 'left') {
    ctx.font = mono(Math.max(9, s * 0.032));
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  function brackets(ctx, x0, y0, x1, y1, len, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.beginPath();
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.moveTo(x + dx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * len);
    });
    ctx.stroke();
  }

  const S = {};

  /* ---------------- 01 Gesture arm: MediaPipe-style hand skeleton */
  S.arm = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h);
    grid(ctx, w, h, s / 8, 0.035);
    const cx = w * 0.5 + Math.sin(t * 0.5) * s * 0.07;
    const cy = h * 0.8 + Math.cos(t * 0.37) * s * 0.03;
    const flex = (Math.sin(t * 1.1) + 1) / 2;
    const pts = [[cx, cy]];
    const fingers = [
      { a: -2.35, base: 0.1, len: [0.12, 0.1, 0.08], thumb: true },
      { a: -1.92, base: 0.3, len: [0.13, 0.08, 0.065] },
      { a: -1.63, base: 0.31, len: [0.14, 0.09, 0.07] },
      { a: -1.36, base: 0.29, len: [0.13, 0.085, 0.065] },
      { a: -1.1, base: 0.26, len: [0.1, 0.065, 0.055] },
    ];
    fingers.forEach((f, fi) => {
      let x = cx + Math.cos(f.a) * f.base * s;
      let y = cy + Math.sin(f.a) * f.base * s;
      let a = f.thumb ? f.a + 0.3 : -Math.PI / 2 + (fi - 2.6) * 0.16;
      pts.push([x, y]);
      f.len.forEach((l, j) => {
        const curl = f.thumb ? flex * 0.55 : flex * (0.35 + j * 0.25);
        const dir = f.thumb ? 1 : (fi < 3 ? 1 : -1) * 0.25;
        a += curl * dir * 0.5;
        const L = l * s * (1 - curl * 0.45);
        x += Math.cos(a) * L; y += Math.sin(a) * L;
        pts.push([x, y]);
      });
    });
    const bones = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
    ctx.lineWidth = Math.max(1.2, s * 0.006);
    ctx.strokeStyle = hsla(hue, 85, 62, 0.85);
    ctx.beginPath();
    bones.forEach(([a, b]) => { ctx.moveTo(...pts[a]); ctx.lineTo(...pts[b]); });
    ctx.stroke();
    pts.forEach(([x, y], i) => {
      const tip = [4, 8, 12, 16, 20].includes(i);
      ctx.fillStyle = tip ? hsla(hue, 95, 70, 1) : '#ece9e2';
      ctx.beginPath(); ctx.arc(x, y, s * (tip ? 0.013 : 0.009), 0, TAU); ctx.fill();
    });
    // pinch line
    const [ax, ay] = pts[4], [bx, by] = pts[8];
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(236,233,226,.5)';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    // bbox
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const p = s * 0.05;
    brackets(ctx, x0 - p, y0 - p, x1 + p, y1 + p, s * 0.05, hsla(hue, 85, 62, 0.9));
    const pinch = Math.hypot(ax - bx, ay - by) / s;
    label(ctx, s, `HAND 0.9${(Math.floor(t * 3) % 7) + 2}`, x0 - p, y0 - p - s * 0.025, hsla(hue, 85, 70, 1));
    const pad = s * 0.05;
    label(ctx, s, `PINCH ${pinch.toFixed(2)}`, pad, pad + s * 0.02, 'rgba(236,233,226,.6)');
    label(ctx, s, `→ xARM  x ${(cx / w * 400).toFixed(0)}  y ${(cy / h * 300).toFixed(0)}  grip ${pinch < 0.12 ? 'CLOSE' : 'OPEN '}`, pad, h - pad * 0.7, 'rgba(236,233,226,.45)');
  };

  /* ---------------- 02 VR: rotating 360° sphere with hotspots */
  S.vr = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h), cx = w / 2, cy = h / 2, R = s * 0.36;
    const rot = t * 0.22, tilt = 0.38;
    const P = (lat, lon) => {
      let x = Math.cos(lat) * Math.sin(lon + rot), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon + rot);
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [cx + x * R, cy - y2 * R, z2];
    };
    const seg = (a, b) => {
      const z = (a[2] + b[2]) / 2;
      ctx.strokeStyle = hsla(hue, 70, 70, z > 0 ? 0.55 + z * 0.35 : 0.1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    ctx.lineWidth = 1;
    const N = 28;
    for (let m = 0; m < 12; m++) {
      const lon = (m / 12) * TAU;
      for (let i = 0; i < N; i++) seg(P(-Math.PI / 2 + (i / N) * Math.PI, lon), P(-Math.PI / 2 + ((i + 1) / N) * Math.PI, lon));
    }
    for (let l = -2; l <= 2; l++) {
      const lat = (l * Math.PI) / 6;
      for (let i = 0; i < 40; i++) seg(P(lat, (i / 40) * TAU), P(lat, ((i + 1) / 40) * TAU));
    }
    [[0.1, 0.3, 'LIBRARY'], [-0.2, 2.2, 'ARTS CENTER'], [0.35, 4.1, 'PLAZA'], [-0.05, 5.3, 'DORMS']].forEach(([lat, lon, name], i) => {
      const [x, y, z] = P(lat, lon);
      if (z < 0.05) return;
      const pulse = (t * 0.8 + i * 0.25) % 1;
      ctx.strokeStyle = hsla(hue, 90, 75, (1 - pulse) * z);
      ctx.beginPath(); ctx.arc(x, y, s * (0.012 + pulse * 0.04), 0, TAU); ctx.stroke();
      ctx.fillStyle = hsla(hue, 95, 80, z);
      ctx.beginPath(); ctx.arc(x, y, s * 0.01, 0, TAU); ctx.fill();
      label(ctx, s, name, x + s * 0.03, y + s * 0.01, `rgba(236,233,226,${0.8 * z})`);
    });
    label(ctx, s, `360° · NODE 0${(Math.floor(t / 3) % 7) + 1}`, s * 0.05, s * 0.07, 'rgba(236,233,226,.5)');
    label(ctx, s, `YAW ${((rot * 57.3) % 360).toFixed(0).padStart(3, '0')}°`, w - s * 0.05, h - s * 0.05, 'rgba(236,233,226,.4)', 'right');
  };

  /* ---------------- 03 LearnAI: prompt → stacked lesson slides */
  S.learnai = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h);
    const period = 7, ph = (t % period) / period;
    const cw = w * 0.58, ch = h * 0.5;
    const bx = w * 0.3, by = h * 0.3;
    for (let i = 2; i >= 0; i--) {
      const x = bx + i * s * 0.05, y = by - i * s * 0.05;
      ctx.fillStyle = i === 0 ? '#121211' : '#0d0d0c';
      ctx.strokeStyle = hsla(hue, 50, 60, i === 0 ? 0.7 : 0.25);
      ctx.fillRect(x, y, cw, ch); ctx.strokeRect(x + 0.5, y + 0.5, cw, ch);
    }
    const px = bx + cw * 0.08, pw = cw * 0.84;
    // title bar
    const tp = Math.min(1, ph / 0.15);
    ctx.fillStyle = hsla(hue, 70, 60, 0.9);
    ctx.fillRect(px, by + ch * 0.12, pw * 0.55 * tp, ch * 0.07);
    const widths = [0.9, 0.78, 0.84, 0.6, 0.72];
    widths.forEach((wd, i) => {
      const lp = Math.max(0, Math.min(1, (ph - 0.15 - i * 0.08) / 0.1));
      ctx.fillStyle = 'rgba(236,233,226,.28)';
      ctx.fillRect(px, by + ch * (0.32 + i * 0.1), pw * wd * lp, ch * 0.035);
    });
    // narration waveform
    if (ph > 0.6) {
      const y = by + ch * 0.86;
      ctx.strokeStyle = hsla(hue, 80, 65, 0.9); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = px + (pw * i) / 60;
        const a = Math.sin(i * 0.9 + t * 9) * Math.sin(i * 0.23 + t * 2) * ch * 0.05 * Math.min(1, (ph - 0.6) * 6);
        i ? ctx.lineTo(x, y + a) : ctx.moveTo(x, y + a);
      }
      ctx.stroke();
    }
    label(ctx, s, `LESSON 0${(Math.floor(t / period) % 7) + 1} / 08`, bx + cw, by + ch + s * 0.06, hsla(hue, 70, 70, 0.9), 'right');
    const prompt = '> teach me computer vision';
    const n = Math.floor(Math.min(1, ph / 0.12) * prompt.length);
    label(ctx, s, prompt.slice(0, n) + (Math.floor(t * 2) % 2 ? '▍' : ' '), s * 0.06, h * 0.14, 'rgba(236,233,226,.75)');
    label(ctx, s, '{ "syllabus": [ … ] }', s * 0.06, h * 0.9, 'rgba(236,233,226,.3)');
  };

  /* ---------------- 04 News: entity graph */
  S.news = (ctx, w, h, t, hue, st) => {
    const s = Math.min(w, h);
    if (!st.nodes) {
      const r = rng(7);
      st.nodes = Array.from({ length: 34 }, () => ({ x: r(), y: r(), r: r(), p: r() * TAU, v: 0.3 + r() * 0.6, sent: r() }));
      st.edges = [];
      st.nodes.forEach((a, i) => st.nodes.forEach((b, j) => { if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 0.24) st.edges.push([i, j]); }));
    }
    const pos = st.nodes.map((n) => [
      w * (0.08 + n.x * 0.84) + Math.sin(t * n.v + n.p) * s * 0.02,
      h * (0.1 + n.y * 0.8) + Math.cos(t * n.v * 0.8 + n.p) * s * 0.02,
    ]);
    ctx.lineWidth = 1;
    st.edges.forEach(([a, b], k) => {
      ctx.strokeStyle = hsla(hue, 40, 70, 0.14);
      ctx.beginPath(); ctx.moveTo(...pos[a]); ctx.lineTo(...pos[b]); ctx.stroke();
      if (k % 7 === 0) {
        const f = (t * 0.4 + k * 0.13) % 1;
        ctx.fillStyle = hsla(hue, 90, 75, 0.9);
        ctx.beginPath();
        ctx.arc(pos[a][0] + (pos[b][0] - pos[a][0]) * f, pos[a][1] + (pos[b][1] - pos[a][1]) * f, s * 0.006, 0, TAU);
        ctx.fill();
      }
    });
    const labels = ['ENTITY: ORG', 'SENTIMENT +0.62', 'TOPIC 04', 'SUMMARY', 'QUERY ▸ energy', 'ENTITY: GPE'];
    st.nodes.forEach((n, i) => {
      const [x, y] = pos[i];
      const rr = s * (0.006 + n.r * 0.016);
      const hh = n.sent > 0.66 ? hue - 60 : n.sent < 0.25 ? hue + 150 : hue;
      ctx.fillStyle = hsla(hh, 75, 65, 0.85);
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      if (i < labels.length) label(ctx, s, labels[i], x + rr + s * 0.015, y + s * 0.01, 'rgba(236,233,226,.62)');
    });
  };

  /* ---------------- 05 Voice car: ultrasonic radar sweep */
  S.car = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h);
    const ox = w / 2, oy = h * 0.84, R = Math.min(w * 0.44, h * 0.72);
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.strokeStyle = hsla(hue, 60, 60, 0.18);
      ctx.beginPath(); ctx.arc(ox, oy, (R * i) / 4, Math.PI, TAU); ctx.stroke();
    }
    for (let a = 0; a <= 6; a++) {
      const ang = Math.PI + (a * Math.PI) / 6;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(ang) * R, oy + Math.sin(ang) * R); ctx.stroke();
    }
    const sweep = Math.PI + ((Math.sin(t * 0.9) + 1) / 2) * Math.PI;
    for (let k = 0; k < 24; k++) {
      const ang = sweep - k * 0.018 * Math.sign(Math.cos(t * 0.9) || 1);
      ctx.strokeStyle = hsla(hue, 95, 60, 0.5 * (1 - k / 24));
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(ang) * R, oy + Math.sin(ang) * R); ctx.stroke();
    }
    [[3.6, 0.55], [4.3, 0.8], [5.2, 0.4], [5.9, 0.7], [4.0, 0.3]].forEach(([ang, d]) => {
      const near = Math.max(0, 1 - Math.abs(ang - sweep) * 3);
      ctx.fillStyle = hsla(hue, 95, 65, 0.15 + near * 0.85);
      ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * R * d, oy + Math.sin(ang) * R * d, s * (0.01 + near * 0.01), 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#ece9e2';
    ctx.fillRect(ox - s * 0.03, oy - s * 0.02, s * 0.06, s * 0.08);
    const cmds = [['FORWARD', 'F'], ['LEFT', 'L'], ['STOP', 'S'], ['RIGHT', 'R'], ['BACK', 'B']];
    const [word, ch] = cmds[Math.floor(t / 2) % cmds.length];
    label(ctx, s, `"${word.toLowerCase()}"  →  '${ch}'  →  serial`, s * 0.05, s * 0.08, hsla(hue, 90, 65, 0.95));
    label(ctx, s, `DIST ${(30 + Math.sin(t * 1.3) * 18).toFixed(0)}cm`, w - s * 0.05, h - s * 0.04, 'rgba(236,233,226,.5)', 'right');
  };

  /* ---------------- Lab: Air harp — invisible strings */
  S.harp = (ctx, w, h, t, hue, st) => {
    const s = Math.min(w, h);
    const n = 8, notes = 'CDEFGABC';
    st.pl = st.pl || Array(n).fill(-9);
    const hx = w * (0.1 + 0.8 * (Math.sin(t * 0.8) + 1) / 2);
    const hy = h * (0.45 + Math.sin(t * 1.7) * 0.15);
    if (st.lastX != null) {
      for (let i = 0; i < n; i++) {
        const sx = w * (0.12 + (0.76 * i) / (n - 1));
        if ((st.lastX - sx) * (hx - sx) <= 0) st.pl[i] = t;
      }
    }
    st.lastX = hx;
    for (let i = 0; i < n; i++) {
      const sx = w * (0.12 + (0.76 * i) / (n - 1));
      const age = t - st.pl[i];
      const amp = age >= 0 ? Math.exp(-age * 2.2) * s * 0.035 : 0;
      ctx.strokeStyle = hsla(hue, 80, 70, 0.25 + Math.min(0.75, amp / (s * 0.03)));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const y = h * 0.1 + (h * 0.72 * k) / 40;
        const x = sx + Math.sin((Math.PI * k) / 40) * Math.sin(t * 38 + i) * amp;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      label(ctx, s, notes[i], sx, h * 0.92, amp > 1 ? hsla(hue, 90, 75, 1) : 'rgba(236,233,226,.35)', 'center');
    }
    ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(236,233,226,.35)';
    ctx.beginPath(); ctx.moveTo(hx, h * 0.86); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ece9e2';
    ctx.beginPath(); ctx.arc(hx, hy, s * 0.02, 0, TAU); ctx.fill();
  };

  /* ---------------- Lab: Mirror of expectation */
  S.mirror = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h), cx = w / 2, cy = h / 2;
    const rx = s * 0.3, ry = s * 0.4;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 7; i++) {
      const r = ((t * 0.25 + i / 7) % 1) * s * 0.6;
      ctx.strokeStyle = hsla(hue, 60, 70, 0.25 * (1 - r / (s * 0.6)));
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    }
    const fig = (dx, color, jitter) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * TAU;
        const j = Math.sin(a * 6 + t * 3) * jitter;
        const x = cx + dx + Math.cos(a) * s * (0.09 + j), y = cy - s * 0.1 + Math.sin(a) * s * (0.11 + j);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + dx - s * 0.22, cy + ry);
      ctx.quadraticCurveTo(cx + dx - s * 0.2, cy + s * 0.08, cx + dx, cy + s * 0.07);
      ctx.quadraticCurveTo(cx + dx + s * 0.2, cy + s * 0.08, cx + dx + s * 0.22, cy + ry);
      ctx.stroke();
    };
    const drift = Math.sin(t * 0.6) * s * 0.05;
    fig(-drift, hsla(hue + 140, 80, 70, 0.7), 0.012);
    fig(drift, 'rgba(236,233,226,.85)', 0.002);
    for (let y = cy - ry; y < cy + ry; y += 3) {
      ctx.fillStyle = 'rgba(8,8,8,.25)'; ctx.fillRect(cx - rx, y, rx * 2, 1);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(236,233,226,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    label(ctx, s, 'YOU', cx - rx - s * 0.04, cy, 'rgba(236,233,226,.7)', 'right');
    label(ctx, s, 'EXPECTED', cx + rx + s * 0.04, cy, hsla(hue + 140, 80, 72, 0.9));
  };

  /* ---------------- Lab: Holographic mirror — 4-view pepper's ghost */
  S.holo = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h), cx = w / 2, cy = h / 2;
    const q = s * 0.1;
    ctx.strokeStyle = 'rgba(236,233,226,.25)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - q, cy - q, q * 2, q * 2);
    ctx.beginPath();
    ctx.moveTo(cx - q, cy - q); ctx.lineTo(cx - s * 0.42, cy - s * 0.42);
    ctx.moveTo(cx + q, cy - q); ctx.lineTo(cx + s * 0.42, cy - s * 0.42);
    ctx.moveTo(cx - q, cy + q); ctx.lineTo(cx - s * 0.42, cy + s * 0.42);
    ctx.moveTo(cx + q, cy + q); ctx.lineTo(cx + s * 0.42, cy + s * 0.42);
    ctx.stroke();
    const V = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
    const E = [];
    V.forEach((a, i) => V.forEach((b, j) => { if (j > i && a.filter((v, k) => v !== b[k]).length === 1) E.push([i, j]); }));
    const cube = (ox, oy, rotView, size) => {
      const ay = t * 0.7, ax = t * 0.45;
      const P = V.map(([x, y, z]) => {
        let X = x * Math.cos(ay) - z * Math.sin(ay), Z = x * Math.sin(ay) + z * Math.cos(ay);
        let Y = y * Math.cos(ax) - Z * Math.sin(ax);
        const c = Math.cos(rotView), sn = Math.sin(rotView);
        return [ox + (X * c - Y * sn) * size, oy + (X * sn + Y * c) * size];
      });
      ctx.strokeStyle = hsla(hue, 85, 70, 0.9); ctx.lineWidth = 1.3;
      ctx.beginPath(); E.forEach(([a, b]) => { ctx.moveTo(...P[a]); ctx.lineTo(...P[b]); }); ctx.stroke();
    };
    const d = s * 0.28, sz = s * 0.075;
    cube(cx, cy - d, Math.PI, sz); cube(cx, cy + d, 0, sz);
    cube(cx - d, cy, Math.PI / 2, sz); cube(cx + d, cy, -Math.PI / 2, sz);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, q * 1.5);
    g.addColorStop(0, hsla(hue, 90, 70, 0.25 + Math.sin(t * 2) * 0.1)); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(cx - q * 2, cy - q * 2, q * 4, q * 4);
  };

  /* ---------------- Lab: Digital diet — attention as portions */
  S.diet = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h);
    const cols = 24, rows = 7;
    const gx = w * 0.08, gy = h * 0.2, gw = w * 0.84, gh = h * 0.5;
    const r = rng(3);
    for (let d = 0; d < rows; d++) {
      for (let c = 0; c < cols; c++) {
        const use = r();
        const x = gx + (gw * (c + 0.5)) / cols, y = gy + (gh * (d + 0.5)) / rows;
        const on = use > 0.45 - Math.sin(t * 0.5 + d * 0.3) * 0.15 && c > 6;
        ctx.fillStyle = on ? hsla(hue, 70, 60, 0.35 + use * 0.6) : 'rgba(236,233,226,.1)';
        ctx.beginPath(); ctx.arc(x, y, Math.min(gw / cols, gh / rows) * (on ? 0.32 : 0.16), 0, TAU); ctx.fill();
      }
    }
    label(ctx, s, 'SCREEN FACTS', gx, h * 0.13, 'rgba(236,233,226,.85)');
    const mins = 402 + Math.round(Math.sin(t * 0.5) * 40);
    label(ctx, s, `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m / day`, gx + gw, h * 0.13, hsla(hue, 80, 70, 1), 'right');
    ctx.strokeStyle = 'rgba(236,233,226,.3)';
    ctx.beginPath(); ctx.moveTo(gx, h * 0.78); ctx.lineTo(gx + gw, h * 0.78); ctx.stroke();
    [['SCROLLING', 0.62], ['MESSAGING', 0.24], ['CREATING', 0.08]].forEach(([k, v], i) => {
      const y = h * (0.84 + i * 0.055);
      label(ctx, s * 0.9, k, gx, y, 'rgba(236,233,226,.55)');
      label(ctx, s * 0.9, `${Math.round(v * 100)}%`, gx + gw, y, 'rgba(236,233,226,.55)', 'right');
    });
  };

  /* ---------------- Lab: The finger — tendon-driven phalanges */
  S.finger = (ctx, w, h, t, hue) => {
    const s = Math.min(w, h);
    grid(ctx, w, h, s / 10, 0.03);
    const flex = (Math.sin(t * 0.9) + 1) / 2;
    let x = w * 0.2, y = h * 0.68, a = -0.1;
    const lens = [0.26, 0.18, 0.13], names = ['MCP', 'PIP', 'DIP'];
    const joints = [[x, y]];
    ctx.lineCap = 'round';
    lens.forEach((l, i) => {
      a -= flex * (0.5 + i * 0.15);
      const nx = x + Math.cos(a) * l * s, ny = y + Math.sin(a) * l * s;
      ctx.strokeStyle = 'rgba(236,233,226,.9)'; ctx.lineWidth = s * (0.05 - i * 0.008);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      x = nx; y = ny; joints.push([x, y]);
    });
    ctx.lineCap = 'butt';
    ctx.strokeStyle = hsla(hue, 90, 62, 0.95); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(w * 0.08, h * 0.8);
    joints.forEach(([jx, jy]) => ctx.lineTo(jx, jy + s * 0.035));
    ctx.stroke();
    joints.slice(0, 3).forEach(([jx, jy], i) => {
      ctx.fillStyle = '#080808'; ctx.strokeStyle = hsla(hue, 90, 62, 1);
      ctx.beginPath(); ctx.arc(jx, jy, s * 0.018, 0, TAU); ctx.fill(); ctx.stroke();
      label(ctx, s, names[i], jx, jy + s * 0.08, 'rgba(236,233,226,.5)', 'center');
    });
    ctx.strokeStyle = hsla(hue, 90, 62, 0.6);
    ctx.beginPath(); ctx.arc(w * 0.08, h * 0.8, s * 0.04, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.08, h * 0.8);
    ctx.lineTo(w * 0.08 + Math.cos(t * 0.9 * 2) * s * 0.04, h * 0.8 + Math.sin(t * 0.9 * 2) * s * 0.04); ctx.stroke();
    label(ctx, s, `SERVO ${Math.round(flex * 180)}°`, s * 0.05, s * 0.08, hsla(hue, 90, 70, 1));
    label(ctx, s, 'tendon tension →', w - s * 0.05, s * 0.08, 'rgba(236,233,226,.4)', 'right');
  };

  /* ==================================================== renderer + loop */
  const live = new Set();
  let raf = 0;
  const tick = (now) => {
    const t = now / 1000;
    live.forEach((v) => v.draw(t + v.offset));
    raf = live.size ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!raf && !REDUCED) raf = requestAnimationFrame(tick); };

  class VisCanvas {
    constructor(canvas, kind, hue) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.kind = kind; this.hue = +hue || 0; this.st = {};
      this.offset = (kind || '').length * 3.7;
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
      this.io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { live.add(this); wake(); } else live.delete(this);
      });
      this.io.observe(canvas);
      this.resize();
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      this.w = r.width; this.h = r.height;
      this.c.width = Math.max(1, Math.round(r.width * d));
      this.c.height = Math.max(1, Math.round(r.height * d));
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.draw(REDUCED ? 2.4 : performance.now() / 1000 + this.offset);
    }
    set(kind, hue) {
      if (kind === this.kind && +hue === this.hue) return;
      this.kind = kind; this.hue = +hue || 0; this.st = {};
      this.draw(REDUCED ? 2.4 : performance.now() / 1000 + this.offset);
    }
    draw(t) {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const f = S[this.kind];
      if (f && w > 0 && h > 0) f(ctx, w, h, t, this.hue, this.st);
    }
    destroy() { this.ro.disconnect(); this.io.disconnect(); live.delete(this); }
  }

  window.VisCanvas = VisCanvas;
  window.REDUCED_MOTION = REDUCED;
})();
