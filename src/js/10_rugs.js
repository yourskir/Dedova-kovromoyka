// ===== Rug pattern generator: knots -> texture =====
// zones: 0 поле, 1 медальон, 2 углы, 3 кайма, 4 бордюры, 5 бахрома
const ZONE_NAMES = ["Поле", "Медальон", "Углы", "Кайма", "Бордюры", "Бахрома"];
const ZONE_DONE = ["Поле сияет", "Медальон сияет", "Углы чистые", "Кайма чистая", "Бордюры чистые", "Бахрома белая"];

function Painter(kw, kh, seed) {
  this.kw = kw; this.kh = kh;
  this.idx = new Uint8Array(kw * kh);
  this.zone = new Uint8Array(kw * kh);
  this.rnd = mulberry(seed);
  this.seed = seed;
}
Painter.prototype.set = function (x, y, c, z) {
  if (c < 0 || x < 0 || y < 0 || x >= this.kw || y >= this.kh) return;
  const i = y * this.kw + x; this.idx[i] = c; if (z !== undefined) this.zone[i] = z;
};
Painter.prototype.get = function (x, y) { return this.idx[y * this.kw + x]; };
Painter.prototype.fill = function (c, z) { this.idx.fill(c); this.zone.fill(z || 0); };
Painter.prototype.each = function (fn) {
  for (let y = 0; y < this.kh; y++) for (let x = 0; x < this.kw; x++) {
    const r = fn(x, y);
    if (r === undefined || r === null) continue;
    if (typeof r === "number") { if (r >= 0) this.idx[y * this.kw + x] = r; }
    else if (r[0] >= 0) { this.idx[y * this.kw + x] = r[0]; if (r[1] !== undefined) this.zone[y * this.kw + x] = r[1]; }
  }
};
// bands from outside in; each band {w, z, fn(u, v, w, side, L, corner)} u: along (centered), v: across (0 outer)
Painter.prototype.frame = function (bands, a0) {
  let a = a0 || 0;
  const kw = this.kw, kh = this.kh;
  for (const b of bands) {
    for (let y = 0; y < kh; y++) for (let x = 0; x < kw; x++) {
      const dl = x, dr = kw - 1 - x, dt = y, db = kh - 1 - y;
      const d = Math.min(dl, dr, dt, db);
      if (d < a || d >= a + b.w) continue;
      const v = d - a;
      const inCornerX = (dl < a + b.w || dr < a + b.w), inCornerY = (dt < a + b.w || db < a + b.w);
      let c;
      if (b.corner && inCornerX && inCornerY) {
        const cx = (dl < a + b.w ? dl : dr) - a, cy = (dt < a + b.w ? dt : db) - a;
        c = b.corner(cx, cy, b.w);
      } else {
        let u, L, side;
        if (d === dt || d === db) { side = d === dt ? 0 : 2; L = kw - 2 * a; u = (x - a) - (L - 1) / 2; }
        else { side = d === dl ? 3 : 1; L = kh - 2 * a; u = (y - a) - (L - 1) / 2; }
        c = b.fn(u, v, b.w, side, L);
      }
      if (c !== undefined && c >= 0) this.set(x, y, c, b.z);
    }
    a += b.w;
  }
  return a;
};
Painter.prototype.stamp = function (rows, cx, cy, map, z, flipX) {
  const h = rows.length, w = rows[0].length;
  const ox = Math.round(cx - (w - 1) / 2), oy = Math.round(cy - (h - 1) / 2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][flipX ? w - 1 - i : i];
    if (ch === "." || ch === " ") continue;
    const c = map[ch];
    if (c === undefined || c < 0) continue;
    this.set(ox + i, oy + j, c, z);
  }
};

// motif helpers (return layer id, 0 = empty)
const Motif = {
  star8(dx, dy, r) {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const sq = Math.max(ax, ay) <= r * 0.62, di = ax + ay <= r;
    if (!(sq || di)) return 0;
    const inner = Math.max(ax, ay) <= r * 0.62 - 1.2 && ax + ay <= r - 1.5 || (ax + ay <= r - 1.5 && Math.max(ax, ay) <= r * 0.62);
    if (ax + ay <= r * 0.35) return 3;
    return inner ? 2 : 1;
  },
  diamond(dx, dy, r) { const m = Math.abs(dx) + Math.abs(dy); return m <= r - 1.01 ? 2 : m <= r ? 1 : 0; },
  hooked(dx, dy, r, step) {
    const ax = Math.abs(dx), ay = Math.abs(dy), m = ax + ay;
    if (m <= r - 2) return 2;
    if (m <= r) return 1;
    step = step || 4;
    if (m <= r + 3) {
      const k = ((ax - ay) % step + step) % step;
      const o = m - r;
      if (k === 0 && o <= 2) return 1;
      if (k === 1 && o === 3) return 1;
    }
    return 0;
  },
  octagon(dx, dy, rx, ry) {
    const nx = Math.abs(dx) / rx, ny = Math.abs(dy) / ry;
    const m = Math.max(nx, ny, (nx + ny) * 0.74);
    return m <= 1 ? (m <= 1 - 1.4 / Math.min(rx, ry) ? 2 : 1) : 0;
  },
  rosette(dx, dy, r, petals, phase) {
    const d = Math.hypot(dx, dy); if (d > r + 0.5) return 0;
    const a = Math.atan2(dy, dx) + (phase || 0);
    const pr = r * (0.72 + 0.28 * Math.abs(Math.cos(a * petals / 2)));
    if (d <= r * 0.28) return 3;
    if (d <= pr - 1.1) return 2;
    if (d <= pr) return 1;
    return 0;
  },
  lobed(nx, ny, lobes, amp, phase) {
    const d = Math.hypot(nx, ny), a = Math.atan2(ny, nx) + (phase || 0);
    const r = 1 - amp + amp * Math.abs(Math.cos(a * lobes / 2));
    return d / r;
  }
};

const STAMPS = {
  star: ["....1....", "...111...", ".1.121.1.", "..12221..", "112232211", "..12221..", ".1.121.1.", "...111...", "....1...."],
  smallStar: ["..1..", ".121.", "12321", ".121.", "..1.."],
  s: [".111", "1...", ".11.", "...1", "111."],
  comb: ["1.1.1.1", "1.1.1.1", "1111111"],
  boteh: ["....11.", "...1..1", "..1221.", ".12221.", "1223221", "1222221", "1222221", ".12221.", "..111.."],
  flower: [".1.1.", "11211", ".121.", "11211", ".1.1."],
  cross: ["..1..", "..1..", "11211", "..1..", "..1.."],
  tree: ["...1...", "..121..", ".12221.", "..121..", ".12221.", "1222221", "...3...", "...3..."],
  dog: ["1.....1", "11111.1", ".1111..", ".1..1..", ".1..1.."],
  bird: ["..11...", ".1111.1", "1111111", "..11...", "..1.1.."],
  wine: ["1.....1", ".1...1.", "..121..", "...2...", "...2...", "..222.."],
  hookS: ["111..", "1....", "11111", "....1", "..111"],
};

