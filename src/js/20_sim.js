// ===== Simulation: dirt, fluids, tools =====
var UPG = {};
const STAINS = {
  wine: { name: "Вино", col: [0.5, 0.14, 0.3], chem: 1 },
  coffee: { name: "Кофе", col: [0.58, 0.38, 0.22], chem: 1 },
  juice: { name: "Ягодный сок", col: [0.7, 0.26, 0.46], chem: 1 },
  grass: { name: "Трава", col: [0.42, 0.62, 0.28], chem: 1 },
  tea: { name: "Чай", col: [0.72, 0.5, 0.28], chem: 1 },
  choco: { name: "Шоколад", col: [0.42, 0.27, 0.18], chem: 2 },
  grease: { name: "Жир", col: [0.56, 0.48, 0.32], chem: 2, gloss: 1 },
  cream: { name: "Крем от торта", col: [0.97, 0.9, 0.74], chem: 2, gloss: 0.5, light: 1 },
  soot: { name: "Копоть", col: [0.33, 0.31, 0.3], chem: 2 },
  lipstick: { name: "Помада", col: [0.78, 0.22, 0.3], chem: 2 },
  mud: { name: "Глина", col: [0.56, 0.42, 0.28], chem: 0 },
  gouache: { name: "Гуашь", col: [0.28, 0.42, 0.82], chem: 0 },
  pet: { name: "След питомца", col: [0.92, 0.86, 0.62], chem: 3, fluor: 1 },
  milk: { name: "Молоко", col: [0.95, 0.93, 0.85], chem: 3, light: 1 },
  wax: { name: "Воск свечи", col: [0.98, 0.92, 0.78], chem: 9, light: 1, raised: 1 },
  plast: { name: "Пластилин", col: [0.32, 0.6, 0.36], chem: 9, raised: 1 },
  mold: { name: "Плесень", col: [0.26, 0.3, 0.24], chem: 1 },
  tide: { name: "Разводы от воды", col: [0.7, 0.55, 0.36], chem: 1 },
  putty: { name: "Шпаклёвка", col: [0.94, 0.93, 0.89], chem: 0, light: 1, raised: 1, slow: 1 },
};
const STAIN_KEYS = Object.keys(STAINS);
const CHEMS = {
  1: { name: "Кислородный", short: "напитки", cap: "#E0A43A", desc: "Вино, кофе, чай, сок, трава" },
  2: { name: "Обезжириватель", short: "жир", cap: "#4E8FC9", desc: "Жир, крем, шоколад, копоть, помада" },
  3: { name: "Ферментный", short: "питомцы", cap: "#6DB36A", desc: "Следы питомцев, молоко" },
};

// base tool sizes in meters
const TOOLDEF = {
  beater: { r: 0.21 }, vacuum: { w: 0.38 }, foam: { r: 0.17 }, brush: { r: 0.1 }, machine: { r: 0.2 },
  squeegee: { len: 0.5 }, washer: { r: 0.14 }, spray: { r: 0.11 }, uv: { r: 0.3 }, iron: { r: 0.08 },
  comb: { w: 0.2 }, loupe: { r: 0.1 }, shovel: { r: 0.22 }, broom: { len: 0.5 }, needle: { r: 0.03 },
};

function Sim(rug, gw) {
  this.rug = rug;
  this.gw = gw;
  this.gh = Math.max(8, Math.round(gw * rug.H / rug.W));
  const n = this.n = this.gw * this.gh;
  this.cpm = gw / rug.widthM; // cells per meter
  this.D = new Float32Array(n); this.S = new Float32Array(n); this.G = new Float32Array(n); this.St = new Float32Array(n);
  this.W = new Float32Array(n); this.F = new Float32Array(n); this.L = new Float32Array(n); this.So = new Float32Array(n);
  this.N = new Float32Array(n); this.Ch = new Float32Array(n); this.R = new Float32Array(n); this.Dm = new Float32Array(n);
  this.B = new Float32Array(n); this.Fl = new Float32Array(n);
  this.H = new Float32Array(n); this.holes = [];
  this.Wr = new Float32Array(n); this.wears = []; this.fray = [];
  this.stT = new Uint8Array(n); this.chT = new Uint8Array(n);
  this.mask = new Uint8Array(n); this.zone = new Uint8Array(n);
  this.tmp = new Float32Array(n);
  this.objs = [];
  this.dirty = null;
  this.snow = 0;
  this.bleedDonor = null;
  this.dyeLock = 0;
  this.delicate = 0;
  this.bleedy = 0;
  this.stats = null;
  this.everWet = false;
  // body extents in cells
  this.by0 = Math.round(rug.fr / rug.H * this.gh);
  this.by1 = this.gh - this.by0;
  this._buildMask();
  this.floor = new FloorSim(this);
}
Sim.prototype._buildMask = function () {
  const r = this.rug, gw = this.gw, gh = this.gh;
  const id = r.ctx.getImageData(0, 0, r.W, r.H).data;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const px = Math.min(r.W - 1, Math.floor((i + 0.5) / gw * r.W)), py = Math.min(r.H - 1, Math.floor((j + 0.5) / gh * r.H));
    let a = 0; const s = 2;
    for (let dy = -s; dy <= s; dy += 2) for (let dx = -s; dx <= s; dx += 2) {
      const x = clamp(px + dx, 0, r.W - 1), y = clamp(py + dy, 0, r.H - 1);
      a += id[(y * r.W + x) * 4 + 3];
    }
    a /= 9 * 255;
    const k = j * gw + i;
    if (j >= this.by0 && j < this.by1) { this.mask[k] = 1; }
    else this.mask[k] = a > 0.2 ? 2 : 0;
    // zone
    if (this.mask[k] === 2) this.zone[k] = 5;
    else if (this.mask[k] === 1) {
      const u = (i + 0.5) / gw, v = (j + 0.5 - this.by0) / (this.by1 - this.by0);
      if (r.P) {
        const kx = Math.min(r.kw - 1, Math.floor(u * r.kw)), ky = Math.min(r.kh - 1, Math.floor(v * r.kh));
        this.zone[k] = r.P.zone[ky * r.kw + kx];
      } else this.zone[k] = r.zoneFn(u, v);
    }
  }
  // rug border cells and the floor spot just outside each of them
  const E = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const k = j * gw + i; if (!this.mask[k]) continue;
    for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= gw || jj >= gh || !this.mask[jj * gw + ii]) { E.push(k, ii + 0.5, jj + 0.5); break; }
    }
  }
  this.edge = new Float32Array(E);
  // donor dye for bleeding: amount of strong red around
  if (r.P) {
    const don = this.bleedDonor = new Float32Array(this.n);
    const pal = r.pal;
    for (let j = this.by0; j < this.by1; j++) for (let i = 0; i < gw; i++) {
      const u = (i + 0.5) / gw, v = (j + 0.5 - this.by0) / (this.by1 - this.by0);
      const kx = Math.min(r.kw - 1, Math.floor(u * r.kw)), ky = Math.min(r.kh - 1, Math.floor(v * r.kh));
      const c = pal[r.P.idx[ky * r.kw + kx]];
      const red = c[0] > 140 && c[0] > c[1] * 1.8 && c[0] > c[2] * 1.6 ? 1 : 0;
      don[j * gw + i] = red;
    }
    // blur donor
    const t = new Float32Array(this.n);
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
        const k = j * gw + i;
        t[k] = (don[k] * 2 + don[k - 1] + don[k + 1] + don[k - gw] + don[k + gw]) / 6;
      }
      don.set(t);
    }
  }
};
Sim.prototype.markDirty = function (x0, y0, x1, y1) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(this.gw - 1, Math.ceil(x1)); y1 = Math.min(this.gh - 1, Math.ceil(y1));
  if (x1 < x0 || y1 < y0) return;
  const d = this.dirty;
  if (!d) this.dirty = { x0, y0, x1, y1 };
  else { d.x0 = Math.min(d.x0, x0); d.y0 = Math.min(d.y0, y0); d.x1 = Math.max(d.x1, x1); d.y1 = Math.max(d.y1, y1); }
};
Sim.prototype.markAll = function () { this.dirty = { x0: 0, y0: 0, x1: this.gw - 1, y1: this.gh - 1 }; };
Sim.prototype.inRug = function (x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i >= this.gw || j >= this.gh) return false;
  return this.mask[j * this.gw + i] > 0;
};

