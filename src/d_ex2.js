// ───────────────────────────── 5. AVIÓN ANFIBIO · restar enteros
EX.avion = {
  id: "avion", name: "Avión anfibio", skill: "Restar enteros", icon: "−", tint: "#5ef0b0", music: "avion", fog: 0x2a4f6e,
  blurb: "Un hidroavión que también bucea. La torre ordena «restar»; la palanca inversora lo convierte en «sumar el opuesto». ¿A qué cota llegará?",
  level: L => { const d = D(L); return `Nivel ${L}: a − b con a y b entre −${d.max} y +${d.max} y resultado entre −${d.max} y +${d.max}${L >= 2 ? "; muchos sustraendos negativos" : ""}${L >= 4 ? " y cruces por el nivel del mar" : ""}.`; },
  make: (rng, L) => MathModel.restar(rng, L),
  validate: q => Validate.restar(q),
  init(q) { return { lever: false }; },
  ui(q, st, A) {
    A.ctl.append(A.h("div", { class: "lever" },
      A.h("button", { type: "button", class: "btn", "aria-pressed": st.lever ? "true" : "false", onclick: () => { if (!st.lever) { st.lever = true; anim(st, "lever", 0.8); Music.cue("lever"); A.refresh(); } } },
        st.lever ? "Palanca inversora: activada" : "Accionar la palanca inversora"),
      A.h("span", { class: "num", style: "font-size:20px" }, st.lever ? `${fmt(q.a)} + ${fmtP(-q.b)}` : `${fmt(q.a)} − ${fmtP(q.b)}`)));
    A.ctl.append(A.num("Cota de llegada", "inRes", !st.lever));
  },
  check(q, st, A) {
    if (!st.lever) return { notReady: true, msg: "Primero acciona la palanca inversora: convierte «restar b» en «sumar el opuesto de b»." };
    const x = parseIntLoose(A.val("inRes"));
    if (x === null) return { notReady: true, msg: "Escribe la cota de llegada." };
    anim(st, "fly", 3, { to: x }); Music.cue("engine", 1);
    if (x === q.answer) return { ok: true, msg: `Restar ${fmtP(q.b)} equivale a sumar ${fmtP(-q.b)}: desde ${fmt(q.a)} ${-q.b > 0 ? "sube" : "baja"} ${Math.abs(q.b)} hasta ${fmt(q.answer)}.` };
    return { ok: false, ...Diagnose.restar(q, x) };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint");
    return n === 1 ? `Restar un número es sumar su opuesto. El opuesto de ${fmt(q.b)} es ${fmt(-q.b)}.` : `${fmt(q.a)} + ${fmtP(-q.b)}: desde ${fmt(q.a)} ${-q.b > 0 ? "sube" : "baja"} ${Math.abs(q.b)}. La flecha violeta lo muestra.`; },
  demo(q, st) { st.lever = true; anim(st, "fly", 3.4, { to: q.answer }); Music.cue("lever"); },
  draw(E, t, dt, q, st) {
    const span = 6, M = q.max, y = v => v / M * span;
    Env.sea(E, t, span + 1.5);
    E.box(0, -span - 1.3, -5, 80, 0.4, 14, hex(0x2a3a33));
    Env.clouds(E, t * 3, 9, 3.5, 60, -6, 1.5);
    for (let i = 0; i < 14; i++) { const x = ((i * 9 - t * 3) % 80 + 80) % 80 - 40; E.sph(x, -span * 0.7 + (i % 3), -6, 0.25, hex(0x9fe6ff), { a: 0.5, emis: 0.3 }); }
    Env.gauge(E, -8, 0, M, span, niceStep(M), "ag", 2, null);
    let py = y(q.a), pitch = 0, roll = Math.sin(t * 1.3) * 0.08;
    const p = ap(st, "fly");
    if (p !== null) {
      const to = st.anim.data.to, e = ease(p);
      py = lerp(y(q.a), y(to), e);
      pitch = Math.sin(p * Math.PI) * clamp((to - q.a) / M, -1, 1) * 0.9;
      if (p < 1) {
        Fx.burst([-1.2, py, 0], py < 0 ? hex(0x9fe6ff) : COL.ivory, 1, { speed: 0.6, g: py < 0 ? -1 : 0, life: 0.8, size: 0.09 });
        const prev = st.prevY ?? py;
        if (Math.sign(prev) !== Math.sign(py) && prev !== 0) { Music.cue("splash"); Fx.burst([0, 0, 0], hex(0x9fe6ff), 40, { speed: 5, lift: 3 }); Fx.ring([0, 0.02, 0], hex(0x9fe6ff), { grow: 5 }); }
      }
    }
    st.prevY = py;
    Music.mood.height = clamp(py / span, -1, 1); Music.mood.under = py < 0 ? 0.7 : 0; Music.mood.intensity = p !== null && p < 1 ? 0.85 : 0.5;
    Models.plane(E, 0, py, 0, pitch, roll, hex(0xffe9b0), t);
    E.sph(0, y(q.a), 0, 0.12, COL.amber, { emis: 1 });
    Labels.put("aa", `salida ${fmt(q.a)}`, [-2.4, y(q.a), 0], "goal");
    // Flecha del desplazamiento (pista 2 o tras accionar la palanca y comprobar).
    if (st.hl === 2 || (p !== null && p >= 1)) {
      const to = q.a - q.b, x = 2.4;
      E.beam([x, y(q.a), 0], [x, y(to), 0], 0.07, COL.hint, { emis: 0.8 });
      E.cone(x, y(to), 0, 0.22, 0.45, COL.hint, { emis: 0.8, rx: to < q.a ? Math.PI : 0 });
      Labels.put("ad", `${fmtP(-q.b)}`, [x + 1.1, (y(q.a) + y(to)) / 2, 0], "hint");
    }
    // Palanca 3D.
    const lp = ap(st, "lever"), ang = st.lever ? lerp(-0.7, 0.7, lp === null ? 1 : easeBack(lp)) : -0.7;
    E.box(5.5, -0.2 + 2.2, 2, 1.2, 0.3, 0.8, hex(0x30343a));
    E.beam([5.5, 2.15, 2], [5.5 + Math.sin(ang) * 1.2, 2.15 + Math.cos(ang) * 1.2, 2], 0.06, COL.steel);
    E.sph(5.5 + Math.sin(ang) * 1.2, 2.15 + Math.cos(ang) * 1.2, 2, 0.18, st.lever ? COL.pos : COL.neg, { emis: st.hl === 1 ? 1 : 0.5 });
    Labels.put("alv", st.lever ? `${fmt(q.a)} + ${fmtP(-q.b)}` : `${fmt(q.a)} − ${fmtP(q.b)}`, [5.5, 4.1, 2], "big " + (st.lever ? "pos" : "goal"));
    if (p !== null && p >= 1) Labels.put("aar", `llega a ${fmt(st.anim.data.to)}`, [2.2, y(st.anim.data.to) + 0.8, 0], st.anim.data.to === q.answer ? "ok" : "neg");
  },
  cam(q, st) { return [[1, 1, 13], [0.5, 0, 0]]; },
  diorama(E, t) { E.box(0, 0.02, 0, 4, 0.05, 2.4, hex(0x1f7a9a), { a: 0.6 }); const yy = Math.sin(t * 0.9) * 1.8 + 0.8; Models.plane(E, 0, yy, 0, Math.cos(t * 0.9) * 0.5, 0, hex(0xffe9b0), t); },
};