// Pixel font for inscriptions (5x7)
const PIXFONT = {
  "С": [".111.", "1...1", "1....", "1....", "1....", "1...1", ".111."],
  "Е": ["11111", "1....", "1....", "1111.", "1....", "1....", "11111"],
  "Ё": [".1.1.", ".....", "11111", "1....", "1111.", "1....", "11111"],
  "М": ["1...1", "11.11", "1.1.1", "1.1.1", "1...1", "1...1", "1...1"],
  "Н": ["1...1", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  "В": ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
  "Р": ["1111.", "1...1", "1...1", "1111.", "1....", "1....", "1...."],
  "А": [".111.", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  "И": ["1...1", "1..11", "1.1.1", "1.1.1", "11..1", "1...1", "1...1"],
  "+": [".....", "..1..", "..1..", "11111", "..1..", "..1..", "....."],
  "1": ["..1..", ".11..", "..1..", "..1..", "..1..", "..1..", ".111."],
  "9": [".111.", "1...1", "1...1", ".1111", "....1", "...1.", ".11.."],
  "7": ["11111", "....1", "...1.", "..1..", ".1...", ".1...", ".1..."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};
function drawText(P, text, cx, cy, c, z) {
  const w = text.length * 6 - 1;
  let x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 3);
  for (const ch of text) {
    const g = PIXFONT[ch] || PIXFONT[" "];
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === "1") P.set(x0 + i, y0 + j, c, z);
    x0 += 6;
  }
}

// ---------- STYLES ----------
const PALS = {
  kazak: ["#9E2B25", "#1F2B4D", "#EADFC6", "#D0A24A", "#4C6B45", "#2A1D18", "#C8662D", "#6F95BD"],
  shirvan: ["#1F2B4D", "#A0322B", "#E8DCC0", "#C99A42", "#4F7048", "#2A1D18", "#7EA3C4", "#C86B5B"],
  persian: ["#8C2324", "#1C2748", "#EAD9BA", "#C99A45", "#7E9FC0", "#4E6B4B", "#C77466", "#3A2019", "#5E1716"],
  soviet: ["#7A1B26", "#1B1513", "#D8C29E", "#C39A50", "#2D4A38", "#B8665F", "#2C4468", "#5A1119", "#E9DDC3"],
  bukhara: ["#8A2222", "#5E1515", "#1E2542", "#E6D7B8", "#C96A2B", "#221917", "#3F5E48", "#B34A3A"],
  kilim: ["#B8342A", "#D9772F", "#26345C", "#E8DCC2", "#2B211C", "#3F6B4E", "#E2B04A", "#7C2A2A"],
  beni: ["#EEE6D4", "#3A2E26", "#D9CEB8", "#5B4B3F"],
  silk: ["#EEE2C6", "#9BB5C6", "#C9A259", "#D59A93", "#93A77C", "#2E3C5C", "#F6EFDF", "#B6806A"],
  hotel: ["#1C4A4D", "#C9A24E", "#E9DCC0", "#A5532E", "#123436", "#7FA69E", "#2E6A6C"],
  grandpa: ["#A32C26", "#1E2C52", "#E9DDC3", "#CFA048", "#4E6E47", "#C9776A", "#3A2419", "#6C8DB8"],
  kids: [],
  sun: ["#5DA9E0", "#E5493B", "#F7F2E4", "#F6C63B", "#63B055", "#3F8C45", "#3A2A20", "#B85FC0", "#F39A2E", "#79BDE8"],
};

function genKazak(P, opt) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const pole = (u, v, w) => (((Math.round(u) + v) % 4 + 4) % 4 < 2 ? 2 : 0);
  const inner = P.frame([
    { w: 1, z: 4, fn: () => 5 },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) + v) % 4) + 4) % 4 < 2 ? 2 : 1) },
    { w: 1, z: 4, fn: () => 5 },
    {
      w: 13, z: 3,
      fn: (u, v, w, side) => {
        const P2 = 14; const uu = ((Math.round(u) % P2) + P2 + P2 / 2) % P2 - P2 / 2; const vv = v - (w - 1) / 2;
        const k = Math.floor((Math.round(u) + P2 / 2) / P2);
        const cols = [1, 0, 4, 1, 6, 0];
        const m = Motif.star8(uu, vv, 5.4);
        if (m === 3) return 3;
        if (m === 2) return cols[((k % 6) + 6 + side) % 6];
        if (m === 1) return 5;
        if (Math.abs(uu) >= 6 && Math.abs(vv) <= 1) return Math.abs(vv) === 0 ? 0 : 5;
        return 2;
      },
      corner: (cx, cy, w) => { const m = Motif.star8(cx - 6, cy - 6, 5.4); return m === 3 ? 3 : m === 2 ? 0 : m === 1 ? 5 : 2; }
    },
    { w: 1, z: 4, fn: () => 5 },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) - v) % 4) + 4) % 4 < 2 ? 3 : 0) },
    { w: 1, z: 4, fn: () => 5 },
  ]);
  const fx0 = inner, fy0 = inner, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner;
  const cx = (kw - 1) / 2, cy = (kh - 1) / 2;
  const fh = fy1 - fy0, fw = fx1 - fx0;
  const n = opt.meds || (fh > fw * 1.3 ? 3 : 1);
  const meds = [];
  const R = Math.min(fw * 0.36, n === 1 ? fh * 0.3 : fh / (n * 2.4));
  for (let i = 0; i < n; i++) meds.push({ x: cx, y: fy0 + fh * (i + 0.5) / n, r: R * (n > 1 && i !== (n - 1) / 2 ? 0.86 : 1), c: [1, 4, 1, 6][i % 4] });
  if (n === 3) { meds[0].c = 4; meds[1].c = 1; meds[2].c = 4; }
  // stems between medallions
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    if (n > 1 && Math.abs(x - cx) <= 1 && y > meds[0].y && y < meds[n - 1].y) return [Math.abs(x - cx) < 0.6 ? 3 : 5, 1];
  });
  for (const m of meds) {
    P.each((x, y) => {
      const dx = x - m.x, dy = (y - m.y) * 0.9;
      const l = Motif.hooked(dx, dy, m.r, 4);
      if (!l) return;
      if (l === 1) return [5, 1];
      const l2 = Motif.hooked(dx, dy, m.r * 0.55, 3);
      if (l2 === 1) return [3, 1];
      if (l2 === 2) {
        const st = Motif.star8(dx, dy, m.r * 0.32);
        if (st === 3) return [0, 1];
        if (st === 2) return [2, 1];
        if (st === 1) return [5, 1];
        return [0, 1];
      }
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if ((ax + ay) % 5 === 0 && ax > 1 && ay > 1) return [2, 1];
      return [m.c, 1];
    });
  }
  // scattered field motifs
  const occ = (x, y, r) => {
    for (const m of meds) if (Math.abs(x - m.x) + Math.abs(y - m.y) * 0.9 < m.r + r + 4) return true;
    return x - r < fx0 + 2 || x + r > fx1 - 2 || y - r < fy0 + 2 || y + r > fy1 - 2 || (n > 1 && Math.abs(x - cx) < r + 3);
  };
  const placed = [];
  const kinds = ["star", "smallStar", "s", "comb", "flower", "dog", "bird", "cross", "wine"];
  const colsF = [2, 1, 3, 4, 7, 6];
  for (let t = 0; t < 900 && placed.length < (opt.scatter || 26); t++) {
    const x = fx0 + 4 + P.rnd() * (fw - 8), y = fy0 + 4 + P.rnd() * (fh - 8);
    const k = kinds[Math.floor(P.rnd() * kinds.length)], r = STAMPS[k].length / 2 + 1;
    if (occ(x, y, r)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r + 2.5)) continue;
    placed.push({ x, y, r });
    const c1 = colsF[Math.floor(P.rnd() * colsF.length)], c2 = colsF[Math.floor(P.rnd() * colsF.length)];
    P.stamp(STAMPS[k], x, y, { 1: c1, 2: c2 === c1 ? 2 : c2, 3: 5 }, 0, P.rnd() < 0.5);
  }
}

function genShirvan(P) {
  // small doormat: three hooked diamonds in a row on navy, rust border with S motifs
  P.fill(0, 0);
  const inner = P.frame([
    { w: 1, z: 4, fn: () => 5 },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) + v) % 4) + 4) % 4 < 2 ? 2 : 1) },
    {
      w: 9, z: 3,
      fn: (u, v, w, side) => {
        const P2 = 8; const uu = ((Math.round(u) % P2) + P2 + P2 / 2) % P2 - P2 / 2; const vv = v - (w - 1) / 2;
        const g = STAMPS.hookS; const gx = uu + 2, gy = vv + 2;
        if (gx >= 0 && gx < 5 && gy >= 0 && gy < 5 && g[gy][gx] === "1") return side % 2 ? 3 : 2;
        return 1;
      },
      corner: (cx, cy) => { const m = Motif.star8(cx - 4, cy - 4, 3.6); return m === 3 ? 7 : m ? 3 : 1; }
    },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) - v) % 4) + 4) % 4 < 2 ? 2 : 5) },
  ]);
  const cx = (P.kw - 1) / 2, fy0 = inner, fy1 = P.kh - 1 - inner, fh = fy1 - fy0;
  const r = Math.min((P.kw - 2 * inner) * 0.34, fh / 7.2);
  const cols = [1, 4, 7];
  for (let i = 0; i < 3; i++) {
    const my = fy0 + fh * (i + 0.5) / 3;
    P.each((x, y) => {
      const dx = x - cx, dy = y - my;
      const l = Motif.hooked(dx, dy, r, 3);
      if (!l) return;
      if (l === 1) return [2, 1];
      const s = Motif.star8(dx, dy, r * 0.5);
      if (s === 3) return [3, 1]; if (s === 2) return [2, 1]; if (s === 1) return [5, 1];
      return [cols[i], 1];
    });
  }
  const pts = [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82], [0.2, 0.5], [0.8, 0.5], [0.18, 0.34], [0.82, 0.66], [0.82, 0.34], [0.18, 0.66]];
  for (const [px, py] of pts) P.stamp(STAMPS.smallStar, inner + (P.kw - 2 * inner) * px, fy0 + fh * py, { 1: 2, 2: 3, 3: 1 }, 0);
}

