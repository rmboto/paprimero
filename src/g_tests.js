// ═════════════════════════════════════════════ 11. Autopruebas
const Tests = {
  run() {
    const lines = [], t0 = performance.now(); let total = 0, bad = 0;
    for (const id of EX_PLAY) {
      const ex = EX[id]; let n = 0, fails = [];
      for (let L = 1; L <= 10; L++) for (let k = 0; k < 10; k++) {
        const rng = makeRng(1000 * L + 17 * k + id.length * 7919);
        let q;
        try { q = ex.make(rng, L); } catch (err) { fails.push(`L${L}: excepción ${err.message}`); continue; }
        const errs = ex.validate(q).concat(this.extra(id, q));
        n++; total++;
        if (errs.length) { bad++; if (fails.length < 3) fails.push(`L${L}: ${errs.join(", ")}`); }
      }
      lines.push(`${fails.length ? "✗" : "✓"} ${ex.name}: ${n} casos${fails.length ? " · " + fails.join(" | ") : ""}`);
    }
    // Reproducibilidad de la semilla.
    const a = JSON.stringify(EX.globo.make(makeRng(42), 5)), b = JSON.stringify(EX.globo.make(makeRng(42), 5));
    lines.push(`${a === b ? "✓" : "✗"} La misma semilla genera el mismo reto`);
    if (a !== b) bad++;
    const text = `${total - bad}/${total} casos válidos en ${Math.round(performance.now() - t0)} ms\n` + lines.join("\n");
    return { ok: bad === 0, total, bad, text };
  },
  // Comprobaciones independientes del validador de cada reto.
  extra(id, q) {
    const e = [], d = D(q.level);
    if (id === "rocas") { if (q.values.some(v => !q.ticks.includes(v))) e.push("valor sin roca"); }
    if (id === "vertical") { for (let i = 1; i < q.answer.length; i++) if (!(q.answer[i - 1] < q.answer[i])) e.push("orden no estricto"); }
    if (id === "lago" && q.sub === "absk" && q.k === 0) e.push("k=0 da respuesta única ambigua");
    if (id === "globo") { if (!isInt(q.answer)) e.push("no entero"); if (q.level >= 2 && !(q.terms.some(x => x > 0) && q.terms.some(x => x < 0))) e.push("sin signos mezclados"); }
    if (id === "avion") { if (q.answer !== q.a + (-q.b)) e.push("resta ≠ suma del opuesto"); }
    if (id === "sub") { if (Math.abs(q.a) > d.factor || Math.abs(q.b) > d.factor) e.push("factor fuera de tabla"); }
    if (id === "tele") { if (q.b === 0) e.push("divisor cero"); else if (q.a % q.b !== 0) e.push("no exacta"); if (q.answer * q.b !== q.a) e.push("comprobación inversa"); }
    if (id === "dron") {
      const sol = solveTokens(q.tokens);
      if (!sol.ok) e.push("no resoluble");
      else for (const s of sol.steps) { if (!isInt(s.result)) e.push("intermedio no entero"); if (s.op === "/" && (s.b === 0 || s.a % s.b)) e.push("división no exacta"); }
      // Respuesta única: el resultado no depende del orden válido elegido.
      const alt = this.anyOrder(q.tokens);
      if (alt.size !== 1) e.push("varios resultados posibles según el orden válido");
    }
    return e;
  },
  anyOrder(tk, out = new Set(), depth = 0) {
    if (tk.length === 1) { out.add(tk[0].v); return out; }
    if (depth > 6) return out;
    tk.forEach((_, k) => { if (opAllowed(tk, k)) { const r = applyOp(tk, k); if (r) this.anyOrder(r.tokens, out, depth + 1); } });
    return out;
  },
};

// ═════════════════════════════════════════════ 12. Arranque
addEventListener("DOMContentLoaded", () => App.boot());