// ───────────────────────────── 6. SUBMARINO DEL TIEMPO · multiplicar enteros
EX.sub = {
  id: "sub", name: "Submarino del tiempo", skill: "Multiplicar enteros", icon: "×", tint: "#ffc233", music: "sub", fog: 0x06202c,
  blurb: "El submarino se mueve a velocidad constante. ¿Dónde estará dentro de unos minutos… o dónde estaba hace unos minutos? El tiempo negativo rebobina la película.",
  level: L => { const d = D(L); return `Nivel ${L}: velocidad × tiempo con factores entre −${d.factor} y +${d.factor} (al menos uno negativo)${L <= 2 ? "; a veces la velocidad es 0" : ""}. Posición medida desde «ahora» (0).`; },
  make: (rng, L) => { const q = MathModel.multiplicar(rng, L); return { ...q, text: `Posición = tiempo ${fmt(q.a)} min · velocidad ${fmtP(q.b)} m/min` }; },
  validate: q => Validate.multiplicar(q),
  init(q) { return { sense: null }; },
  ui(q, st, A) {
    const v = q.b, tm = q.a;
    A.ctl.append(A.p(`Velocidad: ${fmt(v)} m/min (${v > 0 ? "sube" : v < 0 ? "baja" : "quieto"}). ${tm > 0 ? `¿Dónde estará dentro de ${tm} min?` : `¿Dónde estaba hace ${-tm} min?`}`));
    const g = A.h("div", { class: "chips", role: "radiogroup", "aria-label": "Predicción" });
    for (const [k, txt] of [["up", "▲ Más arriba"], ["down", "▼ Más abajo"], ["same", "◇ En el mismo sitio"]])
      g.append(A.h("button", { type: "button", class: "chip", role: "radio", "aria-checked": st.sense === k ? "true" : "false", "aria-pressed": st.sense === k ? "true" : "false", onclick: () => { st.sense = k; Music.cue("tick", k === "up" ? 3 : k === "down" ? -3 : 0); A.refresh(); } }, txt));
    A.ctl.append(g, A.num(`Posición = ${fmt(tm)} · ${fmtP(v)}`, "inMul"));
  },
  check(q, st, A) {
    const x = parseIntLoose(A.val("inMul"));
    if (!st.sense) return { notReady: true, msg: "Predice primero: ¿más arriba, más abajo o en el mismo sitio?" };
    if (x === null) return { notReady: true, msg: "Escribe la posición (entero con su signo)." };
    anim(st, "run", 1 + 0.45 * Math.abs(q.a), { to: x }); if (q.a < 0) Music.cue("rewind");
    const want = q.answer > 0 ? "up" : q.answer < 0 ? "down" : "same";
    if (x === q.answer && st.sense === want) return { ok: true, msg: `${fmt(q.a)} · ${fmtP(q.b)} = ${fmt(q.answer)}. ${(q.a < 0) + (q.b < 0) === 2 ? "Va bajando, pero rebobinamos: hace un rato estaba más arriba. Dos signos negativos dan positivo." : q.answer === 0 ? "Con velocidad 0 no se mueve." : "Un solo signo negativo: el resultado es negativo."}` };
    if (x === q.answer) return { ok: false, tag: "reglaSignos", msg: `El número es correcto, pero la predicción no: ${fmt(q.answer)} está ${q.answer > 0 ? "más arriba" : q.answer < 0 ? "más abajo" : "en el mismo sitio"}.` };
    return { ok: false, ...Diagnose.multiplicar(q, x) };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint"); const negs = (q.a < 0) + (q.b < 0);
    return n === 1 ? `Hay ${negs} signo${negs === 1 ? "" : "s"} negativo${negs === 1 ? "" : "s"}: ${q.b < 0 ? "baja" : "sube"}${q.a < 0 ? " y además rebobinamos la película (cada signo negativo invierte el sentido)" : ""}.` : `Cada minuto cambia ${Math.abs(q.b)} m; en ${Math.abs(q.a)} minutos son ${Math.abs(q.a * q.b)} m.`; },
  demo(q, st) { st.sense = q.answer > 0 ? "up" : q.answer < 0 ? "down" : "same"; anim(st, "run", 1.2 + 0.5 * Math.abs(q.a), { to: q.answer }); if (q.a < 0) Music.cue("rewind"); },
  draw(E, t, dt, q, st) {
    const F = q.factor, M = F * F, span = 6.5, y = v => v / M * span;
    E.box(0, -span - 1.2, 0, 70, 1, 40, hex(0x2a2a22));
    for (let i = 0; i < 16; i++) E.cone(-24 + i * 3.2, -span - 0.4, -5 - (i % 3), 0.5 + (i % 2) * 0.3, 1.5 + (i % 3), hex(0x2f6b4c));
    E.box(0, span + 1, 0, 70, 0.1, 40, hex(0x3aa0c0), { a: 0.35, emis: 0.3 });
    for (let i = 0; i < 22; i++) { const yy = ((i * 1.37 + t * 0.7) % (span * 2 + 2)) - span - 1; E.sph(-10 + (i * 3.1) % 22, yy, -4 + (i % 3), 0.06 + (i % 3) * 0.03, hex(0xbff3ff), { a: 0.5, emis: 0.5 }); }
    Env.gauge(E, -6, 0, M, span, niceStep(M), "sg", 2, null);
    Labels.put("snow", "AHORA 0", [-7.6, 0, 0], "zero");
    let sy = 0, rewinding = false;
    const p = ap(st, "run");
    if (p !== null) {
      const total = Math.abs(q.a), stepF = Math.min(total, Math.floor(ease(p) * total + 1e-6));
      const frac = ease(p) * total;
      sy = y(Math.sign(q.a) * q.b * frac);
      rewinding = q.a < 0 && p < 1;
      if (Math.floor(frac) !== st.lastPulse && p < 1) { st.lastPulse = Math.floor(frac); Music.cue("ping"); Fx.ring([0, sy, 0.8], COL.pos, { grow: 2, life: 0.8 }); }
      for (let k = 1; k <= stepF; k++) { const yy = y(Math.sign(q.a) * q.b * k); E.sph(1.6, yy, 0, 0.1, COL.amber, { emis: 1 }); if (total <= 15) Labels.put("sp" + k, `${fmt(Math.sign(q.a) * k)} min`, [2.6, yy, 0], "small goal"); }
      if (p >= 1) Labels.put("sres", `${fmt(st.anim.data.to)} m`, [2.8, y(st.anim.data.to), 0], st.anim.data.to === q.answer ? "ok" : "neg");
    } else st.lastPulse = -1;
    Music.mood.under = 0.9; Music.mood.rewind = rewinding ? 1 : 0; Music.mood.height = clamp(sy / span, -1, 1); Music.mood.intensity = p !== null && p < 1 ? 0.7 : 0.3;
    Models.sub(E, 0, sy, 0, hex(0xffc233), rewinding ? -t : t, Math.PI / 2 * (q.b >= 0 ? 1 : 1));
    E.cone(0, sy + (q.b >= 0 ? 1.6 : -1.6), 0, 0.25, 0.5, q.b >= 0 ? COL.pos : COL.neg, { rx: q.b >= 0 ? 0 : Math.PI, emis: 0.6 });
    // Película: en tiempo negativo, marco y barra de rebobinado.
    if (q.a < 0) {
      const glow = rewinding ? 0.6 + 0.4 * Math.sin(t * 20) : 0.3;
      E.box(0, span + 0.4, 1.5, 9, 0.35, 0.05, COL.hint, { emis: glow }); E.box(0, -span - 0.4, 1.5, 9, 0.35, 0.05, COL.hint, { emis: glow });
      for (let i = 0; i < 10; i++) { E.box(-4.2 + i * 0.93, span + 0.4, 1.53, 0.3, 0.18, 0.02, hex(0x111111)); E.box(-4.2 + i * 0.93, -span - 0.4, 1.53, 0.3, 0.18, 0.02, hex(0x111111)); }
      Labels.put("rw", rewinding ? "◀◀ REBOBINANDO" : `◀◀ hace ${-q.a} min`, [0, span + 1.1, 1.5], "hint");
    }
    Labels.put("sv", `velocidad ${fmt(q.b)} m/min`, [4.5, sy + 1.2, 0], signCls(q.b));
    if (st.hl === 2) Labels.put("sh", `${Math.abs(q.a)} × ${Math.abs(q.b)} = ${Math.abs(q.a * q.b)}`, [4.5, sy - 1.2, 0], "hint");
  },
  cam(q, st) { return [[2, 0.5, 13.5], [0.5, 0, 0]]; },
  diorama(E, t) { E.box(0, 0.9, 0, 3.6, 1.8, 2, hex(0x0e4a63), { a: 0.6 }); Models.sub(E, 0, 0.9 + Math.sin(t) * 0.3, 0, hex(0xffc233), t); },
};

