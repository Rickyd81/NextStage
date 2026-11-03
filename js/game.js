// Putt Matto: logica di gioco, disegno, comandi (tastiera e touch), negozio e salvataggi.
(function () {
  'use strict';

  const P = window.PuttPhysics;
  const { CHARACTERS, drawCharacter } = window.PuttCharacters;
  const { W, H, BALL_R, HOLE_R, MAX_V } = P;

  const MAX_DRAG = 170;        // trascinamento (in unità di campo) per la potenza massima
  const STORAGE_KEY = 'puttmatto.v1';
  const TICK_MS = 1000 / 60;

  // ---------- salvataggio ----------
  const save = loadSave();
  function loadSave() {
    const base = { wins: 0, totalWins: 0, owned: ['gino'], selected: 'gino' };
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (data && typeof data === 'object') {
        const merged = Object.assign(base, data);
        if (!Array.isArray(merged.owned)) merged.owned = ['gino'];
        if (!merged.owned.includes('gino')) merged.owned.push('gino');
        if (!merged.owned.includes(merged.selected)) merged.selected = 'gino';
        return merged;
      }
    } catch (e) { /* salvataggio non disponibile: si gioca lo stesso */ }
    return base;
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ }
  }
  const charById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

  // ---------- elementi della pagina ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const screens = ['menu', 'shop', 'help', 'pause', 'result'];
  const hud = $('hud');
  const toastEl = $('toast');
  const hintEl = $('controls-hint');

  // ---------- stato ----------
  const S = {
    screen: 'menu',
    holeIndex: 0,
    course: null,
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    shotFrom: { x: 0, y: 0 },
    strokes: 0,
    maxStrokes: 2,
    bonusNext: false,
    phase: 'idle',       // idle | aim | rolling | sinking | between
    aim: -Math.PI / 2,
    power: 0,
    charging: false,
    chargeDir: 1,
    drag: null,          // { x, y, cx, cy } in coordinate di campo
    tick: 0,
    timer: 0,
    sink: 0,
    particles: [],
    lastInput: 'touch',
  };
  const keys = new Set();

  // ---------- audio (piccoli suoni sintetizzati) ----------
  let audio = null;
  function beep(freq, dur, type, vol, slideTo) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, audio.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.15, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur + 0.02);
    } catch (e) { /* niente audio */ }
  }
  const sfx = {
    putt: () => beep(220, 0.08, 'triangle', 0.25, 120),
    wall: () => beep(160, 0.05, 'square', 0.05),
    bumper: () => beep(520, 0.12, 'sine', 0.15, 900),
    hole: () => { beep(660, 0.12, 'sine', 0.2); setTimeout(() => beep(990, 0.2, 'sine', 0.2), 110); },
    ace: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.18), i * 90)),
    fail: () => beep(300, 0.5, 'sawtooth', 0.08, 90),
    win: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle', 0.16), i * 110)),
  };

  // ---------- vista / ridimensionamento ----------
  const view = { s: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const top = 64; // spazio per l'HUD
    const pad = 8;
    const s = Math.min((cw - pad * 2) / W, (ch - top - pad * 2) / H);
    view.s = s;
    view.dpr = dpr;
    view.cw = cw;
    view.ch = ch;
    view.ox = (cw - W * s) / 2;
    view.oy = top + (ch - top - H * s) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left - view.ox) / view.s, y: (clientY - r.top - view.oy) / view.s };
  }

  // ---------- schermate ----------
  function show(name) {
    S.screen = name;
    for (const s of screens) $('screen-' + s).classList.toggle('hidden', s !== name);
    const playing = name === null;
    hud.classList.toggle('hidden', !(playing || name === 'pause'));
    hintEl.classList.toggle('hidden', !playing);
    if (name === 'menu') refreshMenu();
    if (name === 'shop') buildShop();
    if (name) {
      const first = $('screen-' + name).querySelector('button:not(:disabled)');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
    } else if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    keys.clear();
    S.charging = false;
    S.drag = null;
  }

  function refreshMenu() {
    $('menu-wins').textContent = save.wins;
    $('menu-char-name').textContent = charById(save.selected).name;
  }

  function buildShop() {
    $('shop-wins').textContent = save.wins;
    const grid = $('shop-grid');
    grid.innerHTML = '';
    for (const c of CHARACTERS) {
      const owned = save.owned.includes(c.id);
      const selected = save.selected === c.id;
      const card = document.createElement('div');
      card.className = 'card' + (selected ? ' selected' : '');
      const cv = document.createElement('canvas');
      cv.width = 240;
      cv.height = 260;
      cv.dataset.char = c.id;
      card.appendChild(cv);
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = c.name;
      card.appendChild(name);
      const desc = document.createElement('p');
      desc.className = 'desc';
      desc.textContent = c.desc;
      card.appendChild(desc);
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = owned ? (c.cost === 0 ? 'Personaggio iniziale' : 'Già tuo') : `🏆 ${c.cost} vittorie`;
      card.appendChild(price);
      const btn = document.createElement('button');
      if (selected) {
        btn.textContent = 'In uso';
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = 'Usa';
        btn.onclick = () => { save.selected = c.id; persist(); buildShop(); focusCard(c.id); };
      } else if (save.wins >= c.cost) {
        btn.textContent = `Compra (${c.cost} 🏆)`;
        btn.className = 'primary';
        btn.onclick = () => {
          save.wins -= c.cost;
          save.owned.push(c.id);
          save.selected = c.id;
          persist();
          sfx.ace();
          buildShop();
          focusCard(c.id);
          toast(`${c.name} è tuo!`);
        };
      } else {
        btn.textContent = `Ti mancano ${c.cost - save.wins} 🏆`;
        btn.disabled = true;
      }
      btn.dataset.char = c.id;
      card.appendChild(btn);
      grid.appendChild(card);
    }
  }
  function focusCard(id) {
    const b = document.querySelector(`#shop-grid button[data-char="${id}"]`);
    const target = b && !b.disabled ? b : document.querySelector('#screen-shop .buttons button');
    if (target) target.focus({ preventScroll: true });
  }

  let toastTimer = null;
  function toast(html, ms) {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 1400);
  }

  function showResult(title, text, buttons) {
    $('result-title').textContent = title;
    $('result-text').innerHTML = text;
    const box = $('result-buttons');
    box.innerHTML = '';
    buttons.forEach(([label, action, primary]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.action = action;
      if (primary) b.className = 'primary';
      box.appendChild(b);
    });
    show('result');
  }

  // azioni dei pulsanti (data-action)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'play' || a === 'restart') startRound();
    else if (a === 'shop') show('shop');
    else if (a === 'help') show('help');
    else if (a === 'menu') show('menu');
    else if (a === 'resume') show(null);
  });
  $('btn-pause').addEventListener('click', () => { if (S.screen === null) show('pause'); });

  // ---------- giro e buche ----------
  function startRound() {
    S.bonusNext = false;
    loadHole(0);
    show(null);
  }

  function loadHole(i) {
    S.holeIndex = i;
    S.course = P.buildCourse(P.HOLES[i]);
    S.ball = { x: S.course.ball.x, y: S.course.ball.y, vx: 0, vy: 0 };
    S.shotFrom = { x: S.ball.x, y: S.ball.y };
    S.strokes = 0;
    S.maxStrokes = S.bonusNext ? 3 : 2;
    S.bonusNext = false;
    S.aim = Math.atan2(S.course.hole.y - S.ball.y, S.course.hole.x - S.ball.x);
    S.power = 0;
    S.charging = false;
    S.drag = null;
    S.sink = 0;
    S.phase = 'aim';
    S.particles = [];
    updateHud();
    const extra = S.maxStrokes === 3 ? '<small>⭐ Bonus hole in one: hai 3 colpi!</small>' : '';
    toast(`Buca ${i + 1}: ${S.course.name}${extra}`, 1600);
  }

  function updateHud() {
    $('hud-hole').textContent = `${S.holeIndex + 1}/9`;
    $('hud-strokes').textContent = `${S.strokes}/${S.maxStrokes}`;
    $('hud-bonus').classList.toggle('hidden', S.maxStrokes !== 3);
    hintEl.textContent = S.lastInput === 'keyboard'
      ? '← → mira · tieni premuto Spazio e rilascia per tirare'
      : 'Trascina all’indietro e lascia per tirare';
  }

  function shoot(power) {
    if (S.phase !== 'aim' || power < 0.03) return;
    S.strokes++;
    S.shotFrom = { x: S.ball.x, y: S.ball.y };
    S.ball.vx = Math.cos(S.aim) * power * MAX_V;
    S.ball.vy = Math.sin(S.aim) * power * MAX_V;
    S.phase = 'rolling';
    S.power = 0;
    S.charging = false;
    sfx.putt();
    updateHud();
  }

  function onHoled() {
    S.phase = 'sinking';
    S.sink = 0;
    const ace = S.strokes === 1;
    if (ace) {
      sfx.ace();
      if (S.holeIndex < 8) {
        S.bonusNext = true;
        toast('HOLE IN ONE! ⭐<small>Alla prossima buca hai 3 colpi</small>', 1800);
      } else {
        toast('HOLE IN ONE! ⭐', 1600);
      }
      burst(S.course.hole.x, S.course.hole.y, '#f5c542', 40);
    } else {
      sfx.hole();
      toast(S.strokes === 2 ? 'Dentro!' : 'Salvato al terzo!', 1100);
      burst(S.course.hole.x, S.course.hole.y, '#ffffff', 18);
    }
    S.timer = ace ? 110 : 75;
  }

  function afterSink() {
    if (S.holeIndex === 8) {
      save.wins++;
      save.totalWins++;
      persist();
      sfx.win();
      S.phase = 'idle';
      const next = CHARACTERS.filter((c) => !save.owned.includes(c.id)).sort((a, b) => a.cost - b.cost)[0];
      let tip = '';
      if (next) {
        tip = save.wins >= next.cost
          ? `<br>Puoi già comprare <b>${next.name}</b> nel Negozio!`
          : `<br>Ancora ${next.cost - save.wins} per sbloccare <b>${next.name}</b>.`;
      }
      showResult('Giro completato! 🏆',
        `Hai chiuso tutte e 9 le buche. <b>+1 vittoria</b>.<br>Vittorie da spendere: <b>${save.wins}</b>${tip}`,
        [['Gioca ancora', 'play', true], ['Negozio', 'shop'], ['Menu', 'menu']]);
    } else {
      loadHole(S.holeIndex + 1);
    }
  }

  function onStopped() {
    if (S.strokes >= S.maxStrokes) {
      S.phase = 'idle';
      sfx.fail();
      const n = S.holeIndex + 1;
      setTimeout(() => {
        showResult('Troppi colpi!',
          `Alla buca ${n} hai finito i ${S.maxStrokes} colpi.<br>Si ricomincia il percorso dalla <b>buca 1</b>.`,
          [['Ricomincia', 'restart', true], ['Menu', 'menu']]);
      }, 500);
    } else {
      S.phase = 'aim';
      S.aim = Math.atan2(S.course.hole.y - S.ball.y, S.course.hole.x - S.ball.x);
    }
  }

  // ---------- particelle ----------
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1 + Math.random() * 3;
      S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 40 + Math.random() * 20, max: 60, color, r: 2 + Math.random() * 2, kind: 'dot' });
    }
  }
  function trail() {
    const t = charById(save.selected).trail;
    if (!t) return;
    const b = S.ball;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 0.4 || Math.random() > Math.min(1, sp / 4)) return;
    const p = { x: b.x, y: b.y, vx: 0, vy: 0, life: 30, max: 30, color: t.color, r: 2.2, kind: t.kind };
    if (t.kind === 'spark') { p.vx = (Math.random() - 0.5) * 2; p.vy = (Math.random() - 0.5) * 2; p.life = p.max = 22; }
    if (t.kind === 'wind') { p.vx = -b.vx * 0.15; p.vy = -b.vy * 0.15; p.r = 1.5; }
    if (t.kind === 'drop') { p.x += (Math.random() - 0.5) * 6; p.y += (Math.random() - 0.5) * 6; p.r = 1.8 + Math.random(); }
    if (t.kind === 'petal') { p.vx = (Math.random() - 0.5); p.vy = (Math.random() - 0.5); p.r = 2.5; }
    if (t.kind === 'pixel') { p.r = 2.5; }
    S.particles.push(p);
  }
  function updateParticles() {
    for (const p of S.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life--;
    }
    S.particles = S.particles.filter((p) => p.life > 0);
  }

  // ---------- aggiornamento (60 tick al secondo) ----------
  function update() {
    S.tick++;
    if (S.course) for (const b of S.course.bumpers) b.flash = Math.max(0, b.flash - 0.06);
    updateParticles();
    if (S.screen !== null) return;

    if (S.phase === 'aim') {
      const fine = keys.has('Shift');
      const rot = (fine ? 0.25 : 1.4) * Math.PI / 180;
      if (keys.has('ArrowLeft') || keys.has('a')) S.aim -= rot;
      if (keys.has('ArrowRight') || keys.has('d')) S.aim += rot;
      if (S.charging) {
        S.power += 0.016 * S.chargeDir;
        if (S.power >= 1) { S.power = 1; S.chargeDir = -1; }
        if (S.power <= 0) { S.power = 0; S.chargeDir = 1; }
      }
    } else if (S.phase === 'rolling') {
      const ev = P.step(S.ball, S.course, S.tick);
      trail();
      if (ev.hit === 'wall' && Math.hypot(S.ball.vx, S.ball.vy) > 1.5) sfx.wall();
      if (ev.hit === 'bumper') sfx.bumper();
      if (ev.holed) onHoled();
      else if (ev.stopped) onStopped();
    } else if (S.phase === 'sinking') {
      S.sink = Math.min(1, S.sink + 0.08);
      S.ball.x += (S.course.hole.x - S.ball.x) * 0.3;
      S.ball.y += (S.course.hole.y - S.ball.y) * 0.3;
      if (--S.timer <= 0) afterSink();
    }
  }

  // ---------- disegno ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#14361f';
    ctx.fillRect(0, 0, view.cw, view.ch);
    // ciuffi d'erba decorativi
    ctx.fillStyle = '#18402a';
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % view.cw;
      const y = (i * 151) % view.ch;
      ctx.beginPath(); ctx.arc(x, y, 30 + (i % 5) * 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawCourse(c, t) {
    // green con strisce di taglio
    ctx.fillStyle = '#3fa34d';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#47ad55';
    for (let y = 0; y < H; y += 64) ctx.fillRect(0, y, W, Math.min(32, H - y));

    // pendenze con frecce animate
    for (const s of c.slopes) {
      ctx.fillStyle = 'rgba(20, 70, 30, 0.25)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      const ang = Math.atan2(s.ay, s.ax);
      const off = (t * 0.6) % 30;
      ctx.save();
      ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let x = s.x - 30; x < s.x + s.w + 30; x += 30) {
        for (let y = s.y - 30; y < s.y + s.h + 30; y += 30) {
          const px = x + Math.cos(ang) * off;
          const py = y + Math.sin(ang) * off;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(3, 0); ctx.lineTo(-5, 6); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // sabbia
    for (const s of c.sand) {
      ctx.fillStyle = '#d9c28a';
      rr(s.x - 3, s.y - 3, s.w + 6, s.h + 6, 18); ctx.fill();
      ctx.fillStyle = '#ead7a3';
      rr(s.x, s.y, s.w, s.h, 16); ctx.fill();
      ctx.fillStyle = 'rgba(160,130,70,0.35)';
      for (let i = 0; i < (s.w * s.h) / 260; i++) {
        const x = s.x + 8 + ((i * 37) % Math.max(1, s.w - 16));
        const y = s.y + 8 + ((i * 53) % Math.max(1, s.h - 16));
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // buca
    const h = c.hole;
    ctx.fillStyle = '#2d7a3a';
    ctx.beginPath(); ctx.arc(h.x, h.y, HOLE_R + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c1a10';
    ctx.beginPath(); ctx.arc(h.x, h.y, HOLE_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d2d22';
    ctx.beginPath(); ctx.arc(h.x, h.y + 2, HOLE_R - 3, Math.PI, 0); ctx.fill();

    // muri
    for (const w of c.walls) drawWall(w);
    // bordo di legno
    ctx.fillStyle = '#7a4b26';
    for (const b of c.border) ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#a8743f';
    ctx.lineWidth = 3;
    ctx.strokeRect(P.BORDER - 1.5, P.BORDER - 1.5, W - P.BORDER * 2 + 3, H - P.BORDER * 2 + 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let x = 30; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + 12, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 20, H - 4); ctx.lineTo(x + 32, H - 4); ctx.stroke();
    }

    // funghi (respingenti)
    for (const b of c.bumpers) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(b.x + 3, b.y + 4, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.flash > 0 ? `rgb(255,${120 + b.flash * 120 | 0},${120 + b.flash * 100 | 0})` : '#d84a4a';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3e6';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * b.r * 0.55, b.y + Math.sin(a) * b.r * 0.55, b.r * 0.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.22, 0, Math.PI * 2); ctx.fill();
    }

    // blocchi mobili
    for (const m of c.movers) {
      const r = P.moverRect(m, S.tick);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      rr(r.x + 3, r.y + 4, r.w, r.h, 6); ctx.fill();
      ctx.fillStyle = '#4c5fd5';
      rr(r.x, r.y, r.w, r.h, 6); ctx.fill();
      ctx.save();
      rr(r.x, r.y, r.w, r.h, 6); ctx.clip();
      ctx.fillStyle = '#f5c542';
      for (let x = r.x - r.h; x < r.x + r.w; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, r.y + r.h); ctx.lineTo(x + 8, r.y + r.h); ctx.lineTo(x + 8 + r.h, r.y); ctx.lineTo(x + r.h, r.y);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawWall(w) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(w.x + 3, w.y + 4, w.w, w.h, 5); ctx.fill();
    ctx.fillStyle = '#8a5a33';
    rr(w.x, w.y, w.w, w.h, 5); ctx.fill();
    ctx.fillStyle = '#a8743f';
    rr(w.x + 2, w.y + 2, w.w - 4, Math.min(8, w.h / 3), 3); ctx.fill();
  }

  function drawFlag(c, t) {
    const h = c.hole;
    const near = Math.hypot(S.ball.x - h.x, S.ball.y - h.y) < 60 && S.phase !== 'aim';
    if (near) return; // si toglie la bandierina quando la pallina si avvicina
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + 18, h.y + 6); ctx.stroke();
    ctx.strokeStyle = '#f4f1e6';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x, h.y - 48); ctx.stroke();
    const wave = Math.sin(t * 0.12) * 3;
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y - 48);
    ctx.quadraticCurveTo(h.x + 12, h.y - 46 + wave, h.x + 24, h.y - 41);
    ctx.lineTo(h.x, h.y - 34);
    ctx.closePath();
    ctx.fill();
  }

  function drawParticles() {
    for (const p of S.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'pixel') ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  function drawBall() {
    const b = S.ball;
    const scale = 1 - S.sink * 0.8;
    if (scale <= 0.05) return;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(b.x + 2, b.y + 3, BALL_R * scale, BALL_R * 0.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R * scale);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#d6dde3');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R * scale, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayer(t) {
    if (!S.course) return;
    const at = S.phase === 'aim' ? S.ball : S.shotFrom;
    // il personaggio sta dal lato opposto alla direzione di tiro, voltato verso la pallina
    const facing = Math.cos(S.aim) >= 0 ? 1 : -1;
    drawCharacter(ctx, save.selected, at.x - 26 * facing, at.y + 9, 0.75, t / 60, facing);
  }

  function drawAim() {
    if (S.phase !== 'aim' || S.screen !== null) return;
    const b = S.ball;
    const power = S.drag ? S.drag.power : S.power;
    const len = 34 + power * 150;
    const dx = Math.cos(S.aim), dy = Math.sin(S.aim);
    ctx.save();
    ctx.setLineDash([2, 9]);
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(b.x + dx * (BALL_R + 4), b.y + dy * (BALL_R + 4));
    ctx.lineTo(b.x + dx * len, b.y + dy * len);
    ctx.stroke();
    ctx.restore();
    // punta
    ctx.save();
    ctx.translate(b.x + dx * len, b.y + dy * len);
    ctx.rotate(S.aim);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
    ctx.restore();

    // barra della potenza (anello attorno alla pallina)
    if (power > 0) {
      const col = power < 0.5 ? '#7bd36a' : power < 0.8 ? '#f5c542' : '#ef4444';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(b.x, b.y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * power); ctx.stroke();
    }
    // elastico del trascinamento
    if (S.drag) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S.drag.x, S.drag.y); ctx.lineTo(S.drag.cx, S.drag.cy); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(S.drag.cx, S.drag.cy, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function render() {
    const t = S.tick;
    drawBackground();
    if (S.course) {
      ctx.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy);
      drawCourse(S.course, t);
      drawParticles();
      drawAim();
      drawBall();
      drawPlayer(t);
      drawFlag(S.course, t);
    }
    // anteprime dei personaggi
    if (S.screen === 'menu') drawPreview($('menu-preview'), save.selected, 2.4);
    if (S.screen === 'shop') {
      document.querySelectorAll('#shop-grid canvas').forEach((cv) => drawPreview(cv, cv.dataset.char, 3.2));
    }
  }

  function drawPreview(cv, id, scale) {
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#3fa34d';
    c.beginPath(); c.ellipse(cv.width / 2, cv.height - 22, cv.width * 0.4, 16, 0, 0, Math.PI * 2); c.fill();
    drawCharacter(c, id, cv.width / 2 - 8 * scale / 2.4, cv.height - 22, scale, S.tick / 60, 1);
  }

  // Per il menu iniziale mostriamo la buca 1 sullo sfondo.
  S.course = P.buildCourse(P.HOLES[0]);
  S.ball = { x: S.course.ball.x, y: S.course.ball.y, vx: 0, vy: 0 };
  S.shotFrom = { x: S.ball.x, y: S.ball.y };

  // ---------- ciclo principale ----------
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= TICK_MS) { update(); acc -= TICK_MS; }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- comandi: tastiera ----------
  const AIM_KEYS = ['ArrowLeft', 'ArrowRight', 'a', 'd', 'Shift'];
  document.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (S.screen !== null) {
      if (k === 'Escape') {
        if (S.screen === 'pause') show(null);
        else if (S.screen === 'shop' || S.screen === 'help') show('menu');
        e.preventDefault();
        return;
      }
      // frecce per spostarsi tra i pulsanti
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
        const list = [...$('screen-' + S.screen).querySelectorAll('button:not(:disabled)')];
        if (!list.length) return;
        let i = list.indexOf(document.activeElement);
        i = (k === 'ArrowUp' || k === 'ArrowLeft') ? i - 1 : i + 1;
        if (i < 0) i = list.length - 1;
        if (i >= list.length) i = 0;
        list[i].focus();
        e.preventDefault();
      }
      return;
    }

    if (S.lastInput !== 'keyboard') { S.lastInput = 'keyboard'; updateHud(); }
    if (k === 'Escape' || k === 'p') { show('pause'); e.preventDefault(); return; }
    if (AIM_KEYS.includes(k)) { keys.add(k); e.preventDefault(); }
    if ((k === ' ' || k === 'Enter') && !e.repeat) {
      e.preventDefault();
      if (S.phase === 'aim' && !S.charging) {
        S.charging = true;
        S.chargeDir = 1;
        S.power = 0;
      }
    }
    if (k === ' ' || k === 'ArrowUp' || k === 'ArrowDown') e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(k);
    if (k === 'Shift') keys.delete('Shift');
    if ((k === ' ' || k === 'Enter') && S.charging && S.screen === null) {
      e.preventDefault();
      const p = S.power;
      S.charging = false;
      shoot(p);
    }
  });
  window.addEventListener('blur', () => { keys.clear(); S.charging = false; S.power = 0; });

  // ---------- comandi: touch (e mouse) a fionda ----------
  canvas.addEventListener('pointerdown', (e) => {
    if (S.screen !== null || S.phase !== 'aim') return;
    if (S.lastInput !== 'touch') { S.lastInput = 'touch'; updateHud(); }
    const p = toWorld(e.clientX, e.clientY);
    S.drag = { x: p.x, y: p.y, cx: p.x, cy: p.y, power: 0, id: e.pointerId };
    S.charging = false;
    S.power = 0;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!S.drag || e.pointerId !== S.drag.id) return;
    const p = toWorld(e.clientX, e.clientY);
    S.drag.cx = p.x;
    S.drag.cy = p.y;
    const dx = S.drag.x - p.x;
    const dy = S.drag.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len > 4) S.aim = Math.atan2(dy, dx);
    S.drag.power = Math.min(1, len / MAX_DRAG);
  });
  function endDrag(e, cancel) {
    if (!S.drag || e.pointerId !== S.drag.id) return;
    const power = S.drag.power;
    S.drag = null;
    if (!cancel && power > 0.05) shoot(power);
  }
  canvas.addEventListener('pointerup', (e) => endDrag(e, false));
  canvas.addEventListener('pointercancel', (e) => endDrag(e, true));
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Pausa automatica se si cambia app/scheda durante una partita.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.screen === null && S.phase === 'aim') show('pause');
  });

  show('menu');

  // Accesso per i test automatici.
  window.__putt = { S, save, shoot, loadHole, startRound, show };
})();
