// ===== Overlay: particles, tools, objects, props =====
const FX = {
  cv: null, ctx: null, parts: [], sprites: {}, rip: new Float32Array(12).fill(-1), ripI: 0,
  init(cv) { this.cv = cv; this.ctx = cv.getContext("2d"); this.makeSprites(); },
  makeSprites() {
    const puff = document.createElement("canvas"); puff.width = puff.height = 64;
    const p = puff.getContext("2d");
    const g = p.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.45, "rgba(255,255,255,0.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
    p.fillStyle = g; p.fillRect(0, 0, 64, 64);
    this.sprites.puff = puff;
  },
  tinted(key, color) {
    const id = key + color;
    if (this.sprites[id]) return this.sprites[id];
    const src = this.sprites[key];
    const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
    const x = c.getContext("2d"); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    this.sprites[id] = c; return c;
  },
  ripple(x, y) { const i = this.ripI++ % 4; this.rip[i * 3] = x; this.rip[i * 3 + 1] = y; this.rip[i * 3 + 2] = 0; },
  tickRipples(dt) { for (let i = 0; i < 4; i++) if (this.rip[i * 3 + 2] >= 0) { this.rip[i * 3 + 2] += dt * 1.6; if (this.rip[i * 3 + 2] > 1) this.rip[i * 3 + 2] = -1; } },
  add(p) { if (this.parts.length > 520) this.parts.splice(0, 40); p.t = 0; this.parts.push(p); },
  dust(x, y, amount, col, spread) {
    const n = Math.min(22, Math.round(amount * 2.2 + 2));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = Math.random() * spread * 0.8;
      this.add({ k: "puff", x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * (2 + Math.random() * 6), vy: Math.sin(a) * (2 + Math.random() * 6) - 1, life: 1.4 + Math.random() * 1.6, size: spread * (0.25 + Math.random() * 0.35), grow: 1.6 + Math.random(), col, a: Math.min(0.55, 0.12 + amount * 0.03) });
    }
  },
  drops(x, y, n, spd, col, dir) {
    for (let i = 0; i < n; i++) {
      const a = dir !== undefined ? dir + (Math.random() - 0.5) * 1.4 : Math.random() * TAU;
      const v = spd * (0.4 + Math.random() * 0.8);
      this.add({ k: "drop", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 0, vz: 6 + Math.random() * 10, life: 0.5 + Math.random() * 0.5, size: 0.35 + Math.random() * 0.4, col: col || "rgba(220,235,245,0.85)" });
    }
  },
  // a single drop falling straight down to yEnd, with a small splash
  drip(x, y, yEnd) { this.add({ k: "fall", x, y, vy: 0, yEnd, life: 3, size: 0.28 + Math.random() * 0.14 }); },
  ring(x, y, r, col, life) { this.add({ k: "ring", x, y, size: r, life: life || 0.6, col: col || "rgba(230,240,250,0.6)" }); },
  foamFleck(x, y, n, dirty) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 4 + Math.random() * 10;
      this.add({ k: "fleck", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 0, vz: 4 + Math.random() * 6, life: 0.45 + Math.random() * 0.4, size: 0.4 + Math.random() * 0.6, col: dirty > 0.3 ? "rgba(160,130,95,0.95)" : "rgba(250,248,240,0.95)" });
    }
  },
  mist(x, y, n, col, r) { for (let i = 0; i < n; i++) this.add({ k: "puff", x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 0.5 + Math.random() * 0.4, size: r * 0.5, grow: 1.2, col, a: 0.22 }); },
  fizz(x, y, r) { this.add({ k: "fizz", x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, life: 0.5 + Math.random() * 0.5, size: 0.2 + Math.random() * 0.3 }); },
  steam(x, y, k) { this.add({ k: "puff", x, y, vx: (Math.random() - 0.5) * 3, vy: -4 - Math.random() * 4, life: 1.6, size: 5 + Math.random() * 4, grow: 2.4, col: "#FFF6EA", a: 0.22 * (k === undefined ? 1 : 0.4 + k * 0.6) }); },
  snowBurst(x, y, r, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = Math.random() * r * 2; this.add({ k: "flake", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 0, vz: 5 + Math.random() * 8, life: 0.5 + Math.random() * 0.4, size: 0.4 + Math.random() * 0.6 }); } },
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      if (p.t >= p.life) { this.parts.splice(i, 1); continue; }
      if (p.k === "fall") {
        p.vy += 420 * dt; p.y += p.vy * dt;
        if (p.y >= p.yEnd) { p.t = p.life; this.parts.splice(i, 1); this.ring(p.x, p.yEnd, 1.6, "rgba(200,220,235,0.7)", 0.4); AU.drop(); }
        continue;
      }
      if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; const damp = p.k === "puff" ? 0.35 : 0.8; p.vx *= Math.pow(damp, dt); p.vy *= Math.pow(damp, dt); }
      if (p.vz !== undefined) { p.z += p.vz * dt; p.vz -= 30 * dt; if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.3; p.vy *= 0.3; } }
    }
    this.tickRipples(dt);
  },
  draw(ctx, cam, W, H) {
    const s = cam.s;
    const sx = (x) => (x - cam.x) * s + W / 2, sy = (y) => (y - cam.y) * s + H / 2;
    for (const p of this.parts) {
      const k = p.t / p.life;
      if (p.k === "puff") {
        const spr = this.tinted("puff", p.col);
        const r = p.size * s * (1 + k * p.grow);
        ctx.globalAlpha = p.a * (1 - k) * Math.min(1, p.t * 8);
        ctx.drawImage(spr, sx(p.x) - r, sy(p.y) - r, r * 2, r * 2);
      } else if (p.k === "drop" || p.k === "fleck" || p.k === "flake") {
        const r = Math.max(1, p.size * s * 0.9);
        const X = sx(p.x), Y = sy(p.y) - p.z * s * 0.5;
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = p.k === "flake" ? "rgba(248,252,255,0.95)" : p.col;
        ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
        if (p.k === "drop") { ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(X - r * 0.3, Y - r * 0.3, r * 0.35, 0, TAU); ctx.fill(); }
      } else if (p.k === "ring") {
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, s * 0.4 * (1 - k));
        ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), p.size * s * (0.3 + k), p.size * s * (0.3 + k) * 0.9, 0, 0, TAU); ctx.stroke();
      } else if (p.k === "fall") {
        const r = Math.max(1, p.size * s), st = 1 + Math.min(3, p.vy / 90);
        ctx.globalAlpha = 0.9; ctx.fillStyle = "rgba(205,225,238,0.9)";
        ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), r * 0.8, r * st, 0, 0, TAU); ctx.fill();
      } else if (p.k === "fizz") {
        ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), Math.max(1.2, p.size * s * (0.6 + k)), 0, TAU); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },
};

