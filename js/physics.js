// Fisica e percorsi di Next Stage.
// Funziona sia nel browser (window.PuttPhysics) sia in Node (per lo script di verifica delle buche).
(function (root) {
  'use strict';

  const W = 480;          // larghezza del campo (unità di gioco)
  const H = 720;          // altezza del campo
  const BORDER = 18;      // spessore della sponda
  const BALL_R = 7;
  const HOLE_R = 12;
  const PORTAL_R = 14;
  const MAX_V = 14;       // velocità massima di un colpo (unità per tick)
  const FRICTION = 0.986;
  const SAND_FRICTION = 0.935;
  const ICE_FRICTION = 0.996;
  const STOP_V = 0.06;
  const ROLL_DECEL = 0.012;
  const ICE_ROLL_DECEL = 0.003;
  const CAPTURE_V = 5.5;  // sopra questa velocità la pallina "salta" la buca
  const WALL_BOUNCE = 0.75;
  const BUMPER_BOUNCE = 1.05;

  // Ogni buca. Rettangoli: [x, y, larghezza, altezza].
  //  walls     muri
  //  sand      sabbia o fango (rallenta molto)
  //  ice       ghiaccio (scivola tanto)
  //  water     acqua: la pallina torna dove l'hai colpita e il colpo è perso
  //  lava      come l'acqua, ma più calda
  //  slopes    pendenze: [x, y, w, h, accX, accY]
  //  boosts    rampe acceleratrici: [x, y, w, h, accX, accY]
  //  bumpers   funghi che rimbalzano: [x, y, raggio]
  //  movers    blocchi che scorrono: { x, y, w, h, amp, speed, axis: 'x' | 'y' }
  //  spinners  eliche rotanti: { x, y, len, speed }
  //  portals   portali a senso unico: { a: [x, y], b: [x, y] }
  const COURSES = [
    {
      id: 'prato', name: 'Il Prato', desc: 'Il percorso classico per imparare: muretti, sabbia, pendenze e funghi.',
      theme: { green: '#3fa34d', stripe: '#47ad55', border: '#7a4b26', borderHi: '#a8743f', bg: '#14361f', bgSpot: '#18402a' },
      holes: [
        { name: 'Il rettilineo', ball: [240, 620], hole: [240, 150] },
        { name: 'Il muretto', ball: [240, 620], hole: [240, 150], walls: [[150, 340, 180, 36]] },
        { name: 'La sabbiera', ball: [120, 620], hole: [360, 150], sand: [[170, 290, 220, 150]] },
        { name: 'La curva', ball: [380, 620], hole: [380, 130], walls: [[230, 250, 232, 32]] },
        {
          name: 'La discesa', ball: [240, 620], hole: [240, 150],
          slopes: [[60, 300, 360, 130, 0.1, 0]],
          walls: [[70, 230, 28, 28], [382, 230, 28, 28]],
        },
        { name: 'Lo zig-zag', ball: [400, 640], hole: [90, 120], walls: [[18, 460, 300, 30], [170, 260, 292, 30]] },
        {
          name: 'I funghi', ball: [240, 640], hole: [240, 120],
          bumpers: [[160, 390, 20], [320, 390, 20], [240, 280, 22], [240, 500, 18]],
        },
        {
          name: 'Il pendolo', ball: [240, 640], hole: [240, 130],
          movers: [{ x: 240, y: 370, w: 130, h: 24, amp: 150, speed: 0.025 }],
          sand: [[150, 160, 50, 80], [280, 160, 50, 80]],
        },
        {
          name: 'Il gran finale', ball: [80, 650], hole: [400, 110],
          walls: [[18, 520, 330, 26]],
          movers: [{ x: 240, y: 330, w: 110, h: 22, amp: 130, speed: 0.03 }],
          slopes: [[40, 170, 190, 200, 0, 0.09]],
          sand: [[250, 75, 70, 70]],
          bumpers: [[150, 440, 16]],
        },
      ],
    },

    {
      id: 'spiaggia', name: 'La Spiaggia', desc: 'Lagune, dune e un molo stretto. Se finisci in acqua il colpo è perso.',
      theme: { green: '#45a85a', stripe: '#4db263', border: '#c9a26b', borderHi: '#e3c28f', bg: '#d9c08a', bgSpot: '#e4cd99' },
      holes: [
        { name: 'La riva', ball: [240, 620], hole: [240, 140], water: [[18, 330, 150, 90], [312, 330, 150, 90]] },
        { name: 'La laguna', ball: [100, 620], hole: [380, 140], water: [[150, 250, 190, 220]] },
        {
          name: 'Le dune', ball: [240, 640], hole: [240, 120],
          sand: [[18, 230, 170, 140], [292, 400, 170, 130]], bumpers: [[240, 300, 18]],
        },
        { name: 'Il molo', ball: [240, 640], hole: [240, 110], water: [[18, 200, 165, 360], [297, 200, 165, 360]] },
        {
          name: 'Il castello di sabbia', ball: [380, 620], hole: [240, 150],
          walls: [[170, 90, 20, 120], [290, 90, 20, 120], [170, 80, 140, 16]],
          sand: [[50, 400, 140, 100]],
        },
        {
          name: 'Le onde', ball: [240, 650], hole: [240, 110],
          movers: [
            { x: 240, y: 300, w: 120, h: 22, amp: 130, speed: 0.022 },
            { x: 240, y: 480, w: 120, h: 22, amp: 130, speed: -0.03 },
          ],
        },
        {
          name: 'L’isolotto', ball: [100, 640], hole: [290, 180],
          water: [[180, 60, 240, 40], [180, 260, 240, 40], [400, 60, 40, 240]],
        },
        {
          name: 'Le conchiglie', ball: [240, 650], hole: [240, 110],
          bumpers: [[120, 250, 16], [240, 210, 16], [360, 250, 16], [180, 400, 16], [300, 400, 16]],
          water: [[205, 500, 70, 50]],
        },
        {
          name: 'Il faro', ball: [100, 640], hole: [400, 120],
          walls: [[18, 480, 280, 24]], water: [[250, 250, 120, 80]], sand: [[18, 250, 140, 80]],
        },
      ],
    },

    {
      id: 'ghiacciaio', name: 'Il Ghiacciaio', desc: 'Lastre di ghiaccio che fanno scivolare la pallina ed eliche che girano.',
      theme: { green: '#4f9e86', stripe: '#57a78f', border: '#8fb3c9', borderHi: '#c4dceb', bg: '#173041', bgSpot: '#1c3a4f' },
      holes: [
        { name: 'La pista', ball: [240, 640], hole: [240, 140], ice: [[60, 220, 360, 340]] },
        { name: 'Il pattinaggio', ball: [240, 640], hole: [240, 130], ice: [[18, 18, 444, 684]], walls: [[150, 360, 180, 24]] },
        { name: 'Il mulino di ghiaccio', ball: [240, 650], hole: [240, 130], spinners: [{ x: 240, y: 380, len: 200, speed: 0.03 }] },
        {
          name: 'I crepacci', ball: [240, 650], hole: [240, 130],
          water: [[18, 300, 185, 60], [277, 300, 185, 60]], ice: [[140, 400, 200, 180]],
        },
        {
          name: 'Lo slalom', ball: [400, 650], hole: [100, 130],
          walls: [[18, 500, 260, 22], [202, 330, 260, 22]], ice: [[18, 380, 444, 110]],
        },
        {
          name: 'Le due eliche', ball: [240, 650], hole: [240, 120],
          spinners: [{ x: 150, y: 300, len: 130, speed: 0.04 }, { x: 330, y: 460, len: 130, speed: -0.04 }],
        },
        { name: 'L’iceberg', ball: [240, 650], hole: [240, 110], ice: [[18, 18, 444, 684]], bumpers: [[240, 360, 46]] },
        {
          name: 'La valanga', ball: [240, 650], hole: [240, 110],
          slopes: [[18, 200, 444, 200, 0, 0.06]], ice: [[100, 450, 280, 120]],
        },
        {
          name: 'La vetta', ball: [240, 650], hole: [240, 110],
          spinners: [{ x: 240, y: 260, len: 180, speed: 0.035 }],
          walls: [[18, 450, 170, 24], [292, 450, 170, 24]], ice: [[18, 490, 444, 100]],
        },
      ],
    },

    {
      id: 'vulcano', name: 'Il Vulcano', desc: 'Fiumi di lava, rampe che sparano la pallina e pistoni.',
      theme: { green: '#5b8a3c', stripe: '#639343', border: '#3a3030', borderHi: '#5a4a48', bg: '#2a1410', bgSpot: '#351a14' },
      holes: [
        { name: 'La colata', ball: [240, 640], hole: [240, 140], lava: [[18, 330, 180, 60], [282, 330, 180, 60]] },
        { name: 'Il fiume di lava', ball: [80, 640], hole: [400, 120], lava: [[18, 250, 280, 40], [182, 450, 280, 40]] },
        {
          name: 'La rampa', ball: [240, 650], hole: [240, 120],
          boosts: [[200, 430, 80, 80, 0, -0.5]], lava: [[18, 200, 150, 120], [312, 200, 150, 120]],
        },
        {
          name: 'I pistoni', ball: [240, 660], hole: [240, 110],
          movers: [
            { x: 240, y: 250, w: 100, h: 22, amp: 140, speed: 0.03 },
            { x: 240, y: 380, w: 100, h: 22, amp: 140, speed: -0.025 },
            { x: 240, y: 510, w: 100, h: 22, amp: 140, speed: 0.035 },
          ],
        },
        {
          name: 'Il cratere', ball: [240, 650], hole: [255, 280],
          lava: [[140, 200, 200, 30], [140, 330, 200, 30], [140, 230, 30, 100]],
        },
        { name: 'Il geyser', ball: [100, 640], hole: [100, 130], boosts: [[18, 320, 444, 60, 0.35, 0]] },
        {
          name: 'Il magma mobile', ball: [240, 650], hole: [240, 130],
          lava: [[18, 330, 150, 60], [312, 330, 150, 60]],
          movers: [{ x: 240, y: 360, w: 24, h: 90, amp: 110, speed: 0.03, axis: 'y' }],
        },
        {
          name: 'Il ponte', ball: [240, 650], hole: [240, 120],
          lava: [[18, 250, 185, 200], [277, 250, 185, 200]], boosts: [[203, 250, 74, 200, 0, -0.12]],
        },
        {
          name: 'L’eruzione', ball: [100, 650], hole: [240, 110],
          lava: [[18, 450, 250, 40]],
          movers: [{ x: 240, y: 300, w: 120, h: 22, amp: 130, speed: 0.035 }],
          boosts: [[360, 520, 60, 60, 0, -0.4]],
          bumpers: [[120, 200, 18], [360, 180, 18]],
        },
      ],
    },

    {
      id: 'spazio', name: 'Lo Spazio', desc: 'Portali che teletrasportano, asteroidi e satelliti in orbita.',
      theme: { green: '#3b4190', stripe: '#434a9c', border: '#8d96ab', borderHi: '#c3cad8', bg: '#0a0a1c', bgSpot: '#11112a', stars: true },
      holes: [
        {
          name: 'Il decollo', ball: [240, 650], hole: [240, 110],
          walls: [[18, 340, 444, 30]], portals: [{ a: [240, 470], b: [240, 240] }],
        },
        {
          name: 'Gli asteroidi', ball: [240, 660], hole: [240, 110],
          bumpers: [[120, 210, 22], [270, 250, 26], [380, 330, 20], [150, 420, 24], [320, 510, 18]],
        },
        { name: 'L’orbita', ball: [240, 650], hole: [240, 110], spinners: [{ x: 240, y: 360, len: 260, speed: 0.02 }] },
        {
          name: 'Il wormhole', ball: [380, 640], hole: [240, 140],
          walls: [[140, 60, 200, 20], [140, 60, 20, 200], [320, 60, 20, 200], [140, 240, 200, 20]],
          portals: [{ a: [100, 500], b: [240, 205] }],
        },
        {
          name: 'La stazione', ball: [240, 650], hole: [240, 110],
          movers: [
            { x: 160, y: 360, w: 24, h: 110, amp: 110, speed: 0.03, axis: 'y' },
            { x: 320, y: 360, w: 24, h: 110, amp: 110, speed: -0.03, axis: 'y' },
          ],
        },
        {
          name: 'Gravità zero', ball: [240, 650], hole: [240, 110],
          slopes: [[18, 160, 444, 150, 0.08, 0], [18, 400, 444, 150, -0.08, 0]],
        },
        {
          name: 'Il teletrasporto', ball: [400, 650], hole: [100, 120],
          walls: [[18, 300, 444, 24]], portals: [{ a: [80, 500], b: [400, 200] }],
        },
        {
          name: 'I satelliti', ball: [240, 650], hole: [240, 110],
          spinners: [{ x: 140, y: 300, len: 110, speed: 0.05 }, { x: 340, y: 300, len: 110, speed: -0.05 }],
          bumpers: [[240, 450, 22]],
        },
        {
          name: 'Il buco nero', ball: [240, 650], hole: [240, 300],
          bumpers: [[310, 300, 14], [275, 361, 14], [205, 361, 14], [170, 300, 14], [205, 239, 14], [275, 239, 14]],
          movers: [{ x: 240, y: 520, w: 100, h: 20, amp: 140, speed: 0.03 }],
        },
      ],
    },

    {
      id: 'giungla', name: 'La Giungla', desc: 'Fiumi, radici, un tempio nascosto e cascate che spingono indietro.',
      theme: { green: '#2f8a3e', stripe: '#369446', border: '#5a3d1e', borderHi: '#7d5a2f', bg: '#0e2a14', bgSpot: '#123419' },
      holes: [
        {
          name: 'La liana', ball: [240, 650], hole: [240, 120],
          water: [[18, 380, 180, 40], [282, 380, 180, 40]],
          movers: [{ x: 240, y: 300, w: 24, h: 70, amp: 80, speed: 0.03, axis: 'y' }],
        },
        { name: 'Il fiume', ball: [400, 650], hole: [390, 120], water: [[18, 260, 280, 50], [182, 440, 280, 50]] },
        {
          name: 'Le radici', ball: [240, 650], hole: [240, 110],
          walls: [[80, 250, 100, 16], [300, 250, 100, 16], [190, 370, 100, 16], [60, 480, 120, 16], [300, 480, 120, 16]],
        },
        {
          name: 'Il tempio', ball: [240, 650], hole: [240, 150],
          walls: [[150, 80, 180, 18], [150, 80, 18, 180], [312, 80, 18, 180], [150, 242, 66, 18], [264, 242, 66, 18]],
        },
        { name: 'La palude', ball: [240, 650], hole: [240, 110], sand: [[18, 300, 444, 120]], water: [[100, 320, 60, 60], [320, 340, 60, 60]] },
        {
          name: 'I pappagalli', ball: [240, 650], hole: [240, 110],
          spinners: [{ x: 240, y: 300, len: 160, speed: 0.03 }], bumpers: [[100, 450, 18], [380, 450, 18]],
        },
        {
          name: 'La cascata', ball: [240, 650], hole: [240, 110],
          slopes: [[180, 150, 120, 350, 0, 0.12]], water: [[18, 520, 140, 60]],
        },
        {
          name: 'Il ponte di corda', ball: [100, 650], hole: [380, 110],
          water: [[18, 250, 170, 200], [282, 250, 180, 200]], sand: [[290, 470, 100, 45]],
        },
        {
          name: 'L’idolo d’oro', ball: [400, 650], hole: [240, 100],
          walls: [[18, 500, 300, 22]], water: [[200, 300, 262, 60]],
          portals: [{ a: [80, 420], b: [380, 220] }],
          movers: [{ x: 240, y: 170, w: 90, h: 20, amp: 120, speed: 0.03 }],
        },
      ],
    },
  ];

  const rect = ([x, y, w, h]) => ({ x, y, w, h });
  const accRect = ([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay });

  function buildCourse(def) {
    return {
      name: def.name,
      ball: { x: def.ball[0], y: def.ball[1] },
      hole: { x: def.hole[0], y: def.hole[1] },
      border: [
        { x: 0, y: 0, w: W, h: BORDER },
        { x: 0, y: H - BORDER, w: W, h: BORDER },
        { x: 0, y: 0, w: BORDER, h: H },
        { x: W - BORDER, y: 0, w: BORDER, h: H },
      ],
      walls: (def.walls || []).map(rect),
      sand: (def.sand || []).map(rect),
      ice: (def.ice || []).map(rect),
      water: (def.water || []).map(rect),
      lava: (def.lava || []).map(rect),
      slopes: (def.slopes || []).map(accRect),
      boosts: (def.boosts || []).map(accRect),
      bumpers: (def.bumpers || []).map(([x, y, r]) => ({ x, y, r, flash: 0 })),
      movers: (def.movers || []).map((m) => Object.assign({ axis: 'x' }, m)),
      spinners: (def.spinners || []).map((s) => Object.assign({ width: 10 }, s)),
      portals: (def.portals || []).map((p) => ({ a: { x: p.a[0], y: p.a[1] }, b: { x: p.b[0], y: p.b[1] } })),
    };
  }

  function moverRect(m, tick) {
    const off = Math.sin(tick * m.speed) * m.amp;
    const v = Math.cos(tick * m.speed) * m.amp * m.speed;
    if (m.axis === 'y') return { x: m.x - m.w / 2, y: m.y + off - m.h / 2, w: m.w, h: m.h, vx: 0, vy: v };
    return { x: m.x + off - m.w / 2, y: m.y - m.h / 2, w: m.w, h: m.h, vx: v, vy: 0 };
  }

  function spinnerEnds(s, tick) {
    const a = tick * s.speed;
    const dx = Math.cos(a) * s.len / 2;
    const dy = Math.sin(a) * s.len / 2;
    return { x1: s.x - dx, y1: s.y - dy, x2: s.x + dx, y2: s.y + dy };
  }

  const inRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  function bounce(b, nx, ny, e, svx, svy) {
    const vrx = b.vx - (svx || 0);
    const vry = b.vy - (svy || 0);
    const vn = vrx * nx + vry * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
    }
  }

  // Urto pallina-rettangolo. vx/vy del rettangolo servono per i blocchi in movimento.
  function collideRect(b, r, e) {
    const cx = Math.max(r.x, Math.min(b.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(b.y, r.y + r.h));
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= BALL_R * BALL_R) return false;
    let nx, ny, d;
    if (d2 > 1e-9) {
      d = Math.sqrt(d2);
      nx = dx / d;
      ny = dy / d;
    } else {
      // centro della pallina dentro il rettangolo: esce dal lato più vicino
      const l = b.x - r.x, rr = r.x + r.w - b.x, t = b.y - r.y, bt = r.y + r.h - b.y;
      const m = Math.min(l, rr, t, bt);
      if (m === l) { nx = -1; ny = 0; d = -l; }
      else if (m === rr) { nx = 1; ny = 0; d = -rr; }
      else if (m === t) { nx = 0; ny = -1; d = -t; }
      else { nx = 0; ny = 1; d = -bt; }
    }
    const pen = BALL_R - d;
    b.x += nx * pen;
    b.y += ny * pen;
    bounce(b, nx, ny, e, r.vx, r.vy);
    return true;
  }

  function collideCircle(b, c, e) {
    const dx = b.x - c.x;
    const dy = b.y - c.y;
    const min = BALL_R + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return false;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d, ny = dy / d;
    b.x = c.x + nx * min;
    b.y = c.y + ny * min;
    bounce(b, nx, ny, e);
    return true;
  }

  // Urto con l'elica: un segmento che ruota attorno al suo centro.
  function collideSpinner(b, s, tick) {
    const e = spinnerEnds(s, tick);
    const sx = e.x2 - e.x1, sy = e.y2 - e.y1;
    const len2 = sx * sx + sy * sy;
    let t = ((b.x - e.x1) * sx + (b.y - e.y1) * sy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = e.x1 + sx * t, py = e.y1 + sy * t;
    const dx = b.x - px, dy = b.y - py;
    const min = BALL_R + s.width / 2;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return false;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d, ny = dy / d;
    b.x = px + nx * min;
    b.y = py + ny * min;
    // velocità del punto dell'elica che colpisce la pallina
    const rx = px - s.x, ry = py - s.y;
    bounce(b, nx, ny, WALL_BOUNCE, -s.speed * ry, s.speed * rx);
    return true;
  }

  // Avanza la pallina di un tick. Restituisce cosa è successo.
  function step(b, c, tick) {
    const ev = { hit: null, holed: false, stopped: false, sand: false, hazard: null, portal: null };
    let pushed = false;
    for (const s of c.slopes) {
      if (inRect(b.x, b.y, s)) { b.vx += s.ax; b.vy += s.ay; pushed = true; }
    }
    for (const s of c.boosts) {
      if (inRect(b.x, b.y, s)) { b.vx += s.ax; b.vy += s.ay; pushed = true; }
    }
    ev.sand = c.sand.some((s) => inRect(b.x, b.y, s));
    const onIce = !ev.sand && c.ice.some((s) => inRect(b.x, b.y, s));
    const f = ev.sand ? SAND_FRICTION : onIce ? ICE_FRICTION : FRICTION;
    b.vx *= f;
    b.vy *= f;
    // attrito volvente: evita che la pallina "strisci" all'infinito a bassa velocità
    const sp0 = Math.hypot(b.vx, b.vy);
    if (sp0 > 0) {
      const k = Math.max(0, sp0 - (onIce ? ICE_ROLL_DECEL : ROLL_DECEL)) / sp0;
      b.vx *= k;
      b.vy *= k;
    }
    // non superare mai la velocità massima (le rampe potrebbero esagerare)
    const spMax = Math.hypot(b.vx, b.vy);
    if (spMax > MAX_V * 1.2) {
      b.vx *= (MAX_V * 1.2) / spMax;
      b.vy *= (MAX_V * 1.2) / spMax;
    }

    const sp = Math.hypot(b.vx, b.vy);
    const n = Math.max(1, Math.ceil(sp / 2));
    for (let i = 0; i < n; i++) {
      b.x += b.vx / n;
      b.y += b.vy / n;
      for (const r of c.border) if (collideRect(b, r, WALL_BOUNCE)) ev.hit = ev.hit || 'wall';
      for (const r of c.walls) if (collideRect(b, r, WALL_BOUNCE)) ev.hit = ev.hit || 'wall';
      for (const m of c.movers) if (collideRect(b, moverRect(m, tick), WALL_BOUNCE)) ev.hit = ev.hit || 'wall';
      for (const s of c.spinners) if (collideSpinner(b, s, tick)) ev.hit = ev.hit || 'wall';
      for (const bp of c.bumpers) {
        if (collideCircle(b, bp, BUMPER_BOUNCE)) { ev.hit = 'bumper'; bp.flash = 1; }
      }
    }

    // portali (a senso unico: si entra da "a" e si esce da "b" con la stessa velocità)
    for (const p of c.portals) {
      if (Math.hypot(b.x - p.a.x, b.y - p.a.y) < PORTAL_R) {
        ev.portal = { from: { x: p.a.x, y: p.a.y }, to: { x: p.b.x, y: p.b.y } };
        b.x = p.b.x;
        b.y = p.b.y;
        break;
      }
    }

    // acqua e lava
    for (const r of c.water) if (inRect(b.x, b.y, r)) { ev.hazard = 'water'; return ev; }
    for (const r of c.lava) if (inRect(b.x, b.y, r)) { ev.hazard = 'lava'; return ev; }

    // buca
    const hx = c.hole.x - b.x;
    const hy = c.hole.y - b.y;
    const hd = Math.hypot(hx, hy);
    const sp2 = Math.hypot(b.vx, b.vy);
    if (hd < HOLE_R) {
      if (sp2 < CAPTURE_V) {
        ev.holed = true;
        return ev;
      }
      // troppo veloce: la pallina "assaggia" il bordo e devia un po'
      b.vx += (hx / (hd || 1)) * 0.5;
      b.vy += (hy / (hd || 1)) * 0.5;
    }

    if (sp2 < STOP_V && !pushed) {
      b.vx = 0;
      b.vy = 0;
      ev.stopped = true;
    }
    return ev;
  }

  // Simula un colpo completo (usato dallo script di verifica).
  function simulate(c, from, angle, power, startTick, maxTicks) {
    const b = { x: from.x, y: from.y, vx: Math.cos(angle) * power * MAX_V, vy: Math.sin(angle) * power * MAX_V };
    let tick = startTick || 0;
    const limit = maxTicks || 4000;
    for (let i = 0; i < limit; i++) {
      tick++;
      const ev = step(b, c, tick);
      if (ev.holed) return { x: b.x, y: b.y, holed: true, tick };
      if (ev.hazard) return { x: from.x, y: from.y, holed: false, hazard: true, tick };
      if (ev.stopped) return { x: b.x, y: b.y, holed: false, tick };
    }
    return { x: b.x, y: b.y, holed: false, tick, timeout: true };
  }

  const api = {
    W, H, BORDER, BALL_R, HOLE_R, PORTAL_R, MAX_V, COURSES, HOLES: COURSES[0].holes,
    buildCourse, moverRect, spinnerEnds, inRect, step, simulate,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PuttPhysics = api;
})(typeof window !== 'undefined' ? window : globalThis);
