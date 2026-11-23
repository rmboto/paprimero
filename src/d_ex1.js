// ═════════════════════════════════════════════ 7. ESCENAS: utilidades, partículas y modelos
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const easeOut = t => 1 - (1 - t) ** 3;
const easeBack = t => { const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
function anim(st, k, dur, data) { st.anim = { k, t0: App.now, dur: dur * App.motionScale, data }; }
function ap(st, k) { if (!st.anim || st.anim.k !== k) return null; return clamp((App.now - st.anim.t0) / st.anim.dur, 0, 1); }
const animDone = (st, k) => { const p = ap(st, k); return p !== null && p >= 1; };
const wob = (t, f = 1, a = 1) => Math.sin(t * f) * a;
// Escala vertical/horizontal: valor → coordenada.
const scaleOf = (max, span) => v => v / max * span;

// Partículas (instancias de esfera/caja en el motor).
const Fx = {
  list: [],
  burst(p, col, n, o = {}) {
    if (App.reduceMotion) n = Math.ceil(n / 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = (o.speed ?? 3) * (0.4 + Math.random() * 0.8);
      const r = Math.sqrt(1 - u * u);
      this.list.push({ p: p.slice(), v: [Math.cos(a) * r * sp, Math.abs(u) * sp * (o.up ?? 1) + (o.lift ?? 0), Math.sin(a) * r * sp],
        col, life: (o.life ?? 1) * (0.6 + Math.random() * 0.6), age: 0, g: o.g ?? 6, size: o.size ?? 0.08, geo: o.geo ?? "sph", spin: Math.random() * 6 });
    }
  },
  ring(p, col, o = {}) { this.list.push({ p: p.slice(), v: [0, 0, 0], col, life: o.life ?? 1.2, age: 0, g: 0, size: o.size ?? 0.2, geo: "ring", grow: o.grow ?? 3 }); },
  update(dt) {
    for (const f of this.list) { f.age += dt; f.v[1] -= f.g * dt; for (let k = 0; k < 3; k++) f.p[k] += f.v[k] * dt; }
    this.list = this.list.filter(f => f.age < f.life);
  },
  draw(E) {
    for (const f of this.list) {
      const k = 1 - f.age / f.life;
      if (f.geo === "ring") { const r = f.size + f.grow * (1 - k); E.ring(f.p[0], f.p[1], f.p[2], r, f.col, { a: 0.6 * k, emis: 0.6 }); }
      else if (f.geo === "box") E.box(f.p[0], f.p[1], f.p[2], f.size * 2, f.size * 2, f.size * 0.4, f.col, { emis: 0.7, ry: f.spin + f.age * 6, rx: f.age * 4 });
      else E.sph(f.p[0], f.p[1], f.p[2], f.size * (0.4 + 0.6 * k), f.col, { emis: 0.8, a: Math.min(1, k * 1.5) });
    }
  },
  clear() { this.list = []; },
};
const CONFETTI = [COL.amber, COL.pos, COL.neg, COL.ok, COL.hint, COL.ivory];
function confetti(p, n = 60) { for (const c of CONFETTI) Fx.burst(p, c, n / CONFETTI.length, { speed: 6, lift: 4, g: 7, life: 2, size: 0.12, geo: "box" }); }

// --- Modelos hechos con primitivas (posición local, orientación ry)
const Models = {
  hero(E, x, y, z, ry = 0, t = 0, run = 0, scarf = COL.amber) {
    const bob = Math.abs(Math.sin(t * 9)) * 0.08 * run, sw = Math.sin(t * 9) * 0.6 * run;
    const R = (dx, dz) => [x + Math.cos(ry) * dx + Math.sin(ry) * dz, z - Math.sin(ry) * dx + Math.cos(ry) * dz];
    let [a, b] = R(-0.1, sw * 0.12); E.box(a, y + 0.25, b, 0.12, 0.5, 0.12, hex(0x24324a), { ry });
    [a, b] = R(0.1, -sw * 0.12); E.box(a, y + 0.25, b, 0.12, 0.5, 0.12, hex(0x24324a), { ry });
    E.box(x, y + 0.72 + bob, z, 0.4, 0.5, 0.24, hex(0x2f6fd8), { ry });
    E.sph(x, y + 1.13 + bob, z, 0.17, hex(0xf0c39a));
    E.cyl(x, y + 0.98 + bob, z, 0.2, 0.08, scarf, { emis: 0.25 });
    E.sph(x, y + 1.19 + bob, z, 0.175, hex(0x3a2a1e), { a: 1 });
    [a, b] = R(-0.27, -sw * 0.1); E.box(a, y + 0.75 + bob, b, 0.1, 0.42, 0.1, hex(0x2f6fd8), { ry, rx: sw * 0.5 });
    [a, b] = R(0.27, sw * 0.1); E.box(a, y + 0.75 + bob, b, 0.1, 0.42, 0.1, hex(0x2f6fd8), { ry, rx: -sw * 0.5 });
  },
  dog(E, x, y, z, ry = 0, t = 0, happy = 0) {
    const wag = Math.sin(t * (happy ? 20 : 5)) * (happy ? 0.8 : 0.3), hop = happy ? Math.abs(Math.sin(t * 8)) * 0.25 : 0;
    const c = hex(0xd8a25e);
    E.box(x, y + 0.32 + hop, z, 0.5, 0.25, 0.25, c, { ry });
    E.sph(x + Math.cos(ry) * 0.3, y + 0.5 + hop, z - Math.sin(ry) * 0.3, 0.16, c);
    E.box(x + Math.cos(ry) * 0.42, y + 0.47 + hop, z - Math.sin(ry) * 0.42, 0.12, 0.08, 0.1, hex(0x3a2a1e), { ry });
    E.box(x - Math.cos(ry) * 0.3, y + 0.45 + hop, z + Math.sin(ry) * 0.3, 0.05, 0.22, 0.05, c, { ry, rz: 0.6 + wag });
    for (const [dx, dz] of [[0.17, 0.08], [0.17, -0.08], [-0.17, 0.08], [-0.17, -0.08]]) E.box(x + dx * Math.cos(ry) + dz * Math.sin(ry), y + 0.12 + hop, z - dx * Math.sin(ry) + dz * Math.cos(ry), 0.07, 0.22, 0.07, c);
  },
  plane(E, x, y, z, pitch = 0, roll = 0, col = COL.ivory, t = 0, ry = Math.PI / 2) {
    E.cyl(x, y, z, 0.22, 1.6, col, { ry, rx: Math.PI / 2 - pitch, rz: roll });
    const fx = Math.sin(ry), fz = Math.cos(ry), cp = Math.cos(pitch), sp = Math.sin(pitch);
    E.cone(x + fx * 0.95 * cp, y + sp * 0.95, z + fz * 0.95 * cp, 0.22, 0.35, COL.amber, { ry, rx: Math.PI / 2 - pitch });
    // Alas a lo ancho (perpendiculares al fuselaje), cola y hélice que gira sobre el eje del avión.
    E.box(x, y + 0.02, z, 2.4, 0.06, 0.5, col, { ry, rz: roll, rx: -pitch });
    E.box(x - fx * 0.7 * cp, y + 0.25 - sp * 0.7, z - fz * 0.7 * cp, 0.06, 0.45, 0.3, COL.neg, { ry, rx: -pitch });
    E.box(x - fx * 0.7 * cp, y + 0.02 - sp * 0.7, z - fz * 0.7 * cp, 0.9, 0.05, 0.25, col, { ry, rx: -pitch });
    E.box(x + fx * 1.13 * cp, y + sp * 1.13, z + fz * 1.13 * cp, 0.06, 0.9, 0.05, hex(0x333333), { ry, rz: t * 40 });
  },
  sub(E, x, y, z, col = hex(0xffc233), t = 0, ry = Math.PI / 2, lights = 1) {
    E.sph(x, y, z, 0.6, col, { ry });
    E.cyl(x, y, z, 0.6, 1.4, col, { ry, rx: Math.PI / 2 });
    E.sph(x + Math.sin(ry) * 0.7, y, z + Math.cos(ry) * 0.7, 0.6, col);
    E.sph(x - Math.sin(ry) * 0.7, y, z - Math.cos(ry) * 0.7, 0.6, col);
    E.box(x, y + 0.65, z, 0.5, 0.45, 0.35, col, { ry });
    E.cyl(x, y + 1.0, z, 0.04, 0.4, hex(0x555555));
    E.sph(x + Math.sin(ry) * 0.3, y + 0.05, z + Math.cos(ry) * 0.3 + 0.5, 0.14, hex(0x8fe4ff), { emis: lights * 0.8 });
    E.sph(x - Math.sin(ry) * 0.2, y + 0.05, z - Math.cos(ry) * 0.2 + 0.5, 0.14, hex(0x8fe4ff), { emis: lights * 0.8 });
    E.box(x - Math.sin(ry) * 1.35, y, z - Math.cos(ry) * 1.35, 0.05, 0.6, 0.05, hex(0x555555), { ry, rz: t * 20 });
  },
  balloon(E, x, y, z, t = 0, col = COL.neg) {
    const s = Math.sin(t * 1.2) * 0.04;
    E.sph(x, y + 2.3, z, 1.25, col, { a: 1 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; E.box(x + Math.cos(a) * 1.0, y + 2.3, z + Math.sin(a) * 1.0, 0.08, 2.0, 0.08, i % 2 ? COL.amber : COL.ivory, { ry: -a, rz: 0.15 + s }); }
    E.cone(x, y + 0.9, z, 0.6, 0.7, col, { rx: Math.PI });
    for (const [dx, dz] of [[.3, .3], [-.3, .3], [.3, -.3], [-.3, -.3]]) E.beam([x + dx * 0.9, y + 0.4, z + dz * 0.9], [x + dx * 1.4, y + 1.1, z + dz * 1.4], 0.015, hex(0x553f2a));
    E.box(x, y + 0.15, z, 0.75, 0.5, 0.75, COL.wood);
    E.cone(x, y + 0.75, z, 0.12, 0.3, COL.amber, { emis: 0.9 + Math.sin(t * 20) * 0.1 });
  },
  lantern(E, x, y, z, t = 0, col = COL.amber, a = 1) {
    const sw = Math.sin(t * 2) * 0.1;
    E.cyl(x, y, z, 0.35, 0.6, col, { emis: 0.85, a, rz: sw });
    E.cyl(x, y + 0.36, z, 0.25, 0.12, hex(0x7a3b20), { a, rz: sw });
    E.cyl(x, y - 0.36, z, 0.25, 0.12, hex(0x7a3b20), { a, rz: sw });
    E.box(x + 0.45, y + 0.1, z, 0.5, 0.05, 0.2, col, { emis: 0.6, a, rz: 0.4 + Math.sin(t * 6) * 0.5 });
    E.box(x - 0.45, y + 0.1, z, 0.5, 0.05, 0.2, col, { emis: 0.6, a, rz: -0.4 - Math.sin(t * 6) * 0.5 });
  },
  bird(E, x, y, z, t = 0) {
    const f = Math.sin(t * 10) * 0.6;
    E.sph(x, y, z, 0.18, COL.ivory); E.cone(x + 0.22, y, z, 0.06, 0.15, COL.amber, { rz: -Math.PI / 2 });
    E.box(x, y + 0.05, z + 0.25, 0.25, 0.03, 0.4, COL.ivory, { rx: f }); E.box(x, y + 0.05, z - 0.25, 0.25, 0.03, 0.4, COL.ivory, { rx: -f });
  },
  diver(E, x, y, z, t = 0) {
    E.box(x, y, z, 0.9, 0.26, 0.3, hex(0x1c1c1c), { rz: 0.1 * Math.sin(t) });
    E.sph(x + 0.55, y + 0.05, z, 0.17, hex(0x1c1c1c)); E.sph(x + 0.62, y + 0.08, z + 0.1, 0.09, COL.pos, { emis: 0.5 });
    E.cyl(x, y + 0.2, z, 0.1, 0.5, COL.amber, { rz: Math.PI / 2 });
    E.box(x - 0.55, y, z, 0.35, 0.05, 0.35, COL.amber, { rz: Math.sin(t * 6) * 0.4 });
  },
  fish(E, x, y, z, t = 0, col = COL.neg) {
    E.sph(x, y, z, 0.3, col, { emis: 0.2 }); E.cone(x - 0.35, y, z, 0.2, 0.3, col, { rz: Math.PI / 2, ry: Math.sin(t * 8) * 0.4 });
    E.sph(x + 0.18, y + 0.06, z + 0.12, 0.05, hex(0x111111));
  },
  buoy(E, x, y, z, t = 0) {
    const b = Math.sin(t * 2) * 0.06;
    E.cyl(x, y + 0.2 + b, z, 0.35, 0.5, COL.neg); E.cyl(x, y + 0.5 + b, z, 0.36, 0.12, COL.ivory);
    E.cone(x, y + 0.85 + b, z, 0.2, 0.5, COL.neg); E.sph(x, y + 1.15 + b, z, 0.09, COL.amber, { emis: 0.5 + 0.5 * Math.sin(t * 4) });
  },
  cabin(E, x, y, z, col = COL.neg, t = 0) {
    E.box(x, y, z, 0.9, 0.8, 0.7, col); E.box(x, y + 0.1, z, 0.92, 0.32, 0.72, hex(0x9fdcff), { emis: 0.35 });
    E.box(x, y + 0.48, z, 1.0, 0.1, 0.8, hex(0x333333)); E.beam([x, y + 0.5, z], [x, y + 1.2, z], 0.03, hex(0x777777));
  },
  drone(E, x, y, z, t = 0, tilt = 0) {
    E.box(x, y, z, 0.7, 0.18, 0.7, hex(0x30343a), { rz: tilt });
    E.sph(x, y - 0.05, z + 0.38, 0.1, COL.pos, { emis: 0.9 });
    for (const [dx, dz] of [[.5, .5], [-.5, .5], [.5, -.5], [-.5, -.5]]) {
      E.beam([x, y, z], [x + dx, y + 0.05, z + dz], 0.04, hex(0x30343a));
      E.cyl(x + dx, y + 0.12, z + dz, 0.32, 0.02, hex(0xc9d3d8), { a: 0.45, ry: t * 50 });
      E.sph(x + dx, y + 0.08, z + dz, 0.06, COL.amber, { emis: 0.8 });
    }
  },
};

// Entornos reutilizables.
const Env = {
  water(E, t, w = 60, d = 30, y = 0, col = hex(0x1d6f86), a = 0.55) {
    E.box(0, y - 0.05, 0, w, 0.1, d, col, { a, emis: 0.05 });
    if (App.reduceMotion) return;
    for (let i = 0; i < 26; i++) {
      const x = ((i * 7.3 + t * 0.6) % w) - w / 2, z = ((i * 3.7) % d) - d / 2;
      E.box(x, y + 0.01, z, 1.4, 0.02, 0.06, hex(0x9fe6ff), { a: 0.25 + 0.15 * Math.sin(t * 2 + i), emis: 0.5 });
    }
  },
  // Mar visto en corte (como un acuario): el volumen queda detrás de la acción y la superficie es una línea.
  sea(E, t, depth, col = hex(0x135a74), w = 90) {
    E.box(0, -depth / 2, -11, w, depth, 20, col, { a: 0.92 });
    E.box(0, -depth / 2, -0.9, w, depth, 0.05, lerp3(col, COL.white, 0.15), { a: 0.18, emis: 0.2 });
    E.box(0, -0.03, -6, w, 0.06, 12, hex(0x6fd3ee), { a: 0.45, emis: 0.4 });
    if (App.reduceMotion) return;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 4.7 + t * 1.2) % w) - w / 2;
      E.box(x, 0.02 + Math.sin(t * 2 + i) * 0.04, -1 - (i % 5) * 2, 1.6, 0.05, 0.12, hex(0xbff3ff), { a: 0.5, emis: 0.7 });
    }
    for (let i = 0; i < 18; i++) {
      const yy = -((i * 1.9 + t * 0.6) % depth);
      E.box(-30 + i * 3.4 + Math.sin(t + i) * 0.5, yy, -3 - (i % 4), 0.06, 0.6 + (i % 3) * 0.4, 0.02, hex(0x9fe6ff), { a: 0.25, emis: 0.5 });
    }
  },
  clouds(E, t, n = 8, y0 = 6, spread = 40, z = -6, speed = 0.6) {
    for (let i = 0; i < n; i++) {
      const x = ((i * 13.1 + t * speed) % spread) - spread / 2, y = y0 + (i % 3) * 1.6, zz = z - (i % 4) * 1.5;
      for (let k = 0; k < 4; k++) E.sph(x + k * 0.7, y + Math.sin(k * 2) * 0.25, zz, 0.6 + (k % 2) * 0.25, hex(0xe8f1f5), { a: 0.85 });
    }
  },
  stars(E, t, n = 70, R = 70) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, b = (i * 0.618) % 1, x = Math.cos(a) * R, z = Math.sin(a) * R - 20, y = 12 + b * 40;
      E.sph(x, y, z, 0.12 + (i % 3) * 0.05, COL.ivory, { emis: 0.6 + 0.4 * Math.sin(t * 2 + i) });
    }
  },
  // Columna graduada vertical (altímetro) en x, de -max a +max.
  gauge(E, x, z, max, span, step, tag, labelEvery = 1, hl = null) {
    E.box(x, 0, z, 0.12, span * 2 + 0.4, 0.12, COL.steel);
    const n = Math.round(max / step);
    for (let k = -n; k <= n; k++) {
      const v = k * step, y = v / max * span;
      const major = k % labelEvery === 0 || v === 0;
      E.box(x + (major ? 0.22 : 0.12), y, z, major ? 0.45 : 0.25, 0.04, 0.05, v === 0 ? COL.zero : signCol(v), { emis: 0.4 });
      if (major) Labels.put(tag + v, fmt(v), [x - 0.55, y, z], "small " + signCls(v) + (hl === v ? " goal" : ""));
    }
  },
};
// Etiquetas que conviene mostrar en una recta con muchas marcas.
function labelStride(n) { return n <= 21 ? 1 : n <= 31 ? 2 : 5; }

