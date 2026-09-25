// ===== Game runtime =====
const G = {
  t: 0, W: 1, H: 1, dpr: 1, cssW: 1, cssH: 1,
  scr: "title", mode: null, order: null, rug: null, sim: null, loc: "garage",
  cam: { x: 0, y: 0, s: 1 }, fit: { x: 0, y: 0, s: 1 },
  tool: "beater", tools: [], stroke: null,
  reveal: 1e9, unroll: null, hint: 0, hintUntil: 0, uv: null,
  stats: null, statT: 0, adv: null, advT: 0, zoneInit: null, zonesDone: {},
  paused: false, finish: null, dry: 0, split: null,
  beaterLift: 0, spin: 0, noteQ: [], noteShown: {}, lastActivity: 0,
  topInset: 90, botInset: 110, fixed: null, needs: null, uvSeen: false, mudSaid: false, bleedSaid: false,
  saveDirty: false, lastSave: 0,
};
const STYLE_DIMS = { shirvan: [70, 106, 10], kazak: [100, 150, 8], persian: [130, 190, 6], soviet: [130, 190, 6], kids: [100, 150, 8], bukhara: [130, 190, 6], kilim: [100, 150, 7], beni: [90, 135, 8], silk: [180, 270, 4], hotel: [150, 200, 5], sun: [120, 170, 6], grandpa: [150, 220, 6] };
const STYLE_NAMES = { shirvan: "Ширван", kazak: "Казах", persian: "Персидский", soviet: "Советский настенный", kids: "Детский город", bukhara: "Туркменский", kilim: "Килим", beni: "Лохматый", silk: "Шёлковый", hotel: "Ар-деко", sun: "Солнышко", grandpa: "Карабах" };
const LOC_NAMES = { garage: "Гараж", workshop: "Прачечная", plant: "Цех", yard: "Двор зимой" };

function thresholds() { return G.order && G.order.strict ? [85, 93, 97] : [80, 90, 96]; }

// ---------- scene ----------
function setupOrder(o, restore) {
  G.order = o;
  const def = Object.assign({}, o.rug);
  const rug = buildRug(def);
  if (o.dirt && o.dirt.dustCol) rug.st = Object.assign({}, rug.st, { dust: o.dirt.dustCol });
  const sim = new Sim(rug, 128);
  sim.delicate = o.delicate ? 1 : 0;
  sim.bleedy = o.bleedy ? 1 : 0;
  sim.snow = o.winter ? 1 : 0;
  sim.Fx = new Uint8Array(sim.n);
  sim.generate(o.dirt, (o.seed || def.seed || 1) * 7 + 3);
  // tangle fringe
  const rr = mulberry(def.seed + 5);
  const fy = o.dirt && o.dirt.fringe !== undefined ? o.dirt.fringe : 0.5;
  for (const s of rug.strands) { s.tang = 0.35 + rr() * 0.65; s.ang = (rr() - 0.5) * 0.6; s.curl = (rr() - 0.5) * 0.9; s.yel = clamp(0.3 + fy * 0.5 + (rr() - 0.4) * 0.35, 0, 0.95); }
  if (o.dirt && o.dirt.gone) {
    // tassels torn off in small runs
    for (let i = 0; i < rug.strands.length; i++) if (rr() < o.dirt.gone / 3) { const run = 1 + Math.floor(rr() * 4); for (let q = 0; q < run && i + q < rug.strands.length; q++) rug.strands[i + q].gone = true; i += run; }
  }
  if (rug.strands.length) drawFringe(rug);
  paintFray(rug, sim);
  G.rug = rug; G.sim = sim;
  G.loc = o.winter ? "yard" : (o.loc || (CHAPTERS[(o.ch || 1) - 1] || CHAPTERS[0]).loc);
  GLR.setRug(rug); GLR.setSim(sim); GLR.setFloor(G.loc);
  GLR.snapshotBefore();
  if (restore) applySnapshot(sim, rug, restore);
  G.tools = computeTools(o);
  G.tool = G.tools[0];
  G.stats = sim.computeStats();
  G.zoneInit = {}; G.zonesDone = {};
  for (const z of G.stats.zones) G.zoneInit[z.z] = z.v;
  if (restore && restore.zonesDone) G.zonesDone = restore.zonesDone;
  if (restore && restore.zoneInit) G.zoneInit = restore.zoneInit;
  G.needs = null; G.adv = null; G.uvSeen = !!(restore && restore.uvSeen); G.mudSaid = false; G.bleedSaid = false;
  G.hint = 0; G.uv = null; G.dry = 0; G.split = null; G.splitAnim = null; G.stroke = null; G.finish = null;
  G.fixedCount = 0; G.dusterPasses = 0; G.floorMax = 0; G.floorClean = false; G.floorTip = false;
  G.dryRoom = null; G.propLoc = null;
  G.tl = o.kind === "attract" ? null : { frames: [], every: 2, acc: 0, play: 0 }; G.tlPlay = null;
  G.wIn = o.kind === "attract" ? null : weighRug(sim, true); G.wOut = null;
  AU.setStyle(G.loc);
  fitCamera(true);
}
function computeTools(o) {
  if (o.winter) return SNOW_DOCK.slice();
  let set;
  if (o.kind === "free") set = new Set(DOCK_ORDER);
  else if (o.kind === "quick" || o.kind === "daily" || o.kind === "flea") set = toolsUpTo(Math.max(0, S.next - 1));
  else if (o.special) set = toolsUpTo(Math.max(o.unlock, Math.min(S.next, ORDERS.length) - 1));
  else set = toolsUpTo(orderIndex(o.id));
  // snow tools only in winter
  set.delete("shovel"); set.delete("broom");
  if (!(o.bleedy || o.kind === "free")) set.delete("fixer");
  if (set.has("washer")) set.delete("hose");
  return DOCK_ORDER.filter((t) => set.has(t));
}