// ---------- dirt generation ----------
Sim.prototype.generate = function (spec, seed) {
  const gw = this.gw, gh = this.gh, n = this.n;
  const rnd = mulberry(seed || 1);
  const sd = seed || 1;
  const by0 = this.by0, by1 = this.by1, bh = by1 - by0;
  const lvl = spec;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const k = j * gw + i;
    if (!this.mask[k]) continue;
    const u = i / gw, v = (j - by0) / bh;
    const f1 = fbm2(i * 0.045, j * 0.045, sd + 1, 4), f2 = fbm2(i * 0.11, j * 0.11, sd + 2, 3), f3 = fbm2(i * 0.02, j * 0.02, sd + 3, 3);
    const edge = Math.min(u, 1 - u, clamp(v, 0, 1), clamp(1 - v, 0, 1));
    // traffic lane along the long axis
    const lane = Math.exp(-Math.pow((u - 0.5 - (f3 - 0.5) * 0.3) / 0.28, 2));
    let dust = (lvl.dust || 0) * (0.55 + 0.9 * f1) * (1 + (edge < 0.08 ? 0.4 : 0));
    let sand = (lvl.sand || 0) * (0.4 + 0.9 * f2) * (0.6 + lane * 0.8);
    let grime = (lvl.grime || 0) * (0.45 + 0.7 * f3) * (lvl.lane ? (0.55 + lane * 0.7) : 1);
    if (lvl.soot) grime += lvl.soot * clamp(1.2 - v * 1.1, 0, 1) * (0.7 + 0.5 * f1);
    if (this.mask[k] === 2) { dust *= 0.8; grime = Math.max(grime, (lvl.fringe || 0.5) * (0.7 + 0.5 * f2)); sand *= 0.3; }
    this.D[k] = clamp(dust, 0, 1); this.S[k] = clamp(sand, 0, 1); this.G[k] = clamp(grime, 0, 1);
  }
  // stains
  const blob = (cx, cy, r, type, amt, ring) => {
    const st = STAINS[type];
    const x0 = Math.floor(cx - r * 1.6), x1 = Math.ceil(cx + r * 1.6), y0 = Math.floor(cy - r * 1.6), y1 = Math.ceil(cy + r * 1.6);
    const s2 = rnd() * 1000;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
      const k = j * gw + i; if (this.mask[k] !== 1) continue;
      const dx = (i - cx) / r, dy = (j - cy) / r;
      const d = Math.hypot(dx, dy) + (fbm2(i * 0.18, j * 0.18, s2, 3) - 0.5) * 0.9;
      if (d > 1) continue;
      let a = amt * (ring ? (0.55 + 0.45 * smooth(0.55, 0.95, d)) : (0.8 + 0.2 * (1 - d))) * smooth(1, 0.82, d);
      if (st.fluor) { this.Fl[k] = Math.max(this.Fl[k], a); a *= 0.35; }
      if (a > this.St[k]) { this.St[k] = a; this.stT[k] = STAIN_KEYS.indexOf(type); }
    }
  };
  for (const s of (lvl.stains || [])) {
    for (let q = 0; q < (s.n || 1); q++) {
      const cx = gw * (0.12 + rnd() * 0.76), cy = by0 + bh * (0.1 + rnd() * 0.8);
      const r = (s.size || 0.12) * this.cpm * (0.7 + rnd() * 0.6);
      if (s.drops) {
        for (let d = 0; d < s.drops; d++) blob(cx + (rnd() - 0.5) * r * 3, cy + (rnd() - 0.5) * r * 3, r * (0.2 + rnd() * 0.3), s.type, s.amt || 0.9, false);
      } else {
        blob(cx, cy, r, s.type, s.amt || 0.9, s.type !== "grease" && s.type !== "mud");
        if (rnd() < 0.6) blob(cx + (rnd() - 0.5) * r * 2.2, cy + (rnd() - 0.5) * r * 2.2, r * (0.25 + rnd() * 0.3), s.type, (s.amt || 0.9) * 0.9, true);
      }
    }
  }
  // moth: pile eaten down to the foundation
  if (lvl.moth) {
    for (let q = 0; q < (lvl.moth.n || 2); q++) {
      const cx = gw * (0.16 + rnd() * 0.68), cy = by0 + bh * (0.12 + rnd() * 0.76);
      const r = (lvl.moth.size || 0.05) * this.cpm * (0.75 + rnd() * 0.5);
      const s2 = rnd() * 1000;
      const spot = (sx, sy, rr, amt) => {
        for (let j = Math.floor(sy - rr * 1.8); j <= sy + rr * 1.8; j++) for (let i = Math.floor(sx - rr * 1.8); i <= sx + rr * 1.8; i++) {
          if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
          const k = j * gw + i; if (this.mask[k] !== 1) continue;
          const d = Math.hypot(i - sx, j - sy) / rr + (fbm2(i * 0.35, j * 0.35, s2, 3) - 0.5) * 0.9;
          if (d > 1) continue;
          this.H[k] = Math.max(this.H[k], amt * smooth(1, 0.55, d));
        }
      };
      spot(cx, cy, r, 1);
      for (let b = 0; b < 5; b++) { const a = rnd() * TAU, dd = r * (1 + rnd() * 0.9); spot(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, r * (0.18 + rnd() * 0.2), 0.85); }
      this.holes.push({ x: cx, y: cy, r: r * 2.1 });
    }
    for (const h of this.holes) h.init = this.holeSum(h) || 1;
  }
  this.genRestore(lvl, rnd);
  // footprints (shoe prints along a walking line)
  if (lvl.shoes) {
    const walks = lvl.shoes.walks || 3;
    for (let w = 0; w < walks; w++) {
      let x = gw * (0.3 + rnd() * 0.4), y = w % 2 ? by1 + 2 : by0 - 2;
      const dir = w % 2 ? -1 : 1;
      const step = 0.34 * this.cpm, sw = 0.09 * this.cpm;
      let left = true;
      while (y > by0 - 3 && y < by1 + 3) {
        const ox = (left ? -1 : 1) * sw * 0.7;
        this._shoe(x + ox, y, dir, lvl.shoes.amt || 0.8, lvl.shoes.type || "mud");
        y += dir * step; x += (rnd() - 0.5) * sw * 0.8; left = !left;
      }
    }
  }
  if (lvl.paws) {
    for (let w = 0; w < (lvl.paws.walks || 2); w++) {
      let x = gw * rnd(), y = by0 + bh * rnd();
      let a = rnd() * TAU;
      for (let s = 0; s < 14; s++) {
        this._paw(x, y, a, lvl.paws.amt || 0.8);
        x += Math.cos(a) * 0.14 * this.cpm; y += Math.sin(a) * 0.14 * this.cpm; a += (rnd() - 0.5) * 0.6;
        if (x < 2 || x > gw - 3 || y < by0 + 2 || y > by1 - 3) a += Math.PI * 0.7;
      }
    }
  }
  // objects
  const objs = this.objs = [];
  const addObjs = (type, count, cols) => {
    for (let q = 0; q < count; q++) {
      let x, y;
      if (rnd() < 0.35) { const e = rnd() < 0.5; x = e ? (rnd() < 0.5 ? rnd() * 0.12 : 1 - rnd() * 0.12) * gw : rnd() * gw; y = e ? by0 + rnd() * bh : by0 + (rnd() < 0.5 ? rnd() * 0.12 : 1 - rnd() * 0.12) * bh; }
      else { x = rnd() * gw; y = by0 + rnd() * bh; }
      objs.push({ x, y, t: type, a: rnd() * TAU, l: 0.5 + rnd() * 0.8, k: (rnd() - 0.5) * 2, c: cols[Math.floor(rnd() * cols.length)], s: 0, vx: 0, vy: 0, tt: 0, sz: 0.7 + rnd() * 0.6 });
    }
  };
  // flooded rug: soaked through with silty water; bath rug: old soap film in the pile
  if (lvl.soak || lvl.residue) {
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i; if (!this.mask[k]) continue;
      const f = fbm2(i * 0.06, j * 0.06, sd + 9, 3);
      if (lvl.soak) { this.W[k] = lvl.soak * (0.85 + 0.25 * f); this.L[k] = (lvl.soakDirt || 0.3) * (0.6 + 0.8 * f); }
      if (lvl.residue && this.mask[k] === 1) this.R[k] = clamp(lvl.residue * (0.45 + 0.9 * f), 0, 1);
    }
    if (lvl.soak) this.everWet = true;
  }
  if (lvl.hair) addObjs(0, lvl.hair, lvl.hairCol || ["#EDE6DA", "#9C8B7A", "#3B302A"]);
  if (lvl.crumbs) addObjs(1, lvl.crumbs, lvl.crumbsCol || ["#D7A15C", "#B9803F", "#E9C88B"]);
  if (lvl.confetti) addObjs(2, lvl.confetti, ["#E8453C", "#F2B632", "#3E8FD8", "#56B95A", "#D65DB1", "#F4F1E4"]);
  if (lvl.glitter) addObjs(3, lvl.glitter, ["#F3D46A", "#C9D9F0", "#F2A7C8"]);
  if (lvl.leaves) addObjs(4, lvl.leaves, lvl.leavesCol || ["#B9772F", "#D8A23A", "#8E5A26"]);
  if (lvl.fluff) addObjs(5, lvl.fluff, ["#A79E92", "#8F877D"]);
  this.markAll();
  this.initDirt = this.totalDirt();
  this.initTypes = this.typeTotals();
  this.initObjG = objGrams(this.objs);
};
Sim.prototype._shoe = function (cx, cy, dir, amt, type) {
  const c = this.cpm, gw = this.gw, gh = this.gh;
  const L = 0.27 * c, W = 0.09 * c;
  const ti = STAIN_KEYS.indexOf(type);
  for (let j = Math.floor(cy - L); j <= cy + L; j++) for (let i = Math.floor(cx - W); i <= cx + W; i++) {
    if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
    const k = j * gw + i; if (this.mask[k] !== 1) continue;
    const dy = (j - cy) * dir, dx = i - cx;
    const sole = ((dx * dx) / (W * W * 0.9) + ((dy + L * 0.18) ** 2) / (L * L * 0.36)) < 1;
    const heel = ((dx * dx) / (W * W * 0.7) + ((dy - L * 0.62) ** 2) / (L * L * 0.05)) < 1;
    if (!sole && !heel) continue;
    const tread = (Math.floor((dy + 50) / 1.6) & 1) ? 1 : 0.55;
    const a = amt * tread * (0.7 + 0.3 * hash2(i, j, 5));
    this.G[k] = clamp(this.G[k] + a * 0.35, 0, 1);
    if (a > this.St[k]) { this.St[k] = a * 0.8; this.stT[k] = ti; }
  }
};
Sim.prototype._paw = function (cx, cy, ang, amt) {
  const c = this.cpm, gw = this.gw;
  const pads = [[0, 0.02, 0.028], [-0.03, -0.03, 0.012], [-0.01, -0.045, 0.012], [0.012, -0.045, 0.012], [0.032, -0.03, 0.012]];
  const ca = Math.cos(ang + Math.PI / 2), sa = Math.sin(ang + Math.PI / 2);
  const ti = STAIN_KEYS.indexOf("mud");
  for (const [px, py, r] of pads) {
    const x = cx + (px * ca - py * sa) * c, y = cy + (px * sa + py * ca) * c, rr = r * c + 0.6;
    for (let j = Math.floor(y - rr); j <= y + rr; j++) for (let i = Math.floor(x - rr); i <= x + rr; i++) {
      if (i < 0 || j < 0 || i >= gw || j >= this.gh) continue;
      const k = j * gw + i; if (this.mask[k] !== 1) continue;
      const d = Math.hypot(i - x, j - y) / rr; if (d > 1) continue;
      const a = amt * (1 - d * 0.4);
      if (a > this.St[k]) { this.St[k] = a; this.stT[k] = ti; }
      this.G[k] = clamp(this.G[k] + a * 0.2, 0, 1);
    }
  }
};

