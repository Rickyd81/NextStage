// Fisica e percorso di Putt Matto.
// Funziona sia nel browser (window.PuttPhysics) sia in Node (per lo script di verifica delle buche).
(function (root) {
  'use strict';

  const W = 480;          // larghezza del campo (unità di gioco)
  const H = 720;          // altezza del campo
  const BORDER = 18;      // spessore della sponda di legno
  const BALL_R = 7;
  const HOLE_R = 12;
  const MAX_V = 14;       // velocità massima di un colpo (unità per tick)
  const FRICTION = 0.986;
  const SAND_FRICTION = 0.935;
  const STOP_V = 0.06;
  const ROLL_DECEL = 0.012;
  const CAPTURE_V = 5.5;  // sopra questa velocità la pallina "salta" la buca
  const WALL_BOUNCE = 0.75;
  const BUMPER_BOUNCE = 1.05;

  // Le 9 buche. Rettangoli: [x, y, larghezza, altezza].
  // slopes: [x, y, w, h, accelerazioneX, accelerazioneY]
  // bumpers: [x, y, raggio]
  // movers: blocchi che scorrono avanti e indietro in orizzontale.
  const HOLES = [
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
  ];

  const rect = ([x, y, w, h]) => ({ x, y, w, h });

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
      slopes: (def.slopes || []).map(([x, y, w, h, ax, ay]) => ({ x, y, w, h, ax, ay })),
      bumpers: (def.bumpers || []).map(([x, y, r]) => ({ x, y, r, flash: 0 })),
      movers: (def.movers || []).map((m) => Object.assign({}, m)),
    };
  }

  function moverRect(m, tick) {
    const cx = m.x + Math.sin(tick * m.speed) * m.amp;
    return { x: cx - m.w / 2, y: m.y - m.h / 2, w: m.w, h: m.h, vx: Math.cos(tick * m.speed) * m.amp * m.speed };
  }

  const inRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  // Urto pallina-rettangolo. vx/vy del rettangolo servono per i blocchi in movimento.
  function collideRect(b, r, e, rvx) {
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
    const vrx = b.vx - (rvx || 0);
    const vn = vrx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
    }
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
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
    }
    return true;
  }

  // Avanza la pallina di un tick. Restituisce cosa è successo.
  function step(b, c, tick) {
    const ev = { hit: null, holed: false, stopped: false, sand: false };
    let onSlope = false;
    for (const s of c.slopes) {
      if (inRect(b.x, b.y, s)) { b.vx += s.ax; b.vy += s.ay; onSlope = true; }
    }
    ev.sand = c.sand.some((s) => inRect(b.x, b.y, s));
    const f = ev.sand ? SAND_FRICTION : FRICTION;
    b.vx *= f;
    b.vy *= f;
    // attrito volvente: evita che la pallina "strisci" all'infinito a bassa velocità
    const sp0 = Math.hypot(b.vx, b.vy);
    if (sp0 > 0) {
      const k = Math.max(0, sp0 - ROLL_DECEL) / sp0;
      b.vx *= k;
      b.vy *= k;
    }

    const sp = Math.hypot(b.vx, b.vy);
    const n = Math.max(1, Math.ceil(sp / 2));
    for (let i = 0; i < n; i++) {
      b.x += b.vx / n;
      b.y += b.vy / n;
      for (const r of c.border) if (collideRect(b, r, WALL_BOUNCE)) ev.hit = ev.hit || 'wall';
      for (const r of c.walls) if (collideRect(b, r, WALL_BOUNCE)) ev.hit = ev.hit || 'wall';
      for (const m of c.movers) {
        const r = moverRect(m, tick);
        if (collideRect(b, r, WALL_BOUNCE, r.vx)) ev.hit = ev.hit || 'wall';
      }
      for (const bp of c.bumpers) {
        if (collideCircle(b, bp, BUMPER_BOUNCE)) { ev.hit = 'bumper'; bp.flash = 1; }
      }
    }

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

    if (sp2 < STOP_V && !onSlope) {
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
      if (ev.stopped) return { x: b.x, y: b.y, holed: false, tick };
    }
    return { x: b.x, y: b.y, holed: false, tick, timeout: true };
  }

  const api = {
    W, H, BORDER, BALL_R, HOLE_R, MAX_V, HOLES,
    buildCourse, moverRect, inRect, step, simulate,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PuttPhysics = api;
})(typeof window !== 'undefined' ? window : globalThis);
