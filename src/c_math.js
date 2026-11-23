// ═════════════════════════════════════════════ 1. CONFIG y DIFFICULTY
const CONFIG = { RETOS: 8, STORE: "parqueCotaCero.v1" };
// Tabla central: TODO lo que depende del nivel sale de aquí.
//  max: |n| máximo · count: valores a situar · step: separación de marcas en la vía
//  factor: |factor| máximo en × y ÷ · terms: sumandos · combo: operaciones combinadas
const DIFFICULTY = [
  { level: 1, max: 5, count: 2, step: 1, factor: 3, terms: 2, combo: { ops: 2, paren: false, max: 5, fmax: 3 } },
  { level: 2, max: 10, count: 2, step: 1, factor: 4, terms: 2, combo: { ops: 2, paren: false, max: 10, fmax: 4 } },
  { level: 3, max: 15, count: 3, step: 1, factor: 5, terms: 2, combo: { ops: 2, paren: false, max: 10, fmax: 5 } },
  { level: 4, max: 20, count: 3, step: 2, factor: 6, terms: 2, combo: { ops: 2, paren: true, max: 12, fmax: 5 } },
  { level: 5, max: 30, count: 4, step: 2, factor: 7, terms: 2, combo: { ops: 2, paren: true, max: 15, fmax: 6 } },
  { level: 6, max: 50, count: 4, step: 5, factor: 8, terms: 2, combo: { ops: 3, paren: true, max: 15, fmax: 6 } },
  { level: 7, max: 75, count: 5, step: 5, factor: 9, terms: 2, combo: { ops: 3, paren: true, max: 20, fmax: 7 } },
  { level: 8, max: 100, count: 5, step: 10, factor: 10, terms: 3, combo: { ops: 3, paren: true, max: 20, fmax: 8 } },
  { level: 9, max: 250, count: 6, step: 25, factor: 12, terms: 3, combo: { ops: 3, paren: true, max: 25, fmax: 9 } },
  { level: 10, max: 500, count: 6, step: 50, factor: 15, terms: 3, combo: { ops: 3, paren: true, max: 30, fmax: 10 } },
];
const D = lvl => DIFFICULTY[Math.max(1, Math.min(10, lvl)) - 1];

// ═════════════════════════════════════════════ 2. PRNG y semillas
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeRng(seed) {
  const r = mulberry32(seed);
  const rng = {
    seed, next: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    nz: (m) => { let v = 0; while (v === 0) v = rng.int(-m, m); return v; },
    sign: () => r() < 0.5 ? -1 : 1,
    pick: arr => arr[Math.floor(r() * arr.length)],
    chance: p => r() < p,
    shuffle: arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
  return rng;
}
const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) % 1000000;

// ═════════════════════════════════════════════ 3. Utilidades matemáticas
const sgn = n => n > 0 ? 1 : n < 0 ? -1 : 0;
const isInt = n => Number.isInteger(n);
// Lee un entero escrito por el alumno: admite "−5", "-5", "+5", " 5 ".
function parseIntLoose(s) {
  if (typeof s !== "string") return null;
  const t = s.trim().replace(/[−–—]/g, "-").replace(/\s+/g, "").replace(/^\((.*)\)$/, "$1");
  if (!/^[+-]?\d+$/.test(t)) return null;
  const v = parseInt(t, 10);
  return Number.isSafeInteger(v) ? (Object.is(v, -0) ? 0 : v) : null;
}
const TAGS = {
  signo: "Ignorar el signo de un número",
  absoluto: "Comparar valores absolutos en lugar de posiciones (pensar que −8 > −3)",
  colocacion: "Situar un número en una posición cercana pero incorrecta",
  opuesto: "Confundir el opuesto con el valor absoluto",
  absneg: "Dar un valor absoluto negativo",
  anula: "Sumar los valores sin dejar que las cargas opuestas se anulen",
  restaOpuesto: "Restar sin cambiar al opuesto del sustraendo",
  inversion: "Invertir minuendo y sustraendo",
  dobleNeg: "Fallar con el doble negativo",
  reglaSignos: "Aplicar mal la regla de los signos",
  calculo: "Error de cálculo con el signo correcto",
  jerarquia: "Operar en un orden incorrecto (jerarquía o paréntesis)",
  comparar: "Comparar mal dos expresiones",
};