Sim.prototype.holeSum = function (h) { let s = 0; this._circle(h.x, h.y, h.r, (k) => { s += this.H[k]; }); return s; };
Sim.prototype.holeLeft = function (h) { return this.holeSum(h) / (h.init || 1); };
Sim.prototype.holesLeft = function () { return this.holes.filter((h) => this.holeLeft(h) > 0.2).length; };
// needle and wool: knots go back into the bare patch
Sim.prototype.darn = function (x, y, dt) {
  const r = TOOLDEF.needle.r * this.cpm; let got = 0;
  this._circle(x, y, r, (k, f) => { if (this.H[k] > 0) { const q = Math.min(this.H[k], dt * 2.6 * (UPG.repairK || 1) * (0.3 + f)); this.H[k] -= q; got += q; } });
  return got;
};
Sim.prototype.cellDirt = function (k) {
  return this.D[k] * 0.55 + this.S[k] * 0.5 + this.G[k] * 1.0 + this.St[k] * 1.4 + this.Fl[k] * 1.2 + this.L[k] * 0.9;
};
Sim.prototype.totalDirt = function () {
  let s = 0; const n = this.n;
  for (let k = 0; k < n; k++) if (this.mask[k]) s += this.cellDirt(k);
  s += this.objs.length * 0.35;
  return s;
};
Sim.prototype.typeTotals = function () {
  const t = { dust: 0, sand: 0, grime: 0, stain: 0, fluor: 0, load: 0, foam: 0, soap: 0, water: 0, residue: 0, damage: 0, bleed: 0, objs: this.objs.length, cells: 0 };
  for (let k = 0; k < this.n; k++) {
    if (!this.mask[k]) continue;
    t.cells++;
    t.dust += this.D[k]; t.sand += this.S[k]; t.grime += this.G[k]; t.stain += this.St[k]; t.fluor += this.Fl[k];
    t.load += this.L[k]; t.foam += this.F[k]; t.soap += this.So[k]; t.water += this.W[k]; t.residue += this.R[k]; t.damage += this.Dm[k]; t.bleed += this.B[k];
  }
  return t;
};

// water arriving on dusty pile turns dust into mud
Sim.prototype._wetConvert = function (k, dW) {
  if (dW <= 0) return;
  const d = this.D[k];
  if (d > 0.01) {
    const q = Math.min(1, dW * 3);
    this.G[k] = Math.min(1, this.G[k] + d * q * 0.5);
    this.D[k] = d * (1 - q);
  }
  const s = this.S[k];
  if (s > 0.01) { const q = Math.min(1, dW * 1.2) * 0.25; this.L[k] += s * q; this.S[k] = s * (1 - q); }
  this.everWet = true;
};

// iterate cells in a circle
Sim.prototype._circle = function (x, y, r, fn) {
  const gw = this.gw, gh = this.gh;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(gw - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(gh - 1, Math.ceil(y + r));
  const r2 = r * r;
  for (let j = y0; j <= y1; j++) {
    const dy = j + 0.5 - y;
    for (let i = x0; i <= x1; i++) {
      const dx = i + 0.5 - x, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const k = j * gw + i;
      if (!this.mask[k]) continue;
      fn(k, 1 - Math.sqrt(d2) / r, dx, dy, i, j);
    }
  }
  this.markDirty(x0, y0, x1, y1);
};

// iterate floor spots (cells outside the rug) in a circle, in world cell units
Sim.prototype._outCircle = function (x, y, r, fn) {
  const gw = this.gw, gh = this.gh, r2 = r * r;
  const x0 = Math.floor(x - r), x1 = Math.ceil(x + r), y0 = Math.floor(y - r), y1 = Math.ceil(y + r);
  for (let j = y0; j <= y1; j++) {
    const dy = j + 0.5 - y;
    for (let i = x0; i <= x1; i++) {
      const dx = i + 0.5 - x, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      if (i >= 0 && j >= 0 && i < gw && j < gh && this.mask[j * gw + i]) continue;
      fn(i + 0.5, j + 0.5, 1 - Math.sqrt(d2) / r);
    }
  }
};

// ---------- TOOLS ----------
// Each returns an info object for FX/sound
Sim.prototype.beat = function (x, y, power) {
  const r = TOOLDEF.beater.r * this.cpm * (power || 1);
  let out = 0, sand = 0, wet = 0, cells = 0;
  const snow = this.snow;
  this._circle(x, y, r, (k, f) => {
    const fall = f * f * (3 - 2 * f);
    cells++;
    if (this.W[k] > 0.35) { wet += this.W[k]; return; }
    const dD = this.D[k] * 0.4 * fall, dS = this.S[k] * 0.2 * fall;
    this.D[k] -= dD; this.S[k] -= dS;
    // deep grit rises to surface
    this.D[k] = Math.min(1, this.D[k] + dS * 0.25);
    out += dD; sand += dS * 0.75;
    if (snow && this.F[k] > 0.05) {
      // snow grabs dirt and freshens pile
      const g = this.G[k] * 0.06 * fall * Math.min(1, this.F[k] * 2);
      this.G[k] -= g; this.L[k] += (dD + dS) * 0.9 + g; this.F[k] = Math.max(0, this.F[k] - 0.02 * fall);
      const st = this.St[k] * 0.02 * fall; this.St[k] -= st; this.L[k] += st;
    }
  });
  // part of the dust and grit lands on the floor around the rug
  if (!snow && out + sand > 0.5) {
    const fl = this.floor, amt = (out * 0.5 + sand) / (r * r) * 0.4;
    this._outCircle(x, y, r * 1.45, (wx, wy, f) => { if (Math.random() < 0.6) fl.addSilt(wx, wy, amt * (0.2 + f) * (0.4 + Math.random())); });
  }
  // objects hop
  for (const o of this.objs) {
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < r) { const f = 1 - d / r; o.vx += (o.x - x) / (d + 0.1) * f * 6; o.vy += (o.y - y) / (d + 0.1) * f * 6; o.a += (Math.random() - 0.5) * f; }
  }
  return { dust: out, sand, wet, cells, r };
};

Sim.prototype.vacuum = function (x, y, nx, ny, speed, dt) {
  // head: rectangle width w across (perp to motion), depth ~ 0.06 m
  const w = TOOLDEF.vacuum.w * this.cpm * (UPG.vacuumW || 1), dp = 0.07 * this.cpm;
  const tx = -ny, ty = nx;
  const r = Math.hypot(w / 2, dp) + 1;
  const pow = (UPG.vacuumP || 1);
  const k0 = Math.min(1, dt * (1.2 + speed * 0.12) * 2.2 * pow);
  let got = 0, wet = 0;
  const napv = ny; // moving down(+y) -> nap +; up -> -
  this._circle(x, y, r, (k, f, dx, dy) => {
    const a = dx * tx + dy * ty, b = dx * nx + dy * ny;
    if (Math.abs(a) > w / 2 || Math.abs(b) > dp) return;
    if (this.W[k] > 0.3) { wet++; this.W[k] = Math.max(0, this.W[k] - dt * 0.15); return; }
    const dD = this.D[k] * k0, dS = this.S[k] * k0 * 0.18;
    this.D[k] -= dD; this.S[k] -= dS; got += dD + dS;
    if (speed > 0.5) this.N[k] = lerp(this.N[k], napv, Math.min(1, dt * 14));
  });
  let sucked = 0;
  for (const o of this.objs) {
    if (o.s) continue;
    const dx = o.x - x, dy = o.y - y;
    const a = dx * tx + dy * ty, b = dx * nx + dy * ny;
    if (Math.abs(a) < w / 2 + 1.5 && Math.abs(b) < dp + 2.5) { o.s = 1; o.tt = 0; o.hx = x; o.hy = y; sucked++; }
  }
  return { got, wet, sucked };
};

