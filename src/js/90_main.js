// ===== Boot, input, loop, flows =====
function resize(force) {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  const dpr = Math.min(1.75, window.devicePixelRatio || 1);
  if (!force && w === G.cssW && h === G.cssH && dpr === G.dpr) return;
  G.cssW = w; G.cssH = h; G.dpr = dpr;
  G.W = Math.round(w * dpr); G.H = Math.round(h * dpr);
  for (const id of ["gl", "ov"]) { const c = $(id); c.width = G.W; c.height = G.H; }
  measureInsets();
  if (G.sim) { if (G.scr === "title" || G.scr === "ticket" || G.scr === "chapter") G.titleFit(); else fitCamera(true); }
}
let pendSize = null;
function sizeCheck() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w === G.cssW && h === G.cssH) { pendSize = null; return; }
  if (pendSize && pendSize[0] === w && pendSize[1] === h) { pendSize = null; resize(); }
  else pendSize = [w, h];
}
const FINGER_ROOM = 64;
function measureInsets() {
  const hud = $("hud");
  let top = 84, bot = 110;
  if (!hud.hidden) {
    top = 70;
    for (const id of ["tag", "btnDone", "btnBook", "gauge"]) { const r = $(id).getBoundingClientRect(); if (r.height) top = Math.max(top, r.bottom); }
    top += 8;
  }
  const dock = $("dock");
  if (!dock.hidden) { const r = dock.getBoundingClientRect(); bot = Math.max(60, window.innerHeight - r.top) + FINGER_ROOM; const px = Math.round(r.height); if (px !== G.dockPx) { G.dockPx = px; document.documentElement.style.setProperty("--dockH", px + "px"); } }
  if (G.scr === "finish" && !$("scrFinish").hidden) {
    const fb = document.querySelector("#scrFinish .fbar").getBoundingClientRect();
    top = fb.bottom + 10;
    const b = $("fBottom");
    bot = (b.hidden ? 0 : window.innerHeight - b.getBoundingClientRect().top) + FINGER_ROOM;
  }
  G.topInset = top; G.botInset = bot;
}
function fitResult() {
  if (G.scr !== "result") return;
  const rc = $("rcpt").getBoundingClientRect();
  G.topInset = 56; G.botInset = Math.max(20, window.innerHeight - rc.top + 8);
  fitCamera(false);
}
G.titleFit = function () {
  const sim = G.sim; if (!sim) return;
  let top = G.H * 0.22, bot = G.H * 0.62;
  try {
    const a = document.querySelector(".title-top").getBoundingClientRect(), b = document.querySelector(".title-menu").getBoundingClientRect();
    if (a.bottom > 0 && b.top > a.bottom + 80) { top = (a.bottom + 6) * G.dpr; bot = (b.top - 6) * G.dpr; }
  } catch (e) {}
  const s = Math.min(G.W * 0.9 / sim.gw, (bot - top) / sim.gh);
  G.fit = { x: sim.gw / 2, y: sim.gh / 2 + (G.H / 2 - (top + bot) / 2) / s, s };
  G.cam = Object.assign({}, G.fit); G.camTarget = null;
};

