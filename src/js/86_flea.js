// ===== Flea market: buy a neglected rug, bring it back to life, sell it or hang it on the wall =====
const FLEA_TIERS = [
  { name: "Обычный", styles: ["soviet", "sun", "kids", "beni", "hotel"], value: [2600, 4200], ages: ["1980-е", "1970-е"], unlock: 0, w: 0.55 },
  { name: "Редкий", styles: ["kazak", "shirvan", "bukhara", "persian", "kilim"], value: [7000, 12000], ages: ["1960-е", "1950-е"], unlock: 5, w: 0.35 },
  { name: "Антикварный", styles: ["silk", "persian", "kazak", "bukhara"], value: [20000, 34000], ages: ["начало века", "XIX век"], unlock: 10, w: 0.1 },
];
const FLEA_SELLERS = [["Тётя Валя", "торгует у входа на рынок"], ["Семёныч", "разбирает чердаки"], ["Гоша", "перекупщик, знает все цены"], ["Нина Аркадьевна", "раздаёт вещи из маминой квартиры"], ["Ашот", "держит палатку со старыми коврами"], ["Лёха", "возит вещи с дач"]];
const FLEA_STORIES = [
  "Двадцать лет лежал свёрнутым на чердаке, моль успела пообедать.",
  "Висел в деревенском доме над печкой: копоть и пыль в каждом узелке.",
  "Его вынесли с дачи после ливня, он сох на заборе и собрал всю пыль улицы.",
  "Под ним жила собака, и ковёр это помнит.",
  "Его берегли для праздников, а праздники в той семье случались часто.",
  "Лежал в прихожей коммуналки, по нему ходили шесть семей.",
  "Продавец уверяет, что под грязью прячется редкий узор.",
];
const FLEA_REFRESH = 400, FLEA_STOCK = 3;
const HOOK_PRICES = [3000, 5000, 8000, 12000, 18000, 26000];

