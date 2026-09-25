// ===== Drying room: the rug hangs on a rail, fans blow, water runs down and drips =====
function dryRoomStart() {
  const s = G.sim, gw = s.gw, gh = s.gh;
  const N = new Float32Array(s.n);
  let w0 = 0, c = 0;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const k = j * gw + i; if (!s.mask[k]) continue;
    N[k] = fbm2(i * 0.07, j * 0.07, 31, 3);
    // after the centrifuge the pile stays damp
    s.W[k] = Math.max(s.W[k] * 0.4, (s.mask[k] === 2 ? 0.62 : 0.46) + 0.3 * N[k]);
    w0 += s.W[k]; c++;
  }
  // lowest cell of every column: water drips from here
  const bottom = [];
  for (let i = 0; i < gw; i++) for (let j = gh - 1; j >= 0; j--) if (s.mask[j * gw + i]) { bottom.push(j * gw + i); break; }
  s.markAll();
  s.floor.fade(1);
  G.dry = 0;
  G.dryRoom = { N, bottom, fans: [false, false], fanS: [0, 0], ang: [0, 0], t: 0, w0: w0 / Math.max(1, c), hum: 100, done: 0, dripAcc: 0, tray: 0, mark: 0, air: 0 };
  G.propLoc = "dryroom"; GLR.setFloor("dryroom");
  UI.finishCap(UPG.heat ? "Тепловая пушка греет воздух. Включи вентиляторы, и ковёр высохнет ещё быстрее" : "Включи вентиляторы, ковёр высохнет быстрее");
  UI.dryTools();
  measureInsets(); fitCamera(true);
  G.camTarget = { x: s.gw / 2, y: G.fit.y + s.gh * 0.03, s: G.fit.s * 0.68 };
}
function dryRoomTick(dt) {
  const d = G.dryRoom; if (!d) return;
  const s = G.sim, gw = s.gw, gh = s.gh, W = s.W, N = d.N, mask = s.mask;
  d.t += dt;
  for (let q = 0; q < 2; q++) { d.fanS[q] = clamp(d.fanS[q] + (d.fans[q] ? 0.9 : -0.7) * dt, 0, 1); d.ang[q] += dt * d.fanS[q] * 28; }
  const fl = d.fanS[0], fr = d.fanS[1];
  d.air += dt * (0.4 + fl + fr);
  if (d.done) {
    if (G.t - d.done > 1.1) dryRoomEnd();
    return;
  }
  const by0 = s.by0, bh = Math.max(1, s.by1 - s.by0);
  const heat = UPG.heat || 1;
  let sum = 0, cnt = 0;
  // evaporation: each fan dries its own side first, the top dries before the bottom
  for (let j = 0; j < gh; j++) {
    const vert = 1.25 - 0.5 * clamp((j - by0) / bh, 0, 1);
    for (let i = 0; i < gw; i++) {
      const k = j * gw + i; if (!mask[k]) continue;
      const u = i / gw;
      const rate = (0.013 + 0.1 * (fl * (1 - 0.6 * u) + fr * (0.4 + 0.6 * u)) * 0.55) * vert * (0.65 + 0.7 * N[k]) * heat;
      W[k] = Math.max(0, W[k] - rate * dt);
      sum += W[k]; cnt++;
    }
  }
  // water creeps down the hanging rug
  const g = Math.min(1, dt * 0.3);
  for (let j = gh - 2; j >= 0; j--) for (let i = 0; i < gw; i++) {
    const k = j * gw + i, b = k + gw;
    if (!mask[k] || !mask[b] || W[k] < 0.01) continue;
    const m = W[k] * g; W[k] -= m; W[b] += m;
  }
  // and drips off the bottom edge into the tray
  for (const k of d.bottom) {
    if (W[k] > 0.24) { const q = (W[k] - 0.24) * Math.min(1, dt * 1.4); W[k] -= q; d.dripAcc += q; d.tray += q; }
  }
  while (d.dripAcc > 0.3) {
    d.dripAcc -= 0.3;
    const k = d.bottom[Math.floor(Math.random() * d.bottom.length)];
    const i = k % gw, j = (k / gw) | 0;
    FX.drip(i + 0.5, j + 0.8, gh + 0.075 * s.cpm);
  }
  if (heat > 1 && Math.random() < 0.18) FX.steam(gw * (0.3 + Math.random() * 0.4), s.by1 - Math.random() * bh * 0.3, 0.25);
  if ((fl + fr) > 0.3 && Math.random() < 0.25) FX.steam(Math.random() * gw, by0 + Math.random() * bh, 0.3);
  d.mark += dt; if (d.mark > 0.08) { d.mark = 0; s.markAll(); }
  const hum = Math.max(0, Math.round(sum / Math.max(1, cnt) / d.w0 * 100));
  if (hum !== d.hum) { d.hum = hum; UI.dryHum(hum); }
  AU.setLoop("fan", (fl + fr) > 0.02 ? 0.1 + 0.12 * Math.max(fl, fr) + 0.05 * Math.min(fl, fr) : 0, (fl + fr) / 2);
  AU.setLoop("dry", 0.08);
  if (hum < 1 && !d.done) {
    d.done = G.t;
    s.dryAll();
    AU.chime(); toast("Ковёр сухой");
    S.dried = (S.dried || 0) + 1; if (S.dried >= 10) grantAch("dry");
    const t = s.typeTotals(); if (t.residue / (t.cells || 1) > 0.03) setTimeout(() => toast("В ворсе осталось мыло, видна белёсая плёнка", true), 1200);
  }
}
function dryRoomEnd() {
  G.dryRoom = null; G.propLoc = null;
  GLR.setFloor(G.loc);
  AU.setLoop("fan", 0); AU.setLoop("dry", 0);
  nextFinishStep();
}
