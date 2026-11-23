// ═════════════════════════════════════════════ 10. Persistencia local
const Store = {
  data: { prefs: { reduce: null, sound: true, ex: "rocas", level: 1 }, best: {} },
  load() { try { const s = localStorage.getItem(CONFIG.STORE); if (s) this.data = Object.assign(this.data, JSON.parse(s)); } catch (e) { /* almacenamiento no disponible */ } },
  save() { try { localStorage.setItem(CONFIG.STORE, JSON.stringify(this.data)); } catch (e) { /* sin persistencia */ } },
  clear() { try { localStorage.removeItem(CONFIG.STORE); } catch (e) { /* nada que borrar */ } this.data = { prefs: { reduce: null, sound: true, ex: "rocas", level: 1 }, best: {} }; },
  best(ex, L) { return this.data.best?.[ex]?.[L] ?? null; },
  setBest(ex, L, v) { this.data.best[ex] = this.data.best[ex] || {}; if ((this.data.best[ex][L] ?? -1) < v) this.data.best[ex][L] = v; this.save(); },
};

// ═════════════════════════════════════════════ 9. UI accesible
const $ = id => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== "") el.append(k);
  return el;
}

// Base: posiciones de los dioramas en la isla.
const HUB = { R: 13, pos: {} };
EX_ORDER.forEach((id, i) => {
  if (id === "tour") { HUB.pos[id] = [0, -2]; return; }
  const a = -Math.PI / 2 + (i / 8) * Math.PI * 2 + Math.PI / 8;
  HUB.pos[id] = [Math.cos(a) * HUB.R, Math.sin(a) * HUB.R];
});