function genPersian(P, opt) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const inner = P.frame([
    { w: 2, z: 4, fn: (u, v) => (v === 0 ? 7 : 1) },
    { w: 3, z: 4, fn: (u, v) => { const k = ((Math.round(u) % 4) + 4) % 4; return v === 1 && k === 0 ? 3 : 2; } },
    {
      w: 18, z: 3,
      fn: (u, v, w, side, L) => {
        const Pn = 22; const k = Math.floor((u + Pn / 2) / Pn); const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2;
        // vine
        const vy = Math.sin((u / Pn) * TAU) * 5;
        if (Math.abs(vv - vy) < 0.75) return 3;
        if (k % 2 === 0) {
          const m = Motif.rosette(uu, vv, 6.2, 8, 0.3);
          if (m === 3) return 3; if (m === 2) return 0; if (m === 1) return 2;
        } else {
          // palmette: fan
          const d = Math.hypot(uu, vv + 4), a = Math.atan2(vv + 4, uu);
          if (d < 8 && a > 0.3 && a < Math.PI - 0.3) {
            const band = Math.floor(d / 2);
            return band % 2 === 0 ? 6 : (Math.abs(Math.sin(a * 5)) < 0.3 ? 2 : 0);
          }
        }
        // small leaves
        const lx = uu - (k % 2 ? -8 : 8), ly = vv - vy * 0.5;
        if ((lx * lx) / 5 + (ly * ly) / 1.5 < 1.2) return 5;
        return 1;
      },
      corner: (cx, cy, w) => { const m = Motif.rosette(cx - 8.5, cy - 8.5, 7.5, 10, 0); return m === 3 ? 3 : m === 2 ? 6 : m === 1 ? 2 : 1; }
    },
    { w: 3, z: 4, fn: (u, v) => { const k = ((Math.round(u) % 3) + 3) % 3; return v === 1 && k === 0 ? 0 : 2; } },
    { w: 1, z: 4, fn: () => 7 },
  ]);
  const fx0 = inner, fy0 = inner, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner;
  const cx = (kw - 1) / 2, cy = (kh - 1) / 2, fw = fx1 - fx0, fh = fy1 - fy0;
  // field lattice (herati-like)
  const cell = 14;
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const lx = ((x - cx) % cell + cell * 10.5) % cell - cell / 2, ly = ((y - cy) % cell + cell * 10.5) % cell - cell / 2;
    const gx = Math.floor((x - cx + cell / 2) / cell), gy = Math.floor((y - cy + cell / 2) / cell);
    const alt = (gx + gy) & 1;
    const m = Motif.rosette(lx, ly, 2.6, 6, 0);
    if (m === 3) return [3, 0];
    if (m) return [alt ? 2 : 4, 0];
    // diamond lattice lines w/ leaves
    const dd = Math.abs(Math.abs(lx) + Math.abs(ly) - cell / 2);
    if (dd < 0.6) return [8, 0];
    const lf = Math.abs(lx) - Math.abs(ly);
    if (Math.abs(Math.abs(lx) - 4.2) < 1.3 && Math.abs(Math.abs(ly) - 4.2) < 1.3 && Math.abs(lf) < 1.2) return [alt ? 5 : 6, 0];
  });
  // spandrels
  const sw = fw * 0.34, sh = fh * 0.2;
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const dx = Math.min(x - fx0, fx1 - x), dy = Math.min(y - fy0, fy1 - y);
    const nx = dx / sw, ny = dy / sh;
    const q = Motif.lobed(nx, ny, 12, 0.1, 0);
    if (q < 1) {
      if (q > 0.93) return [2, 2];
      if (q > 0.88) return [3, 2];
      const m = Motif.rosette(dx - sw * 0.35, dy - sh * 0.35, 3.2, 8, 0);
      if (m === 3) return [3, 2]; if (m) return [6, 2];
      if (((x + y) % 6 === 0) && q < 0.8) return [4, 2];
      return [1, 2];
    }
  });
  // central medallion
  const Rx = fw * 0.36, Ry = fh * 0.24;
  P.each((x, y) => {
    const dx = x - cx, dy = y - cy;
    const nx = dx / Rx, ny = dy / Ry;
    let q = Motif.lobed(nx, ny, 16, 0.12, 0);
    // pendants
    const pend = Math.abs(dx) < 4.5 - Math.max(0, Math.abs(dy) - Ry * 1.05) * 0.5 && Math.abs(dy) < Ry * 1.34;
    const pcap = Math.hypot(dx, Math.abs(dy) - Ry * 1.3) < 4.2;
    if (q > 1 && !pend && !pcap) return;
    if (q > 1) { if (pcap) return [Math.hypot(dx, Math.abs(dy) - Ry * 1.3) < 2 ? 3 : 1, 1]; return [Math.abs(dx) < 1.5 ? 3 : 1, 1]; }
    if (q > 0.94) return [2, 1];
    if (q > 0.89) return [3, 1];
    const d2 = Math.hypot(nx, ny);
    if (d2 < 0.22) { const m = Motif.rosette(dx, dy, Math.min(Rx, Ry) * 0.22, 8, 0); return [m === 3 ? 3 : m === 2 ? 0 : m ? 2 : 1, 1]; }
    if (Math.abs(d2 - 0.5) < 0.05) return [3, 1];
    if (d2 > 0.5 && d2 < 0.85) {
      const a = Math.atan2(ny, nx); const k = Math.round(a / (TAU / 12)); const ca = k * TAU / 12;
      const px = Math.cos(ca) * 0.68 * Rx, py = Math.sin(ca) * 0.68 * Ry;
      const m = Motif.rosette(dx - px, dy - py, 3.2, 6, 0);
      if (m === 3) return [3, 1]; if (m) return [k % 2 ? 6 : 4, 1];
      return [1, 1];
    }
    if (d2 <= 0.5) {
      const a = Math.atan2(ny, nx);
      if (Math.abs(Math.sin(a * 4)) < 0.18) return [5, 1];
      return [0, 1];
    }
    return [1, 1];
  });
}