function fitCamera(snap) {
  const sim = G.sim; if (!sim) return;
  const top = G.topInset * G.dpr, bot = G.botInset * G.dpr;
  const availH = Math.max(100, G.H - top - bot), availW = G.W;
  const s = Math.min(availW * 0.92 / sim.gw, availH * 0.95 / sim.gh);
  const cy = top + availH / 2;
  G.fit = { x: sim.gw / 2, y: sim.gh / 2 + (G.H / 2 - cy) / s, s };
  if (snap) { G.cam = Object.assign({}, G.fit); G.camTarget = null; }
  else G.camTarget = Object.assign({}, G.fit);
}
function clampCam() {
  const sim = G.sim, c = G.cam; if (!sim) return;
  c.s = clamp(c.s, G.fit.s * 0.6, G.fit.s * 4.5);
  const hw = G.W / 2 / c.s, hh = G.H / 2 / c.s;
  c.x = clamp(c.x, Math.min(sim.gw / 2, hw * 0.3), Math.max(sim.gw / 2, sim.gw - hw * 0.3));
  c.y = clamp(c.y, Math.min(sim.gh / 2, hh * 0.3 - G.topInset * G.dpr / c.s), Math.max(sim.gh / 2, sim.gh - hh * 0.3 + G.botInset * G.dpr / c.s));
}
function s2w(sx, sy) { const c = G.cam; return [(sx - G.W / 2) / c.s + c.x, (sy - G.H / 2) / c.s + c.y]; }
function w2s(x, y) { const c = G.cam; return [(x - c.x) * c.s + G.W / 2, (y - c.y) * c.s + G.H / 2]; }

// ---------- tool strokes ----------
const DRAG_TOOLS = new Set(["vacuum", "foam", "brush", "machine", "squeegee", "washer", "hose", "spray1", "spray2", "spray3", "fixer", "iron", "uv", "loupe", "broom", "comb", "fbrush", "needle", "overcast", "dye", "tie"]);
function toolSize(tool) {
  const cpm = G.sim.cpm;
  switch (tool) {
    case "squeegee": return TOOLDEF.squeegee.len * (UPG.squeegeeL || 1) * cpm;
    case "broom": return TOOLDEF.broom.len * cpm;
    case "beater": return TOOLDEF.beater.r * (UPG.beaterR || 1) * cpm;
    case "machine": return TOOLDEF.machine.r * (UPG.machineR || 1) * cpm;
    case "brush": return TOOLDEF.brush.r * cpm;
    case "vacuum": return TOOLDEF.vacuum.w * (UPG.vacuumW || 1) * cpm;
    case "foam": return TOOLDEF.foam.r * (UPG.foamR || 1) * cpm;
    case "washer": return TOOLDEF.washer.r * (UPG.washerR || 1) * cpm;
    case "hose": return TOOLDEF.washer.r * 1.15 * cpm;
    case "uv": return TOOLDEF.uv.r * cpm;
    case "iron": return TOOLDEF.iron.r * cpm;
    case "comb": return TOOLDEF.comb.w * cpm;
    case "fbrush": return TOOLDEF.comb.w * 1.1 * cpm;
    case "needle": return TOOLDEF.needle.r * cpm;
    case "overcast": return 0.04 * cpm;
    case "dye": return 0.045 * cpm;
    case "tie": return TOOLDEF.comb.w * cpm * 0.6;
    case "shovel": return TOOLDEF.shovel.r * cpm;
    default: return TOOLDEF.spray.r * cpm;
  }
}
function strokeStart(fx, fy, touch) {
  if (!G.sim || G.paused || G.unroll || G.weigh) return;
  if (UI.noteOpen() && G.t - (G.noteT || 0) > 1.2) UI.hideNote();
  const off = touch && DRAG_TOOLS.has(G.tool) ? 56 * G.dpr : 0;
  const cx = fx, cy = fy - off;
  const [wx, wy] = s2w(cx, cy);
  G.stroke = { fx, fy, cx, cy, wx, wy, px: wx, py: wy, vx: 0, vy: 0, speed: 0, nx: 0, ny: 1, off, t0: G.t, lastHit: -9, moved: 0, sprayT: 0 };
  G.lastActivity = G.t;
  const tool = G.tool;
  if (tool === "beater") doBeat(wx, wy);
  if (tool === "shovel") doShovel(wx, wy);
  if (tool === "squeegee" || tool === "broom") G.stroke.sq = { x: wx, y: wy, v: 0, l: 0, s: 0, f: 0, hasDir: false, len: toolSize(tool), broom: tool === "broom" };
  if (tool.startsWith("spray") || tool === "fixer") { AU.psh(0.1); G.stroke.sprayT = 0.3; }
  if (tool === "uv") { G.uvSeenT = 0; }
  if (tool === "comb") { G.stroke.combN = 0; }
  G.saveDirty = true;
}
function strokeMove(fx, fy) {
  const st = G.stroke; if (!st) return;
  st.fx = fx; st.fy = fy; st.cx = fx; st.cy = fy - st.off;
  const [wx, wy] = s2w(st.cx, st.cy);
  st.wx = wx; st.wy = wy;
}
function strokeEnd() {
  const st = G.stroke; if (!st) return;
  if (st.sq) { G.sim.squeegeeRelease(st.sq); }
  G.stroke = null;
  G.statsNow = true;
  AU.stopLoops();
  hideLbl();
  G.uv = null;
}

function alongPath(st, step, fn) {
  const dx = st.wx - st.px, dy = st.wy - st.py;
  const d = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) fn(st.px + dx * i / n, st.py + dy * i / n, 1 / n);
}

