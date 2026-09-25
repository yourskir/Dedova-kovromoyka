// ===== Restoration: frayed edges, worn spots, missing tassels =====
// generation, called from Sim.generate
Sim.prototype.genRestore = function (lvl, rnd) {
  const gw = this.gw, gh = this.gh, by0 = this.by0, bh = this.by1 - this.by0;
  this.Wr = this.Wr || new Float32Array(this.n);
  this.wears = []; this.fray = [];
  if (lvl.wear) {
    for (let q = 0; q < (lvl.wear.n || 1); q++) {
      const cx = gw * (0.2 + rnd() * 0.6), cy = by0 + bh * (0.15 + rnd() * 0.7);
      const r = (lvl.wear.size || 0.1) * this.cpm * (0.8 + rnd() * 0.5), amt = 0.75 + rnd() * 0.2, s2 = rnd() * 1000;
      for (let j = Math.floor(cy - r * 1.6); j <= cy + r * 1.6; j++) for (let i = Math.floor(cx - r * 1.6); i <= cx + r * 1.6; i++) {
        if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
        const k = j * gw + i; if (this.mask[k] !== 1) continue;
        const d = Math.hypot((i - cx) / 1.3, j - cy) / r + (fbm2(i * 0.2, j * 0.2, s2, 3) - 0.5) * 0.7;
        if (d > 1) continue;
        this.Wr[k] = Math.max(this.Wr[k], amt * smooth(1, 0.35, d));
      }
      this.wears.push({ x: cx, y: cy, r: r * 1.7 });
    }
    for (const w of this.wears) w.init = this.wearSum(w) || 1;
  }
  if (lvl.fray) {
    for (let q = 0; q < (lvl.fray.n || 1); q++) {
      const len = (lvl.fray.len || 0.3) * this.cpm * (0.75 + rnd() * 0.5);
      const j0 = by0 + 2 + rnd() * Math.max(1, bh - len - 4);
      const n = Math.max(5, Math.round(len / (0.025 * this.cpm)));
      this.fray.push({ side: rnd() < 0.5 ? 0 : 1, j0, j1: j0 + len, n, prog: new Float32Array(n), seed: rnd() * 1000 });
    }
  }
};
Sim.prototype.wearSum = function (w) { let s = 0; this._circle(w.x, w.y, w.r, (k) => { s += this.Wr[k]; }); return s; };
Sim.prototype.wearLeft = function (w) { return this.wearSum(w) / (w.init || 1); };
Sim.prototype.frayLeft = function (f) { let s = 0; for (const v of f.prog) if (v < 1) s++; return s / f.n; };
// dye pen: colour soaks back into the worn pile
Sim.prototype.dye = function (x, y, dt) {
  const r = 0.045 * this.cpm; let got = 0;
  this._circle(x, y, r, (k, f) => { if (this.Wr[k] > 0) { const q = Math.min(this.Wr[k], dt * 1.9 * (UPG.repairK || 1) * (0.3 + f)); this.Wr[k] -= q; got += q; } });
  return got;
};
// overcasting: wool wraps the frayed edge stitch by stitch
Sim.prototype.overcast = function (x, y, dt) {
  const r = 0.04 * this.cpm; let got = 0, done = 0;
  for (const f of this.fray) {
    const ex = f.side ? this.gw : 0;
    if (Math.abs(x - ex) > r * 2.2) continue;
    const ul = (f.j1 - f.j0) / f.n;
    for (let u = 0; u < f.n; u++) {
      if (f.prog[u] >= 1) continue;
      const yc = f.j0 + (u + 0.5) * ul, dd = Math.abs(yc - y);
      if (dd > r * 1.4) continue;
      f.prog[u] = Math.min(1, f.prog[u] + dt * 5.5 * (UPG.repairK || 1) * (1.2 - dd / (r * 1.4)));
      got += dt;
      if (f.prog[u] >= 1) done++;
    }
  }
  if (done) G.edgeDirty = true;
  return { got, done };
};
// new tassels tied into the gaps of the fringe
Sim.prototype.tieFringe = function (x, y) {
  const rug = this.rug; if (!rug.fr) return 0;
  const r = TOOLDEF.comb.w * this.cpm / 2, pxPerCell = rug.W / this.gw;
  let n = 0;
  for (const s of rug.strands) {
    if (!s.gone) continue;
    const sx = s.x / pxPerCell, sy = s.side === 0 ? this.by0 * 0.5 : (this.by1 + this.gh) * 0.5;
    if (Math.abs(sx - x) < r * 0.6 && Math.abs(sy - y) < this.by0 * 0.8 + 2) { s.gone = false; s.grow = 0; s.tang = 0; s.ang = 0; s.curl = 0; s.yel = 0; n++; }
  }
  return n;
};

