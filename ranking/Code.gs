/**
 * Parque Cota Cero · Ranking compartido en Google Sheets.
 * Pega este archivo en Extensiones → Apps Script de una hoja de cálculo y publícalo como aplicación web
 * (Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario). Ver INSTRUCCIONES_RANKING.md.
 *
 * La hoja guarda una fila por partida. Para reiniciar el ranking, borra las filas (no la cabecera).
 */
const SHEET = "Ranking";
const HEADERS = ["fecha", "nombre", "aventura", "intensidad", "puntos", "a la primera", "tiempo (s)", "semilla", "id"];
const EXERCISES = ["rocas", "vertical", "lago", "globo", "avion", "sub", "tele", "dron", "tour"];
const RETOS = 8;
// Debe coincidir con SCORING del juego: puntuación máxima posible por intensidad.
const maxScore = level => Math.round((100 + 100) * (1 + (level - 1) * 0.15)) * RETOS;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function cleanName_(s) {
  return String(s || "").replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "top") {
    const ex = String(p.ex || ""), level = parseInt(p.level, 10);
    if (EXERCISES.indexOf(ex) < 0 || !(level >= 1 && level <= 10)) return json_({ ok: false, error: "parámetros no válidos" });
    const rows = sheet_().getDataRange().getValues().slice(1);
    const list = rows
      .filter(r => r[2] === ex && Number(r[3]) === level)
      .map(r => ({ name: r[1], score: Number(r[4]), first: Number(r[5]), time: Number(r[6]), id: String(r[8]) }))
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 10);
    return json_({ ok: true, list: list });
  }
  return json_({ ok: true, service: "Parque Cota Cero · ranking" });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "datos no válidos" }); }
  if (d.action !== "add") return json_({ ok: false, error: "acción desconocida" });
  const name = cleanName_(d.name), ex = String(d.ex || ""), level = parseInt(d.level, 10);
  const score = parseInt(d.score, 10), first = parseInt(d.first, 10), time = parseInt(d.time, 10);
  if (name.length < 2) return json_({ ok: false, error: "nombre no válido" });
  if (EXERCISES.indexOf(ex) < 0 || !(level >= 1 && level <= 10)) return json_({ ok: false, error: "aventura o intensidad no válidas" });
  if (!(score >= 0 && score <= maxScore(level))) return json_({ ok: false, error: "puntuación imposible" });
  if (!(first >= 0 && first <= RETOS) || !(time >= 0 && time <= 36000)) return json_({ ok: false, error: "datos imposibles" });
  // Frena envíos repetidos del mismo alias (10 s).
  const cache = CacheService.getScriptCache(), key = "rk_" + name.toLowerCase();
  if (cache.get(key)) return json_({ ok: false, error: "espera unos segundos antes de volver a enviar" });
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    sheet_().appendRow([new Date(), name, ex, level, score, first, time, String(d.seed || "").slice(0, 12), String(d.id || "").slice(0, 40)]);
  } finally { lock.releaseLock(); }
  cache.put(key, "1", 10);
  return json_({ ok: true });
}