// ═════════════════════════════════════════════ 5. REGISTRO DE AVENTURAS
const EX = {};

// ───────────────────────────── 1. SALTARROCAS · situar enteros en la recta
EX.rocas = {
  id: "rocas", name: "Saltarrocas", skill: "Situar enteros en la recta", icon: "⟷", tint: "#3fd6e8", music: "rocas", fog: 0x10283a,
  blurb: "Un perrito se ha quedado atrapado en una roca del río. Cada roca lleva un número: salta en el orden indicado y llega hasta él.",
  level: L => { const d = D(L); return `Nivel ${L}: ${d.count} saltos a números entre −${d.max} y +${d.max}${d.step > 1 ? `, múltiplos de ${d.step} (una roca cada ${d.step})` : ""}${L >= 3 ? "; el cero puede aparecer" : ""}${L >= 7 ? "; destinos muy próximos entre sí" : ""}.`; },
  make: (rng, L) => MathModel.situar(rng, L),
  validate: q => Validate.situar(q),
  init(q) { return { i: 0, cur: 0, at: 0, from: 0, path: [], fails: 0 }; },
  sx(q) { const n = q.ticks.length; return Math.min(1.4, 30 / (n - 1)); },
  xOf(q, v) { return v / q.step * this.sx(q); },
  ui(q, st, A) {
    A.ctl.append(A.p(`Toca una roca (o muévete con ← →) y pulsa «Comprobar» para saltar.`));
    const chips = A.h("div", { class: "chips", role: "list", "aria-label": "Orden de los saltos" });
    q.values.forEach((v, k) => chips.append(A.h("span", { class: `chip ${signCls(v)}${k < st.i ? " done" : ""}`, role: "listitem", "aria-current": k === st.i ? "step" : null }, `${k + 1}º ${fmt(v)}`)));
    A.ctl.append(chips);
    const row = A.h("div", { class: "row" });
    row.append(A.btn("◀ Roca", () => this.move(q, st, -1, A), "Mover la selección a la roca de la izquierda"),
      A.h("span", { class: "num", style: "font-size:22px;min-width:70px;text-align:center", "aria-live": "polite" }, `${fmt(st.cur)}`),
      A.btn("Roca ▶", () => this.move(q, st, 1, A), "Mover la selección a la roca de la derecha"));
    A.ctl.append(row);
  },
  move(q, st, d, A) { st.cur = clamp(st.cur + d * q.step, q.min, q.max); Music.cue("tick", st.cur / q.max * 3); A.refresh(); },
  key(q, st, e, A) { if (e.key === "ArrowLeft") { this.move(q, st, -1, A); return true; } if (e.key === "ArrowRight") { this.move(q, st, 1, A); return true; } return false; },
  pick(q, st, id, A) { if (id?.startsWith("rock:")) { st.cur = +id.slice(5); Music.cue("tick", st.cur / q.max * 3); A.refresh(); } },
  check(q, st) {
    if (st.anim && !animDone(st, st.anim.k)) return { notReady: true, msg: "Espera a que termine el salto." };
    const target = q.values[st.i], x = st.cur;
    st.from = st.at; anim(st, "jump", 0.75, { to: x, ok: x === target });
    Music.cue("jump", x / q.max);
    if (x === target) {
      st.at = x; st.path.push(x); st.i++;
      setTimeout(() => Music.cue("land"), 700 * App.motionScale);
      if (st.i >= q.values.length) return { ok: true, msg: `¡Rescate completado! Has pisado ${q.values.map(fmt).join(", ")}: ${this.reason(q)}` };
      return { partial: true, msg: `Bien: ${fmt(x)} ${x > 0 ? "está a la derecha del cero (positivo)" : x < 0 ? "está a la izquierda del cero (negativo)" : "es el cero, ni positivo ni negativo"}. Siguiente salto: ${fmt(q.values[st.i])}.` };
    }
    setTimeout(() => { Music.cue("splash"); Fx.burst([this.xOf(q, x), 0.2, 0], hex(0x9fe6ff), 30, { speed: 4, lift: 3 }); Fx.ring([this.xOf(q, x), 0.02, 0], hex(0x9fe6ff)); }, 650 * App.motionScale);
    if (x === -target) return { ok: false, tag: "signo", msg: `Has saltado a ${fmt(x)}, el opuesto. ${fmt(target)} es ${target > 0 ? "positivo: está a la derecha" : "negativo: está a la izquierda"} del cero, a ${Math.abs(target)} de distancia.` };
    const dir = target > x ? "derecha" : "izquierda";
    const tag = (x < 0 && target < 0 && Math.abs(x) < Math.abs(target)) || (x < 0 && target < 0) ? "absoluto" : "colocacion";
    return { ok: false, tag, msg: `Esa roca es ${fmt(x)}. ${fmt(target)} está más a la ${dir}: ${target < x ? `${fmt(target)} es menor que ${fmt(x)}` : `${fmt(target)} es mayor que ${fmt(x)}`} porque está más a la ${dir} en la recta.` };
  },
  reason: q => `los positivos quedan a la derecha del cero y los negativos a la izquierda; cuanto más a la izquierda, menor es el número.`,
  hint(q, st, n) { st.hl = n; Music.cue("hint"); const t = q.values[st.i];
    return n === 1 ? `Busca la roca blanca con el rombo ◇: es el cero. ${t > 0 ? "Los positivos están a su derecha" : t < 0 ? "Los negativos están a su izquierda" : "Tu destino es justo ese"}.`
      : `${fmt(t)} está a ${Math.abs(t)} unidades del cero hacia la ${t > 0 ? "derecha" : "izquierda"}${q.step > 1 ? ` (${Math.abs(t) / q.step} rocas)` : ""}. La roca brilla en violeta.`; },
  demo(q, st) { st.demoQ = q.values.slice(st.i); st.demoT = App.now; st.cur = st.demoQ[0] ?? st.cur; },
  draw(E, t, dt, q, st) {
    const sx = this.sx(q), W = (q.ticks.length - 1) * sx + 8;
    Env.stars(E, t);
    E.box(0, -0.6, -7, W + 20, 1, 6, hex(0x2c5136)); E.box(0, -0.6, 7, W + 20, 1, 6, hex(0x2c5136));
    for (let i = 0; i < 14; i++) { const x = -W / 2 - 6 + i * (W + 12) / 13; E.cone(x, 1.4, -8 - (i % 3), 1.1, 3, hex(0x1f4a33)); E.cyl(x, 0, -8 - (i % 3), 0.15, 0.8, COL.wood); }
    Env.water(E, t, W + 20, 8, 0, hex(0x17607a), 0.7);
    // Demo: salta solo por las rocas que faltan.
    if (st.demoQ && st.demoQ.length && (!st.anim || animDone(st, st.anim.k))) {
      const v = st.demoQ.shift(); st.from = st.at; st.at = v; st.cur = v; st.path.push(v); st.i = Math.min(q.values.length, st.i + 1);
      anim(st, "jump", 0.75, { to: v, ok: true }); Music.cue("jump", v / q.max);
    }
    const stride = labelStride(q.ticks.length);
    q.ticks.forEach((v, k) => {
      const x = v / q.step * sx, isT = st.hl === 2 && v === q.values[st.i], sel = v === st.cur;
      const sink = st.anim?.k === "jump" && !st.anim.data.ok && st.anim.data.to === v ? Math.sin(ap(st, "jump") * Math.PI) * 0.25 : 0;
      const base = v === 0 ? COL.zero : lerp3(hex(0x6c6f73), signCol(v), 0.25);
      E.cyl(x, 0.05 - sink, 0, 0.42 * sx, 0.35, base, { emis: isT ? 0.6 : 0 });
      if (v === 0) E.box(x, 0.3, 0, 0.25, 0.25, 0.25, COL.zero, { ry: t, rz: Math.PI / 4, emis: st.hl === 1 ? 0.9 : 0.3 });
      if (isT) E.cyl(x, 0.25, 0, 0.5 * sx, 0.04, COL.hint, { emis: 1, a: 0.6 + 0.4 * Math.sin(t * 6) });
      if (sel) E.ring(x, 0.25, 0, 0.9 * sx, COL.amber, { emis: 1, a: 0.85 });
      E.pick("rock:" + v, [x, 0.1, 0], Math.max(0.45, 0.5 * sx));
      if (k % stride === 0 || v === 0 || sel || isT) Labels.put("rk" + v, fmt(v), [x, 0.45, 0.9], (sel ? "goal " : "") + signCls(v) + (q.ticks.length > 25 ? " small" : ""));
    });
    if (st.hl === 1) { for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) E.cone(s * k * 2.2, 1.6, 0, 0.22, 0.5, s > 0 ? COL.pos : COL.neg, { rz: -s * Math.PI / 2, emis: 0.7 }); }
    // Perrito en la última roca.
    const last = q.values[q.values.length - 1], dx = last / q.step * sx, saved = st.i >= q.values.length && animDone(st, "jump");
    if (!saved) Models.dog(E, dx, 0.22, 0, Math.PI, t);
    // Héroe saltando.
    let hx = st.at / q.step * sx, hy = 0.22;
    const p = ap(st, "jump");
    if (p !== null && p < 1) {
      const a = st.from / q.step * sx, b = st.anim.data.to / q.step * sx, ok = st.anim.data.ok;
      const pp = ok ? p : Math.min(p * 1.6, 1);
      hx = lerp(a, b, ease(ok ? p : (p < 0.62 ? p / 0.62 : 1 - (p - 0.62) / 0.38)));
      hy = 0.22 + Math.sin((ok ? p : Math.min(1, p / 0.62)) * Math.PI) * (1.2 + Math.abs(b - a) * 0.15) - (!ok && p > 0.62 ? 0.6 * Math.sin((p - 0.62) / 0.38 * Math.PI) : 0);
      Music.mood.height = clamp(hy / 3, 0, 1);
      if (!ok && pp >= 1 && p > 0.62) hy = Math.max(hy, -0.3);
    } else Music.mood.height = st.at / q.max * 0.5;
    Music.mood.intensity = 0.3 + 0.1 * st.i;
    const facing = (st.anim?.data?.to ?? st.at) >= hx ? Math.PI / 2 : -Math.PI / 2;
    Models.hero(E, hx, hy, 0, facing, t, p !== null && p < 1 ? 1 : 0);
    if (saved) {
      Models.dog(E, hx + 0.6, 0.22, 0.3, -Math.PI / 2, t, 1);
      if (!st.party) { st.party = 1; confetti([hx, 2, 0], 80); Music.cue("fanfare"); }
    }
    st.heroX = hx;
  },
  cam(q, st) { const sx = this.sx(q), w = (q.ticks.length - 1) * sx; const fx = clamp((st.heroX ?? 0) * 0.35, -w / 3, w / 3);
    const dist = Math.max(10, w * 0.62); return [[fx, dist * 0.55, dist * 0.8], [fx, 0, 0]]; },
  diorama(E, t) { for (let i = -2; i <= 2; i++) E.cyl(i * 1.1, 0.1, 0, 0.4, 0.3, i ? lerp3(hex(0x6c6f73), signCol(i), .3) : COL.zero); Env.water(E, t, 6, 2.4, 0.02); Models.hero(E, -1.1 + ((t * 0.8) % 2.2), 0.3 + Math.abs(Math.sin(t * 2.85)) * 0.6, 0, Math.PI / 2, t, 1); Models.dog(E, 2.2, 0.25, 0, Math.PI, t); },
};
function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