// ---------- objects (hair, crumbs, confetti ...) ----------
function drawObjects(ctx, sim, cam, W, H) {
  const s = cam.s;
  const sx = (x) => (x - cam.x) * s + W / 2, sy = (y) => (y - cam.y) * s + H / 2;
  const cpm = sim.cpm;
  ctx.lineCap = "round";
  for (const o of sim.objs) {
    let x = o.x, y = o.y, sc = 1;
    if (o.s === 1) { const k = Math.min(1, o.tt / 0.18); x = lerp(o.x, o.hx, k); y = lerp(o.y, o.hy, k); sc = 1 - k; }
    const X = sx(x), Y = sy(y);
    if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) continue;
    if (o.t === 0) {
      const L = 0.035 * cpm * s * o.l * sc;
      const ca = Math.cos(o.a), sa = Math.sin(o.a);
      ctx.strokeStyle = o.c; ctx.lineWidth = Math.max(0.7, s * 0.09 * o.sz);
      ctx.beginPath(); ctx.moveTo(X - ca * L, Y - sa * L); ctx.quadraticCurveTo(X + sa * L * o.k * 0.6, Y - ca * L * o.k * 0.6, X + ca * L, Y + sa * L); ctx.stroke();
    } else if (o.t === 1) {
      const r = 0.006 * cpm * s * o.sz * sc + 0.6;
      ctx.fillStyle = o.c; ctx.beginPath();
      for (let q = 0; q < 5; q++) { const a = o.a + q * TAU / 5, rr = r * (0.7 + 0.3 * Math.sin(q * 7 + o.a)); q ? ctx.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr) : ctx.moveTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); }
      ctx.fill();
    } else if (o.t === 2) {
      const w = 0.012 * cpm * s * sc, h = 0.007 * cpm * s * sc;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(o.a); ctx.fillStyle = o.c; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(-w / 2, -h / 2, w, h * 0.35); ctx.restore();
    } else if (o.t === 3) {
      const tw = 0.5 + 0.5 * Math.sin(G.t * 5 + o.a * 10);
      const r = (0.003 * cpm * s + 0.8) * sc;
      ctx.fillStyle = o.c; ctx.globalAlpha = 0.6 + tw * 0.4; ctx.fillRect(X - r, Y - r, r * 2, r * 2);
      if (tw > 0.85) { ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X - r * 3, Y); ctx.lineTo(X + r * 3, Y); ctx.moveTo(X, Y - r * 3); ctx.lineTo(X, Y + r * 3); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (o.t === 4) {
      const L = 0.03 * cpm * s * o.sz * sc;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(o.a);
      ctx.fillStyle = o.c; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -L * 0.55, L, 0); ctx.quadraticCurveTo(0, L * 0.55, -L, 0); ctx.fill();
      ctx.strokeStyle = "rgba(80,50,20,0.5)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.restore();
    } else if (o.t === 5) {
      const r = 0.02 * cpm * s * o.sz * sc;
      ctx.fillStyle = "rgba(150,142,132,0.55)"; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(170,162,150,0.7)"; ctx.lineWidth = 0.8;
      for (let q = 0; q < 6; q++) { const a = o.a + q; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * r * 1.4, Y + Math.sin(a) * r * 1.4); ctx.stroke(); }
    }
  }
}

