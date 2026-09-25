// ===== UI =====
const ICONS = {
  beater: '<path d="M14.5 14.5L21 21" stroke-width="2.6"/><path d="M14.5 14.5C11 15 6.5 12 7 8.5C7.5 5 11.5 4.8 12 7.5C12.4 9.8 9.6 10.6 8.2 9.2"/><path d="M14.5 14.5C15 11 12 6.5 8.5 7" /><path d="M14.5 14.5C11.5 17.5 5 17 4 13.5C3.2 10.5 5.5 8.5 8 9"/><path d="M14.5 14.5C17.5 11.5 17 5 13.5 4C10.5 3.2 8.5 5.5 9 8"/>',
  vacuum: '<rect x="2.5" y="15.5" width="11" height="4.5" rx="2"/><path d="M8 15.5L18.5 4.5"/><path d="M17 3.5l3 3"/><path d="M4.5 18h1.5M9 18h3"/>',
  loupe: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21" stroke-width="2.4"/><path d="M7.5 8a3 3 0 0 1 2.5-1.8"/>',
  uv: '<path d="M3.5 14.5l6-6 5 5-6 6z"/><path d="M12 11l3-3 2 2-3 3"/><path d="M18 3.5v2.2M21.5 6.5l-1.6 1.4M21.5 10.5h-2"/>',
  spray: '<path d="M8 9.5h6.5l1 11.5H7z"/><path d="M9 9.5V6.5h4.5v3"/><path d="M13.5 6.5h4.5l-1.5 2"/><path d="M19.5 4.5l1.5-1M20 7h2M19.5 9.5l1.5 1"/>',
  fixer: '<path d="M6 9.5h7.5v11H6z"/><path d="M7.5 9.5v-3h4.5v3"/><rect x="14" y="13.5" width="7" height="6" rx="1"/><path d="M15.5 13.5v-2a2 2 0 0 1 4 0v2"/>',
  iron: '<path d="M3 17.5h15.5c1-4.5-1.5-8.5-6.5-8.5H8"/><path d="M3 17.5c0-3.2 2.2-5.5 5.5-5.5"/><path d="M9.5 9V6h6.5"/><path d="M6 20.5h12"/>',
  foam: '<rect x="5.5" y="8.5" width="8" height="12.5" rx="2"/><path d="M7.5 8.5V5.5h4v3"/><path d="M11.5 5.5h4.5"/><circle cx="18.2" cy="9.3" r="1.7"/><circle cx="20.3" cy="13.5" r="1.1"/><circle cx="17.3" cy="15.8" r=".9"/>',
  brush: '<rect x="3.5" y="8" width="17" height="6" rx="2.2"/><path d="M5.5 14v5M8.5 14v5M11.5 14v5M14.5 14v5M17.5 14v5"/><path d="M8 11h8"/>',
  machine: '<circle cx="9.5" cy="15" r="6"/><circle cx="9.5" cy="15" r="2"/><path d="M13.5 10.5L19 4"/><path d="M16.5 3h5"/><path d="M5 11.5l1 1M14 11.5l-1 1"/>',
  squeegee: '<path d="M3 19h18" stroke-width="2.7"/><path d="M5 15.5h14v2.5H5z"/><path d="M12 15.5V2.5"/>',
  hose: '<path d="M3 20c3-1 4-4 7-5s4 1 6-1"/><path d="M15.5 14.5l3-3"/><path d="M17 10l2.5 2.5"/><path d="M20 6.5v1.5M22 9h-1.5M21.5 5l-1 1"/>',
  washer: '<path d="M3 13.5h8.5l2-2.5h3.5"/><path d="M7 13.5v5.5h3.5v-5.5"/><path d="M17.5 11l4-2M17.5 11h4.5M17.5 11l4 2"/>',
  shovel: '<path d="M3.5 20.5h9v-6.5h-9z"/><path d="M8 14L18.5 3.5"/><path d="M16.5 2.5l3 3"/>',
  broom: '<path d="M17 2.5L10 12"/><path d="M5.5 12h8.5l2 9H3.5z"/><path d="M6.5 15.5l-1 5M9.5 15.5v5M12.5 15.5l1 5"/>',
  comb: '<path d="M3 7.5h18v4.5H3z"/><path d="M4.5 12v7M7.5 12v7M10.5 12v7M13.5 12v7M16.5 12v7M19.5 12v7"/>',
  overcast: '<path d="M3 20h18"/><path d="M5 20l3-7M9 20l3-7M13 20l3-7M17 20l3-7"/><path d="M4 13h17"/><path d="M15 3l-4 7"/><circle cx="15.6" cy="3.6" r="1"/>',
  dye: '<path d="M14.5 3.5l6 6-9.5 9.5H5v-6z"/><path d="M5 19l-1.5 1.5"/><path d="M12 6l6 6"/>',
  tie: '<path d="M12 3v5"/><circle cx="12" cy="9.5" r="2"/><path d="M10.5 11l-2 9M12 11.5v9M13.5 11l2 9M11 11.5l-1 8.5M13 11.5l1 8.5"/>',
  fan: '<circle cx="12" cy="12" r="9"/><path d="M12 12c0-4 1.5-6 3.6-6.4M12 12c3.5 2 4.4 4.4 3.4 6.3M12 12c-3.5 2-6 1.8-7.1-0.1"/><circle cx="12" cy="12" r="1.3"/>',
  duster: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M5 8V5.5h14V8"/><circle cx="12" cy="12" r="2"/><path d="M5 19.5l1.5-3M12 20v-4M19 19.5l-1.5-3"/>',
  needle: '<path d="M4 20L18.5 5.5"/><ellipse cx="19.3" cy="4.7" rx="1.6" ry="0.9" transform="rotate(-45 19.3 4.7)"/><path d="M19 5c2 3 1 7-3 9s-7 1-9 4"/>',
  book: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 3v18"/><path d="M11.5 8h4.5M11.5 11h4.5"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  eye: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  radio: '<rect x="3" y="8.5" width="18" height="11.5" rx="2"/><circle cx="8.5" cy="14.3" r="3"/><path d="M14.5 12.5h4.5M14.5 15.5h4.5M8 8.5l8-5"/>',
  cat: '<path d="M5 20.5c0-6 2.5-8.5 7-8.5s7 2.5 7 8.5z"/><path d="M8.5 12.5l-1.2-5 3.2 3M15.5 12.5l1.2-5-3.2 3"/><path d="M19 18.5c2.3 0 2.3-3.2 0-3.2"/>',
  lamp: '<path d="M12 2.5v3"/><path d="M8 5.5h8l-1 3H9z"/><path d="M9 8.5c-2.3 2.5-2.3 7 0 9h6c2.3-2 2.3-6.5 0-9"/><path d="M10 20.5h4"/>',
  star: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/>',
  arrow: '<path d="M9 5l7 7-7 7"/>',
  weight: '<path d="M8.5 8.5a3.5 3.5 0 0 1 7 0"/><path d="M5.5 20.5l1.7-11h9.6l1.7 11z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  rug: '<rect x="5" y="4.5" width="14" height="15" rx="1"/><path d="M7 2.5v2M10.3 2.5v2M13.7 2.5v2M17 2.5v2M7 19.5v2M10.3 19.5v2M13.7 19.5v2M17 19.5v2"/><path d="M12 8l3 4-3 4-3-4z"/>',
  wall: '<path d="M3 5h18"/><path d="M12 2.5V5"/><rect x="6.5" y="5" width="11" height="14" rx="1"/><path d="M9 9h6M9 12h6M9 15h6"/><path d="M8 19v2M12 19v2M16 19v2"/>',
  heat: '<rect x="3" y="9" width="13" height="8" rx="2"/><path d="M16 11.5h4M16 14.5h4"/><path d="M7 6.5c0-1.2 1.2-1.2 1.2-2.5M11.5 6.5c0-1.2 1.2-1.2 1.2-2.5"/><path d="M6 17v3M13 17v3"/>',
  spin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"/><path d="M3.5 12a8.5 8.5 0 0 0 8.5 8.5"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  share: '<path d="M12 3v12"/><path d="M7.5 7.5L12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  album: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 15l4.5-4 3.5 3 3-2.5 6 5"/><circle cx="15.5" cy="9" r="1.5"/>',
  sound: '<path d="M4 9.5h3.5l5-4v13l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5l5-4v13l-5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
};
function icon(n, extra) { const k = n.startsWith("spray") ? "spray" : n; return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${extra || ""}>${ICONS[k] || ""}</svg>`; }
function starsHtml(n, max) { let h = '<span class="stars">'; for (let i = 0; i < (max || 3); i++) h += `<svg viewBox="0 0 24 24" class="${i < n ? "" : "off"}">${ICONS.star}</svg>`; return h + "</span>"; }

const UI = {
  init() {
    $("btnMenu").innerHTML = icon("menu"); $("btnBook").innerHTML = icon("book"); $("gEye").innerHTML = icon("eye"); $("gSoap").innerHTML = icon("foam"); $("btnFit").innerHTML = icon("fit"); $("sheetX").innerHTML = icon("close");
    $("btnMenu").onclick = () => { AU.tok(); this.openPause(); };
    $("btnBook").onclick = () => { AU.tok(); this.openBook(); };
    $("gauge").onclick = () => {
      AU.tok();
      const ls = G.pred && G.pred.loss;
      if (ls && ls.soap >= 3) this.tip(`<b>Мыло в ворсе</b> снимает ${Math.round(ls.soap)}%. Смой его ${G.tools.includes("washer") ? "мойкой" : "шлангом"} и собери воду скребком`, 3.6);
      if ((G.score || 0) > 0.6) G.hintUntil = G.t + 4; else if (!(ls && ls.soap >= 3)) this.tip("Подсветка грязи заработает после <b>60 %</b> чистоты", 2.6);
    };
    $("btnFit").onclick = () => { AU.tok(); G.camTarget = Object.assign({}, G.fit); };
    $("btnDone").onclick = () => { AU.tok(); askFinish(); };
    $("note").onclick = () => this.hideNote();
    $("sheetX").onclick = () => { AU.tok(); this.closeSheet(); };
    $("pauseScrim").onclick = () => this.closePause();
    $("pResume").onclick = () => { AU.tok(); this.closePause(); };
    $("pBook").onclick = () => { AU.tok(); this.openBook(); };
    $("pShop").onclick = () => { AU.tok(); this.openShop(); };
    $("pHome").onclick = () => { AU.tok(); this.closePause(); goTitle(); };
    $("pRestart").onclick = () => { AU.tok(); this.ask("Начать этот ковёр заново?", "Вся грязь вернётся на место.", "Начать заново", () => { this.closePause(); restartOrder(); }); };
    const vm = $("volMusic"), vs = $("volSfx");
    vm.oninput = () => { $("volMusicO").textContent = vm.value; AU.setVol("music", vm.value / 100); S.settings.music = vm.value / 100; G.saveDirty = true; };
    vs.oninput = () => { $("volSfxO").textContent = vs.value; AU.setVol("sfx", vs.value / 100); S.settings.sfx = vs.value / 100; G.saveDirty = true; };
    this.buildTicks();
  },
  // ---------- HUD ----------
  showHud(v) { $("hud").hidden = !v; $("dock").hidden = !v; if (!v) { $("btnDone").classList.add("off"); $("tip").hidden = true; this.hideNote(); } else { this._gp = -1; this._gs = null; G.statsNow = true; } },
  setTag(o) {
    $("tagNo").textContent = o.special ? "особый" : o.kind === "daily" ? "дня" : o.kind === "flea" ? "рынок" : o.kind === "story" ? "№ " + (orderIndex(o.id) + 1) : "";
    $("tagRug").textContent = o.title; $("tagClient").textContent = o.client || "";
  },
  buildDock(tools) {
    const d = $("dockScroll");
    d.innerHTML = "";
    for (const t of tools) {
      const b = document.createElement("button");
      b.className = "tb"; b.dataset.t = t;
      const info = TOOLINFO[t] || { name: t };
      const cap = info.chem ? `<i class="cap" style="background:${CHEMS[info.chem].cap}"></i>` : t === "fixer" ? `<i class="cap" style="background:#E7A6C8"></i>` : "";
      b.innerHTML = `<span class="disc">${icon(t)}</span>${cap}<span class="nm">${info.name}</span>`;
      b.setAttribute("aria-label", info.name);
      b.onclick = () => { if (t === "duster") { if (G.scr === "play" && !G.unroll && !G.paused) openDuster(); return; } selectTool(t); };
      d.appendChild(b);
    }
    this.setTool(G.tool);
    requestAnimationFrame(() => measureInsets());
  },
  setTool(t) {
    for (const b of $("dockScroll").children) b.classList.toggle("sel", !!(b.dataset.t === t));
    const el = [...$("dockScroll").children].find((b) => b.dataset.t === t);
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  },
  setRec(t) {
    for (const b of $("dockScroll").children) b.classList.toggle("rec", !!(b.dataset.t === t && t !== G.tool));
    const done = $("btnDone");
    done.classList.toggle("ready", !!(t === "done" || ((G.score || 0) * 100 >= thresholds()[0])));
  },
  buildTicks() {
    const g = $("gTicks"); g.innerHTML = "";
    const th = thresholds();
    for (const v of th) {
      const a = (v / 100) * TAU - Math.PI / 2;
      const x1 = 33 + Math.cos(a) * 21, y1 = 33 + Math.sin(a) * 21, x2 = 33 + Math.cos(a) * 29, y2 = 33 + Math.sin(a) * 29;
      g.innerHTML += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#E6BF7C" stroke-width="1.4"/>`;
    }
  },
  gauge(pct, soapy) {
    const p = Math.round(pct * 100);
    if (this._gs !== !!soapy) { this._gs = !!soapy; $("gSoap").hidden = !soapy; }
    if (this._gp === p) return;
    this._gp = p;
    const L = 2 * Math.PI * 25;
    const arc = $("gArc");
    arc.setAttribute("stroke-dasharray", `${(L * pct).toFixed(1)} ${L.toFixed(1)}`);
    const th = thresholds();
    arc.setAttribute("stroke", p >= th[0] ? "#86B06F" : p >= 55 ? "#D9A441" : "#C0573F");
    $("gPct").textContent = p;
    const done = $("btnDone");
    const show = G.order && (G.order.kind === "free" ? p >= 30 : p >= 55);
    done.classList.toggle("off", !show);
    if (show) {
      const st = G.order.kind === "free" ? -1 : starsFor(p);
      $("doneSub").textContent = st > 0 ? "★".repeat(st) : "";
      done.classList.toggle("dim", !!(G.order.kind !== "free" && p < th[0]));
    }
  },
  hintBtn(v) { if (this._hb === v) return; this._hb = v; $("gEye").hidden = !v; },
  fitBtn(v) { if (this._fb === v) return; this._fb = v; $("btnFit").hidden = !v; },
  tip(html, sec) {
    const t = $("tip"); t.innerHTML = html; t.hidden = false;
    clearTimeout(this._tipT); this._tipT = setTimeout(() => { t.hidden = true; }, (sec || 3) * 1000);
  },
  toast(text, soft) {
    this._tq = this._tq || [];
    this._tq.push([text, soft]);
    if (!this._tqBusy) this._toastNext();
  },
  _toastNext() {
    const it = this._tq.shift();
    if (!it) { this._tqBusy = false; return; }
    this._tqBusy = true;
    const el = document.createElement("div"); el.className = "toast" + (it[1] ? " soft" : ""); el.textContent = it[0];
    $("toasts").appendChild(el); setTimeout(() => el.remove(), 2700);
    setTimeout(() => this._toastNext(), 1100);
  },
  showNote(text) {
    $("noteTxt").textContent = text; const n = $("note"); n.hidden = false;
    n.style.animation = "none"; void n.offsetWidth; n.style.animation = "";
    clearTimeout(this._noteT);
    this._noteT = setTimeout(() => this.hideNote(), 6000 + text.length * 55);
    AU.tok();
  },
  hideNote() { $("note").hidden = true; clearTimeout(this._noteT); },
  noteOpen() { return !$("note").hidden; },
  // ---------- title ----------
  showTitle() {
    $("scrTitle").hidden = false;
    this.refreshTitle();
  },
  refreshTitle() {
    const b = $("tContB"), s = $("tContS");
    if (!SAVE.ready) { b.textContent = "Ищу сохранение…"; s.textContent = "секунду"; }
    else if (S.cur) { b.textContent = "Продолжить мойку"; s.textContent = S.cur.title || "ковёр ждёт на полу"; }
    else if (S.next >= ORDERS.length) { b.textContent = "Быстрый заказ"; s.textContent = "история пройдена, заказы идут"; }
    else if (S.next > 0 || S.started) { const o = ORDERS[S.next]; b.textContent = "Продолжить"; s.textContent = `Заказ № ${S.next + 1} · ${o.title}`; }
    else { b.textContent = "Открыть мастерскую"; s.textContent = "первый заказ ждёт"; }
    $("tShopS").textContent = fmtMoney(S.money);
    $("tSound").innerHTML = icon(AU.on ? "sound" : "mute");
    const dk = dayKey(), dr = S.daily && S.daily[dk];
    $("tDaily").disabled = S.next < 1;
    $("tDaily").querySelector("small").textContent = S.next < 1 ? "после первого заказа" : dr ? "рекорд " + fmtKg(dr.kg) : "новый ковёр каждый день";
    const fo = fleaOpen(), wl = (S.wall || []).length, sk = (S.stock || []).length;
    $("tMarket").disabled = !fo;
    $("tMarketS").textContent = !fo ? "после третьего заказа" : S.fleaPending ? "ковёр ждёт решения" : sk ? `куплено: ${sk}` : wl ? `на стене: ${wl}` : "ковры на продажу";
    $("tQuick").disabled = S.next < 1;
    $("tQuick").querySelector("small").textContent = S.next < 1 ? "после первого заказа" : "на 5 минут";
  },
  hideTitle() { $("scrTitle").hidden = true; },
  // ---------- ticket ----------
  ticket(o, onAccept, onBack) {
    const w = $("scrTicket"), p = $("ticket");
    const no = o.special ? "особый" : o.kind === "story" ? String(orderIndex(o.id) + 1).padStart(4, "0") : o.kind === "quick" ? "срочн." : o.kind === "daily" ? "дня" : o.kind === "flea" ? "рынок" : "свой";
    const sz = `${o.rug.widthM.toFixed(1).replace(".", ",")} × ${(o.rug.widthM * o.rug.kh / o.rug.kw).toFixed(1).replace(".", ",")} м`;
    const thumb = rugThumb(o.rug);
    p.innerHTML = `
      <div class="ph"><span>Квитанция</span><b>${o.special ? "Особый заказ" : o.kind === "daily" ? "Заказ дня" : o.kind === "flea" ? "Покупка с рынка" : "№ " + no}</b></div>
      ${thumb ? `<img class="thumb" src="${thumb}" alt="">` : ""}
      <h3>${o.title}</h3>
      <div class="fld"><span>${o.kind === "flea" ? "Продавец" : "Заказчик"}</span><p>${o.client}${o.who ? ", " + o.who : ""}</p></div>
      <div class="fld"><span>${o.kind === "flea" ? "История ковра" : "Что случилось"}</span><p>${o.story}</p></div>
      ${o.wish ? `<div class="fld"><span>Пожелание</span><p>${o.wish}</p></div>` : ""}
      <div class="facts"><span>Размер: <b>${sz}</b></span>${o.price ? `<span>Оплата: <b>до ${fmtMoney(o.price * 1.15)}</b></span>` : ""}${o.kind === "flea" ? `<span>Куплен за <b>${fmtMoney(o.buy)}</b></span><span>Чистым уйдёт до <b>${fmtMoney(o.value)}</b></span>` : ""}${o.delicate ? "<span><b>Шёлк, бережно</b></span>" : ""}${o.bleedy ? "<span><b>Краска линяет</b></span>" : ""}${o.strict ? "<span><b>Строгая приёмка</b></span>" : ""}${o.dirt && o.dirt.moth ? "<span><b>Побит молью</b></span>" : ""}${o.dirt && o.dirt.fray ? "<span><b>Обтрёпан край</b></span>" : ""}${o.dirt && o.dirt.wear ? "<span><b>Потёртости</b></span>" : ""}${o.kind === "daily" && S.daily && S.daily[o.daily] ? `<span>Рекорд дня: <b>${fmtKg(S.daily[o.daily].kg)}</b></span>` : ""}</div>
      ${o.kind === "story" && S.stars[o.id] ? `<div class="stamp-mark">Мыт ${starsHtml(S.stars[o.id])}</div>` : ""}
      <div class="acts"><button class="btn-ink alt" id="tkBack">Назад</button><button class="btn-ink" id="tkGo">${o.kind === "flea" ? "Мыть" : "Принять ковёр"}</button></div>`;
    w.hidden = false;
    $("tkGo").onclick = () => { AU.tok(); w.hidden = true; onAccept(); };
    $("tkBack").onclick = () => { AU.tok(); w.hidden = true; onBack && onBack(); };
  },
  chapter(ch, onGo) {
    const names = ["Глава первая", "Глава вторая", "Глава третья", "Глава четвёртая"];
    $("chN").textContent = names[ch.id - 1] || "Эпилог";
    $("chT").textContent = ch.title;
    $("chTxt").innerHTML = ch.intro.map((t, i) => `<p style="animation-delay:${0.3 + i * 0.9}s">${t}</p>`).join("");
    const s = $("scrChapter"); s.hidden = false;
    $("chGo").onclick = () => { AU.tok(); s.hidden = true; onGo(); };
  },
  // ---------- pause ----------
  openPause() {
    G.paused = true; strokeEnd();
    $("volMusic").value = Math.round(AU.vol.music * 100); $("volMusicO").textContent = $("volMusic").value;
    $("volSfx").value = Math.round(AU.vol.sfx * 100); $("volSfxO").textContent = $("volSfx").value;
    $("pRestart").hidden = !(G.order && G.scr === "play");
    $("pauseWrap").hidden = false;
  },
  closePause() { $("pauseWrap").hidden = true; G.paused = false; },
  ask(title, text, yes, onYes, no) {
    const c = $("confirm");
    c.innerHTML = `<h2>${title}</h2><p style="margin:0 0 14px;text-align:center;color:var(--ink2);font-size:14px;line-height:1.5">${text}</p><div class="stack"><button class="plaque sm main" id="cfYes"><span class="pt"><b>${yes}</b></span></button><button class="plaque sm" id="cfNo"><span class="pt"><b>${no || "Отмена"}</b></span></button></div>`;
    $("confirmWrap").hidden = false;
    const close = () => { $("confirmWrap").hidden = true; };
    $("cfYes").onclick = () => { AU.tok(); close(); onYes(); };
    $("cfNo").onclick = () => { AU.tok(); close(); };
    $("confirmScrim").onclick = close;
  },
  confirmFinish(d, onYes, onNo) {
    const c = $("confirm");
    const th = thresholds();
    const pct = Math.round(d.score);
    let verdict;
    if (d.free) verdict = `Чистота ${pct}%`;
    else if (d.stars >= 1) verdict = `<b style="font-size:22px">${pct}%</b> ${starsHtml(d.stars)}`;
    else verdict = `Сейчас ${pct}%. Заказчик ждёт хотя бы ${th[0]}%.`;
    const next = !d.free && d.stars >= 1 && d.stars < 3 ? `<p style="margin:4px 0 0;text-align:center;font-size:12.5px;color:var(--ink2)">${d.stars + 1 === 2 ? "Две" : "Три"} звезды с ${th[d.stars]}%</p>` : "";
    const sub = `<p style="margin:6px 0 0;text-align:center;font-size:12.5px;color:var(--ink2)">${d.rep && d.rep.length ? "Столько и покажет квитанция, когда ремонт будет закончен." : "Столько и покажет квитанция: отжим и сушка оценку сохраняют."}</p>`;
    const left = d.left.length ? `<p style="margin:8px 0 0;font-size:13.5px;color:var(--ink2);line-height:1.5">Оценку снижают: ${d.left.join(", ")}.</p>` : `<p style="margin:8px 0 0;font-size:13.5px;color:var(--ok)">Ковёр чистый, можно сдавать.</p>`;
    const rep = d.rep && d.rep.length ? `<p style="margin:6px 0 0;font-size:13px;color:var(--ink2);line-height:1.45">После сушки ремонт: ${d.rep.join(", ")}.</p>` : "";
    const canGo = d.free || d.stars >= 1 || pct >= th[0];
    c.innerHTML = `<h2>Сдать ковёр?</h2><div style="text-align:center;font-size:15px;display:flex;gap:8px;align-items:center;justify-content:center">${verdict}</div>${next}${left}${rep}${sub}
      <div class="stack" style="margin-top:14px">${canGo ? `<button class="plaque sm main" id="cfYes"><span class="pt"><b>Отжать и сушить</b><small>дальше отжим, сушка, весы, приёмка</small></span></button>` : ""}
      <button class="plaque sm${canGo ? "" : " main"}" id="cfNo"><span class="pt"><b>Мыть дальше</b></span></button></div>`;
    $("confirmWrap").hidden = false;
    const close = () => { $("confirmWrap").hidden = true; };
    if (canGo) $("cfYes").onclick = () => { AU.tok(); close(); onYes(); };
    $("cfNo").onclick = () => { AU.tok(); close(); onNo(); };
    $("confirmScrim").onclick = close;
  },
  // ---------- sheets ----------
  openSheet(title, html) { $("sheetT").textContent = title; $("sheetB").innerHTML = html; $("sheet").hidden = false; $("sheetB").scrollTop = 0; G.sheetOpen = true; },
  closeSheet() { $("sheet").hidden = true; G.sheetOpen = false; if (G.scr === "title") this.refreshTitle(); },
  openBook() {
    let h = '<div class="book">';
    for (const k of Object.keys(NOTES)) {
      if (S.notes[k] || k === "intro") h += `<div class="ent"><h4>${NOTE_TITLES[k]}</h4><p>${NOTES[k]}</p></div>`;
      else h += `<div class="ent"><div class="locked">Страница впереди</div></div>`;
    }
    h += "</div>";
    this.openSheet("Тетрадь деда", h);
  },
  openShop() {
    let h = `<div class="shop-top"><span style="color:var(--ink2);font-size:13px">Михалыч торгует в соседнем гараже</span><span class="bal">${fmtMoney(S.money)}</span></div>`;
    for (const it of SHOP) {
      const own = S.owned[it.id];
      const needOk = !it.need || S.owned[it.need];
      const can = !own && needOk && S.money >= it.price;
      h += `<div class="item"><div class="ic">${icon(it.icon)}</div><div><b>${it.name}</b><p>${it.desc}</p>${own ? `<span class="own">Куплено</span>` : `<button class="buy" data-id="${it.id}" ${can ? "" : "disabled"}>${fmtMoney(it.price)}</button>`}</div></div>`;
    }
    this.openSheet("Лавка Михалыча", h);
    for (const b of $("sheetB").querySelectorAll(".buy")) b.onclick = () => { buyItem(b.dataset.id); this.openShop(); };
  },
  openJournal(tab) {
    tab = tab || this._jTab || "orders"; this._jTab = tab;
    let h = `<div class="seg jtabs"><button data-t="orders" class="${tab === "orders" ? "on" : ""}">${icon("book")}Заказы</button><button data-t="album" class="${tab === "album" ? "on" : ""}">${icon("album")}Альбом</button><button data-t="ach" class="${tab === "ach" ? "on" : ""}">${icon("star")}Награды</button></div>`;
    if (tab === "album") return this.openAlbum(h);
    if (tab === "ach") return this.openAwards(h);
    for (const ch of CHAPTERS) {
      h += `<div class="chap"><h3><small>Глава ${ch.id}</small>${ch.title}</h3><div class="ords">`;
      ORDERS.filter((o) => o.ch === ch.id).forEach((o) => {
        const idx = orderIndex(o.id);
        const open = idx <= S.next;
        const st = S.stars[o.id] || 0;
        const th = open ? rugThumb(o.rug) : null;
        h += `<button class="ord${open ? "" : " locked"}" data-id="${o.id}" ${open ? "" : "disabled"}>${th ? `<img src="${th}" alt="">` : `<span class="ph0"></span>`}<span><b>${open ? o.title : "Заказ откроется позже"}</b><small>${open ? o.client : "&nbsp;"}</small></span>${open ? (st ? starsHtml(st) : `<small style="color:var(--brass2)">новый</small>`) : ""}</button>`;
      });
      h += "</div></div>";
    }
    h += `<div class="chap"><h3><small>Вне очереди</small>Особые заказы</h3><div class="ords">`;
    for (const o of SPECIAL) {
      const open = S.next > o.unlock;
      const st = S.stars[o.id] || 0;
      const th = open ? rugThumb(o.rug) : null;
      h += `<button class="ord${open ? "" : " locked"}" data-id="${o.id}" ${open ? "" : "disabled"}>${th ? `<img src="${th}" alt="">` : `<span class="ph0"></span>`}<span><b>${open ? o.title : "Откроется после заказа № " + (o.unlock + 1)}</b><small>${open ? o.client : "&nbsp;"}</small></span>${open ? (st ? starsHtml(st) : `<small style="color:var(--brass2)">новый</small>`) : ""}</button>`;
    }
    h += "</div></div>";
    h += `<p style="color:var(--ink3);font-size:12.5px;text-align:center;margin-top:4px">Быстрых заказов выполнено: ${S.quickCount || 0}. Всего заработано: ${fmtMoney(S.earned || 0)}${S.kgOut >= 0.05 ? `. Грязи вынесено: ${fmtKg(S.kgOut)}` : ""}</p>`;
    this.openSheet("Журнал заказов", h);
    for (const b of $("sheetB").querySelectorAll(".ord")) b.onclick = () => { AU.tok(); this.closeSheet(); beginStory(b.dataset.id); };
    this._jTabs();
  },
  _jTabs() { for (const b of $("sheetB").querySelectorAll(".jtabs button")) b.onclick = () => { AU.tok(); this.openJournal(b.dataset.t); }; },
  openAwards(h) {
    const got = S.ach || {};
    const n = ACH.filter((a) => got[a.id]).length;
    h += `<div class="alb-top"><span>Награды: <b>${n} из ${ACH.length}</b></span>${S.dailyStreak && S.dailyStreak.n > 1 ? `<span>Заказ дня подряд: <b>${S.dailyStreak.n}</b></span>` : ""}</div><div class="awards">`;
    for (const a of ACH) h += `<div class="aw${got[a.id] ? " got" : ""}"><span class="medal">${icon(a.icon)}</span><span><b>${a.name}</b><small>${a.desc}</small></span></div>`;
    h += `</div>`;
    this.openSheet("Журнал заказов", h);
    this._jTabs();
  },
  openAlbum(h) {
    const A = S.album || [];
    const kg = S.kgOut || 0;
    h += `<div class="alb-top"><span>Отмыто ковров: <b>${A.length}</b></span><span>Грязи вынесено: <b>${fmtKg(kg)}</b></span></div>`;
    if (!A.length) h += `<p class="alb-empty">Здесь появятся ковры после приёмки: каким пришёл, каким ушёл и сколько грязи из него вынесли.</p>`;
    h += `<div class="alb">`;
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    for (const e of A) {
      const th = rugThumb(e.rug);
      const d = new Date(e.date);
      const k = clamp(e.dirt * 1.6, 0.2, 0.8);
      h += `<div class="alb-c"><div class="alb-img">${th ? `<img src="${th}" alt="">` : ""}<i class="alb-dirt" style="opacity:${k.toFixed(2)}"></i><i class="alb-line"></i></div>
        <b>${e.title}</b><small>${e.client ? e.client + " · " : ""}${d.getDate()}&nbsp;${months[d.getMonth()]}</small>
        <div class="alb-f"><span class="kg">${e.kg >= 0.01 ? "−" + fmtKg(e.kg) : "±0"}</span>${e.stars > 0 ? starsHtml(e.stars) : `<span class="pc">${e.score}%</span>`}</div></div>`;
    }
    h += `</div>`;
    this.openSheet("Журнал заказов", h);
    this._jTabs();
  },
  openFree() {
    const styles = Object.keys(STYLE_DIMS).filter((s) => s !== "grandpa" || S.next >= ORDERS.length);
    const st = this._free || (this._free = { style: "kazak", level: 1, stains: true, hair: false, confetti: false, loc: "workshop" });
    let h = `<div class="lbl2">Ковёр</div><div class="grid-rugs" style="margin-top:8px">`;
    for (const s of styles) {
      const dm = STYLE_DIMS[s];
      const th = rugThumb({ style: s, kw: dm[0], kh: dm[1], ppk: dm[2], seed: 7 });
      h += `<button class="rugpick${st.style === s ? " sel" : ""}" data-s="${s}"><img src="${th}" alt="">${STYLE_NAMES[s]}</button>`;
    }
    h += `</div><div class="lbl2" style="margin-top:16px">Сколько грязи</div><div class="seg" id="fLvl">${["Лёгкая", "Средняя", "Сильная"].map((n, i) => `<button data-v="${i}" class="${st.level === i ? "on" : ""}">${n}</button>`).join("")}</div>
      <div class="lbl2">Что ещё</div><div class="seg" id="fExtra"><button data-k="stains" class="${st.stains ? "on" : ""}">Пятна</button><button data-k="hair" class="${st.hair ? "on" : ""}">Шерсть</button><button data-k="confetti" class="${st.confetti ? "on" : ""}">Конфетти</button></div>
      <div class="lbl2">Где мыть</div><div class="seg" id="fLoc">${Object.keys(LOC_NAMES).map((k) => `<button data-v="${k}" class="${st.loc === k ? "on" : ""}">${LOC_NAMES[k]}</button>`).join("")}</div>
      <button class="plaque main" id="fGo" style="margin-top:10px;width:100%"><span class="pt"><b>Разложить ковёр</b><small>все инструменты под рукой</small></span>${icon("arrow")}</button>`;
    this.openSheet("Свободная мойка", h);
    const B = $("sheetB");
    for (const b of B.querySelectorAll(".rugpick")) b.onclick = () => { st.style = b.dataset.s; AU.tok(); this.openFree(); };
    for (const b of B.querySelectorAll("#fLvl button")) b.onclick = () => { st.level = +b.dataset.v; AU.tok(); this.openFree(); };
    for (const b of B.querySelectorAll("#fExtra button")) b.onclick = () => { st[b.dataset.k] = !st[b.dataset.k]; AU.tok(); this.openFree(); };
    for (const b of B.querySelectorAll("#fLoc button")) b.onclick = () => { st.loc = b.dataset.v; AU.tok(); this.openFree(); };
    $("fGo").onclick = () => { AU.tok(); this.closeSheet(); beginFree(st); };
  },
  // ---------- finish ----------
  enterFinish() {
    this.showHud(false);
    $("scrFinish").hidden = false; this.finishBottom(""); this.finishCap("");
  },
  finishSteps(steps, i) {
    const names = { spin: "Отжим", dry: "Сушка", repair: "Ремонт", comb: "Бахрома", scale: "Весы", result: "Приёмка" };
    $("fSteps").innerHTML = steps.map((s, k) => `<span class="${k === i ? "on" : k < i ? "done" : ""}">${names[s]}</span>`).join("");
    $("fSteps").classList.toggle("many", steps.length > 5);
    this.finishBottom(""); this.finishCap("");
  },
  finishBottom(html) { const b = $("fBottom"); b.innerHTML = html; b.hidden = !html; },
  finishToolOn(t) { for (const q of $("fBottom").querySelectorAll(".ftool")) q.classList.toggle("on", q.dataset.t === t); },
  // drying room: two fan switches and a hygrometer between them
  dryTools() {
    this.finishBottom(`<button class="ftool" data-f="0">${icon("fan")}<small>Слева</small></button><div class="hygro"><small>влажность</small><b id="hyg">100%</b><span><i id="hygBar"></i></span></div><button class="ftool" data-f="1">${icon("fan")}<small>Справа</small></button>`);
    for (const b of $("fBottom").querySelectorAll(".ftool")) b.onclick = () => dryToggle(+b.dataset.f);
  },
  dryFan(q, on) { const b = $("fBottom").querySelector(`.ftool[data-f="${q}"]`); if (b) b.classList.toggle("on", on); },
  dryHum(h) { const e = $("hyg"); if (!e) return; e.textContent = h + "%"; $("hygBar").style.transform = `scaleX(${(h / 100).toFixed(3)})`; },
  // finish step with a couple of hand tools and a done plaque
  finishTools(tools, cur, doneLabel, doneSub, onDone) {
    const names = { fbrush: "Щётка", comb: "Гребень", needle: "Игла", overcast: "Обмётка", dye: "Краска", tie: "Кисти" };
    const ic = { fbrush: "brush", comb: "comb", needle: "needle", overcast: "overcast", dye: "dye", tie: "tie" };
    this.finishBottom(`<div class="ftools">${tools.map((t) => `<button class="ftool${t === cur ? " on" : ""}" data-t="${t}">${icon(ic[t])}<small>${names[t]}</small></button>`).join("")}</div><button class="plaque main" id="combDone"><span class="pt"><b>${doneLabel}</b><small>${doneSub}</small></span>${icon("arrow")}</button>`);
    for (const b of $("fBottom").querySelectorAll(".ftool")) b.onclick = () => {
      AU.tok(); strokeEnd(); G.tool = b.dataset.t;
      for (const q of $("fBottom").querySelectorAll(".ftool")) q.classList.toggle("on", q === b);
    };
    $("combDone").onclick = onDone;
  },
  finishCap(text) { const c = $("fCap"); c.textContent = text; c.hidden = !text; },
  spinShow(v) {
    $("spinBox").hidden = !v;
    if (v) {
      const b = $("spinBtn");
      const down = (e) => { e.preventDefault(); G.finish.hold = true; b.classList.add("down"); AU.init(); };
      const up = () => { if (G.finish) G.finish.hold = false; b.classList.remove("down"); };
      b.onpointerdown = down; b.onpointerup = up; b.onpointercancel = up; b.onpointerleave = up;
      this.spinCap("Центрифуга выжмет воду из ворса. Держи кнопку");
      this._spinParts = [];
    }
  },
  spinCap(t) { $("spinCap").textContent = t; },
  spinDraw(f, dt) {
    const cv = $("spinCv"), x = cv.getContext("2d"), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    x.clearRect(0, 0, W, H);
    const R = W * 0.46;
    // drum body
    let g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#cfd5da"); g.addColorStop(0.7, "#8c949b"); g.addColorStop(1, "#4b5157");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    x.fillStyle = "#1f2327"; x.beginPath(); x.arc(cx, cy, R * 0.88, 0, TAU); x.fill();
    // rotating inner
    x.save(); x.translate(cx, cy); x.rotate(G.spin);
    const pal = G.rug.pal || [G.rug.fieldIdxColor || [150, 60, 50], [230, 220, 200], [60, 80, 120]];
    const wetK = f.water;
    // rolled rug as a spiral of pattern bands
    const turns = 7, steps = 420;
    x.lineCap = "round";
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1.3) / steps;
      const r0 = R * (0.2 + 0.64 * t0), r1 = R * (0.2 + 0.64 * t1);
      const a0 = t0 * turns * TAU, a1 = t1 * turns * TAU;
      const band = pal[(Math.floor(i / 9) * 3 + 1) % pal.length] || pal[0];
      const col = mixRGB(i % 9 < 6 ? pal[0] : band, [20, 14, 10], 0.15 + wetK * 0.35);
      x.strokeStyle = rgbCss(col); x.lineWidth = R * 0.075;
      x.beginPath(); x.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); x.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); x.stroke();
    }
    x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = R * 0.012;
    x.beginPath(); for (let i = 0; i <= steps; i++) { const t0 = i / steps, r0 = R * (0.2 + 0.64 * t0) + R * 0.045, a0 = t0 * turns * TAU; i ? x.lineTo(Math.cos(a0) * r0, Math.sin(a0) * r0) : x.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); } x.stroke();
    if (wetK > 0.02) { x.fillStyle = `rgba(120,170,210,${wetK * 0.18})`; x.beginPath(); x.arc(0, 0, R * 0.86, 0, TAU); x.fill(); }
    x.strokeStyle = "rgba(233,225,207,0.7)"; x.lineWidth = R * 0.012;
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24; x.beginPath(); x.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); x.lineTo(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84); x.globalAlpha = 0.12; x.stroke(); }
    x.globalAlpha = 1;
    // holes ring
    x.fillStyle = "#0e1012";
    for (let i = 0; i < 48; i++) { const a = i * TAU / 48; x.beginPath(); x.arc(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, R * 0.012, 0, TAU); x.fill(); }
    x.restore();
    // motion blur shine
    if (f.spd > 0.1) { x.strokeStyle = `rgba(255,255,255,${f.spd * 0.18})`; x.lineWidth = R * 0.1; x.beginPath(); x.arc(cx, cy, R * 0.6, G.spin * 0.3, G.spin * 0.3 + 1.2); x.stroke(); }
    // hub
    g = x.createRadialGradient(cx - R * 0.05, cy - R * 0.05, 0, cx, cy, R * 0.16); g.addColorStop(0, "#f2f4f6"); g.addColorStop(1, "#5d646b");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.15, 0, TAU); x.fill();
    // water particles
    const P = this._spinParts;
    if (f.spd > 0.2 && f.water > 0) for (let i = 0; i < Math.round(f.spd * 6 * Math.min(1, f.water * 3)); i++) { const a = Math.random() * TAU; P.push({ x: cx + Math.cos(a) * R * 0.9, y: cy + Math.sin(a) * R * 0.9, vx: -Math.sin(a) * 300 * f.spd + Math.cos(a) * 120, vy: Math.cos(a) * 300 * f.spd + Math.sin(a) * 120, t: 0 }); }
    x.fillStyle = "rgba(170,205,230,0.85)";
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > 0.6) { P.splice(i, 1); continue; } x.globalAlpha = 1 - p.t / 0.6; x.beginPath(); x.arc(p.x, p.y, 4, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
    $("spinMeter").style.transform = `scaleX(${f.water.toFixed(3)})`;
  },
  // ---------- result ----------
  showResult(r) {
    $("scrFinish").hidden = true;
    const el = $("scrResult"); el.hidden = false;
    const rc = $("rcpt");
    rc.classList.remove("min");
    const th = thresholds();
    let notes = [];
    if (r.residue > 0.03) notes.push("в ворсе осталось мыло");
    if (r.damage > 0.01) notes.push("ворс примят");
    if (r.bleed > 0.01) notes.push("краска слегка поплыла");
    if (r.holes) notes.push(r.holes > 1 ? "остались дырки от моли" : "осталась дырка от моли");
    if (r.fray) notes.push("край обтрёпан");
    if (r.wear) notes.push("видна потёртость");
    if (r.gone) notes.push("в бахроме пропуски");
    if (r.yellow) notes.push("бахрома желтоватая");
    const starsRow = r.free ? "" : `<div class="rstars">${[0, 1, 2].map((i) => `<svg viewBox="0 0 24 24" class="${i < r.stars ? "pop" : "off"}" style="animation-delay:${0.5 + i * 0.35}s">${ICONS.star}</svg>`).join("")}</div>`;
    rc.innerHTML = `<div class="top"><div class="big">${Math.round(r.score)}<small>% чистоты</small></div>${starsRow}</div>
      ${r.react ? `<div class="quote">«${r.react}»<span>${r.client}</span></div>` : ""}
      ${notes.length ? `<div style="font-size:12.5px;color:#7a5e44;margin-top:4px">Приёмщик заметил: ${notes.join(", ")}.</div>` : ""}
      ${r.wIn && r.wOut ? `<div class="pay wt"><span>Весы: ${fmtKg(r.wIn, false)} → ${fmtKg(r.wOut)}</span><b>${r.wIn - r.wOut >= 0.01 ? "−" + fmtKg(r.wIn - r.wOut) : "±0"}</b></div>` : ""}
      ${r.daily ? `<div class="pay wt"><span>Рекорд дня${r.daily.streak > 1 ? ` · дней подряд: ${r.daily.streak}` : ""}</span><b>${fmtKg(r.daily.kg)}${r.daily.isNew ? " · новый!" : ""}</b></div>` : ""}
      ${r.flea ? `<div id="rcFlea">${UI._pendingHtml(r.flea, true)}</div>` : r.free ? "" : `<div class="pay"><span>Оплата за работу</span><b>${r.pay ? "+" + fmtMoney(r.pay) : "подарок"}</b></div>`}
      <div class="acts" id="rcActs"></div>`;
    const acts = $("rcActs");
    const addBtn = (label, main, fn) => { const b = document.createElement("button"); b.className = "btn-ink" + (main ? "" : " alt"); b.textContent = label; b.onclick = () => { AU.tok(); fn(); }; acts.appendChild(b); };
    if (r.finale) addBtn("Что было дальше", true, () => { el.hidden = true; showEpilogue(); });
    else if (G.order.kind === "story" && S.next < ORDERS.length) { addBtn("Меню", false, () => { el.hidden = true; goTitle(); }); addBtn("Следующий заказ", true, () => { el.hidden = true; beginStory(ORDERS[S.next].id); }); }
    else if (G.order.kind === "quick") { addBtn("Меню", false, () => { el.hidden = true; goTitle(); }); addBtn("Ещё заказ", true, () => { el.hidden = true; beginQuick(); }); }
    else if (G.order.kind === "daily") { addBtn("Меню", false, () => { el.hidden = true; goTitle(); }); addBtn("Ещё раз", true, () => { el.hidden = true; beginDaily(); }); }
    else if (G.order.kind === "flea") { addBtn("Меню", false, () => { el.hidden = true; goTitle(); }); addBtn("Барахолка", !S.fleaPending, () => { el.hidden = true; goTitle(); UI.openMarket(S.fleaPending || !(S.wall || []).length ? "stall" : "wall"); }); }
    else { addBtn("Меню", false, () => { el.hidden = true; goTitle(); }); addBtn(G.order.kind === "free" ? "Другой ковёр" : "В журнал", true, () => { el.hidden = true; goTitle(); G.order && G.order.kind === "free" ? UI.openFree() : UI.openJournal(); }); }
    if (!r.free) for (let i = 0; i < r.stars; i++) setTimeout(() => AU.bell(880 * Math.pow(1.26, i), 0.08), 500 + i * 350);
    if (r.flea) {
      const done = (txt) => { $("rcFlea").innerHTML = `<div class="pay"><span>${txt}</span><b>${fmtMoney(r.flea.sale)}</b></div>`; setTimeout(fitResult, 30); };
      $("fpSell").onclick = (e) => { e.stopPropagation(); AU.tok(); fleaSell(); done("Продан покупателю"); };
      $("fpHang").onclick = (e) => { e.stopPropagation(); AU.tok(); if (fleaHang()) done("Висит на стене, стоит"); };
    }
    rc.onclick = (e) => { if (e.target.closest("button")) return; rc.classList.toggle("min"); setTimeout(fitResult, 30); };
    this.placeCmp();
    setTimeout(fitResult, 700);
    const tb = $("tlBtn");
    tb.innerHTML = `${icon("play")}<span>Таймлапс</span>`;
    tb.hidden = !(G.tl && G.tl.frames.length >= 3);
    tb.onclick = () => { AU.tok(); tlStart(); };
  },
  tlMode(on) {
    const rc = $("rcpt");
    for (const id of ["cmpBar", "lblBefore", "lblAfter", "tlBtn"]) { const e = $(id); if (e) e.style.visibility = on ? "hidden" : ""; }
    $("tlClock").hidden = !on;
    if (on) { rc.classList.add("min"); this.tlClock("0:00", 0); }
    else if (rc) { rc.classList.remove("min"); this.placeCmp(); }
    setTimeout(fitResult, 30);
  },
  tlClock(txt, k) { $("tlTime").textContent = txt; $("tlBar").style.transform = `scaleX(${k.toFixed(3)})`; },
  placeCmp() {
    const x = (G.split == null ? 0.5 : G.split) * G.cssW;
    $("cmpBar").style.left = x + "px";
  },
};

// ---------- thumbnails ----------
const THUMBS = {};
function rugThumb(def) {
  const key = def.style + ":" + def.seed + ":" + def.kw + "x" + def.kh;
  if (THUMBS[key]) return THUMBS[key];
  try {
    const small = Object.assign({}, def, { ppk: Math.max(1, Math.round(160 / def.kw)), widthM: def.widthM || 1 });
    const r = buildRug(small);
    const c = document.createElement("canvas"); const w = 120, h = Math.round(120 * r.H / r.W);
    c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = "#1a1310"; x.fillRect(0, 0, w, h); x.drawImage(r.canvas, 0, 0, w, h);
    THUMBS[key] = c.toDataURL("image/jpeg", 0.82);
  } catch (e) { THUMBS[key] = ""; }
  return THUMBS[key];
}
