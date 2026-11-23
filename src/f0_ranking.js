// ═════════════════════════════════════════════ RANKING · puntuación y clasificación compartida
// ┌──────────────────────────────────────────────────────────────────────────────────────────┐
// │ PARAMETRIZAR: pega aquí la URL de tu aplicación web de Google Apps Script (acaba en /exec).│
// │ También se puede pegar desde el «Panel docente» sin tocar el código (se guarda en este    │
// │ navegador). Si se deja vacía, el ranking funciona solo en local.                          │
// └──────────────────────────────────────────────────────────────────────────────────────────┘
const RANKING_URL = "";

// Puntos de un reto resuelto: base según intensidad + bonificación por rapidez − errores − ayudas.
// El tiempo de las animaciones no cuenta; se mide solo el tiempo pensando.
const SCORING = { base: 100, levelBonus: 0.15, speedMax: 100, speedZeroAt: 60, errorCost: 25, hintCost: 30, demoFactor: 0.5, min: 10 };
function scoreChallenge(level, seconds, errors, hints, demo) {
  const mult = 1 + (level - 1) * SCORING.levelBonus;
  const speed = SCORING.speedMax * Math.max(0, 1 - seconds / SCORING.speedZeroAt);
  let pts = (SCORING.base + speed) * mult - SCORING.errorCost * errors - SCORING.hintCost * hints;
  if (demo) pts *= SCORING.demoFactor;
  return Math.max(SCORING.min, Math.round(pts));
}
const maxScore = level => Math.round((SCORING.base + SCORING.speedMax) * (1 + (level - 1) * SCORING.levelBonus)) * CONFIG.RETOS;

const Ranking = {
  url() { return (Store.data.prefs.rankingUrl || RANKING_URL || "").trim(); },
  shared() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(this.url()); },
  cleanName(s) { return String(s || "").replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20); },
  localKey: (ex, L) => `${ex}|${L}`,
  localList(ex, L) { return (Store.data.ranking?.[this.localKey(ex, L)] || []).slice(0, 10); },
  saveLocal(entry) {
    Store.data.ranking = Store.data.ranking || {};
    const k = this.localKey(entry.ex, entry.level), list = (Store.data.ranking[k] || []).concat([entry]);
    list.sort((a, b) => b.score - a.score || a.time - b.time);
    Store.data.ranking[k] = list.slice(0, 20); Store.save();
  },
  async submit(entry) {
    this.saveLocal(entry);
    if (!this.shared()) return { ok: true, shared: false };
    try {
      // text/plain evita la petición previa CORS; Apps Script lee el cuerpo igualmente.
      const r = await fetch(this.url(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "add", ...entry }) });
      const j = await r.json();
      return j.ok ? { ok: true, shared: true } : { ok: false, shared: true, error: j.error || "respuesta no válida" };
    } catch (err) { return { ok: false, shared: true, error: "sin conexión con la hoja de Google" }; }
  },
  async top(ex, L) {
    if (!this.shared()) return { shared: false, list: this.localList(ex, L) };
    try {
      const r = await fetch(`${this.url()}?action=top&ex=${encodeURIComponent(ex)}&level=${L}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      return { shared: true, list: j.list };
    } catch (err) { return { shared: false, offline: true, list: this.localList(ex, L) }; }
  },
  // Tabla accesible de clasificación.
  table(list, highlight) {
    if (!list.length) return h("p", { style: "margin:0;color:var(--muted)" }, "Todavía no hay puntuaciones en esta aventura e intensidad.");
    return h("table", { class: "sk" },
      h("thead", {}, h("tr", {}, h("th", {}, "#"), h("th", {}, "Nombre"), h("th", {}, "Puntos"), h("th", {}, "A la primera"), h("th", {}, "Tiempo"))),
      h("tbody", {}, ...list.slice(0, 10).map((e, i) => h("tr", { style: highlight && e.id === highlight ? "background:rgba(255,181,61,.15)" : null },
        h("td", { class: "n" }, String(i + 1)), h("td", {}, e.name), h("td", { class: "n" }, String(e.score)), h("td", { class: "n" }, `${e.first}/${CONFIG.RETOS}`), h("td", { class: "n" }, fmtTime(e.time))))));
  },
};
const fmtTime = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
