// Controlla che ogni buca si possa chiudere in 2 colpi (e quanto è facile farla in 1).
// Uso: node tools/verifica-buche.js            (tutti i percorsi)
//      node tools/verifica-buche.js spiaggia   (un solo percorso, per id)
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

const only = process.argv[2];
let impossible = 0;
for (const course of P.COURSES) {
  if (only && course.id !== only) continue;
  console.log(`\n== ${course.name} ==`);
  course.holes.forEach((def, i) => {
    const c = P.buildCourse(def);
    const first = sweep(c, c.ball, 0);
    const ones = first.filter((r) => r.holed).length;
    // raggruppa le posizioni d'arrivo del primo colpo e prova il secondo da un campione
    const seen = new Map();
    for (const r of first) {
      if (r.holed || r.timeout || r.hazard) continue;
      const k = Math.round(r.x / 40) + ',' + Math.round(r.y / 40);
      if (!seen.has(k)) seen.set(k, r);
    }
    let twoPaths = 0;
    for (const r of seen.values()) {
      const second = sweep(c, r, r.tick);
      if (second.some((s) => s.holed)) twoPaths++;
    }
    const ok = ones > 0 || twoPaths > 0;
    if (!ok) impossible++;
    console.log(
      `${ok ? 'OK ' : 'NO '} Buca ${i + 1} (${def.name}): hole-in-one ${ones}/${first.length}, ` +
        `posizioni da cui si chiude al 2° colpo: ${twoPaths}/${seen.size}`
    );
  });
}
if (impossible) console.log(`\n${impossible} buche non si chiudono in 2 colpi.`);
process.exitCode = impossible ? 1 : 0;
