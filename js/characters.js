// Personaggi di Putt Matto: dati del negozio e disegno su canvas.
// Ogni personaggio è disegnato con i "piedi" nell'origine, alto circa 66 unità.
(function (root) {
  'use strict';

  const CHARACTERS = [
    {
      id: 'gino', name: 'Gino', cost: 0,
      desc: 'Il golfista di sempre: polo rossa, pantaloncini e nervi saldi.',
      trail: null,
    },
    {
      id: 'acquaman', name: 'Acquaman', cost: 8,
      desc: 'Fatto interamente d’acqua. Lascia goccioline ovunque passa la pallina.',
      trail: { color: '#7fd4ff', kind: 'drop' },
    },
    {
      id: 'elicus', name: 'Elicus', cost: 8,
      desc: 'Ha un’elica al posto della testa e non sta fermo un secondo.',
      trail: { color: '#ffffff', kind: 'wind' },
    },
    {
      id: 'magmo', name: 'Magmo', cost: 9,
      desc: 'Roccia vulcanica con il cuore di lava. Il green fuma dove passa.',
      trail: { color: '#ff8a1f', kind: 'spark' },
    },
    {
      id: 'spinoso', name: 'Spinoso', cost: 9,
      desc: 'Un cactus con un fiore in testa. Abbracci sconsigliati.',
      trail: { color: '#ff8fc8', kind: 'petal' },
    },
    {
      id: 'bullone', name: 'Bullone', cost: 10,
      desc: 'Robot calcolatore. Bip bup: traiettoria elaborata.',
      trail: { color: '#4ff0ff', kind: 'pixel' },
    },
    {
      id: 'nuvolo', name: 'Nuvolo', cost: 10,
      desc: 'Una nuvoletta permalosa: quando sbaglia, piove.',
      trail: { color: '#b9d3ea', kind: 'drop' },
    },
  ];

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function line(ctx, x1, y1, x2, y2, color, width) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function putter(ctx, hx, hy) {
    line(ctx, hx, hy, 17, -2, '#cfd6dc', 1.6);
    rr(ctx, 13, -4, 11, 4, 1.5);
    ctx.fillStyle = '#9aa3ab';
    ctx.fill();
  }

  function eyes(ctx, x, y, gap, r, white, pupil) {
    circle(ctx, x - gap, y, r, white);
    circle(ctx, x + gap, y, r, white);
    if (pupil) {
      circle(ctx, x - gap + r * 0.3, y, r * 0.5, pupil);
      circle(ctx, x + gap + r * 0.3, y, r * 0.5, pupil);
    }
  }

  const DRAW = {
    gino(ctx, t) {
      const skin = '#f1c27d';
      // gambe e scarpe
      ctx.fillStyle = skin;
      ctx.fillRect(-7, -20, 5, 18);
      ctx.fillRect(2, -20, 5, 18);
      ctx.fillStyle = '#ffffff';
      rr(ctx, -9, -4, 8, 4, 2); ctx.fill();
      rr(ctx, 1, -4, 8, 4, 2); ctx.fill();
      // pantaloncini
      ctx.fillStyle = '#d9c796';
      rr(ctx, -9, -31, 18, 13, 2); ctx.fill();
      // polo
      ctx.fillStyle = '#d93a3a';
      rr(ctx, -10, -51, 20, 22, 5); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-4, -51); ctx.lineTo(0, -46); ctx.lineTo(4, -51); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b52e2e';
      ctx.fillRect(-1, -46, 2, 6);
      // braccia
      line(ctx, -9, -47, 6, -31, skin, 3.5);
      line(ctx, 9, -47, 7, -31, skin, 3.5);
      putter(ctx, 7, -31);
      // testa
      circle(ctx, 0, -59, 8, skin);
      eyes(ctx, 1, -59, 3, 1.2, '#2b2b2b');
      line(ctx, -1, -55, 3, -55, '#a0522d', 1.2);
      // cappellino
      ctx.fillStyle = '#1f4fa8';
      ctx.beginPath(); ctx.arc(0, -62, 8.4, Math.PI, 0); ctx.fill();
      rr(ctx, 2, -63, 11, 3, 1.5); ctx.fill();
    },

    acquaman(ctx, t) {
      const w = Math.sin(t * 4) * 1.5;
      const water = 'rgba(70,170,255,0.82)';
      const deep = 'rgba(30,110,210,0.9)';
      // gambe d'acqua
      ctx.fillStyle = deep;
      rr(ctx, -8, -22, 6, 21, 3); ctx.fill();
      rr(ctx, 2, -22, 6, 21, 3); ctx.fill();
      // corpo
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.ellipse(0, -36, 12 + w * 0.4, 16 - w * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // braccia
      line(ctx, -10, -42, 6, -31, deep, 4);
      line(ctx, 10, -42, 7, -31, deep, 4);
      putter(ctx, 7, -31);
      // testa con onda
      circle(ctx, 0, -60 + w * 0.3, 9, water);
      ctx.beginPath();
      ctx.moveTo(-6, -67 + w * 0.3);
      ctx.quadraticCurveTo(2, -78 + w, 8, -68 + w * 0.3);
      ctx.quadraticCurveTo(2, -72, -6, -67 + w * 0.3);
      ctx.fillStyle = deep; ctx.fill();
      // riflesso
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-3, -40, 7, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
      // bollicine
      for (let i = 0; i < 4; i++) {
        const y = -22 - ((t * 18 + i * 11) % 40);
        const x = Math.sin(i * 2.1 + t * 2) * 6;
        circle(ctx, x, y, 1.4, 'rgba(255,255,255,0.75)');
      }
      eyes(ctx, 1, -61 + w * 0.3, 3.4, 2, '#ffffff', '#0b3a6e');
      line(ctx, -2, -56, 4, -56, '#0b3a6e', 1.2);
    },

    elicus(ctx, t) {
      // gambe sottili
      line(ctx, -4, -22, -6, -2, '#6b7280', 3);
      line(ctx, 4, -22, 6, -2, '#6b7280', 3);
      ctx.fillStyle = '#374151';
      rr(ctx, -10, -4, 7, 4, 2); ctx.fill();
      rr(ctx, 3, -4, 7, 4, 2); ctx.fill();
      // busto
      ctx.fillStyle = '#f2c230';
      rr(ctx, -7, -38, 14, 18, 4); ctx.fill();
      line(ctx, -6, -34, 6, -31, '#374151', 3);
      line(ctx, 6, -34, 7, -31, '#374151', 3);
      putter(ctx, 7, -31);
      // asta
      line(ctx, 0, -38, 0, -46, '#6b7280', 3);
      // pale dell'elica che girano
      const a0 = t * 12;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * Math.PI * 2) / 3;
        ctx.save();
        ctx.translate(0, -50);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(13, 0, 13, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#e5484d' : '#f4f4f5';
        ctx.fill();
        ctx.restore();
      }
      // mozzo con faccia
      circle(ctx, 0, -50, 7, '#4b5563');
      eyes(ctx, 0, -51, 2.6, 1.6, '#ffffff', '#111827');
    },

    magmo(ctx, t) {
      const glow = 0.6 + Math.sin(t * 5) * 0.25;
      ctx.fillStyle = '#3b2a2a';
      rr(ctx, -9, -22, 7, 21, 2); ctx.fill();
      rr(ctx, 2, -22, 7, 21, 2); ctx.fill();
      // corpo roccioso
      ctx.fillStyle = '#4a3434';
      ctx.beginPath();
      ctx.moveTo(-13, -22); ctx.lineTo(-14, -42); ctx.lineTo(-8, -52);
      ctx.lineTo(8, -53); ctx.lineTo(14, -43); ctx.lineTo(12, -22); ctx.closePath();
      ctx.fill();
      // crepe di lava
      ctx.save();
      ctx.shadowColor = '#ff7a1a';
      ctx.shadowBlur = 6;
      const lava = `rgba(255,${120 + glow * 60 | 0},30,${glow + 0.2})`;
      line(ctx, -8, -46, -2, -38, lava, 1.8);
      line(ctx, -2, -38, -6, -28, lava, 1.8);
      line(ctx, 6, -48, 3, -36, lava, 1.8);
      line(ctx, 3, -36, 8, -26, lava, 1.8);
      ctx.restore();
      line(ctx, -11, -46, 6, -31, '#4a3434', 4.5);
      line(ctx, 11, -46, 7, -31, '#4a3434', 4.5);
      putter(ctx, 7, -31);
      // testa
      ctx.fillStyle = '#3e2c2c';
      ctx.beginPath();
      ctx.moveTo(-8, -53); ctx.lineTo(-9, -63); ctx.lineTo(-3, -68); ctx.lineTo(5, -67);
      ctx.lineTo(9, -61); ctx.lineTo(8, -53); ctx.closePath(); ctx.fill();
      // fiamma
      const f = Math.sin(t * 14) * 2;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath(); ctx.moveTo(-5, -67); ctx.quadraticCurveTo(0 + f, -82, 5, -67); ctx.fill();
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath(); ctx.moveTo(-2.5, -67); ctx.quadraticCurveTo(0 - f * 0.5, -76, 2.5, -67); ctx.fill();
      ctx.save();
      ctx.shadowColor = '#ffb020';
      ctx.shadowBlur = 5;
      eyes(ctx, 0, -60, 3.2, 1.8, '#ffd43b');
      ctx.restore();
    },

    spinoso(ctx, t) {
      const green = '#3f9b4a';
      const dark = '#2d7a37';
      // piedini
      ctx.fillStyle = dark;
      rr(ctx, -9, -5, 7, 5, 2); ctx.fill();
      rr(ctx, 2, -5, 7, 5, 2); ctx.fill();
      // braccio-cactus alzato a sinistra
      ctx.fillStyle = green;
      rr(ctx, -19, -40, 8, 5, 2.5); ctx.fill();
      rr(ctx, -19, -54, 6, 16, 3); ctx.fill();
      // corpo
      rr(ctx, -10, -60, 20, 57, 9); ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.2;
      for (const x of [-4, 4]) { ctx.beginPath(); ctx.moveTo(x, -55); ctx.lineTo(x, -8); ctx.stroke(); }
      // spine
      ctx.strokeStyle = '#f5f0d0';
      ctx.lineWidth = 0.9;
      for (let y = -52; y < -10; y += 8) {
        for (const [x, dx] of [[-10, -3], [10, 3]]) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y - 2); ctx.stroke();
        }
      }
      // braccio che tiene il putter
      line(ctx, 9, -36, 7, -30, green, 5);
      putter(ctx, 7, -30);
      // fiore
      const sway = Math.sin(t * 2.5) * 1.5;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t * 0.5;
        circle(ctx, sway + Math.cos(a) * 4, -62 + Math.sin(a) * 4, 3.2, '#ff8fc8');
      }
      circle(ctx, sway, -62, 2.4, '#ffd43b');
      eyes(ctx, 1, -46, 3.4, 1.5, '#1b1b1b');
      ctx.beginPath(); ctx.arc(1, -42, 2.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1; ctx.stroke();
    },

    bullone(ctx, t) {
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(-7, -22, 4, 19);
      ctx.fillRect(3, -22, 4, 19);
      ctx.fillStyle = '#374151';
      rr(ctx, -10, -4, 8, 4, 1); ctx.fill();
      rr(ctx, 2, -4, 8, 4, 1); ctx.fill();
      // corpo a scatola
      ctx.fillStyle = '#9aa5b1';
      rr(ctx, -11, -44, 22, 23, 3); ctx.fill();
      ctx.fillStyle = '#5b6470';
      rr(ctx, -7, -39, 14, 9, 2); ctx.fill();
      const on = Math.floor(t * 4) % 3;
      ['#ef4444', '#facc15', '#22c55e'].forEach((c, i) => circle(ctx, -4 + i * 4, -34.5, 1.5, i === on ? c : '#2b3038'));
      line(ctx, -11, -41, 6, -31, '#6b7280', 3);
      line(ctx, 11, -41, 7, -31, '#6b7280', 3);
      putter(ctx, 7, -31);
      // testa
      ctx.fillStyle = '#b8c1cc';
      rr(ctx, -9, -60, 18, 15, 3); ctx.fill();
      ctx.fillStyle = '#0f172a';
      rr(ctx, -6, -56, 13, 6, 2); ctx.fill();
      const scan = Math.sin(t * 3) * 4;
      circle(ctx, 1 + scan, -53, 1.8, '#4ff0ff');
      line(ctx, 0, -60, 0, -67, '#6b7280', 1.5);
      circle(ctx, 0, -68, 2.2, Math.sin(t * 6) > 0 ? '#ef4444' : '#7f1d1d');
    },

    nuvolo(ctx, t) {
      const bob = Math.sin(t * 3) * 1.5;
      // gambe a goccia
      for (const x of [-5, 5]) {
        ctx.fillStyle = '#5aa9e6';
        ctx.beginPath();
        ctx.moveTo(x, -22 + bob);
        ctx.quadraticCurveTo(x + 5, -6, x, -3);
        ctx.quadraticCurveTo(x - 5, -6, x, -22 + bob);
        ctx.fill();
      }
      // pioggerellina
      for (let i = 0; i < 3; i++) {
        const y = -20 + ((t * 30 + i * 9) % 18);
        line(ctx, -9 + i * 9, y, -10 + i * 9, y + 3, 'rgba(90,169,230,0.7)', 1);
      }
      // corpo a nuvola
      const puff = '#f4f7fb';
      ctx.save();
      ctx.translate(0, bob);
      circle(ctx, -9, -38, 10, puff);
      circle(ctx, 9, -38, 10, puff);
      circle(ctx, 0, -48, 13, puff);
      circle(ctx, 0, -32, 11, puff);
      circle(ctx, -12, -46, 7, puff);
      circle(ctx, 12, -47, 7, puff);
      eyes(ctx, 1, -45, 4, 1.7, '#334155');
      circle(ctx, -7, -40, 2.2, 'rgba(255,140,170,0.6)');
      circle(ctx, 9, -40, 2.2, 'rgba(255,140,170,0.6)');
      ctx.beginPath(); ctx.arc(1, -41, 2.2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      line(ctx, 10, -35 + bob, 7, -30, '#c7d2de', 3);
      putter(ctx, 7, -30);
    },
  };

  // Disegna il personaggio con i piedi in (x, y). facing = 1 guarda a destra, -1 a sinistra.
  function drawCharacter(ctx, id, x, y, scale, t, facing) {
    const fn = DRAW[id] || DRAW.gino;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (facing || 1), scale);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    fn(ctx, t);
    ctx.restore();
  }

  root.PuttCharacters = { CHARACTERS, drawCharacter };
})(window);