const App = {
  screen: "cover", now: 0, last: 0, motionScale: 1, reduceMotion: false, lowPower: false,
  exId: "rocas", level: 1, seedFixed: null, S: null, cur: null,
  avatar: { x: 0, z: 18, ry: Math.PI, tx: null, tz: null, run: 0 }, keys: new Set(), stick: [0, 0],
  camEye: [0, 14, 34], camTarget: [0, 0, 0], transition: null,

  boot() {
    Store.load();
    const sysReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.setReduce(Store.data.prefs.reduce ?? sysReduce);
    this.exId = EX[Store.data.prefs.ex] ? Store.data.prefs.ex : "rocas";
    this.level = clamp(Store.data.prefs.level || 1, 1, 10);
    this.lowPower = (navigator.hardwareConcurrency || 4) <= 2;
    const r = Engine.init($("gl"));
    if (!r.ok) { $("nogl").hidden = false; $("noglMsg").textContent = r.msg + " El parque necesita WebGL2: prueba con una versión reciente de Chrome, Edge, Firefox o Safari con la aceleración por hardware activada."; return; }
    Labels.init($("labels"));
    this.buildMap(); this.bindUI(); this.bindInput();
    Engine.resize(); addEventListener("resize", () => Engine.resize());
    document.addEventListener("visibilitychange", () => { Music.pause(document.hidden); this.last = performance.now(); });
    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },
  setReduce(v) { this.reduceMotion = !!v; this.motionScale = v ? 0.35 : 1; $("optMotion").checked = !!v; },
  toast(msg) { const el = $("toast"); el.textContent = msg; el.hidden = false; clearTimeout(this._toast); this._toast = setTimeout(() => el.hidden = true, 2600); },
  show(name) {
    for (const s of ["cover", "map", "act", "sum"]) $(s).hidden = s !== name;
    this.screen = name; Fx.clear(); Labels.begin(); Labels.end();
    Music.setScene(name === "act" ? EX[this.cur.ex].music : "base");
  },

  // ───────── mapa / selector
  buildMap() {
    const list = $("attrList"); list.innerHTML = "";
    EX_ORDER.forEach(id => {
      const e = EX[id];
      list.append(h("li", { role: "presentation" }, h("button", { type: "button", class: "attr", role: "option", id: "opt-" + id, "aria-selected": "false", onclick: () => this.selectEx(id, true) },
        h("span", { class: "ico", style: `background:${e.tint}22;color:${e.tint};border:1px solid ${e.tint}` }, e.icon),
        h("span", {}, h("span", { class: "nm" }, e.name), h("span", { class: "sk" }, e.skill)))));
    });
    const lv = $("levels"); lv.innerHTML = "";
    for (let L = 1; L <= 10; L++) lv.append(h("button", { type: "button", role: "radio", "aria-checked": "false", "aria-label": "Intensidad " + L, onclick: () => this.selectLevel(L),
      onkeydown: e => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { this.selectLevel(Math.min(10, this.level + 1)); lv.children[this.level - 1].focus(); e.preventDefault(); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { this.selectLevel(Math.max(1, this.level - 1)); lv.children[this.level - 1].focus(); e.preventDefault(); } } }, String(L)));
    this.selectEx(this.exId, false); this.selectLevel(this.level);
  },
  selectEx(id, walk) {
    this.exId = id; Store.data.prefs.ex = id; Store.save();
    for (const b of document.querySelectorAll(".attr")) b.setAttribute("aria-selected", b.id === "opt-" + id ? "true" : "false");
    const e = EX[id];
    $("attrDetail").innerHTML = "";
    $("attrDetail").append(h("h3", { style: `color:${e.tint}` }, e.name), h("p", { style: "color:var(--muted);font-size:14px" }, e.skill), h("p", {}, e.blurb));
    if (walk) { const [x, z] = HUB.pos[id]; this.avatar.tx = x; this.avatar.tz = z + 3.2; }
    this.updateLevelDesc();
  },
  selectLevel(L) {
    this.level = L; Store.data.prefs.level = L; Store.save();
    [...$("levels").children].forEach((b, i) => { const on = i + 1 === L; b.setAttribute("aria-checked", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
    this.updateLevelDesc();
  },
  updateLevelDesc() {
    const best = Store.best(this.exId, this.level);
    $("lvlDesc").textContent = EX[this.exId].level(this.level) + (best !== null ? ` Tu mejor resultado: ${best}/${CONFIG.RETOS} a la primera.` : "");
  },

  bindUI() {
    $("btnOpen").addEventListener("click", () => { Music.setEnabled(Store.data.prefs.sound !== false); this.show("map"); $("attrList").querySelector('[aria-selected="true"]')?.focus(); });
    $("btnRide").addEventListener("click", () => this.startSession(this.exId, this.level));
    $("btnNearRide").addEventListener("click", () => { if (this.near) { this.selectEx(this.near, false); this.startSession(this.near, this.level); } });
    $("optMotion").addEventListener("change", e => { this.setReduce(e.target.checked); Store.data.prefs.reduce = e.target.checked; Store.save(); });
    $("optSound").checked = Store.data.prefs.sound !== false;
    $("optSound").addEventListener("change", e => { Store.data.prefs.sound = e.target.checked; Store.save(); Music.setEnabled(e.target.checked); });
    $("btnClear").addEventListener("click", () => $("dlgClear").showModal());
    $("dlgClearNo").addEventListener("click", () => $("dlgClear").close());
    $("dlgClearYes").addEventListener("click", () => { Store.clear(); $("dlgClear").close(); this.updateLevelDesc(); this.toast("Progreso borrado."); });
    $("btnTeacher").addEventListener("click", () => { $("seedIn").value = this.seedFixed ?? (this.S?.seed ?? ""); $("dlgTeacher").showModal(); });
    $("dlgTeacherClose").addEventListener("click", () => $("dlgTeacher").close());
    $("btnRank").addEventListener("click", () => this.showRanking());
    $("dlgRankClose").addEventListener("click", () => $("dlgRank").close());
    const rkState = () => { $("rkState").textContent = Ranking.shared() ? "Estado: ranking compartido activado." : "Estado: ranking solo local (no hay URL válida de Apps Script)."; };
    $("btnTeacher").addEventListener("click", () => { $("rkUrl").value = Ranking.url(); rkState(); });
    $("rkSave").addEventListener("click", () => {
      const v = $("rkUrl").value.trim();
      if (v && !/^https:\/\/script\.google(usercontent)?\.com\/.+\/exec$/.test(v)) { this.toast("La URL debe ser la de la aplicación web de Apps Script y terminar en /exec."); return; }
      Store.data.prefs.rankingUrl = v; Store.save(); rkState(); this.toast(v ? "Ranking compartido configurado." : "Ranking compartido desactivado.");
    });
    $("rkTest").addEventListener("click", async () => {
      $("rkState").textContent = "Probando conexión…";
      const t = await Ranking.top("rocas", 1);
      $("rkState").textContent = t.shared ? "Conexión correcta con la hoja de Google." : "No se pudo conectar: revisa la URL y que la implementación tenga acceso «Cualquier usuario».";
    });
    $("seedUse").addEventListener("click", () => { const v = parseInt($("seedIn").value, 10); if (Number.isFinite(v) && v >= 0) { this.seedFixed = v; this.toast(`Semilla ${v}: la próxima sesión usará estos retos.`); } else this.toast("La semilla debe ser un número entero positivo."); });
    $("seedRandom").addEventListener("click", () => { this.seedFixed = null; $("seedIn").value = ""; this.toast("Cada sesión usará una semilla nueva."); });
    $("seedCopy").addEventListener("click", () => { const v = $("seedIn").value; if (navigator.clipboard?.writeText) navigator.clipboard.writeText(v).then(() => this.toast("Semilla copiada."), () => { $("seedIn").select(); this.toast("Selecciona y copia la semilla."); }); else { $("seedIn").select(); this.toast("Selecciona y copia la semilla."); } });
    $("runTests").addEventListener("click", () => { $("testOut").textContent = "Ejecutando…"; setTimeout(() => $("testOut").textContent = Tests.run().text, 30); });
    $("btnCheck").addEventListener("click", () => this.doCheck());
    $("btnHint").addEventListener("click", () => this.doHint());
    $("btnReplay").addEventListener("click", () => this.doReplay());
    $("btnNew").addEventListener("click", () => this.doNew());
    $("btnNext").addEventListener("click", () => this.nextChallenge());
    $("btnBack").addEventListener("click", () => { this.S = null; this.show("map"); });
  },

  bindInput() {
    addEventListener("keydown", e => {
      const tag = (e.target.tagName || "").toLowerCase(), typing = tag === "input";
      if (this.screen === "map" && !typing && !e.target.closest?.("dialog")) {
        const k = e.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) && (e.target === document.body || e.target === $("gl"))) { this.keys.add(k); e.preventDefault(); }
        if (e.key === "Enter" && this.near && (e.target === document.body || e.target === $("gl"))) { this.selectEx(this.near, false); this.startSession(this.near, this.level); }
      }
      if (this.screen === "act" && this.cur && !typing) {
        const ex = EX[this.cur.ex];
        if (ex.key && (e.target === document.body || e.target === $("gl") || e.target.closest?.("#controls")) && ex.key(this.cur.q, this.cur.st, e, this.api())) e.preventDefault();
        if (e.key === "Enter" && (e.target === document.body || e.target === $("gl"))) { this.doCheck(); e.preventDefault(); }
      }
      if (this.screen === "act" && typing && e.key === "Enter") { this.doCheck(); e.preventDefault(); }
    });
    addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));
    addEventListener("blur", () => this.keys.clear());
    const cv = $("gl");
    cv.addEventListener("pointerdown", e => {
      const id = Engine.hitTest(e.clientX, e.clientY);
      if (this.screen === "map") {
        if (id?.startsWith("hub:")) { const ex = id.slice(4); this.selectEx(ex, true); return; }
        const g = Engine.groundHit(e.clientX, e.clientY, 0.4); if (g) { this.avatar.tx = g[0]; this.avatar.tz = g[2]; }
      } else if (this.screen === "act" && this.cur && id) {
        const ex = EX[this.cur.ex]; ex.pick?.(this.cur.q, this.cur.st, id, this.api());
      }
    });
    const stick = $("stick"); let sid = null;
    const mv = e => { const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / 45, y = (e.clientY - r.top - r.height / 2) / 45; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } this.stick = [x, y]; stick.style.setProperty("--sx", x * 34 + "px"); stick.style.setProperty("--sy", y * 34 + "px"); };
    stick.addEventListener("pointerdown", e => { sid = e.pointerId; stick.setPointerCapture(sid); mv(e); });
    stick.addEventListener("pointermove", e => { if (e.pointerId === sid) mv(e); });
    stick.addEventListener("pointerup", () => { sid = null; this.stick = [0, 0]; stick.style.setProperty("--sx", "0px"); stick.style.setProperty("--sy", "0px"); });
  },

  // ───────── sesión
  startSession(exId, level) {
    const seed = this.seedFixed ?? newSeed();
    this.S = { exId, level, seed, rng: makeRng(seed), idx: 0, results: [], prevEx: null, mission: 1, stop: 0 };
    this.cur = null;
    this.nextChallenge(true);
  },
  makeChallenge(exReal) {
    const ex = EX[exReal]; let q = null;
    for (let i = 0; i < 25; i++) { const c = ex.make(this.S.rng, this.S.level); if (ex.validate(c).length === 0) { q = c; break; } }
    if (!q) throw new Error("No se pudo generar un reto válido para " + exReal);
    return { ex: exReal, q, st: ex.init(q), attempts: 0, hints: 0, demo: false, solved: false, tags: [], inputs: {}, t0: this.now, animT: 0 };
  },
  nextChallenge(first) {
    const S = this.S;
    if (!first) S.idx++;
    if (S.idx >= CONFIG.RETOS) return this.summary();
    let real = S.exId;
    if (S.exId === "tour") {
      const opts = EX_PLAY.filter(id => id !== S.prevEx); real = S.rng.pick(opts); S.prevEx = real;
      const N = EX.tour.stops(S.level); S.stop++; if (S.stop > N) { S.mission++; S.stop = 1; }
      if (!first) this.transition = { t0: this.now, from: this.camEye.slice() };
    }
    this.cur = this.makeChallenge(real);
    if (first) this.show("act"); else { Fx.clear(); Music.setScene(EX[real].music); }
    this.renderTask();
    if (first) { const lb = $("btnCheck"); lb.focus({ preventScroll: true }); }
  },
  api() {
    const app = this, cur = this.cur;
    return {
      ctl: $("controls"), h,
      p: t => h("p", { style: "margin:0;line-height:1.45" }, t),
      btn: (label, fn, aria) => h("button", { type: "button", class: "btn", "aria-label": aria || null, onclick: fn }, label),
      num(label, id, disabled) {
        const inp = h("input", { id, type: "text", inputmode: "numeric", autocomplete: "off", spellcheck: "false", disabled: disabled ? true : null, "aria-describedby": "feedback",
          oninput: e => { cur.inputs[id] = e.target.value; } });
        inp.value = cur.inputs[id] ?? "";
        return h("div", { class: "field" }, h("label", { for: id }, label), inp, h("button", { type: "button", class: "btn", "aria-label": "Cambiar el signo", onclick: () => { const v = inp.value.trim(); inp.value = v.startsWith("-") || v.startsWith("−") ? v.slice(1) : "−" + v.replace(/^\+/, ""); cur.inputs[id] = inp.value; inp.focus(); } }, "±"));
      },
      val: id => cur.inputs[id] ?? $(id)?.value ?? "",
      say: (msg, kind) => app.say(msg, kind),
      refresh: () => app.refreshControls(),
      focus: id => setTimeout(() => $(id)?.focus(), 30),
      registerError: (tag, msg) => { cur.attempts++; cur.tags.push(tag); app.say(msg, "bad"); app.updateHud(); },
    };
  },
  renderTask() {
    const c = this.cur, ex = EX[c.ex], S = this.S;
    $("actName").textContent = S.exId === "tour" ? `${EX.tour.name} · ${ex.name}` : ex.name;
    $("actLevel").textContent = "Intensidad " + S.level;
    $("tourTag").hidden = S.exId !== "tour";
    if (S.exId === "tour") $("tourTag").textContent = `Misión ${S.mission} · parada ${S.stop} de ${EX.tour.stops(S.level)}`;
    $("prompt").innerHTML = "";
    $("prompt").append(h("span", {}, ex.skill + ". "), this.promptText(c));
    this.say("", null);
    $("btnNext").hidden = true; $("btnCheck").hidden = false; $("btnCheck").disabled = false; $("btnHint").disabled = false;
    $("btnNew").textContent = "Nuevo reto";
    this.refreshControls(); this.updateHud();
  },
  promptText(c) {
    const q = c.q;
    const big = t => h("span", { class: "expr" }, t);
    switch (c.ex) {
      case "rocas": return h("span", {}, "Salta, en este orden, a las rocas: ", big(q.values.map(fmt).join("  →  ")));
      case "vertical": return h("span", {}, "Ordena de la cota más baja a la más alta: ", big(q.values.map(fmt).join("   ")));
      case "lago": return q.sub === "opabs" ? h("span", {}, `El farolillo flota a ${fmt(q.n)} m.`, big(`opuesto de ${fmt(q.n)} · |${fmt(q.n)}|`))
        : q.sub === "absk" ? h("span", {}, "Dos farolillos cuelgan de hilos iguales.", big(`|x| = ${q.k}`)) : h("span", {}, "¿Qué farolillo está más alto?", big(`${q.e1}  ☐  ${q.e2}`));
      case "globo": return h("span", {}, "El globo parte de la cota 0.", big(q.terms.map((x, i) => i ? fmtP(x) : fmt(x)).join(" + ")));
      case "avion": return h("span", {}, `Cota actual ${fmt(q.a)} m. Orden de la torre:`, big(`${fmt(q.a)} − ${fmtP(q.b)}`));
      case "sub": return h("span", {}, "Posición = tiempo · velocidad", big(`${fmt(q.a)} · ${fmtP(q.b)}`));
      case "tele": return h("span", {}, "Cambio por minuto = cambio total : tiempo", big(`${fmt(q.a)} : ${fmtP(q.b)}`));
      case "dron": return h("span", {}, "Programa de vuelo:", big(tokensToString(q.tokens)));
    }
    return h("span", {}, q.text);
  },
  refreshControls() { const c = this.cur; if (!c) return; const ctl = $("controls"); ctl.innerHTML = ""; EX[c.ex].ui(c.q, c.st, this.api()); },
  say(msg, kind) {
    const f = $("feedback"); f.innerHTML = ""; f.className = "";
    if (!msg) return;
    f.className = "show " + (kind || "");
    const icon = kind === "ok" ? "✓ Correcto." : kind === "bad" ? "✗ Todavía no." : kind === "hint" ? "◆ Pista." : kind === "part" ? "✓ Bien." : "";
    if (icon) f.append(h("span", { class: "ic" }, icon));
    f.append(document.createTextNode(msg));
  },
  updateHud() {
    const S = this.S, cells = $("cells"); cells.innerHTML = "";
    for (let i = 0; i < CONFIG.RETOS; i++) {
      const r = S.results[i]; let cls = "", txt = "";
      if (r) { cls = r.firstTry ? "ok" : "help"; txt = r.firstTry ? "✓" : "◆"; }
      if (i === S.idx && !(r)) cls = "cur";
      cells.append(h("span", { class: cls, title: `Reto ${i + 1}` }, txt));
    }
    const ok = S.results.filter(r => r.firstTry).length, att = S.results.reduce((s, r) => s + r.attempts, 0) + (this.cur && !this.cur.solved ? this.cur.attempts : 0);
    const hl = S.results.reduce((s, r) => s + r.hints, 0) + (this.cur && !this.cur.solved ? this.cur.hints : 0);
    const pts = S.results.reduce((s, r) => s + (r?.score || 0), 0);
    $("actStats").textContent = `Reto ${Math.min(S.idx + 1, CONFIG.RETOS)}/${CONFIG.RETOS} · ${pts} puntos · a la primera ${ok} · errores ${att} · ayudas ${hl}`;
    $("cells").setAttribute("aria-label", `Progreso: reto ${S.idx + 1} de ${CONFIG.RETOS}, ${ok} a la primera`);
  },
  doCheck() {
    const c = this.cur; if (!c || c.solved) return;
    const r = EX[c.ex].check(c.q, c.st, this.api());
    if (r.notReady) { this.say(r.msg, "hint"); return; }
    if (r.partial) { this.say(r.msg, "part"); this.refreshControls(); Music.cue("success"); return; }
    if (r.ok) {
      c.solved = true;
      const secs = Math.max(0, this.now - c.t0 - c.animT);
      const res = { ex: c.ex, firstTry: c.attempts === 0 && c.hints === 0 && !c.demo, attempts: c.attempts, hints: c.hints + (c.demo ? 1 : 0), tags: c.tags,
        time: secs, score: scoreChallenge(this.S.level, secs, c.attempts, c.hints, c.demo) };
      this.S.results[this.S.idx] = res;
      this.say(`${r.msg} (+${res.score} puntos en ${fmtTime(secs)})`, "ok"); Music.cue("success");
      if (c.ex !== "rocas" && c.ex !== "dron") setTimeout(() => confetti([0, 3, 0], 50), 900 * this.motionScale);
      $("btnNext").hidden = false; $("btnNext").textContent = this.S.idx + 1 >= CONFIG.RETOS ? "Ver resultados" : "Siguiente reto";
      $("btnCheck").hidden = true; $("btnHint").disabled = true;
      $("btnNext").focus();
      this.refreshControls(); this.updateHud();
      return;
    }
    c.attempts++; if (r.tag) c.tags.push(r.tag);
    this.say(r.msg, "bad"); Music.cue("fail"); this.refreshControls(); this.updateHud();
  },
  doHint() {
    const c = this.cur; if (!c || c.solved) return;
    const ex = EX[c.ex];
    if (c.hints < 2) { c.hints++; this.say(ex.hint(c.q, c.st, c.hints), "hint"); }
    else if (!c.demo) {
      c.demo = true; ex.demo(c.q, c.st); Music.cue("hint");
      this.say("Mira la demostración. Después puedes reintentar con valores equivalentes: pulsa «Nuevo reto».", "hint");
      $("btnNew").textContent = "Reintentar con valores equivalentes";
      this.refreshControls();
    } else this.say("Ya has visto la demostración. Pulsa «Reintentar con valores equivalentes» para practicar con otros números.", "hint");
    if (c.hints === 2 && !c.demo) $("btnHint").textContent = "Ver demostración"; else $("btnHint").textContent = "Pista";
    this.updateHud();
  },
  doReplay() {
    const st = this.cur?.st; if (!st) return;
    if (st.anim) { st.anim.t0 = this.now; st.party = 0; for (const k of Object.keys(st)) if (k.startsWith("splash")) delete st[k]; Music.cue("whoosh", 1); this.say("Repitiendo la animación.", "hint"); }
    else this.say("Todavía no hay ninguna animación: responde o pide una pista.", "hint");
  },
  doNew() {
    const c = this.cur; if (!c) return;
    const helped = c.demo || c.hints > 0;
    const prev = { hints: c.hints, demo: c.demo, attempts: c.attempts, tags: c.tags };
    this.cur = this.makeChallenge(c.ex);
    if (helped) Object.assign(this.cur, { hints: prev.hints, demo: prev.demo, attempts: prev.attempts, tags: prev.tags, t0: c.t0, animT: c.animT });
    $("btnHint").textContent = "Pista";
    Fx.clear(); this.renderTask();
    this.say(helped ? "Reto equivalente con otros números. Las ayudas usadas siguen contando en este reto." : "Nuevo reto con otros números.", "hint");
  },
  summary() {
    const S = this.S, R = S.results;
    const first = R.filter(r => r.firstTry).length;
    const total = R.reduce((s, r) => s + r.score, 0), time = R.reduce((s, r) => s + r.time, 0);
    Store.setBest(S.exId, S.level, first);
    const bySkill = {};
    for (const r of R) { const k = r.ex; bySkill[k] = bySkill[k] || { n: 0, first: 0, err: 0, help: 0 }; bySkill[k].n++; bySkill[k].first += r.firstTry ? 1 : 0; bySkill[k].err += r.attempts; bySkill[k].help += r.hints; }
    const tagCount = {}; for (const r of R) for (const t of r.tags) tagCount[t] = (tagCount[t] || 0) + 1;
    const weakest = Object.entries(bySkill).sort((a, b) => a[1].first / a[1].n - b[1].first / b[1].n || b[1].err - a[1].err)[0];
    let reco;
    if (first === CONFIG.RETOS) reco = `Todo a la primera. Prueba ${EX[S.exId].name} en intensidad ${Math.min(10, S.level + 1)}${S.level === 10 ? " (ya estás en la máxima: prueba La gran expedición)" : ""}.`;
    else if (weakest) {
      const [k, v] = weakest, lvl = v.first / v.n < 0.5 ? Math.max(1, S.level - 1) : S.level;
      const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
      reco = `Practica ${EX[k].name} (${EX[k].skill.toLowerCase()}) en intensidad ${lvl}.${topTag ? ` Fíjate especialmente en: ${TAGS[topTag[0]].toLowerCase()}.` : ""}`;
    }
    const card = $("sumCard"); card.innerHTML = "";
    card.append(
      h("h2", { id: "sumTitle" }, first >= 6 ? "¡Expedición superada!" : "Expedición completada"),
      h("p", { style: "margin:0;color:var(--muted)" }, `${EX[S.exId].name} · intensidad ${S.level} · semilla ${S.seed}`),
      h("div", { class: "score" },
        h("div", {}, h("b", { style: "color:var(--amber)" }, String(total)), h("span", {}, `puntos (máx. ${maxScore(S.level)})`)),
        h("div", {}, h("b", {}, fmtTime(time)), h("span", {}, "tiempo pensando")),
        h("div", {}, h("b", {}, `${first}/${CONFIG.RETOS}`), h("span", {}, "a la primera")),
        h("div", {}, h("b", {}, String(R.reduce((s, r) => s + r.attempts, 0))), h("span", {}, "errores")),
        h("div", {}, h("b", {}, String(R.reduce((s, r) => s + r.hints, 0))), h("span", {}, "ayudas"))),
      h("table", { class: "sk" }, h("thead", {}, h("tr", {}, h("th", {}, "Destreza"), h("th", {}, "Retos"), h("th", {}, "A la primera"), h("th", {}, "Errores"))),
        h("tbody", {}, ...Object.entries(bySkill).map(([k, v]) => h("tr", {}, h("td", {}, `${EX[k].skill} (${EX[k].name})`), h("td", { class: "n" }, String(v.n)), h("td", { class: "n" }, String(v.first)), h("td", { class: "n" }, String(v.err)))))),
      Object.keys(tagCount).length ? h("div", {}, h("h3", { style: "font-size:20px;margin-bottom:6px" }, "Errores observados"),
        h("ul", { style: "margin:0;padding-left:20px;line-height:1.6" }, ...Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => h("li", {}, `${TAGS[t]} (${n})`)))) : h("p", { style: "margin:0" }, "No se ha observado ningún error típico."),
      h("div", { class: "reco" }, h("strong", {}, "Práctica recomendada: "), reco || "Sigue explorando otras aventuras."),
      this.rankingBox(S, { total, time, first }),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary", onclick: () => this.startSession(S.exId, S.level) }, "Repetir"),
        h("button", { type: "button", class: "btn", onclick: () => { this.show("map"); this.selectEx(S.exId, false); $("levels").children[this.level - 1].focus(); } }, "Cambiar intensidad"),
        h("button", { type: "button", class: "btn", onclick: () => { this.show("map"); $("attrList").querySelector('[aria-selected="true"]')?.focus(); } }, "Otra aventura")));
    this.show("sum"); Music.cue(first >= 6 ? "fanfare" : "success");
    card.querySelector("button").focus();
  },

  rankingBox(S, r) {
    const box = h("div", { class: "detail" }), listEl = h("div", { "aria-live": "polite" }, "Cargando ranking…");
    const status = h("p", { style: "margin:0;font-size:14px;color:var(--muted)", role: "status" }, "");
    const inp = h("input", { id: "rkName", type: "text", maxlength: "20", autocomplete: "nickname", placeholder: "Nombre o alias" });
    inp.value = Store.data.prefs.alias || "";
    const send = h("button", { type: "button", class: "btn primary" }, "Guardar en el ranking");
    const load = async id => {
      const t = await Ranking.top(S.exId, S.level); listEl.innerHTML = ""; listEl.append(Ranking.table(t.list, id));
      if (!status.textContent || status.textContent === "Guardando…") status.textContent = t.shared ? "Ranking compartido de la clase." : t.offline ? "No hay conexión con la hoja de Google: se muestra el ranking de este navegador." : "Ranking de este navegador (el docente puede activar el ranking compartido).";
    };
    send.addEventListener("click", async () => {
      const name = Ranking.cleanName(inp.value);
      if (name.length < 2) { status.textContent = "Escribe un nombre o alias de al menos 2 letras (sin datos personales)."; inp.focus(); return; }
      Store.data.prefs.alias = name; Store.save();
      send.disabled = true; status.textContent = "Guardando…";
      const entry = { id: S.seed + "-" + Date.now(), name, ex: S.exId, level: S.level, score: r.total, first: r.first, time: Math.round(r.time), seed: S.seed, date: new Date().toISOString().slice(0, 10) };
      const res = await Ranking.submit(entry);
      status.textContent = res.ok ? (res.shared ? "Guardado en el ranking de la clase." : "Guardado en el ranking de este navegador.") : `Guardado solo en este navegador: ${res.error}.`;
      await load(entry.id);
    });
    box.append(h("h3", {}, `Ranking · ${EX[S.exId].name} · intensidad ${S.level}`),
      h("div", { class: "field" }, h("label", { for: "rkName" }, "Tu alias"), inp, send), status, listEl);
    load(null);
    return box;
  },
  async showRanking() {
    const d = $("dlgRank"), out = $("rankOut");
    $("rankTitle").textContent = `Ranking · ${EX[this.exId].name} · intensidad ${this.level}`;
    out.textContent = "Cargando…"; d.showModal();
    const t = await Ranking.top(this.exId, this.level);
    out.innerHTML = "";
    out.append(Ranking.table(t.list), h("p", { style: "font-size:14px;color:var(--muted)" }, t.shared ? "Ranking compartido de la clase." : t.offline ? "Sin conexión con la hoja de Google: ranking de este navegador." : "Ranking de este navegador."));
  },

  // ───────── bucle
  loop(tms) {
    requestAnimationFrame(t => this.loop(t));
    if (document.hidden || !Engine.ok) { this.last = tms; return; }
    const dt = Math.min(0.05, (tms - this.last) / 1000); this.last = tms; this.now += dt;
    Engine.resize();
    Fx.update(dt);
    let eye, target;
    Labels.begin();
    Engine.ox = 0; Engine.oz = 0;
    if (this.screen === "act" && this.cur && !(this.transition && this.now - this.transition.t0 < 1.6 * this.motionScale)) {
      this.transition = null;
      const ex = EX[this.cur.ex];
      Engine.fogColor = hex(ex.fog);
      [eye, target] = ex.cam(this.cur.q, this.cur.st);
      // Aleja un poco la cámara y desplaza la escena a la izquierda del panel de reto en pantallas anchas.
      const dir = V.sub(eye, target); eye = V.add(target, V.scale(dir, innerWidth / innerHeight < 1 ? 1.45 : 1.15));
      if (innerWidth > 760) { const sh = V.len(dir) * 0.2; eye = [eye[0] + sh, eye[1], eye[2]]; target = [target[0] + sh, target[1], target[2]]; }
      this.camEye = V.lerp(this.camEye, eye, Math.min(1, dt * 3)); this.camTarget = V.lerp(this.camTarget, target, Math.min(1, dt * 3));
      Engine.begin(this.camEye, this.camTarget);
      ex.draw(Engine, this.now, dt, this.cur.q, this.cur.st);
      const an = this.cur.st.anim;
      if (!this.cur.solved && an && this.now - an.t0 < an.dur) this.cur.animT += dt;
    } else {
      Engine.fogColor = hex(0x0c1d24);
      this.updateAvatar(dt);
      const a = this.avatar;
      if (this.transition) { const p = ease(clamp((this.now - this.transition.t0) / (1.6 * this.motionScale), 0, 1)); eye = [Math.sin(p * Math.PI) * 10, 30 - p * 8, 26 - p * 6]; target = [0, 0, 0]; }
      else if (this.screen === "map") { eye = [a.x, 10, a.z + 12]; target = [a.x, 0.5, a.z - 3]; }
      else { eye = [0, 16, 32]; target = [0, 0, 0]; }
      this.camEye = V.lerp(this.camEye, eye, Math.min(1, dt * 2.5)); this.camTarget = V.lerp(this.camTarget, target, Math.min(1, dt * 2.5));
      Engine.begin(this.camEye, this.camTarget);
      this.drawHub(Engine, this.now);
      Music.mood.intensity = 0.25 + a.run * 0.2; Music.mood.height = 0; Music.mood.under = 0; Music.mood.rewind = 0;
    }
    Engine.ox = 0; Engine.oz = 0;
    Fx.draw(Engine);
    Engine.end();
    Labels.end();
  },
  updateAvatar(dt) {
    const a = this.avatar; if (this.screen !== "map") { a.run = 0; return; }
    let ix = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0) + this.stick[0];
    let iz = (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) + this.stick[1];
    if (ix || iz) { a.tx = null; } else if (a.tx !== null) { const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz); if (d > 0.15) { ix = dx / d; iz = dz / d; } else a.tx = null; }
    const l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; }
    const sp = 4.5; a.x += ix * sp * dt; a.z += iz * sp * dt;
    const r = Math.hypot(a.x, a.z); if (r > 21) { a.x *= 21 / r; a.z *= 21 / r; }
    a.run = Math.min(1, Math.hypot(ix, iz));
    if (a.run > 0.05) { const tr = Math.atan2(ix, iz); let d = tr - a.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); a.ry += d * Math.min(1, dt * 10); }
    // ¿Cerca de un diorama?
    let near = null, bd = 4.2;
    for (const id of EX_ORDER) { const [x, z] = HUB.pos[id], d = Math.hypot(a.x - x, a.z - z); if (d < bd) { bd = d; near = id; } }
    if (near !== this.near) { this.near = near; $("nearTag").hidden = !near; if (near) { $("nearName").textContent = EX[near].name; if (near !== this.exId) this.selectEx(near, false); Music.cue("tick", 4); } }
  },
  drawHub(E, t) {
    Env.stars(E, t, 90, 90);
    E.box(0, -0.3, 0, 200, 0.2, 200, hex(0x0f3a4a), { a: 1 });
    Env.water(E, t, 120, 120, -0.15, hex(0x175e75), 0.7);
    E.cyl(0, -0.2, 0, 23, 0.6, hex(0x24423a));
    E.cyl(0, 0.0, 0, 21.5, 0.25, hex(0x2e5a46));
    E.cyl(0, 0.1, 0, 5, 0.1, hex(0x3b4a52));
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = Math.cos(a) * 19, z = Math.sin(a) * 19; E.cyl(x, 1.2, z, 0.06, 2.4, COL.steel); E.sph(x, 2.5, z, 0.18, COL.amber, { emis: 0.9 }); }
    // Rótulo de la base y cero central.
    E.box(0, 0.6, -2, 0.6, 0.6, 0.6, COL.zero, { ry: t * 0.6, rz: Math.PI / 4, emis: 0.5 });
    for (const id of EX_ORDER) {
      const [x, z] = HUB.pos[id], e = EX[id], sel = id === this.exId;
      E.ox = x; E.oz = z;
      E.cyl(0, 0.15, 0, 2.6, 0.15, sel ? hex(0x4a3e22) : hex(0x2b3f44));
      E.ring(0, 0.24, 0, 5.4, sel ? COL.amber : hex(0x557077), { a: sel ? 0.7 : 0.4, emis: sel ? 0.8 : 0.2 });
      if (id === "tour") { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; E.beam([Math.cos(a) * 1.6, 0.3, Math.sin(a) * 1.6], [0, 3.2, 0], 0.05, CONFETTI[k % 6], { emis: 0.5 }); } E.sph(0, 3.4, 0, 0.35, COL.amber, { emis: 1 }); }
      else { E.ox = x; E.oz = z; e.diorama(E, t); }
      E.ox = 0; E.oz = 0;
      E.pick("hub:" + id, [x, 1, z], 2.6);
      const da = Math.hypot(this.avatar.x - x, this.avatar.z - z);
      if (this.screen === "map" && (sel || da < 10)) Labels.put("hub" + id, e.name, [x, 4.6, z], "title");
    }
    const a = this.avatar;
    Models.hero(E, a.x, 0.2, a.z, a.ry, t, a.run);
    if (a.tx !== null) E.ring(a.tx, 0.25, a.tz, 0.7, COL.amber, { a: 0.6, emis: 1 });
  },
};