// ───────────────────────────── 2. EXPEDICIÓN VERTICAL · comparar y ordenar
EX.vertical = {
  id: "vertical", name: "Expedición vertical", skill: "Comparar y ordenar", icon: "⇅", tint: "#ffb53d", music: "vertical", fog: 0x14324a,
  blurb: "Avionetas, gaviotas, buzos y submarinos esperan en el muelle. Ordénalos de la cota más baja a la más alta y míralos salir disparados a su sitio.",
  level: L => { const d = D(L); return `Nivel ${L}: ordenar ${Math.min(6, d.count + 1)} cotas entre −${d.max} y +${d.max} m${L >= 3 ? ", con trampas como −8 y −3 o 7 y −7" : ""}${L >= 6 ? "; cotas próximas entre sí" : ""}.`; },
  make: (rng, L) => MathModel.ordenar(rng, L),
  validate: q => Validate.ordenar(q),
  init(q) { return { order: [], launched: false }; },
  kindOf(v, k) { return v > 0 ? ["avion", "bird", "balloon"][k % 3] : v < 0 ? ["sub", "diver", "fish"][k % 3] : "buoy"; },
  ui(q, st, A) {
    A.ctl.append(A.p("Toca los viajeros de la cota más baja a la más alta (también con estos botones)."));
    const chips = A.h("div", { class: "chips" });
    q.values.forEach((v, k) => {
      const ord = st.order.indexOf(k);
      chips.append(A.h("button", { type: "button", class: `chip ${signCls(v)}`, "aria-pressed": ord >= 0 ? "true" : "false",
        onclick: () => this.toggle(q, st, k, A) }, `${fmt(v)} m`, ord >= 0 ? A.h("span", { class: "ord" }, `${ord + 1}º`) : ""));
    });
    A.ctl.append(chips);
    A.ctl.append(A.h("div", { class: "row" }, A.btn("Deshacer último", () => { st.order.pop(); st.launched = false; A.refresh(); }), A.h("span", { class: "num" }, st.order.map(k => fmt(q.values[k])).join(" < "))));
  },
  toggle(q, st, k, A) { if (st.launched) { st.launched = false; st.order = []; } const i = st.order.indexOf(k); if (i >= 0) st.order.splice(i, 1); else st.order.push(k); Music.cue("tick", st.order.length); A.refresh(); },
  pick(q, st, id, A) { if (id?.startsWith("trav:")) this.toggle(q, st, +id.slice(5), A); },
  check(q, st) {
    if (st.order.length < q.values.length) return { notReady: true, msg: `Te faltan ${q.values.length - st.order.length} viajeros por ordenar.` };
    st.launched = true; anim(st, "launch", 2.2); Music.cue("whoosh", 1);
    const got = st.order.map(k => q.values[k]);
    if (got.join() === q.answer.join()) return { ok: true, msg: `Correcto: ${q.answer.map(fmt).join(" < ")}. Cuanto más abajo está la cota, menor es el número: los negativos son profundidades.` };
    const byAbs = q.values.slice().sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const i = got.findIndex((v, k) => v !== q.answer[k]);
    const a = got[i], b = q.answer[i];
    if (got.join() === byAbs.join() || (a < 0 && b < 0)) return { ok: false, tag: "absoluto", msg: `Fíjate en ${fmt(Math.min(a, b))} y ${fmt(Math.max(a, b))}: ${fmt(Math.min(a, b))} está más hondo, así que es menor. No compares las distancias al cero, compara las cotas.` };
    return { ok: false, tag: "colocacion", msg: `En el puesto ${i + 1}º va ${fmt(b)}, no ${fmt(a)}: ${fmt(b)} < ${fmt(a)} porque ${fmt(b)} queda más abajo.` };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint");
    return n === 1 ? "La superficie del mar es la cota cero. Los negativos están bajo el agua: cuanto más profundo, menor." : `El primero de la fila (el menor) es ${fmt(q.answer[0])}. Brilla en violeta.`; },
  demo(q, st) { st.order = q.answer.map(v => q.values.indexOf(v)); st.launched = true; anim(st, "launch", 2.6); Music.cue("whoosh", 1); },
  draw(E, t, dt, q, st) {
    const span = 7, y = v => v / q.max * span, n = q.values.length;
    Env.stars(E, t, 40);
    Env.sea(E, t, span + 1.5);
    E.box(0, -span - 1.2, -5, 60, 0.4, 14, hex(0x2c3b40));
    Env.clouds(E, t, 6, span * 0.6, 40, -8, 0.4);
    for (let i = 0; i < 12; i++) E.box(-14 + i * 2.5, -span - 0.5 + Math.sin(i) * 0.4, -3, 2.4, 1, 6, hex(0x2c3b40));
    E.box(-1, 0.3, 2.5, n * 2.2 + 2, 0.2, 1.4, COL.wood);
    Env.gauge(E, -n * 1.1 - 3.5, 0, q.max, span, niceStep(q.max), "vg", 2, null);
    if (st.hl === 1) E.box(0, 0.02, 0, 40, 0.05, 30, COL.zero, { a: 0.25 + 0.2 * Math.sin(t * 4), emis: 1 });
    const p = ap(st, "launch");
    Music.mood.intensity = p !== null && p < 1 ? 0.8 : 0.3;
    q.values.forEach((v, k) => {
      const ord = st.order.indexOf(k);
      const slot = st.launched ? ord : k;
      const x0 = -n * 1.1 + 1.1 + k * 2.2, x1 = -n * 1.1 + 1.1 + slot * 2.2;
      let px = x0, py = 0.9, pz = 2.5;
      if (st.launched && p !== null) {
        const pk = clamp((p - k * 0.06) / 0.7, 0, 1), e = easeBack(pk);
        px = lerp(x0, x1, ease(pk)); py = lerp(0.9, y(v), e); pz = lerp(2.5, 0, ease(pk));
        if (pk > 0 && pk < 1 && Math.random() < 0.3) Fx.burst([px, py, pz], v >= 0 ? COL.ivory : hex(0x9fe6ff), 1, { speed: 0.5, g: v < 0 ? -2 : 1, life: 0.6, size: 0.1 });
        if (pk > 0.2 && !st["splash" + k] && v < 0) { st["splash" + k] = 1; Fx.ring([px, 0.02, pz], hex(0x9fe6ff)); Music.cue("splash"); }
      }
      const kind = this.kindOf(v, k);
      if (kind === "avion") Models.plane(E, px, py, pz, 0, Math.sin(t) * 0.1, COL.ivory, t);
      else if (kind === "bird") Models.bird(E, px, py, pz, t);
      else if (kind === "balloon") { E.sph(px, py + 0.4, pz, 0.45, COL.pos); E.box(px, py - 0.2, pz, 0.25, 0.2, 0.25, COL.wood); }
      else if (kind === "sub") Models.sub(E, px, py, pz, hex(0xffc233), t, Math.PI / 2);
      else if (kind === "diver") Models.diver(E, px, py, pz, t);
      else if (kind === "fish") Models.fish(E, px, py, pz, t);
      else Models.buoy(E, px, py - 0.3, pz, t);
      const isMin = st.hl === 2 && v === q.answer[0];
      E.pick("trav:" + k, [px, py, pz], 0.9);
      const wrong = st.launched && p >= 1 && q.answer[ord] !== v;
      Labels.put("tv" + k, `${fmt(v)} m${ord >= 0 ? ` · ${ord + 1}º` : ""}`, [px, py + 1.1, pz], (isMin ? "hint" : wrong ? "neg" : st.launched && p >= 1 ? "ok" : signCls(v)));
    });
  },
  cam(q, st) { const n = q.values.length; return [[0, 1, 13 + n * 0.6], [0, 0, 0]]; },
  diorama(E, t) { E.box(0, 0.6, 0, 3.6, 1.2, 0.2, hex(0x1f7a9a), { a: 0.6 }); Models.plane(E, -1, 2.6 + Math.sin(t) * 0.3, 0, 0, 0, COL.ivory, t); Models.sub(E, 1, -0.2 + Math.sin(t * 0.7) * 0.2, 0, hex(0xffc233), t); Models.buoy(E, 0, 1.15, 0, t); },
};
function niceStep(max) { return max <= 10 ? 1 : max <= 20 ? 2 : max <= 50 ? 5 : max <= 100 ? 10 : max <= 250 ? 25 : 50; }