Sim.prototype.foam = function (x, y, dt, mult) {
  const r = TOOLDEF.foam.r * (this.snow ? 1 : (UPG.foamR || 1)) * this.cpm;
  let amt = 0;
  const snow = this.snow;
  this._circle(x, y, r, (k, f) => {
    const q = dt * (0.35 + f) * 1.4 * (mult || 1);
    if (snow) { this.F[k] = Math.min(1.2, this.F[k] + q * 0.9); amt += q; return; }
    const dW = Math.max(0, Math.min(1.1, this.W[k] + q * 0.7) - this.W[k]);
    this._wetConvert(k, dW);
    this.W[k] += dW;
    this.So[k] = Math.min(1, this.So[k] + q * 1.1);
    this.F[k] = Math.min(1.1, this.F[k] + q * 0.9);
    amt += q;
  });
  // the part of the spray that misses the rug lands on the floor as foam
  if (!snow) {
    const fl = this.floor, m = mult || 1;
    this._outCircle(x, y, r, (wx, wy, f) => { fl.addFoam(wx, wy, dt * (0.35 + f) * 1.26 * m, 0, 1.15); });
  }
  return { amt, r };
};

Sim.prototype.spray = function (x, y, chem, dt) {
  const r = TOOLDEF.spray.r * this.cpm;
  let hit = 0;
  this._circle(x, y, r, (k, f) => {
    const q = dt * (0.4 + f) * 1.8;
    const dW = Math.max(0, Math.min(0.6, this.W[k] + q * 0.25) - this.W[k]);
    this._wetConvert(k, dW);
    this.W[k] += dW;
    if (this.chT[k] !== chem) { this.Ch[k] *= 0.3; this.chT[k] = chem; }
    this.Ch[k] = Math.min(1, this.Ch[k] + q);
    if (this.St[k] > 0.05 && STAINS[STAIN_KEYS[this.stT[k]]].chem === chem) hit++;
    if (this.Fl[k] > 0.05 && chem === 3) hit++;
  });
  return { r, hit };
};

// agitation: brush (hand) or machine
Sim.prototype.scrub = function (x, y, dt, motion, machine) {
  const r = (machine ? TOOLDEF.machine.r * (UPG.machineR || 1) : TOOLDEF.brush.r) * this.cpm;
  const power = machine ? 2.6 * (UPG.machineP || 1) : 1.0;
  let lifted = 0, dry = 0, foamed = 0, dmg = 0, fSum = 0, lSum = 0, wSum = 0, fN = 0;
  const snow = this.snow;
  const phase = now() * 9;
  this._circle(x, y, r, (k, f, dx, dy) => {
    const e = dt * power * (machine ? (0.6 + motion * 0.4) : motion) * (0.5 + f * 0.8);
    if (e <= 0) return;
    if (machine) this.N[k] = lerp(this.N[k], Math.cos(Math.atan2(dy, dx) * 2 + phase), Math.min(1, e * 2));
    else this.N[k] = lerp(this.N[k], Math.sin((dx + dy) * 0.8 + phase), Math.min(1, e));
    if (this.delicate && machine) { this.Dm[k] = Math.min(1, this.Dm[k] + e * 0.35); dmg += e; }
    if (snow) {
      // broom-like on snow: rubs snow into pile, grabs grime
      if (this.F[k] > 0.05) { const g = this.G[k] * Math.min(1, e * 0.3); this.G[k] -= g; this.L[k] += g; }
      return;
    }
    const soap = this.So[k], wet = this.W[k];
    if (wet < 0.08) {
      dry++;
      const dD = this.D[k] * Math.min(1, e * 0.3); this.D[k] -= dD;
      return;
    }
    const sf = Math.min(1, soap * 2.2) * Math.min(1, wet * 1.8);
    const g = this.G[k] * Math.min(1, e * (0.12 + sf * 1.35));
    this.G[k] -= g; this.L[k] += g; lifted += g;
    const s = this.S[k] * Math.min(1, e * 0.25 * sf); this.S[k] -= s; this.L[k] += s * 0.8;
    const d = this.D[k] * Math.min(1, e * 0.8); this.D[k] -= d; this.G[k] += d * 0.2; this.L[k] += d * 0.6;
    if (this.St[k] > 0) {
      const st = STAINS[STAIN_KEYS[this.stT[k]]];
      let rate = st.chem === 0 ? (st.slow ? 0.26 : 0.9) * sf : st.chem === 9 ? 0.0 : 0.07 * sf;
      if (this.Ch[k] > 0.05 && this.chT[k] === st.chem) rate += 1.6 * this.Ch[k];
      const q = this.St[k] * Math.min(1, e * rate); this.St[k] -= q; this.L[k] += q * 0.8; lifted += q;
    }
    if (this.Fl[k] > 0) {
      let rate = 0.05 * sf; if (this.Ch[k] > 0.05 && this.chT[k] === 3) rate += 1.5 * this.Ch[k];
      const q = this.Fl[k] * Math.min(1, e * rate); this.Fl[k] -= q; this.L[k] += q * 0.3;
    }
    // foam builds from soap under agitation
    const target = Math.min(1.25, soap * 1.5 + 0.05);
    if (this.F[k] < target) { const q = Math.min(target - this.F[k], e * 1.2 * soap); this.F[k] += q; foamed += q; }
    fSum += this.F[k]; lSum += this.L[k]; wSum += this.W[k]; fN++;
  });
  // brushes throw foam past the rug edge
  if (!snow && fN && motion > 0.05) {
    const fAvg = fSum / fN;
    if (fAvg > 0.12) {
      const conc = lSum / (wSum + fSum + 0.05), fl = this.floor;
      const rate = dt * (machine ? 0.9 : 0.4 * Math.min(1, motion)) * fAvg;
      const mix = Math.min(1, dt * (machine ? 3 : 1.6) * Math.min(1, motion + 0.3));
      this._outCircle(x, y, r * (machine ? 1.3 : 1.15), (wx, wy, f) => {
        fl.mixFoam(wx, wy, conc, mix * f);
        if (Math.random() < 0.55) fl.addFoam(wx, wy, rate * (0.3 + f * 1.6) * Math.random() * 2, conc, 1.2);
      });
    }
  }
  return { lifted, dry, foamed, dmg, r };
};