// ---------- input ----------
const IN = { P: new Map(), mode: null, pinch: null, active: null };
function bindInput(ov) {
  const P = IN.P;
  const sweep = (ms) => { const n = performance.now(); for (const [id, p] of P) if (n - p.t > ms) P.delete(id); };
  const canTool = () => (G.scr === "play" && !G.paused) || (G.scr === "finish" && G.finish && ["comb", "repair"].includes(G.finish.steps[G.finish.i]));
  ov.addEventListener("pointerdown", (e) => {
    AU.init();
    if (G.scr === "finish" && G.dryRoom) { const q = dryHit(e.clientX * G.dpr, e.clientY * G.dpr); if (q >= 0) { e.preventDefault(); dryToggle(q); } return; }
    if (!canTool()) return;
    e.preventDefault();
    try { ov.setPointerCapture(e.pointerId); } catch (er) {}
    sweep(1200);
    const x = e.clientX * G.dpr, y = e.clientY * G.dpr;
    P.set(e.pointerId, { x, y, t: performance.now(), type: e.pointerType });
    if (P.size === 1) { IN.mode = "tool"; IN.active = e.pointerId; strokeStart(x, y, e.pointerType !== "mouse"); }
    else if (P.size === 2) { strokeEnd(); IN.mode = "cam"; startPinch(); }
  }, { passive: false });
  ov.addEventListener("pointermove", (e) => {
    const p = P.get(e.pointerId); if (!p) return;
    p.x = e.clientX * G.dpr; p.y = e.clientY * G.dpr; p.t = performance.now();
    if (IN.mode === "cam" && P.size >= 2) movePinch();
    else if (IN.mode === "tool" && e.pointerId === IN.active) strokeMove(p.x, p.y);
    if (P.size >= 2) sweep(1500);
  });
  const up = (e) => {
    if (!P.has(e.pointerId)) return;
    P.delete(e.pointerId);
    if (IN.mode === "tool" && e.pointerId === IN.active) { strokeEnd(); IN.mode = null; IN.active = null; }
    if (IN.mode === "cam" && P.size < 2) { IN.mode = P.size ? "idle" : null; IN.pinch = null; }
    if (!P.size) IN.mode = null;
  };
  ov.addEventListener("pointerup", up); ov.addEventListener("pointercancel", up); ov.addEventListener("lostpointercapture", up);
  window.addEventListener("blur", () => { P.clear(); strokeEnd(); IN.mode = null; });
  // keep every swipe inside the game: the page and the app around it stay still
  const scrollable = (el) => el && el.closest && el.closest(".sheet-b, .paperwrap, #dockScroll, .panel");
  document.addEventListener("touchmove", (e) => { if (!scrollable(e.target)) e.preventDefault(); }, { passive: false });
  ov.addEventListener("touchstart", (e) => { e.preventDefault(); }, { passive: false });
  ov.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });
  for (const id of ["scrFinish", "hud", "dock"]) $(id).addEventListener("touchmove", (e) => { if (!scrollable(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  ov.addEventListener("wheel", (e) => {
    if (G.scr !== "play") return;
    e.preventDefault();
    const k = Math.exp(-e.deltaY * 0.0015);
    const mx = e.clientX * G.dpr, my = e.clientY * G.dpr;
    const [wx, wy] = s2w(mx, my);
    G.cam.s *= k; clampCam();
    const [wx2, wy2] = s2w(mx, my);
    G.cam.x += wx - wx2; G.cam.y += wy - wy2; clampCam(); G.camTarget = null;
  }, { passive: false });
  // compare bar
  const bar = $("cmpBar");
  bar.addEventListener("pointerdown", (e) => { e.preventDefault(); try { bar.setPointerCapture(e.pointerId); } catch (er) {} IN.cmp = true; G.splitAnim = null; });
  bar.addEventListener("pointermove", (e) => { if (!IN.cmp) return; G.split = clamp(e.clientX / G.cssW, 0.02, 0.98); UI.placeCmp(); });
  const cup = () => { IN.cmp = false; };
  bar.addEventListener("pointerup", cup); bar.addEventListener("pointercancel", cup);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (!$("sheet").hidden) UI.closeSheet(); else if (!$("pauseWrap").hidden) UI.closePause(); else if (G.scr === "play") UI.openPause(); }
    if (G.scr === "play" && /^[1-9]$/.test(e.key)) { const t = G.tools[+e.key - 1]; if (t) selectTool(t); }
  });
}
function startPinch() {
  const [a, b] = [...IN.P.values()];
  IN.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cam: Object.assign({}, G.cam) };
  G.camTarget = null;
}
function movePinch() {
  const pp = IN.pinch; if (!pp) return startPinch();
  const [a, b] = [...IN.P.values()];
  const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const c0 = pp.cam;
  const s = clamp(c0.s * d / pp.d0, G.fit.s * 0.85, G.fit.s * 4.5);
  const wx = (pp.mx - G.W / 2) / c0.s + c0.x, wy = (pp.my - G.H / 2) / c0.s + c0.y;
  G.cam.s = s; G.cam.x = wx - (mx - G.W / 2) / s; G.cam.y = wy - (my - G.H / 2) / s;
  clampCam();
}