function genSoviet(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const inner = P.frame([
    { w: 2, z: 4, fn: () => 1 },
    { w: 1, z: 4, fn: () => 2 },
    {
      w: 19, z: 3,
      fn: (u, v, w, side) => {
        const Pn = 18; const k = Math.floor((u + Pn / 2) / Pn); const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2;
        const m = Motif.rosette(uu, vv, 6.4, 10, 0.3);
        if (m === 3) return 3; if (m === 2) return (k & 1) ? 5 : 2; if (m === 1) return 7;
        // scroll leaves
        const lv = Math.sin((uu / Pn) * TAU * 2) * 3.5;
        if (Math.abs(uu) > 6.5 && Math.abs(vv - lv) < 1.2) return 4;
        if (Math.abs(uu) > 6.5 && Math.abs(vv + lv) < 0.7) return 3;
        if ((Math.abs(vv) > 7.5)) return 7;
        return 1;
      },
      corner: (cx, cy, w) => { const m = Motif.rosette(cx - 9, cy - 9, 8, 12, 0); return m === 3 ? 3 : m === 2 ? 5 : m ? 2 : 1; }
    },
    { w: 1, z: 4, fn: () => 2 },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) % 3) + 3) % 3 === 0) ? 3 : 1) },
    { w: 1, z: 4, fn: () => 2 },
  ]);
  const fx0 = inner, fy0 = inner, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner;
  const cx = (kw - 1) / 2, cy = (kh - 1) / 2, fw = fx1 - fx0, fh = fy1 - fy0;
  // symmetric scattered sprigs (machine carpet)
  const sprigs = [];
  for (let t = 0; t < 400 && sprigs.length < 10; t++) {
    const x = P.rnd() * fw / 2, y = P.rnd() * fh / 2;
    const r = 3 + P.rnd() * 2.5;
    if (Math.hypot(x / (fw * 0.34), y / (fh * 0.28)) < 1.12) continue;
    if (x < 5 || y < 5) continue;
    if (sprigs.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + r + 5)) continue;
    sprigs.push({ x, y, r, c: [2, 5, 3, 6][Math.floor(P.rnd() * 4)] });
  }
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const ax = Math.abs(x - cx), ay = Math.abs(y - cy);
    for (const s of sprigs) {
      const dx = ax - (fw / 2 - s.x), dy = ay - (fh / 2 - s.y);
      const m = Motif.rosette(dx, dy, s.r, 8, 0);
      if (m === 3) return [3, 0]; if (m === 2) return [s.c, 0]; if (m === 1) return [7, 0];
      if (Math.abs(dy - Math.sin(dx * 0.6) * 1.2) < 0.6 && Math.abs(dx) < s.r * 2.2 && Math.abs(dx) > s.r) return [4, 0];
    }
    // subtle field lattice
    if (((Math.round(ax) + Math.round(ay)) % 16 === 0) && ((Math.round(ax) - Math.round(ay)) % 4 === 0)) return [7, 0];
  });
  // corner quarter medallions
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const dx = Math.min(x - fx0, fx1 - x), dy = Math.min(y - fy0, fy1 - y);
    const q = Motif.lobed(dx / (fw * 0.26), dy / (fh * 0.17), 10, 0.16, 0);
    if (q < 1) {
      if (q > 0.9) return [2, 2];
      if (q > 0.84) return [1, 2];
      const m = Motif.rosette(dx - 1, dy - 1, 7, 8, 0);
      if (m === 3) return [3, 2]; if (m === 2) return [5, 2]; if (m) return [2, 2];
      if (q > 0.55 && q < 0.62) return [3, 2];
      return [6, 2];
    }
  });
  // big central medallion
  const Rx = fw * 0.36, Ry = fh * 0.3;
  P.each((x, y) => {
    const dx = x - cx, dy = y - cy, nx = dx / Rx, ny = dy / Ry;
    const q = Motif.lobed(nx, ny, 8, 0.28, 0);
    if (q > 1) return;
    if (q > 0.95) return [2, 1];
    if (q > 0.91) return [1, 1];
    const q2 = Motif.lobed(nx, ny, 8, 0.28, Math.PI / 8);
    if (q2 < 0.62) {
      if (q2 > 0.57) return [3, 1];
      if (q2 < 0.2) { const m = Motif.rosette(dx, dy, Math.min(Rx, Ry) * 0.2, 12, 0); return [m === 3 ? 3 : m === 2 ? 0 : m ? 2 : 1, 1]; }
      const a = Math.atan2(ny, nx), k = Math.round(a / (TAU / 8)), ca = k * TAU / 8;
      const m = Motif.rosette(dx - Math.cos(ca) * Rx * 0.36, dy - Math.sin(ca) * Ry * 0.36, 3.4, 6, 0);
      if (m === 3) return [3, 1]; if (m) return [2, 1];
      return [8, 1];
    }
    const a = Math.atan2(ny, nx), k = Math.round(a / (TAU / 16)), ca = k * TAU / 16;
    const m = Motif.rosette(dx - Math.cos(ca) * Rx * 0.76, dy - Math.sin(ca) * Ry * 0.76, 2.8, 6, 0.5);
    if (m === 3) return [3, 1]; if (m) return [k & 1 ? 5 : 2, 1];
    return [7, 1];
  });
}

function genBukhara(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const elem = 12;
  const inner = P.frame([
    { w: 2, z: 4, fn: (u, v) => (v === 0 ? 5 : 1) },
    {
      w: 13, z: 3,
      fn: (u, v, w) => {
        const Pn = 12; const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2;
        const k = Math.floor((u + Pn / 2) / Pn);
        const o = Motif.octagon(uu, vv, 4.6, 4.2);
        if (o === 1) return 3;
        if (o === 2) { if (Math.abs(uu) < 1 || Math.abs(vv) < 1) return 5; return (uu > 0) === (vv > 0) ? (k & 1 ? 2 : 4) : 3; }
        if (Math.abs(uu) >= 5 && Math.abs(vv) < 1) return 3;
        return 1;
      },
      corner: (cx, cy) => { const o = Motif.octagon(cx - 6, cy - 6, 4.6, 4.2); return o === 1 ? 3 : o === 2 ? 4 : 1; }
    },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) + v) % 3) + 3) % 3 === 0 ? 3 : 5) },
  ]);
  const fx0 = inner, fy0 = inner + elem, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner - elem;
  // elem panels
  P.each((x, y) => {
    if (x < fx0 || x > fx1) return;
    const inTop = y >= inner && y < fy0, inBot = y > fy1 && y <= kh - 1 - inner;
    if (!inTop && !inBot) return;
    const ly = inTop ? y - inner : kh - 1 - inner - y;
    const lx = ((x - fx0) % 8) - 4;
    if (ly === 0 || ly === elem - 1) return [5, 4];
    const g = STAMPS.tree; const gx = lx + 3, gy = ly - 2;
    if (gx >= 0 && gx < 7 && gy >= 0 && gy < 8 && g[gy][gx] !== ".") return [g[gy][gx] === "1" ? 3 : g[gy][gx] === "2" ? 4 : 5, 4];
    return [1, 4];
  });
  const fw = fx1 - fx0, fh = fy1 - fy0;
  const cols = Math.max(3, Math.round(fw / 34)), rows = Math.max(4, Math.round(fh / 26));
  const gw = fw / cols, gh = fh / rows;
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const gx = Math.floor((x - fx0) / gw), gy = Math.floor((y - fy0) / gh);
    const lx = x - fx0 - (gx + 0.5) * gw, ly = y - fy0 - (gy + 0.5) * gh;
    const rx = gw * 0.42, ry = gh * 0.38;
    // lattice lines connecting güls
    if (Math.abs(ly) < 0.6 || (Math.abs(lx) < 0.6 && Math.abs(ly) > ry)) return [1, 0];
    const o = Motif.octagon(lx, ly, rx, ry);
    const z = 1;
    if (o === 1) return [5, z];
    if (o === 2) {
      const o2 = Motif.octagon(lx, ly, rx * 0.45, ry * 0.45);
      if (o2 === 1) return [5, z];
      if (o2 === 2) { const d = Motif.diamond(lx, ly, Math.min(rx, ry) * 0.3); return [d === 2 ? 4 : d === 1 ? 3 : 2, z]; }
      const q = (lx > 0) === (ly > 0);
      if (Math.abs(lx) < 0.6 || Math.abs(ly) < 0.6) return [3, z];
      // hooks in quarters
      const hx = Math.abs(lx) - rx * 0.62, hy = Math.abs(ly) - ry * 0.62;
      if (Math.abs(hx) + Math.abs(hy) < 2.2) return [q ? 3 : 4, z];
      return [q ? 2 : 7, z];
    }
    // minor gül between rows
    const mx = x - fx0 - (gx + (lx > 0 ? 1 : 0)) * gw, my = y - fy0 - (gy + (ly > 0 ? 1 : 0)) * gh;
    const d = Motif.diamond(mx, my, Math.min(gw, gh) * 0.16);
    if (d === 1) return [3, 0]; if (d === 2) return [2, 0];
  });
}

function genKilim(P) {
  const { kw, kh } = P;
  P.fill(3, 0);
  const bandH = Math.round(kh / 11);
  P.each((x, y) => {
    const d = Math.min(x, kw - 1 - x);
    if (d < 5) return [((Math.floor(y / 3)) % 2 ? 4 : 0), 3];
    const b = Math.floor(y / bandH);
    const ly = y % bandH;
    const bc = [0, 2, 0, 1, 3, 0, 3, 1, 0, 2, 0][b % 11];
    if (ly < 2) return [4, 4];
    // stepped diamond chains
    const cxs = (kw - 1) / 2;
    const period = 22;
    const lx = ((x - cxs) % period + period * 20 + period / 2) % period - period / 2;
    const ry = (bandH - 2) / 2;
    const m = Math.abs(lx) * (ry / (period / 2)) + Math.abs(ly - 2 - ry + 0.5);
    const step = Math.round(m);
    if (step <= ry * 0.35) return [4, b % 3 === 1 ? 1 : 0];
    if (step <= ry * 0.62) return [b % 2 ? 6 : 3, b % 3 === 1 ? 1 : 0];
    if (step <= ry * 0.9) return [b % 2 ? 2 : 5, b % 3 === 1 ? 1 : 0];
    if (step <= ry * 1.02) return [4, 0];
    // small hooks
    if ((x + b * 3) % 11 === 0 && ly > 3 && ly < bandH - 2) return [3, 0];
    return [bc, 0];
  });
}