function fleaOpen() { return S.next >= 3; }
function fleaTools() { return toolsUpTo(Math.max(0, Math.min(S.next, ORDERS.length) - 1)); }
function makeFlea(seed) {
  const r = mulberry(seed);
  const lvl = Math.min(S.next, ORDERS.length);
  const open = FLEA_TIERS.filter((t) => lvl >= t.unlock);
  let x = r() * open.reduce((a, t) => a + t.w, 0), ti = 0;
  for (; ti < open.length - 1; ti++) { x -= open[ti].w; if (x < 0) break; }
  const T = FLEA_TIERS[ti];
  const tools = fleaTools();
  let style = T.styles[Math.floor(r() * T.styles.length)];
  if (style === "kilim" && !tools.has("fixer")) style = "kazak";
  const dm = STYLE_DIMS[style];
  const types = ["mud"];
  if (tools.has("spray1")) types.push("wine", "coffee", "tea", "tide", "mold");
  if (tools.has("spray2")) types.push("grease", "soot");
  if (tools.has("spray3")) types.push("pet");
  if (tools.has("iron")) types.push("wax");
  const stains = [];
  const ns = 2 + Math.floor(r() * 3);
  for (let i = 0; i < ns; i++) { const ty = types[Math.floor(r() * types.length)]; stains.push(ty === "wax" ? { type: ty, n: 2, size: 0.04, drops: 5 } : { type: ty, n: 1 + Math.floor(r() * 2), size: 0.07 + r() * 0.07 }); }
  const dirt = { dust: 0.55 + r() * 0.4, sand: 0.45 + r() * 0.45, grime: 0.55 + r() * 0.35, lane: r() < 0.5 ? 1 : 0, stains };
  if (r() < 0.5) dirt.hair = 60 + Math.floor(r() * 180);
  if (r() < 0.3) dirt.leaves = 20 + Math.floor(r() * 30);
  if (r() < 0.3) dirt.fluff = 20 + Math.floor(r() * 30);
  // wear and tear grows with age
  let dmg = 0;
  if (style !== "silk" && r() < [0.35, 0.55, 0.7][ti]) { dirt.moth = { n: 1 + Math.floor(r() * 2), size: 0.035 + r() * 0.025 }; dmg++; }
  if (r() < [0.35, 0.5, 0.6][ti]) { dirt.fray = { n: 1, len: 0.22 + r() * 0.25 }; dmg++; }
  if (r() < [0.3, 0.45, 0.6][ti]) { dirt.wear = { n: 1 + Math.floor(r() * 2), size: 0.07 + r() * 0.05 }; dmg++; }
  if (r() < [0.3, 0.4, 0.5][ti]) { dirt.gone = 0.1 + r() * 0.08; dmg++; }
  const widthM = style === "silk" ? 0.9 + r() * 0.3 : [1.0, 1.2, 1.3][ti] + r() * 0.5;
  const value = Math.round((T.value[0] + r() * (T.value[1] - T.value[0])) * (0.75 + 0.25 * widthM / 1.4) / 100) * 100;
  const buy = Math.round(value * (0.44 - 0.03 * dmg - 0.04 * r()) / 10) * 10;
  const [client, who] = FLEA_SELLERS[Math.floor(r() * FLEA_SELLERS.length)];
  const age = T.ages[Math.floor(r() * T.ages.length)];
  const ch = Math.max(1, (ORDERS[Math.max(0, Math.min(S.next, ORDERS.length) - 1)] || ORDERS[0]).ch);
  const o = {
    kind: "flea", id: "f" + seed, title: STYLE_NAMES[style] + ", " + age, client, who,
    rug: { style, kw: dm[0], kh: dm[1], ppk: dm[2], seed: seed % 997, widthM }, dirt,
    story: FLEA_STORIES[Math.floor(r() * FLEA_STORIES.length)], wish: "Отмыть, подлатать и решить: продать или повесить на стену.",
    price: 0, buy, value, tier: ti, age, dmg, ch,
    react: ["Возьму, раз уж отмыт.", "Хороший ковёр, беру.", "Вот это находка! Беру сразу."],
    delicate: style === "silk", bleedy: style === "kilim" && tools.has("fixer"),
  };
  o.loc = CHAPTERS[o.ch - 1].loc;
  return o;
}
// the buyer pays for the look: a dull rug sells for a fifth, a perfect one for the full price
function fleaSale(o, score) { return Math.round(o.value * (0.2 + 0.8 * Math.pow(clamp((score - 60) / 40, 0, 1), 1.3)) / 10) * 10; }
function fleaMarket() {
  const dk = dayKey();
  if (!S.flea || S.flea.day !== dk) S.flea = { day: dk, gen: 0, items: fleaGen(dk, 0) };
  return S.flea;
}
function fleaGen(dk, gen) { const b = strSeed("flea:" + dk + ":" + gen); return [0, 1, 2].map((i) => makeFlea((b + i * 7919) % 1000003)); }
function fleaBuy(id) {
  const m = fleaMarket(), i = m.items.findIndex((q) => q.id === id); if (i < 0) return;
  const o = m.items[i];
  S.stock = S.stock || [];
  if (S.money < o.buy || S.stock.length >= FLEA_STOCK) return;
  S.money -= o.buy; S.stock.push(o); m.items.splice(i, 1);
  AU.bell(740, 0.1); AU.bell(988, 0.08, 0.12);
  UI.toast("Куплено: " + o.title);
  G.saveDirty = true; saveNow(true);
}
function fleaRefresh() {
  const m = fleaMarket(); if (S.money < FLEA_REFRESH) return;
  S.money -= FLEA_REFRESH; m.gen++; m.items = fleaGen(m.day, m.gen);
  AU.tok(); G.saveDirty = true; saveNow(true);
}
function beginFlea(id) {
  const o = (S.stock || []).find((q) => q.id === id); if (!o) return;
  if (S.cur && S.cur.kind === "flea" && S.cur.id === id) { UI.hideTitle(); return resumeCur(); }
  UI.hideTitle(); G.scr = "ticket";
  UI.ticket(o, () => startPlay(o), () => { goTitle(); UI.openMarket("stall"); });
}
// after the receipt: the rug waits for a decision
function fleaSettle(o, gr, stars) {
  S.stock = (S.stock || []).filter((q) => q.id !== o.id);
  // an earlier rug still waiting for a decision goes to the buyer
  const prev = S.fleaPending;
  if (prev) { fleaSell(); setTimeout(() => UI.toast(`«${prev.title}» ушёл покупателю за ${fmtMoney(prev.sale)}`), 2400); }
  const sale = fleaSale(o, gr.score);
  S.fleaPending = { id: o.id, title: o.title, rug: o.rug, tier: o.tier, age: o.age, buy: o.buy, value: o.value, score: Math.round(gr.score), stars, sale };
  return S.fleaPending;
}
function fleaSell() {
  const p = S.fleaPending; if (!p) return;
  S.money += p.sale; S.earned += p.sale;
  S.fleaProfit = (S.fleaProfit || 0) + (p.sale - p.buy); S.fleaSold = (S.fleaSold || 0) + 1;
  S.fleaPending = null;
  AU.bell(660, 0.09); AU.bell(880, 0.08, 0.1); AU.bell(1175, 0.07, 0.2);
  fleaAch(p);
  G.saveDirty = true; saveNow(true);
}
function wallCap() { return 4 + (S.hooks || 0); }
function fleaHang() {
  const p = S.fleaPending; if (!p) return false;
  S.wall = S.wall || [];
  if (S.wall.length >= wallCap()) return false;
  S.wall.push(Object.assign({}, p, { date: Date.now() }));
  S.fleaPending = null;
  AU.bell(523, 0.09); AU.bell(784, 0.08, 0.14);
  fleaAch(p);
  G.saveDirty = true; saveNow(true);
  return true;
}
// a rug on the wall gains 3% a day, up to 30%
function wallValue(e) { const days = Math.max(0, (Date.now() - (e.date || Date.now())) / 864e5); return Math.round(e.sale * (1 + Math.min(0.3, days * 0.03)) / 10) * 10; }
function wallSell(i) {
  const e = (S.wall || [])[i]; if (!e) return;
  const v = wallValue(e);
  S.money += v; S.earned += v;
  S.fleaProfit = (S.fleaProfit || 0) + (v - e.buy); S.fleaSold = (S.fleaSold || 0) + 1;
  S.wall.splice(i, 1);
  AU.bell(660, 0.09); AU.bell(880, 0.08, 0.1);
  UI.toast("Продано за " + fmtMoney(v));
  fleaAch(e);
  G.saveDirty = true; saveNow(true);
}
function buyHook() {
  const n = S.hooks || 0, price = HOOK_PRICES[n];
  if (price === undefined || S.money < price) return;
  S.money -= price; S.hooks = n + 1;
  AU.bell(740, 0.1); AU.bell(988, 0.08, 0.12);
  UI.toast("На стене новый крючок");
  G.saveDirty = true; saveNow(true);
}
function fleaAch(p) {
  if ((S.wall || []).length >= 6) grantAch("collector");
  if ((S.fleaProfit || 0) >= 20000) grantAch("dealer");
  if (p && p.tier === 2 && p.score >= 90) grantAch("antique");
}