// squeegee / broom: blade from (x0,y0) to (x1,y1) sweep; carry = {v, l, s}
Sim.prototype.squeegee = function (st, x1, y1) {
  const x0 = st.x, y0 = st.y;
  const dx = x1 - x0, dy = y1 - y0;
  const ds = Math.hypot(dx, dy);
  const half = (st.len || TOOLDEF.squeegee.len * this.cpm) / 2;
  if (ds < 0.05) return;
  // direction smoothing
  const ndx = dx / ds, ndy = dy / ds;
  if (!st.hasDir) { st.nx = ndx; st.ny = ndy; st.hasDir = true; }
  else { st.nx = lerp(st.nx, ndx, 0.35); st.ny = lerp(st.ny, ndy, 0.35); const m = Math.hypot(st.nx, st.ny) || 1; st.nx /= m; st.ny /= m; }
  const nx = st.nx, ny = st.ny, tx = -ny, ty = nx;
  const gw = this.gw, gh = this.gh;
  const minx = Math.max(0, Math.floor(Math.min(x0, x1) - half - 2)), maxx = Math.min(gw - 1, Math.ceil(Math.max(x0, x1) + half + 2));
  const miny = Math.max(0, Math.floor(Math.min(y0, y1) - half - 2)), maxy = Math.min(gh - 1, Math.ceil(Math.max(y0, y1) + half + 2));
  const snow = this.snow || st.broom;
  let took = 0;
  for (let j = miny; j <= maxy; j++) for (let i = minx; i <= maxx; i++) {
    const k = j * gw + i;
    if (!this.mask[k]) continue;
    const cx = i + 0.5 - x0, cy = j + 0.5 - y0;
    const along = cx * nx + cy * ny, across = cx * tx + cy * ty;
    if (along < -0.6 || along > ds + 0.6 || Math.abs(across) > half) continue;
    const edgeK = Math.abs(across) > half - 1 ? 0.85 : 1;
    if (snow) {
      const f = this.F[k] * 0.9 * edgeK;
      st.v += f; st.l += this.L[k] * 0.9 * edgeK; this.F[k] -= f; this.L[k] *= 1 - 0.9 * edgeK;
      const dd = this.D[k] * 0.25 * edgeK; this.D[k] -= dd; st.l += dd;
      took += f;
    } else {
      const wv = this.W[k] * 0.84 * edgeK, fv = this.F[k] * 0.97 * edgeK;
      st.v += wv + fv; st.l += this.L[k] * 0.9 * edgeK; st.s += this.So[k] * 0.55 * edgeK; st.f += fv;
      this.W[k] -= wv; this.F[k] -= fv; this.L[k] *= 1 - 0.9 * edgeK; this.So[k] *= 1 - 0.55 * edgeK;
      this.N[k] = lerp(this.N[k], ny, 0.8);
      took += wv + fv;
    }
  }
  this.markDirty(minx, miny, maxx, maxy);
  // blade also pushes the foam lying on the floor
  if (!snow) this.floor.sweepFoam(x0, y0, x1, y1, nx, ny, half, ds);
  // side spill (ridges)
  const sp = Math.min(0.06, 0.0005 * ds) * st.v;
  if (sp > 0.01 && !snow) {
    const conc = st.l / (st.v + 1e-3);
    for (const side of [-1, 1]) {
      const sx = x1 - nx * 1.5 + tx * side * (half - 0.8), sy = y1 - ny * 1.5 + ty * side * (half - 0.8);
      this._deposit(sx, sy, 2.2, sp / 2, conc, st.s / (st.v + 1e-3), st.f / (st.v + 1e-3));
    }
    st.l -= sp * conc; st.s -= sp * st.s / (st.v + 1e-3); st.f -= sp * st.f / (st.v + 1e-3); st.v -= sp;
  }
  // objects carried
  for (const o of this.objs) {
    if (o.s) continue;
    const cx = o.x - x0, cy = o.y - y0;
    const along = cx * nx + cy * ny, across = cx * tx + cy * ty;
    if (along > -0.5 && along < ds + 1.5 && Math.abs(across) < half) { o.x = x1 + nx * 1.5 + tx * across; o.y = y1 + ny * 1.5 + ty * across; o.carried = 1; }
  }
  // leaving the rug: dump to floor
  let outside = 0, samples = 7;
  for (let q = 0; q < samples; q++) {
    const a = (q / (samples - 1) - 0.5) * 2 * half;
    if (!this.inRug(x1 + tx * a, y1 + ty * a)) outside++;
  }
  let dumped = 0;
  if (outside > 0 && st.v > 0.01) {
    const frac = outside === samples ? 1 : Math.min(1, outside / samples * 0.25 * Math.max(1, ds));
    const v = st.v * frac, l = st.l * frac, fo = st.f * frac;
    // the part of the blade past the edge
    const pts = [], n = Math.max(3, Math.round(half * 1.2));
    if (!snow) for (let q = 0; q < n; q++) {
      const a = (q / (n - 1) - 0.5) * 2 * half;
      const px = x1 + nx * 2.2 + tx * a, py = y1 + ny * 2.2 + ty * a;
      if (!this.inRug(px, py)) pts.push(px, py);
    }
    const m = pts.length / 2;
    // heavy grit drops right at the edge as a muddy heap, the rest runs off with the water
    const heap = m ? l * 0.45 : 0;
    this.floor.add(x1 + nx * 2, y1 + ny * 2, v - fo * 0.6, l - heap, snow ? 1 : 0, half);
    if (heap > 0) for (let q = 0; q < pts.length; q += 2) {
      for (let e = 0; e < 3; e++) this.floor.addSilt(pts[q] + nx * (1 + e * 1.6) + (Math.random() - 0.5) * 2, pts[q + 1] + ny * (1 + e * 1.6) + (Math.random() - 0.5) * 2, heap / m / 3 * 0.55 * (0.5 + Math.random()));
    }
    if (!snow && fo > 0.02) {
      // foamy wave lands on the floor along the part of the blade past the edge
      if (m) {
        const conc = l / (v + 1e-3), each = fo * 0.85 / m;
        for (let q = 0; q < pts.length; q += 2) {
          const jit = (Math.random() - 0.3) * 2.2;
          this.floor.addFoam(pts[q] + nx * jit, pts[q + 1] + ny * jit, each * (0.6 + Math.random() * 0.8), conc, 2.2);
        }
      }
    }
    st.v -= v; st.l -= l; st.s -= st.s * frac; st.f -= fo; dumped = v;
    for (const o of this.objs) if (o.carried && !this.inRug(o.x, o.y)) o.s = 2;
  }
  for (const o of this.objs) o.carried = 0;
  st.x = x1; st.y = y1;
  return { took, dumped, ds };
};
Sim.prototype.squeegeeRelease = function (st) {
  if (!st.hasDir || st.v < 0.02) return;
  const conc = st.l / (st.v + 1e-3), sc = st.s / (st.v + 1e-3), fc = st.f / (st.v + 1e-3);
  const half = (st.len || TOOLDEF.squeegee.len * this.cpm) / 2;
  const tx = -st.ny, ty = st.nx;
  const n = Math.max(3, Math.round(half));
  for (let q = 0; q < n; q++) {
    const a = (q / (n - 1) - 0.5) * 2 * half;
    this._deposit(st.x + st.nx * 1.6 + tx * a, st.y + st.ny * 1.6 + ty * a, 1.5, st.v / n, conc, sc, fc);
  }
  st.v = 0; st.l = 0; st.s = 0; st.f = 0;
};
Sim.prototype._deposit = function (x, y, r, v, conc, soapc, foamc) {
  let wsum = 0; const cells = [];
  this._circle(x, y, r, (k, f) => { cells.push(k, f + 0.2); wsum += f + 0.2; });
  if (!wsum) {
    this.floor.add(x, y, v, v * conc, this.snow, r);
    if (!this.snow && foamc > 0.02) this.floor.addFoam(x, y, v * foamc * 0.85, conc, 2.2);
    return;
  }
  for (let q = 0; q < cells.length; q += 2) {
    const k = cells[q], w = cells[q + 1] / wsum;
    if (this.snow) { this.F[k] += v * w; this.L[k] += v * w * conc; continue; }
    const fv = v * w * (foamc || 0);
    this.W[k] += v * w - fv; this.F[k] += fv; this.L[k] += v * w * conc; this.So[k] = Math.min(1, this.So[k] + v * w * (soapc || 0));
  }
};

Sim.prototype.wash = function (x, y, nx, ny, speed, dt, hose) {
  const r = hose ? TOOLDEF.washer.r * 1.15 * this.cpm : TOOLDEF.washer.r * this.cpm * (UPG.washerR || 1);
  let hit = 0;
  const push = hose ? 0 : Math.min(3.5, 0.6 + speed * 0.08) * (UPG.washerP || 1);
  const pw = hose ? 0.55 : 1;
  const tmpK = [];
  this._circle(x, y, r, (k, f) => {
    const q = dt * (0.4 + f) * 2.4 * pw;
    const dW = Math.max(0, Math.min(1.5, this.W[k] + q) - this.W[k]);
    this._wetConvert(k, dW);
    this.W[k] += dW;
    // rinse soap & collapse foam
    const s = this.So[k] * Math.min(1, q * 0.9); this.So[k] -= s;
    if (this.R[k] > 0) this.R[k] -= this.R[k] * Math.min(1, q * (hose ? 1.4 : 2));
    const fo = this.F[k] * Math.min(1, q * 1.8); this.F[k] -= fo; this.W[k] += fo * 0.4;
    const g = this.G[k] * Math.min(1, q * (hose ? 0.03 : 0.09)); this.G[k] -= g; this.L[k] += g;
    const sd = this.S[k] * Math.min(1, q * (hose ? 0.08 : 0.22)); this.S[k] -= sd; this.L[k] += sd;
    this.Ch[k] *= 1 - Math.min(1, q * 0.8);
    if (this.delicate && !hose) this.Dm[k] = Math.min(1, this.Dm[k] + q * 0.02);
    hit++;
    tmpK.push(k, f);
  });
  // push fluid along direction
  if (speed > 0.3 && push > 0) {
    const gw = this.gw;
    const moveX = Math.round(nx * 2), moveY = Math.round(ny * 2);
    if (moveX || moveY) {
      for (let q = 0; q < tmpK.length; q += 2) {
        const k = tmpK[q], f = tmpK[q + 1];
        const i = k % gw, j = (k / gw) | 0;
        const ti = i + moveX, tj = j + moveY;
        const frac = Math.min(0.6, dt * push * (0.4 + f));
        const w = this.W[k] * frac, l = this.L[k] * frac;
        if (ti < 0 || tj < 0 || ti >= gw || tj >= this.gh || !this.mask[tj * gw + ti]) {
          this.W[k] -= w; this.L[k] -= l; this.floor.add(ti, tj, w, l, 0, 1);
        } else {
          const t = tj * gw + ti; this.W[k] -= w; this.L[k] -= l; this.W[t] += w; this.L[t] += l;
        }
      }
    }
  }
  // objects pushed
  for (const o of this.objs) {
    if (o.s) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < r) { o.vx += nx * 8 * (1 - d / r) + (o.x - x) * 0.6; o.vy += ny * 8 * (1 - d / r) + (o.y - y) * 0.6; }
  }
  // spray outside rug wets floor and knocks the foam down
  if (!this.inRug(x, y)) this.floor.add(x, y, dt * 3, 0, 0, r);
  this.floor.blastFoam(x, y, r * 1.1, dt * pw * (hose ? 1.6 : 3));
  this.floor.washSilt(x, y, r * 1.05, dt * (hose ? 2.2 : 4.2), nx, ny, hose ? 0 : (speed > 0.3 ? 2.2 : 0.6));
  return { hit, r };
};