function genBeni(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const rnd = P.rnd;
  const cells = 5, cw = kw / cells;
  const wob = (y, s) => Math.sin(y * 0.11 + s) * 1.6 + Math.sin(y * 0.037 + s * 2.1) * 2.2;
  P.each((x, y) => {
    const e = Math.min(x, kw - 1 - x, y, kh - 1 - y);
    if (e < 3) return [2, 4];
    const u = x / cw, v = y / (cw * 1.3);
    const fu = u + v, fv = u - v;
    const du = Math.abs(fu - Math.round(fu)) * cw, dv = Math.abs(fv - Math.round(fv)) * cw;
    const wv = wob(y, Math.round(fu) * 1.7) * 0.25;
    const lw = 1.0 + 0.5 * Math.sin(y * 0.09 + x * 0.03);
    if (du + wv < lw || dv - wv < lw) {
      if (hash2(Math.round(fu * 3), Math.round(v * 6), 7) < 0.08) return;
      return [1, 1];
    }
    // small x marks in centers
    const cxu = Math.abs(fu - Math.floor(fu) - 0.5) * cw, cxv = Math.abs(fv - Math.floor(fv) - 0.5) * cw;
    if (cxu < 1.5 && cxv < 1.5 && hash2(Math.floor(fu), Math.floor(fv), 3) < 0.5) return [3, 0];
  });
}

function genSilk(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const inner = P.frame([
    { w: 3, z: 4, fn: (u, v) => (v === 1 ? 2 : 5) },
    { w: 4, z: 4, fn: (u, v) => { const k = ((Math.round(u) % 5) + 5) % 5; return (v === 1 || v === 2) && k === 0 ? 3 : 6; } },
    {
      w: 26, z: 3,
      fn: (u, v, w) => {
        const Pn = 30; const k = Math.floor((u + Pn / 2) / Pn); const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2;
        const vy = Math.sin((u / Pn) * TAU) * 7;
        if (Math.abs(vv - vy) < 0.8) return 2;
        const m = Motif.rosette(uu, vv, 8.5, 12, 0.2);
        if (m === 3) return 2; if (m === 2) return k & 1 ? 3 : 1; if (m === 1) return 6;
        const lx = uu - (k % 2 ? -11 : 11), ly = vv - vy * 0.4;
        if ((lx * lx) / 9 + (ly * ly) / 2.2 < 1.2) return 4;
        const tx = uu - (k % 2 ? 11 : -11), ty = vv + vy * 0.6;
        if (Math.hypot(tx, ty) < 2.2) return 3;
        return 5;
      },
      corner: (cx, cy) => { const m = Motif.rosette(cx - 12.5, cy - 12.5, 11, 12, 0); return m === 3 ? 2 : m === 2 ? 3 : m ? 6 : 5; }
    },
    { w: 4, z: 4, fn: (u, v) => { const k = ((Math.round(u) % 4) + 4) % 4; return (v === 1 || v === 2) && k < 2 ? 1 : 6; } },
    { w: 2, z: 4, fn: () => 2 },
  ]);
  const fx0 = inner, fy0 = inner, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner;
  const cx = (kw - 1) / 2, cy = (kh - 1) / 2, fw = fx1 - fx0, fh = fy1 - fy0;
  // field: fine scrolling vines + flowers
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const ax = Math.abs(x - cx), ay = Math.abs(y - cy);
    const s1 = Math.sin(ax * 0.13 + Math.sin(ay * 0.07) * 2) * 9 + ay * 0.5;
    const ph = ((s1 % 18) + 18) % 18;
    if (ph < 0.9) return [4, 0];
    const gx = Math.round(ax / 13), gy = Math.round(ay / 13);
    const m = Motif.rosette(ax - gx * 13, ay - gy * 13, 3.3, 6, (gx + gy) * 0.5);
    if (m === 3) return [2, 0]; if (m === 2) return [(gx + gy) % 3 === 0 ? 3 : (gx + gy) % 3 === 1 ? 1 : 7, 0]; if (m === 1) return [2, 0];
  });
  // spandrels
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const dx = Math.min(x - fx0, fx1 - x), dy = Math.min(y - fy0, fy1 - y);
    const q = Motif.lobed(dx / (fw * 0.3), dy / (fh * 0.2), 14, 0.1, 0);
    if (q < 1) {
      if (q > 0.94) return [2, 2];
      if (q > 0.9) return [6, 2];
      const m = Motif.rosette(dx - fw * 0.1, dy - fh * 0.07, 5, 10, 0);
      if (m === 3) return [2, 2]; if (m === 2) return [3, 2]; if (m) return [6, 2];
      if (Math.abs(Math.sin(dx * 0.4) * 3 - (dy - 6)) < 0.8) return [4, 2];
      return [1, 2];
    }
  });
  // medallion: multi-ring rosette
  const Rx = fw * 0.3, Ry = fh * 0.22;
  P.each((x, y) => {
    const dx = x - cx, dy = y - cy, nx = dx / Rx, ny = dy / Ry;
    const q = Motif.lobed(nx, ny, 20, 0.1, 0);
    if (q > 1.0) {
      const pend = Math.abs(dx) < 3 && Math.abs(dy) < Ry * 1.35;
      if (pend) return [Math.abs(dx) < 1 ? 2 : 5, 1];
      return;
    }
    if (q > 0.95) return [2, 1];
    if (q > 0.92) return [5, 1];
    const d = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
    const ring = Math.floor(d * 6);
    if (Math.abs(d * 6 - Math.round(d * 6)) < 0.08) return [2, 1];
    const petal = Math.abs(Math.cos(a * (4 + ring * 2)));
    if (ring === 0) return [petal > 0.5 ? 3 : 6, 1];
    if (petal > 0.72) return [[3, 1, 4, 7, 3][ring % 5], 1];
    return [ring % 2 ? 6 : 0, 1];
  });
}

function genHotel(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const inner = P.frame([
    { w: 3, z: 4, fn: () => 4 },
    { w: 2, z: 4, fn: () => 1 },
    { w: 10, z: 3, fn: (u, v, w) => { const Pn = 12; const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2; const d = Math.abs(uu) + Math.abs(vv); if (d < 3) return 3; if (d < 4) return 1; if (Math.abs(vv) < 0.6) return 1; return 6; } },
    { w: 2, z: 4, fn: () => 1 },
    { w: 3, z: 4, fn: () => 4 },
  ]);
  const fx0 = inner, fy0 = inner, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner;
  const cell = 24;
  P.each((x, y) => {
    if (x < fx0 || x > fx1 || y < fy0 || y > fy1) return;
    const gx = Math.floor((x - fx0) / cell), gy = Math.floor((y - fy0) / cell);
    const lx = (x - fx0) - gx * cell, ly = (y - fy0) - gy * cell;
    const flip = (gx + gy) & 1;
    const ox = flip ? cell - lx : lx, oy = cell - ly;
    const d = Math.hypot(ox, oy);
    if (d < cell) {
      const ring = Math.floor(d / 3);
      if (d % 3 < 0.9) return [1, 1];
      if (ring === 0) return [3, 1];
      if (ring % 2 === 1) return [2, 1];
      return [5, 1];
    }
  });
}

