// ===== Weighing: the rolled rug on a dial scale before and after =====
// kg per square metre of a clean rug
const RUG_DENS = { shirvan: 2.9, kazak: 3.2, persian: 2.8, soviet: 2.1, kids: 1.6, bukhara: 2.7, kilim: 1.7, beni: 3.9, silk: 1.9, hotel: 3.1, sun: 2.0, grandpa: 3.0 };
// grams per loose object: hair, crumbs, confetti, glitter, leaves, fluff
const OBJ_G = [0.3, 1.4, 0.1, 0.03, 0.7, 0.6];
function objGrams(objs) { let g = 0; for (const o of objs) g += OBJ_G[o.t] || 0.5; return g; }
function rugKg(sim) { const r = sim.rug; return r.widthM * r.heightM * (RUG_DENS[r.style] || 2.6) + (r.fr ? r.widthM * 0.16 : 0); }
function dirtKg(sim, t, objG) {
  const a = 1 / (sim.cpm * sim.cpm); // m² per cell
  return {
    sand: t.sand * 1.3 * a,
    dust: t.dust * 0.5 * a,
    grime: (t.grime * 0.35 + t.stain * 0.1 + t.fluor * 0.05 + (t.load || 0) * 0.3) * a,
    litter: objG / 1000,
    soap: ((t.residue || 0) * 0.12 + (t.soap || 0) * 0.1) * a,
    water: (t.water || 0) * 2.2 * a,
  };
}
function weighRug(sim, initial) {
  const t = initial ? sim.initTypes : sim.typeTotals();
  const d = dirtKg(sim, t, initial ? (sim.initObjG || 0) : objGrams(sim.objs));
  const dirt = d.sand + d.dust + d.grime + d.litter + d.soap + d.water;
  const rug = rugKg(sim);
  return { rug, d, dirt, total: rug + dirt };
}
function fmtKg(v, unit) {
  const a = Math.abs(v);
  if (a < 0.095) return Math.max(10, Math.round(a * 100) * 10) + " г";
  return (a < 10 ? a.toFixed(1) : a < 100 ? a.toFixed(1) : Math.round(a).toString()).replace(".", ",") + (unit === false ? "" : " кг");
}
function scaleMax(kg) { const c = [5, 10, 20, 30, 40, 50, 60, 80, 100, 150, 200]; for (const m of c) if (kg * 1.15 <= m) return m; return 300; }
// numbered step and the finest division for a dial range
function scaleSteps(max) {
  const major = max <= 10 ? 1 : max <= 20 ? 2 : max <= 50 ? 5 : max <= 100 ? 10 : max <= 200 ? 20 : 50;
  return { major, minor: major / 10 };
}

// ---------- flow ----------
function openScale(mode) {
  const sim = G.sim;
  const wIn = G.wIn || (G.wIn = weighRug(sim, true));
  const w = { mode, t: 0, y: -240, vy: 0, landed: 0, landT: 0, a: 0, av: 0, target: 0, done: false, doneT: 0, parts: [], shake: 0, lastTick: 0 };
  w.before = wIn.total;
  if (mode === "out") { const o = weighRug(sim, false); w.after = o.total; w.wOut = o; G.wOut = o; }
  w.kg = mode === "in" ? w.before : w.after;
  w.max = scaleMax(w.before);
  w.D = clamp(64 + Math.sqrt(sim.rug.widthM * sim.rug.heightM) * 16, 70, 124);
  G.weigh = w;
  UI.scaleOpen(w);
  AU.setLoop("dry", 0);
}
function scaleTick(dt) {
  const w = G.weigh; if (!w) return;
  w.t += dt;
  // the roll falls onto the platform
  if (w.t > 0.3 && w.landed < 3) {
    w.vy += 2600 * dt; w.y += w.vy * dt;
    if (w.y >= 0) {
      w.y = 0;
      if (!w.landed) {
        w.target = w.kg; w.av += w.kg * 2.4; w.landT = w.t; w.shake = 1;
        AU.thump(0.5, w.mode === "in" ? 3 : 0); AU.spring(1); vibrate(12);
        UI.scaleDust(w);
      }
      w.landed++;
      w.vy = -w.vy * 0.22;
      if (Math.abs(w.vy) < 60) { w.vy = 0; w.landed = 3; }
    }
  }
  // needle on a damped spring
  const K = 34, C = 5.2;
  w.av += (K * (w.target - w.a) - C * w.av) * dt;
  w.a += w.av * dt;
  const step = w.max / 50;
  const cell = Math.floor(w.a / step);
  if (w.lastTick !== cell && Math.abs(w.av) > 0.4) { w.lastTick = cell; AU.tick(); }
  w.shake = Math.max(0, w.shake - dt * 4);
  const still = Math.abs(w.a - w.target) < w.max * 0.004 && Math.abs(w.av) < w.max * 0.02;
  if (w.landT && !w.done && w.t - w.landT > 1.1 && (still || w.t - w.landT > 2.3)) {
    w.done = true; w.doneT = w.t;
    UI.scaleDone(w);
  }
  UI.scaleDraw(w, dt);
}
function closeScale() {
  const w = G.weigh; if (!w) return;
  G.weigh = null;
  UI.scaleClose();
  if (w.mode === "in") {
    G.scr = "play";
    UI.showHud(true); UI.setTool(G.tool);
    startUnroll();
    setTimeout(() => { measureInsets(); fitCamera(true); }, 60);
    if (G.order.kind === "story") setTimeout(() => saveNow(true), 2500);
  } else nextFinishStep();
}