function doBeat(x, y) {
  const sim = G.sim;
  const info = sim.beat(x, y, UPG.beaterR || 1);
  G.stroke && (G.stroke.lastHit = G.t, G.stroke.hx = x, G.stroke.hy = y);
  G.beaterLift = 1; G.beatX = x; G.beatY = y;
  FX.ripple(x, y);
  const dustAmt = info.dust + info.sand;
  if (info.wet > 0) { FX.drops(x, y, 14, 16, "rgba(210,225,235,0.9)"); AU.splash(3); }
  const col = rgbCss(G.rug.st.dust.map((v) => v * 255));
  const puffs = Math.min(40, dustAmt * 0.35);
  if (dustAmt > 0.5) FX.dust(x, y, puffs, col, info.r * 0.7);
  if (sim.snow && info.dust + info.sand > 0.1) FX.snowBurst(x, y, info.r * 0.3, 6);
  AU.thump(0.55 + Math.min(0.45, dustAmt * 0.004), Math.min(6, dustAmt * 0.05));
  vibrate(8);
}
function doShovel(x, y) {
  const r = toolSize("shovel");
  G.sim.foam(x, y, 0.5, 1.4);
  FX.snowBurst(x, y, r * 0.5, 22);
  AU.crunch();
  G.stroke && (G.stroke.lastHit = G.t);
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

function toolUpdate(dt) {
  const st = G.stroke, sim = G.sim;
  if (!st || !sim) return;
  const dx = st.wx - st.px, dy = st.wy - st.py, d = Math.hypot(dx, dy);
  const inst = d / Math.max(dt, 1e-3);
  st.speed = lerp(st.speed, inst, Math.min(1, dt * 12));
  if (d > 0.05) { st.nx = lerp(st.nx, dx / d, 0.4); st.ny = lerp(st.ny, dy / d, 0.4); const m = Math.hypot(st.nx, st.ny) || 1; st.nx /= m; st.ny /= m; }
  st.moved += d;
  const spd = st.speed / sim.cpm; // m/s
  const motion = clamp(spd * 2.2, 0, 1.5);
  const tool = G.tool;
  if (d > 0.2) G.lastActivity = G.t;
  switch (tool) {
    case "beater": {
      const r = toolSize("beater");
      const dd = Math.hypot(st.wx - (st.hx || st.wx), st.wy - (st.hy || st.wy));
      if (G.t - st.lastHit > 0.17 && (dd > r * 0.45 || G.t - st.lastHit > 0.34)) doBeat(st.wx, st.wy);
      break;
    }
    case "shovel": {
      if (G.t - st.lastHit > 0.28) doShovel(st.wx, st.wy);
      break;
    }
    case "vacuum": {
      let got = 0, suck = 0, wet = 0;
      alongPath(st, 2, (x, y, f) => { const r = sim.vacuum(x, y, st.nx, st.ny, st.speed, dt * f); got += r.got; suck += r.sucked; wet += r.wet; });
      AU.setLoop("vacuum", 0.22 + Math.min(0.25, motion * 0.2), Math.min(1, motion));
      if (suck > 0) AU.bubbles(Math.min(3, suck), 0.018, 900);
      if (got > 0.3 && Math.random() < 0.3) FX.mist(st.wx, st.wy, 1, rgbCss(G.rug.st.dust.map((v) => v * 255)), toolSize("vacuum") * 0.3);
      if (wet > 30) showTipOnce("wetvac", "<b>Пылесос</b> берёт сухую пыль. Воду собирает скребок");
      break;
    }
    case "foam": {
      let amt = 0;
      alongPath(st, 2, (x, y, f) => { amt += sim.foam(x, y, dt * f, UPG.foamR ? 1.2 : 1).amt; });
      AU.setLoop("foam", sim.snow ? 0 : 0.3, 0);
      if (Math.random() < 0.5) FX.foamFleck(st.wx, st.wy, 2, 0);
      if (!sim.snow && Math.random() < 0.3) AU.bubbles(2, 0.02);
      checkMud();
      break;
    }
    case "brush": case "machine": {
      const machine = tool === "machine";
      let res = { lifted: 0, dry: 0, foamed: 0, dmg: 0 };
      alongPath(st, 2, (x, y, f) => { const r = sim.scrub(x, y, dt * f, machine ? Math.max(0.35, motion) : motion, machine); res.lifted += r.lifted; res.dry += r.dry; res.foamed += r.foamed; res.dmg += r.dmg; });
      if (machine) {
        G.spin += dt * 22;
        const k = sim.stats ? 1 : 1;
        AU.setLoop("machine", 0.34, Math.min(1, res.foamed * 0.2 + (res.dry < 10 ? 0.5 : 0)));
        if (Math.random() < 0.5 && res.dry < 20) { const a = Math.random() * TAU, r = toolSize("machine"); FX.foamFleck(st.wx + Math.cos(a) * r, st.wy + Math.sin(a) * r, 1, localConc(st.wx, st.wy)); }
        if (res.dmg > 0.2) showTipOnce("silkdmg", "<b>Шёлк</b> страдает от «Вихря». Бери мягкую щётку", true);
      } else {
        AU.setLoop("brush", motion > 0.05 ? 0.3 * Math.min(1, motion + 0.2) : 0);
        if (motion > 0.2 && Math.random() < 0.3 && res.dry < 10) FX.foamFleck(st.wx, st.wy, 1, localConc(st.wx, st.wy));
      }
      if (res.dry > 40 && G.t - st.t0 > 0.6) showTipOnce("dryscrub", "Щётка и «Вихрь» работают по мокрой пене. Сначала <b>шампунь</b>");
      break;
    }
    case "squeegee": case "broom": {
      const r = sim.squeegee(st.sq, st.wx, st.wy);
      const conc = st.sq.l / (st.sq.v + 1e-3);
      AU.setLoop("squeegee", st.sq.v > 1 ? Math.min(0.5, 0.12 + motion * 0.3) : Math.min(0.12, motion * 0.1), Math.min(1, motion));
      if (st.sq.v > 20 && motion > 0.2 && Math.random() < 0.25) AU.bubbles(2, 0.022, 240);
      if (r && r.dumped > 0.5) {
        FX.drops(st.wx + st.nx * 3, st.wy + st.ny * 3, Math.min(30, 4 + r.dumped * 0.15), 18, conc > 0.2 ? "rgba(120,90,55,0.9)" : "rgba(200,215,225,0.85)", Math.atan2(st.ny, st.nx));
        FX.ring(st.wx + st.nx * 4, st.wy + st.ny * 4, 6 + Math.min(10, r.dumped * 0.05), conc > 0.2 ? "rgba(140,105,65,0.6)" : undefined);
        if (sim.snow) AU.crunch(); else AU.splash(Math.min(20, r.dumped * 0.1));
      }
      break;
    }
    case "washer": case "hose": {
      const hose = tool === "hose";
      alongPath(st, 2, (x, y, f) => sim.wash(x, y, st.nx, st.ny, st.speed, dt * f, hose));
      AU.setLoop(hose ? "hose" : "washer", 0.3, 0);
      const r = toolSize(tool);
      for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; FX.drops(st.wx + Math.cos(a) * r * 0.5, st.wy + Math.sin(a) * r * 0.5, 1, 22, "rgba(215,232,242,0.9)"); }
      if (Math.random() < 0.3) FX.mist(st.wx, st.wy, 1, "#E8F2F8", r);
      checkMud();
      break;
    }
    case "spray1": case "spray2": case "spray3": {
      const chem = +tool.slice(5);
      let hit = 0;
      alongPath(st, 2, (x, y, f) => { hit += sim.spray(x, y, chem, dt * f).hit; });
      st.sprayT -= dt;
      if (st.sprayT <= 0) { AU.psh(0.09); st.sprayT = 0.34; }
      FX.mist(st.wx, st.wy, 1, CHEMS[chem].cap, toolSize(tool) * 0.9);
      if (hit > 5 && Math.random() < 0.4) { FX.fizz(st.wx, st.wy, toolSize(tool)); if (Math.random() < 0.2) AU.bubbles(2, 0.02, 700); }
      checkMud();
      break;
    }
    case "fixer": {
      const r = TOOLDEF.spray.r * sim.cpm * 1.3;
      sim._circle(st.wx, st.wy, r, (k) => { if (!sim.Fx[k]) { sim.Fx[k] = 1; G.fixedCount++; } });
      st.sprayT -= dt;
      if (st.sprayT <= 0) { AU.psh(0.09); st.sprayT = 0.34; }
      FX.mist(st.wx, st.wy, 1, "#E7C6D8", r);
      break;
    }
    case "iron": {
      const r = sim.iron(st.wx, st.wy, dt);
      AU.setLoop("iron", 0.25, 0);
      if (Math.random() < 0.25) FX.steam(st.wx + (Math.random() - 0.5) * 4, st.wy);
      break;
    }
    case "uv": {
      G.uv = [st.wx, st.wy, toolSize("uv"), 1];
      AU.setLoop("uv", 0.25, 0);
      const found = countFluor(st.wx, st.wy, toolSize("uv"));
      if (found > 6 && !G.uvSeen) { G.uvSeen = true; toast("Метки нашлись. Теперь ферментный спрей"); }
      if (!G.resSaid && residueAround(st.wx, st.wy, toolSize("uv")) > 5) { G.resSaid = true; queueNote("t_residue"); }
      break;
    }
    case "loupe": {
      loupeLook(st.wx, st.wy, st.cx, st.cy);
      break;
    }
    case "comb": {
      let n = 0;
      alongPath(st, 1.5, (x, y, f) => { n += sim.comb(x, y, st.nx, st.ny, dt * f).n; });
      if (n > 0) { G.fringeDirty = true; AU.setLoop("brush", 0.18); } else AU.setLoop("brush", 0);
      break;
    }
    case "overcast": {
      let got = 0;
      alongPath(st, 0.8, (x, y, f) => { got += sim.overcast(x, y, dt * f * clamp(0.4 + motion, 0, 1.4)).got; });
      st.trail = st.trail || [];
      if (!st.trail.length || Math.hypot(st.trail[st.trail.length - 1][0] - st.wx, st.trail[st.trail.length - 1][1] - st.wy) > 0.6) { st.trail.push([st.wx, st.wy]); if (st.trail.length > 16) st.trail.shift(); }
      if (got > 0) AU.stitch();
      break;
    }
    case "dye": {
      let got = 0;
      alongPath(st, 0.8, (x, y, f) => { got += sim.dye(x, y, dt * f * clamp(0.4 + motion, 0, 1.4)); });
      if (got > 0.02) { st.dyeT = (st.dyeT || 0) - dt; if (st.dyeT <= 0) { AU.psh(0.035); st.dyeT = 0.28; } }
      break;
    }
    case "tie": {
      let n = 0;
      alongPath(st, 1.5, (x, y) => { n += sim.tieFringe(x, y); });
      if (n) { AU.tok(); AU.stitch(); G.fringeDirty = true; vibrate(6); if (!G.rug.strands.some((q) => q.gone)) { AU.chime(); toast("Бахрома снова целая"); } }
      break;
    }
    case "needle": {
      let got = 0;
      alongPath(st, 0.8, (x, y, f) => { got += sim.darn(x, y, dt * f * clamp(0.4 + motion, 0, 1.4)); });
      st.trail = st.trail || [];
      if (!st.trail.length || Math.hypot(st.trail[st.trail.length - 1][0] - st.wx, st.trail[st.trail.length - 1][1] - st.wy) > 0.6) { st.trail.push([st.wx, st.wy]); if (st.trail.length > 16) st.trail.shift(); }
      if (got > 0.02) { AU.stitch(); if (Math.random() < 0.2) vibrate(4); }
      break;
    }
    case "fbrush": {
      let n = 0;
      alongPath(st, 1.5, (x, y, f) => { n += sim.fringeWash(x, y, dt * f * clamp(0.3 + motion, 0, 1.3)).n; });
      if (n > 0) {
        G.fringeDirty = true; AU.setLoop("brush", 0.26 * Math.min(1, motion + 0.3));
        if (Math.random() < 0.35) FX.foamFleck(st.wx + (Math.random() - 0.5) * 6, st.wy, 1, 0);
        if (!G.fringeWhite && !G.rug.strands.some((q) => q.yel > 0.06)) { G.fringeWhite = true; AU.chime(); toast("Бахрома белая"); grantAch("white"); }
      } else AU.setLoop("brush", 0);
      break;
    }
  }
  st.px = st.wx; st.py = st.wy;
}
function localConc(x, y) { const s = G.sim; const i = Math.floor(x), j = Math.floor(y); if (i < 0 || j < 0 || i >= s.gw || j >= s.gh) return 0; const k = j * s.gw + i; return s.L[k] / (s.W[k] + s.F[k] + 0.05); }
function countFluor(x, y, r) { let n = 0; G.sim._circle(x, y, r, (k) => { if (G.sim.Fl[k] > 0.15) n++; }); G.sim.dirty = G.sim.dirty; return n; }
function residueAround(x, y, r) { let n = 0; const s = G.sim; s._circle(x, y, r, (k) => { if (s.R[k] > 0.1 || (s.So[k] > 0.2 && s.W[k] < 0.2)) n++; }); return n; }
function checkMud() {
  if (G.mudSaid) return;
  const s = G.sim; if (!s.stats) return;
  if (s.stats.t.dust / (s.stats.t.cells || 1) > 0.25) { G.mudSaid = true; queueNote("t_mud"); }
}
function loupeLook(wx, wy, cx, cy) {
  const s = G.sim, r = TOOLDEF.loupe.r * s.cpm;
  let best = 0, bk = -1, fl = 0;
  s._circle(wx, wy, r, (k) => { if (s.St[k] > best) { best = s.St[k]; bk = k; } if (s.Fl[k] > fl) fl = s.Fl[k]; });
  let html;
  let hole = 0; s._circle(wx, wy, r, (k) => { if (s.H[k] > hole) hole = s.H[k]; });
  let worn = 0; s._circle(wx, wy, r, (k) => { if (s.Wr[k] > worn) worn = s.Wr[k]; });
  if (hole > 0.3) html = `<b>Моль</b>Выела ворс до основы. Заштопаем после сушки`;
  else if (worn > 0.3) html = `<b>Потёртость</b>Ворс вытерт, краска поблёкла. Подкрасим после сушки`;
  else if (best > 0.08) {
    const st = STAINS[STAIN_KEYS[s.stT[bk]]];
    let how;
    if (st.slow) how = "Размокнет в шампуне, три щёткой подольше";
    else if (st.chem === 0) how = "Уйдёт с шампунем и щёткой";
    else if (st.chem === 9) how = "Снимается утюгом через бумагу";
    else { const c = CHEMS[st.chem]; how = `<span class="dot" style="background:${c.cap}"></span>Спрей «${c.name}»`; }
    html = `<b>${st.name}</b>${how}`;
  } else if (fl > 0.1) html = `<b>Пахнет питомцем</b>Посвети УФ-фонарём`;
  else {
    const k = Math.floor(wy) * s.gw + Math.floor(wx);
    if (k >= 0 && k < s.n && s.mask[k]) {
      const parts = [];
      if (s.S[k] > 0.15) parts.push("песок в основе");
      if (s.D[k] > 0.15) parts.push("пыль");
      if (s.G[k] > 0.15) parts.push("въевшаяся грязь");
      if (s.So[k] > 0.2) parts.push("мыло");
      html = parts.length ? `<b>Ворс</b>${parts.join(", ")}` : `<b>Ворс</b>чистый`;
    } else html = `<b>Пол</b>тут чисто`;
  }
  showLbl(html, cx / G.dpr, (cy - 40 * G.dpr) / G.dpr);
}