// ---------- tools ----------
function metalGrad(ctx, x0, y0, x1, y1, dark) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  if (dark) { g.addColorStop(0, "#3a3d42"); g.addColorStop(0.5, "#6b7078"); g.addColorStop(1, "#2a2c30"); }
  else { g.addColorStop(0, "#8d949c"); g.addColorStop(0.45, "#e6eaee"); g.addColorStop(0.6, "#b9c0c7"); g.addColorStop(1, "#6f767e"); }
  return g;
}
function drawPole(ctx, x0, y0, x1, y1, w, col) {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(0, -w / 2 + w * 0.6, L, w);
  const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
  if (col) { g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2]); }
  else { g.addColorStop(0, "#7a8088"); g.addColorStop(0.4, "#e4e8ec"); g.addColorStop(1, "#5d636a"); }
  ctx.fillStyle = g; ctx.fillRect(0, -w / 2, L, w);
  ctx.restore();
}
const ToolDraw = {
  wave(ctx, X, Y, ang, Lpx, s, carry, conc, foamFrac, snow) {
    const half = Lpx / 2;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang);
    if (carry > 0.05) {
      const bladeCells = Math.max(1, Lpx / s);
      const depth = Math.min(Lpx * 0.3, (1.5 + Math.sqrt(carry / bladeCells) * 2.6) * s);
      const k = snow ? Math.min(0.8, conc * 1.6) : Math.min(1, conc * 2.6);
      const ff = snow ? 1 : clamp(foamFrac || 0, 0, 1);
      const bulgeAt = (t) => 0.2 + 0.8 * Math.pow(Math.sin(t * Math.PI), 0.55);
      // soft shadow ahead
      ctx.fillStyle = `rgba(0,0,0,${0.16 + k * 0.08})`;
      ctx.beginPath(); ctx.moveTo(s * 0.5, -half);
      for (let i = 0; i <= 16; i++) { const t = i / 16; ctx.lineTo(s * 1.4 + depth * bulgeAt(t), -half + t * Lpx); }
      ctx.lineTo(s * 0.5, half); ctx.closePath(); ctx.fill();
      // liquid part
      if (ff < 0.85) {
        const dark = snow ? [150, 160, 175] : [lerp(150, 78, k), lerp(170, 55, k), lerp(185, 32, k)];
        const g = ctx.createLinearGradient(0, 0, depth, 0);
        g.addColorStop(0, `rgba(${dark[0] | 0},${dark[1] | 0},${dark[2] | 0},${0.7 + k * 0.28})`);
        g.addColorStop(1, `rgba(${dark[0] | 0},${dark[1] | 0},${dark[2] | 0},${0.4 + k * 0.4})`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(s * 0.4, -half);
        for (let i = 0; i <= 16; i++) { const t = i / 16; ctx.lineTo(s * 0.5 + depth * bulgeAt(t) * (0.95 + 0.05 * Math.sin(G.t * 6 + i)), -half + t * Lpx); }
        ctx.lineTo(s * 0.4, half); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,250,238,0.6)"; ctx.lineWidth = Math.max(1, s * 0.28);
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const t = i / 16, x = s * 0.2 + depth * bulgeAt(t) * (0.95 + 0.05 * Math.sin(G.t * 6 + i)); i ? ctx.lineTo(x, -half + t * Lpx) : ctx.moveTo(x, -half + t * Lpx); }
        ctx.stroke();
      }
      // foam roll: shaded bubbles
      if (ff > 0.08) {
        const spr = bubbleSprite(snow ? -1 : Math.round(k * 5));
        const n = Math.min(260, Math.round(Lpx / Math.max(2, s * 0.8) * (1.6 + ff * 2.2)));
        for (let i = 0; i < n; i++) {
          const h1 = (Math.sin(i * 12.9898) * 43758.5453) % 1, h2 = (Math.sin(i * 78.233) * 12543.21) % 1, h3 = (Math.sin(i * 39.425) * 9321.7) % 1;
          const t = Math.abs(h1), yy = -half + t * Lpx;
          const dd = depth * bulgeAt(t) * Math.min(1, ff + 0.2);
          const xx = s * 0.5 + dd * Math.abs(h2) * 0.92;
          const r = Math.max(2, s * (0.7 + Math.abs(h3) * 1.3) * (0.4 + 0.6 * (1 - Math.abs(h2)))) * (0.92 + 0.08 * Math.sin(G.t * 4 + i));
          ctx.drawImage(spr, xx - r, yy - r, r * 2, r * 2);
        }
      }
    }
    ctx.restore();
  },
  squeegee(ctx, X, Y, ang, Lpx, s, fx, fy, carry, conc, foamFrac) {
    this.wave(ctx, X, Y, ang, Lpx, s, carry, conc, foamFrac, false);
    const half = Lpx / 2;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-s * 1.2 + s * 0.6, -half + s * 0.8, s * 2.4, Lpx);
    // rubber blade
    ctx.fillStyle = "#1c1b1d"; ctx.fillRect(-s * 0.2, -half, s * 0.8, Lpx);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(s * 0.35, -half, s * 0.15, Lpx);
    // holder
    ctx.fillStyle = metalGrad(ctx, -s * 1.6, 0, -s * 0.2, 0);
    ctx.fillRect(-s * 1.6, -half - s * 0.3, s * 1.4, Lpx + s * 0.6);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-s * 1.6, -half - s * 0.3, s * 0.2, Lpx + s * 0.6);
    // screws
    ctx.fillStyle = "#555a60";
    for (const yy of [-half * 0.7, 0, half * 0.7]) { ctx.beginPath(); ctx.arc(-s * 0.9, yy, Math.max(1.2, s * 0.22), 0, TAU); ctx.fill(); }
    ctx.restore();
    // handle toward finger
    ctx.save();
    const hx = fx + (fx - X) * 2.5, hy = fy + (fy - Y) * 2.5;
    drawPole(ctx, X - Math.cos(ang) * s * 0.9, Y - Math.sin(ang) * s * 0.9, hx, hy, Math.max(5, s * 1.1), ["#1f5a8a", "#4f9ad6", "#15405f"]);
    ctx.restore();
  },
  machine(ctx, X, Y, r, s, spin, fx, fy, color) {
    // handle
    const hx = fx + (fx - X) * 2.2, hy = fy + (fy - Y) * 2.2;
    const a = Math.atan2(hy - Y, hx - X), pa = a + Math.PI / 2;
    const off = r * 0.35;
    drawPole(ctx, X + Math.cos(pa) * off, Y + Math.sin(pa) * off, hx + Math.cos(pa) * off * 0.6, hy + Math.sin(pa) * off * 0.6, Math.max(4, s * 0.8));
    drawPole(ctx, X - Math.cos(pa) * off, Y - Math.sin(pa) * off, hx - Math.cos(pa) * off * 0.6, hy - Math.sin(pa) * off * 0.6, Math.max(4, s * 0.8));
    ctx.save(); ctx.translate(X, Y);
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(r * 0.08, r * 0.12, r * 1.04, 0, TAU); ctx.fill();
    // bristle skirt spinning
    ctx.rotate(spin);
    ctx.fillStyle = "#3a2e22"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(210,180,120,0.55)"; ctx.lineWidth = Math.max(1, s * 0.25);
    for (let i = 0; i < 36; i++) { const q = i * TAU / 36; ctx.beginPath(); ctx.moveTo(Math.cos(q) * r * 0.86, Math.sin(q) * r * 0.86); ctx.lineTo(Math.cos(q + 0.05) * r, Math.sin(q + 0.05) * r); ctx.stroke(); }
    ctx.rotate(-spin);
    // housing
    const c = hexRGB(color || "#2F6B64");
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 0.9);
    g.addColorStop(0, rgbCss(mixRGB(c, [255, 255, 255], 0.45))); g.addColorStop(0.55, rgbCss(c)); g.addColorStop(1, rgbCss(mixRGB(c, [0, 0, 0], 0.45)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = Math.max(1, s * 0.2); ctx.stroke();
    // vents
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = Math.max(1, s * 0.25);
    for (let i = 0; i < 10; i++) { const q = i * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(q) * r * 0.5, Math.sin(q) * r * 0.5); ctx.lineTo(Math.cos(q) * r * 0.68, Math.sin(q) * r * 0.68); ctx.stroke(); }
    // motor dome
    const g2 = ctx.createRadialGradient(-r * 0.12, -r * 0.14, 0, 0, 0, r * 0.38);
    g2.addColorStop(0, "#f0f2f4"); g2.addColorStop(0.6, "#9aa1a8"); g2.addColorStop(1, "#4f555b");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c9964b"; ctx.font = `bold ${Math.max(7, r * 0.16)}px Golos Text, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("ВИХРЬ", 0, r * 0.64);
    ctx.restore();
  },
  vacuum(ctx, X, Y, ang, wpx, s, fx, fy) {
    const hx = fx + (fx - X) * 2.4, hy = fy + (fy - Y) * 2.4;
    drawPole(ctx, X, Y, hx, hy, Math.max(5, s * 1.0));
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang);
    const d = Math.max(8, s * 5.5), half = wpx / 2;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.roundRect(-d / 2 + s * 0.5, -half + s * 0.8, d, wpx, d * 0.3); ctx.fill();
    const g = ctx.createLinearGradient(-d / 2, 0, d / 2, 0); g.addColorStop(0, "#2d3136"); g.addColorStop(0.5, "#565c63"); g.addColorStop(1, "#24272b");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-d / 2, -half, d, wpx, d * 0.3); ctx.fill();
    ctx.fillStyle = "#b8412f"; ctx.fillRect(-d * 0.1, -half + d * 0.25, d * 0.2, wpx - d * 0.5);
    ctx.fillStyle = "rgba(230,200,140,0.6)"; ctx.fillRect(d / 2 - s * 0.6, -half + s * 0.6, s * 0.5, wpx - s * 1.2);
    ctx.fillStyle = "#15171a";
    for (const yy of [-half + d * 0.2, half - d * 0.2]) { ctx.beginPath(); ctx.arc(-d * 0.28, yy, d * 0.13, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#8d949c"; ctx.beginPath(); ctx.arc(0, 0, d * 0.28, 0, TAU); ctx.fill();
    ctx.restore();
  },
  beater(ctx, X, Y, r, lift, s) {
    ctx.save(); ctx.translate(X, Y);
    const sc = 1 + lift * 0.35;
    ctx.fillStyle = `rgba(0,0,0,${0.3 - lift * 0.15})`; ctx.beginPath(); ctx.ellipse(r * 0.2 * (1 + lift * 2), r * 0.3 * (1 + lift * 2), r * 0.55, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.scale(sc, sc); ctx.rotate(-0.6);
    // handle
    const hg = ctx.createLinearGradient(0, -r * 0.08, 0, r * 0.08); hg.addColorStop(0, "#c08a4c"); hg.addColorStop(0.5, "#e4b77a"); hg.addColorStop(1, "#8a5c2c");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(r * 0.45, -r * 0.075, r * 1.3, r * 0.15, r * 0.07); ctx.fill();
    ctx.fillStyle = "#6e4a26"; ctx.fillRect(r * 0.45, -r * 0.09, r * 0.12, r * 0.18);
    // trefoil loops
    ctx.strokeStyle = "#caa36a"; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(r * 0.5, 0);
    ctx.bezierCurveTo(r * 0.1, -r * 0.05, -r * 0.15, -r * 0.62, -r * 0.45, -r * 0.42);
    ctx.bezierCurveTo(-r * 0.75, -r * 0.22, -r * 0.4, 0, -r * 0.1, 0);
    ctx.bezierCurveTo(-r * 0.4, 0, -r * 0.75, r * 0.22, -r * 0.45, r * 0.42);
    ctx.bezierCurveTo(-r * 0.15, r * 0.62, r * 0.1, r * 0.05, r * 0.5, 0);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.1, 0); ctx.bezierCurveTo(-r * 0.3, -r * 0.35, -r * 0.95, -r * 0.3, -r * 0.95, 0); ctx.bezierCurveTo(-r * 0.95, r * 0.3, -r * 0.3, r * 0.35, -r * 0.1, 0); ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,200,0.45)"; ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.02); ctx.bezierCurveTo(-r * 0.3, -r * 0.36, -r * 0.93, -r * 0.31, -r * 0.93, -r * 0.02); ctx.stroke();
    ctx.restore();
  },
  nozzle(ctx, X, Y, fx, fy, s, kind, cap) {
    const hx = fx + (fx - X) * 1.6, hy = fy + (fy - Y) * 1.6;
    if (kind === "washer") {
      drawPole(ctx, X, Y, hx, hy, Math.max(4, s * 0.7), ["#20232a", "#6d7480", "#15171b"]);
      ctx.fillStyle = "#e0b43c"; ctx.beginPath(); ctx.arc(X, Y, Math.max(3, s * 0.7), 0, TAU); ctx.fill();
      ctx.fillStyle = "#1c1f24"; ctx.beginPath(); ctx.roundRect(fx - s * 1.4, fy - s * 1.4, s * 2.8, s * 3.6, s * 0.6); ctx.fill();
      ctx.fillStyle = "#e0b43c"; ctx.fillRect(fx - s * 1.1, fy + s * 0.6, s * 2.2, s * 0.6);
    } else if (kind === "hose") {
      drawPole(ctx, X, Y, hx, hy, Math.max(5, s * 1.1), ["#1f6b33", "#46a35a", "#154d24"]);
      ctx.fillStyle = "#c9964b"; ctx.beginPath(); ctx.arc(X, Y, Math.max(4, s * 1.0), 0, TAU); ctx.fill();
      ctx.fillStyle = "#8a6430"; ctx.beginPath(); ctx.arc(X, Y, Math.max(2, s * 0.5), 0, TAU); ctx.fill();
    } else if (kind === "foam") {
      drawPole(ctx, X, Y, hx, hy, Math.max(4, s * 0.8), ["#2a5d8f", "#5ea3dc", "#1a4064"]);
      ctx.fillStyle = "#f4f1e8"; ctx.beginPath(); ctx.arc(X, Y, Math.max(4, s * 1.2), 0, TAU); ctx.fill();
      ctx.fillStyle = "#c9d6e0"; ctx.beginPath(); ctx.arc(X, Y, Math.max(2, s * 0.6), 0, TAU); ctx.fill();
    } else if (kind === "spray") {
      // trigger bottle beside finger
      const bx = fx + s * 2, by = fy + s * 3;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(Y - by, X - bx) + Math.PI / 2);
      const u = Math.max(3, s * 0.8);
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.roundRect(-u * 2 + u * 0.4, -u * 1 + u * 0.5, u * 4, u * 7, u * 1.4); ctx.fill();
      const g = ctx.createLinearGradient(-u * 2, 0, u * 2, 0); g.addColorStop(0, "rgba(220,230,235,0.8)"); g.addColorStop(0.4, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(170,185,195,0.8)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-u * 2, -u, u * 4, u * 7, u * 1.4); ctx.fill();
      ctx.fillStyle = cap; ctx.beginPath(); ctx.roundRect(-u * 1.2, -u * 3.2, u * 2.4, u * 2.4, u * 0.5); ctx.fill();
      ctx.fillRect(-u * 0.5, -u * 4.4, u, u * 1.4);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-u * 1.3, u * 1.5, u * 2.6, u * 2.2);
      ctx.restore();
    } else if (kind === "uv") {
      drawPole(ctx, X, Y, hx, hy, Math.max(6, s * 1.4), ["#1b1b22", "#4a4a5a", "#101015"]);
      ctx.fillStyle = "#b58cff"; ctx.beginPath(); ctx.arc(X, Y, Math.max(3, s * 0.8), 0, TAU); ctx.fill();
    }
  },
  brush(ctx, X, Y, ang, s, r, fx, fy) {
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang);
    const w = r * 2.2, d = r * 1.1;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.roundRect(-d / 2 + s * 0.5, -w / 2 + s * 0.8, d, w, d * 0.3); ctx.fill();
    const g = ctx.createLinearGradient(-d / 2, 0, d / 2, 0); g.addColorStop(0, "#8a5a2c"); g.addColorStop(0.5, "#c89058"); g.addColorStop(1, "#6e4420");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-d / 2, -w / 2, d, w, d * 0.35); ctx.fill();
    ctx.strokeStyle = "rgba(60,35,15,0.45)"; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-d / 2 + 2, -w / 2 + w * i / 5); ctx.lineTo(d / 2 - 2, -w / 2 + w * i / 5); ctx.stroke(); }
    ctx.fillStyle = "#f0e2c4"; ctx.beginPath(); ctx.ellipse(0, 0, d * 0.16, w * 0.32, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },
  iron(ctx, X, Y, s, r) {
    ctx.save(); ctx.translate(X, Y);
    ctx.fillStyle = "rgba(245,242,232,0.95)"; ctx.fillRect(-r * 1.5, -r * 1.3, r * 3, r * 2.6);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.moveTo(-r * 0.9 + 3, r * 1.1 + 4); ctx.lineTo(r * 0.9 + 3, r * 1.1 + 4); ctx.lineTo(3, -r * 1.3 + 4); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, "#9aa3ab"); g.addColorStop(0.5, "#f1f4f6"); g.addColorStop(1, "#7c858d");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 1.1); ctx.quadraticCurveTo(-r * 0.95, -r * 0.2, 0, -r * 1.3); ctx.quadraticCurveTo(r * 0.95, -r * 0.2, r * 0.9, r * 1.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3c7fb8"; ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.8); ctx.quadraticCurveTo(-r * 0.55, -r * 0.1, 0, -r * 0.75); ctx.quadraticCurveTo(r * 0.55, -r * 0.1, r * 0.55, r * 0.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1d2b38"; ctx.beginPath(); ctx.roundRect(-r * 0.18, -r * 0.4, r * 0.36, r * 1.1, r * 0.15); ctx.fill();
    ctx.restore();
  },
  loupe(ctx, X, Y, r, fx, fy) {
    drawPole(ctx, X, Y, fx + (fx - X) * 0.6, fy + (fy - Y) * 0.6, Math.max(5, r * 0.28), ["#3b2616", "#8a5a32", "#2a190d"]);
    ctx.save(); ctx.translate(X, Y);
    ctx.strokeStyle = "#c9964b"; ctx.lineWidth = Math.max(3, r * 0.14); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(210,230,240,0.12)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.beginPath(); ctx.arc(0, 0, r * 0.75, -2.4, -1.6); ctx.stroke();
    ctx.restore();
  },
  shovel(ctx, X, Y, s, r, fx, fy) {
    drawPole(ctx, X, Y, fx + (fx - X) * 2, fy + (fy - Y) * 2, Math.max(4, s * 0.8), ["#6b4a2a", "#b98a58", "#4f3419"]);
    const a = Math.atan2(fy - Y, fx - X);
    ctx.save(); ctx.translate(X, Y); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-r * 0.7 + 3, -r * 0.5 + 4, r * 1.4, r);
    const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, "#2c5f9a"); g.addColorStop(0.5, "#5b92cf"); g.addColorStop(1, "#224b7a");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-r * 0.7, -r * 0.5, r * 1.4, r, r * 0.1); ctx.fill();
    ctx.fillStyle = "rgba(245,250,255,0.9)"; ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.55, r * 0.3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },
  broom(ctx, X, Y, ang, Lpx, s, fx, fy) {
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang);
    const half = Lpx / 2;
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-s * 1.5, -half + s, s * 4, Lpx);
    ctx.strokeStyle = "#c7a15c"; ctx.lineWidth = Math.max(1, s * 0.25);
    for (let i = 0; i < 26; i++) { const yy = -half + Lpx * i / 25; ctx.beginPath(); ctx.moveTo(-s * 1.4, yy * 0.8); ctx.lineTo(s * 1.6, yy + Math.sin(i * 3.1) * s * 0.4); ctx.stroke(); }
    ctx.fillStyle = "#8a3b2a"; ctx.fillRect(-s * 1.7, -half * 0.8, s * 0.7, Lpx * 0.8);
    ctx.restore();
    drawPole(ctx, X - Math.cos(ang) * s * 1.5, Y - Math.sin(ang) * s * 1.5, fx + (fx - X) * 2.2, fy + (fy - Y) * 2.2, Math.max(4, s * 0.8), ["#6b4a2a", "#b98a58", "#4f3419"]);
  },
  // darning needle with a trailing wool thread
  // dye pen for worn spots
  pen(ctx, X, Y, fx, fy, col) {
    const d = G.dpr, a = Math.atan2(fy - Y, fx - X), L = 70 * d;
    const c = col || [150, 60, 50];
    ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(6 * d, 2 * d, L, 9 * d);
    ctx.fillStyle = rgbCss(c); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10 * d, -4 * d); ctx.lineTo(10 * d, 4 * d); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, -5 * d, 0, 5 * d); g.addColorStop(0, "#f2efe8"); g.addColorStop(1, "#9c968b");
    ctx.fillStyle = g; ctx.fillRect(10 * d, -5 * d, L - 10 * d, 10 * d);
    ctx.fillStyle = rgbCss(c); ctx.fillRect(L - 18 * d, -5 * d, 12 * d, 10 * d);
    ctx.restore();
    ctx.fillStyle = rgbCss(c); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(X, Y, 5 * d, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  },
  needle(ctx, X, Y, s, fx, fy, t, thread) {
    const d = G.dpr, L = 34 * d, a = -0.85 + Math.sin(t * 9) * 0.05;
    const ex = X + Math.cos(a) * L, ey = Y + Math.sin(a) * L;
    const st = G.stroke;
    // thread along the recent path
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (st && st.trail && st.trail.length > 1) {
      ctx.strokeStyle = "rgba(170,50,40,0.55)"; ctx.lineWidth = 2 * d;
      ctx.beginPath(); st.trail.forEach((p, i) => { const [sx, sy] = w2s(p[0], p[1]); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.lineTo(X, Y); ctx.stroke();
    }
    ctx.strokeStyle = thread || "#b8322a"; ctx.lineWidth = (thread ? 3 : 2.2) * d;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + 30 * d, ey - 10 * d, fx, fy); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 3.2 * d;
    ctx.beginPath(); ctx.moveTo(X + 3 * d, Y + 4 * d); ctx.lineTo(ex + 3 * d, ey + 4 * d); ctx.stroke();
    const g = ctx.createLinearGradient(X, Y - 3 * d, X, Y + 3 * d);
    g.addColorStop(0, "#f4f6f8"); g.addColorStop(1, "#7d858c");
    ctx.strokeStyle = g; ctx.lineWidth = 2.6 * d;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "#3c4248"; ctx.lineWidth = 1 * d;
    ctx.beginPath(); ctx.ellipse(ex - Math.cos(a) * 3 * d, ey - Math.sin(a) * 3 * d, 2.6 * d, 1 * d, a, 0, TAU); ctx.stroke();
  },
  comb(ctx, X, Y, s, w) {
    ctx.save(); ctx.translate(X, Y);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-w / 2 + 3, -s * 1.5 + 4, w, s * 3);
    const g = ctx.createLinearGradient(0, -s * 2, 0, s * 2); g.addColorStop(0, "#d9a863"); g.addColorStop(1, "#8b5a2b");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2, -s * 2, w, s * 1.6, s * 0.6); ctx.fill();
    ctx.fillStyle = "#b07a40";
    for (let i = 0; i < 16; i++) { ctx.fillRect(-w / 2 + w * (i + 0.2) / 16, -s * 0.6, w / 32, s * 2.6); }
    ctx.restore();
  },
};