// ───────────────────────────── 3. EL LAGO ESPEJO · opuesto y valor absoluto
EX.lago = {
  id: "lago", name: "El lago espejo", skill: "Opuesto y valor absoluto", icon: "◇", tint: "#e6e1d3", music: "lago", fog: 0x0b1830,
  blurb: "Un farolillo flota sobre un lago en calma. Su reflejo es el opuesto; el hilo que lo une con el agua mide el valor absoluto.",
  level: L => { const d = D(L); return `Nivel ${L}: números entre −${d.max} y +${d.max}. ${L <= 3 ? "Opuesto y valor absoluto." : L <= 5 ? "Opuesto, valor absoluto y «¿qué números tienen valor absoluto k?»." : "Además, comparar expresiones como |−7| y −(−5)."}`; },
  make: (rng, L) => MathModel.espejos(rng, L),
  validate: q => Validate.espejos(q),
  init(q) { return { rel: null, reveal: false }; },
  ui(q, st, A) {
    if (q.sub === "opabs") {
      A.ctl.append(A.num("Opuesto de " + fmt(q.n), "inOpp"), A.num("Valor absoluto |" + fmt(q.n) + "|", "inAbs"));
    } else if (q.sub === "absk") {
      A.ctl.append(A.p(`El hilo mide ${q.k}. ¿A qué alturas puede estar el farolillo?`), A.num("Un número", "inK1"), A.num("El otro", "inK2"));
    } else {
      A.ctl.append(A.p("Elige el símbolo correcto:"));
      const g = A.h("div", { class: "chips", role: "radiogroup", "aria-label": "Relación" });
      for (const r of ["<", "=", ">"]) g.append(A.h("button", { type: "button", class: "chip", role: "radio", "aria-checked": st.rel === r ? "true" : "false", "aria-pressed": st.rel === r ? "true" : "false",
        onclick: () => { st.rel = r; Music.cue("tick", r === "<" ? -2 : r === ">" ? 2 : 0); A.refresh(); } }, r));
      A.ctl.append(g);
    }
  },
  check(q, st, A) {
    if (q.sub === "opabs") {
      const o = parseIntLoose(A.val("inOpp")), a = parseIntLoose(A.val("inAbs"));
      if (o === null || a === null) return { notReady: true, msg: "Escribe dos números enteros (puedes usar el signo −)." };
      st.reveal = true; anim(st, "mirror", 2.2); Music.cue("whoosh", -1);
      if (o === -q.n && a === Math.abs(q.n)) return { ok: true, msg: `El reflejo de ${fmt(q.n)} está al otro lado del agua, a la misma distancia: ${fmt(-q.n)}. El hilo mide ${Math.abs(q.n)}; el valor absoluto es una distancia, nunca negativa.` };
      if (a < 0) return { ok: false, tag: "absneg", msg: `El valor absoluto es la longitud del hilo hasta el agua: una distancia, así que nunca es negativo. |${fmt(q.n)}| = ${Math.abs(q.n)}.` };
      if (o === Math.abs(q.n) && q.n > 0 || o === q.n) return { ok: false, tag: "opuesto", msg: `El opuesto cambia de lado: el reflejo de ${fmt(q.n)} queda ${q.n > 0 ? "bajo" : "sobre"} el agua, en ${fmt(-q.n)}.` };
      if (o !== -q.n) return { ok: false, tag: "signo", msg: `El opuesto de ${fmt(q.n)} es ${fmt(-q.n)}: misma distancia al cero, al otro lado.` };
      return { ok: false, tag: "calculo", msg: `El hilo mide la distancia desde ${fmt(q.n)} hasta el agua: ${Math.abs(q.n)}.` };
    }
    if (q.sub === "absk") {
      const a = parseIntLoose(A.val("inK1")), b = parseIntLoose(A.val("inK2"));
      if (a === null || b === null) return { notReady: true, msg: "Escribe los dos números." };
      st.reveal = true; anim(st, "mirror", 2.2); Music.cue("whoosh", 1);
      if ((a === q.k && b === -q.k) || (a === -q.k && b === q.k)) return { ok: true, msg: `${fmt(q.k)} y ${fmt(-q.k)}: los dos están a ${q.k} del cero, uno sobre el agua y su reflejo debajo.` };
      if (a === b) return { ok: false, tag: "opuesto", msg: `Hay dos posiciones con el hilo de ${q.k}: una sobre el agua y otra bajo ella (su opuesto).` };
      return { ok: false, tag: a < 0 && b < 0 || a > 0 && b > 0 ? "signo" : "calculo", msg: `Los números con valor absoluto ${q.k} están a ${q.k} del cero: ${fmt(q.k)} y ${fmt(-q.k)}.` };
    }
    if (!st.rel) return { notReady: true, msg: "Elige <, = o >." };
    st.reveal = true; anim(st, "mirror", 2.2); Music.cue("whoosh", 1);
    if (st.rel === q.answer.rel) return { ok: true, msg: `${q.e1} vale ${fmt(q.v1)} y ${q.e2} vale ${fmt(q.v2)}; por eso ${q.e1} ${q.answer.rel} ${q.e2}.` };
    const naive = Math.abs(q.v1) < Math.abs(q.v2) ? "<" : Math.abs(q.v1) > Math.abs(q.v2) ? ">" : "=";
    return { ok: false, tag: st.rel === naive ? "absoluto" : "comparar", msg: `Calcula cada lado: ${q.e1} = ${fmt(q.v1)} y ${q.e2} = ${fmt(q.v2)}. Gana el que está más alto, no el más lejano al agua: ${q.e1} ${q.answer.rel} ${q.e2}.` };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint");
    if (q.sub === "cmp") return n === 1 ? "Calcula primero cada expresión. |x| es una distancia (positiva); −(x) es el reflejo de x." : `${q.e1} = ${fmt(q.v1)}. Ahora calcula ${q.e2}.`;
    if (q.sub === "absk") return n === 1 ? "El hilo puede colgar hacia arriba o hacia abajo desde el agua." : `Uno de ellos es ${fmt(q.k)}. El otro es su reflejo.`;
    return n === 1 ? "La superficie del lago es el cero. El reflejo está a la misma distancia, al otro lado." : `El hilo mide ${Math.abs(q.n)}. El reflejo está a ${Math.abs(q.n)} ${q.n > 0 ? "bajo" : "sobre"} el agua.`; },
  demo(q, st) { st.reveal = true; anim(st, "mirror", 2.6); Music.cue("whoosh", 1); },
  draw(E, t, dt, q, st) {
    const span = 6, M = q.max, y = v => v / M * span;
    Env.stars(E, t, 90);
    E.sph(14, 16, -30, 2.5, COL.ivory, { emis: 1 });
    Env.sea(E, t, span + 1.5, hex(0x0c2a40));
    E.box(0, -0.02, -6, 60, 0.04, 12, hex(0x9fd8ff), { a: 0.35, emis: 0.6 });
    for (let i = 0; i < 9; i++) { const x = -18 + i * 4.5; E.cone(x, 2.2, -9, 1.3, 4.5, hex(0x0f2d24)); E.cone(x, -2.2, -9, 1.3, 4.5, hex(0x0f2d24), { rx: Math.PI, a: 0.35 }); }
    Env.gauge(E, -6, 0, M, span, niceStep(M), "lg", 2, null);
    const p = ap(st, "mirror"), pr = p === null ? (st.reveal ? 1 : 0) : ease(p);
    Music.mood.under = 0.4; Music.mood.intensity = 0.2 + 0.4 * (p !== null && p < 1 ? 1 : 0);
    const shimmer = (x, yy) => { if (Math.random() < 0.15 && !App.reduceMotion) Fx.burst([x, yy, 0], COL.amber, 1, { speed: 0.4, g: -0.5, life: 1, size: 0.05 }); };
    const lanternAt = (x, v, tag, label, cls, ghostAt) => {
      const yy = y(v);
      Models.lantern(E, x, yy + Math.sin(t * 1.5) * 0.08, 0, t, COL.amber);
      shimmer(x, yy);
      // hilo: longitud = |v|
      E.beam([x, 0, 0], [x, yy, 0], 0.03, COL.amber, { emis: 0.8 });
      Labels.put(tag, label, [x + 1.1, yy, 0], cls);
      if (pr > 0) {
        const ry = lerp(yy, y(-v), pr);
        Models.lantern(E, x, ry, 0, t, lerp3(COL.amber, hex(0x9fd8ff), pr), 0.55);
        if (pr >= 1) Labels.put(tag + "r", `reflejo ${fmt(-v)}`, [x + 1.3, y(-v), 0], "hint");
        if (p !== null && p > 0.48 && p < 0.52) Fx.ring([x, 0.02, 0], hex(0x9fd8ff));
      }
      Labels.put(tag + "h", `hilo ${Math.abs(v)}`, [x - 0.9, yy / 2, 0], "small goal");
    };
    if (q.sub === "opabs") lanternAt(0, q.n, "ln", fmt(q.n), signCls(q.n));
    else if (q.sub === "absk") {
      const k = q.k, swing = st.reveal ? 1 : Math.sin(t * 1.2);
      E.beam([0, 0, 0], [0, y(k) * swing, 0], 0.03, COL.amber, { emis: 0.8 });
      Models.lantern(E, 0, y(k) * swing, 0, t, COL.amber, 0.9);
      Labels.put("kk", `hilo ${k}`, [1.2, y(k) * swing, 0], "goal");
      if (st.reveal) { Models.lantern(E, 0, -y(k) * pr, 0, t, hex(0x9fd8ff), 0.6); Labels.put("kr", fmt(-k), [1.2, -y(k) * pr, 0], "neg"); Labels.put("kp", fmt(k), [1.2, y(k), 0], "pos"); }
    } else {
      [[-2.5, q.v1, q.e1], [2.5, q.v2, q.e2]].forEach(([x, v, e], i) => {
        const yy = st.reveal ? y(v) * pr : 1.5;
        Models.lantern(E, x, yy, 0, t + i, i ? COL.pos : COL.amber);
        if (st.reveal) E.beam([x, 0, 0], [x, yy, 0], 0.03, COL.amber, { emis: 0.7 });
        Labels.put("cx" + i, st.reveal && pr >= 1 ? `${e} = ${fmt(v)}` : e, [x, yy + 1.0, 0], "big " + (st.reveal ? signCls(v) : ""));
      });
    }
    if (st.hl === 1) E.box(0, 0.03, 0, 60, 0.04, 40, COL.zero, { a: 0.25 + 0.2 * Math.sin(t * 4), emis: 1 });
  },
  cam(q, st) { return [[1.5, 1, 12.5], [0, 0, 0]]; },
  diorama(E, t) { E.box(0, 0.02, 0, 4, 0.05, 2.5, hex(0x0e2f45), { a: 0.7 }); Models.lantern(E, 0, 1.6 + Math.sin(t) * 0.1, 0, t); Models.lantern(E, 0, -0.3, 0, t, hex(0x9fd8ff), 0.5); E.beam([0, 0, 0], [0, 1.6, 0], 0.03, COL.amber, { emis: 0.8 }); },
};