// rug canvas: frayed edge strips and overcast stitches
function paintFray(rug, sim) {
  if (!sim.fray || !sim.fray.length) return;
  const ctx = rug.ctx, ppk = rug.ppk, sy = rug.H / sim.gh, bind = hexRGB(rug.st.bind || "#5a3a2a");
  const sw = Math.max(2, Math.round(ppk * 1.05));
  for (const f of sim.fray) {
    const x0 = f.side ? rug.W - sw : 0;
    const ul = (f.j1 - f.j0) / f.n;
    const rnd = mulberry(Math.floor(f.seed));
    for (let u = 0; u < f.n; u++) {
      const y0 = Math.floor((f.j0 + u * ul) * sy), y1 = Math.ceil((f.j0 + (u + 1) * ul) * sy);
      if (f.prog[u] >= 1) {
        ctx.fillStyle = rgbCss(bind); ctx.fillRect(x0, y0, sw, y1 - y0);
        ctx.strokeStyle = rgbCss(mixRGB(bind, [0, 0, 0], 0.35)); ctx.lineWidth = Math.max(1, ppk * 0.22);
        for (let y = y0 - sw; y < y1; y += Math.max(2, ppk * 0.45)) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + sw, y + sw * 0.7); ctx.stroke(); }
        ctx.strokeStyle = rgbCss(mixRGB(bind, [255, 255, 255], 0.3)); ctx.lineWidth = Math.max(0.6, ppk * 0.1);
        for (let y = y0 - sw; y < y1; y += Math.max(2, ppk * 0.45)) { ctx.beginPath(); ctx.moveTo(x0, y + 1); ctx.lineTo(x0 + sw, y + 1 + sw * 0.7); ctx.stroke(); }
      } else {
        // bare warp threads where the binding wore off
        ctx.fillStyle = "#2b221b"; ctx.fillRect(x0, y0, sw, y1 - y0);
        ctx.fillStyle = "#d8ccb0";
        for (let x = x0; x < x0 + sw; x += Math.max(2, ppk * 0.5)) ctx.fillRect(x, y0, Math.max(1, ppk * 0.22), y1 - y0);
        ctx.fillStyle = "rgba(216,204,176,0.7)";
        for (let q = 0; q < 3; q++) ctx.fillRect(f.side ? x0 - rnd() * ppk : x0 + sw, y0 + rnd() * (y1 - y0), Math.max(1, rnd() * ppk * 0.8), Math.max(1, ppk * 0.3));
      }
    }
  }
}
// loose threads sticking out of the frayed edge, drawn on the overlay
function drawFrayThreads(ctx, sim, cam, W, H) {
  if (!sim.fray || !sim.fray.length) return;
  const s = cam.s, sx = (x) => (x - cam.x) * s + W / 2, sy = (y) => (y - cam.y) * s + H / 2;
  ctx.lineCap = "round";
  for (const f of sim.fray) {
    const ul = (f.j1 - f.j0) / f.n, ex = f.side ? sim.gw : 0, dir = f.side ? 1 : -1;
    for (let u = 0; u < f.n; u++) {
      if (f.prog[u] >= 1) continue;
      for (let q = 0; q < 2; q++) {
        const h = hash2(u, q, Math.floor(f.seed));
        const y = f.j0 + (u + 0.3 + q * 0.4) * ul, L = (0.4 + h * 0.9) * sim.cpm * 0.025;
        const wig = Math.sin(G.t * 2 + u + q * 3) * 0.2;
        const x1 = ex + dir * L, y1 = y + (h - 0.5) * L * 1.2;
        ctx.strokeStyle = "rgba(40,30,22,0.5)"; ctx.lineWidth = Math.max(1.5, s * 0.25);
        ctx.beginPath(); ctx.moveTo(sx(ex), sy(y)); ctx.quadraticCurveTo(sx(ex + dir * L * 0.5), sy(y + wig * L), sx(x1), sy(y1)); ctx.stroke();
        ctx.strokeStyle = "#d8ccb0"; ctx.lineWidth = Math.max(1, s * 0.16);
        ctx.beginPath(); ctx.moveTo(sx(ex), sy(y)); ctx.quadraticCurveTo(sx(ex + dir * L * 0.5), sy(y + wig * L), sx(x1), sy(y1)); ctx.stroke();
      }
    }
  }
}

