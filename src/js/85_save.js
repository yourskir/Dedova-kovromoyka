// ===== Save: local + artifact db =====
function defaultSave() { return { v: 1, t: 0, started: false, next: 0, stars: {}, money: 0, earned: 0, owned: {}, notes: {}, settings: { music: 0.55, sfx: 0.85, on: true }, quickCount: 0, cur: null, chSeen: 0, done: false, kgOut: 0, album: [], ach: {}, daily: {}, dailyStreak: null, dusterPasses: 0, dried: 0, flea: null, stock: [], wall: [], hooks: 0, fleaPending: null, fleaProfit: 0, fleaSold: 0, codeN: 0 }; }
let S = defaultSave();
const SAVE = { ready: false, db: null, pending: null, lastCloud: 0, cloudBusy: false, curCache: null, curB64: null };
const LS_MAIN = "kovry_v1", LS_CUR = "kovry_v1_cur";

function withTimeout(p, ms) { return Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]); }
async function getDb() {
  if (SAVE.cloudOff || window.KOVRY_GUEST) return null;
  if (SAVE.db) return SAVE.db;
  if (window.KOVRY_TG) { SAVE.db = tgDb(); return SAVE.db; }
  try { if (!window.claude || !window.claude.use) return null; const db = await withTimeout(window.claude.use("db"), 4000); SAVE.db = db || null; return SAVE.db; } catch (e) { return null; }
}
function sanitize(o) {
  const d = defaultSave();
  if (!o || typeof o !== "object") return d;
  for (const k of Object.keys(d)) if (o[k] !== undefined) d[k] = o[k];
  d.settings = Object.assign(defaultSave().settings, o.settings || {});
  return d;
}
async function loadAll() {
  let local = null;
  try { local = JSON.parse(lsGet(LS_MAIN) || "null"); } catch (e) {}
  let best = local ? sanitize(local) : null;
  let cloudMain = null;
  const db = await getDb();
  if (db) {
    const r = await withTimeout(Promise.all([db.doc("save/main").get(), db.doc("save/prev").get()]).catch(() => null), 4000);
    if (r) {
      const m = r[0] && r[0].exists ? r[0].data() : null, p = r[1] && r[1].exists ? r[1].data() : null;
      cloudMain = m || p;
      if (m && p && (p.next || 0) > (m.next || 0) && (m.t || 0) - (p.t || 0) < 60000 && !m.freshStart) cloudMain = p;
    }
  }
  if (cloudMain && (!best || (cloudMain.t || 0) > (best.t || 0) + 2000)) best = sanitize(JSON.parse(JSON.stringify(cloudMain)));
  if (best) S = best;
  // in-progress rug
  if (S.cur && S.cur.sid) {
    let b64 = null;
    try { const lc = JSON.parse(lsGet(LS_CUR) || "null"); if (lc && lc.sid === S.cur.sid) b64 = lc; } catch (e) {}
    if (!b64 && db) {
      const r = await withTimeout(db.doc("save/cur").get().catch(() => null), 4000);
      if (r && r.exists) { const d = r.data(); if (d && d.sid === S.cur.sid) b64 = d; }
    }
    SAVE.curCache = b64;
    if (!b64 && S.cur.needSim) S.cur = null;
  }
  applySettings();
  applyUpgrades();
  SAVE.ready = true;
}
function applySettings() { AU.vol.music = S.settings.music; AU.vol.sfx = S.settings.sfx; AU.on = S.settings.on !== false; }
function applyUpgrades() { for (const k of Object.keys(UPG)) delete UPG[k]; for (const it of SHOP) if (S.owned[it.id]) Object.assign(UPG, it.up); }