// ───────────────────────────── 4. GLOBO AEROSTÁTICO · sumar enteros
EX.globo = {
  id: "globo", name: "Globo aerostático", skill: "Sumar enteros", icon: "+", tint: "#ff6f86", music: "globo", fog: 0x1a3550,
  blurb: "Cada burbuja de aire caliente sube 1; cada saco de arena baja 1. Junta burbuja y saco y se anulan. ¿A qué altura acabará el globo?",
  level: L => { const d = D(L); return `Nivel ${L}: ${d.terms} sumandos entre −${d.max} y +${d.max} y resultado entre −${d.max} y +${d.max}${L >= 2 ? "; siempre hay signos distintos" : ""}${L >= 4 ? " y cruces por cero" : ""}. ${L <= 4 ? "Una burbuja o un saco por unidad." : "Burbujas y sacos con cargas grandes."}`; },
  make: (rng, L) => MathModel.sumar(rng, L),
  validate: q => Validate.sumar(q),
  init(q) {
    const st = { pairs: 0, sel: null, flight: null };
    st.pos = q.terms.filter(x => x > 0).reduce((s, x) => s + x, 0); st.neg = -q.terms.filter(x => x < 0).reduce((s, x) => s + x, 0);
    return st;
  },
  ui(q, st, A) {
    if (q.units) {
      A.ctl.append(A.p(`Toca una burbuja (+1) y un saco (−1) para que se anulen, o usa el botón. Quedan ${st.pos - st.pairs} burbujas y ${st.neg - st.pairs} sacos.`));
      A.ctl.append(A.h("div", { class: "row" }, A.btn("Anular una pareja +1/−1", () => this.pair(q, st, A), "Anula una burbuja con un saco")));
    } else A.ctl.append(A.p(`Arriba: ${st.pos} de aire caliente. Abajo: ${st.neg} de arena. Las cantidades iguales se anulan.`));
    A.ctl.append(A.num("Altura final del globo", "inSum"));
  },
  pair(q, st, A) {
    if (st.pairs >= Math.min(st.pos, st.neg)) { A.say("No quedan parejas: ya solo hay " + (st.pos > st.neg ? "burbujas" : st.neg > st.pos ? "sacos" : "nada") + ".", "hint"); return; }
    st.pairs++; anim(st, "pop", 0.6, { idx: st.pairs - 1 }); Music.cue("pop"); setTimeout(() => Music.cue("thud"), 200);
    Fx.burst([0, 4.2, 0], COL.pos, 10, { speed: 2, life: 0.6 }); A.refresh();
  },
  pick(q, st, id, A) { if (q.units && (id?.startsWith("bub") || id?.startsWith("sac"))) this.pair(q, st, A); },
  check(q, st, A) {
    const x = parseIntLoose(A.val("inSum"));
    if (x === null) return { notReady: true, msg: "Escribe la altura final (un entero; usa − si queda por debajo de cero)." };
    st.flight = x; anim(st, "fly", 2.4, { to: x }); Music.cue("whoosh", x > 0 ? 1 : -1);
    const pairs = Math.min(st.pos, st.neg);
    if (x === q.answer) { st.pairs = pairs; return { ok: true, msg: `${pairs} parejas burbuja/saco se anulan; queda ${q.answer === 0 ? "nada: el globo se queda en la cota cero" : `${Math.abs(q.answer)} de ${q.answer > 0 ? "aire caliente: sube a " : "arena: baja a "}${fmt(q.answer)}`}.` }; }
    return { ok: false, ...Diagnose.sumar(q, x) };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint"); const pairs = Math.min(st.pos, st.neg);
    return n === 1 ? "Una burbuja (+1) y un saco (−1) juntos no suben ni bajan: se anulan." : `Se pueden anular ${pairs} parejas. Después quedan ${Math.abs(st.pos - st.neg)} ${st.pos > st.neg ? "burbujas" : "sacos"}.`; },
  demo(q, st) { st.pairs = Math.min(st.pos, st.neg); st.flight = q.answer; anim(st, "fly", 2.8, { to: q.answer, demo: 1 }); Music.cue("whoosh", 1); },
  draw(E, t, dt, q, st) {
    const span = 6, M = q.max, y = v => v / M * span;
    E.box(0, -span - 0.5, 0, 70, 1, 40, hex(0x3b2a22));
    E.box(0, -0.3, 0, 70, 0.6, 12, hex(0x3d7a3c));
    E.box(0, -span / 2 - 0.3, 2.5, 6, span, 1, hex(0x4a3428), { a: 0.9 });
    Labels.put("cn", "cañón", [0, -span / 2, 3.2], "small neg");
    for (let i = 0; i < 10; i++) { const x = -20 + i * 4.4; if (Math.abs(x) < 4) continue; E.sph(x, 0.8, -4, 1, hex(0x2f6b35)); E.cyl(x, 0.2, -4, 0.15, 0.6, COL.wood); }
    Env.clouds(E, t, 7, 4, 50, -10, 0.5);
    Env.gauge(E, -7, 0, M, span, niceStep(M), "gg", 2, null);
    let by = 0; const p = ap(st, "fly");
    if (p !== null) by = lerp(0, y(st.anim.data.to), ease(p));
    Music.mood.height = clamp(by / span, -1, 1); Music.mood.intensity = p !== null && p < 1 ? 0.75 : 0.35;
    Models.balloon(E, 0, by, 0, t);
    if (p !== null && p < 1) Fx.burst([0, by + 0.9, 0], COL.amber, 1, { speed: 1, g: -3, life: 0.5, size: 0.08 });
    const left = Math.max(0, st.pos - st.pairs), right = Math.max(0, st.neg - st.pairs);
    if (q.units) {
      for (let i = 0; i < st.pos; i++) {
        if (i < st.pairs && !(st.anim?.k === "pop" && st.anim.data.idx === i && ap(st, "pop") < 1)) continue;
        const a = i * 2.399, r = 1.6 + (i % 3) * 0.35, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.5, yy = by + 3.9 + (i % 4) * 0.35 + Math.sin(t * 2 + i) * 0.08;
        const dying = i < st.pairs ? 1 - ap(st, "pop") : 1;
        E.beam([0, by + 2.3, 0], [x, yy, z], 0.01, COL.ivory, { a: 0.5 });
        E.sph(x, yy, z, 0.22 * dying, COL.pos, { emis: 0.45 });
        E.pick("bub" + i, [x, yy, z], 0.4);
      }
      for (let i = 0; i < st.neg; i++) {
        if (i < st.pairs && !(st.anim?.k === "pop" && st.anim.data.idx === i && ap(st, "pop") < 1)) continue;
        const a = i * 2.399 + 1, r = 0.5 + (i % 3) * 0.25, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.6, drop = i < st.pairs ? ap(st, "pop") * 3 : 0;
        const yy = by - 0.6 - (i % 4) * 0.35 - drop;
        E.beam([x * 0.3, by, z * 0.3], [x, yy + 0.2, z], 0.01, hex(0x553f2a));
        E.box(x, yy, z, 0.28, 0.32, 0.28, COL.neg, { ry: i });
        E.pick("sac" + i, [x, yy, z], 0.4);
      }
      if (st.hl === 2 || st.hl === 1) Labels.put("gpair", `${Math.min(st.pos, st.neg) - st.pairs} parejas por anular`, [3, by + 2.5, 0], "hint");
    } else {
      const pb = st.pairs || (p !== null ? Math.min(st.pos, st.neg) * ease(Math.min(1, p * 2)) : 0);
      const sp = Math.max(0, st.pos - pb), sn = Math.max(0, st.neg - pb);
      const rP = 0.35 + 1.1 * Math.sqrt(sp / M), rN = 0.3 + 0.8 * Math.sqrt(sn / M);
      if (sp > 0) { E.sph(2.2, by + 3.6, 0, rP, COL.pos, { emis: 0.45 }); E.beam([0, by + 2.4, 0], [2.2, by + 3.6 - rP, 0], 0.02, COL.ivory); Labels.put("gp", `+${Math.round(sp)}`, [2.2, by + 3.6, 0], "big pos"); }
      if (sn > 0) { E.box(-1.8, by - 1.2, 0, rN * 1.6, rN * 1.6, rN * 1.6, COL.neg); E.beam([0, by, 0], [-1.8, by - 1.2 + rN * 0.8, 0], 0.02, hex(0x553f2a)); Labels.put("gn", `−${Math.round(sn)}`, [-1.8, by - 1.2, 0], "big neg"); }
      if (st.hl === 2) Labels.put("gh", `se anulan ${Math.min(st.pos, st.neg)}`, [0, by + 5.2, 0], "hint");
    }
    Labels.put("gexpr", q.terms.map((x, i) => i ? fmtP(x) : fmt(x)).join(" + "), [0, by + 5.6, 0], "big goal");
    if (p !== null && p >= 1) Labels.put("gres", `altura ${fmt(st.anim.data.to)}`, [2.6, by + 1, 0], st.anim.data.to === q.answer ? "ok" : "neg");
  },
  cam(q, st) { return [[2, 2, 13.5], [0, 1, 0]]; },
  diorama(E, t) { Models.balloon(E, 0, 0.4 + Math.sin(t * 0.8) * 0.3, 0, t); for (let i = 0; i < 3; i++) E.sph(-1.6 + i * 1.6, 4 + Math.sin(t + i) * 0.1, 0, 0.22, COL.pos, { emis: 0.4 }); },
};