// ═════════════════════════════════════════════ 4. MathModel y QuestionFactory
const MathModel = {
  // 1 · Situar en la recta (montaña rusa)
  situar(rng, L) {
    const d = D(L), step = d.step, M = d.max, k = d.count;
    const ticks = []; for (let v = -M; v <= M; v += step) ticks.push(v);
    let vals;
    for (let tries = 0; tries < 200; tries++) {
      let pool = ticks;
      if (L >= 7) { // números más próximos: ventana estrecha alrededor de un centro
        const c = rng.int(-Math.floor(ticks.length / 4), Math.floor(ticks.length / 4)) * step;
        pool = ticks.filter(v => Math.abs(v - c) <= step * (k + 2));
      }
      if (L < 3) pool = pool.filter(v => v !== 0);
      vals = rng.shuffle(pool).slice(0, k);
      if (L >= 3 && k >= 3 && !vals.includes(0) && rng.chance(0.35)) vals[k - 1] = 0;
      vals = [...new Set(vals)];
      if (vals.length === k && vals.some(v => v < 0) && vals.some(v => v > 0)) break;
    }
    return { kind: "situar", level: L, values: vals, min: -M, max: M, step, ticks, answer: vals.slice(),
      text: `Sitúa en la vía: ${vals.map(fmt).join(", ")}` };
  },
  // 2 · Ordenar (torre de caída)
  ordenar(rng, L) {
    const d = D(L), M = d.max, n = Math.min(6, d.count + 1);
    let vals;
    for (let tries = 0; tries < 200; tries++) {
      const set = new Set();
      const w = L >= 6 ? Math.max(n + 3, Math.round(M / 6)) : M;
      const c = L >= 6 ? rng.int(-M + w, M - w) : 0;
      // Trampa didáctica desde el nivel 3: un par con el mismo valor absoluto o dos negativos próximos.
      if (L >= 3) { const a = rng.int(2, Math.min(M, w)); set.add(-a); set.add(rng.chance(0.5) ? a : -Math.max(1, a - rng.int(1, 3))); }
      while (set.size < n) set.add(rng.int(Math.max(-M, c - w), Math.min(M, c + w)));
      vals = rng.shuffle([...set].slice(0, n));
      if (vals.filter(v => v < 0).length >= 1 && vals.every(v => Math.abs(v) <= M)) break;
    }
    return { kind: "ordenar", level: L, values: vals, answer: vals.slice().sort((a, b) => a - b), max: M,
      text: `Ordena de menor a mayor: ${vals.map(fmt).join(", ")}` };
  },
  // 3 · Opuesto y valor absoluto (casa de los espejos)
  espejos(rng, L) {
    const M = D(L).max;
    const types = L <= 3 ? ["opabs"] : L <= 5 ? ["opabs", "absk"] : ["opabs", "absk", "cmp", "cmp"];
    const t = rng.pick(types);
    if (t === "opabs") {
      const n = rng.nz(M);
      return { kind: "espejos", sub: "opabs", level: L, n, answer: { opp: -n, abs: Math.abs(n) }, max: M,
        text: `Halla el opuesto y el valor absoluto de ${fmt(n)}` };
    }
    if (t === "absk") {
      const k = rng.int(1, M);
      return { kind: "espejos", sub: "absk", level: L, k, answer: { set: [k, -k] }, max: M,
        text: `¿Qué dos números tienen valor absoluto ${k}?` };
    }
    // cmp: dos expresiones con opuesto/valor absoluto, elegir <, = o >
    const forms = [
      { s: a => `|${fmt(a)}|`, v: a => Math.abs(a) },
      { s: a => `−(${fmt(a)})`, v: a => -a },
      { s: a => `−|${fmt(a)}|`, v: a => -Math.abs(a) },
      { s: a => fmt(a), v: a => a },
    ];
    let a, b, f1, f2, v1, v2;
    for (let tries = 0; tries < 100; tries++) {
      a = rng.nz(M); b = rng.chance(0.3) ? -a : rng.nz(M);
      f1 = rng.pick(forms.slice(0, 3)); f2 = rng.pick(forms);
      v1 = f1.v(a); v2 = f2.v(b);
      // Evita comparaciones donde ignorar el signo daría la misma respuesta (no enseñan nada).
      const naive = sgn(Math.abs(v1) - Math.abs(v2));
      if (sgn(v1 - v2) !== naive || rng.chance(0.25)) break;
    }
    const rel = v1 < v2 ? "<" : v1 > v2 ? ">" : "=";
    return { kind: "espejos", sub: "cmp", level: L, a, b, e1: f1.s(a), e2: f2.s(b), v1, v2, answer: { rel }, max: M,
      text: `Compara: ${f1.s(a)}  ☐  ${f2.s(b)}` };
  },
  // 4 · Suma (coches de choque)
  sumar(rng, L) {
    const d = D(L), M = d.max, t = d.terms;
    let terms, r;
    for (let tries = 0; tries < 500; tries++) {
      terms = Array.from({ length: t }, () => rng.nz(M));
      r = terms.reduce((s, x) => s + x, 0);
      const mixed = terms.some(x => x > 0) && terms.some(x => x < 0);
      const crosses = sgn(r) !== sgn(terms[0]);
      if (Math.abs(r) > M) continue;
      if (L === 1 && !terms.some(x => x < 0)) continue;
      if (L >= 2 && !mixed) continue;
      if (L >= 4 && !crosses && rng.chance(0.6)) continue;
      break;
    }
    const units = L <= 4 && terms.reduce((s, x) => s + Math.abs(x), 0) <= 40;
    return { kind: "sumar", level: L, terms, answer: r, units, max: M,
      text: `Calcula ${terms.map((x, i) => i ? fmtP(x) : fmt(x)).join(" + ")}` };
  },
  // 5 · Resta (tren magnético)
  restar(rng, L) {
    const M = D(L).max;
    let a, b;
    for (let tries = 0; tries < 500; tries++) {
      a = rng.int(-M, M); b = rng.nz(M);
      if (Math.abs(a - b) > M || a === 0 && L > 2) continue;
      if (L >= 2 && b > 0 && rng.chance(0.55)) continue; // más sustraendos negativos
      if (L >= 4 && sgn(a - b) === sgn(a) && rng.chance(0.5)) continue; // cruces por cero
      break;
    }
    return { kind: "restar", level: L, a, b, answer: a - b, max: M, text: `Calcula ${fmt(a)} − ${fmtP(b)}` };
  },
  // 6 · Multiplicación (noria)
  multiplicar(rng, L) {
    const F = D(L).factor;
    let a, b;
    for (let tries = 0; tries < 200; tries++) {
      a = rng.nz(F); b = rng.nz(F);
      if (L <= 2 && rng.chance(0.08)) b = 0;
      if (a > 0 && b > 0) continue;
      if (L >= 3 && Math.abs(a) < 2 && Math.abs(b) < 2) continue;
      break;
    }
    return { kind: "multiplicar", level: L, a, b, answer: a * b, factor: F, text: `Calcula ${fmt(a)} · ${fmtP(b)}` };
  },
  // 7 · División exacta (túnel)
  dividir(rng, L) {
    const F = D(L).factor;
    let a, b, q;
    for (let tries = 0; tries < 200; tries++) {
      b = rng.sign() * rng.int(2, Math.max(2, F)); q = rng.nz(F); a = b * q;
      if (a > 0 && b > 0) continue;
      break;
    }
    return { kind: "dividir", level: L, a, b, answer: q, factor: F, text: `Calcula ${fmt(a)} : ${fmtP(b)}` };
  },
  // 8 · Operaciones combinadas (laberinto)
  combinadas(rng, L) {
    const c = D(L).combo;
    const forms2 = ["a+b*c", "a*b-c", "a-b*c", "a-b/c", "a*b+c"];
    const formsP = ["(a+b)*c", "a-(b-c)", "a*(b+c)", "(a-b)/c"];
    const forms3 = ["(a-b)*c+d", "a-b*(c+d)", "(a+b)/c-d", "a*b-(c-d)", "a+b*c-d"];
    const pool = c.ops === 2 ? (c.paren ? formsP.concat(forms2.slice(0, 2)) : forms2) : forms3;
    for (let tries = 0; tries < 2000; tries++) {
      const form = rng.pick(pool);
      const vars = {};
      // Factores (al lado de * o /) pequeños; sumandos hasta combo.max.
      for (const ch of "abcd") if (form.includes(ch)) {
        const idx = form.indexOf(ch), prev = form[idx - 1], next = form[idx + 1];
        const isFactor = "*/".includes(prev) || "*/".includes(next) || (prev === "(" && false);
        vars[ch] = isFactor ? rng.sign() * rng.int(2, c.fmax) : rng.nz(c.max);
      }
      // Dividendo de una división directa: múltiplo exacto del divisor.
      const dv = form.match(/([abcd])\/([abcd])/);
      if (dv) vars[dv[1]] = vars[dv[2]] * rng.sign() * rng.int(1, c.fmax);
      const tokens = tokenize(form, vars);
      const sol = solveTokens(tokens);
      if (!sol.ok) continue;
      if (sol.steps.some(s => Math.abs(s.result) > 200) || Math.abs(sol.value) > 200) continue;
      if (!Object.values(vars).some(v => v < 0)) continue;
      return { kind: "combinadas", level: L, form, vars, tokens, answer: sol.value, steps: sol.steps, combo: c,
        text: `Resuelve ${tokensToString(tokens)}` };
    }
    throw new Error("No se pudo generar una operación combinada válida");
  },
};