// ---------- stats, advisor, notes ----------
function computeNeeds() {
  const s = G.sim; const need = { 1: 0, 2: 0, 3: 0, 9: 0, 0: 0, fl: 0, stain: 0 };
  for (let k = 0; k < s.n; k++) {
    if (s.St[k] > 0.12) {
      const c = STAINS[STAIN_KEYS[s.stT[k]]].chem; need.stain++;
      if (c === 9 || c === 0 || !(s.Ch[k] > 0.08 && s.chT[k] === c)) need[c]++;
    }
    if (s.Fl[k] > 0.12) { need.fl++; if (!(s.Ch[k] > 0.08 && s.chT[k] === 3)) need[3]++; }
  }
  return need;
}
function advise() {
  const s = G.sim, st = G.stats; if (!st) return null;
  const t = st.t, c = t.cells || 1, has = (id) => G.tools.includes(id);
  const a = (v) => v / c;
  if (s.snow) {
    if (a(t.dust) > 0.05 || a(t.sand) > 0.06) return a(t.foam) < 0.2 ? "shovel" : "beater";
    if (a(t.foam) > 0.05) return "broom";
    if (t.objs > 3) return "vacuum";
    return "done";
  }
  const n = G.needs || { 1: 0, 2: 0, 3: 0, 9: 0, 0: 0, fl: 0, stain: 0 };
  const wet = a(t.water) > 0.12;
  if (a(t.water) > 0.55 && a(t.soap) < 0.1 && a(t.load) > 0.03) return "squeegee";
  if (!wet && !s.delicate && has("duster") && (G.dusterPasses || 0) < 3 && (a(t.sand) > 0.14 || a(t.dust) > 0.28)) return "duster";
  if (!wet && (a(t.sand) > 0.1 || a(t.dust) > 0.2) && has("beater")) return "beater";
  if (!wet && (a(t.dust) > 0.04 || t.objs > 4) && has("vacuum")) return "vacuum";
  if (s.bleedy && has("fixer") && G.fixedCount < c * 0.6) return "fixer";
  const ls = (G.pred && G.pred.loss) || {};
  const spots = (ls.stain || 0) >= 0.5, pets = (ls.fluor || 0) >= 0.5;
  if (pets && n.fl > 12 && has("uv") && !G.uvSeen) return "uv";
  for (const ch of [1, 2, 3]) if (n[ch] > 10 && has("spray" + ch) && (ch === 3 ? spots || pets : spots)) return "spray" + ch;
  if (spots && n[9] > 4 && has("iron")) return "iron";
  if (a(t.grime) > 0.045 || (ls.stain || 0) >= 1.5) {
    if (a(t.soap) < 0.15) return "foam";
    return has("machine") && !s.delicate ? "machine" : "brush";
  }
  if (a(t.foam) > 0.05 || a(t.load) > 0.025) return "squeegee";
  if ((a(t.soap) > 0.06 || a(t.residue) > 0.03) && (has("washer") || has("hose"))) return has("washer") ? "washer" : "hose";
  if (a(t.water) > 0.3) return "squeegee";
  if (t.objs > 3 && has("vacuum")) return "vacuum";
  return "done";
}
const TUT_NOTE = { beater: "t_beat", vacuum: "t_vac", foam: "t_foam", brush: "t_brush", squeegee: "t_sq", hose: "t_hose", done: "t_done" };
function statsTick() {
  const s = G.sim; if (!s) return;
  G.statsAt = G.t; G.statsNow = false;
  G.stats = s.computeStats();
  // the gauge first: it shows the grade the customer will give if the rug goes out now
  const pr = predictScore();
  G.pred = pr;
  G.score = clamp(pr.score / 100, 0, 1);
  UI.gauge(G.score, pr.loss.soap >= 3);
  try {
    G.needs = computeNeeds();
    const adv = advise();
    if (adv !== G.adv) {
      G.adv = adv;
      UI.setRec(adv);
      if (G.order && G.order.tutorial && TUT_NOTE[adv]) tutNote(TUT_NOTE[adv]);
      if (G.order && G.order.tutorial && adv === "foam" && G.noteShown.t_sq) queueNote("t_repeat");
    }
    // zones
    for (const z of G.stats.zones) {
      if (G.zonesDone[z.z]) continue;
      const init = G.zoneInit[z.z] || 0;
      if (init > 0.08 && z.v < 0.035) {
        G.zonesDone[z.z] = 1;
        AU.chime(); toast(ZONE_DONE[z.z]);
      }
    }
    floorCheck();
    // bleed warning
    if (s.bleedy && !G.bleedSaid && G.stats.t.bleed / (G.stats.t.cells || 1) > 0.004) { G.bleedSaid = true; queueNote("t_bleed"); }
    // hint note
    if (G.score > 0.86 && !G.noteShown.t_hint && G.t - G.orderT > 90) queueNote("t_hint");
    UI.hintBtn(G.score > 0.6);
  } catch (e) { console.error(e); }
}
// dirt on the floor: a nudge to hose it off and a small reward when it is gone
function floorCheck() {
  const s = G.sim; if (s.snow) return;
  const v = s.floor.siltVisible();
  G.floorMax = Math.max(G.floorMax || 0, v);
  if (G.floorMax > 30 && !G.floorClean && v < G.floorMax * 0.08) { G.floorClean = true; AU.chime(); toast("Пол отмыт, грязь ушла в слив"); grantAch("floor"); }
  if (G.adv === "done" && v > 30 && !G.floorTip && !G.floorClean && !G.stroke) {
    G.floorTip = true; UI.tip(`<b>Пол</b> в грязи. Смой её ${G.tools.includes("washer") ? "мойкой" : "шлангом"} в слив`, 5);
    G.camTarget = { x: s.gw / 2, y: s.gh / 2 + s.gh * 0.1, s: G.fit.s * 0.7 };
  }
}
const TUT_KEYS = new Set(Object.values(TUT_NOTE).concat(["t_repeat"]));
function tutNote(key) {
  if (G.noteShown[key]) return;
  G.noteQ = G.noteQ.filter((k) => !TUT_KEYS.has(k));
  G.noteQ.unshift(key);
  if (UI.noteOpen() && TUT_KEYS.has(G.curNote)) UI.hideNote();
}
function queueNote(key) {
  if (G.noteShown[key] || G.noteQ.includes(key)) return;
  G.noteQ.push(key);
}
function noteTick() {
  if (UI.noteOpen() || !G.noteQ.length || G.unroll || G.scr !== "play") return;
  const k = G.noteQ.shift();
  G.noteShown[k] = 1; G.curNote = k; G.noteT = G.t;
  S.notes[k] = 1; G.saveDirty = true;
  UI.showNote(NOTES[k]);
}