// ---------- flows ----------
function selectTool(t) {
  if (!G.tools.includes(t)) return;
  if (G.stroke) strokeEnd();
  const same = G.tool === t;
  G.tool = t; UI.setTool(t); UI.setRec(G.adv);
  const info = TOOLINFO[t];
  UI.tip(`<b>${info.name}</b> · ${info.hint}`, 3.2);
  if (!same) AU.tok();
}
function startPlay(o, snap, noWeigh) {
  G.auto = null; AU.setLoop("squeegee", 0);
  if (G.weigh) { G.weigh = null; UI.scaleClose(); }
  setupOrder(o, snap);
  G.scr = "play"; S.started = true;
  UI.hideTitle(); UI.showHud(true); UI.setTag(o); UI.buildTicks(); UI._gp = -1;
  G.orderT = G.t; G.noteQ = []; G.noteShown = Object.assign({}, S.notes);
  const weighFirst = !snap && !noWeigh && !G.noScale;
  if (weighFirst) { G.reveal = G.sim.by0 + 1; G.unroll = null; }
  else if (!snap) startUnroll(); else { G.reveal = 1e9; G.unroll = null; }
  if (!S.cur || (S.cur.id !== o.id || S.cur.kind !== o.kind) || !snap) S.cur = { kind: o.kind, id: o.id, title: o.title, sid: Math.random().toString(36).slice(2, 10), def: o.kind !== "story" ? o : undefined };
  G.tool = G.tools[0];
  UI.buildDock(G.tools);
  UI.setTool(G.tool);
  setTimeout(() => { measureInsets(); fitCamera(true); }, 60);
  statsTick();
  G.saveDirty = true;
  if (weighFirst) { G.scr = "weigh"; UI.showHud(false); openScale("in"); return; }
  if (o.kind === "story" && !snap) setTimeout(() => saveNow(true), 2500);
}
function beginStory(id) {
  const base = orderById(id); if (!base) return;
  const o = Object.assign({ kind: "story" }, base);
  const ch = CHAPTERS[o.ch - 1];
  const go = () => { G.scr = "ticket"; UI.ticket(o, () => startPlay(o), () => goTitle()); };
  UI.hideTitle();
  if ((S.chSeen || 0) < o.ch) { S.chSeen = o.ch; G.saveDirty = true; G.scr = "chapter"; UI.chapter(ch, go); }
  else go();
}
async function resumeCur() {
  const c = S.cur;
  let o = c.kind === "story" ? Object.assign({ kind: "story" }, orderById(c.id)) : c.def;
  if (!o || !o.rug) { S.cur = null; return beginNext(); }
  const snap = SAVE.curCache ? await unpackSim(SAVE.curCache) : null;
  if (!snap) { startPlay(o); return; }
  startPlay(o, snap);
}
function beginNext() {
  if (S.cur) return resumeCur();
  if (S.next >= ORDERS.length) return beginQuick();
  beginStory(ORDERS[S.next].id);
}
const QUICK_CLIENTS = [["Аня", "студентка из общежития"], ["Семья Орловых", "дом у рынка"], ["Фотостудия «Кадр»", "реквизит для съёмок"], ["Отец Никодим", "храм на горке"], ["Йога-студия «Лотос»", "второй этаж над аптекой"], ["Геннадий", "таксист, коврик из машины и ещё один из дома"], ["Кафе «Пышка»", "ковёр у входа"], ["Бабушка Лида", "соседний дом"], ["Библиотека на Садовой", "детский зал"], ["Тимур", "бариста, переехал и нашёл ковёр в кладовке"]];
const QUICK_STORIES = ["Ковёр пережил переезд, ремонт и два дня рождения.", "Лежал на даче всё лето, а осенью его нашли под дождём.", "Хозяева уезжали на месяц, а кот оставался с соседкой.", "Ковёр достался от прежних жильцов, и пора узнать, какой он на самом деле.", "На нём три года собирали пазлы, ели пиццу и смотрели кино.", "После ремонта на ковре осела белая пыль, а сверху прошлись в ботинках."];
function beginQuick() {
  const o = makeQuick((Date.now() % 1000003) + (S.quickCount || 0) * 97);
  UI.hideTitle(); G.scr = "ticket";
  UI.ticket(o, () => startPlay(o), () => goTitle());
}
function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
// order of the day: the same rug all day long, a record to beat
function beginDaily() {
  const key = dayKey();
  const o = makeQuick(strSeed("day:" + key));
  o.kind = "daily"; o.id = "d" + key; o.daily = key;
  o.wish = "Один ковёр на весь день. Сколько грязи вынесешь?";
  o.price = Math.round(o.price * 1.2 / 10) * 10;
  UI.hideTitle(); G.scr = "ticket";
  UI.ticket(o, () => startPlay(o), () => goTitle());
}
function makeQuick(seed) {
  const r = mulberry(seed);
  const maxIdx = Math.max(0, Math.min(S.next, ORDERS.length) - 1);
  const pool = new Set(["shirvan", "kazak"]);
  ORDERS.slice(0, maxIdx + 1).forEach((o) => { if (o.rug.style !== "grandpa") pool.add(o.rug.style); });
  const styles = [...pool];
  const style = styles[Math.floor(r() * styles.length)];
  const dm = STYLE_DIMS[style];
  const tools = toolsUpTo(maxIdx);
  const types = ["mud", "gouache"];
  if (tools.has("spray1")) types.push("wine", "coffee", "juice", "tea", "grass");
  if (tools.has("spray2")) types.push("grease", "choco", "lipstick");
  if (tools.has("spray3")) types.push("pet", "milk");
  if (tools.has("iron")) types.push("wax");
  const stains = [];
  const ns = 1 + Math.floor(r() * 3);
  for (let i = 0; i < ns; i++) { const ty = types[Math.floor(r() * types.length)]; stains.push(ty === "wax" ? { type: ty, n: 2, size: 0.04, drops: 5 } : { type: ty, n: 1 + Math.floor(r() * 2), size: 0.07 + r() * 0.06 }); }
  const dirt = { dust: 0.3 + r() * 0.5, sand: 0.2 + r() * 0.5, grime: 0.3 + r() * 0.4, lane: 1, stains };
  if (r() < 0.35) dirt.hair = 60 + Math.floor(r() * 200);
  if (r() < 0.35) dirt.crumbs = 20 + Math.floor(r() * 40);
  if (r() < 0.15) dirt.confetti = 60;
  if (r() < 0.3) dirt.shoes = { walks: 2, amt: 0.6 };
  if (r() < 0.2 && style !== "silk") dirt.moth = { n: 1 + Math.floor(r() * 2), size: 0.04 + r() * 0.02 };
  if (r() < 0.15) dirt.fray = { n: 1, len: 0.25 + r() * 0.2 };
  if (r() < 0.15) dirt.wear = { n: 1, size: 0.08 + r() * 0.05 };
  if (r() < 0.15) dirt.gone = 0.1;
  const [client, who] = QUICK_CLIENTS[Math.floor(r() * QUICK_CLIENTS.length)];
  const widthM = style === "silk" ? 0.9 : 0.8 + r() * 0.4;
  const lvl = Math.min(S.next, ORDERS.length);
  const o = {
    kind: "quick", id: "q" + seed, title: STYLE_NAMES[style] + " ковёр", client, who,
    rug: { style, kw: dm[0], kh: dm[1], ppk: dm[2], seed: seed % 997, widthM }, dirt,
    story: QUICK_STORIES[Math.floor(r() * QUICK_STORIES.length)], wish: "Сделать красиво, и побыстрее.",
    price: Math.round((400 + r() * 500 + lvl * 90) / 10) * 10, ch: Math.max(1, (ORDERS[Math.min(maxIdx, ORDERS.length - 1)] || ORDERS[0]).ch),
    react: ["Спасибо, забираю.", "Ого, совсем другой ковёр!", "Лучше нового. Расскажу всем знакомым."],
    delicate: style === "silk", bleedy: style === "kilim" && tools.has("fixer"),
  };
  o.loc = CHAPTERS[o.ch - 1].loc;
  return o;
}
function beginFree(st) {
  const dm = STYLE_DIMS[st.style];
  const lv = [0.35, 0.6, 0.9][st.level];
  const dirt = { dust: lv, sand: lv * 0.8, grime: lv * 0.85, lane: 1, stains: [] };
  if (st.stains) dirt.stains = [{ type: "wine", n: 1, size: 0.1 }, { type: "coffee", n: 1, size: 0.09 }, { type: "grease", n: 1, size: 0.1 }, { type: "mud", n: 1, size: 0.1 }];
  if (st.hair) dirt.hair = 260;
  if (st.confetti) { dirt.confetti = 100; dirt.glitter = 30; }
  const o = { kind: "free", id: "free", title: STYLE_NAMES[st.style], client: "для себя", rug: { style: st.style, kw: dm[0], kh: dm[1], ppk: dm[2], seed: 7, widthM: st.style === "silk" ? 1.1 : 1.3 }, dirt, loc: st.loc, winter: st.loc === "yard", react: ["", "", ""] };
  UI.hideTitle();
  startPlay(o);
}
function restartOrder() {
  const o = G.order; if (!o) return;
  S.cur = null;
  startPlay(o, null, true);
}
function goTitle() {
  if (G.scr === "play" && G.order) saveNow(true);
  strokeEnd(); AU.stopLoops();
  if (G.weigh) { G.weigh = null; UI.scaleClose(); }
  if (G.duster) { G.duster = null; UI.dusterClose(); AU.setLoop("duster", 0); }
  if (G.propLoc) { G.dryRoom = null; G.propLoc = null; GLR.setFloor(G.loc); }
  for (const id of ["scrResult", "scrFinish", "scrTicket", "scrChapter"]) $(id).hidden = true;
  $("pauseWrap").hidden = true; $("confirmWrap").hidden = true;
  UI.showHud(false);
  G.finish = null; G.split = null; G.paused = false; G.tlPlay = null; UI.tlMode(false);
  G.scr = "title";
  UI.showTitle();
  startAttract();
}
function showEpilogue() {
  S.done = true; G.saveDirty = true; saveNow(true);
  G.scr = "chapter";
  UI.chapter({ id: 5, title: "Узор деда", intro: EPILOGUE }, () => goTitle());
  $("chN").textContent = "Эпилог";
}
function buyItem(id) {
  const it = SHOP.find((q) => q.id === id); if (!it || S.owned[id] || S.money < it.price) return;
  S.money -= it.price; S.owned[id] = 1; applyUpgrades();
  if (id === "cat") grantAch("cat");
  AU.bell(740, 0.1); AU.bell(988, 0.08, 0.12);
  UI.toast("Куплено: " + it.name);
  G.saveDirty = true; saveNow(true);
}
function bindTitle() {
  const doCont = () => { AU.init(); if (!SAVE.ready) { SAVE.pending = "cont"; $("tContB").textContent = "Ищу сохранение…"; return; } AU.tok(); beginNext(); };
  $("tContinue").onclick = doCont;
  $("tQuick").onclick = () => { AU.init(); AU.tok(); if (!SAVE.ready) return; if (S.next < 1) return; beginQuick(); };
  $("tFree").onclick = () => { AU.init(); AU.tok(); UI.openFree(); };
  $("tJournal").onclick = () => { AU.init(); AU.tok(); UI.openJournal(); };
  $("tShop").onclick = () => { AU.init(); AU.tok(); UI.openShop(); };
  $("tMarket").onclick = () => { AU.init(); AU.tok(); if (!SAVE.ready || !fleaOpen()) return; UI.openMarket(); };
  $("tNew").onclick = () => {
    AU.init(); AU.tok();
    if (!SAVE.ready) return;
    if (S.next === 0 && !S.cur && !S.earned) { S.started = true; beginStory("o1"); return; }
    UI.ask("Начать историю заново?", "Прогресс, звёзды и деньги начнутся с нуля. Прежнее сохранение ляжет в запасной ящик.", "Начать заново", async () => { await backupAndReset(); UI.refreshTitle(); beginStory("o1"); });
  };
  $("tSound").onclick = () => { AU.init(); AU.setOn(!AU.on); S.settings.on = AU.on; G.saveDirty = true; UI.refreshTitle(); AU.tok(); };
  $("tDaily").onclick = () => { AU.init(); AU.tok(); if (!SAVE.ready) return; if (S.next < 1) return; beginDaily(); };
}