// Expresiones: tokens = números, "+", "-", "*", "/", "(", ")".
function tokenize(form, vars) {
  return [...form].map(ch => "abcd".includes(ch) ? { t: "n", v: vars[ch] } : { t: ch });
}
function tokensToString(tk) {
  let s = "";
  tk.forEach((x, i) => {
    if (x.t === "n") s += (x.v < 0 && i > 0 && tk[i - 1].t !== "(" ? `(${fmtPlain(x.v)})` : fmtPlain(x.v));
    else s += { "+": " + ", "-": " − ", "*": " · ", "/": " : ", "(": "(", ")": ")" }[x.t];
  });
  return s;
}
const isOp = t => "+-*/".includes(t);
// ¿Se puede efectuar ya la operación en la posición k? (convenio: paréntesis, después · y :, de izquierda a derecha)
function opAllowed(tk, k) {
  const op = tk[k]; if (!op || !isOp(op.t)) return false;
  if (tk[k - 1]?.t !== "n" || tk[k + 1]?.t !== "n") return false;
  // grupo: desde el paréntesis abierto que lo contiene hasta su cierre
  let lo = k, depth = 0;
  for (lo = k - 1; lo >= 0; lo--) { if (tk[lo].t === ")") depth++; else if (tk[lo].t === "(") { if (depth === 0) break; depth--; } }
  let hi = k; depth = 0;
  for (hi = k + 1; hi < tk.length; hi++) { if (tk[hi].t === "(") depth++; else if (tk[hi].t === ")") { if (depth === 0) break; depth--; } }
  const same = []; depth = 0; // operadores del mismo nivel dentro del grupo
  for (let i = lo + 1; i < hi; i++) { const t = tk[i].t; if (t === "(") depth++; else if (t === ")") depth--; else if (depth === 0 && isOp(t)) same.push(i); }
  const mulDiv = t => t === "*" || t === "/";
  if (mulDiv(op.t)) {
    // no puede haber un · o : anterior en la misma cadena multiplicativa
    for (let i = k - 2; i > lo; i -= 2) { const t = tk[i]?.t; if (!t || !isOp(t)) break; if (mulDiv(t)) return false; break; }
    return true;
  }
  // suma/resta: operandos no ligados a · o :, y ninguna suma/resta pendiente a su izquierda en el grupo
  if (mulDiv(tk[k - 2]?.t) || mulDiv(tk[k + 2]?.t)) return false;
  if (tk[k + 2]?.t === "(" || tk[k - 2]?.t === ")") { /* el operando es un número aislado: válido */ }
  for (const i of same) if (i < k && !mulDiv(tk[i].t)) return false;
  return true;
}
function applyOp(tk, k) {
  const a = tk[k - 1].v, b = tk[k + 1].v, o = tk[k].t;
  let r;
  if (o === "+") r = a + b; else if (o === "-") r = a - b; else if (o === "*") r = a * b;
  else { if (b === 0 || a % b !== 0) return null; r = a / b; }
  if (Object.is(r, -0)) r = 0;
  let out = tk.slice(0, k - 1).concat([{ t: "n", v: r }], tk.slice(k + 2));
  // quitar paréntesis que rodean un único número
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i + 2 < out.length; i++) if (out[i].t === "(" && out[i + 1].t === "n" && out[i + 2].t === ")") { out = out.slice(0, i).concat([out[i + 1]], out.slice(i + 3)); changed = true; break; }
  }
  return { tokens: out, a, b, op: o, result: r };
}
function solveTokens(tk) {
  const steps = []; let cur = tk;
  for (let guard = 0; guard < 20 && cur.length > 1; guard++) {
    const k = cur.findIndex((_, i) => opAllowed(cur, i));
    if (k < 0) return { ok: false };
    const r = applyOp(cur, k); if (!r) return { ok: false };
    steps.push({ before: cur, k, a: r.a, b: r.b, op: r.op, result: r.result, after: r.tokens });
    cur = r.tokens;
  }
  if (cur.length !== 1 || cur[0].t !== "n") return { ok: false };
  return { ok: true, value: cur[0].v, steps };
}