function genGrandpa(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const inner = P.frame([
    { w: 1, z: 4, fn: () => 6 },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) + v) % 4) + 4) % 4 < 2 ? 2 : 1) },
    { w: 1, z: 4, fn: () => 6 },
    {
      w: 15, z: 3,
      fn: (u, v, w, side) => {
        const Pn = 16; const k = Math.floor((u + Pn / 2) / Pn); const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2;
        const o = Motif.hooked(uu, vv * 1.1, 4.2, 3);
        if (o === 1) return 6;
        if (o === 2) { const s = Motif.star8(uu, vv, 2.6); return s === 3 ? 3 : s ? 2 : [1, 4, 0, 7][((k % 4) + 4) % 4]; }
        if (Math.abs(uu) > 6 && Math.abs(vv) < 1) return 5;
        return 2;
      },
      corner: (cx, cy) => { const m = Motif.star8(cx - 7, cy - 7, 6); return m === 3 ? 3 : m === 2 ? 1 : m ? 6 : 2; }
    },
    { w: 1, z: 4, fn: () => 6 },
    { w: 2, z: 4, fn: (u, v) => ((((Math.round(u) - v) % 4) + 4) % 4 < 2 ? 3 : 0) },
    { w: 1, z: 4, fn: () => 6 },
  ]);
  const fx0 = inner, fy0 = inner, fx1 = kw - 1 - inner, fy1 = kh - 1 - inner;
  const cx = (kw - 1) / 2, cy = (kh - 1) / 2, fw = fx1 - fx0, fh = fy1 - fy0;
  // two medallions top & bottom
  const R = Math.min(fw * 0.3, fh * 0.14);
  for (const my of [fy0 + fh * 0.2, fy0 + fh * 0.8]) {
    P.each((x, y) => {
      const dx = x - cx, dy = y - my;
      const l = Motif.hooked(dx, dy, R, 4);
      if (!l) return;
      if (l === 1) return [6, 1];
      const o = Motif.octagon(dx, dy, R * 0.5, R * 0.5);
      if (o === 1) return [3, 1];
      if (o === 2) { const s = Motif.star8(dx, dy, R * 0.34); return [s === 3 ? 0 : s === 2 ? 2 : s ? 6 : 7, 1]; }
      return [1, 1];
    });
  }
  // cartouche with inscription
  const cw = Math.min(fw - 10, 76), ch = 26;
  P.each((x, y) => {
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    if (dx > cw / 2 + 3 || dy > ch / 2 + 3) return;
    const edge = Math.max(dx - cw / 2, dy - ch / 2);
    if (edge > 0) { if (((x + y) & 1) === 0) return [3, 1]; return [6, 1]; }
    if (edge > -1.5) return [6, 1];
    return [2, 1];
  });
  drawText(P, "СЕМЁН + ВЕРА", cx, cy - 5, 0, 1);
  drawText(P, "1971", cx, cy + 5, 1, 1);
  // scattered field motifs
  const placed = [];
  const kinds = ["smallStar", "s", "comb", "bird", "dog", "flower", "cross"];
  for (let t = 0; t < 900 && placed.length < 24; t++) {
    const x = fx0 + 4 + P.rnd() * (fw - 8), y = fy0 + 4 + P.rnd() * (fh - 8);
    const k = kinds[Math.floor(P.rnd() * kinds.length)], r = STAMPS[k].length / 2 + 1;
    if (Math.abs(x - cx) < cw / 2 + r + 4 && Math.abs(y - cy) < ch / 2 + r + 4) continue;
    if ([fy0 + fh * 0.2, fy0 + fh * 0.8].some((my) => Math.abs(x - cx) + Math.abs(y - my) < R + r + 5)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r + 2.5)) continue;
    placed.push({ x, y, r });
    const cs = [2, 3, 1, 4, 7, 5];
    P.stamp(STAMPS[k], x, y, { 1: cs[Math.floor(P.rnd() * 6)], 2: cs[Math.floor(P.rnd() * 6)], 3: 6 }, 0, P.rnd() < 0.5);
  }
}


function genSun(P) {
  const { kw, kh } = P;
  P.fill(0, 0);
  const inner = P.frame([
    { w: 3, z: 4, fn: () => 6 },
    { w: 8, z: 3, fn: (u, v, w) => { const Pn = 10; const uu = ((u % Pn) + Pn + Pn / 2) % Pn - Pn / 2; const vv = v - (w - 1) / 2; const k = Math.floor((u + Pn / 2) / Pn); const m = Motif.rosette(uu, vv, 3.3, 5, 0); if (m === 3) return 3; if (m) return [1, 4, 5, 7][((k % 4) + 4) % 4]; return 2; } },
    { w: 2, z: 4, fn: () => 6 },
  ]);
  const cx = (kw - 1) / 2, cy = (kh - 1) / 2, fw = kw - inner * 2, fh = kh - inner * 2;
  P.each((x, y) => {
    if (x < inner || y < inner || x >= kw - inner || y >= kh - inner) return;
    const ly = (y - inner) / fh;
    // sky gradient bands + grass
    if (ly > 0.78) {
      const g = Math.sin(x * 0.7 + y * 0.3) > 0.6 ? 5 : 4;
      const fl = hash2(x, y, 5) < 0.02 ? [1, 3, 7][Math.floor(hash2(y, x, 3) * 3)] : g;
      return [fl, 0];
    }
    // rainbow arc
    const rd = Math.hypot((x - cx) / fw, (y - (inner + fh * 0.8)) / fh * 0.9);
    const bands = [1, 8, 3, 4, 7];
    if (rd > 0.62 && rd < 0.62 + bands.length * 0.035) return [bands[Math.floor((rd - 0.62) / 0.035)], 2];
    // sun
    const sd = Math.hypot(x - cx, y - (inner + fh * 0.36));
    const R = fw * 0.2;
    const a = Math.atan2(y - (inner + fh * 0.36), x - cx);
    if (sd < R) {
      if (sd > R - 1.3) return [8, 1];
      // face
      const ex = Math.abs(x - cx) - R * 0.36, ey = y - (inner + fh * 0.36) + R * 0.2;
      if (ex * ex + ey * ey < R * R * 0.012) return [6, 1];
      const my = y - (inner + fh * 0.36) - R * 0.15;
      if (Math.abs(Math.hypot(x - cx, my) - R * 0.45) < 0.9 && my > R * 0.08) return [6, 1];
      if (Math.abs(x - cx) > R * 0.5 && Math.abs(my) < R * 0.12) return [1, 1];
      return [3, 1];
    }
    if (sd < R * 1.75 && Math.cos(a * 12) > 0.55 - (sd - R) / R * 0.3) return [8, 1];
    // clouds
    for (const [ccx, ccy, cr] of [[0.2, 0.18, 0.09], [0.78, 0.14, 0.1], [0.82, 0.5, 0.08], [0.16, 0.55, 0.07]]) {
      const dx = (x - inner) / fw - ccx, dy = ((y - inner) / fh - ccy) * fh / fw;
      const d = Math.min(Math.hypot(dx, dy), Math.hypot(dx - cr * 0.8, dy + cr * 0.2), Math.hypot(dx + cr * 0.8, dy + cr * 0.1));
      if (d < cr) return [2, 0];
    }
    const sky = ly < 0.3 ? 0 : 9;
    return [sky, 0];
  });
}