// ---------- tips ----------
const tipSaid = {};
function showTipOnce(key, html, loud) { if (tipSaid[key] && G.t - tipSaid[key] < 25) return; tipSaid[key] = G.t; UI.tip(html, 4); if (loud) AU.tok(); }
function toast(t, soft) { UI.toast(t, soft); }
function showLbl(html, x, y) { const l = $("lbl"); l.innerHTML = html; l.style.left = x + "px"; l.style.top = y + "px"; l.hidden = false; }
function hideLbl() { $("lbl").hidden = true; }

// ---------- unroll ----------
function startUnroll() {
  G.unroll = { t: 0, dur: 1.35 };
  G.reveal = G.sim.by0 + 1;
  AU.unroll();
}
function unrollTick(dt) {
  const u = G.unroll; if (!u) return;
  u.t += dt;
  const k = clamp(u.t / u.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
  G.reveal = lerp(G.sim.by0 + 1, G.sim.gh + 2, e);
  if (k >= 1) { G.unroll = null; G.reveal = 1e9; FX.dust(G.sim.gw / 2, G.sim.gh - 4, 5, rgbCss(G.rug.st.dust.map((v) => v * 255)), G.sim.gw * 0.12); onUnrolled(); }
}
function onUnrolled() {
  const o = G.order;
  tlCapture();
  if (o.kind === "story" && o.notes) for (const n of o.notes) queueNote(n);
  if (o.kind === "quick" && !S.notes.t_quick) queueNote("t_quick");
  if (o.delicate) queueNote("t_silk");
  if (o.dirt && o.dirt.moth) queueNote("t_moth");
  if (o.dirt && (o.dirt.fray || o.dirt.wear || o.dirt.gone)) queueNote("t_restore");
}

// ---------- timelapse ----------
function tlTick(dt) {
  const tl = G.tl; if (!tl) return;
  tl.play += dt; tl.acc += dt;
  if (tl.acc >= tl.every && G.t - G.lastActivity < tl.every) { tl.acc = 0; tlCapture(); }
}
function tlCapture() {
  const tl = G.tl; if (!tl) return;
  const f = GLR.snapFrame(); if (!f) return;
  f.t = tl.play;
  tl.frames.push(f);
  // keep memory in check: thin out the older frames and slow the capture
  if (tl.frames.length > 28) { const last = tl.frames.length - 1; tl.frames = tl.frames.filter((q, i) => i % 2 === 0 || i === last); tl.every *= 2; }
}
function fmtClock(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ":" + String(s).padStart(2, "0"); }
function tlStart() {
  const tl = G.tl; if (!tl || tl.frames.length < 3 || G.tlPlay) return;
  G.tlPlay = { i: -1, t: 0, dur: clamp(tl.frames.length / 7, 2.6, 4.6) };
  G.split = null; G.splitAnim = null;
  UI.tlMode(true);
}
function tlPlayTick(dt) {
  const p = G.tlPlay; if (!p) return;
  p.t += dt;
  const fr = G.tl.frames, n = fr.length;
  const i = Math.min(n - 1, Math.floor(clamp(p.t - 0.35, 0, p.dur) / p.dur * n));
  if (i !== p.i) { p.i = i; GLR.showFrame(fr[i]); AU.tick(i === n - 1); UI.tlClock(fmtClock(fr[i].t), i / (n - 1)); }
  if (p.t > p.dur + 1.3) {
    G.tlPlay = null;
    G.sim.markAll(); GLR.uploadSim(true);
    G.split = 0.5; AU.chime();
    UI.tlMode(false);
  }
}

// ---------- finishing ----------
// the gauge, the confirm dialog and the receipt all read this one forecast
function predictScore() {
  const s = G.sim;
  return gradeFrom(s.forecast(), s, true);
}
const GRADE_W = { dust: 0.55, sand: 0.5, grime: 1, stain: 1.4, fluor: 1.2, objs: 0.35 };
// soap left in the pile: the first bit costs the most, a fully soaped rug tops out near 30 points
function soapPen(r) { return 0.3 * (1 - Math.exp(-r * 2.7)); }
function gradeFrom(t, s, predict) {
  const init = s.initTypes, w = (G.order && G.order.grade) || GRADE_W;
  const W = (k) => (w[k] !== undefined ? w[k] : GRADE_W[k]);
  const rem = W("dust") * t.dust + W("sand") * t.sand + W("grime") * t.grime + W("stain") * t.stain + W("fluor") * t.fluor + W("objs") * t.objs * 30;
  const ini = Math.max(1e-3, W("dust") * init.dust + W("sand") * init.sand + W("grime") * init.grime + W("stain") * init.stain + W("fluor") * init.fluor + W("objs") * init.objs * 30);
  const c = t.cells || 1;
  const residue = t.residue / c;
  const q = 1 - rem / ini;
  const holes = predict || !s.holes ? 0 : s.holesLeft();
  const fray = predict || !s.fray ? 0 : s.fray.filter((f) => s.frayLeft(f) > 0.2).length;
  const wear = predict || !s.wears ? 0 : s.wears.filter((w) => s.wearLeft(w) > 0.2).length;
  const gone = predict ? 0 : G.rug.strands.filter((q) => q.gone).length;
  const sp = soapPen(residue);
  const pen = sp + (t.damage / c) * 1.6 + (t.bleed / c) * 2.2 + holes * 0.04 + fray * 0.03 + wear * 0.03 + Math.min(0.04, gone * 0.004);
  // what each kind of leftover costs, in points of the final grade
  const k = 100 / ini, lg = t.loadG || 0;
  const loss = {
    dust: W("dust") * t.dust * k, sand: W("sand") * t.sand * k, grime: W("grime") * (t.grime - lg) * k, load: W("grime") * lg * k,
    stain: W("stain") * t.stain * k, fluor: W("fluor") * t.fluor * k, objs: W("objs") * t.objs * 30 * k,
    soap: sp * 100, damage: (t.damage / c) * 160, bleed: (t.bleed / c) * 220,
  };
  return { score: clamp(q - pen, 0, 1) * 100, residue, damage: t.damage / c, bleed: t.bleed / c, q, holes, fray, wear, gone, loss };
}
function starsFor(score) { score = Math.round(score); const th = thresholds(); return score >= th[2] ? 3 : score >= th[1] ? 2 : score >= th[0] ? 1 : 0; }
const LOSS_NAMES = { stain: "пятна", grime: "въевшаяся грязь", load: "грязная вода в ворсе", soap: "мыло в ворсе", sand: "песок", dust: "пыль", fluor: "метки питомца", objs: "соринки", damage: "примятый ворс", bleed: "поплывшая краска" };
// the leftovers worth a point or more, biggest first
function lossList(loss, min) {
  return Object.keys(LOSS_NAMES).map((k) => [k, loss[k] || 0]).filter((e) => e[1] >= (min || 0.5)).sort((a, b) => b[1] - a[1]);
}

function askFinish() {
  if (!G.sim || G.finish || G.unroll) return;
  strokeEnd();
  statsTick();
  const s = G.sim, pr = G.pred || predictScore();
  const left = lossList(pr.loss).map(([k, v]) => `${LOSS_NAMES[k]} −${Math.max(1, Math.round(v))}%`);
  const rep = needsRepair(s) ? [...new Set(repairTargets(s).map((t) => REPAIR_NAMES[t.type]))] : [];
  const stars = G.order.kind === "free" ? -1 : starsFor(pr.score);
  UI.confirmFinish({ left, rep, score: pr.score, stars, pct: pr.score / 100, free: G.order.kind === "free" }, () => runFinish(), () => {});
}
const REPAIR_NAMES = { hole: "дырки от моли", fray: "обтрёпанный край", wear: "потёртости" };
function runFinish() {
  const s = G.sim;
  G.finish = { steps: [], i: 0 };
  if (s.everWet && !s.snow) G.finish.steps.push("spin", "dry");
  if (needsRepair(s)) G.finish.steps.push("repair");
  if (G.rug.strands.length && G.rug.strands.some((q) => q.tang > 0.08 || q.yel > 0.06 || q.gone)) G.finish.steps.push("comb");
  if (!G.noScale) G.finish.steps.push("scale");
  G.finish.steps.push("result");
  G.scr = "finish";
  AU.stopLoops();
  UI.enterFinish();
  nextFinishStep(true);
}
function nextFinishStep(first) {
  const f = G.finish;
  if (!first) f.i++;
  const step = f.steps[f.i];
  UI.finishSteps(f.steps, f.i);
  if (step === "spin") { f.water = 1; f.spd = 0; f.hold = false; UI.spinShow(true); }
  else if (step === "dry") { UI.spinShow(false); dryRoomStart(); }
  else if (step === "repair") {
    UI.spinShow(false); AU.setLoop("dry", 0);
    repairStart();
  }
  else if (step === "comb") {
    UI.spinShow(false); AU.setLoop("dry", 0);
    const yellow = G.rug.strands.some((q) => q.yel > 0.06), gone = G.rug.strands.some((q) => q.gone);
    G.tool = gone ? "tie" : yellow ? "fbrush" : "comb"; G.fringeWhite = !yellow;
    queueNote("t_fringe");
    UI.finishCap(gone ? "В бахроме пропуски. Проведи по ним, мастер привяжет новые кисти" : yellow ? "Бахрома пожелтела. Потри кисти щёткой с отбеливателем, потом расчеши гребнем" : "Проведи гребнем по кистям бахромы");
    UI.finishTools((gone ? ["tie"] : []).concat(["fbrush", "comb"]), G.tool, "Готово", "бахрома в порядке", () => { AU.tok(); strokeEnd(); nextFinishStep(); });
    measureInsets(); fitCamera(true);
  }
  else if (step === "scale") { UI.spinShow(false); AU.setLoop("dry", 0); strokeEnd(); openScale("out"); }
  else if (step === "result") { UI.spinShow(false); AU.setLoop("dry", 0); showResult(); }
}
function finishTick(dt) {
  const f = G.finish; if (!f) return;
  const step = f.steps[f.i];
  if (step === "repair") repairTick(dt);
  if (step === "spin") {
    f.spd = clamp(f.spd + (f.hold ? 0.9 : -1.2) * dt, 0, 1);
    f.water = Math.max(0, f.water - f.spd * f.spd * dt * 0.62 * (UPG.spinK || 1));
    G.spin += f.spd * dt * 30;
    AU.setLoop("spin", f.spd > 0.02 ? 0.35 * Math.min(1, f.spd + 0.2) : 0, f.spd);
    UI.spinDraw(f, dt);
    if (f.water <= 0 && !f.doneT) { f.doneT = G.t; AU.setLoop("spin", 0); AU.chime(); UI.spinCap("Отжато! Вода ушла"); }
    if (f.doneT && G.t - f.doneT > 1.0) { f.doneT = 0; nextFinishStep(); }
  } else if (step === "dry") dryRoomTick(dt);
}
function showResult() {
  const s = G.sim, o = G.order;
  const t = s.typeTotals();
  const gr = gradeFrom(t, s, false);
  const pctGauge = G.stats ? G.stats.pct : 0;
  let stars = o.kind === "free" ? -1 : Math.max(1, starsFor(gr.score));
  let pay = 0, flea = null;
  if (o.kind === "flea") flea = fleaSettle(o, gr, stars);
  else if (o.kind !== "free") {
    pay = Math.round((o.price || 0) * (0.55 + 0.45 * gr.score / 100) * (stars === 3 ? 1.15 : 1) / 10) * 10;
    S.money += pay; S.earned += pay;
    if (o.kind === "story") {
      const prev = S.stars[o.id] || 0;
      S.stars[o.id] = Math.max(prev, stars);
      const idx = orderIndex(o.id);
      if (idx >= S.next) {
        S.next = idx + 1;
        const sp = SPECIAL.find((q) => q.unlock === idx);
        if (sp) setTimeout(() => toast(`В журнале особый заказ: «${sp.title}»`), 2600);
      }
    } else if (o.kind === "quick") S.quickCount = (S.quickCount || 0) + 1;
  }
  tlCapture();
  // weights for the receipt
  const wIn = G.wIn, wOut = G.wOut || (G.wIn ? weighRug(s, false) : null);
  // order of the day: personal record and a streak of days
  let daily = null;
  if (o.kind === "daily") {
    S.daily = S.daily || {};
    const rec = S.daily[o.daily] || { kg: 0, score: 0, n: 0 };
    const kg = wIn && wOut ? Math.max(0, wIn.total - wOut.total) : 0;
    const isNew = rec.n > 0 && kg > rec.kg + 0.005;
    rec.n++; rec.kg = Math.max(rec.kg, kg); rec.score = Math.max(rec.score, Math.round(gr.score));
    S.daily[o.daily] = rec;
    const keys = Object.keys(S.daily).sort(); while (keys.length > 30) delete S.daily[keys.shift()];
    const st = S.dailyStreak || { last: "", n: 0 };
    if (st.last !== o.daily) { st.n = st.last === dayKey(new Date(Date.now() - 864e5)) ? st.n + 1 : 1; st.last = o.daily; }
    S.dailyStreak = st;
    daily = { kg: rec.kg, isNew, first: rec.n === 1, streak: st.n };
  }
  // album of washed rugs
  if (o.kind !== "attract") {
    S.album = S.album || [];
    S.album.unshift({ id: o.id, title: o.title, client: o.kind === "free" ? "" : o.client, rug: o.rug, kg: wIn && wOut ? Math.max(0, wIn.total - wOut.total) : 0, dirt: wIn ? wIn.dirt / wIn.rug : 0.3, score: Math.round(gr.score), stars, date: Date.now(), mins: G.tl ? Math.round(G.tl.play / 60) : 0 });
    if (S.album.length > 40) S.album.length = 40;
    achOnResult(o, gr, stars, wIn, wOut);
  }
  if (o.kind !== "attract" && o.kind !== "free") codeReminder();
  if (wIn && wOut) { const dirtOut = (wIn.total - wOut.total) - (wIn.d.water - wOut.d.water); if (dirtOut > 0) S.kgOut = (S.kgOut || 0) + dirtOut; }
  S.cur = null;
  G.saveDirty = true; saveNow(true);
  G.scr = "result";
  G.split = 1; G.splitAnim = { t: 0 };
  fitCamera(true);
  const react = o.react ? o.react[clamp(stars, 1, 3) - 1] : "";
  UI.showResult({ stars, score: gr.score, pay, react, client: o.kind === "flea" ? "Покупатель" : o.client, finale: o.finale, free: o.kind === "free", residue: gr.residue, damage: gr.damage, bleed: gr.bleed, holes: gr.holes, fray: gr.fray, wear: gr.wear, gone: gr.gone, yellow: G.rug.strands.length && G.rug.strands.reduce((a, q) => a + (q.yel || 0), 0) / G.rug.strands.length > 0.3, wIn: wIn && wIn.total, wOut: wOut && wOut.total, daily, flea });
  AU.fanfare();
}

// ---------- attract mode (title) ----------
function startAttract() {
  const styles = ["kazak", "persian", "soviet", "bukhara", "shirvan"];
  const st = styles[(G.attractN = ((G.attractN || 0) + 1)) % styles.length];
  const dm = STYLE_DIMS[st];
  const o = { kind: "attract", rug: { style: st, kw: dm[0], kh: dm[1], ppk: dm[2], seed: 100 + G.attractN * 13, widthM: 1.4 }, dirt: { dust: 0, sand: 0, grime: 0.7, lane: 1, stains: [{ type: "wine", n: 1, size: 0.1 }] }, loc: "workshop" };
  setupOrder(o);
  const s = G.sim;
  for (let k = 0; k < s.n; k++) { if (!s.mask[k]) continue; s.L[k] = s.G[k] * 0.9 + s.St[k] * 0.5; s.G[k] *= 0.04; s.St[k] *= 0.05; s.W[k] = 0.85; s.F[k] = 0.9 + Math.random() * 0.2; s.So[k] = 0.7; }
  s.markAll();
  G.stats = null;
  const blade = s.cpm * 0.42;
  const cols = [];
  for (let x = blade / 2 - 2; x < s.gw + blade / 2; x += blade * 0.92) cols.push(x);
  G.auto = { cols, i: 0, y: -blade * 0.3, wait: 0.8, sq: null, blade };
  G.titleFit();
}
function attractTick(dt) {
  const a = G.auto, s = G.sim; if (!a || !s) return;
  if (a.wait > 0) { a.wait -= dt; if (a.wait <= 0 && a.i >= a.cols.length) startAttract(); return; }
  if (a.i >= a.cols.length) { a.wait = 2.6; return; }
  const x = a.cols[a.i];
  if (!a.sq) { a.sq = { x, y: -4, v: 0, l: 0, s: 0, f: 0, hasDir: false, len: a.blade }; a.y = -4; }
  a.y += dt * s.cpm * 0.55;
  const r = s.squeegee(a.sq, x, a.y);
  if (r && r.dumped > 0.5) { FX.drops(x, a.y + 3, 10, 16, "rgba(120,90,55,0.9)", Math.PI / 2); AU.splash(3); }
  AU.setLoop("squeegee", G.scr === "title" ? 0.12 : 0, 0.5);
  if (a.y > s.gh + 8) { a.sq = null; a.i++; a.wait = 0.35; AU.setLoop("squeegee", 0); }
}
