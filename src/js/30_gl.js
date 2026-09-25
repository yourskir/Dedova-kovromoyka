// ===== WebGL renderer =====
const VS = `
attribute vec2 aP;
uniform vec4 uRect; uniform vec3 uCam; uniform vec2 uRes;
varying vec2 vW;
void main(){
  vec2 w = uRect.xy + aP * uRect.zw;
  vW = w;
  vec2 s = (w - uCam.xy) * uCam.z + uRes * 0.5;
  gl_Position = vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, 0.0, 1.0);
}`;
const PREC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
const FS_COMMON = `
uniform vec2 uRes; uniform vec3 uLamp; uniform vec4 uUV; uniform float uAmb; uniform float uVig;
float vig(){ vec2 p = gl_FragCoord.xy / uRes - 0.5; p.x *= uRes.x / uRes.y; return 1.0 - 0.42 * uVig * smoothstep(0.35, 1.05, length(p) * 1.25); }
float lampK(vec2 w){ vec2 d = w - uLamp.xy; float d2 = dot(d, d) / (uLamp.z * uLamp.z); return uAmb + (1.12 - uAmb) * exp(-d2 * 0.9); }
`;
const FS_FLOOR = PREC + FS_COMMON + `
varying vec2 vW;
uniform sampler2D uFloor, uFluid, uN;
uniform vec4 uFR; uniform float uCpm; uniform vec4 uRug; uniform float uT; uniform float uSnowF;
void main(){
  vec2 m = vW / uCpm;
  vec3 col = texture2D(uFloor, m * 0.5).rgb;
  vec2 fuv = (vW - uFR.xy) / uFR.zw;
  vec4 fl = texture2D(uFluid, fuv);
  float wet = fl.r, depth = fl.g, dirt = fl.b, silt = fl.a * 1.5;
  float L = lampK(vW);
  float sh = texture2D(uN, vW * 0.013 + vec2(0.0, uT * 0.004)).g;
  // settled dirt: blotchy film with gritty specks
  if (silt > 0.005) {
    float sn = texture2D(uN, vW * 0.029 + 0.17).g, sg = texture2D(uN, vW * 0.23 + 0.61).r;
    float sk = smoothstep(0.02, 0.55, silt * (0.5 + 1.0 * sn));
    // dried mud is pale tan, wet mud is dark brown
    vec3 dry = mix(vec3(0.62, 0.54, 0.41), vec3(0.5, 0.42, 0.3), smoothstep(0.3, 1.4, silt));
    vec3 sc = mix(dry, vec3(0.3, 0.22, 0.14), clamp(wet * 1.3, 0.0, 1.0)) * (0.88 + 0.22 * sg);
    col = mix(col, sc, sk * 0.88);
    col *= 1.0 + (sg - 0.5) * 0.12 * sk;
  }
  col = mix(col, col * 0.52, wet * 0.85 * (1.0 - uSnowF * 0.6));
  float dp = clamp(depth * 2.5, 0.0, 1.0);
  col = mix(col, col * 0.5 + vec3(0.16, 0.11, 0.06) * (0.4 + dirt), dp * clamp(dirt * 1.6, 0.0, 1.0) * 0.9);
  col += vec3(1.0, 0.93, 0.8) * (wet * 0.08 + dp * 0.16) * smoothstep(0.45, 0.8, sh) * L;
  // soft rug shadow
  vec2 c = (uRug.xy + uRug.zw) * 0.5; vec2 h = (uRug.zw - uRug.xy) * 0.5;
  vec2 q = abs(vW - c - vec2(0.9, 1.8)) - h;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  col *= 1.0 - 0.55 * (1.0 - smoothstep(-3.0, 7.0, sd));
  col *= L * vig();
  if (uUV.w > 0.5) { col *= vec3(0.2, 0.15, 0.36); float d = length(vW - uUV.xy) / uUV.z; col += vec3(0.1, 0.05, 0.22) * smoothstep(1.0, 0.0, d); }
  gl_FragColor = vec4(col, 1.0);
}`;
const FS_RUG = PREC + FS_COMMON + `
varying vec2 vW;
uniform sampler2D uBase, uA, uB, uC, uD, uE, uN;
uniform vec2 uGrid; uniform float uT; uniform vec3 uRip[4];
uniform float uHint; uniform float uSnow; uniform vec3 uBleed; uniform vec3 uMat; uniform float uReveal; uniform vec3 uDust;
uniform float uDry;
void main(){
  vec2 w = vW;
  if (w.y > uReveal) discard;
  vec2 off = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 r = uRip[i];
    if (r.z >= 0.0 && r.z < 1.0) {
      vec2 d = w - r.xy; float dist = length(d);
      float front = r.z * 42.0;
      float k = exp(-abs(dist - front) * 0.3) * (1.0 - r.z) * 0.9;
      off += d / (dist + 0.001) * k * sin((dist - front) * 0.9);
    }
  }
  w += off;
  vec2 uv = w / uGrid;
  vec4 base = texture2D(uBase, uv);
  if (base.a < 0.4) discard;
  vec4 A = texture2D(uA, uv);
  vec4 B = texture2D(uB, uv);
  vec4 C = texture2D(uC, uv);
  vec4 D = texture2D(uD, uv);
  vec4 E4 = texture2D(uE, uv);
  float hole = E4.r, wear = E4.g;
  float water = B.r * 1.6 * (1.0 - uDry), foam = B.g * 1.4, load = B.b * 1.5;
  vec3 col = base.rgb;
  float fib = texture2D(uN, w * vec2(0.047, 0.021)).r;
  float fib2 = texture2D(uN, w * vec2(0.11, 0.05) + 0.31).r;
  float mid = texture2D(uN, w * 0.013).g;
  float nap = C.a * 2.0 - 1.0;
  float pile = uMat.x;
  float L = lampK(w);
  // pile shading
  col *= 0.9 + 0.12 * fib * min(pile, 1.6) + 0.06 * fib2 * pile + 0.13 * nap * min(pile, 1.3) * (1.0 - D.b);
  // pile damage
  col = mix(col, mix(col, vec3(dot(col, vec3(0.33))), 0.45) * 1.1 + (fib - 0.5) * 0.14, D.b * 0.85);
  // worn pile: faded colour and the knot grid showing through
  if (wear > 0.01) {
    float wk = smoothstep(0.05, 0.85, wear + (mid - 0.5) * 0.25);
    vec3 pale = mix(vec3(dot(col, vec3(0.3, 0.5, 0.2))), col, 0.35) * 1.16 + vec3(0.08, 0.07, 0.05);
    col = mix(col, pale, wk * 0.88);
    float gx = abs(fract(w.x * 2.6) - 0.5), gy = abs(fract(w.y * 2.0 + 0.25) - 0.5);
    col = mix(col, vec3(0.8, 0.74, 0.62), wk * 0.3 * max(smoothstep(0.28, 0.44, gx), smoothstep(0.3, 0.46, gy)));
  }
  // moth: pile eaten down to the cotton foundation
  if (hole > 0.01) {
    float hk = smoothstep(0.12, 0.6, hole + (mid - 0.5) * 0.35);
    float wx = abs(fract(w.x * 2.6) - 0.5), wy = abs(fract(w.y * 2.0 + 0.25) - 0.5);
    float warp = smoothstep(0.3, 0.16, wx), weft = smoothstep(0.33, 0.2, wy);
    vec3 cotton = vec3(0.84, 0.78, 0.66) * (0.86 + 0.16 * fib2);
    vec3 found = mix(vec3(0.2, 0.15, 0.11), cotton, max(warp, weft * 0.8));
    found = mix(found, col * 0.75, 0.2 * (1.0 - warp));
    col = mix(col, found, hk);
    col *= 1.0 - 0.3 * smoothstep(0.08, 0.3, hole) * (1.0 - hk);
  }
  // dye bleed
  col = mix(col, col * uBleed * 1.7, D.a * 0.7);
  // grime film
  float g = A.b;
  vec3 gcol = col * vec3(0.36, 0.33, 0.28) + vec3(0.085, 0.07, 0.048);
  gcol = mix(gcol, vec3(dot(gcol, vec3(0.3, 0.5, 0.2))) * vec3(1.06, 0.98, 0.86), 0.55);
  float gk = (1.0 - exp(-g * 3.4)) * (0.78 + 0.44 * texture2D(uN, w * 0.009 + 0.23).g);
  col = mix(col, gcol, clamp(gk, 0.0, 1.0) * 0.96);
  // sand
  float s = A.g;
  float speck = step(0.66 - s * 0.3, texture2D(uN, w * 0.19 + 0.5).r);
  col = mix(col, vec3(0.7, 0.63, 0.52) * (0.8 + 0.3 * fib), s * 0.28 + speck * s * 0.5);
  // stains
  float st = smoothstep(0.0, 0.85, A.a);
  vec3 sc = C.rgb;
  float lightSt = step(0.82, (sc.r + sc.g + sc.b) / 3.0);
  vec3 stMul = mix(col * sc * 1.2, mix(col, sc * (0.9 + 0.15 * fib), 0.78), lightSt);
  col = mix(col, stMul, st);
  col = mix(col, col * vec3(0.97, 0.93, 0.8), D.r * 0.4);
  // residue (dried soap)
  col = mix(col, vec3(0.87, 0.86, 0.83) * (0.9 + 0.1 * fib), D.g * 0.5 * (0.5 + 0.9 * mid));
  // dust
  float d = A.r;
  float lump = texture2D(uN, w * 0.035 + 0.7).g;
  float dm = smoothstep(0.04, 0.95, d * 1.05 + (lump - 0.5) * 0.55 * d + (fib - 0.5) * 0.2 * d);
  vec3 dc = uDust * (0.78 + 0.3 * fib + 0.12 * (lump - 0.5));
  col = mix(col, dc, dm * 0.78);
  // water
  float wet = clamp(water, 0.0, 1.0);
  col = mix(col, col * col * 1.3 + col * 0.05, wet * 0.72);
  float fluid = water + foam + 0.02;
  float conc = clamp(load * 2.4 / (fluid + 0.08), 0.0, 1.3);
  vec3 muddy = vec3(0.33, 0.24, 0.14);
  float pud = clamp(water - 0.12, 0.0, 1.0);
  col = mix(col, col * 0.4 + muddy * 0.42, pud * clamp(conc * 1.5, 0.0, 1.0) * 0.9);
  // standing water gloss
  float gl = smoothstep(0.55, 0.85, texture2D(uN, w * 0.021 + vec2(uT * 0.003, 0.0)).g);
  vec2 ld = w - uLamp.xy - vec2(-uLamp.z * 0.25, -uLamp.z * 0.35);
  float broad = exp(-dot(ld, ld) / (uLamp.z * uLamp.z * 0.35));
  col += vec3(1.0, 0.95, 0.86) * (pow(fib2, 6.0) * 0.55 + gl * 0.12 + broad * 0.22) * clamp(water - 0.2, 0.0, 1.0);
  // silk sheen
  col += vec3(1.0, 0.97, 0.9) * uMat.y * 0.12 * (0.55 + 0.45 * nap) * (0.6 + 0.4 * fib) * (1.0 - D.b) * (1.0 - wet * 0.5);
  // foam / snow
  float b1 = texture2D(uN, w * 0.085 + vec2(uT * 0.0015, uT * 0.001)).b;
  float wall = texture2D(uN, w * 0.085 + vec2(uT * 0.0015, uT * 0.001)).a;
  float b2 = texture2D(uN, w * 0.2 + 0.37).b;
  if (uSnow > 0.5) {
    float cover = smoothstep(0.12, 0.6, foam + (0.5 - b2) * 0.45 + (0.5 - mid) * 0.3);
    float sp = step(0.93, texture2D(uN, w * 0.37).r) * (0.5 + 0.5 * sin(uT * 3.0 + w.x));
    vec3 snowc = mix(vec3(0.93, 0.96, 1.0), vec3(0.55, 0.53, 0.5), clamp(conc * 1.4, 0.0, 0.9));
    snowc *= 0.86 + 0.18 * (1.0 - b1) + 0.06 * fib;
    snowc = mix(snowc * vec3(0.8, 0.86, 1.0), snowc, smoothstep(0.1, 0.5, 1.0 - b1));
    col = mix(col, snowc + sp * 0.35 * (1.0 - conc), cover);
  } else if (foam > 0.01) {
    // normal-mapped foam: lumps + bubble domes
    vec2 p = w;
    float e = 0.6;
    float h0 = texture2D(uN, p * 0.02).g * 0.75 + (1.0 - texture2D(uN, p * 0.055).b) * 0.45;
    float hx = texture2D(uN, (p + vec2(e, 0.0)) * 0.02).g * 0.75 + (1.0 - texture2D(uN, (p + vec2(e, 0.0)) * 0.055).b) * 0.45;
    float hy = texture2D(uN, (p + vec2(0.0, e)) * 0.02).g * 0.75 + (1.0 - texture2D(uN, (p + vec2(0.0, e)) * 0.055).b) * 0.45;
    h0 += (1.0 - b2) * 0.1;
    float hgt = foam * 1.15 + (h0 - 0.6) * 0.75;
    float cover = smoothstep(0.22, 0.42, hgt);
    vec3 n = normalize(vec3((h0 - hx) * 2.2, (h0 - hy) * 2.2, 0.45));
    vec3 ldir = normalize(vec3(-0.45, -0.55, 0.7));
    float lam = clamp(dot(n, ldir), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-ldir, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 18.0);
    vec3 fc = mix(vec3(0.98, 0.965, 0.93), vec3(0.45, 0.33, 0.2), clamp(conc * 1.1, 0.0, 1.0));
    fc *= 0.62 + 0.5 * lam;
    float walls = smoothstep(0.1, 0.0, texture2D(uN, p * 0.055).a) * smoothstep(0.3, 0.6, hgt);
    fc = mix(fc, fc * 0.7, walls * 0.6);
    fc += vec3(1.0, 0.98, 0.94) * spec * 0.45 * (1.0 - conc * 0.5);
    // thin foam shows pile through
    float thin = smoothstep(0.22, 0.7, hgt);
    col = mix(col, mix(col * 0.85 + fc * 0.25, fc, thin), cover);
  }
  col *= L * vig();
  // UV lamp
  if (uUV.w > 0.5) {
    float dd = length(w - uUV.xy) / uUV.z;
    float inside = smoothstep(1.0, 0.55, dd);
    col *= vec3(0.2, 0.15, 0.36) + vec3(0.25, 0.18, 0.45) * inside;
    col += vec3(0.62, 1.0, 0.3) * D.r * 1.3 * inside;
    col += vec3(0.55, 0.7, 1.0) * D.g * 0.9 * inside;
    col += vec3(0.1, 0.04, 0.2) * inside;
  }
  if (uHint > 0.0) {
    float dirt = A.r * 0.55 + A.g * 0.5 + A.b + A.a * 1.4 + D.r * 1.2 + load * 0.6;
    float glow = smoothstep(0.05, 0.22, dirt) * uHint;
    col = mix(col, vec3(1.0, 0.72, 0.28), glow * 0.55);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

// foam lying on the floor, plus foam lumps hanging over the rug's side edges
const FS_FOAM = PREC + FS_COMMON + `
varying vec2 vW;
uniform sampler2D uFoam, uN, uRB;
uniform vec4 uFR; uniform vec2 uGrid; uniform vec4 uRug; uniform float uT; uniform float uEdge; uniform float uReveal;
void main(){
  vec2 w = vW;
  vec4 fm = texture2D(uFoam, (w - uFR.xy) / uFR.zw);
  float foam = fm.r * 1.6;
  float conc = fm.a;
  // hidden under the rug body
  float dIn = min(min(w.x, uGrid.x - w.x), min(w.y - uRug.y, uRug.w - w.y));
  foam *= 1.0 - smoothstep(0.3, 1.9, dIn);
  // rug foam spills a little past the edge
  if (uEdge > 0.5 && w.y < uReveal) {
    float ox = max(-w.x, w.x - uGrid.x);
    float oy = max(-w.y, w.y - uGrid.y);
    float ex = max(ox, oy);
    bool body = w.y >= uRug.y && w.y <= uRug.w;
    // past the edges, and over the fringe where strands leave gaps
    if (ex > 0.0 || !body) {
      vec2 cw = clamp(w, vec2(0.5), uGrid - 0.5);
      vec4 B = texture2D(uRB, cw / uGrid);
      float rf = B.g * 1.4;
      float oe = max(ex, 0.0);
      float k = rf * (1.0 - smoothstep(0.0, 3.4, oe));
      float fluid = B.r * 1.6 + rf + 0.02;
      float rc = clamp(B.b * 1.5 * 2.4 / (fluid + 0.08), 0.0, 1.0);
      // near the edge floor foam takes on the colour of the rug foam it touches
      float near = (1.0 - smoothstep(0.0, 5.5, oe)) * smoothstep(0.03, 0.2, rf) * 0.75;
      conc = mix(conc, rc, max(near, clamp((k - foam) * 4.0, 0.0, 1.0)));
      foam = max(foam, k);
    }
  }
  if (foam < 0.02) discard;
  vec2 p = w;
  float e = 0.6;
  float h0 = texture2D(uN, p * 0.02).g * 0.75 + (1.0 - texture2D(uN, p * 0.055).b) * 0.45;
  float hx = texture2D(uN, (p + vec2(e, 0.0)) * 0.02).g * 0.75 + (1.0 - texture2D(uN, (p + vec2(e, 0.0)) * 0.055).b) * 0.45;
  float hy = texture2D(uN, (p + vec2(0.0, e)) * 0.02).g * 0.75 + (1.0 - texture2D(uN, (p + vec2(0.0, e)) * 0.055).b) * 0.45;
  float b2 = texture2D(uN, w * 0.2 + 0.37).b;
  h0 += (1.0 - b2) * 0.1;
  float hgt = foam * 1.15 + (h0 - 0.6) * 0.75;
  float cover = smoothstep(0.22, 0.42, hgt);
  if (cover < 0.01) discard;
  vec3 n = normalize(vec3((h0 - hx) * 2.2, (h0 - hy) * 2.2, 0.45));
  vec3 ldir = normalize(vec3(-0.45, -0.55, 0.7));
  float lam = clamp(dot(n, ldir), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-ldir, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 18.0);
  vec3 fc = mix(vec3(0.98, 0.965, 0.93), vec3(0.45, 0.33, 0.2), clamp(conc * 1.1, 0.0, 1.0));
  fc *= 0.62 + 0.5 * lam;
  float walls = smoothstep(0.1, 0.0, texture2D(uN, p * 0.055).a) * smoothstep(0.3, 0.6, hgt);
  fc = mix(fc, fc * 0.7, walls * 0.6);
  fc += vec3(1.0, 0.98, 0.94) * spec * 0.45 * (1.0 - conc * 0.5);
  float thin = smoothstep(0.22, 0.7, hgt);
  fc *= lampK(w) * vig();
  if (uUV.w > 0.5) fc *= vec3(0.2, 0.15, 0.36);
  gl_FragColor = vec4(fc, cover * (0.45 + 0.55 * thin));
}`;

const GLR = {
  gl: null, cv: null, ok: false,
  init(cv) {
    this.cv = cv;
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "default" };
    const gl = cv.getContext("webgl", opts) || cv.getContext("experimental-webgl", opts);
    if (!gl) return false;
    this.gl = gl;
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.ok = false; }, false);
    cv.addEventListener("webglcontextrestored", () => { this.setup(); if (this.onRestore) this.onRestore(); }, false);
    return this.setup();
  },
  setup() {
    const gl = this.gl;
    this.pFloor = this.prog(VS, FS_FLOOR);
    this.pRug = this.prog(VS, FS_RUG);
    this.pFoam = this.prog(VS, FS_FOAM);
    if (!this.pFloor || !this.pRug) return false;
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.noise = this.texFromCanvas(makeNoiseCanvas(), true, true);
    this.tex = {};
    this.floorKey = null;
    this.rugTex = null;
    this.ok = true;
    return true;
  },
  prog(vs, fs) {
    const gl = this.gl;
    const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
    const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, "aP"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ""); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  },
  texFromCanvas(cv, repeat, mip) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    const wr = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  },
  dataTex(w, h, fmt) {
    const gl = this.gl;
    const t = gl.createTexture();
    fmt = fmt || gl.RGBA;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  },
  // POT copy of rug canvas for mipmapping
  setRug(rug) {
    const gl = this.gl;
    const pw = Math.min(2048, 1 << Math.ceil(Math.log2(rug.W))), ph = Math.min(2048, 1 << Math.ceil(Math.log2(rug.H)));
    if (!this.potCv) this.potCv = document.createElement("canvas");
    const c = this.potCv; c.width = pw; c.height = ph;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.clearRect(0, 0, pw, ph); x.drawImage(rug.canvas, 0, 0, pw, ph);
    if (this.rugTex) gl.deleteTexture(this.rugTex);
    this.rugTex = this.texFromCanvas(c, false, true);
    this.rugRef = rug;
  },
  refreshRug() { if (this.rugRef) this.setRug(this.rugRef); },
  setSim(sim) {
    const gl = this.gl;
    for (const k of ["A", "B", "C", "D", "E", "A0", "B0", "C0", "D0", "E0"]) if (this.tex[k]) gl.deleteTexture(this.tex[k]);
    const w = sim.gw, h = sim.gh;
    this.tex.A = this.dataTex(w, h); this.tex.B = this.dataTex(w, h); this.tex.C = this.dataTex(w, h); this.tex.D = this.dataTex(w, h);
    this.tex.A0 = this.dataTex(w, h); this.tex.B0 = this.dataTex(w, h); this.tex.C0 = this.dataTex(w, h); this.tex.D0 = this.dataTex(w, h);
    this.tex.E = this.dataTex(w, h); this.tex.E0 = this.dataTex(w, h);
    this.buf = { A: new Uint8Array(w * h * 4), B: new Uint8Array(w * h * 4), C: new Uint8Array(w * h * 4), D: new Uint8Array(w * h * 4), E: new Uint8Array(w * h * 4) };
    this.sim = sim;
    if (this.tex.FL) gl.deleteTexture(this.tex.FL);
    if (this.tex.FM) gl.deleteTexture(this.tex.FM);
    this.tex.FL = this.dataTex(sim.floor.fw, sim.floor.fh);
    this.tex.FM = this.dataTex(sim.floor.fw, sim.floor.fh, gl.LUMINANCE_ALPHA);
    this.flBuf = new Uint8Array(sim.floor.fw * sim.floor.fh * 4);
    this.fmBuf = new Uint8Array(sim.floor.fw * sim.floor.fh * 2);
    this.fmOn = false;
    this.stainLUT = STAIN_KEYS.map((k) => STAINS[k].col.map((v) => Math.round(v * 255)));
    sim.markAll();
    this.uploadSim(true);
  },
  uploadSim(force, toBefore) {
    const sim = this.sim, gl = this.gl;
    if (!sim || !this.ok) return;
    let d = sim.dirty;
    if (force) d = { x0: 0, y0: 0, x1: sim.gw - 1, y1: sim.gh - 1 };
    if (!d) return;
    sim.dirty = null;
    const gw = sim.gw;
    const y0 = d.y0, y1 = d.y1, rows = y1 - y0 + 1;
    const A = this.buf.A, Bb = this.buf.B, C = this.buf.C, Dd = this.buf.D, E = this.buf.E;
    const lut = this.stainLUT;
    for (let j = y0; j <= y1; j++) {
      for (let i = 0; i < gw; i++) {
        const k = j * gw + i, o = ((j - y0) * gw + i) * 4;
        A[o] = Math.min(255, sim.D[k] * 255); A[o + 1] = Math.min(255, sim.S[k] * 255); A[o + 2] = Math.min(255, sim.G[k] * 255); A[o + 3] = Math.min(255, sim.St[k] * 255);
        Bb[o] = Math.min(255, sim.W[k] / 1.6 * 255); Bb[o + 1] = Math.min(255, sim.F[k] / 1.4 * 255); Bb[o + 2] = Math.min(255, sim.L[k] / 1.5 * 255); Bb[o + 3] = Math.min(255, sim.So[k] * 255);
        const c = lut[sim.stT[k]] || lut[0];
        C[o] = c[0]; C[o + 1] = c[1]; C[o + 2] = c[2]; C[o + 3] = clamp((sim.N[k] * 0.5 + 0.5) * 255, 0, 255);
        Dd[o] = Math.min(255, sim.Fl[k] * 255); Dd[o + 1] = Math.min(255, sim.R[k] * 255); Dd[o + 2] = Math.min(255, sim.Dm[k] * 255); Dd[o + 3] = Math.min(255, sim.B[k] * 255);
        E[o] = Math.min(255, sim.H[k] * 255); E[o + 1] = Math.min(255, sim.Wr[k] * 255);
      }
    }
    const n = rows * gw * 4;
    const put = (t, buf) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, y0, gw, rows, gl.RGBA, gl.UNSIGNED_BYTE, buf.subarray(0, n)); };
    if (toBefore) { put(this.tex.A0, A); put(this.tex.B0, Bb); put(this.tex.C0, C); put(this.tex.D0, Dd); put(this.tex.E0, E); }
    else { put(this.tex.A, A); put(this.tex.B, Bb); put(this.tex.C, C); put(this.tex.D, Dd); put(this.tex.E, E); }
  },
  // the rug exactly as it looks now (dust, grime, stains), for screens drawn in 2D
  snapshotRug(outW) {
    const sim = this.sim, rug = this.rugRef, gl = this.gl;
    if (!sim || !rug || !this.ok) return null;
    this.uploadSim();
    const W = this.cv.width, H = this.cv.height;
    const s = Math.min(outW / sim.gw, (W - 4) / sim.gw, (H - 4) / sim.gh);
    const cam = { x: sim.gw / 2, y: sim.gh / 2, s };
    const noRip = new Float32Array(12).fill(-1);
    this.render(cam, { lamp: [sim.gw / 2, sim.gh / 2, Math.max(sim.gw, sim.gh) * 4], amb: 1, uv: [0, 0, 1, 0], t: G.t, rip: noRip, hint: 0, bleed: [0.85, 0.35, 0.38], mat: [rug.st.pile, rug.st.sheen, 0], reveal: 1e9, dust: rug.st.dust, split: null, dry: 0, vig: 0 });
    const rw = Math.max(1, Math.round(sim.gw * s)), rh = Math.max(1, Math.round(sim.gh * s));
    const x0 = Math.round(W / 2 - rw / 2), y0 = Math.round(H / 2 - rh / 2);
    const px = new Uint8Array(rw * rh * 4);
    gl.readPixels(x0, H - y0 - rh, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const tmp = this._snapTmp || (this._snapTmp = document.createElement("canvas"));
    tmp.width = rw; tmp.height = rh;
    const tx = tmp.getContext("2d"), id = tx.createImageData(rw, rh);
    // GL rows run bottom-up
    for (let y = 0; y < rh; y++) id.data.set(px.subarray((rh - 1 - y) * rw * 4, (rh - y) * rw * 4), y * rw * 4);
    tx.putImageData(id, 0, 0);
    const out = document.createElement("canvas");
    out.width = rw; out.height = rh;
    const ox = out.getContext("2d");
    ox.drawImage(tmp, 0, 0);
    // keep only the rug itself: gaps between fringe strands stay clear
    ox.globalCompositeOperation = "destination-in"; ox.drawImage(rug.canvas, 0, 0, rw, rh); ox.globalCompositeOperation = "source-over";
    return out;
  },
  // timelapse: copy of all sim textures, and showing one back
  snapFrame() {
    const s = this.sim; if (!s || !this.ok) return null;
    s.markAll(); this.uploadSim();
    const n4 = s.gw * s.gh * 4, b = this.buf;
    return { A: b.A.slice(0, n4), B: b.B.slice(0, n4), C: b.C.slice(0, n4), D: b.D.slice(0, n4), E: b.E.slice(0, n4) };
  },
  showFrame(f) {
    const s = this.sim, gl = this.gl; if (!s || !this.ok || !f) return;
    const put = (t, b) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, s.gw, s.gh, gl.RGBA, gl.UNSIGNED_BYTE, b); };
    put(this.tex.A, f.A); put(this.tex.B, f.B); put(this.tex.C, f.C); put(this.tex.D, f.D); put(this.tex.E, f.E);
  },
  snapshotBefore() { const s = this.sim; if (!s) return; this.uploadSim(true, true); s.markAll(); },
  uploadFloor() {
    const f = this.sim.floor, gl = this.gl;
    if (!f.dirty) return;
    f.dirty = false;
    const b = this.flBuf;
    for (let k = 0; k < f.fw * f.fh; k++) {
      const v = f.V[k];
      b[k * 4] = Math.min(255, f.wet[k] * 255);
      b[k * 4 + 1] = Math.min(255, v * 90);
      b[k * 4 + 2] = Math.min(255, (f.Lq[k] / (v + 0.02)) * 200);
      b[k * 4 + 3] = Math.min(255, f.Sd[k] * 170);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.tex.FL);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, f.fw, f.fh, gl.RGBA, gl.UNSIGNED_BYTE, b);
    // floor foam: amount and dirt share of the foam
    if (f.foamAny || this.fmOn) {
      const m = this.fmBuf, Fm = f.Fm, FmL = f.FmL;
      for (let k = 0; k < f.fw * f.fh; k++) {
        const a = Fm[k];
        m[k * 2] = Math.min(255, a / 1.6 * 255);
        m[k * 2 + 1] = a > 0.002 ? Math.min(255, FmL[k] / a * 255) : 0;
      }
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.FM);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, f.fw, f.fh, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, m);
      this.fmOn = f.foamAny;
    }
  },
  setFloor(key) {
    if (this.floorKey === key) return;
    const gl = this.gl;
    if (this.tex.floor) gl.deleteTexture(this.tex.floor);
    this.tex.floor = this.texFromCanvas(makeFloorCanvas(key), true, true);
    this.floorKey = key;
  },
  bindTex(unit, t) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); },
  render(cam, P) {
    const gl = this.gl;
    if (!this.ok) return;
    const W = this.cv.width, H = this.cv.height;
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const sim = this.sim;
    // floor
    const pf = this.pFloor; gl.useProgram(pf.p);
    const halfW = W / 2 / cam.s, halfH = H / 2 / cam.s;
    gl.uniform4f(pf.u.uRect, cam.x - halfW - 2, cam.y - halfH - 2, halfW * 2 + 4, halfH * 2 + 4);
    gl.uniform3f(pf.u.uCam, cam.x, cam.y, cam.s);
    gl.uniform2f(pf.u.uRes, W, H);
    gl.uniform3f(pf.u.uLamp, P.lamp[0], P.lamp[1], P.lamp[2]);
    gl.uniform1f(pf.u.uAmb, P.amb);
    const vg = P.vig === undefined ? 1 : P.vig;
    gl.uniform1f(pf.u.uVig, vg);
    gl.uniform4f(pf.u.uUV, P.uv[0], P.uv[1], P.uv[2], P.uv[3]);
    gl.uniform1f(pf.u.uT, P.t);
    gl.uniform1f(pf.u.uCpm, sim.cpm);
    gl.uniform1f(pf.u.uSnowF, P.snowFloor ? 1 : 0);
    const fl = sim.floor;
    gl.uniform4f(pf.u.uFR, fl.x0, fl.y0, fl.fw * fl.cs, fl.fh * fl.cs);
    gl.uniform4f(pf.u.uRug, 0, sim.by0, sim.gw, sim.by1);
    this.bindTex(0, this.tex.floor); gl.uniform1i(pf.u.uFloor, 0);
    this.bindTex(1, this.tex.FL); gl.uniform1i(pf.u.uFluid, 1);
    this.bindTex(2, this.noise); gl.uniform1i(pf.u.uN, 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // rug
    if (!P.hideRug) {
      const pr = this.pRug; gl.useProgram(pr.p);
      gl.uniform4f(pr.u.uRect, 0, 0, sim.gw, sim.gh);
      gl.uniform3f(pr.u.uCam, cam.x, cam.y, cam.s);
      gl.uniform2f(pr.u.uRes, W, H);
      gl.uniform3f(pr.u.uLamp, P.lamp[0], P.lamp[1], P.lamp[2]);
      gl.uniform1f(pr.u.uAmb, P.amb);
      gl.uniform1f(pr.u.uVig, vg);
      gl.uniform4f(pr.u.uUV, P.uv[0], P.uv[1], P.uv[2], P.uv[3]);
      gl.uniform2f(pr.u.uGrid, sim.gw, sim.gh);
      gl.uniform1f(pr.u.uT, P.t);
      gl.uniform3fv(pr.u.uRip, P.rip);
      gl.uniform1f(pr.u.uHint, P.hint);
      gl.uniform1f(pr.u.uSnow, sim.snow ? 1 : 0);
      gl.uniform3f(pr.u.uBleed, P.bleed[0], P.bleed[1], P.bleed[2]);
      gl.uniform3f(pr.u.uMat, P.mat[0], P.mat[1], P.mat[2]);
      gl.uniform1f(pr.u.uReveal, P.reveal);
      gl.uniform3f(pr.u.uDust, P.dust[0], P.dust[1], P.dust[2]);
      gl.uniform1f(pr.u.uDry, P.dry || 0);
      this.bindTex(0, this.rugTex); gl.uniform1i(pr.u.uBase, 0);
      this.bindTex(2, this.noise); gl.uniform1i(pr.u.uN, 2);
      const drawSet = (a, b, c, d, e) => {
        this.bindTex(3, a); gl.uniform1i(pr.u.uA, 3);
        this.bindTex(4, b); gl.uniform1i(pr.u.uB, 4);
        this.bindTex(5, c); gl.uniform1i(pr.u.uC, 5);
        this.bindTex(6, d); gl.uniform1i(pr.u.uD, 6);
        this.bindTex(7, e); gl.uniform1i(pr.u.uE, 7);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      if (P.split !== undefined && P.split !== null) {
        const sx = Math.round(P.split * W);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, 0, sx, H); drawSet(this.tex.A0, this.tex.B0, this.tex.C0, this.tex.D0, this.tex.E0);
        gl.scissor(sx, 0, W - sx, H); drawSet(this.tex.A, this.tex.B, this.tex.C, this.tex.D, this.tex.E);
        gl.disable(gl.SCISSOR_TEST);
      } else drawSet(this.tex.A, this.tex.B, this.tex.C, this.tex.D, this.tex.E);
    }
    // foam on the floor and over the rug edge
    const pm = this.pFoam;
    if (pm && !sim.snow && (fl.foamAny || this.fmOn || !P.hideRug)) {
      gl.useProgram(pm.p);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform4f(pm.u.uRect, fl.x0, fl.y0, fl.fw * fl.cs, fl.fh * fl.cs);
      gl.uniform3f(pm.u.uCam, cam.x, cam.y, cam.s);
      gl.uniform2f(pm.u.uRes, W, H);
      gl.uniform3f(pm.u.uLamp, P.lamp[0], P.lamp[1], P.lamp[2]);
      gl.uniform1f(pm.u.uAmb, P.amb);
      gl.uniform1f(pm.u.uVig, vg);
      gl.uniform4f(pm.u.uUV, P.uv[0], P.uv[1], P.uv[2], P.uv[3]);
      gl.uniform4f(pm.u.uFR, fl.x0, fl.y0, fl.fw * fl.cs, fl.fh * fl.cs);
      gl.uniform2f(pm.u.uGrid, sim.gw, sim.gh);
      gl.uniform4f(pm.u.uRug, 0, sim.by0, sim.gw, sim.by1);
      gl.uniform1f(pm.u.uT, P.t);
      gl.uniform1f(pm.u.uEdge, P.hideRug ? 0 : 1);
      gl.uniform1f(pm.u.uReveal, P.reveal);
      this.bindTex(1, this.tex.FM); gl.uniform1i(pm.u.uFoam, 1);
      this.bindTex(2, this.noise); gl.uniform1i(pm.u.uN, 2);
      this.bindTex(4, this.tex.B); gl.uniform1i(pm.u.uRB, 4);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }
  },
};

// ---------- procedural textures ----------
function makeNoiseCanvas() {
  const S = 256;
  const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d");
  const id = ctx.createImageData(S, S), d = id.data;
  const tile = (x, y, p, seed, py) => {
    py = py || p;
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash2(((a % p) + p) % p, ((b % py) + py) % py, seed);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  // worley points
  const CN = 5, pts = [];
  const rnd = mulberry(77);
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) { const n = 1 + (rnd() < 0.5 ? 1 : 0); for (let q = 0; q < n; q++) pts.push([(i + rnd()) / CN * S, (j + rnd()) / CN * S, 0.7 + rnd() * 0.6]); }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const o = (y * S + x) * 4;
    // fibers: stretched vertical value noise, 2 octaves
    let f = tile(x / 2, y / 8, S / 2, 1, S / 8) * 0.6 + tile(x / 1, y / 4, S, 2, S / 4) * 0.4;
    f = f * 0.85 + hash2(x, y, 9) * 0.15;
    // fbm
    let g = 0, amp = 0.5, tot = 0;
    for (let oc = 0; oc < 3; oc++) { const p = 4 << oc; g += tile(x / S * p, y / S * p, p, 20 + oc) * amp; tot += amp; amp *= 0.5; }
    g /= tot;
    // worley
    let f1 = 1e9, f2 = 1e9;
    for (const [px, py, w] of pts) {
      let dx = Math.abs(x - px), dy = Math.abs(y - py);
      if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy;
      const dd = Math.hypot(dx, dy) / w;
      if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
    }
    const cellR = S / CN * 0.6;
    d[o] = f * 255; d[o + 1] = clamp((g - 0.5) * 1.8 + 0.5, 0, 1) * 255;
    d[o + 2] = clamp(f1 / cellR, 0, 1) * 255; d[o + 3] = clamp((f2 - f1) / cellR * 2.2, 0, 1) * 255;
  }
  ctx.putImageData(id, 0, 0);
  return cv;
}

function makeFloorCanvas(key) {
  const S = 512;
  const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
  const x = cv.getContext("2d");
  const rnd = mulberry(strSeed(key));
  const id = x.createImageData(S, S), d = id.data;
  const base = { garage: [86, 83, 78], workshop: [150, 112, 84], plant: [70, 88, 86], yard: [226, 232, 240], dryroom: [132, 150, 150] }[key] || [100, 100, 100];
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    const o = (y * S + xx) * 4;
    const n1 = fbm2(xx / 64, y / 64, 3, 4), n2 = hash2(xx, y, 5);
    let c = base.slice();
    let k = 0.82 + n1 * 0.3 + (n2 - 0.5) * 0.08;
    if (key === "yard") k = 0.9 + n1 * 0.12 + (n2 - 0.5) * 0.04;
    if (key === "plant") k = 0.9 + n1 * 0.14 + (n2 - 0.5) * 0.05;
    d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = 255;
  }
  // wrap-friendly: blend edges (fbm here is not tiled; soften seams)
  x.putImageData(id, 0, 0);
  const seamFix = () => {
    const tmp = document.createElement("canvas"); tmp.width = S; tmp.height = S; const t = tmp.getContext("2d");
    t.drawImage(cv, S / 2, S / 2); t.drawImage(cv, -S / 2, S / 2); t.drawImage(cv, S / 2, -S / 2); t.drawImage(cv, -S / 2, -S / 2);
    const g = x.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
    x.save(); x.globalCompositeOperation = "source-over";
    const m = document.createElement("canvas"); m.width = S; m.height = S; const mx = m.getContext("2d");
    mx.drawImage(tmp, 0, 0); mx.globalCompositeOperation = "destination-in";
    const gg = mx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.7); gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(1, "rgba(0,0,0,1)");
    mx.fillStyle = gg; mx.fillRect(0, 0, S, S);
    x.drawImage(m, 0, 0); x.restore();
  };
  seamFix();
  if (key === "garage") {
    // expansion joints every 1 m (S/2 px)
    x.strokeStyle = "rgba(40,38,36,0.55)"; x.lineWidth = 2.5;
    for (const p of [0, S / 2]) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke(); }
    // cracks
    x.strokeStyle = "rgba(35,33,30,0.5)"; x.lineWidth = 1.2;
    for (let c = 0; c < 5; c++) { let px = rnd() * S, py = rnd() * S; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 14; s++) { px += (rnd() - 0.5) * 30; py += (rnd() - 0.3) * 22; x.lineTo(px, py); } x.stroke(); }
    // oil stains
    for (let c = 0; c < 6; c++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, "rgba(30,28,26,0.35)"); g.addColorStop(1, "rgba(30,28,26,0)"); x.save(); x.translate(rnd() * S, rnd() * S); x.scale(20 + rnd() * 50, 14 + rnd() * 30); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, TAU); x.fill(); x.restore(); }
  } else if (key === "workshop") {
    const T = S / 8; // 25 cm tiles
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const v = 0.88 + rnd() * 0.2;
      x.fillStyle = `rgba(${v > 1 ? 255 : 0},${v > 1 ? 240 : 0},${v > 1 ? 220 : 0},${Math.abs(v - 1) * 0.5})`;
      x.fillRect(i * T, j * T, T, T);
    }
    x.strokeStyle = "rgba(70,55,45,0.75)"; x.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * T, 0); x.lineTo(i * T, S); x.stroke(); x.beginPath(); x.moveTo(0, i * T); x.lineTo(S, i * T); x.stroke(); }
    x.strokeStyle = "rgba(255,240,220,0.12)"; x.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * T + 2, 0); x.lineTo(i * T + 2, S); x.stroke(); x.beginPath(); x.moveTo(0, i * T + 2); x.lineTo(S, i * T + 2); x.stroke(); }
  } else if (key === "plant") {
    for (let i = 0; i < 2500; i++) { x.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; x.fillRect(rnd() * S, rnd() * S, 1.5, 1.5); }
    x.strokeStyle = "rgba(20,30,30,0.35)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, S / 2); x.lineTo(S, S / 2); x.stroke();
  } else if (key === "dryroom") {
    // painted plaster wall with damp streaks and chipped paint
    for (let i = 0; i < 14; i++) { const px = rnd() * S; const g = x.createLinearGradient(px, 0, px + 18, 0); g.addColorStop(0, "rgba(60,80,82,0)"); g.addColorStop(0.5, "rgba(60,80,82,0.12)"); g.addColorStop(1, "rgba(60,80,82,0)"); x.fillStyle = g; x.fillRect(px, rnd() * S * 0.4, 18, S * (0.3 + rnd() * 0.6)); }
    for (let i = 0; i < 9; i++) { x.fillStyle = "rgba(225,228,220,0.35)"; x.beginPath(); const px = rnd() * S, py = rnd() * S; x.moveTo(px, py); for (let s2 = 0; s2 < 7; s2++) x.lineTo(px + (rnd() - 0.5) * 30, py + (rnd() - 0.5) * 22); x.closePath(); x.fill(); }
    x.strokeStyle = "rgba(40,50,52,0.35)"; x.lineWidth = 1;
    for (let c = 0; c < 3; c++) { let px = rnd() * S, py = rnd() * S; x.beginPath(); x.moveTo(px, py); for (let s2 = 0; s2 < 10; s2++) { px += (rnd() - 0.5) * 24; py += rnd() * 20; x.lineTo(px, py); } x.stroke(); }
  } else if (key === "yard") {
    for (let i = 0; i < 40; i++) { const px = rnd() * S, py = rnd() * S, a = rnd() * TAU; x.fillStyle = "rgba(150,165,190,0.25)"; x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.ellipse(0, 0, 9, 20, 0, 0, TAU); x.fill(); x.restore(); }
    for (let i = 0; i < 3000; i++) { x.fillStyle = "rgba(255,255,255,0.5)"; x.fillRect(rnd() * S, rnd() * S, 1, 1); }
  }
  return cv;
}
