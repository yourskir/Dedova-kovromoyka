// ===== Dusting machine screen: top view of the conveyor and the drum housing =====
const DU = { W: 720, H: 900, Ym: 380, rx: 130, rw: 460 };

Object.assign(UI, {
  dusterOpen(d) {
    const el = $("scrDuster"); el.hidden = false;
    $("duSub").textContent = "Держи кнопку: ковёр пойдёт через барабан";
    $("duKg").textContent = "0 г"; $("duPass").textContent = "проход 1";
    const hb = $("duHold");
    const down = (e) => { e.preventDefault(); AU.init(); if (G.duster && !G.duster.back) { G.duster.hold = true; hb.classList.add("down"); } };
    const up = () => { if (G.duster) G.duster.hold = false; hb.classList.remove("down"); };
    hb.onpointerdown = down; hb.onpointerup = up; hb.onpointercancel = up; hb.onpointerleave = up;
    $("duGo").innerHTML = `<span class="pt"><b>Разложить ковёр</b><small>дальше мойка</small></span>${icon("arrow")}`;
    $("duGo").onclick = () => { AU.tok(); closeDuster(); };
    this._duBg = this._duStatic();
    this._duHouse = this._duHousing();
    this._duDust = this._duDustTex(G.rug.st.dust);
  },
  dusterClose() { $("scrDuster").hidden = true; this._duBg = this._duHouse = this._duDust = null; },
  dusterSnap(d) { const c = GLR.snapshotRug(DU.rw); if (c) d.snap = c; d.snapT = 0; },
  dusterPassDone(d) {
    $("duPass").textContent = "проход " + (d.pass + 1);
    $("duSub").textContent = d.level > 0.08 ? "Ещё проход выбьет остатки" : "Ковёр выбит, можно раскладывать";
    vibrate(10);
  },
  dusterBurst(d, kg, eff) {
    const P = d.parts, Ym = DU.Ym, dc = G.rug.st.dust.map((v) => Math.round(v * 255));
    const n = Math.min(6, Math.ceil(kg * 900 * (0.5 + eff)));
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      if (Math.random() < 0.55) P.push({ k: 0, x: side < 0 ? 72 : 648, y: Ym - 20 + Math.random() * 40, vx: side * (40 + Math.random() * 120), vy: (Math.random() - 0.6) * 60, r: 14 + Math.random() * 16, t: 0, life: 1.1 + Math.random() * 0.8, c: dc, a: 0.3 });
      else P.push({ k: 1, x: side < 0 ? 120 : 600, y: Ym + 34, vx: side * (60 + Math.random() * 160), vy: 60 + Math.random() * 120, r: 1.5 + Math.random() * 2.2, t: 0, life: 0.9, c: Math.random() < 0.5 ? [150, 128, 96] : [104, 88, 66], a: 0.95 });
    }
    $("duKg").textContent = fmtKg(d.kg);
  },
  _duStatic() {
    const cv = document.createElement("canvas"); cv.width = DU.W; cv.height = DU.H;
    const x = cv.getContext("2d"), rnd = mulberry(9);
    let g = x.createRadialGradient(DU.W / 2, DU.H * 0.45, 60, DU.W / 2, DU.H * 0.45, DU.H * 0.75);
    g.addColorStop(0, "#5c5a56"); g.addColorStop(1, "#262523");
    x.fillStyle = g; x.fillRect(0, 0, DU.W, DU.H);
    for (let i = 0; i < 2200; i++) { x.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"; x.fillRect(rnd() * DU.W, rnd() * DU.H, 1.5, 1.5); }
    // conveyor bed
    x.fillStyle = "#1c1b1a"; x.fillRect(118, 0, 484, DU.H);
    return cv;
  },
  _duHousing() {
    const cv = document.createElement("canvas"); cv.width = DU.W; cv.height = 200;
    const x = cv.getContext("2d"), rnd = mulberry(4), y0 = 40; // Ym maps to y0 + 80
    // shadow on the rug
    let g = x.createLinearGradient(0, y0 + 114, 0, y0 + 150);
    g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(60, y0 + 114, 600, 36);
    // top face and front face, hammered green paint
    g = x.createLinearGradient(0, y0, 0, y0 + 40);
    g.addColorStop(0, "#8fa597"); g.addColorStop(1, "#6d8376");
    x.fillStyle = g; x.beginPath(); x.roundRect(64, y0, 592, 44, 8); x.fill();
    g = x.createLinearGradient(0, y0 + 40, 0, y0 + 114);
    g.addColorStop(0, "#5f7568"); g.addColorStop(1, "#3c4b42");
    x.fillStyle = g; x.beginPath(); x.roundRect(64, y0 + 38, 592, 76, 6); x.fill();
    for (let i = 0; i < 700; i++) { x.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.09)"; x.beginPath(); x.arc(66 + rnd() * 588, y0 + 2 + rnd() * 110, 1.5 + rnd() * 3, 0, TAU); x.fill(); }
    // warning stripes along the bottom lip
    x.save(); x.beginPath(); x.rect(64, y0 + 100, 592, 14); x.clip();
    x.fillStyle = "#e0b43c"; x.fillRect(64, y0 + 100, 592, 14);
    x.fillStyle = "#1f1d1a"; for (let s = 40; s < 700; s += 26) { x.beginPath(); x.moveTo(s, y0 + 100); x.lineTo(s + 13, y0 + 100); x.lineTo(s, y0 + 114); x.lineTo(s - 13, y0 + 114); x.closePath(); x.fill(); }
    x.restore();
    // side vents
    x.fillStyle = "#1e2420";
    for (const vx of [78, 612]) for (let v = 0; v < 4; v++) x.fillRect(vx, y0 + 50 + v * 11, 30, 5);
    // brass nameplate
    g = x.createLinearGradient(0, y0 + 56, 0, y0 + 88);
    g.addColorStop(0, "#f0cf8f"); g.addColorStop(1, "#9c7236");
    x.font = "600 13px 'Golos Text', sans-serif";
    const plate = "ВЫБИВАЛЬНАЯ МАШИНА ВМ-2", pw = Math.ceil(x.measureText(plate).width) + 28;
    x.fillStyle = g; x.beginPath(); x.roundRect(360 - pw / 2, y0 + 56, pw, 32, 4); x.fill();
    x.fillStyle = "#3a2810"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(plate, 360, y0 + 72);
    // bolts
    x.fillStyle = "rgba(20,26,22,0.8)";
    for (let b = 80; b < 650; b += 48) { x.beginPath(); x.arc(b, y0 + 44, 3, 0, TAU); x.fill(); }
    // drum window frame on the top face
    x.fillStyle = "#1a1d1b"; x.beginPath(); x.roundRect(126, y0 + 8, 468, 28, 5); x.fill();
    return cv;
  },
  _duDustTex(dcol) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    const x = cv.getContext("2d"), rnd = mulberry(12);
    const c = dcol.map((v) => Math.round(v * 255));
    x.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.55)`; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { const k = rnd(); x.fillStyle = k < 0.5 ? `rgba(${c[0] + 20},${c[1] + 20},${c[2] + 18},0.5)` : "rgba(70,58,44,0.35)"; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 0.8 + rnd() * 2.2, 0, TAU); x.fill(); }
    return cv;
  },
  dusterDraw(d, dt) {
    const cv = $("duCv"); if (!cv || !this._duBg) return;
    const x = cv.getContext("2d"), r = G.rug, Ym = DU.Ym;
    const Lr = DU.rw * r.H / r.W;
    const top = Ym - Lr + d.p * Lr;
    x.drawImage(this._duBg, 0, 0);
    // dust heaps on both sides of the conveyor
    const dc = G.rug.st.dust.map((v) => Math.round(v * 255));
    for (const [px, k] of [[64, 0], [656, 1]]) {
      const rad = Math.min(95, 12 + Math.sqrt(d.piles[k]) * 60);
      if (rad < 13) continue;
      const g = x.createRadialGradient(px, Ym + 140, 2, px, Ym + 140, rad);
      g.addColorStop(0, `rgba(${dc[0] - 25},${dc[1] - 25},${dc[2] - 25},0.95)`); g.addColorStop(0.7, `rgba(${dc[0] - 40},${dc[1] - 40},${dc[2] - 40},0.7)`); g.addColorStop(1, "rgba(60,50,40,0)");
      x.fillStyle = g; x.beginPath(); x.ellipse(px, Ym + 140, rad, rad * 0.8, 0, 0, TAU); x.fill();
    }
    // rollers under the rug
    const off = ((top % 60) + 60) % 60;
    for (let y = off - 60; y < DU.H; y += 60) {
      const g = x.createLinearGradient(0, y, 0, y + 22);
      g.addColorStop(0, "#9aa0a6"); g.addColorStop(0.5, "#d9dde1"); g.addColorStop(1, "#5d6369");
      x.fillStyle = g; x.fillRect(126, y, 468, 22);
    }
    // the rug on the conveyor
    x.save(); x.beginPath(); x.rect(DU.rx, 0, DU.rw, DU.H); x.clip();
    // the rug as it really looks: rows already under the drum come out cleaner
    x.drawImage(d.snap || r.canvas, DU.rx, top, DU.rw, Lr);
    // pile ripples right after the drum
    if (d.spd > 0.05) {
      for (let q = 0; q < 6; q++) {
        const yy = Ym + 36 + ((d.t * 260 + q * 22) % 130);
        x.fillStyle = `rgba(0,0,0,${0.12 * d.spd * (1 - (yy - Ym) / 170)})`; x.fillRect(DU.rx, yy, DU.rw, 4);
      }
    }
    x.restore();
    // rails
    for (const rx0 of [106, 598]) {
      const g = x.createLinearGradient(rx0, 0, rx0 + 16, 0);
      g.addColorStop(0, "#4b5157"); g.addColorStop(0.5, "#b7bdc2"); g.addColorStop(1, "#3a3f44");
      x.fillStyle = g; x.fillRect(rx0, 0, 16, DU.H);
      x.fillStyle = "rgba(0,0,0,0.5)"; for (let y = 20; y < DU.H; y += 70) { x.beginPath(); x.arc(rx0 + 8, y, 2.5, 0, TAU); x.fill(); }
    }
    // housing with a live drum
    const sh = d.shake * (Math.sin(d.t * 83) * 1.6);
    x.save(); x.translate(sh, Math.cos(d.t * 71) * d.shake);
    x.drawImage(this._duHouse, 0, Ym - 120);
    const wy = Ym - 72, wh = 24;
    x.save(); x.beginPath(); x.roundRect(129, wy, 462, wh, 4); x.clip();
    d.drum = (d.drum || 0) + dt * (2 + d.spd * 16);
    for (let q = 0; q < 7; q++) {
      const f = ((d.drum * 0.35 + q / 7) % 1), yy = wy + f * wh;
      const g = x.createLinearGradient(0, yy - 3, 0, yy + 3);
      g.addColorStop(0, "#111"); g.addColorStop(0.5, "#4a4a48"); g.addColorStop(1, "#111");
      x.fillStyle = g; x.fillRect(129, yy - 3, 462, 6);
    }
    x.restore();
    // motor with a spinning pulley
    x.fillStyle = "#3a4841"; x.beginPath(); x.roundRect(652, Ym - 90, 52, 84, 6); x.fill();
    x.strokeStyle = "#1c1c1c"; x.lineWidth = 5; x.beginPath(); x.moveTo(660, Ym - 70); x.lineTo(690, Ym - 30); x.stroke();
    x.save(); x.translate(678, Ym - 48); x.rotate(d.drum * 3);
    x.fillStyle = "#c9ced3"; x.beginPath(); x.arc(0, 0, 16, 0, TAU); x.fill();
    x.strokeStyle = "#4a4f55"; x.lineWidth = 3; for (let q = 0; q < 3; q++) { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(q * TAU / 3) * 14, Math.sin(q * TAU / 3) * 14); x.stroke(); }
    x.restore();
    x.fillStyle = d.spd > 0.05 ? "#e2553f" : "#7b2a20"; x.beginPath(); x.arc(678, Ym - 16, 6, 0, TAU); x.fill();
    x.restore();
    // dust clouds and flying grit
    const P = d.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt;
      if (p.t > p.life) { P.splice(i, 1); continue; }
      const f = p.t / p.life;
      if (p.k === 0) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.25, dt); p.vy = p.vy * Math.pow(0.4, dt) - 10 * dt;
        const rr = p.r * (1 + f * 2.4);
        const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * (1 - f)})`); g.addColorStop(1, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},0)`);
        x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, rr, 0, TAU); x.fill();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.vx *= Math.pow(0.3, dt);
        x.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * (1 - f)})`;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill();
      }
    }
  },
});