Sim.prototype.iron = function (x, y, dt) {
  const r = TOOLDEF.iron.r * this.cpm;
  let melted = 0;
  this._circle(x, y, r, (k, f) => {
    if (this.St[k] <= 0) return;
    const st = STAINS[STAIN_KEYS[this.stT[k]]];
    if (st.chem !== 9) return;
    const q = this.St[k] * Math.min(1, dt * 1.4 * (0.4 + f)); this.St[k] -= q; melted += q;
    this.G[k] += q * 0.04;
  });
  return { melted, r };
};

Sim.prototype.comb = function (x, y, nx, ny, dt) {
  const rug = this.rug; if (!rug.fr) return { n: 0 };
  // world x -> texture px
  const r = TOOLDEF.comb.w * this.cpm / 2;
  let n = 0;
  const pxPerCell = rug.W / this.gw;
  for (const s of rug.strands) {
    const sx = s.x / pxPerCell, sy = s.side === 0 ? this.by0 * 0.5 : (this.by1 + this.gh) * 0.5;
    if (Math.abs(sx - x) < r && Math.abs(sy - y) < (this.by0 * 0.7 + 2)) {
      if (s.tang > 0) { s.tang = Math.max(0, s.tang - dt * 3.5); n++; }
      s.ang = lerp(s.ang, 0, Math.min(1, dt * 3)); s.curl = lerp(s.curl, 0, Math.min(1, dt * 3));
    }
  }
  // combing also lifts loose dust from fringe cells
  this._circle(x, y, r, (k, f) => { if (this.mask[k] === 2) { this.D[k] *= 1 - Math.min(1, dt * 2); if (this.W[k] > 0.2 && this.So[k] > 0.1) { const g = this.G[k] * dt * 0.8; this.G[k] -= g; this.L[k] += g; } } });
  return { n };
};

// fringe brush with whitener: yellowed tassels turn white
Sim.prototype.fringeWash = function (x, y, dt) {
  const rug = this.rug; if (!rug.fr) return { n: 0, y: 0 };
  const r = TOOLDEF.comb.w * 1.1 * this.cpm / 2;
  const pxPerCell = rug.W / this.gw;
  let n = 0, got = 0;
  for (const s of rug.strands) {
    if (!(s.yel > 0)) continue;
    const sx = s.x / pxPerCell, sy = s.side === 0 ? this.by0 * 0.5 : (this.by1 + this.gh) * 0.5;
    if (Math.abs(sx - x) < r && Math.abs(sy - y) < (this.by0 * 0.8 + 2)) {
      const q = Math.min(s.yel, dt * (1.3 + Math.random() * 0.8));
      s.yel -= q; got += q; n++;
      if (s.yel < 0.02) s.yel = 0;
    }
  }
  this._circle(x, y, r, (k) => { if (this.mask[k] === 2) { this.G[k] *= 1 - Math.min(1, dt * 1.5); this.D[k] *= 1 - Math.min(1, dt * 2); } });
  return { n, got };
};

// ---------- global update ----------
Sim.prototype.tick = function (dt) {
  const n = this.n, gw = this.gw, gh = this.gh;
  const D = this.D, W = this.W, F = this.F, L = this.L, St = this.St, Ch = this.Ch, So = this.So, Fl = this.Fl, B = this.B;
  let active = false;
  for (let k = 0; k < n; k++) {
    if (!this.mask[k]) continue;
    if (F[k] > 0.001) {
      const dec = F[k] * (this.snow ? 0.002 : 0.012) * dt; F[k] -= dec; if (!this.snow) W[k] += dec * 0.3; active = true;
    }
    if (Ch[k] > 0.001) {
      active = true;
      if (St[k] > 0.001) {
        const st = STAINS[STAIN_KEYS[this.stT[k]]];
        const rate = st.chem === this.chT[k] ? 0.42 : 0.025;
        const q = St[k] * Math.min(1, rate * Ch[k] * dt); St[k] -= q; L[k] += q * 0.8;
        if (W[k] < 0.15) W[k] = 0.15;
      }
      if (Fl[k] > 0.001 && this.chT[k] === 3) { const q = Fl[k] * Math.min(1, 0.4 * Ch[k] * dt); Fl[k] -= q; }
      Ch[k] = Math.max(0, Ch[k] - dt * 0.035);
    }
    if (W[k] > 0.001) {
      active = true;
      W[k] = Math.max(0, W[k] - dt * 0.0025);
      if (this.bleedy && !(this.Fx && this.Fx[k]) && W[k] > 0.7 && this.bleedDonor) {
        const d = this.bleedDonor[k];
        if (d > 0.05 && d < 0.95) B[k] = Math.min(1, B[k] + (W[k] - 0.7) * d * dt * 0.05);
      }
    }
  }
  // puddle leveling
  const T = this.tmp; T.fill(0);
  for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
    const k = j * gw + i;
    if (!this.mask[k] || W[k] < 0.95) continue;
    const ex = (W[k] - 0.95) * 0.25 * Math.min(1, dt * 8);
    const c = L[k] / (W[k] + 1e-4);
    let moved = 0;
    for (const o of [-1, 1, -gw, gw]) {
      const t = k + o; if (!this.mask[t]) continue;
      if (W[t] < W[k]) { T[t] += ex / 4; moved += ex / 4; }
    }
    T[k] -= moved;
    // carry dirt
    if (moved > 0) { const lq = moved * c; L[k] -= lq; for (const o of [-1, 1, -gw, gw]) { const t = k + o; if (this.mask[t] && W[t] < W[k]) L[t] += lq / 4; } }
  }
  for (let k = 0; k < n; k++) if (T[k]) W[k] += T[k];
  // thick foam slumps over the rug edge, overflowing water trickles off
  if (!this.snow) {
    const E = this.edge, fl = this.floor;
    const kf = Math.min(1, dt * 0.55), kw = Math.min(1, dt * 0.4);
    for (let q = 0; q < E.length; q += 3) {
      const k = E[q];
      if (F[k] > 0.78) {
        const a = (F[k] - 0.78) * kf; F[k] -= a;
        fl.addFoam(E[q + 1] + (Math.random() - 0.5) * 0.8, E[q + 2] + (Math.random() - 0.5) * 0.8, a, L[k] / (W[k] + F[k] + 0.05), 1.5);
        active = true;
      }
      if (W[k] > 1.1) {
        const a = (W[k] - 1.1) * kw, l = L[k] * a / W[k];
        W[k] -= a; L[k] -= l; fl.add(E[q + 1], E[q + 2], a, l, 0, 1);
        active = true;
      }
    }
  }
  // objects physics
  for (let q = this.objs.length - 1; q >= 0; q--) {
    const o = this.objs[q];
    if (o.s === 1) { o.tt += dt; if (o.tt > 0.18) { this.objs.splice(q, 1); } continue; }
    if (o.s === 2) { this.objs.splice(q, 1); continue; }
    if (o.vx || o.vy) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= Math.pow(0.02, dt); o.vy *= Math.pow(0.02, dt);
      if (Math.abs(o.vx) + Math.abs(o.vy) < 0.05) { o.vx = 0; o.vy = 0; }
      if (!this.inRug(o.x, o.y)) { this.objs.splice(q, 1); }
    }
  }
  if (active) this.markAll();
  this.floor.tick(dt);
};

// a stain remover keeps working after the spray: Ch fades by 0.035/s, the stain melts at rate*Ch,
// so from here on it takes exp(-rate*Ch^2/0.07) of what is left
const CHEM_K = 0.42 / 0.07, CHEM_K0 = 0.025 / 0.07, CHEM_KF = 0.4 / 0.07;
Sim.prototype.chemLeft = function (k) {
  const c = this.Ch[k]; if (c <= 0.001) return 1;
  const st = STAINS[STAIN_KEYS[this.stT[k]]];
  return Math.exp(-(st && st.chem === this.chT[k] ? CHEM_K : CHEM_K0) * c * c);
};
Sim.prototype._settleChem = function (k) {
  const c = this.Ch[k];
  if (this.St[k] > 0.001) { const q = this.St[k] * (1 - this.chemLeft(k)); this.St[k] -= q; this.L[k] += q * 0.8; }
  if (this.Fl[k] > 0.001 && this.chT[k] === 3) this.Fl[k] *= Math.exp(-CHEM_KF * c * c);
  this.Ch[k] = 0;
};
// only the stain remover keeps working (while the rug spins and dries)
Sim.prototype.chemTick = function (dt) {
  const n = this.n, Ch = this.Ch, St = this.St, L = this.L, Fl = this.Fl;
  let active = false;
  for (let k = 0; k < n; k++) {
    if (!this.mask[k] || Ch[k] <= 0.001) continue;
    active = true;
    if (St[k] > 0.001) {
      const st = STAINS[STAIN_KEYS[this.stT[k]]];
      const q = St[k] * Math.min(1, (st.chem === this.chT[k] ? 0.42 : 0.025) * Ch[k] * dt); St[k] -= q; L[k] += q * 0.8;
    }
    if (Fl[k] > 0.001 && this.chT[k] === 3) Fl[k] -= Fl[k] * Math.min(1, 0.4 * Ch[k] * dt);
    Ch[k] = Math.max(0, Ch[k] - dt * 0.035);
  }
  if (active) this.markAll();
};
// the rug as the customer will get it if it is handed over now: the same arithmetic as dryAll
Sim.prototype.forecast = function () {
  const t = { dust: 0, sand: 0, grime: 0, stain: 0, fluor: 0, load: 0, foam: 0, soap: 0, water: 0, residue: 0, damage: 0, bleed: 0, objs: this.objs.length, cells: 0, loadG: 0, soapR: 0 };
  for (let k = 0; k < this.n; k++) {
    if (!this.mask[k]) continue;
    t.cells++;
    let st = this.St[k], ld = this.L[k], fl = this.Fl[k];
    const c = this.Ch[k];
    if (c > 0.001) {
      if (st > 0.001) { const q = st * (1 - this.chemLeft(k)); st -= q; ld += q * 0.8; }
      if (fl > 0.001 && this.chT[k] === 3) fl *= Math.exp(-CHEM_KF * c * c);
    }
    const g = Math.min(1, this.G[k] + ld * 0.65), r = Math.min(1, this.R[k] + this.So[k] * 0.9 + this.F[k] * 0.3);
    t.grime += g; t.loadG += Math.max(0, g - this.G[k]);
    t.residue += r; t.soapR += Math.max(0, r - this.R[k]);
    t.dust += this.D[k]; t.sand += this.S[k]; t.stain += st; t.fluor += fl;
    t.damage += this.Dm[k]; t.bleed += this.B[k];
  }
  return t;
};