// ───────────────────────────── 7. TELEFÉRICO · dividir enteros
EX.tele = {
  id: "tele", name: "Teleférico", skill: "Dividir enteros", icon: ":", tint: "#b79bff", music: "tele", fog: 0x1c3048,
  blurb: "El teleférico cambia de altura al mismo ritmo cada minuto. Conoces el cambio total y el tiempo: reparte el viaje en tramos iguales.",
  level: L => { const d = D(L); return `Nivel ${L}: divisiones exactas; tiempo entre 2 y ${d.factor} min en valor absoluto (negativo = hacia el pasado), cambio por minuto hasta ±${d.factor} m (cambio total hasta ±${d.factor * d.factor} m). El divisor nunca es 0.`; },
  make: (rng, L) => MathModel.dividir(rng, L),
  validate: q => Validate.dividir(q),
  init(q) { return { sense: null }; },
  ui(q, st, A) {
    A.ctl.append(A.p(q.b > 0 ? `En los próximos ${q.b} min su altura cambia ${fmt(q.a)} m.` : `Si rebobinamos ${-q.b} min (tiempo ${fmt(q.b)}), su altura cambia ${fmt(q.a)} m.`));
    const g = A.h("div", { class: "chips", role: "radiogroup", "aria-label": "Sentido" });
    for (const [k, txt] of [["up", "▲ Sube cada minuto"], ["down", "▼ Baja cada minuto"]])
      g.append(A.h("button", { type: "button", class: "chip", role: "radio", "aria-checked": st.sense === k ? "true" : "false", "aria-pressed": st.sense === k ? "true" : "false", onclick: () => { st.sense = k; Music.cue("tick", k === "up" ? 3 : -3); A.refresh(); } }, txt));
    A.ctl.append(g, A.num(`Cambio por minuto = ${fmt(q.a)} : ${fmtP(q.b)}`, "inDiv"));
  },
  check(q, st, A) {
    const x = parseIntLoose(A.val("inDiv"));
    if (!st.sense) return { notReady: true, msg: "Elige si el teleférico sube o baja cada minuto." };
    if (x === null) return { notReady: true, msg: "Escribe el cambio por minuto." };
    anim(st, "ride", 1 + 0.4 * Math.abs(q.b), { per: x }); Music.cue("whoosh", 1); if (q.b < 0) Music.cue("rewind");
    const want = q.answer > 0 ? "up" : "down";
    if (x === q.answer && st.sense === want) return { ok: true, msg: `${fmt(q.a)} : ${fmtP(q.b)} = ${fmt(q.answer)}. ${Math.abs(q.a)} m repartidos en ${Math.abs(q.b)} tramos dan ${Math.abs(q.answer)} m por tramo; ${sgn(q.a) === sgn(q.b) ? "signos iguales: sube" : "signos distintos: baja"}.` };
    if (x === q.answer) return { ok: false, tag: "reglaSignos", msg: `El número está bien, pero el teleférico ${q.answer > 0 ? "sube" : "baja"} cada minuto.` };
    return { ok: false, ...Diagnose.dividir(q, x) };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint");
    return n === 1 ? (q.b < 0 ? "Al rebobinar se invierte el sentido. Signos iguales: sube; distintos: baja." : "Si el cambio total es negativo y el tiempo positivo, baja cada minuto.") : `${Math.abs(q.a)} : ${Math.abs(q.b)} = ${Math.abs(q.answer)}. Ahora decide el signo.`; },
  demo(q, st) { st.sense = q.answer > 0 ? "up" : "down"; anim(st, "ride", 1.4 + 0.45 * Math.abs(q.b), { per: q.answer }); if (q.b < 0) Music.cue("rewind"); },
  draw(E, t, dt, q, st) {
    const F = q.factor, M = F * F, span = 6, y = v => v / M * span, n = Math.abs(q.b), W = 14;
    E.box(0, -span - 1, 0, 70, 1, 40, hex(0x24343a));
    for (let i = 0; i < 9; i++) { const x = -26 + i * 6.5; E.cone(x, -span + 3, -10, 4 + (i % 2), 9 + (i % 3) * 2, hex(0x3b4a55)); E.cone(x, -span + 3 + 3.5 + (i % 3), -10, 1.2, 2, COL.ivory); }
    Env.clouds(E, t, 6, span - 1, 50, -7, 0.3);
    // Cable de x=-W/2 (altura 0) a x=W/2 (altura del cambio total). Torres en cada tramo.
    const total = q.a * (q.b > 0 ? 1 : -1); // cambio en el sentido del tiempo hacia delante
    const X = k => -W / 2 + W * k / n, Y = k => y(total * k / n);
    E.beam([X(0), Y(0) + 1.2, 0], [X(n), Y(n) + 1.2, 0], 0.03, COL.steel);
    for (let k = 0; k <= n; k++) {
      E.beam([X(k), -span - 0.5, 0], [X(k), Y(k) + 1.2, 0], 0.08, hex(0x8a8f96));
      E.box(X(k), Y(k) + 1.25, 0, 0.6, 0.12, 0.4, hex(0x8a8f96));
      if (n <= 15) Labels.put("tk" + k, `${q.b > 0 ? "+" : "−"}${k} min`, [X(k), -span - 0.2, 0.6], "small " + (q.b > 0 ? "pos" : "neg"));
    }
    Labels.put("ttot", `cambio total ${fmt(q.a)} m en ${fmt(q.b)} min`, [0, span + 1, 0], "big goal");
    let ck = 0; const p = ap(st, "ride");
    if (p !== null) ck = ease(p) * n;
    if (q.b < 0 && p !== null) ck = n - ease(p) * n; // al rebobinar, recorre el cable hacia atrás
    const cx = lerp(X(0), X(n), ck / n), cy = lerp(Y(0), Y(n), ck / n);
    Models.cabin(E, cx, cy, 0, COL.neg, t);
    Music.mood.height = clamp(cy / span, -1, 1); Music.mood.intensity = p !== null && p < 1 ? 0.7 : 0.35; Music.mood.rewind = q.b < 0 && p !== null && p < 1 ? 1 : 0;
    if (p !== null) {
      const per = st.anim.data.per, done = Math.floor(ease(p) * n);
      if (done !== st.lastSeg && p < 1) { st.lastSeg = done; Music.cue("tick", clamp(per / F * 3, -4, 4)); }
      for (let k = 0; k < Math.min(done, n); k++) Labels.put("ts" + k, fmt(per), [(X(k) + X(k + 1)) / 2, (Y(k) + Y(k + 1)) / 2 + 2, 0], per === q.answer ? "small ok" : "small neg");
    } else st.lastSeg = -1;
    if (st.hl === 2) Labels.put("th", `${Math.abs(q.a)} : ${Math.abs(q.b)} = ${Math.abs(q.answer)}`, [0, span - 0.2, 0], "hint");
    if (q.b < 0) Labels.put("trw", "◀◀ tiempo hacia el pasado", [0, -span + 0.6, 1], "hint");
  },
  cam(q, st) { return [[0, 1.5, 15.5], [0, 0, 0]]; },
  diorama(E, t) { E.beam([-2, 0.6, 0], [2, 3, 0], 0.03, COL.steel); const k = (Math.sin(t * 0.6) + 1) / 2; Models.cabin(E, lerp(-2, 2, k), lerp(0.6, 3, k) - 1.2, 0, COL.neg, t); E.cyl(-2, 0.3, 0, 0.1, 0.6, COL.steel); E.cyl(2, 1.5, 0, 0.1, 3, COL.steel); },
};

