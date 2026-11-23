"use strict";
// ═════════════════════════════════════════════ 6. MOTOR WEBGL2
// Utilidades mínimas de vectores y matrices (column-major, como espera GLSL).
const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const M4 = {
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  },
  lookAt(eye, target, up) {
    const z = V.norm(V.sub(eye, target)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V.dot(x, eye), -V.dot(y, eye), -V.dot(z, eye), 1]);
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  },
  invert(m) {
    const inv = new Float32Array(16);
    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
    let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    det = det ? 1 / det : 0;
    for (let i = 0; i < 16; i++) inv[i] *= det;
    return inv;
  },
  xform(m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w];
  },
};
const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const COL = {
  pos: hex(0x3fd6e8), neg: hex(0xff6f86), zero: hex(0xe6e1d3), amber: hex(0xffb53d), ok: hex(0x5ef0b0), hint: hex(0xb79bff),
  ivory: hex(0xf3ecd9), steel: hex(0x6f8a94), dark: hex(0x1d3740), ground: hex(0x163038), wood: hex(0x8a6a4c), white: hex(0xffffff),
};
const signCol = n => n > 0 ? COL.pos : n < 0 ? COL.neg : COL.zero;

const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec3 iPos;
layout(location=3) in vec3 iScale;
layout(location=4) in vec3 iRot;
layout(location=5) in vec4 iCol;
layout(location=6) in float iEmis;
uniform mat4 uVP;
out vec3 vNor; out vec3 vWorld; out vec4 vCol; out float vEmis;
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
void main(){
  mat3 R = rotY(iRot.y) * rotX(iRot.x) * rotZ(iRot.z);
  vec3 p = R * (aPos * iScale) + iPos;
  vNor = normalize(R * (aNor / max(iScale, vec3(1e-4))));
  vWorld = p; vCol = iCol; vEmis = iEmis;
  gl_Position = uVP * vec4(p, 1.0);
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vNor; in vec3 vWorld; in vec4 vCol; in float vEmis;
uniform vec3 uEye; uniform vec3 uSun; uniform vec3 uFog; uniform float uFogDen;
out vec4 outCol;
void main(){
  vec3 n = normalize(vNor);
  vec3 v = normalize(uEye - vWorld);
  float diff = max(dot(n, uSun), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 amb = mix(vec3(0.10, 0.13, 0.17), vec3(0.32, 0.38, 0.46), hemi);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.35;
  vec3 h = normalize(uSun + v);
  float spec = pow(max(dot(n, h), 0.0), 40.0) * 0.25;
  vec3 c = vCol.rgb * (amb + diff * vec3(0.78, 0.74, 0.68)) + spec + rim * vCol.rgb;
  c = mix(c, vCol.rgb * 1.35, clamp(vEmis, 0.0, 1.0));
  float d = length(uEye - vWorld);
  float f = 1.0 - exp(-pow(d * uFogDen, 1.6));
  c = mix(c, uFog, clamp(f, 0.0, 1.0));
  outCol = vec4(pow(c, vec3(1.0/1.12)), vCol.a);
}`;

const Engine = {
  gl: null, canvas: null, prog: null, uni: {}, geos: {}, ok: false, lost: false,
  queues: {}, dpr: 1, w: 1, h: 1, vp: null, invVP: null, eye: [0, 10, 10], target: [0, 0, 0],
  pickables: [], fogColor: hex(0x0c1d24), ox: 0, oz: 0,
  STRIDE: 14, MAXI: 4096,

  init(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) return { ok: false, msg: "Tu navegador o tu tarjeta gráfica no ofrecen WebGL2." };
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.lost = true; this.ok = false; App.toast("Se ha perdido el contexto gráfico. Recuperando…"); });
    canvas.addEventListener("webglcontextrestored", () => { this.lost = false; const r = this.setup(); if (r.ok) App.toast("Gráficos recuperados."); });
    return this.setup();
  },
  setup() {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("Error de shader: " + gl.getShaderInfoLog(s));
      return s;
    };
    try {
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Error al enlazar shaders: " + gl.getProgramInfoLog(p));
      this.prog = p;
    } catch (err) {
      console.error(err);
      return { ok: false, msg: err.message };
    }
    for (const u of ["uVP", "uEye", "uSun", "uFog", "uFogDen"]) this.uni[u] = gl.getUniformLocation(this.prog, u);
    this.instData = new Float32Array(this.MAXI * this.STRIDE);
    const G = Geo;
    this.geos = {};
    for (const [name, mk] of Object.entries({ box: G.box, cyl: G.cyl, sph: G.sph, cone: G.cone, torus: G.torus, ring: G.ring })) this.geos[name] = this.upload(mk());
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.ok = true;
    return { ok: true };
  },
  upload(g) {
    const gl = this.gl, vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.v), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.i), gl.STATIC_DRAW);
    const inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.bufferData(gl.ARRAY_BUFFER, this.MAXI * this.STRIDE * 4, gl.DYNAMIC_DRAW);
    const S = this.STRIDE * 4;
    [[2, 3, 0], [3, 3, 12], [4, 3, 24], [5, 4, 36], [6, 1, 52]].forEach(([loc, n, off]) => {
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, S, off); gl.vertexAttribDivisor(loc, 1);
    });
    gl.bindVertexArray(null);
    return { vao, inst, count: g.i.length };
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, App.lowPower ? 1 : 1.75);
    const w = Math.max(1, Math.floor(innerWidth * dpr)), h = Math.max(1, Math.floor(innerHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.dpr = dpr; this.w = innerWidth; this.h = innerHeight;
  },
  begin(eye, target) {
    this.eye = eye; this.target = target;
    for (const k in this.geos) this.queues[k] = [];
    this.pickables = [];
    const proj = M4.perspective(this.w < 600 ? 1.05 : 0.9, this.w / this.h, 0.1, 400);
    this.vp = M4.mul(proj, M4.lookAt(eye, target, [0, 1, 0]));
    this.invVP = M4.invert(this.vp);
  },
  // Añade una instancia. o = {rx, ry, rz, emis, a}
  add(geo, x, y, z, sx, sy, sz, col, o) {
    const q = this.queues[geo]; if (!q || q.length >= this.MAXI) return;
    q.push([x + this.ox, y, z + this.oz, sx, sy, sz, o?.rx || 0, o?.ry || 0, o?.rz || 0, col[0], col[1], col[2], o?.a ?? 1, o?.emis || 0]);
  },
  box(x, y, z, sx, sy, sz, col, o) { this.add("box", x, y, z, sx, sy, sz, col, o); },
  cyl(x, y, z, r, h, col, o) { this.add("cyl", x, y, z, r * 2, h, r * 2, col, o); },
  sph(x, y, z, r, col, o) { this.add("sph", x, y, z, r * 2, r * 2, r * 2, col, o); },
  cone(x, y, z, r, h, col, o) { this.add("cone", x, y, z, r * 2, h, r * 2, col, o); },
  torus(x, y, z, r, col, o) { this.add("torus", x, y, z, r * 2, r * 2, r * 2, col, o); },
  ring(x, y, z, r, col, o) { this.add("ring", x, y, z, r * 2, 1, r * 2, col, o); },
  // Segmento cilíndrico entre dos puntos.
  beam(a, b, r, col, o) {
    const d = V.sub(b, a), L = V.len(d); if (L < 1e-5) return;
    const ry = Math.atan2(d[0], d[2]), rx = Math.acos(Math.max(-1, Math.min(1, d[1] / L)));
    this.add("cyl", (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r * 2, L, r * 2, col, { ...o, ry, rx });
  },
  pick(id, p, r) { this.pickables.push({ id, p: [p[0] + this.ox, p[1], p[2] + this.oz], r }); },
  end() {
    const gl = this.gl; if (!this.ok) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const fc = this.fogColor;
    gl.clearColor(fc[0], fc[1], fc[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.uni.uVP, false, this.vp);
    gl.uniform3fv(this.uni.uEye, this.eye);
    gl.uniform3fv(this.uni.uSun, V.norm([-0.45, 0.8, 0.35]));
    gl.uniform3fv(this.uni.uFog, fc);
    gl.uniform1f(this.uni.uFogDen, 0.012);
    // Opacos primero, luego transparentes (ordenados de lejos a cerca).
    const transparent = [];
    for (const [name, q] of Object.entries(this.queues)) {
      const op = q.filter(r => r[12] >= 0.999);
      for (const r of q) if (r[12] < 0.999) transparent.push([name, r]);
      this.flush(name, op);
    }
    if (transparent.length) {
      const e = this.eye;
      transparent.sort((a, b) => ((b[1][0] - e[0]) ** 2 + (b[1][1] - e[1]) ** 2 + (b[1][2] - e[2]) ** 2) - ((a[1][0] - e[0]) ** 2 + (a[1][1] - e[1]) ** 2 + (a[1][2] - e[2]) ** 2));
      gl.depthMask(false);
      for (const [name, r] of transparent) this.flush(name, [r]);
      gl.depthMask(true);
    }
  },
  flush(name, rows) {
    if (!rows.length) return;
    const gl = this.gl, g = this.geos[name], d = this.instData, S = this.STRIDE;
    for (let i = 0; i < rows.length; i++) d.set(rows[i], i * S);
    gl.bindVertexArray(g.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.inst);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, rows.length * S);
    gl.drawElementsInstanced(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, 0, rows.length);
    gl.bindVertexArray(null);
  },
  project(p) {
    const c = M4.xform(this.vp, p);
    if (c[3] <= 0) return null;
    return [(c[0] * 0.5 + 0.5) * this.w, (1 - (c[1] * 0.5 + 0.5)) * this.h, c[2]];
  },
  ray(px, py) {
    const nx = px / this.w * 2 - 1, ny = 1 - py / this.h * 2;
    const a = M4.xform(this.invVP, [nx, ny, -1]), b = M4.xform(this.invVP, [nx, ny, 1]);
    return { o: a.slice(0, 3), d: V.norm(V.sub(b.slice(0, 3), a.slice(0, 3))) };
  },
  hitTest(px, py) {
    const r = this.ray(px, py); let best = null, bt = Infinity;
    for (const k of this.pickables) {
      const oc = V.sub(r.o, k.p), b = V.dot(oc, r.d), c = V.dot(oc, oc) - k.r * k.r, disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bt) { bt = t; best = k.id; }
    }
    return best;
  },
  groundHit(px, py, y = 0) {
    const r = this.ray(px, py); if (Math.abs(r.d[1]) < 1e-5) return null;
    const t = (y - r.o[1]) / r.d[1]; if (t < 0) return null;
    return V.add(r.o, V.scale(r.d, t));
  },
};

// Geometrías procedurales (unidad: caben en un cubo de lado 1 centrado).
const Geo = {
  box() {
    const v = [], i = [];
    const F = [[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
      [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]];
    for (const [n, u, w] of F) {
      const b = v.length / 6;
      for (const [su, sw] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        v.push(n[0] * .5 + u[0] * su * .5 + w[0] * sw * .5, n[1] * .5 + u[1] * su * .5 + w[1] * sw * .5, n[2] * .5 + u[2] * su * .5 + w[2] * sw * .5, ...n);
      i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    return { v, i };
  },
  cyl(seg = 20, top = 0.5) {
    const v = [], i = [];
    const bot = 0.5, slope = (bot - top);
    for (let k = 0; k <= seg; k++) {
      const a = k / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), n = V.norm([c, slope, s]);
      v.push(c * bot, -.5, s * bot, ...n, c * top, .5, s * top, ...n);
    }
    for (let k = 0; k < seg; k++) { const a = k * 2; i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    for (const [y, r, ny] of [[.5, top, 1], [-.5, bot, -1]]) {
      if (r <= 0) continue;
      const c0 = v.length / 6; v.push(0, y, 0, 0, ny, 0);
      for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; v.push(Math.cos(a) * r, y, Math.sin(a) * r, 0, ny, 0); }
      for (let k = 0; k < seg; k++) ny > 0 ? i.push(c0, c0 + k + 2, c0 + k + 1) : i.push(c0, c0 + k + 1, c0 + k + 2);
    }
    return { v, i };
  },
  cone() { return Geo.cyl(20, 0); },
  sph(seg = 16, rings = 10) {
    const v = [], i = [];
    for (let r = 0; r <= rings; r++) {
      const th = r / rings * Math.PI;
      for (let s = 0; s <= seg; s++) {
        const ph = s / seg * Math.PI * 2, n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        v.push(n[0] * .5, n[1] * .5, n[2] * .5, ...n);
      }
    }
    for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) {
      const a = r * (seg + 1) + s, b = a + seg + 1; i.push(a, a + 1, b, a + 1, b + 1, b);
    }
    return { v, i };
  },
  torus(seg = 40, sides = 8, R = 0.46, r = 0.04) {
    const v = [], i = [];
    for (let a = 0; a <= seg; a++) {
      const u = a / seg * Math.PI * 2;
      for (let b = 0; b <= sides; b++) {
        const w = b / sides * Math.PI * 2, n = [Math.cos(u) * Math.cos(w), Math.sin(w), Math.sin(u) * Math.cos(w)];
        v.push(Math.cos(u) * (R + r * Math.cos(w)), r * Math.sin(w), Math.sin(u) * (R + r * Math.cos(w)), ...n);
      }
    }
    for (let a = 0; a < seg; a++) for (let b = 0; b < sides; b++) {
      const p = a * (sides + 1) + b, q = p + sides + 1; i.push(p, q, p + 1, p + 1, q, q + 1);
    }
    return { v, i };
  },
  ring() { // disco plano (altura unidad muy fina) para marcas en el suelo
    const v = [], i = [], seg = 32;
    v.push(0, 0, 0, 0, 1, 0);
    for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; v.push(Math.cos(a) * .5, 0, Math.sin(a) * .5, 0, 1, 0); }
    for (let k = 0; k < seg; k++) i.push(0, k + 2, k + 1);
    return { v, i };
  },
};

// Rótulos DOM proyectados desde puntos 3D.
const Labels = {
  root: null, pool: new Map(), used: new Set(),
  init(root) { this.root = root; },
  begin() { this.used.clear(); },
  put(key, text, p, cls = "", dy = 0) {
    let el = this.pool.get(key);
    if (!el) { el = document.createElement("div"); el.className = "lbl"; this.root.appendChild(el); this.pool.set(key, el); el._t = null; el._c = null; }
    if (el._t !== text) { el.textContent = text; el._t = text; }
    const c = "lbl " + cls; if (el._c !== c) { el.className = c; el._c = c; }
    const s = Engine.project(p);
    if (!s || s[2] > 1) { el.style.display = "none"; return; }
    el.style.display = "";
    el.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] + dy).toFixed(1)}px) translate(-50%, -50%)`;
    this.used.add(key);
  },
  end() { for (const [k, el] of this.pool) if (!this.used.has(k)) el.style.display = "none"; },
  clear() { for (const el of this.pool.values()) el.remove(); this.pool.clear(); },
};
const fmt = n => n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0";
const fmtP = n => n < 0 ? "(" + fmt(n) + ")" : String(n);
const fmtPlain = n => n < 0 ? "−" + Math.abs(n) : String(n);
const signCls = n => n > 0 ? "pos" : n < 0 ? "neg" : "zero";