const BUB = {};
function bubbleSprite(level) {
  if (BUB[level]) return BUB[level];
  const c = document.createElement("canvas"); c.width = c.height = 40;
  const x = c.getContext("2d");
  const k = level < 0 ? 0 : level / 5;
  const base = level < 0 ? [236, 243, 252] : [lerp(246, 150, k), lerp(244, 118, k), lerp(238, 80, k)];
  const g = x.createRadialGradient(15, 13, 2, 20, 20, 20);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, rgbCss(base, 1));
  g.addColorStop(0.85, rgbCss(mixRGB(base, [70, 60, 50], 0.35), 1));
  g.addColorStop(1, rgbCss(mixRGB(base, [40, 35, 30], 0.5), 0));
  x.fillStyle = g; x.beginPath(); x.arc(20, 20, 20, 0, TAU); x.fill();
  x.fillStyle = "rgba(255,255,255,0.9)"; x.beginPath(); x.ellipse(13, 12, 4, 2.6, -0.6, 0, TAU); x.fill();
  BUB[level] = c; return c;
}

// ---------- props & scene dressing (world anchored) ----------
function drawProps(ctx, sim, cam, W, H, loc) {
  const s = cam.s, cpm = sim.cpm;
  const sx = (x) => (x - cam.x) * s + W / 2, sy = (y) => (y - cam.y) * s + H / 2;
  const m = cpm * s; // px per meter
  const fl = sim.floor;
  // drain
  const dX = sx(fl.drainX), dY = sy(fl.drainY);
  if (loc === "dryroom") { /* wall behind a hanging rug */ }
  else if (loc === "plant") {
    const w = (sim.gw + 0.6 * cpm * 2) * s, h = 0.14 * m;
    ctx.fillStyle = "#1c2322"; ctx.fillRect(dX - w / 2, dY - h / 2, w, h);
    ctx.fillStyle = "#6f7a78";
    for (let x = dX - w / 2; x < dX + w / 2; x += 0.04 * m) ctx.fillRect(x, dY - h / 2 + 2, Math.max(1, 0.015 * m), h - 4);
    ctx.strokeStyle = "#9aa6a3"; ctx.lineWidth = Math.max(1, 0.01 * m); ctx.strokeRect(dX - w / 2, dY - h / 2, w, h);
  } else if (loc !== "yard") {
    const r = 0.09 * m;
    ctx.fillStyle = "#23201d"; ctx.beginPath(); ctx.arc(dX, dY, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#8a8580"; ctx.lineWidth = Math.max(1, 0.012 * m);
    ctx.beginPath(); ctx.arc(dX, dY, r, 0, TAU); ctx.stroke();
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(dX + i * r * 0.25, dY - Math.sqrt(Math.max(0, r * r - (i * r * 0.25) ** 2))); ctx.lineTo(dX + i * r * 0.25, dY + Math.sqrt(Math.max(0, r * r - (i * r * 0.25) ** 2))); ctx.stroke(); }
  }
  const rugW = sim.gw, top = sim.by0, bot = sim.by1;
  const P = (fx, fy) => [sx(fx), sy(fy)];
  if (loc === "dryroom") { drawDryRoom(ctx, sim, sx, sy, m, cpm); return; }
  if (loc === "garage" || loc === "workshop") {
    // bucket
    const [bx, by] = P(-0.32 * cpm, top + (bot - top) * 0.28);
    const br = 0.15 * m;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(bx + br * 0.15, by + br * 0.2, br * 1.02, 0, TAU); ctx.fill();
    const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);
    if (loc === "garage") { bg.addColorStop(0, "#d7dde2"); bg.addColorStop(0.7, "#8e979f"); bg.addColorStop(1, "#5b636a"); }
    else { bg.addColorStop(0, "#6fb0e6"); bg.addColorStop(0.7, "#2f73b5"); bg.addColorStop(1, "#1d4a78"); }
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3f4a40"; ctx.beginPath(); ctx.arc(bx, by, br * 0.82, 0, TAU); ctx.fill();
    const wg = ctx.createRadialGradient(bx - br * 0.2, by - br * 0.25, 0, bx, by, br * 0.82);
    wg.addColorStop(0, "rgba(160,150,120,0.9)"); wg.addColorStop(1, "rgba(70,62,48,0.95)");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(bx, by, br * 0.8, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(bx - br * 0.3, by - br * 0.35, br * 0.25, br * 0.08, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#454b50"; ctx.lineWidth = Math.max(1.5, 0.012 * m); ctx.beginPath(); ctx.arc(bx, by, br * 1.05, -0.3, Math.PI + 0.3); ctx.stroke();
    // hose coil
    const [hx, hy] = P(rugW + 0.34 * cpm, top + (bot - top) * 0.7);
    const hr = 0.2 * m;
    ctx.lineWidth = Math.max(3, 0.03 * m);
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(hx + 3, hy + 4, hr * (0.55 + i * 0.15), 0, TAU); ctx.stroke();
      ctx.strokeStyle = i % 2 ? "#2f7d3c" : "#3a9148"; ctx.beginPath(); ctx.arc(hx, hy, hr * (0.55 + i * 0.15), 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = "#3a9148"; ctx.beginPath(); ctx.moveTo(hx + hr * 1.0, hy); ctx.quadraticCurveTo(hx + hr * 1.6, hy - hr * 1.8, hx + hr * 0.6, hy - hr * 3.2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = Math.max(1, 0.008 * m);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(hx, hy, hr * (0.55 + i * 0.15), -2.2, -1.2); ctx.stroke(); }
    // bottles on a board
    const [px, py] = P(-0.36 * cpm, top + (bot - top) * 0.72);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(px - 0.14 * m + 4, py - 0.3 * m + 5, 0.28 * m, 0.6 * m);
    ctx.fillStyle = "#7b5634"; ctx.fillRect(px - 0.14 * m, py - 0.3 * m, 0.28 * m, 0.6 * m);
    ctx.strokeStyle = "rgba(40,25,10,0.5)"; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(px - 0.14 * m, py - 0.3 * m + 0.15 * m * i); ctx.lineTo(px + 0.14 * m, py - 0.3 * m + 0.15 * m * i); ctx.stroke(); }
    const caps = ["#E0A43A", "#4E8FC9", "#6DB36A", "#d8d2c4"];
    caps.forEach((c, i) => {
      const cx = px + ((i % 2) - 0.5) * 0.12 * m, cy = py - 0.16 * m + Math.floor(i / 2) * 0.24 * m, r = 0.045 * m;
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(cx + 2, cy + 3, r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#e9edef"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, TAU); ctx.fill();
    });
  }
  if (loc === "plant") {
    // stacks of rolled rugs waiting
    const cols = [["#9E2B25", "#EADFC6"], ["#1F2B4D", "#C99A45"], ["#2F5E5A", "#E8DCC0"], ["#7A1B26", "#D8C29E"], ["#B8342A", "#26345C"]];
    for (let i = 0; i < 5; i++) {
      const x0 = sx(rugW + 0.25 * cpm), y0 = sy(top + i * 0.2 * cpm), L = 0.9 * m, d = 0.17 * m;
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x0 + 4, y0 + 5, L, d);
      const g = ctx.createLinearGradient(0, y0, 0, y0 + d); g.addColorStop(0, rgbCss(mixRGB(hexRGB(cols[i][0]), [255, 255, 255], 0.2))); g.addColorStop(0.5, cols[i][0]); g.addColorStop(1, rgbCss(mixRGB(hexRGB(cols[i][0]), [0, 0, 0], 0.5)));
      ctx.fillStyle = g; ctx.fillRect(x0, y0, L, d);
      ctx.fillStyle = cols[i][1]; ctx.globalAlpha = 0.5;
      for (let k = 0; k < 8; k++) ctx.fillRect(x0 + L * (k + 0.3) / 8, y0 + d * 0.1, L * 0.03, d * 0.8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#e9e1cf"; ctx.fillRect(x0 - d * 0.18, y0 + d * 0.1, d * 0.18, d * 0.8);
    }
    // hose reel
    const [hx, hy] = P(-0.4 * cpm, top + (bot - top) * 0.3);
    const hr = 0.22 * m;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(hx + 4, hy + 5, hr, 0, TAU); ctx.fill();
    ctx.fillStyle = "#d6a12e"; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#3a3f44"; ctx.lineWidth = Math.max(2, 0.028 * m);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hx, hy, hr * (0.45 + i * 0.16), 0, TAU); ctx.stroke(); }
    ctx.fillStyle = "#2a2e32"; ctx.beginPath(); ctx.arc(hx, hy, hr * 0.2, 0, TAU); ctx.fill();
  }
  if (loc === "yard") {
    // carpet-beating rack along top & birches
    const y = sy(top - 0.5 * cpm);
    const x0 = sx(-0.3 * cpm), x1 = sx(rugW + 0.3 * cpm);
    ctx.strokeStyle = "rgba(60,70,90,0.3)"; ctx.lineWidth = Math.max(4, 0.05 * m); ctx.beginPath(); ctx.moveTo(x0 + 6, y + 8); ctx.lineTo(x1 + 6, y + 8); ctx.stroke();
    ctx.strokeStyle = "#5b6b52"; ctx.lineWidth = Math.max(3, 0.04 * m); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    for (const xx of [x0, x1]) { ctx.fillStyle = "#3f4a39"; ctx.beginPath(); ctx.arc(xx, y, Math.max(4, 0.05 * m), 0, TAU); ctx.fill(); }
    const birch = (bx, by, r) => {
      ctx.fillStyle = "rgba(90,105,140,0.25)"; ctx.beginPath(); ctx.ellipse(bx + r * 2.5, by + r * 1.2, r * 4, r * 1.2, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = "#f1eee6"; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#2b2622";
      for (let i = 0; i < 4; i++) { const a = i * 1.7; ctx.fillRect(bx + Math.cos(a) * r * 0.5 - r * 0.3, by + Math.sin(a) * r * 0.5, r * 0.6, r * 0.14); }
    };
    birch(sx(-0.55 * cpm), sy(top + (bot - top) * 0.35), 0.12 * m);
    birch(sx(rugW + 0.6 * cpm), sy(top + (bot - top) * 0.62), 0.14 * m);
    birch(sx(rugW + 0.45 * cpm), sy(top - 0.2 * cpm), 0.1 * m);
    // snow pile growing where broom dumps
    const pile = Math.min(1, fl.snowPile / 900);
    if (pile > 0.01) {
      const px = sx(sim.gw / 2), py = sy(bot + 0.35 * cpm);
      const g = ctx.createRadialGradient(px - 0.1 * m, py - 0.08 * m, 0, px, py, (0.2 + pile * 0.5) * m);
      g.addColorStop(0, "rgba(220,222,225,0.95)"); g.addColorStop(0.7, "rgba(170,172,176,0.9)"); g.addColorStop(1, "rgba(170,172,176,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, (0.25 + pile * 0.6) * m, (0.12 + pile * 0.25) * m, 0, 0, TAU); ctx.fill();
    }
  }
}

// rolled rug (unroll animation): roll at world y = yEdge, across full width
function drawRoll(ctx, sim, cam, W, H, yEdge, rug) {
  const s = cam.s;
  const x0 = (0 - cam.x) * s + W / 2, x1 = (sim.gw - cam.x) * s + W / 2;
  const remaining = Math.max(0, sim.by1 - yEdge) / sim.cpm; // meters left
  const d = Math.max(0.05, Math.sqrt(remaining * 0.012 * 4 / Math.PI + 0.0016)) * sim.cpm * s;
  const y = (yEdge - cam.y) * s + H / 2;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x0 + 4, y - d * 0.1 + 6, x1 - x0, d);
  const c = rug.fieldIdxColor || [150, 60, 50];
  const g = ctx.createLinearGradient(0, y - d * 0.3, 0, y + d * 0.8);
  g.addColorStop(0, rgbCss(mixRGB(c, [255, 255, 255], 0.25))); g.addColorStop(0.35, rgbCss(c)); g.addColorStop(1, rgbCss(mixRGB(c, [0, 0, 0], 0.6)));
  ctx.fillStyle = g; ctx.fillRect(x0, y - d * 0.3, x1 - x0, d);
  ctx.globalAlpha = 0.25; ctx.fillStyle = "#EADFC6";
  for (let i = 0; i < 20; i++) ctx.fillRect(x0 + (x1 - x0) * (i + 0.5) / 20, y - d * 0.25, Math.max(1, (x1 - x0) * 0.008), d * 0.9);
  ctx.globalAlpha = 1;
  // ends (spiral)
  for (const ex of [x0, x1]) {
    ctx.fillStyle = "#e9e1cf"; ctx.beginPath(); ctx.ellipse(ex, y + d * 0.2, d * 0.18, d * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgbCss(mixRGB(c, [0, 0, 0], 0.3)); ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(ex, y + d * 0.2, d * 0.18 * k / 4, d * 0.5 * k / 4, 0, 0, TAU); ctx.stroke(); }
  }
}

// drying room: rail with clamps, two fans, a drip tray
function drawDryRoom(ctx, sim, sx, sy, m, cpm) {
  const d = G.dryRoom || { fanS: [0, 0], ang: [0, 0], tray: 0, air: 0 };
  const gw = sim.gw, top = sim.by0, bot = sim.gh;
  const mid = (sim.by0 + sim.by1) / 2;
  const fOff = gw * 0.14, fR = Math.min(0.25 * cpm, gw * 0.12); // same numbers as dryGeom
  // airflow streaks
  for (let q = 0; q < 2; q++) {
    const k = d.fanS[q]; if (k < 0.05) continue;
    const dir = q === 0 ? 1 : -1, fx = q === 0 ? -fOff : gw + fOff;
    ctx.strokeStyle = `rgba(230,240,245,${0.1 * k})`; ctx.lineWidth = Math.max(1, 0.006 * m);
    for (let l = 0; l < 7; l++) {
      const yy = mid + (l - 3) * 0.1 * cpm, ph = ((d.air * 0.6 + l * 0.37) % 1);
      const x0 = fx + dir * (0.2 + ph * 0.5) * cpm;
      ctx.beginPath(); ctx.moveTo(sx(x0), sy(yy)); ctx.quadraticCurveTo(sx(x0 + dir * 0.12 * cpm), sy(yy + Math.sin(l + d.air) * 0.03 * cpm), sx(x0 + dir * 0.24 * cpm), sy(yy)); ctx.stroke();
    }
  }
  // power cords from each fan down to an inline switch and on to the socket
  const geo = dryGeom(sim), lw = Math.max(2, 0.014 * m);
  for (let q = 0; q < 2; q++) {
    const f = geo[q], dir = q === 0 ? -1 : 1;
    const x = sx(f.fx), y0 = sy(f.fy + f.fR * 1.02), yT = sy(f.swy - f.swh / 2), yB = sy(f.swy + f.swh / 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = lw + 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + 2, y0 + 2); ctx.bezierCurveTo(x + dir * 0.08 * m + 2, (y0 + yT) / 2, x - dir * 0.05 * m + 2, yT - 0.05 * m, x + 2, yT + 2); ctx.stroke();
    ctx.strokeStyle = "#1c1e20"; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.bezierCurveTo(x + dir * 0.08 * m, (y0 + yT) / 2, x - dir * 0.05 * m, yT - 0.05 * m, x, yT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, yB); ctx.bezierCurveTo(x, yB + 0.25 * m, x + dir * 0.18 * m, yB + 0.3 * m, x + dir * 0.22 * m, sy(sim.gh + 1.2 * cpm)); ctx.stroke();
  }
  // drip tray
  const tx0 = sx(-0.08 * cpm), tx1 = sx(gw + 0.08 * cpm), ty = sy(bot + 0.035 * cpm), th = 0.08 * m;
  let g = ctx.createLinearGradient(0, ty, 0, ty + th);
  g.addColorStop(0, "#aeb4b9"); g.addColorStop(1, "#5b6166");
  ctx.fillStyle = g; ctx.fillRect(tx0, ty, tx1 - tx0, th);
  const lvl = Math.min(0.8, d.tray / 60);
  if (lvl > 0.01) { ctx.fillStyle = "rgba(120,140,150,0.75)"; ctx.fillRect(tx0 + 3, ty + th * (1 - lvl) - 1, tx1 - tx0 - 6, th * lvl); }
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5; ctx.strokeRect(tx0, ty, tx1 - tx0, th);
  // heat gun under the tray: orange grille and warm air rising
  if (UPG.heat) {
    const hx = sx(gw * 0.5), hy = ty + th + 0.1 * m, hw = 0.34 * m, hh = 0.13 * m;
    const warm = 0.6 + 0.4 * Math.sin(d.air * 2.3);
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(hx - hw / 2 + 3, hy - hh / 2 + 4, hw, hh);
    g = ctx.createLinearGradient(0, hy - hh / 2, 0, hy + hh / 2);
    g.addColorStop(0, "#d2c14a"); g.addColorStop(1, "#8a7a22");
    ctx.fillStyle = g; ctx.fillRect(hx - hw / 2, hy - hh / 2, hw, hh);
    ctx.fillStyle = `rgba(255,${120 + 40 * warm | 0},40,${0.75 + 0.2 * warm})`; ctx.fillRect(hx - hw * 0.32, hy - hh * 0.3, hw * 0.64, hh * 0.6);
    ctx.strokeStyle = "rgba(40,20,5,0.6)"; ctx.lineWidth = Math.max(1, 0.006 * m);
    for (let q = 1; q < 6; q++) { const xx = hx - hw * 0.32 + q * hw * 0.64 / 6; ctx.beginPath(); ctx.moveTo(xx, hy - hh * 0.3); ctx.lineTo(xx, hy + hh * 0.3); ctx.stroke(); }
    ctx.strokeStyle = `rgba(255,190,120,${0.12 + 0.08 * warm})`; ctx.lineWidth = Math.max(1, 0.008 * m);
    for (let l = 0; l < 4; l++) {
      const ph = (d.air * 0.35 + l * 0.25) % 1, x0 = hx + (l - 1.5) * hw * 0.22, y0 = hy - hh * 0.6 - ph * 0.5 * m;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + 0.03 * m * Math.sin(d.air * 3 + l), y0 - 0.06 * m, x0, y0 - 0.12 * m); ctx.stroke();
    }
  }
  // rail with clamps
  const ry = sy(top - 0.01 * cpm), rh = Math.max(4, 0.035 * m);
  const rx0 = sx(-0.25 * cpm), rx1 = sx(gw + 0.25 * cpm);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(rx0, ry + rh * 0.6, rx1 - rx0, rh * 0.7);
  g = ctx.createLinearGradient(0, ry - rh / 2, 0, ry + rh / 2);
  g.addColorStop(0, "#e3e7ea"); g.addColorStop(0.5, "#9aa1a7"); g.addColorStop(1, "#555b61");
  ctx.fillStyle = g; ctx.fillRect(rx0, ry - rh / 2, rx1 - rx0, rh);
  for (const bx of [rx0, rx1]) { ctx.fillStyle = "#3b4045"; ctx.fillRect(bx - rh * 0.4, ry - rh, rh * 0.8, rh * 2); }
  for (let x = 0.08 * cpm; x < gw; x += 0.3 * cpm) {
    const cx = sx(x), cw = Math.max(5, 0.045 * m);
    ctx.fillStyle = "#2b2e31"; ctx.fillRect(cx - cw / 2, ry - rh * 0.3, cw, rh * 1.9);
    ctx.fillStyle = "#6b7177"; ctx.fillRect(cx - cw / 2 + 1, ry - rh * 0.3 + 1, cw - 2, rh * 0.5);
  }
  // fans
  for (let q = 0; q < 2; q++) {
    const cx = sx(q === 0 ? -fOff : gw + fOff), cy = sy(mid), R = fR / cpm * m;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(cx + R * 0.08, cy + R * 0.12, R * 1.04, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    g.addColorStop(0, "#5d6a70"); g.addColorStop(1, "#2a3034");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    // blades
    const k = d.fanS[q];
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.ang[q]);
    for (let b = 0; b < 3; b++) {
      ctx.rotate(TAU / 3);
      ctx.fillStyle = `rgba(185,205,215,${0.95 - k * 0.55})`;
      ctx.beginPath(); ctx.ellipse(R * 0.45, 0, R * 0.42, R * 0.17, 0.35, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (k > 0.2) { ctx.fillStyle = `rgba(185,205,215,${k * 0.28})`; ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#1c2124"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.13, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(210,220,225,0.5)"; ctx.lineWidth = Math.max(1, 0.004 * m);
    for (const rr of [0.35, 0.6, 0.85, 1]) { ctx.beginPath(); ctx.arc(cx, cy, R * rr, 0, TAU); ctx.stroke(); }
    for (let a = 0; a < 12; a++) { const an = a * TAU / 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * R * 0.15, cy + Math.sin(an) * R * 0.15); ctx.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); ctx.stroke(); }
    ctx.fillStyle = k > 0.05 ? "#8fd07a" : "#4a5a44"; ctx.beginPath(); ctx.arc(cx, cy + R * 1.12, Math.max(2, 0.012 * m), 0, TAU); ctx.fill();
  }
  // inline cord switches: a rocker with a lamp, it glows while the fan runs
  for (let q = 0; q < 2; q++) {
    const f = geo[q], on = !!(d.fans && d.fans[q]);
    const w = f.sww / cpm * m, h = f.swh / cpm * m, x0 = sx(f.swx) - w / 2, y0 = sy(f.swy) - h / 2;
    const since = G.t - ((d.flip && d.flip[q]) || -9), press = since < 0.12 ? 1 - since / 0.12 : 0;
    // a soft pulse invites the first tap
    if (!on && !(d.fans && (d.fans[0] || d.fans[1])) && G.dryRoom && G.t % 1.6 < 0.9) {
      const k = Math.sin((G.t % 1.6) / 0.9 * Math.PI);
      ctx.strokeStyle = `rgba(240,207,143,${0.55 * k})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(x0 - 6 - 4 * k, y0 - 6 - 4 * k, w + 12 + 8 * k, h + 12 + 8 * k, 10); ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(x0 + 2, y0 + 3, w, h, w * 0.3); ctx.fill();
    let g2 = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g2.addColorStop(0, "#d9d4ca"); g2.addColorStop(0.5, "#f1ede5"); g2.addColorStop(1, "#b8b1a5");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, w * 0.3); ctx.fill();
    ctx.strokeStyle = "rgba(60,50,40,0.35)"; ctx.lineWidth = 1; ctx.stroke();
    // rocker: the top half sinks when switched on
    const rx = x0 + w * 0.2, ry = y0 + h * 0.3, rw = w * 0.6, rh = h * 0.52;
    ctx.fillStyle = "#2e2a26"; ctx.beginPath(); ctx.roundRect(rx - 1.5, ry - 1.5, rw + 3, rh + 3, 3); ctx.fill();
    g2 = ctx.createLinearGradient(0, ry, 0, ry + rh);
    if (on) { g2.addColorStop(0, "#8e2a22"); g2.addColorStop(0.5, "#c9453a"); g2.addColorStop(1, "#e2645a"); }
    else { g2.addColorStop(0, "#e2645a"); g2.addColorStop(0.5, "#c9453a"); g2.addColorStop(1, "#8e2a22"); }
    ctx.fillStyle = g2; ctx.beginPath(); ctx.roundRect(rx, ry + press * 1.5, rw, rh, 2.5); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = `600 ${Math.max(7, rh * 0.32)}px 'Golos Text', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(on ? "I" : "O", rx + rw / 2, ry + rh * (on ? 0.68 : 0.32) + press * 1.5);
    // lamp above the rocker
    const lx = x0 + w / 2, ly = y0 + h * 0.15, lr = Math.max(2.2, w * 0.1);
    if (on) { const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 4); gl.addColorStop(0, "rgba(255,170,90,0.7)"); gl.addColorStop(1, "rgba(255,170,90,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(lx, ly, lr * 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = on ? "#ffb35c" : "#5b534b"; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill();
  }
}
