// Controlla che ogni buca si possa chiudere in 2 colpi (e quanto è facile farla in 1).
// Uso: node tools/verifica-buche.js
'use strict';
const P = require('../js/physics.js');

const ANGLES = 120;
const POWERS = [];
for (let p = 0.06; p <= 1.0001; p += 0.04) POWERS.push(p);

function sweep(c, from, startTick) {
  const out = [];
  for (let a = 0; a < ANGLES; a++) {
    const ang = (a / ANGLES) * Math.PI * 2;
    for (const p of POWERS) out.push(Object.assign({ ang, p }, P.simulate(c, from, ang, p, startTick)));
  }
  return out;
}

P.HOLES.forEach((def, i) => {
  const c = P.buildCourse(def);
  const first = sweep(c, c.ball, 0);
  const ones = first.filter((r) => r.holed).length;
  // raggruppa le posizioni d'arrivo del primo colpo e prova il secondo da un campione
  const seen = new Map();
  for (const r of first) {
    if (r.holed || r.timeout) continue;
    const k = Math.round(r.x / 40) + ',' + Math.round(r.y / 40);
    if (!seen.has(k)) seen.set(k, r);
  }
  let twoPaths = 0;
  let spots = 0;
  for (const r of seen.values()) {
    spots++;
    const second = sweep(c, r, r.tick);
    if (second.some((s) => s.holed)) twoPaths++;
  }
  console.log(
    `Buca ${i + 1} (${def.name}): hole-in-one ${ones}/${first.length} colpi, ` +
      `posizioni da cui si chiude al 2° colpo: ${twoPaths}/${spots}`
  );
});