// drying at the end: remaining dirty water redeposits, soap becomes residue
Sim.prototype.dryAll = function () {
  for (let k = 0; k < this.n; k++) {
    if (!this.mask[k]) continue;
    if (this.Ch[k] > 0.001) this._settleChem(k);
    this.G[k] = Math.min(1, this.G[k] + this.L[k] * 0.65);
    this.R[k] = Math.min(1, this.R[k] + this.So[k] * 0.9 + this.F[k] * 0.3);
    this.L[k] = 0; this.So[k] = 0; this.F[k] = 0; this.W[k] = 0; this.Ch[k] = 0;
  }
  this.markAll();
};

Sim.prototype.computeStats = function () {
  const t = this.typeTotals();
  const total = this.totalDirt();
  const pct = clamp(1 - total / Math.max(1e-3, this.initDirt), 0, 1);
  // zones
  const zs = new Float32Array(6), zc = new Float32Array(6);
  for (let k = 0; k < this.n; k++) {
    if (!this.mask[k]) continue;
    const z = this.zone[k];
    zs[z] += this.cellDirt(k) + this.F[k] * 0.3 + this.So[k] * 0.4; zc[z]++;
  }
  const zones = [];
  for (let z = 0; z < 6; z++) if (zc[z] > 20) zones.push({ z, v: zs[z] / zc[z], cells: zc[z] });
  this.stats = { pct, t, zones, total };
  return this.stats;
};