// ---------- sim snapshot ----------
const CHANS = ["D", "S", "G", "St", "W", "F", "L", "So", "N", "Ch", "R", "Dm", "B", "Fl", "H", "Wr"];
const CH_SCALE = { W: 1.6, F: 1.4, L: 1.5 };
function packSimRaw() {
  const s = G.sim; if (!s) return null;
  const present = [];
  const arrs = [];
  for (const c of CHANS) {
    const a = s[c]; let any = false;
    for (let k = 0; k < s.n; k++) if (a[k] !== 0) { any = true; break; }
    if (!any) continue;
    present.push(c);
    const u = new Uint8Array(s.n), sc = CH_SCALE[c] || 1;
    if (c === "N") for (let k = 0; k < s.n; k++) u[k] = clamp(Math.round((a[k] * 0.5 + 0.5) * 255), 0, 255);
    else for (let k = 0; k < s.n; k++) u[k] = clamp(Math.round(a[k] / sc * 255), 0, 255);
    arrs.push(u);
  }
  arrs.push(s.stT, s.chT, s.Fx || new Uint8Array(s.n));
  const all = new Uint8Array(arrs.length * s.n);
  arrs.forEach((a, i) => all.set(a, i * s.n));
  const objs = s.objs.filter((o) => !o.s).map((o) => [Math.round(o.x * 10) / 10, Math.round(o.y * 10) / 10, o.t, Math.round(o.a * 100) / 100, Math.round(o.l * 100) / 100, Math.round(o.k * 100) / 100, o.c, Math.round(o.sz * 100) / 100]);
  const strands = G.rug.strands.map((q) => Math.round(q.tang * 100) / 100);
  return { gw: s.gw, gh: s.gh, n: s.n, present, all, objs, strands, extra: { zonesDone: G.zonesDone, zoneInit: G.zoneInit, uvSeen: G.uvSeen, everWet: s.everWet, fixed: G.fixedCount || 0, floorPile: s.floor.snowPile, fray: s.fray.map((f) => Array.from(f.prog, (v) => (v >= 1 ? 1 : 0))), gone: G.rug.strands.map((q, i) => (q.gone ? i : -1)).filter((i) => i >= 0), yel: G.rug.strands.map((q) => Math.round((q.yel || 0) * 100) / 100) } };
}
async function packSim() {
  const r = packSimRaw(); if (!r) return null;
  const z = await deflateU8(r.all);
  const data = z ? u8ToB64(z) : u8ToB64(r.all);
  return { sid: S.cur && S.cur.sid, gw: r.gw, gh: r.gh, n: r.n, present: r.present, z: !!z, data, objs: r.objs, strands: r.strands, extra: r.extra };
}
async function unpackSim(p) {
  if (!p || !p.data) return null;
  let u = b64ToU8(p.data);
  if (p.z) { u = await inflateU8(u); if (!u) return null; }
  return { gw: p.gw, gh: p.gh, n: p.n, present: p.present, all: u, objs: p.objs, strands: p.strands, extra: p.extra || {} };
}
function applySnapshot(sim, rug, p) {
  if (!p || p.gw !== sim.gw || p.gh !== sim.gh) return;
  const n = sim.n;
  for (const c of CHANS) sim[c].fill(0);
  p.present.forEach((c, i) => {
    const a = sim[c], sc = CH_SCALE[c] || 1, off = i * n;
    if (c === "N") for (let k = 0; k < n; k++) a[k] = p.all[off + k] / 255 * 2 - 1;
    else for (let k = 0; k < n; k++) a[k] = p.all[off + k] / 255 * sc;
  });
  const base = p.present.length * n;
  sim.stT.set(p.all.subarray(base, base + n)); sim.chT.set(p.all.subarray(base + n, base + 2 * n));
  if (p.all.length >= base + 3 * n) sim.Fx.set(p.all.subarray(base + 2 * n, base + 3 * n));
  sim.objs = (p.objs || []).map((q) => ({ x: q[0], y: q[1], t: q[2], a: q[3], l: q[4], k: q[5], c: q[6], sz: q[7], s: 0, vx: 0, vy: 0, tt: 0 }));
  if (p.strands) rug.strands.forEach((q, i) => { if (p.strands[i] !== undefined) { q.tang = p.strands[i]; if (q.tang < 0.05) { q.ang = 0; q.curl = 0; } } });
  if (rug.strands.length) { drawFringe(rug); GLR.refreshRug(); }
  const e = p.extra || {};
  if (e.fray) sim.fray.forEach((f, i) => { const a = e.fray[i]; if (a) a.forEach((v, u) => { if (u < f.n) f.prog[u] = v; }); });
  if (e.gone) { rug.strands.forEach((q) => { q.gone = false; }); for (const i of e.gone) if (rug.strands[i]) rug.strands[i].gone = true; }
  if (e.yel) rug.strands.forEach((q, i) => { if (e.yel[i] !== undefined) q.yel = e.yel[i]; });
  if (rug.strands.length) drawFringe(rug);
  paintFray(rug, sim); GLR.refreshRug();
  sim.everWet = !!e.everWet; sim.floor.snowPile = e.floorPile || 0;
  p.zonesDone = e.zonesDone; p.zoneInit = e.zoneInit; p.uvSeen = e.uvSeen;
  G.fixedCount = e.fixed || 0;
  sim.markAll();
}