// ───────────────────────────── 8. DRON DE RESCATE · operaciones combinadas
EX.dron = {
  id: "dron", name: "Dron de rescate", skill: "Operaciones combinadas", icon: "( )", tint: "#ff9a3d", music: "dron", fog: 0x1d1a2a,
  blurb: "Una montañera espera en una cornisa. El dron sigue un programa de vuelo: ejecuta las operaciones en el orden correcto y llegará a su altura.",
  level: L => { const c = D(L).combo; return `Nivel ${L}: ${c.ops} operaciones${c.paren ? " con un par de paréntesis" : " sin paréntesis"}; sumandos hasta ±${c.max}, factores y divisores hasta ±${c.fmax} (dividendos exactos hasta ±${c.fmax * c.fmax}). Todos los pasos dan enteros.`; },
  make: (rng, L) => MathModel.combinadas(rng, L),
  validate: q => Validate.combinadas(q),
  init(q) { return { tokens: q.tokens, done: [], pending: null, alt: 0, fromAlt: 0 }; },
  ui(q, st, A) {
    A.ctl.append(A.p(st.tokens.length > 1 ? "Toca la operación que va primero y calcula su resultado." : "¡Programa completo!"));
    const ex = A.h("div", { class: "expr-ops", "aria-label": "Programa de vuelo" });
    st.tokens.forEach((tk, k) => {
      if (tk.t === "n") ex.append(A.h("span", { class: "num " + signCls(tk.v) }, k > 0 && st.tokens[k - 1].t !== "(" && tk.v < 0 ? `(${fmtPlain(tk.v)})` : fmtPlain(tk.v)));
      else if (isOp(tk.t)) ex.append(A.h("button", { type: "button", "aria-label": "Operación " + { "+": "más", "-": "menos", "*": "por", "/": "entre" }[tk.t], "aria-pressed": st.pending === k ? "true" : "false", onclick: () => this.choose(q, st, k, A) }, { "+": "+", "-": "−", "*": "·", "/": ":" }[tk.t]));
      else ex.append(A.h("span", {}, tk.t));
    });
    A.ctl.append(ex);
    if (st.pending !== null) {
      const tk = st.tokens, k = st.pending;
      A.ctl.append(A.num(`${fmt(tk[k - 1].v)} ${{ "+": "+", "-": "−", "*": "·", "/": ":" }[tk[k].t]} ${fmtP(tk[k + 1].v)} =`, "inStep"));
    }
    if (st.done.length) A.ctl.append(A.h("div", { class: "num", style: "font-size:15px;color:var(--muted)" }, st.done.map(s => stepText(s)).join(" → ")));
  },
  choose(q, st, k, A) {
    if (st.tokens.length <= 1) return;
    if (!opAllowed(st.tokens, k)) {
      st.shake = App.now; Music.cue("fail");
      A.registerError("jerarquia", "Esa operación todavía no toca: primero se resuelven los paréntesis, después · y : (de izquierda a derecha) y al final + y −.");
      return;
    }
    st.pending = k; Music.cue("lever"); A.refresh(); A.focus("inStep");
  },
  check(q, st, A) {
    if (st.tokens.length <= 1) return { ok: true, msg: `El dron llega a ${fmt(q.answer)} m y rescata a la montañera. Orden seguido: ${q.steps.map(stepText).join("; ")}.` };
    if (st.pending === null) return { notReady: true, msg: "Toca primero la operación que debe ir antes." };
    const x = parseIntLoose(A.val("inStep"));
    if (x === null) return { notReady: true, msg: "Escribe el resultado de esa operación." };
    const r = applyOp(st.tokens, st.pending);
    if (x !== r.result) {
      const fake = { kind: "combinadas", tokens: [{ t: "n", v: r.a }, { t: r.op }, { t: "n", v: r.b }], steps: [{ a: r.a, b: r.b, op: r.op, result: r.result }], answer: r.result };
      const tag = x === -r.result ? (r.op === "*" || r.op === "/" ? "reglaSignos" : "signo") : "calculo";
      return { ok: false, tag, msg: `${fmt(r.a)} ${{ "+": "+", "-": "−", "*": "·", "/": ":" }[r.op]} ${fmtP(r.b)} no da ${fmt(x)}. ${r.op === "-" ? `Restar ${fmtP(r.b)} es sumar ${fmtP(-r.b)}.` : r.op === "*" || r.op === "/" ? "Recuerda la regla de los signos: iguales dan +, distintos dan −." : "Las cargas de distinto signo se anulan."} Inténtalo otra vez.` };
    }
    st.done.push({ a: r.a, b: r.b, op: r.op, result: r.result });
    st.tokens = r.tokens; st.pending = null;
    st.fromAlt = st.alt; st.alt = r.result; anim(st, "move", 1.2); Music.cue("success");
    if (st.tokens.length <= 1) { anim(st, "rescue", 2.6); setTimeout(() => Music.cue("fanfare"), 600); return { ok: true, msg: `¡Rescate! ${q.steps.map(stepText).join("; ")}. El orden importa: paréntesis, después · y :, al final + y −.` }; }
    return { partial: true, msg: `${stepText(st.done[st.done.length - 1])}. El dron se mueve a ${fmt(r.result)}. ¿Cuál va ahora?` };
  },
  hint(q, st, n) { st.hl = n; Music.cue("hint"); const k = st.tokens.findIndex((_, i) => opAllowed(st.tokens, i)); const r = applyOp(st.tokens, k);
    return n === 1 ? "Orden: primero los paréntesis, después · y : de izquierda a derecha, y al final + y −. Las operaciones posibles brillan." : `La siguiente es ${fmt(r.a)} ${{ "+": "+", "-": "−", "*": "·", "/": ":" }[r.op]} ${fmtP(r.b)} = ${fmt(r.result)}.`; },
  demo(q, st) { st.autoplay = true; st.autoT = App.now; },
  draw(E, t, dt, q, st) {
    const maxAbs = Math.max(20, ...q.steps.map(s => Math.abs(s.result)), Math.abs(q.answer)), span = 5, y = v => v / maxAbs * span;
    if (st.autoplay && st.tokens.length > 1 && App.now - (st.autoT ?? 0) > 1.4 * App.motionScale) {
      const k = st.tokens.findIndex((_, i) => opAllowed(st.tokens, i)), r = applyOp(st.tokens, k);
      st.done.push({ a: r.a, b: r.b, op: r.op, result: r.result }); st.tokens = r.tokens; st.fromAlt = st.alt; st.alt = r.result; anim(st, "move", 1.1); Music.cue("success"); st.autoT = App.now;
      if (st.tokens.length <= 1) { anim(st, "rescue", 2.6); Music.cue("fanfare"); }
      App.refreshControls();
    }
    // Cañón con paredes de roca.
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) E.box(s * (9 + (i % 2)), -span + i * 1.8, -1 - (i % 3), 3, 2, 6, hex(0x5a4a5e - (i % 3) * 0x080808));
    E.box(0, -span - 1, 0, 40, 1, 20, hex(0x2a2333));
    E.box(0, 0, -4, 40, 0.05, 0.05, COL.zero, { emis: 0.6 });
    Labels.put("dz", "cota 0", [-8, 0.4, -4], "small zero");
    Env.gauge(E, -6.5, 0, maxAbs, span, niceStep(maxAbs), "dg", 2, null);
    // Cornisa con la montañera.
    const gy = y(q.answer);
    E.box(5.5, gy - 0.4, 0, 3, 0.5, 2, hex(0x6b5a70));
    const rp = ap(st, "rescue");
    if (!(rp !== null && rp > 0.5)) Models.hero(E, 5.5, gy - 0.15, 0, -Math.PI / 2, t, 0, COL.neg);
    Labels.put("dgoal", `${fmt(q.answer)} m`, [7.3, gy, 0], st.tokens.length <= 1 ? "ok" : "goal");
    // Dron.
    const mp = ap(st, "move"); let dy = y(st.alt), dx = 0, tilt = 0;
    if (mp !== null && mp < 1) { dy = lerp(y(st.fromAlt), y(st.alt), ease(mp)); tilt = Math.sin(mp * Math.PI) * 0.3 * Math.sign(st.alt - st.fromAlt); if (Math.random() < 0.4) Fx.burst([0, dy - 0.3, 0], COL.amber, 1, { speed: 1, g: 2, life: 0.4, size: 0.06 }); }
    if (rp !== null) { dx = lerp(0, 5.5, ease(Math.min(1, rp * 2))); dy = lerp(y(st.alt), gy + 1.2, ease(Math.min(1, rp * 2))); if (rp > 0.5) { Models.hero(E, dx, dy - 1.4, 0, 0, t, 0, COL.neg); E.beam([dx, dy, 0], [dx, dy - 0.3, 0], 0.02, COL.ivory); } if (rp > 0.55 && !st.party) { st.party = 1; confetti([dx, dy, 0], 70); } }
    if (st.shake && App.now - st.shake < 0.5) { dx += Math.sin(App.now * 80) * 0.15; Fx.burst([0, dy, 0], COL.neg, 1, { speed: 2, life: 0.3, size: 0.05 }); }
    Models.drone(E, dx, dy, 0, t, tilt);
    Labels.put("dalt", `${fmt(st.alt)} m`, [dx - 1.4, dy + 0.6, 0], signCls(st.alt));
    Music.mood.height = clamp(dy / span, -1, 1); Music.mood.intensity = 0.4 + 0.15 * st.done.length;
    Labels.put("dprog", tokensToString(st.tokens), [0, span + 1.3, 0], "big goal");
  },
  cam(q, st) { return [[1.5, 0.8, 16], [1, 0.3, 0]]; },
  diorama(E, t) { Models.drone(E, 0, 1.6 + Math.sin(t * 1.3) * 0.5, 0, t, Math.sin(t) * 0.2); E.box(1.6, 0.6, 0, 1, 0.3, 1, hex(0x6b5a70)); Models.hero(E, 1.6, 0.75, 0, -Math.PI / 2, t, 0, COL.neg); },
};

// ───────────────────────────── 9. LA GRAN EXPEDICIÓN · misión mixta
EX.tour = {
  id: "tour", name: "La gran expedición", skill: "Misión mixta", icon: "★", tint: "#f3ecd9", music: "tour", fog: 0x14283a,
  blurb: "Misiones de 3 a 5 paradas que enlazan retos de todas las aventuras. Entre parada y parada sobrevuelas la base.",
  level: L => `Nivel ${L}: misiones de ${L <= 3 ? 3 : L <= 7 ? 4 : 5} paradas con retos de las otras ocho aventuras al nivel ${L}; la sesión completa son ${CONFIG.RETOS} retos.`,
  stops: L => L <= 3 ? 3 : L <= 7 ? 4 : 5,
};
const EX_ORDER = ["rocas", "vertical", "lago", "globo", "avion", "sub", "tele", "dron", "tour"];
const EX_PLAY = EX_ORDER.slice(0, 8);