// ═════════════════════════════════════════════ Validadores y diagnósticos
const Validate = {
  situar(q) {
    const e = [], d = D(q.level);
    if (new Set(q.values).size !== q.values.length) e.push("valores repetidos");
    for (const v of q.values) { if (Math.abs(v) > d.max) e.push("fuera de rango " + v); if (v % d.step !== 0) e.push("no es múltiplo del paso " + v); }
    if (!q.values.some(v => v < 0) || !q.values.some(v => v > 0)) e.push("faltan signos");
    if (q.values.length !== d.count) e.push("cantidad incorrecta");
    return e;
  },
  ordenar(q) {
    const e = [];
    if (new Set(q.values).size !== q.values.length) e.push("valores repetidos (orden no único)");
    if (q.values.some(v => Math.abs(v) > D(q.level).max)) e.push("fuera de rango");
    const s = q.values.slice().sort((a, b) => a - b);
    if (s.join() !== q.answer.join()) e.push("solución distinta del orden");
    return e;
  },
  espejos(q) {
    const e = [], M = D(q.level).max;
    if (q.sub === "opabs") { if (q.n === 0 || Math.abs(q.n) > M) e.push("n inválido"); if (q.answer.opp !== -q.n || q.answer.abs !== Math.abs(q.n)) e.push("solución"); }
    if (q.sub === "absk") { if (q.k < 1 || q.k > M) e.push("k inválido"); }
    if (q.sub === "cmp") { const rel = q.v1 < q.v2 ? "<" : q.v1 > q.v2 ? ">" : "="; if (rel !== q.answer.rel) e.push("relación"); if (Math.abs(q.a) > M || Math.abs(q.b) > M) e.push("rango"); }
    return e;
  },
  sumar(q) {
    const e = [], M = D(q.level).max;
    if (q.terms.length !== D(q.level).terms) e.push("nº de términos");
    if (q.terms.some(x => x === 0 || Math.abs(x) > M)) e.push("término fuera de rango");
    if (q.terms.reduce((s, x) => s + x, 0) !== q.answer) e.push("solución");
    if (Math.abs(q.answer) > M) e.push("resultado fuera de rango");
    return e;
  },
  restar(q) {
    const e = [], M = D(q.level).max;
    if (q.b === 0 || Math.abs(q.a) > M || Math.abs(q.b) > M) e.push("rango");
    if (q.a - q.b !== q.answer || Math.abs(q.answer) > M) e.push("solución");
    return e;
  },
  multiplicar(q) {
    const e = [], F = D(q.level).factor;
    if (Math.abs(q.a) > F || Math.abs(q.b) > F) e.push("factor fuera de rango");
    if (q.a * q.b !== q.answer) e.push("solución");
    if (q.a > 0 && q.b > 0) e.push("sin negativos");
    return e;
  },
  dividir(q) {
    const e = [], F = D(q.level).factor;
    if (q.b === 0) e.push("divisor cero");
    if (q.b !== 0 && q.a % q.b !== 0) e.push("división no exacta");
    if (Math.abs(q.b) > F || Math.abs(q.answer) > F) e.push("rango");
    if (q.b !== 0 && q.a / q.b !== q.answer) e.push("solución");
    return e;
  },
  combinadas(q) {
    const e = [];
    const sol = solveTokens(q.tokens);
    if (!sol.ok) e.push("no resoluble");
    else {
      if (sol.value !== q.answer) e.push("solución");
      if (sol.steps.some(s => !isInt(s.result))) e.push("intermedio no entero");
      if (sol.steps.some(s => s.op === "/" && (s.b === 0 || s.a % s.b !== 0))) e.push("división no exacta");
      if (sol.steps.length !== q.combo.ops) e.push("nº de operaciones");
    }
    for (const v of Object.values(q.vars)) if (v === 0 || Math.abs(v) > Math.max(q.combo.max, q.combo.fmax * q.combo.fmax)) e.push("número fuera de rango");
    return e;
  },
};