// ---------- Floor fluid ----------
function FloorSim(sim) {
  this.sim = sim;
  this.cs = 2; // world cells per floor cell
  const mx = Math.ceil(sim.gw * 0.6), myT = Math.ceil(sim.gh * 0.18), myB = Math.ceil(sim.gh * 0.4);
  this.x0 = -mx; this.y0 = -myT;
  this.fw = Math.ceil((sim.gw + mx * 2) / this.cs); this.fh = Math.ceil((sim.gh + myT + myB) / this.cs);
  const n = this.fw * this.fh;
  this.V = new Float32Array(n); this.Lq = new Float32Array(n); this.wet = new Float32Array(n);
  this.T = new Float32Array(n); this.TL = new Float32Array(n);
  // foam lying on the floor: amount and the dirt it carries
  this.Fm = new Float32Array(n); this.FmL = new Float32Array(n); this.TF = new Float32Array(n); this.TFL = new Float32Array(n);
  this.foamAny = false;
  // silt: dirt settled on the floor from dirty water and beaten dust
  this.Sd = new Float32Array(n);
  this.hid = new Uint8Array(n);
  for (let j = 0; j < this.fh; j++) for (let i = 0; i < this.fw; i++) {
    const wx = this.x0 + (i + 0.5) * this.cs, wy = this.y0 + (j + 0.5) * this.cs;
    if (wx > 1.5 && wx < sim.gw - 1.5 && wy > sim.by0 + 1.5 && wy < sim.by1 - 1.5) this.hid[j * this.fw + i] = 1;
  }
  this.drainX = sim.gw / 2; this.drainY = sim.gh + myB * 0.55;
  this.dirty = true;
  this.snowPile = 0;
}
// f: foam volume in rug-cell units, spread bilinearly over the 4 nearest floor cells
FloorSim.prototype.addFoam = function (x, y, f, conc, cap) {
  if (!(f > 0)) return;
  const cs = this.cs;
  const fx = (x - this.x0) / cs - 0.5, fy = (y - this.y0) / cs - 0.5;
  const i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0;
  const q = f / (cs * cs);
  this._fp(i0, j0, q * (1 - ax) * (1 - ay), conc, cap);
  this._fp(i0 + 1, j0, q * ax * (1 - ay), conc, cap);
  this._fp(i0, j0 + 1, q * (1 - ax) * ay, conc, cap);
  this._fp(i0 + 1, j0 + 1, q * ax * ay, conc, cap);
  this.dirty = true; this.foamAny = true;
};
FloorSim.prototype._fp = function (i, j, a, conc, cap) {
  if (i < 0 || j < 0 || i >= this.fw || j >= this.fh || a <= 0) return;
  const k = j * this.fw + i;
  const room = (cap || 1.2) - this.Fm[k];
  if (room <= 0) return;
  if (a > room) a = room;
  this.Fm[k] += a; this.FmL[k] += a * (conc || 0);
  this.wet[k] = Math.min(1, this.wet[k] + a * 0.7 + 0.01);
};
// brushing over the edge stirs the floor foam: its dirt share moves toward conc
FloorSim.prototype.mixFoam = function (x, y, conc, k) {
  if (!this.foamAny || k <= 0) return;
  const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((y - this.y0) / this.cs);
  if (i < 0 || j < 0 || i >= this.fw || j >= this.fh) return;
  const q = j * this.fw + i, f = this.Fm[q];
  if (f < 0.01) return;
  const c = this.FmL[q] / f;
  this.FmL[q] = f * (c + (conc - c) * Math.min(1, k));
  this.dirty = true;
};
// squeegee blade drags floor foam along with it
FloorSim.prototype.sweepFoam = function (x0, y0, x1, y1, nx, ny, half, ds) {
  if (!this.foamAny) return;
  const cs = this.cs, fw = this.fw, fh = this.fh, tx = -ny, ty = nx, sim = this.sim;
  const r = half + 2;
  const i0 = Math.max(0, Math.floor((Math.min(x0, x1) - r - this.x0) / cs)), i1 = Math.min(fw - 1, Math.ceil((Math.max(x0, x1) + r - this.x0) / cs));
  const j0 = Math.max(0, Math.floor((Math.min(y0, y1) - r - this.y0) / cs)), j1 = Math.min(fh - 1, Math.ceil((Math.max(y0, y1) + r - this.y0) / cs));
  const out = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * fw + i; if (this.Fm[k] < 0.01) continue;
    const wx = this.x0 + (i + 0.5) * cs, wy = this.y0 + (j + 0.5) * cs;
    const cx = wx - x0, cy = wy - y0;
    const along = cx * nx + cy * ny, across = cx * tx + cy * ty;
    if (along < -1.2 || along > ds + 1.2 || Math.abs(across) > half) continue;
    if (sim.inRug(wx, wy)) continue;
    const a = this.Fm[k] * 0.9, al = this.FmL[k] * 0.9;
    this.Fm[k] -= a; this.FmL[k] -= al;
    out.push(across, a * cs * cs, al / (a + 1e-4));
  }
  for (let q = 0; q < out.length; q += 3) {
    const px = x1 + nx * 2.6 + tx * out[q], py = y1 + ny * 2.6 + ty * out[q];
    if (sim.inRug(px, py)) sim._deposit(px, py, 1.5, out[q + 1] * 0.5, out[q + 2], 0, 1);
    else this.addFoam(px + (Math.random() - 0.5) * 1.2, py + (Math.random() - 0.5) * 1.2, out[q + 1], out[q + 2], 2.4);
  }
  if (out.length) this.dirty = true;
};
// water jet on the floor: foam collapses into liquid
FloorSim.prototype.blastFoam = function (x, y, r, k0) {
  if (!this.foamAny) return;
  const cs = this.cs, fw = this.fw, fh = this.fh;
  const i0 = Math.max(0, Math.floor((x - r - this.x0) / cs)), i1 = Math.min(fw - 1, Math.ceil((x + r - this.x0) / cs));
  const j0 = Math.max(0, Math.floor((y - r - this.y0) / cs)), j1 = Math.min(fh - 1, Math.ceil((y + r - this.y0) / cs));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * fw + i; if (this.Fm[k] < 0.001) continue;
    const d = Math.hypot(this.x0 + (i + 0.5) * cs - x, this.y0 + (j + 0.5) * cs - y) / r;
    if (d > 1) continue;
    const q = this.Fm[k] * Math.min(1, k0 * (0.4 + (1 - d))), c = this.FmL[k] / (this.Fm[k] + 1e-4);
    this.Fm[k] -= q; this.FmL[k] -= q * c;
    this.V[k] += q * 0.35; this.Lq[k] += q * 0.35 * c; this.wet[k] = Math.min(1, this.wet[k] + q);
  }
  this.dirty = true;
};
// dust from beating settles on the floor
FloorSim.prototype.addSilt = function (x, y, a) {
  if (!(a > 0) || this.sim.snow) return;
  const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((y - this.y0) / this.cs);
  if (i < 0 || j < 0 || i >= this.fw || j >= this.fh) return;
  const k = j * this.fw + i;
  this.Sd[k] = Math.min(2, this.Sd[k] + a);
  this.dirty = true;
};
// water jet on the floor: silt lifts into the water, the washer drives the water ahead
FloorSim.prototype.washSilt = function (x, y, r, k0, nx, ny, push) {
  const cs = this.cs, fw = this.fw, fh = this.fh, Sd = this.Sd, V = this.V, Lq = this.Lq;
  const i0 = Math.max(0, Math.floor((x - r - this.x0) / cs)), i1 = Math.min(fw - 1, Math.ceil((x + r - this.x0) / cs));
  const j0 = Math.max(0, Math.floor((y - r - this.y0) / cs)), j1 = Math.min(fh - 1, Math.ceil((y + r - this.y0) / cs));
  const mi = Math.round(nx * 1.4), mj = Math.round(ny * 1.4);
  let lifted = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * fw + i;
    const d = Math.hypot(this.x0 + (i + 0.5) * cs - x, this.y0 + (j + 0.5) * cs - y) / r;
    if (d > 1) continue;
    const f = 1 - d;
    if (Sd[k] > 0.001) { const q = Sd[k] * Math.min(1, k0 * (0.35 + f)); Sd[k] -= q; Lq[k] += q; lifted += q; }
    V[k] += k0 * 0.45 * (0.3 + f);
    this.wet[k] = Math.min(1, this.wet[k] + k0 * 0.5);
    if (push > 0 && (mi || mj)) {
      const ti = i + mi, tj = j + mj;
      if (ti >= 0 && tj >= 0 && ti < fw && tj < fh) {
        const t = tj * fw + ti, fr = Math.min(0.7, k0 * push * (0.3 + f));
        const v = V[k] * fr, l = Lq[k] * fr; V[k] -= v; Lq[k] -= l; V[t] += v; Lq[t] += l;
      }
    }
  }
  this.dirty = true;
  return lifted;
};
// visible silt (outside the rug body)
FloorSim.prototype.siltVisible = function () {
  let s = 0; const Sd = this.Sd, hid = this.hid;
  for (let k = 0; k < Sd.length; k++) if (!hid[k]) s += Sd[k];
  return s;
};
// drying room: the floor gets tidied up
FloorSim.prototype.fade = function (k) {
  const m = Math.max(0, 1 - k);
  for (let q = 0; q < this.V.length; q++) { this.Fm[q] *= m; this.FmL[q] *= m; this.V[q] *= m; this.Lq[q] *= m; this.wet[q] *= m; this.Sd[q] *= m; }
  this.dirty = true;
};
FloorSim.prototype.add = function (x, y, v, l, snow, spread) {
  const cs = this.cs;
  const r = Math.max(1, (spread || 1) / cs);
  const cx = (x - this.x0) / cs, cy = (y - this.y0) / cs;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.fw - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - 1)), y1 = Math.min(this.fh - 1, Math.ceil(cy + 1));
  const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (cnt <= 0) return;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const k = j * this.fw + i; this.V[k] += v / cnt; this.Lq[k] += l / cnt; this.wet[k] = Math.min(1, this.wet[k] + v / cnt * 0.8 + 0.05);
  }
  if (snow) this.snowPile += v;
  this.dirty = true;
};
FloorSim.prototype.tick = function (dt) {
  const fw = this.fw, fh = this.fh, V = this.V, Lq = this.Lq, T = this.T, TL = this.TL, wet = this.wet, Sd = this.Sd;
  T.fill(0); TL.fill(0);
  const dx0 = (this.drainX - this.x0) / this.cs, dy0 = (this.drainY - this.y0) / this.cs;
  let any = false;
  const rate = Math.min(0.9, dt * 3.2);
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
    const k = j * fw + i;
    if (wet[k] > 0) { wet[k] = Math.max(0, wet[k] - dt * 0.012); any = true; }
    if (V[k] < 1e-4) { if (Lq[k] > 0 && !this.sim.snow) Sd[k] += Lq[k] * 0.2; V[k] = 0; Lq[k] = 0; continue; }
    any = true;
    let vx = dx0 - i, vy = dy0 - j;
    const d = Math.hypot(vx, vy);
    if (d < 1.6) { const q = V[k] * Math.min(1, dt * 4); V[k] -= q; Lq[k] -= Lq[k] * Math.min(1, dt * 4); Sd[k] *= 1 - Math.min(1, dt * 4); continue; }
    // dirt settles out of slow thin water
    if (Lq[k] > 0.001 && !this.sim.snow) { const st = Lq[k] * Math.min(1, dt * 0.1) * clamp(1 - V[k] * 6, 0.02, 1); Lq[k] -= st; Sd[k] += st * 0.5; }
    vx /= d; vy /= d;
    vy += 0.35; // floor slope toward the gutter
    const wob = Math.sin(i * 0.9 + j * 0.3) * 0.35;
    vx += wob;
    const ax = Math.abs(vx), ay = Math.abs(vy), s = ax + ay;
    const out = V[k] * rate, lout = Lq[k] * rate;
    const tx = i + (vx > 0 ? 1 : -1), ty = j + (vy > 0 ? 1 : -1);
    T[k] -= out; TL[k] -= lout;
    if (tx >= 0 && tx < fw) { T[j * fw + tx] += out * ax / s; TL[j * fw + tx] += lout * ax / s; }
    if (ty >= 0 && ty < fh) { T[ty * fw + i] += out * ay / s; TL[ty * fw + i] += lout * ay / s; }
  }
  for (let k = 0; k < fw * fh; k++) {
    if (T[k] || TL[k]) { V[k] = Math.max(0, V[k] + T[k]); Lq[k] = Math.max(0, Lq[k] + TL[k]); if (V[k] > 0.002) wet[k] = Math.min(1, wet[k] + V[k] * dt * 6); }
  }
  if (this.foamAny) this._foamTick(dt, dx0, dy0);
  if (any) this.dirty = true;
};
FloorSim.prototype._foamTick = function (dt, dx0, dy0) {
  const fw = this.fw, fh = this.fh, V = this.V, wet = this.wet, Fm = this.Fm, FmL = this.FmL, TF = this.TF, TFL = this.TFL;
  TF.fill(0); TFL.fill(0);
  let cnt = 0;
  const ride = Math.min(0.45, dt * 1.3), spread = Math.min(0.4, dt * 1.6);
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
    const k = j * fw + i;
    let f = Fm[k];
    if (f < 0.002) { if (f) { Fm[k] = 0; FmL[k] = 0; } continue; }
    cnt++;
    const c = FmL[k] / f;
    // bubbles pop: thin foam goes faster
    const dec = Math.min(f, dt * (0.007 + f * 0.016));
    f -= dec; Fm[k] = f; FmL[k] = f * c;
    wet[k] = Math.min(1, wet[k] + dec * 0.6);
    // the drain swallows it
    let vx = dx0 - i, vy = dy0 - j;
    const d = Math.hypot(vx, vy);
    if (d < 1.8) { const q = f * Math.min(1, dt * 3); Fm[k] -= q; FmL[k] -= q * c; continue; }
    // rides on running water toward the drain
    if (V[k] > 0.004) {
      vx /= d; vy /= d; vy += 0.35; vx += Math.sin(i * 0.9 + j * 0.3) * 0.35;
      const ax = Math.abs(vx), ay = Math.abs(vy), s = ax + ay;
      const m = f * ride * Math.min(1, V[k] * 5);
      const tx = i + (vx > 0 ? 1 : -1), ty = j + (vy > 0 ? 1 : -1);
      TF[k] -= m; TFL[k] -= m * c;
      if (tx >= 0 && tx < fw) { TF[j * fw + tx] += m * ax / s; TFL[j * fw + tx] += m * c * ax / s; }
      if (ty >= 0 && ty < fh) { TF[ty * fw + i] += m * ay / s; TFL[ty * fw + i] += m * c * ay / s; }
    }
    // tall heaps settle outward
    if (f > 0.95) {
      const ex = (f - 0.95) * spread;
      let moved = 0;
      if (i > 0 && Fm[k - 1] < f) { TF[k - 1] += ex / 4; TFL[k - 1] += ex / 4 * c; moved += ex / 4; }
      if (i < fw - 1 && Fm[k + 1] < f) { TF[k + 1] += ex / 4; TFL[k + 1] += ex / 4 * c; moved += ex / 4; }
      if (j > 0 && Fm[k - fw] < f) { TF[k - fw] += ex / 4; TFL[k - fw] += ex / 4 * c; moved += ex / 4; }
      if (j < fh - 1 && Fm[k + fw] < f) { TF[k + fw] += ex / 4; TFL[k + fw] += ex / 4 * c; moved += ex / 4; }
      TF[k] -= moved; TFL[k] -= moved * c;
    }
  }
  for (let k = 0; k < fw * fh; k++) if (TF[k]) { Fm[k] = Math.max(0, Fm[k] + TF[k]); FmL[k] = Math.max(0, FmL[k] + TFL[k]); }
  if (cnt) this.dirty = true; else this.foamAny = false;
};