// ---------- market and wall screens ----------
Object.assign(UI, {
  openMarket(tab) {
    tab = tab || this._mTab || "stall"; this._mTab = tab;
    let h = `<div class="shop-top"><span style="color:var(--ink2);font-size:13px">Субботний рынок у депо</span><span class="bal">${fmtMoney(S.money)}</span></div>`;
    h += `<div class="seg jtabs"><button data-t="stall" class="${tab === "stall" ? "on" : ""}">${icon("rug")}Прилавок</button><button data-t="wall" class="${tab === "wall" ? "on" : ""}">${icon("wall")}Стена · ${(S.wall || []).length}/${wallCap()}</button></div>`;
    h += tab === "wall" ? this._wallHtml() : this._stallHtml();
    this.openSheet("Барахолка", h);
    const B = $("sheetB");
    for (const b of B.querySelectorAll(".jtabs button")) b.onclick = () => { AU.tok(); this.openMarket(b.dataset.t); };
    for (const b of B.querySelectorAll("[data-buy]")) b.onclick = () => { fleaBuy(b.dataset.buy); this.openMarket(); };
    for (const b of B.querySelectorAll("[data-wash]")) b.onclick = () => { AU.tok(); this.closeSheet(); beginFlea(b.dataset.wash); };
    for (const b of B.querySelectorAll("[data-wsell]")) b.onclick = () => { const i = +b.dataset.wsell, e = S.wall[i]; this.ask("Продать ковёр?", `${e.title}. Покупатель даёт ${fmtMoney(wallValue(e))}.`, "Продать", () => { wallSell(i); this.openMarket("wall"); }); };
    const pS = $("fpSell"), pH = $("fpHang"), rf = $("fRefresh"), hk = $("fHook");
    if (pS) pS.onclick = () => { fleaSell(); this.openMarket(); };
    if (pH) pH.onclick = () => { if (fleaHang()) this.openMarket("wall"); };
    if (rf) rf.onclick = () => { fleaRefresh(); this.openMarket("stall"); };
    if (hk) hk.onclick = () => { buyHook(); this.openMarket("wall"); };
  },
  _fleaTags(o) {
    const t = [];
    if (o.dirt.moth) t.push("моль"); if (o.dirt.fray) t.push("обтрёпан край"); if (o.dirt.wear) t.push("потёртости"); if (o.dirt.gone) t.push("кисти оборваны");
    if (o.delicate) t.push("шёлк"); if (o.bleedy) t.push("краска линяет");
    t.push(o.dirt.stains.length + " " + plural(o.dirt.stains.length, "пятно", "пятна", "пятен"));
    return t;
  },
  _pendingHtml(p, inResult) {
    const full = (S.wall || []).length >= wallCap();
    const d = p.sale - p.buy;
    return `<div class="fpend"><div class="fp-t">${inResult ? "" : `<b>${p.title}</b><small>ждёт решения · оценка ${p.score}%</small>`}</div>
      <div class="fp-row"><span>Куплен за</span><b>${fmtMoney(p.buy)}</b></div>
      <div class="fp-row"><span>Покупатель даёт</span><b>${fmtMoney(p.sale)} <i class="${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : "−"}${fmtMoney(Math.abs(d))}</i></b></div>
      <div class="fp-row soft"><span>На стене цена растёт на 3% в день, до +30%</span></div>
      <div class="fp-acts"><button class="btn-ink" id="fpSell">Продать</button><button class="btn-ink alt" id="fpHang" ${full ? "disabled" : ""}>${full ? "Стена занята" : "На стену"}</button></div></div>`;
  },
  _stallHtml() {
    const m = fleaMarket(), stock = S.stock || [];
    let h = "";
    if (S.fleaPending) h += `<div class="lbl2">Отмытый ковёр</div>` + this._pendingHtml(S.fleaPending);
    if (stock.length) {
      h += `<div class="lbl2">Куплены, ждут мойки · ${stock.length}/${FLEA_STOCK}</div><div class="ords" style="margin-bottom:14px">`;
      for (const o of stock) {
        const inWork = S.cur && S.cur.kind === "flea" && S.cur.id === o.id;
        h += `<button class="ord" data-wash="${o.id}"><img src="${rugThumb(o.rug)}" alt=""><span><b>${o.title}</b><small>${inWork ? "в работе, продолжить" : "куплен за " + fmtMoney(o.buy)}</small></span><span class="fgo">${icon("arrow")}</span></button>`;
      }
      h += `</div>`;
    }
    h += `<div class="lbl2">На прилавке</div>`;
    if (!m.items.length) h += `<p class="alb-empty">Прилавок пуст. Завтра привезут новое, или Гоша достанет прямо сейчас.</p>`;
    for (const o of m.items) {
      const can = S.money >= o.buy && stock.length < FLEA_STOCK;
      const sz = `${o.rug.widthM.toFixed(1).replace(".", ",")} × ${(o.rug.widthM * o.rug.kh / o.rug.kw).toFixed(1).replace(".", ",")} м`;
      h += `<div class="flot t${o.tier}"><img src="${rugThumb(o.rug)}" alt=""><div>
        <div class="fl-h"><b>${o.title}</b>${o.tier ? `<span class="tier">${FLEA_TIERS[o.tier].name}</span>` : ""}</div>
        <small>${o.client}, ${o.who} · ${sz}</small>
        <p>${this._fleaTags(o).join(", ")}</p>
        <div class="fl-p"><span>Чистым уйдёт до <b>${fmtMoney(o.value)}</b></span></div>
        <button class="buy" data-buy="${o.id}" ${can ? "" : "disabled"}>${icon("coin")}Купить за ${fmtMoney(o.buy)}</button>
      </div></div>`;
    }
    h += `<button class="plaque sm" id="fRefresh" style="width:100%;margin-top:6px" ${S.money >= FLEA_REFRESH ? "" : "disabled"}><span class="pt"><b>Спросить Гошу</b><small>привезёт другие ковры за ${fmtMoney(FLEA_REFRESH)}</small></span></button>`;
    h += `<p style="color:var(--ink3);font-size:12.5px;text-align:center;margin-top:12px">Продано ковров: ${S.fleaSold || 0} · прибыль ${fmtMoney(S.fleaProfit || 0)}</p>`;
    return h;
  },
  _wallHtml() {
    const W = S.wall || [], cap = wallCap();
    const sum = W.reduce((a, e) => a + wallValue(e), 0);
    let h = `<div class="alb-top"><span>Ковров на стене: <b>${W.length} из ${cap}</b></span><span>Стоит стена: <b>${fmtMoney(sum)}</b></span></div>`;
    h += `<div class="fwall">`;
    for (let i = 0; i < cap; i++) {
      const e = W[i];
      if (!e) { h += `<div class="hook empty"><i class="pin"></i><span>свободный крючок</span></div>`; continue; }
      const v = wallValue(e), up = v - e.sale;
      h += `<div class="hook"><i class="pin"></i><div class="hang"><img src="${rugThumb(e.rug)}" alt=""></div>
        <b>${e.title}</b><small>оценка ${e.score}%${up > 0 ? ` · +${Math.round(up / e.sale * 100)}%` : ""}</small>
        <button class="buy sm" data-wsell="${i}">Продать за ${fmtMoney(v)}</button></div>`;
    }
    h += `</div>`;
    const n = S.hooks || 0, hp = HOOK_PRICES[n];
    if (hp !== undefined) h += `<button class="plaque sm" id="fHook" style="width:100%;margin-top:12px" ${S.money >= hp ? "" : "disabled"}><span class="pt"><b>Ещё крючок</b><small>место для ковра за ${fmtMoney(hp)}</small></span></button>`;
    if (!W.length) h += `<p class="alb-empty">Отмытый ковёр с барахолки можно оставить себе. Здесь он висит и дорожает, пока найдётся покупатель.</p>`;
    return h;
  },
});