// Diagnóstico de una respuesta numérica errónea: devuelve {tag, msg}.
const Diagnose = {
  sumar(q, x) {
    const absSum = q.terms.reduce((s, t) => s + Math.abs(t), 0);
    const pos = q.terms.filter(t => t > 0).reduce((s, t) => s + t, 0), neg = q.terms.filter(t => t < 0).reduce((s, t) => s + t, 0);
    const pairs = Math.min(pos, -neg);
    if (x === -q.answer && q.answer !== 0) return { tag: "signo", msg: `El tamaño es correcto, pero el signo no: hay más carga ${q.answer > 0 ? "positiva" : "negativa"}, así que el resultado es ${fmt(q.answer)}.` };
    if (Math.abs(x) === absSum) return { tag: "anula", msg: `Has juntado todas las cargas. Las cargas opuestas se anulan por parejas: ${pairs} parejas +1/−1 desaparecen y queda ${fmt(q.answer)}.` };
    return { tag: "calculo", msg: `Cuenta las parejas que se anulan: hay ${pos} de carga positiva y ${-neg} de negativa. Se anulan ${pairs} parejas; queda ${fmt(q.answer)}.` };
  },
  restar(q, x) {
    if (x === q.a + q.b) return { tag: q.b < 0 ? "dobleNeg" : "restaOpuesto", msg: `Restar ${fmtP(q.b)} no es sumarlo: equivale a sumar su opuesto, ${fmt(-q.b)}. Por eso ${fmt(q.a)} − ${fmtP(q.b)} = ${fmt(q.a)} + ${fmtP(-q.b)} = ${fmt(q.answer)}.` };
    if (x === q.b - q.a) return { tag: "inversion", msg: `Has calculado ${fmt(q.b)} − ${fmtP(q.a)}. El tren sale de ${fmt(q.a)} (el minuendo) y se desplaza ${fmt(-q.b)}.` };
    if (x === -q.answer) return { tag: "signo", msg: `El desplazamiento es de ${Math.abs(q.answer - q.a)} estaciones hacia la ${-q.b > 0 ? "derecha" : "izquierda"}; el tren acaba en ${fmt(q.answer)}.` };
    return { tag: "calculo", msg: `${fmt(q.a)} − ${fmtP(q.b)} = ${fmt(q.a)} + ${fmtP(-q.b)}. Desde ${fmt(q.a)} avanza ${Math.abs(q.b)} hacia la ${-q.b > 0 ? "derecha" : "izquierda"}: llegas a ${fmt(q.answer)}.` };
  },
  multiplicar(q, x) {
    const negs = (q.a < 0) + (q.b < 0);
    if (q.answer !== 0 && x === -q.answer) return { tag: "reglaSignos", msg: `${negs === 2 ? "Dos signos negativos invierten el giro dos veces: vuelve al sentido positivo." : "Un solo signo negativo invierte el giro: el resultado es negativo."} ${fmt(q.a)} · ${fmtP(q.b)} = ${fmt(q.answer)}.` };
    if (sgn(x) === sgn(q.answer)) return { tag: "calculo", msg: `El signo está bien. Cuenta los grupos: ${Math.abs(q.a)} grupos de ${Math.abs(q.b)} dan ${Math.abs(q.answer)}.` };
    return { tag: "reglaSignos", msg: `Hay ${negs} signo${negs === 1 ? "" : "s"} negativo${negs === 1 ? "" : "s"}: ${negs % 2 ? "un número impar de inversiones da resultado negativo" : "un número par de inversiones da resultado positivo"}. ${fmt(q.a)} · ${fmtP(q.b)} = ${fmt(q.answer)}.` };
  },
  dividir(q, x) {
    if (x === -q.answer) return { tag: "reglaSignos", msg: `La regla de los signos es la misma que en la multiplicación: ${sgn(q.a) === sgn(q.b) ? "signos iguales dan cociente positivo" : "signos distintos dan cociente negativo"}. ${fmt(q.a)} : ${fmtP(q.b)} = ${fmt(q.answer)}.` };
    if (sgn(x) === sgn(q.answer)) return { tag: "calculo", msg: `El signo es correcto. Reparte ${Math.abs(q.a)} en ${Math.abs(q.b)} grupos iguales: salen ${Math.abs(q.answer)} en cada uno.` };
    return { tag: "reglaSignos", msg: `${sgn(q.a) === sgn(q.b) ? "Dividendo y divisor tienen el mismo signo: el cociente es positivo." : "Dividendo y divisor tienen distinto signo: el cociente es negativo."} El resultado es ${fmt(q.answer)}.` };
  },
  combinadas(q, x) {
    // ¿Coincide con operar de izquierda a derecha sin jerarquía?
    let cur = q.tokens.filter(t => t.t !== "(" && t.t !== ")");
    let v = cur[0].v, ok = true;
    for (let i = 1; i + 1 < cur.length; i += 2) {
      const b = cur[i + 1].v, o = cur[i].t;
      if (o === "+") v += b; else if (o === "-") v -= b; else if (o === "*") v *= b; else { if (b === 0 || v % b) { ok = false; break; } v /= b; }
    }
    if (ok && x === v && v !== q.answer) return { tag: "jerarquia", msg: `Has operado de izquierda a derecha. Primero se resuelven los paréntesis, después · y :, y al final + y −. El resultado es ${fmt(q.answer)}.` };
    if (x === -q.answer) return { tag: "signo", msg: `El valor es correcto, pero el signo no. Revisa el último paso: ${stepText(q.steps[q.steps.length - 1])}.` };
    return { tag: "calculo", msg: `Repasa los pasos: ${q.steps.map(stepText).join("; ")}.` };
  },
};
function stepText(s) { return `${fmt(s.a)} ${{ "+": "+", "-": "−", "*": "·", "/": ":" }[s.op]} ${fmtP(s.b)} = ${fmt(s.result)}`; }
