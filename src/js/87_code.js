// ===== Save code: the whole career as a line of text to keep in notes or a chat =====
const CODE_PREFIX = "KOVRY1-";
async function makeSaveCode() {
  const c = JSON.parse(careerJSON());
  c.cur = null; delete c.flea;
  const u = new TextEncoder().encode(JSON.stringify(c));
  const z = await deflateU8(u);
  return CODE_PREFIX + (z ? "z" : "p") + u8ToB64(z || u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function readSaveCode(txt) {
  const m = String(txt || "").replace(/\s+/g, "").match(/KOVRY1-([zp])([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    let b = m[2].replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    let u = b64ToU8(b);
    if (m[1] === "z") { u = await inflateU8(u); if (!u) return null; }
    const o = JSON.parse(new TextDecoder().decode(u));
    return o && typeof o === "object" && typeof o.next === "number" ? o : null;
  } catch (e) { return null; }
}
function applySaveCode(o) {
  const settings = S.settings;
  S = sanitize(o); S.cur = null; S.settings = settings; S.codeN = 0;
  SAVE.curCache = null; lsDel(LS_CUR);
  applyUpgrades(); applySettings();
  G.saveDirty = true; saveNow(true);
}
function codeSaved() { S.codeN = 0; G.saveDirty = true; saveNow(false); }
// a guest keeps progress in the browser only: every third receipt reminds about the code
function codeReminder() {
  if (!window.KOVRY_GUEST) return;
  S.codeN = (S.codeN || 0) + 1;
  if (S.codeN % 3 === 0) setTimeout(() => UI.toast("Прогресс живёт в этом браузере. Код сохранения лежит в меню", true), 3800);
}

Object.assign(UI, {
  async openCode() {
    const code = await makeSaveCode();
    const guest = !!window.KOVRY_GUEST;
    const h = `<p class="sc-p">${guest ? "Прогресс хранится в памяти этого браузера." : "Прогресс хранится в облаке и в браузере."} Код сохранения держит деньги, звёзды, покупки, альбом, стену и награды. Скопируй его в заметки или отправь себе в мессенджер. После сброса браузера или на другом телефоне вставь код сюда.</p>
      <div class="lbl2">Твой код</div>
      <textarea class="sc-t" id="scOut" rows="4" spellcheck="false">${code}</textarea>
      <div class="sc-acts"><button class="btn-sc main" id="scCopy">${icon("copy")}Скопировать</button>${navigator.share ? `<button class="btn-sc" id="scShare">${icon("share")}Отправить</button>` : ""}</div>
      <div class="lbl2" style="margin-top:18px">Загрузить из кода</div>
      <textarea class="sc-t" id="scIn" rows="3" spellcheck="false" placeholder="Вставь сюда код KOVRY1-…"></textarea>
      <div class="sc-acts"><button class="btn-sc" id="scLoad">${icon("arrow")}Загрузить прогресс</button></div>
      <p class="sc-note">В код попадает всё сданное. Ковёр, который лежит на полу мастерской, после загрузки начнётся заново.</p>`;
    this.openSheet("Код сохранения", h);
    const out = $("scOut");
    const pick = () => { out.focus(); out.select(); out.setSelectionRange(0, code.length); };
    $("scCopy").onclick = async () => {
      AU.tok();
      let ok = false;
      try { await navigator.clipboard.writeText(code); ok = true; } catch (e) {}
      if (!ok) { pick(); try { ok = document.execCommand("copy"); } catch (e) {} }
      if (ok) { this.toast("Код скопирован"); codeSaved(); } else { pick(); this.toast("Код выделен: удержи палец и нажми «Скопировать»"); codeSaved(); }
    };
    if ($("scShare")) $("scShare").onclick = async () => {
      AU.tok();
      try { await navigator.share({ title: "Дедова ковромойка", text: code }); codeSaved(); }
      catch (e) { if (e && e.name !== "AbortError") { pick(); this.toast("Код выделен: удержи палец и нажми «Скопировать»"); } }
    };
    $("scLoad").onclick = async () => {
      AU.tok();
      const o = await readSaveCode($("scIn").value);
      if (!o) { this.toast("Код с ошибкой. Скопируй его целиком и вставь ещё раз"); return; }
      const where = o.next >= ORDERS.length ? "история пройдена" : `заказ № ${o.next + 1}`;
      this.ask("Загрузить прогресс?", `В коде: ${where}, ${fmtMoney(o.money || 0)}, ковров в альбоме: ${(o.album || []).length}. Прогресс в этом браузере заменится.`, "Загрузить", () => {
        this.closeSheet(); this.closePause();
        if (G.scr !== "title") goTitle();
        applySaveCode(o);
        this.refreshTitle();
        this.toast("Прогресс загружен");
      });
    };
  },
});
$("pCode").onclick = () => { AU.tok(); UI.openCode(); };
$("pCode").hidden = !window.KOVRY_GUEST;
