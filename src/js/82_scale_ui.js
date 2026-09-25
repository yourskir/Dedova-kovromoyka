// ===== Weighing screen: dial scale drawn on canvas =====
const SC = { W: 720, H: 800, cx: 360, cy: 290, R: 222, rollL: 470, rollY: 666 };
function scAng(w, v) { return (135 + 270 * clamp(v / w.max, -0.025, 1.025)) * Math.PI / 180; }

Object.assign(UI, {
  scaleOpen(w) {
    const el = $("scrScale"); el.hidden = false;
    el.classList.toggle("fin", w.mode === "out");
    $("scH").hidden = w.mode === "out";
    $("scSub").textContent = w.mode === "in" ? "Прежде чем мыть, мастер взвешивает ковёр" : "Тот же ковёр после мойки и сушки";
    const rd = $("scRead"); rd.innerHTML = ""; rd.className = "sc-read";
    const mo = $("scMore"); mo.innerHTML = ""; mo.className = "sc-more";
    const go = $("scGo");
    go.innerHTML = w.mode === "in"
      ? `<span class="pt"><b>Разложить ковёр</b><small>дальше мойка</small></span>${icon("arrow")}`
      : `<span class="pt"><b>Приёмка</b><small>заказчик ждёт</small></span>${icon("arrow")}`;
    go.onclick = () => { AU.tok(); closeScale(); };
    this._scParts = [];
    this._scBg = this._scaleStatic(w);
    this._scTex = this._rollTex(w);
  },
  scaleClose() { $("scrScale").hidden = true; this._scBg = null; this._scTex = null; },
  scaleDust(w) {
    const P = this._scParts, L = SC.rollL, x0 = SC.cx - L / 2, yb = SC.rollY;
    const dirty = w.mode === "in";
    const dc = G.rug.st.dust.map((v) => Math.round(v * 255));
    const n = dirty ? 30 : 8;
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.random() * L, side = Math.random() < 0.5 ? -1 : 1;
      P.push({ k: 0, x, y: yb - Math.random() * 16, vx: side * (60 + Math.random() * 200), vy: -(20 + Math.random() * 90), r: 10 + Math.random() * 14, t: 0, life: 0.9 + Math.random() * 0.7, c: dirty ? dc : [236, 230, 218], a: dirty ? 0.34 : 0.14 });
    }
    if (dirty) for (let i = 0; i < 46; i++) {
      P.push({ k: 1, x: x0 + 10 + Math.random() * (L - 20), y: yb - Math.random() * w.D * 0.8, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, r: 1.6 + Math.random() * 2.2, t: 0, life: 1.6, c: Math.random() < 0.5 ? [150, 128, 96] : [104, 88, 66], a: 0.9 });
    }
  },
  scaleDone(w) {
    const rd = $("scRead");
    if (w.mode === "in") {
      rd.innerHTML = `<span><small>ковёр до мойки</small><b>${fmtKg(w.before)}</b></span>`;
      rd.classList.add("show");
      $("scSub").textContent = "Сколько в нём грязи, весы покажут после мойки";
      AU.bell(660, 0.05);
      return;
    }
    const diff = w.before - w.after;
    rd.innerHTML = `<span><small>было</small><b>${fmtKg(w.before)}</b></span><i class="sc-arr">${icon("arrow")}</i><span><small>стало</small><b>${fmtKg(w.after)}</b></span><span class="sc-diff" id="scDiff">${diff >= 0.01 ? "−" + fmtKg(diff) : "±0"}</span>`;
    rd.classList.add("show");
    const pct = Math.round(diff / w.before * 100);
    setTimeout(() => {
      const d = $("scDiff"); if (!d || !G.weigh) return;
      d.classList.add("show"); AU.thump(0.3, 0); AU.chime();
      if (pct >= 1) $("scSub").textContent = `Ковёр стал легче на ${pct}%`;
    }, 450);
    // what exactly left the rug
    const a = G.wIn.d, b = w.wOut.d;
    const rows = [
      ["Песок из основы", a.sand - b.sand],
      ["Пыль", a.dust - b.dust],
      ["Въевшаяся грязь и пятна", a.grime - b.grime],
      ["Шерсть, крошки и мусор", a.litter - b.litter],
      ["Вода из ворса", a.water - b.water],
      ["Старый мыльный налёт", a.soap - b.soap],
    ].filter((r) => r[1] >= 0.005).sort((p, q) => q[1] - p[1]);
    let h = rows.map((r, i) => `<li style="animation-delay:${0.9 + i * 0.28}s"><span>${r[0]}</span><i></i><b>${fmtKg(r[1])}</b></li>`).join("");
    if (b.soap > 0.02 && b.soap >= a.soap) h += `<li class="neg" style="animation-delay:${0.9 + rows.length * 0.28}s"><span>Мыло осталось в ворсе</span><i></i><b>+${fmtKg(b.soap)}</b></li>`;
    const mo = $("scMore");
    mo.innerHTML = h ? `<ul>${h}</ul>` : "";
    mo.classList.add("show");
    rows.forEach((r, i) => setTimeout(() => { if (G.weigh) AU.tick(true); }, 900 + i * 280));
  },

  // ---------- drawing ----------
  _scaleStatic(w) {
    const cv = document.createElement("canvas"); cv.width = SC.W; cv.height = SC.H;
    const x = cv.getContext("2d");
    const { cx, cy, R } = SC, RH = R + 42;
    const rnd = mulberry(31);
    // floor shadow
    let g = x.createRadialGradient(cx, 742, 20, cx, 742, 380);
    g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, 742, 380, 46, 0, 0, TAU); x.fill();
    // column
    g = x.createLinearGradient(cx - 34, 0, cx + 34, 0);
    g.addColorStop(0, "#4a4f55"); g.addColorStop(0.35, "#c7ccd1"); g.addColorStop(0.55, "#9aa0a6"); g.addColorStop(1, "#3d4247");
    x.fillStyle = g; x.fillRect(cx - 30, cy + RH - 40, 60, 640 - (cy + RH - 40));
    x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(cx - 30, 612, 60, 6);
    g = x.createLinearGradient(cx - 48, 0, cx + 48, 0);
    g.addColorStop(0, "#3e4349"); g.addColorStop(0.4, "#aab0b6"); g.addColorStop(1, "#33383d");
    x.fillStyle = g; x.beginPath(); x.roundRect(cx - 46, 614, 92, 18, 5); x.fill();
    // platform top with checker plate
    const top = [[118, 628], [602, 628], [670, 700], [50, 700]];
    const path = () => { x.beginPath(); x.moveTo(top[0][0], top[0][1]); for (let i = 1; i < 4; i++) x.lineTo(top[i][0], top[i][1]); x.closePath(); };
    g = x.createLinearGradient(0, 628, 0, 700);
    g.addColorStop(0, "#80868c"); g.addColorStop(1, "#a9afb5");
    path(); x.fillStyle = g; x.fill();
    x.save(); path(); x.clip();
    for (let r = 0; r < 7; r++) {
      const yy = 632 + r * 10.5, sc = 0.7 + (yy - 628) / 72 * 0.45;
      for (let c = -2; c < 42; c++) {
        const xx = cx + (c - 20 + (r % 2) * 0.5) * 17 * sc;
        x.save(); x.translate(xx, yy); x.rotate(r % 2 ? 0.7 : -0.7); x.scale(sc, sc * 0.55);
        x.fillStyle = "rgba(255,255,255,0.22)"; x.beginPath(); x.ellipse(-0.8, -0.8, 6, 2, 0, 0, TAU); x.fill();
        x.fillStyle = "rgba(20,24,28,0.28)"; x.beginPath(); x.ellipse(0.8, 0.8, 6, 2, 0, 0, TAU); x.fill();
        x.restore();
      }
    }
    x.restore();
    x.strokeStyle = "rgba(255,255,255,0.35)"; x.lineWidth = 2; x.beginPath(); x.moveTo(50, 700); x.lineTo(670, 700); x.stroke();
    // platform front face and feet
    g = x.createLinearGradient(0, 700, 0, 732);
    g.addColorStop(0, "#5a6066"); g.addColorStop(1, "#2f3337");
    x.fillStyle = g; x.fillRect(50, 700, 620, 30);
    x.fillStyle = "#1e2124"; x.fillRect(66, 730, 40, 10); x.fillRect(614, 730, 40, 10);
    x.fillStyle = "rgba(230,200,140,0.8)"; x.font = "600 15px 'Golos Text', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("НАИБ. " + w.max + " кг", cx, 716);
    // dial housing: hammered green paint
    g = x.createRadialGradient(cx - RH * 0.35, cy - RH * 0.4, RH * 0.1, cx, cy, RH);
    g.addColorStop(0, "#8ba093"); g.addColorStop(0.6, "#5d7166"); g.addColorStop(1, "#34423a");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, RH, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, RH, 0, TAU); x.clip();
    for (let i = 0; i < 900; i++) {
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * RH, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      x.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)";
      x.beginPath(); x.arc(px, py, 2 + rnd() * 4, 0, TAU); x.fill();
    }
    x.restore();
    x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, RH - 1.5, 0, TAU); x.stroke();
    // chrome bezel
    g = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    g.addColorStop(0, "#f4f6f8"); g.addColorStop(0.3, "#9ea5ac"); g.addColorStop(0.55, "#e2e6ea"); g.addColorStop(1, "#4d545b");
    x.strokeStyle = g; x.lineWidth = 20; x.beginPath(); x.arc(cx, cy, R + 12, 0, TAU); x.stroke();
    // dial face
    g = x.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R + 4);
    g.addColorStop(0, "#fdf9ef"); g.addColorStop(0.75, "#efe6d1"); g.addColorStop(1, "#d6c8a8");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R + 3, 0, TAU); x.fill();
    // ticks and numbers
    const { major, minor } = scaleSteps(w.max);
    const nT = Math.round(w.max / minor);
    x.lineCap = "round";
    for (let i = 0; i <= nT; i++) {
      const v = i * minor, a = scAng(w, v);
      const kind = i % 10 === 0 ? 2 : i % 5 === 0 ? 1 : 0;
      const r1 = R - 14, r0 = r1 - [12, 22, 32][kind];
      x.strokeStyle = "#2b2520"; x.lineWidth = [2, 3.2, 5][kind];
      x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.stroke();
      if (kind === 2) {
        const rn = R - 72;
        x.fillStyle = "#2b2520"; x.font = "600 34px 'Golos Text', sans-serif";
        x.fillText(String(Math.round(v)), cx + Math.cos(a) * rn, cy + Math.sin(a) * rn + 1);
      }
    }
    // outer arc line
    x.strokeStyle = "#2b2520"; x.lineWidth = 2.5; x.beginPath(); x.arc(cx, cy, R - 14, scAng(w, 0), scAng(w, w.max)); x.stroke();
    x.fillStyle = "#2b2520"; x.font = "44px Prata, serif"; x.fillText("кг", cx, cy + R * 0.44);
    x.fillStyle = "rgba(43,37,32,0.7)"; x.font = "600 15px 'Golos Text', sans-serif";
    x.fillText("ВЕСОЗАВОД «САДОВЫЙ»", cx, cy - R * 0.34);
    x.fillText("ЦЕНА ДЕЛЕНИЯ " + fmtKg(minor), cx, cy + R * 0.6);
    // "before" mark for the second weighing
    if (w.mode === "out") {
      const a = scAng(w, w.before), rt = R - 10;
      x.save(); x.translate(cx + Math.cos(a) * rt, cy + Math.sin(a) * rt); x.rotate(a);
      x.fillStyle = "#c2412f"; x.beginPath(); x.moveTo(-2, 0); x.lineTo(16, -10); x.lineTo(16, 10); x.closePath(); x.fill();
      x.restore();
      const rl = R - 118;
      x.fillStyle = "#c2412f"; x.font = "600 24px 'Golos Text', sans-serif";
      x.fillText("до", cx + Math.cos(a) * rl, cy + Math.sin(a) * rl);
    }
    return cv;
  },
  _rollTex(w) {
    const r = G.rug, L = SC.rollL, D = Math.round(w.D);
    const cv = document.createElement("canvas"); cv.width = L; cv.height = D;
    const x = cv.getContext("2d");
    // outer layer of the roll: the far end of the rug, squeezed onto a cylinder
    const bandH = Math.min(r.bodyH * 0.5, (Math.PI * D / 2) * r.W / L);
    const sy0 = r.fr + r.bodyH - bandH - r.bodyH * 0.03;
    const N = 28;
    for (let i = 0; i < N; i++) {
      const t0 = -Math.PI / 2 + Math.PI * i / N, t1 = -Math.PI / 2 + Math.PI * (i + 1) / N;
      const y0 = D / 2 * (1 + Math.sin(t0)), y1 = D / 2 * (1 + Math.sin(t1));
      x.drawImage(r.canvas, 0, sy0 + bandH * i / N, r.W, bandH / N + 0.5, 0, y0, L, y1 - y0 + 0.6);
    }
    // grime of the dirty rug, or a fresh look after
    const wd = w.mode === "in" ? G.wIn : w.wOut;
    const k = clamp(wd.dirt / wd.rug * 1.6, 0, 0.72);
    if (k > 0.02) {
      x.fillStyle = `rgba(78,64,47,${k * 0.95})`; x.fillRect(0, 0, L, D);
      const dc = r.st.dust.map((v) => Math.round(v * 255));
      x.fillStyle = `rgba(${dc[0]},${dc[1]},${dc[2]},${k * 0.42})`; x.fillRect(0, 0, L, D);
      const rnd = mulberry(5);
      for (let i = 0; i < 260 * k; i++) { x.fillStyle = `rgba(60,48,34,${0.25 + rnd() * 0.3})`; x.beginPath(); x.arc(rnd() * L, rnd() * D, 1 + rnd() * 3, 0, TAU); x.fill(); }
    }
    // cylinder shading
    const g = x.createLinearGradient(0, 0, 0, D);
    g.addColorStop(0, "rgba(0,0,0,0.42)"); g.addColorStop(0.22, "rgba(255,244,226,0.16)"); g.addColorStop(0.38, "rgba(255,244,226,0.05)");
    g.addColorStop(0.7, "rgba(0,0,0,0.12)"); g.addColorStop(1, "rgba(0,0,0,0.6)");
    x.fillStyle = g; x.fillRect(0, 0, L, D);
    return cv;
  },
  scaleDraw(w, dt) {
    const cv = $("scaleCv"); if (!cv || !this._scBg) return;
    const x = cv.getContext("2d");
    const { cx, cy, R } = SC;
    x.clearRect(0, 0, SC.W, SC.H);
    const sh = w.shake * Math.sin(w.t * 70) * 3;
    x.save(); x.translate(0, sh);
    x.drawImage(this._scBg, 0, 0);
    // difference band on the dial
    if (w.mode === "out" && w.done) {
      const k = smooth(0, 0.6, w.t - w.doneT);
      const a0 = scAng(w, w.after), a1 = scAng(w, w.before);
      if (a1 - a0 > 0.004) {
        x.strokeStyle = `rgba(194,65,47,${0.55 * k})`; x.lineWidth = 16; x.lineCap = "butt";
        x.beginPath(); x.arc(cx, cy, R - 30, a0, a0 + (a1 - a0) * k); x.stroke();
      }
    }
    // the rolled rug
    const L = SC.rollL, D = this._scTex.height, x0 = cx - L / 2;
    const yc = SC.rollY - D / 2 + Math.min(0, w.y) + (w.landed ? Math.max(0, w.shake) * 3 : 0);
    const hgt = clamp(-w.y / 240, 0, 1);
    x.globalAlpha = smooth(0.3, 0.42, w.t);
    x.fillStyle = `rgba(0,0,0,${0.4 * (1 - hgt)})`;
    x.beginPath(); x.ellipse(cx, SC.rollY + 2, L / 2 + 16 - hgt * 60, 11 - hgt * 5, 0, 0, TAU); x.fill();
    if (yc + D / 2 > -10) {
      x.save();
      x.beginPath(); x.roundRect(x0, yc - D / 2, L, D, [D * 0.1, 0, 0, D * 0.1]); x.clip();
      x.drawImage(this._scTex, x0, yc - D / 2);
      x.restore();
      // spiral end of the roll
      const ex = x0 + L, rx = D * 0.17, ry = D / 2;
      const pal = G.rug.pal || [[150, 60, 50], [230, 220, 200]];
      const dirt = w.mode === "in" ? 0.35 : 0;
      x.fillStyle = "#2a1e16"; x.beginPath(); x.ellipse(ex, yc, rx, ry, 0, 0, TAU); x.fill();
      for (let i = 0; i < 9; i++) {
        const k = 1 - i / 9.5;
        const col = mixRGB(i % 2 ? [226, 214, 190] : pal[(i >> 1) % pal.length], [40, 30, 22], 0.35 + dirt);
        x.strokeStyle = rgbCss(col); x.lineWidth = D * 0.045;
        x.beginPath(); x.ellipse(ex - (1 - k) * rx * 0.2, yc, rx * k * 0.92, ry * k * 0.94, 0, 0, TAU); x.stroke();
      }
      x.fillStyle = "#15100c"; x.beginPath(); x.ellipse(ex - rx * 0.18, yc, rx * 0.16, ry * 0.14, 0, 0, TAU); x.fill();
      const g2 = x.createLinearGradient(0, yc - ry, 0, yc + ry);
      g2.addColorStop(0, "rgba(255,240,220,0.18)"); g2.addColorStop(0.5, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,0.35)");
      x.fillStyle = g2; x.beginPath(); x.ellipse(ex, yc, rx, ry, 0, 0, TAU); x.fill();
    }
    x.globalAlpha = 1;
    // needle with its shadow
    const a = scAng(w, w.a), rn = R * 0.86;
    const needle = (ox, oy, shadow) => {
      x.save(); x.translate(cx + ox, cy + oy); x.rotate(a);
      x.beginPath(); x.moveTo(-R * 0.2, -7); x.lineTo(rn, -1.6); x.lineTo(rn + 6, 0); x.lineTo(rn, 1.6); x.lineTo(-R * 0.2, 7); x.closePath();
      x.fillStyle = shadow ? "rgba(0,0,0,0.22)" : "#1f1b18"; x.fill();
      if (!shadow) { x.fillStyle = "#b8322a"; x.beginPath(); x.moveTo(rn * 0.72, -2.6); x.lineTo(rn, -1.6); x.lineTo(rn + 6, 0); x.lineTo(rn, 1.6); x.lineTo(rn * 0.72, 2.6); x.closePath(); x.fill(); }
      x.fillStyle = shadow ? "rgba(0,0,0,0.22)" : "#1f1b18"; x.beginPath(); x.arc(-R * 0.2, 0, 15, 0, TAU); x.fill();
      x.restore();
    };
    needle(7, 9, true); needle(0, 0, false);
    let g = x.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, 26);
    g.addColorStop(0, "#f7dc9f"); g.addColorStop(0.6, "#c8964b"); g.addColorStop(1, "#6c4a1f");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 24, 0, TAU); x.fill();
    x.strokeStyle = "rgba(60,40,15,0.7)"; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 10, cy - 6); x.lineTo(cx + 10, cy + 6); x.stroke();
    // glass glare
    x.save(); x.beginPath(); x.arc(cx, cy, R + 2, 0, TAU); x.clip();
    g = x.createLinearGradient(cx - R, cy - R, cx + R * 0.3, cy + R * 0.3);
    g.addColorStop(0, "rgba(255,255,255,0.28)"); g.addColorStop(0.45, "rgba(255,255,255,0.05)"); g.addColorStop(0.5, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.ellipse(cx - R * 0.25, cy - R * 0.3, R * 1.05, R * 0.72, -0.6, 0, TAU); x.fill();
    x.restore();
    x.strokeStyle = "rgba(255,255,255,0.45)"; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R - 2, Math.PI * 1.08, Math.PI * 1.42); x.stroke();
    x.restore();
    // dust and grit from the landing
    const P = this._scParts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt;
      if (p.t > p.life) { P.splice(i, 1); continue; }
      const f = p.t / p.life;
      if (p.k === 0) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.2, dt); p.vy = p.vy * Math.pow(0.3, dt) - 12 * dt;
        const rr = p.r * (1 + f * 2.2);
        const gg = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        gg.addColorStop(0, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * (1 - f)})`); gg.addColorStop(1, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},0)`);
        x.fillStyle = gg; x.beginPath(); x.arc(p.x, p.y, rr, 0, TAU); x.fill();
      } else {
        p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > 690) { p.y = 690; p.vy *= -0.25; p.vx *= 0.5; }
        x.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * (1 - smooth(0.7, 1, f))})`;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill();
      }
    }
  },
});