// ---------- writing ----------
function careerJSON() { S.t = Date.now(); return JSON.stringify(S); }
async function saveNow(force) {
  G.saveDirty = false; G.lastSave = G.t;
  if (G.scr === "play" && G.sim && G.order && G.order.kind !== "attract") {
    if (!S.cur) S.cur = {};
    S.cur.kind = G.order.kind; S.cur.id = G.order.id; S.cur.title = G.order.title; S.cur.needSim = true;
    if (G.order.kind !== "story") S.cur.def = G.order;
    if (!S.cur.sid) S.cur.sid = Math.random().toString(36).slice(2, 10);
    const sid = S.cur.sid;
    const p = await packSim();
    // the order may have been handed over while the snapshot was packing
    if (p && S.cur && S.cur.sid === sid) { p.sid = sid; SAVE.curCache = p; lsSet(LS_CUR, JSON.stringify(p)); }
  }
  lsSet(LS_MAIN, careerJSON());
  const now2 = Date.now();
  if (force || now2 - SAVE.lastCloud > 9000) { SAVE.lastCloud = now2; cloudSave(force); }
}
function saveSync() {
  try { lsSet(LS_MAIN, careerJSON()); if (SAVE.curCache && S.cur) lsSet(LS_CUR, JSON.stringify(SAVE.curCache)); } catch (e) {}
  cloudSave(true);
}
async function cloudSave(force) {
  const db = await getDb(); if (!db || SAVE.cloudBusy) return;
  SAVE.cloudBusy = true;
  try {
    const body = JSON.parse(careerJSON());
    // Telegram writes piece by piece: skip an unchanged career and send the rug on the floor less often
    const sig = JSON.stringify(Object.assign({}, body, { t: 0 }));
    if (!window.KOVRY_TG || force || sig !== SAVE.lastSig) { await db.doc("save/main").set(body); SAVE.lastSig = sig; }
    const curDue = !window.KOVRY_TG || force || Date.now() - (SAVE.lastCur || 0) > 30000;
    if (curDue && S.cur && SAVE.curCache && SAVE.curCache.sid === S.cur.sid) {
      SAVE.lastCur = Date.now();
      const size = SAVE.curCache.data.length + JSON.stringify(SAVE.curCache.objs).length;
      if (size < 230000 && SAVE.curCache.sentSid !== SAVE.curCache.data.length + ":" + SAVE.curCache.sid) {
        const copy = Object.assign({}, SAVE.curCache); delete copy.sentSid;
        await db.doc("save/cur").set(copy);
        SAVE.curCache.sentSid = SAVE.curCache.data.length + ":" + SAVE.curCache.sid;
      }
    }
  } catch (e) {
    // a guest from a shared link keeps the save in their own browser
    if (e && e.code === "invalid_argument") SAVE.cloudOff = true;
  }
  SAVE.cloudBusy = false;
}
async function backupAndReset() {
  const db = await getDb();
  if (db && (S.next > 0 || S.earned > 0)) { try { await db.doc("save/prev").set(JSON.parse(careerJSON())); } catch (e) {} }
  const settings = S.settings;
  S = defaultSave(); S.settings = settings; S.freshStart = true;
  applyUpgrades();
  lsDel(LS_CUR);
  saveNow(true);
}