// ---------- repair step: holes, frayed edges and worn spots, one after another ----------
const REPAIR_TOOL = { hole: "needle", fray: "overcast", wear: "dye" };
const REPAIR_CAP = {
  hole: "Веди иглой по проплешине, узелки встанут на место",
  fray: "Веди вдоль края, обмётка закроет рваные нитки",
  wear: "Проведи краской по потёртости, цвет вернётся",
};
function repairTargets(s) {
  const out = [];
  for (const h of s.holes) if (!h.done && s.holeLeft(h) > 0.08) out.push({ type: "hole", x: h.x, y: h.y, r: h.r, o: h });
  for (const f of s.fray) if (!f.done && s.frayLeft(f) > 0.05) out.push({ type: "fray", x: f.side ? s.gw - 2 : 2, y: (f.j0 + f.j1) / 2, r: Math.max(8, (f.j1 - f.j0) * 0.55), o: f });
  for (const w of s.wears) if (!w.done && s.wearLeft(w) > 0.08) out.push({ type: "wear", x: w.x, y: w.y, r: w.r, o: w });
  return out;
}
function targetLeft(s, t) { return t.type === "hole" ? s.holeLeft(t.o) : t.type === "fray" ? s.frayLeft(t.o) : s.wearLeft(t.o); }
function needsRepair(s) { return repairTargets(s).length > 0; }
function repairStart() {
  const s = G.sim;
  const types = [...new Set(repairTargets(s).map((t) => t.type))];
  const tools = ["hole", "fray", "wear"].filter((t) => types.includes(t)).map((t) => REPAIR_TOOL[t]);
  G.tool = tools[0]; G.repair = { cur: null, t: 0, tools };
  UI.finishTools(tools, G.tool, "Готово", "ремонт закончен", () => { AU.tok(); strokeEnd(); G.repair = null; G.camTarget = Object.assign({}, G.fit); nextFinishStep(); });
  measureInsets(); fitCamera(true); repairNext();
}
function repairNext() {
  const s = G.sim, rp = G.repair; if (!rp) return;
  const t = repairTargets(s)[0];
  rp.cur = t || null;
  if (!t) { G.camTarget = Object.assign({}, G.fit); UI.finishCap("Ремонт закончен, узор целый"); return; }
  G.tool = REPAIR_TOOL[t.type]; UI.finishToolOn(G.tool);
  UI.finishCap(REPAIR_CAP[t.type]);
  const sc = Math.min(G.fit.s * 4.2, G.W * 0.42 / (t.r * 2));
  const top = G.topInset * G.dpr, bot = G.botInset * G.dpr;
  const s2 = Math.max(G.fit.s, sc);
  G.camTarget = { x: t.type === "fray" ? t.x + (t.o.side ? -1 : 1) * G.W * 0.18 / s2 : t.x, y: t.y + (bot - top) / 2 / s2, s: s2 };
}
function repairTick(dt) {
  const rp = G.repair; if (!rp || !rp.cur) return;
  rp.t += dt; if (rp.t < 0.3) return;
  rp.t = 0;
  const s = G.sim, cur = rp.cur;
  if (targetLeft(s, cur) < 0.06) {
    cur.o.done = true;
    if (cur.type === "fray") { cur.o.prog.fill(1); G.edgeDirty = true; }
    rp.cur = null; AU.chime(); vibrate(10);
    const left = repairTargets(s).length;
    const msg = { hole: "Заштопано", fray: "Край обмётан", wear: "Цвет вернулся" }[cur.type];
    toast(left ? msg + ". Дальше следующее место" : "Ремонт закончен, узор целый");
    if (!left) grantAch("repair");
    setTimeout(() => { if (G.repair) repairNext(); }, 700);
  }
}
