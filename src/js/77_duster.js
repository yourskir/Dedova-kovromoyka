// ===== Rug dusting machine: the rug runs through a drum of rubber flails =====
const DUSTER = { passDur: 6.5, eff: [1, 0.7, 0.45, 0.3] };

function openDuster() {
  const s = G.sim; if (!s || G.duster) return;
  const t = s.typeTotals(), c = t.cells || 1;
  if (t.water / c > 0.2) { UI.tip("<b>Машина</b> бьёт сухой ковёр. Сейчас бери скребок и шланг", 4); AU.tok(); return; }
  if (s.delicate) { UI.tip("<b>Шёлк</b> выбивают только вручную, мягко", 4); AU.tok(); return; }
  strokeEnd();
  const dust = (t.dust * 0.6 + t.sand * 0.9) / c;
  G.duster = { p: 0, rowNext: s.gh, pass: 0, spd: 0, hold: false, kg: 0, units: 0, piles: [0, 0], parts: [], t: 0, back: 0, level0: dust, level: dust, shake: 0 };
  G.scr = "duster";
  UI.showHud(false);
  UI.dusterOpen(G.duster);
  UI.dusterSnap(G.duster);
}
function dusterBeatRows(j0, j1, eff) {
  const s = G.sim, gw = s.gw, a = 1 / (s.cpm * s.cpm);
  let kg = 0, units = 0;
  for (let j = Math.max(0, j0); j < Math.min(s.gh, j1); j++) {
    for (let i = 0; i < gw; i++) {
      const k = j * gw + i;
      if (!s.mask[k] || s.W[k] > 0.35) continue;
      const dD = s.D[k] * 0.78 * eff, dS = s.S[k] * 0.62 * eff;
      s.D[k] -= dD; s.S[k] -= dS;
      kg += (dD * 0.5 + dS * 1.3) * a; units += dD * 0.5 + dS;
    }
  }
  // loose litter shakes out, hair clings to the pile
  for (let q = s.objs.length - 1; q >= 0; q--) {
    const o = s.objs[q];
    if (o.y < j0 || o.y >= j1) continue;
    const pr = o.t === 0 ? 0.2 : o.t === 5 ? 0.45 : 0.7;
    if (Math.random() < pr * eff) { kg += (OBJ_G[o.t] || 0.5) / 1000; s.objs.splice(q, 1); }
  }
  s.markDirty(0, j0, gw - 1, j1);
  return { kg, units };
}
function dusterTick(dt) {
  const d = G.duster; if (!d) return;
  const s = G.sim;
  d.t += dt;
  if (d.back > 0) {
    // feeding the rug back to the start for another pass
    d.back = Math.max(0, d.back - dt); d.p = d.back / 0.7 * d.pEnd;
    if (d.back === 0) d.p = 0;
  } else {
    d.spd = clamp(d.spd + (d.hold ? 1.6 : -2.4) * dt, 0, 1);
    if (d.spd > 0) {
      const eff = Math.min(1, DUSTER.eff[Math.min(d.pass, DUSTER.eff.length - 1)] * (UPG.dusterE || 1));
      const p1 = Math.min(1, d.p + d.spd * dt * (UPG.dusterS || 1) / DUSTER.passDur);
      // each row goes under the drum once per pass
      const bound = p1 >= 1 ? 0 : Math.ceil(s.gh * (1 - p1));
      const r = bound < d.rowNext ? dusterBeatRows(bound, d.rowNext, eff) : { kg: 0, units: 0 };
      d.rowNext = Math.min(d.rowNext, bound);
      d.p = p1; d.kg += r.kg; d.units += r.units;
      d.piles[0] += r.kg * 0.5; d.piles[1] += r.kg * 0.5;
      if (r.kg > 0) UI.dusterBurst(d, r.kg, eff);
      d.snapT = (d.snapT || 0) + dt;
      if (d.snapT > 0.18) UI.dusterSnap(d);
      if (p1 >= 1) {
        d.pass++; d.pEnd = 1; d.back = 0.7; d.hold = false; d.spd = 0; d.rowNext = s.gh;
        const t = s.typeTotals(), c = t.cells || 1;
        d.level = (t.dust * 0.6 + t.sand * 0.9) / c;
        AU.chime(); UI.dusterPassDone(d); UI.dusterSnap(d);
      }
    }
  }
  d.shake = d.spd;
  AU.setLoop("duster", d.spd > 0.02 ? 0.34 * Math.min(1, d.spd + 0.25) : 0, d.spd);
  UI.dusterDraw(d, dt);
}
function closeDuster() {
  const d = G.duster; if (!d) return;
  G.duster = null;
  AU.setLoop("duster", 0);
  UI.dusterClose();
  const s = G.sim;
  // the machine's trays are emptied beside the bottom edge: a heap for the hose
  if (d.units > 0) {
    const fl = s.floor, amt = d.units * 0.012, n = 90;
    for (const cx of [s.gw * 0.24, s.gw * 0.76]) for (let q = 0; q < n; q++) {
      const a = Math.random() * TAU, rr = Math.abs((Math.random() + Math.random() + Math.random() - 1.5)) * 6;
      fl.addSilt(cx + Math.cos(a) * rr * 1.5, s.gh + 5 + Math.sin(a) * rr * 0.8, amt / n * (1.2 - rr / 10));
    }
  }
  G.dusterPasses = (G.dusterPasses || 0) + d.pass;
  S.dusterPasses = (S.dusterPasses || 0) + d.pass;
  if (S.dusterPasses >= 10) grantAch("duster");
  G.scr = "play"; G.saveDirty = true;
  UI.showHud(true); UI.setTool(G.tool);
  if (d.pass > 0 || d.kg > 0) startUnroll();
  setTimeout(() => { measureInsets(); fitCamera(true); }, 60);
  statsTick();
  if (d.kg > 0.05) toast(`Машина выбила ${fmtKg(d.kg)}`);
}
