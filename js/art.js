/* ==========================================================================
   Drawn illustrations for projects that don't have a photo yet.
   Pick one per project in the admin ("Illustration"). Keys are stable.
   ========================================================================== */

window.ART = {
  disco: {
    label: 'Tent with gate (Disco House)',
    svg: `<svg class="art art-disco" viewBox="0 0 400 300" aria-hidden="true">
      <path class="tent" d="M60 250 L200 50 L340 250 Z" />
      <path class="gate-door" d="M170 250 L200 160 L230 250" />
      <path class="gate-open" d="M230 250 L200 160 L268 228 Z" />
      <line x1="200" y1="50" x2="200" y2="88" />
      <circle class="art-ball" cx="200" cy="102" r="14" />
      <g class="art-ring"><circle cx="200" cy="200" r="28" /></g>
      <text x="60" y="285" class="art-label">ultrasonic › 15 cm → party</text>
    </svg>`,
  },
  harp: {
    label: 'Invisible strings (Air Harp)',
    svg: `<svg class="art strings" viewBox="0 0 400 260" aria-hidden="true">
      <line x1="80" y1="30" x2="80" y2="210" /><line x1="140" y1="30" x2="140" y2="210" /><line x1="200" y1="30" x2="200" y2="210" /><line x1="260" y1="30" x2="260" y2="210" /><line x1="320" y1="30" x2="320" y2="210" />
      <circle class="hand" cx="214" cy="118" r="10" />
      <text x="72" y="238" class="art-label">C</text><text x="132" y="238" class="art-label">D</text><text x="192" y="238" class="art-label">E</text><text x="252" y="238" class="art-label">G</text><text x="312" y="238" class="art-label">A</text>
    </svg>`,
  },
  finger: {
    label: 'Tendon finger',
    svg: `<svg class="art finger" viewBox="0 0 400 260" aria-hidden="true">
      <rect x="60" y="150" width="70" height="44" rx="6" />
      <text x="70" y="215" class="art-label">servo</text>
      <path class="bone" d="M150 170 L220 160" /><path class="bone" d="M226 159 L278 140" /><path class="bone" d="M284 137 L320 112" />
      <circle cx="223" cy="160" r="5" /><circle cx="281" cy="139" r="5" />
      <path class="tendon" d="M130 178 C 190 190, 250 180, 318 122" />
      <text x="230" y="220" class="art-label">tendon</text>
    </svg>`,
  },
  car: {
    label: 'Voice to car',
    svg: `<svg class="art car" viewBox="0 0 400 260" aria-hidden="true">
      <path class="wave" d="M40 90 q10 -30 20 0 t20 0 t20 0 t20 0 t20 0" />
      <text x="40" y="140" class="art-label">"forward"</text>
      <path class="arrow" d="M150 100 L196 100" /><text x="206" y="112" class="art-big">F</text>
      <path class="arrow" d="M236 100 L262 100" />
      <rect x="270" y="150" width="90" height="40" rx="8" />
      <circle cx="290" cy="196" r="10" /><circle cx="340" cy="196" r="10" />
      <path class="ping" d="M366 160 q10 10 0 20 M374 154 q16 16 0 32" />
    </svg>`,
  },
  sphere: {
    label: '360° sphere (VR)',
    svg: `<svg class="art sphere" viewBox="0 0 400 260" aria-hidden="true">
      <circle cx="200" cy="125" r="90" />
      <ellipse cx="200" cy="125" rx="90" ry="30" /><ellipse cx="200" cy="125" rx="90" ry="62" />
      <ellipse cx="200" cy="125" rx="30" ry="90" /><ellipse cx="200" cy="125" rx="62" ry="90" />
      <path class="teleport" d="M110 230 Q 200 150 290 230" />
      <circle class="hand" cx="290" cy="230" r="6" />
    </svg>`,
  },
  hand: {
    label: 'Hand landmarks (computer vision)',
    svg: (() => {
      const P = [
        [200, 222],
        [168, 206], [146, 186], [130, 166], [116, 148],
        [178, 150], [173, 112], [170, 88], [168, 66],
        [202, 146], [203, 104], [204, 78], [205, 54],
        [225, 151], [231, 112], [234, 88], [237, 68],
        [246, 162], [258, 134], [264, 115], [269, 98],
      ];
      const BONES = [
        [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
      ];
      const lines = BONES.map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" />`).join('');
      const dots = P.map(([x, y]) => `<circle class="pt" cx="${x}" cy="${y}" r="4.5" />`).join('');
      return `<svg class="art hand-art" viewBox="0 0 400 260" aria-hidden="true">${lines}${dots}<text x="40" y="240" class="art-label">21 points → xArm</text></svg>`;
    })(),
  },
  pipeline: {
    label: 'Prompt to slides (AI)',
    svg: `<svg class="art pipeline" viewBox="0 0 400 260" aria-hidden="true">
      <rect x="30" y="110" width="80" height="30" rx="15" /><text x="44" y="130" class="art-label">1 line</text>
      <path class="arrow" d="M116 125 L146 125" />
      <text x="152" y="138" class="art-big">{ }</text>
      <path class="arrow" d="M210 125 L240 125" />
      <rect class="slide" x="250" y="70" width="110" height="68" rx="6" />
      <rect class="slide" x="262" y="90" width="110" height="68" rx="6" />
      <rect class="slide" x="274" y="110" width="110" height="68" rx="6" />
      <text x="250" y="210" class="art-label">6–8 lessons</text>
    </svg>`,
  },
  cards: {
    label: 'Notes to flashcards',
    svg: `<svg class="art cards" viewBox="0 0 400 260" aria-hidden="true">
      <path d="M50 60 h90 l20 20 v110 h-110 z" />
      <line x1="66" y1="100" x2="140" y2="100" /><line x1="66" y1="120" x2="132" y2="120" /><line x1="66" y1="140" x2="140" y2="140" /><line x1="66" y1="160" x2="118" y2="160" />
      <path class="arrow" d="M178 125 L214 125" />
      <rect class="card" x="232" y="76" width="130" height="84" rx="8" />
      <rect class="card c2" x="244" y="92" width="130" height="84" rx="8" />
      <text x="268" y="142" class="art-big">Q?</text>
    </svg>`,
  },
  board: {
    label: 'Chess squares (generic)',
    svg: `<svg class="art generic" viewBox="0 0 400 260" aria-hidden="true">
      <rect x="140" y="50" width="160" height="160" />
      <path class="fill" d="M140 50h40v40h-40zM220 50h40v40h-40zM180 90h40v40h-40zM260 90h40v40h-40zM140 130h40v40h-40zM220 130h40v40h-40zM180 170h40v40h-40zM260 170h40v40h-40z" />
      <circle class="hand" cx="100" cy="130" r="8" />
      <path class="arrow" d="M112 130 L132 130" />
    </svg>`,
  },
};