// ---------- Kids printed rug (vector) ----------
function drawKidsRug(ctx, W, H, seed) {
  const rnd = mulberry(seed);
  ctx.fillStyle = "#79B45E"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = rnd() < 0.5 ? "rgba(60,120,50,0.18)" : "rgba(170,210,120,0.16)"; const r = 3 + rnd() * 14; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, r, 0, TAU); ctx.fill(); }
  const u = W / 10;
  // river
  ctx.fillStyle = "#4E9FD0"; ctx.beginPath(); ctx.moveTo(0, H * 0.62);
  ctx.bezierCurveTo(W * 0.3, H * 0.55, W * 0.45, H * 0.75, W, H * 0.68); ctx.lineTo(W, H * 0.68 + u * 0.9);
  ctx.bezierCurveTo(W * 0.45, H * 0.75 + u * 0.9, W * 0.3, H * 0.55 + u * 0.9, 0, H * 0.62 + u * 0.9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = u * 0.06;
  for (let i = 0; i < 12; i++) { const x = rnd() * W, y = H * 0.62 + (x / W) * H * 0.06 + u * 0.45; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + u * 0.4, y); ctx.stroke(); }
  // roads
  const road = (pts, w) => {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#5E646B"; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = "#F4F1E4"; ctx.lineWidth = w * 0.07; ctx.setLineDash([w * 0.35, w * 0.3]); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
  };
  road([[W * 0.5, -10], [W * 0.5, H + 10]], u * 1.3);
  road([[-10, H * 0.25], [W + 10, H * 0.25]], u * 1.1);
  road([[-10, H * 0.88], [W * 0.5, H * 0.88], [W * 0.8, H * 0.95], [W + 10, H * 0.95]], u * 1.0);
  road([[W * 0.18, H * 0.25], [W * 0.18, H * 0.5], [W * 0.5, H * 0.5]], u * 0.8);
  // bridge
  ctx.fillStyle = "#B08A5A"; ctx.fillRect(W * 0.5 - u * 0.85, H * 0.6, u * 1.7, u * 1.8);
  ctx.strokeStyle = "#7A5A36"; ctx.lineWidth = u * 0.08; ctx.strokeRect(W * 0.5 - u * 0.85, H * 0.6, u * 1.7, u * 1.8);
  ctx.fillStyle = "#5E646B"; ctx.fillRect(W * 0.5 - u * 0.6, H * 0.6, u * 1.2, u * 1.8);
  // crosswalk
  ctx.fillStyle = "#F4F1E4";
  for (let i = 0; i < 5; i++) ctx.fillRect(W * 0.5 - u * 0.6 + i * u * 0.26, H * 0.25 + u * 0.7, u * 0.14, u * 0.5);
  // houses
  const house = (x, y, w, h, roof, wall) => {
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(x + w * 0.1, y + h * 0.12, w, h);
    const c = hexRGB(roof);
    ctx.fillStyle = rgbCss(mixRGB(c, [255, 255, 255], 0.12)); ctx.fillRect(x, y, w / 2, h);
    ctx.fillStyle = rgbCss(mixRGB(c, [0, 0, 0], 0.18)); ctx.fillRect(x + w / 2, y, w / 2, h);
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = w * 0.025;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x, y + h * i / 6); ctx.lineTo(x + w, y + h * i / 6); ctx.stroke(); }
    ctx.fillStyle = rgbCss(mixRGB(c, [0, 0, 0], 0.35)); ctx.fillRect(x + w / 2 - w * 0.03, y, w * 0.06, h);
    ctx.fillStyle = "#8C939B"; ctx.fillRect(x + w * 0.66, y + h * 0.18, w * 0.14, h * 0.14);
    ctx.fillStyle = wall; ctx.fillRect(x + w * 0.3, y + h, w * 0.4, h * 0.12);
  };
  const roofs = ["#D9493A", "#3B6FB6", "#E7B23C", "#8A4FB0", "#E57C2E"];
  let k = 0;
  for (const [x, y] of [[0.05, 0.04], [0.28, 0.06], [0.64, 0.05], [0.82, 0.08], [0.03, 0.34], [0.27, 0.33], [0.63, 0.32], [0.82, 0.36], [0.63, 0.46], [0.84, 0.5]]) {
    house(W * x, H * y, u * 1.3, u * 1.3, roofs[k++ % roofs.length], "#EFE6D2");
  }
  // trees
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = H * 0.72 + rnd() * H * 0.12;
    if (Math.abs(x - W * 0.5) < u) continue;
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.arc(x + u * 0.08, y + u * 0.08, u * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = rnd() < 0.5 ? "#2F7A3E" : "#3E8C45"; ctx.beginPath(); ctx.arc(x, y, u * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.arc(x - u * 0.08, y - u * 0.08, u * 0.12, 0, TAU); ctx.fill();
  }
  // playground & pond
  ctx.fillStyle = "#E8D08A"; ctx.beginPath(); ctx.ellipse(W * 0.8, H * 0.8, u * 1.1, u * 0.7, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#D9493A"; ctx.lineWidth = u * 0.12; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.8, u * 0.4, 0, TAU); ctx.stroke();
  // railway
  ctx.strokeStyle = "#7A5A36"; ctx.lineWidth = u * 0.12;
  for (let y = -10; y < H * 0.2; y += u * 0.3) { ctx.beginPath(); ctx.moveTo(W * 0.92 - u * 0.3, y); ctx.lineTo(W * 0.92 + u * 0.3, y); ctx.stroke(); }
  ctx.strokeStyle = "#8C939B"; ctx.lineWidth = u * 0.06;
  for (const o of [-0.18, 0.18]) { ctx.beginPath(); ctx.moveTo(W * 0.92 + o * u, -10); ctx.lineTo(W * 0.92 + o * u, H * 0.2); ctx.stroke(); }
  // border
  ctx.strokeStyle = "#2F4F7A"; ctx.lineWidth = u * 0.5; ctx.strokeRect(u * 0.25, u * 0.25, W - u * 0.5, H - u * 0.5);
  ctx.strokeStyle = "#E7B23C"; ctx.lineWidth = u * 0.12; ctx.strokeRect(u * 0.62, u * 0.62, W - u * 1.24, H - u * 1.24);
}

// ---------- Rug definitions ----------
// style -> generator + material parameters
const STYLE = {
  shirvan: { gen: genShirvan, pal: "shirvan", pile: 1.0, sheen: 0.1, knot: true, abrash: 0.05, fringe: true, bind: "#1E1A18", dust: [0.56, 0.52, 0.46] },
  kazak: { gen: genKazak, pal: "kazak", pile: 1.1, sheen: 0.12, knot: true, abrash: 0.08, fringe: true, bind: "#231815", dust: [0.56, 0.52, 0.46] },
  persian: { gen: genPersian, pal: "persian", pile: 0.9, sheen: 0.18, knot: true, abrash: 0.05, fringe: true, bind: "#1C2440", dust: [0.56, 0.53, 0.48] },
  soviet: { gen: genSoviet, pal: "soviet", pile: 0.8, sheen: 0.1, knot: false, abrash: 0.0, fringe: true, bind: "#1B1513", dust: [0.6, 0.57, 0.53] },
  bukhara: { gen: genBukhara, pal: "bukhara", pile: 0.9, sheen: 0.16, knot: true, abrash: 0.07, fringe: true, bind: "#2A1614", dust: [0.56, 0.52, 0.46] },
  kilim: { gen: genKilim, pal: "kilim", pile: 0.15, sheen: 0.05, knot: true, flat: true, abrash: 0.04, fringe: true, bind: "#2B211C", dust: [0.64, 0.6, 0.54] },
  beni: { gen: genBeni, pal: "beni", pile: 1.9, sheen: 0.08, knot: true, shag: true, abrash: 0.02, fringe: true, bind: "#D9CEB8", dust: [0.55, 0.52, 0.48] },
  silk: { gen: genSilk, pal: "silk", pile: 0.55, sheen: 0.75, knot: true, abrash: 0.02, fringe: true, bind: "#2E3C5C", dust: [0.66, 0.63, 0.58] },
  hotel: { gen: genHotel, pal: "hotel", pile: 0.9, sheen: 0.12, knot: false, abrash: 0.0, fringe: false, bind: "#102A2C", dust: [0.6, 0.58, 0.54] },
  grandpa: { gen: genGrandpa, pal: "grandpa", pile: 1.05, sheen: 0.14, knot: true, abrash: 0.09, fringe: true, bind: "#2A1A14", dust: [0.56, 0.52, 0.46] },
  sun: { gen: genSun, pal: "sun", pile: 0.85, sheen: 0.06, knot: false, abrash: 0, fringe: false, bind: "#3A2A20", dust: [0.56, 0.53, 0.48] },
  kids: { vector: drawKidsRug, pile: 0.7, sheen: 0.06, knot: false, abrash: 0, fringe: false, bind: "#2F4F7A", dust: [0.6, 0.58, 0.55] },
};

// Build texture canvas. def: {style, kw, kh, ppk, seed, widthM}
function buildRug(def) {
  const st = STYLE[def.style];
  const kw = def.kw, kh = def.kh, ppk = def.ppk;
  const seed = def.seed || 1;
  const bodyW = kw * ppk, bodyH = kh * ppk;
  const fr = st.fringe ? Math.round(bodyW * (def.fringe || 0.07)) : 0;
  const W = bodyW, H = bodyH + fr * 2;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  let P = null, knotCols = null, pal = null;
  const rug = { def, style: def.style, st, kw, kh, ppk, fr, W, H, bodyW, bodyH, canvas: cv, ctx, widthM: def.widthM, heightM: def.widthM * (bodyH / bodyW) };
  if (st.vector) {
    const tmp = document.createElement("canvas"); tmp.width = bodyW; tmp.height = bodyH;
    st.vector(tmp.getContext("2d"), bodyW, bodyH, seed);
    const id = tmp.getContext("2d").getImageData(0, 0, bodyW, bodyH);
    const d = id.data;
    for (let y = 0; y < bodyH; y++) for (let x = 0; x < bodyW; x++) {
      const i = (y * bodyW + x) * 4;
      const n = 1 + (hash2(x, y, seed) - 0.5) * 0.09 + (hash2(x >> 1, y >> 2, seed + 3) - 0.5) * 0.05;
      d[i] = clamp(d[i] * n, 0, 255); d[i + 1] = clamp(d[i + 1] * n, 0, 255); d[i + 2] = clamp(d[i + 2] * n, 0, 255);
    }
    ctx.putImageData(id, 0, fr);
    rug.zoneKnots = null;
    rug.zoneFn = (u, v) => {
      const m = Math.min(u, 1 - u, v * rug.heightM / rug.widthM, (1 - v) * rug.heightM / rug.widthM);
      return m < 0.07 ? 3 : 0;
    };
  } else {
    P = new Painter(kw, kh, seed);
    st.gen(P, def);
    pal = PALS[st.pal].map(hexRGB);
    rug.P = P; rug.pal = pal;
    // knot colors with abrash & per-knot variation
    knotCols = new Float32Array(kw * kh * 3);
    const ab = new Float32Array(kh);
    let a = 0, target = 0;
    const rnd = mulberry(seed + 99);
    for (let y = 0; y < kh; y++) {
      if (rnd() < 0.03) target = (rnd() - 0.5) * 2;
      a += (target - a) * 0.08;
      ab[y] = a;
    }
    const fieldIdx = P.idx[Math.floor(kh / 2) * kw + Math.floor(kw * 0.18)];
    for (let y = 0; y < kh; y++) for (let x = 0; x < kw; x++) {
      const i = y * kw + x, c = pal[P.idx[i]] || pal[0];
      const isField = P.idx[i] === fieldIdx;
      const abv = 1 + ab[y] * st.abrash * (isField ? 1 : 0.4);
      const rv = 1 + (hash2(x, y, seed) - 0.5) * (st.knot ? 0.07 : 0.03);
      const f = abv * rv;
      knotCols[i * 3] = c[0] * f; knotCols[i * 3 + 1] = c[1] * f; knotCols[i * 3 + 2] = c[2] * f;
    }
    // edge binding columns
    const bind = hexRGB(st.bind);
    for (let y = 0; y < kh; y++) for (const x of [0, kw - 1]) {
      const i = y * kw + x; const f = 0.9 + 0.2 * ((y % 3) / 2);
      knotCols[i * 3] = bind[0] * f; knotCols[i * 3 + 1] = bind[1] * f; knotCols[i * 3 + 2] = bind[2] * f;
    }
    const id = ctx.createImageData(bodyW, bodyH);
    const d = id.data;
    const sharp = st.shag ? 1.4 : st.flat ? 3.2 : 2.6;
    const kc = (x, y, ch) => { x = x < 0 ? 0 : x >= kw ? kw - 1 : x; y = y < 0 ? 0 : y >= kh ? kh - 1 : y; return knotCols[(y * kw + x) * 3 + ch]; };
    for (let py = 0; py < bodyH; py++) {
      const ky = (py + 0.5) / ppk, fy = ky - 0.5, y0 = Math.floor(fy);
      let ty = clamp((fy - y0 - 0.5) * sharp + 0.5, 0, 1);
      const ly = ky - Math.floor(ky);
      for (let px = 0; px < bodyW; px++) {
        const kx = (px + 0.5) / ppk, fx = kx - 0.5, x0 = Math.floor(fx);
        let tx = clamp((fx - x0 - 0.5) * sharp + 0.5, 0, 1);
        const lx = kx - Math.floor(kx);
        let shade;
        if (st.flat) {
          // weft ribs
          shade = 0.94 + 0.08 * Math.sin(ly * TAU * 2 + (Math.floor(kx) & 1) * Math.PI) + (hash2(px, py, seed + 5) - 0.5) * 0.06;
        } else if (st.shag) {
          const lock = fbm2(px * 0.035, py * 0.02, seed + 11, 3);
          shade = 0.82 + 0.3 * lock + (hash2(px, py >> 1, seed + 5) - 0.5) * 0.1;
        } else if (st.knot) {
          const r2 = (lx - 0.5) * (lx - 0.5) + (ly - 0.55) * (ly - 0.55);
          shade = 1.03 - r2 * 0.34 + (hash2(px, py, seed + 5) - 0.5) * 0.07 + (hash2(px >> 1, py >> 2, seed + 6) - 0.5) * 0.04;
        } else {
          shade = 0.99 + (hash2(px, py, seed + 5) - 0.5) * 0.08 + (hash2(px >> 2, py >> 1, seed + 6) - 0.5) * 0.04;
        }
        const o = (py * bodyW + px) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const c00 = kc(x0, y0, ch), c10 = kc(x0 + 1, y0, ch), c01 = kc(x0, y0 + 1, ch), c11 = kc(x0 + 1, y0 + 1, ch);
          const c = (c00 * (1 - tx) + c10 * tx) * (1 - ty) + (c01 * (1 - tx) + c11 * tx) * ty;
          d[o + ch] = clamp(c * shade, 0, 255);
        }
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, fr);
  }
  // body edge darkening (thickness)
  const g = ctx.createLinearGradient(0, 0, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(20,12,8,0.22)";
  ctx.fillRect(0, fr, bodyW, Math.max(1, ppk * 0.35)); ctx.fillRect(0, fr + bodyH - Math.max(1, ppk * 0.35), bodyW, Math.max(1, ppk * 0.35));
  ctx.restore();
  // fringe
  rug.strands = [];
  if (fr > 0) {
    const n = Math.floor(kw / 2);
    const rnd = mulberry(seed + 7);
    for (const side of [0, 1]) for (let i = 0; i < n; i++) {
      rug.strands.push({ side, x: (i * 2 + 1) * ppk, len: fr * (0.82 + rnd() * 0.16), ang: (rnd() - 0.5) * 0.25, curl: (rnd() - 0.5) * 0.4, tang: 0, seed: rnd() * 1000 });
    }
    drawFringe(rug);
  }
  rug.fieldIdxColor = pal ? pal[0] : [120, 170, 90];
  return rug;
}

function drawFringe(rug, onlySide) {
  const { ctx, fr, bodyW, bodyH, ppk } = rug;
  const W = rug.W;
  for (const side of [0, 1]) {
    if (onlySide !== undefined && onlySide !== side) continue;
    const y0 = side === 0 ? 0 : fr + bodyH;
    ctx.clearRect(0, y0, W, fr);
    // kilim end band
    const by = side === 0 ? fr - ppk * 1.2 : fr + bodyH;
    ctx.fillStyle = "#D8CCB0"; ctx.fillRect(0, by, W, ppk * 1.2);
    ctx.fillStyle = "rgba(90,70,50,0.25)";
    for (let x = 0; x < W; x += Math.max(2, ppk * 0.5)) ctx.fillRect(x, by, 1, ppk * 1.2);
  }
  const sw = Math.max(1.6, ppk * 0.95);
  for (const s of rug.strands) {
    if (onlySide !== undefined && onlySide !== s.side) continue;
    const dir = s.side === 0 ? -1 : 1;
    const rootY = s.side === 0 ? fr - ppk * 1.2 : fr + bodyH + ppk * 1.2;
    if (s.gone) {
      // torn-off tassel: only a stub of the knot
      ctx.fillStyle = "rgba(150,130,100,0.9)"; ctx.fillRect(s.x - sw * 0.5, rootY - (dir < 0 ? sw : 0), sw, sw);
      continue;
    }
    const t = s.tang;
    const ang = s.ang * (0.3 + t * 2.5);
    const L = s.len * (1 - t * 0.18) * (s.grow === undefined ? 1 : s.grow);
    const ex = s.x + Math.sin(ang) * L, ey = rootY + dir * Math.cos(ang) * L;
    const mx = s.x + Math.sin(ang * 0.5) * L * 0.5 + s.curl * L * (0.15 + t * 0.9), my = rootY + dir * L * 0.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(60,45,30,0.35)"; ctx.lineWidth = sw + 1.2;
    ctx.beginPath(); ctx.moveTo(s.x, rootY); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    const yl = s.yel || 0;
    const sc = mixRGB([233, 225, 207], [168, 136, 80], yl);
    ctx.strokeStyle = rgbCss(sc); ctx.lineWidth = sw;
    ctx.beginPath(); ctx.moveTo(s.x, rootY); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.45 - yl * 0.3})`; ctx.lineWidth = sw * 0.35;
    ctx.beginPath(); ctx.moveTo(s.x - sw * 0.15, rootY); ctx.quadraticCurveTo(mx - sw * 0.15, my, ex - sw * 0.15, ey); ctx.stroke();
    // frayed tip
    ctx.strokeStyle = rgbCss(mixRGB(sc, [110, 90, 62], yl * 0.4)); ctx.globalAlpha = 0.8; ctx.lineWidth = Math.max(0.8, sw * 0.3);
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + k * sw * 0.6 + Math.sin(s.seed + k) * sw * 0.4, ey + dir * sw * 1.4); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}