// ---------- cat ----------
const CAT = { x: 0, y: 0, tx: 0, ty: 0, state: "away", t: 20, blink: 0, face: 1, shed: 0 };
function catTick(dt) {
  if (!UPG.cat || !G.sim || G.scr !== "play" || G.unroll) return;
  const s = G.sim;
  if (CAT.sim !== s) { CAT.sim = s; CAT.state = "away"; CAT.t = 25 + Math.random() * 20; }
  CAT.t -= dt; CAT.blink -= dt;
  if (CAT.blink < -3 - Math.random() * 3) CAT.blink = 0.15;
  const edgeX = () => { const hw = G.W / 2 / G.cam.s; return Math.random() < 0.5 ? G.cam.x - hw - 0.3 * s.cpm : G.cam.x + hw + 0.3 * s.cpm; };
  if (CAT.state === "away" && CAT.t <= 0) {
    // choose a dry spot on the rug
    let tries = 0, k = -1;
    while (tries++ < 60) { const i = Math.floor(s.gw * (0.15 + Math.random() * 0.7)), j = Math.floor(s.by0 + (s.by1 - s.by0) * (0.15 + Math.random() * 0.7)); const q = j * s.gw + i; if (s.W[q] < 0.15 && s.F[q] < 0.05) { k = q; break; } }
    if (k < 0) { CAT.t = 20; return; }
    CAT.tx = k % s.gw; CAT.ty = (k / s.gw) | 0; CAT.x = edgeX(); CAT.y = CAT.ty + (Math.random() - 0.5) * s.cpm * 0.4; CAT.state = "walk"; CAT.shed = 0;
  }
  // shoo when a tool works nearby
  if ((CAT.state === "sit" || CAT.state === "walk") && G.stroke) {
    const d = Math.hypot(G.stroke.wx - CAT.x, G.stroke.wy - CAT.y);
    if (d < 0.35 * s.cpm) { CAT.state = "flee"; CAT.tx = edgeX(); CAT.ty = CAT.y; if (!CAT.saidFlee) { CAT.saidFlee = 1; toast("Пуговка обиделась и ушла", true); } }
  }
  if (CAT.state === "walk" || CAT.state === "flee") {
    const dx = CAT.tx - CAT.x, dy = CAT.ty - CAT.y, d = Math.hypot(dx, dy);
    const v = (CAT.state === "flee" ? 1.4 : 0.32) * s.cpm * dt;
    if (d < v) {
      if (CAT.state === "flee") { CAT.state = "away"; CAT.t = 50 + Math.random() * 40; }
      else { CAT.state = "sit"; CAT.t = 12 + Math.random() * 14; AU.purr(); }
    } else { CAT.x += dx / d * v; CAT.y += dy / d * v; CAT.face = dx >= 0 ? 1 : -1; }
  } else if (CAT.state === "sit") {
    if (CAT.shed < 6 && Math.random() < dt * 0.35) {
      CAT.shed++;
      s.objs.push({ x: CAT.x + (Math.random() - 0.5) * s.cpm * 0.15, y: CAT.y + (Math.random() - 0.3) * s.cpm * 0.1, t: 0, a: Math.random() * TAU, l: 0.6 + Math.random() * 0.6, k: (Math.random() - 0.5) * 2, c: Math.random() < 0.5 ? "#E3B373" : "#F2E6D8", s: 0, vx: 0, vy: 0, tt: 0, sz: 0.8 });
    }
    if (CAT.t <= 0) { CAT.state = "flee"; CAT.tx = edgeX(); CAT.ty = CAT.y; }
  }
}
function drawCat(ctx) {
  if (!UPG.cat || !G.sim || G.scr !== "play" || CAT.state === "away" || CAT.sim !== G.sim) return;
  const s = G.cam.s, m = G.sim.cpm * s;
  const [X, Y] = w2s(CAT.x, CAT.y);
  const r = 0.085 * m;
  const moving = CAT.state !== "sit";
  ctx.save(); ctx.translate(X, Y); ctx.scale(CAT.face, 1);
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.35, r * 1.35, r * 0.85, 0, 0, TAU); ctx.fill();
  const tail = Math.sin(G.t * (moving ? 7 : 1.4)) * 0.5;
  ctx.strokeStyle = "#D9A566"; ctx.lineWidth = r * 0.3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.15); ctx.quadraticCurveTo(-r * 1.9, r * (0.1 + tail), -r * 1.65, -r * (0.55 + tail * 0.6)); ctx.stroke();
  // legs while walking
  if (moving) { ctx.fillStyle = "#C98E4E"; const ph = G.t * 14; for (const [lx, o] of [[-0.55, 0], [-0.3, 1.5], [0.35, 3], [0.6, 4.5]]) { ctx.beginPath(); ctx.ellipse(r * lx + Math.sin(ph + o) * r * 0.12, r * 0.55, r * 0.12, r * 0.18, 0, 0, TAU); ctx.fill(); } }
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, "#F1C58A"); g.addColorStop(1, "#C98E4E");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * (moving ? 0.62 : 0.74), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(160,100,45,0.55)";
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * r * 0.35, -r * 0.08, r * 0.08, r * 0.46, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#EBBB7E"; ctx.beginPath(); ctx.arc(r * 0.98, -r * 0.12, r * 0.52, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 0.62, -r * 0.48); ctx.lineTo(r * 0.72, -r * 0.95); ctx.lineTo(r * 0.98, -r * 0.6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 1.08, -r * 0.6); ctx.lineTo(r * 1.34, -r * 0.93); ctx.lineTo(r * 1.4, -r * 0.42); ctx.fill();
  ctx.fillStyle = "#F4E7D5"; ctx.beginPath(); ctx.ellipse(r * 1.12, r * 0.06, r * 0.24, r * 0.16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2a2118";
  if (CAT.blink > 0 || CAT.state === "sit" && Math.sin(G.t * 0.7) > 0.6) { ctx.fillRect(r * 0.84, -r * 0.2, r * 0.18, r * 0.045); ctx.fillRect(r * 1.14, -r * 0.2, r * 0.18, r * 0.045); }
  else { ctx.beginPath(); ctx.arc(r * 0.93, -r * 0.18, r * 0.075, 0, TAU); ctx.arc(r * 1.23, -r * 0.18, r * 0.075, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#d9776a"; ctx.beginPath(); ctx.arc(r * 1.12, -r * 0.02, r * 0.055, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------- loop ----------
let lastTS = 0, simAcc = 0, statAcc = 0, floorAcc = 0, fringeAcc = 0, sizeAcc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const t = ts / 1000;
  let dt = lastTS ? t - lastTS : 0.016; lastTS = t;
  dt = clamp(dt, 0, 0.05);
  G.t += dt;
  sizeAcc += dt; if (sizeAcc > 0.25) { sizeAcc = 0; sizeCheck(); }
  if (!GLR.ok || !G.sim) return;
  const sim = G.sim;
  const titleLike = G.scr === "title" || G.scr === "ticket" || G.scr === "chapter";
  if (titleLike) attractTick(dt);
  const playing = G.scr === "play" && !G.paused && !G.sheetOpen;
  if (playing) { unrollTick(dt); toolUpdate(dt); noteTick(); catTick(dt); }
  if (G.scr === "finish") { finishTick(dt); if (["comb", "fbrush", "needle", "overcast", "dye", "tie"].includes(G.tool)) toolUpdate(dt); }
  if (G.weigh) { scaleTick(dt); return; }
  if (G.duster) { dusterTick(dt); return; }
  if (playing || titleLike || G.scr === "finish") {
    simAcc += dt;
    // after the handover only the stain remover keeps working, so the grade stays as promised
    if (simAcc > 0.05) { if (G.scr === "finish") { sim.chemTick(simAcc); sim.floor.tick(simAcc); } else sim.tick(simAcc); simAcc = 0; }
  }
  if (playing && !G.unroll) { statAcc += dt; if (statAcc > 0.45 || (G.statsNow && statAcc > 0.1)) { statAcc = 0; statsTick(); } tlTick(dt); }
  if (G.tlPlay) tlPlayTick(dt);
  if (playing && G.saveDirty && G.t - G.lastSave > 8) saveNow(false);
  // drain sound follows floor water
  if (playing || G.scr === "finish") { let fv = 0; const F = sim.floor.V; for (let k = 0; k < F.length; k += 7) fv += F[k]; AU.setLoop("drain", fv > 2 ? Math.min(0.2, fv * 0.004) : 0); }
  // camera smoothing
  if (G.camTarget) { const c = G.cam, T = G.camTarget, k = Math.min(1, dt * 7); c.x = lerp(c.x, T.x, k); c.y = lerp(c.y, T.y, k); c.s = lerp(c.s, T.s, k); if (Math.abs(c.s - T.s) < 0.002 * T.s && Math.abs(c.x - T.x) < 0.05) G.camTarget = null; }
  if (G.scr === "play") UI.fitBtn(G.cam.s > G.fit.s * 1.08 || Math.abs(G.cam.x - G.fit.x) > 3 || Math.abs(G.cam.y - G.fit.y) > 3);
  FX.update(dt);
  G.beaterLift = Math.max(0, G.beaterLift - dt * 5);
  G.hint = G.t < G.hintUntil ? 0.55 + 0.45 * Math.sin(G.t * 6) : 0;
  if (G.splitAnim && G.split !== null) { G.splitAnim.t += dt; G.split = lerp(1, 0.5, smooth(0, 1.4, G.splitAnim.t)); UI.placeCmp(); if (G.splitAnim.t > 1.5) G.splitAnim = null; }
  // uploads
  GLR.uploadSim();
  floorAcc += dt; if (floorAcc > 0.07) { floorAcc = 0; GLR.uploadFloor(); }
  // new tassels grow in, repaired edges get repainted
  if (G.rug.strands.length) for (const q of G.rug.strands) if (q.grow !== undefined && q.grow < 1) { q.grow = Math.min(1, q.grow + dt * 3); G.fringeDirty = true; }
  fringeAcc += dt;
  if ((G.fringeDirty || G.edgeDirty) && fringeAcc > 0.15) { fringeAcc = 0; if (G.fringeDirty) drawFringe(G.rug); if (G.edgeDirty) paintFray(G.rug, sim); G.fringeDirty = false; G.edgeDirty = false; GLR.refreshRug(); }
  const lampBoost = UPG.lamp ? 1 : 0;
  const P = {
    lamp: [sim.gw * 0.46, sim.gh * 0.42, Math.max(sim.gw, sim.gh) * (0.78 + lampBoost * 0.18)], amb: 0.3 + lampBoost * 0.08,
    uv: G.uv || [0, 0, 1, 0], t: G.t, rip: FX.rip, hint: G.hint, bleed: [0.85, 0.35, 0.38],
    mat: [G.rug.st.pile, G.rug.st.sheen, 0], reveal: G.reveal, dust: G.rug.st.dust, split: G.split, dry: G.dry,
    snowFloor: G.loc === "yard",
  };
  // the title loop is decoration: half the frames keep the phone cooler
  G.frameN = (G.frameN || 0) + 1;
  if (titleLike && G.frameN % 2) return;
  GLR.render(G.cam, P);
  drawOverlay();
}
function drawOverlay() {
  const ctx = FX.ctx, W = G.W, H = G.H, sim = G.sim, cam = G.cam;
  ctx.clearRect(0, 0, W, H);
  if (G.split !== null && G.scr === "result") { /* compare: props only on the right */ }
  drawProps(ctx, sim, cam, W, H, G.propLoc || G.loc);
  if (G.unroll) drawRoll(ctx, sim, cam, W, H, G.reveal, G.rug);
  if (!G.unroll) { drawObjects(ctx, sim, cam, W, H); drawFrayThreads(ctx, sim, cam, W, H); }
  drawCat(ctx);
  FX.draw(ctx, cam, W, H);
  // tools
  const st = G.stroke;
  const s = cam.s;
  if (G.scr === "title" && G.auto && G.auto.sq) {
    const a = G.auto; const [X, Y] = w2s(a.cols[a.i], a.y);
    ToolDraw.squeegee(ctx, X, Y, Math.PI / 2, a.blade * s, s, X, Y + 90 * G.dpr, a.sq.v, a.sq.l / (a.sq.v + 1e-3), a.sq.f / (a.sq.v + 1e-3));
  }
  if (st && (G.scr === "play" || G.scr === "finish")) {
    const [X, Y] = w2s(st.wx, st.wy);
    const ang = Math.atan2(st.ny, st.nx);
    const t = G.tool;
    if (st.off) { ctx.strokeStyle = "rgba(255,245,225,0.35)"; ctx.lineWidth = 1.5 * G.dpr; ctx.beginPath(); ctx.arc(X, Y, 5 * G.dpr, 0, TAU); ctx.stroke(); }
    if (t === "squeegee") ToolDraw.squeegee(ctx, X, Y, st.sq && st.sq.hasDir ? Math.atan2(st.sq.ny, st.sq.nx) : Math.PI / 2, toolSize(t) * s, s, st.fx, st.fy, st.sq ? st.sq.v : 0, st.sq ? st.sq.l / (st.sq.v + 1e-3) : 0, st.sq ? st.sq.f / (st.sq.v + 1e-3) : 0);
    else if (t === "broom") { const a2 = st.sq && st.sq.hasDir ? Math.atan2(st.sq.ny, st.sq.nx) : Math.PI / 2; if (st.sq && st.sq.v > 0.05) ToolDraw.wave(ctx, X + Math.cos(a2) * s * 1.2, Y + Math.sin(a2) * s * 1.2, a2, toolSize(t) * s * 0.9, s, st.sq.v, st.sq.l / (st.sq.v + 1e-3), 1, true); ToolDraw.broom(ctx, X, Y, a2, toolSize(t) * s, s, st.fx, st.fy); }
    else if (t === "machine") ToolDraw.machine(ctx, X, Y, toolSize(t) * s, s, G.spin, st.fx, st.fy);
    else if (t === "vacuum") ToolDraw.vacuum(ctx, X, Y, ang, toolSize(t) * s, s, st.fx, st.fy);
    else if (t === "brush") ToolDraw.brush(ctx, X, Y, ang + Math.sin(G.t * 18) * 0.08, s, toolSize(t) * s * 0.8, st.fx, st.fy);
    else if (t === "washer") ToolDraw.nozzle(ctx, X, Y, st.fx, st.fy, s, "washer");
    else if (t === "hose") ToolDraw.nozzle(ctx, X, Y, st.fx, st.fy, s, "hose");
    else if (t === "foam") ToolDraw.nozzle(ctx, X, Y, st.fx, st.fy, s, "foam");
    else if (t.startsWith("spray")) ToolDraw.nozzle(ctx, X, Y, st.fx, st.fy, s, "spray", CHEMS[+t.slice(5)].cap);
    else if (t === "fixer") ToolDraw.nozzle(ctx, X, Y, st.fx, st.fy, s, "spray", "#E7A6C8");
    else if (t === "uv") ToolDraw.nozzle(ctx, X, Y, st.fx, st.fy, s, "uv");
    else if (t === "iron") ToolDraw.iron(ctx, X, Y, s, toolSize(t) * s * 1.1);
    else if (t === "loupe") ToolDraw.loupe(ctx, X, Y, TOOLDEF.loupe.r * sim.cpm * s, st.fx, st.fy);
    else if (t === "comb") ToolDraw.comb(ctx, X, Y, s, toolSize(t) * s);
    else if (t === "fbrush") ToolDraw.brush(ctx, X, Y, ang + Math.sin(G.t * 18) * 0.08, s, toolSize(t) * s * 0.5, st.fx, st.fy);
    else if (t === "needle") ToolDraw.needle(ctx, X, Y, s, st.fx, st.fy, G.t);
    else if (t === "overcast") ToolDraw.needle(ctx, X, Y, s, st.fx, st.fy, G.t, rgbCss(hexRGB(G.rug.st.bind || "#5a3a2a")));
    else if (t === "dye") ToolDraw.pen(ctx, X, Y, st.fx, st.fy, G.rug.fieldIdxColor);
    else if (t === "tie") ToolDraw.comb(ctx, X, Y, s, toolSize(t) * s);
    else if (t === "shovel") ToolDraw.shovel(ctx, X, Y, s, toolSize(t) * s * 0.6, st.fx, st.fy + 60 * G.dpr);
  }
  if (G.beaterLift > 0 && G.tool === "beater" && G.scr === "play") {
    const [X, Y] = w2s(G.beatX, G.beatY);
    ToolDraw.beater(ctx, X, Y, toolSize("beater") * s * 0.95, G.beaterLift, s);
  }
}

// ---------- boot ----------
function boot() {
  G.noScale = /[?&]noscale/.test(location.search);
  resize(true);
  if (!GLR.init($("gl"))) { $("glFail").hidden = false; $("scrTitle").hidden = true; return; }
  GLR.onRestore = () => { if (G.rug) { GLR.setRug(G.rug); GLR.setSim(G.sim); GLR.floorKey = null; GLR.setFloor(G.loc); } };
  FX.init($("ov"));
  UI.init();
  bindInput($("ov"));
  bindTitle();
  window.addEventListener("resize", () => { sizeAcc = 1; });
  window.addEventListener("orientationchange", () => setTimeout(() => resize(true), 250));
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (G.scr === "play") saveNow(true); else saveSync(); } });
  window.addEventListener("pagehide", () => saveSync());
  G.scr = "title";
  UI.showTitle();
  startAttract();
  loadAll().then(() => {
    UI.refreshTitle();
    if (SAVE.pending === "cont") { SAVE.pending = null; beginNext(); }
  });
  requestAnimationFrame(frame);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
