/* ============ 存档系统 ============ */
window.SaveSys = (function () {
  const SLOT_KEY = "tolt_slots", META_KEY = "tolt_meta";
  function loadSlots() { try { return JSON.parse(localStorage.getItem(SLOT_KEY)) || {}; } catch (e) { return {}; } }
  function saveSlots(s) { localStorage.setItem(SLOT_KEY, JSON.stringify(s)); }
  function meta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || { endings: {}, cgs: {}, cleared: {}, name: null }; }
    catch (e) { return { endings: {}, cgs: {}, cleared: {}, name: null }; }
  }
  function saveMeta(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

  function snapshot() {
    const G = window.Game;
    return {
      v: 1, ts: Date.now(), playerName: G.playerName,
      route: G.route, index: G.index,
      aff: JSON.parse(JSON.stringify(G.aff)), flags: JSON.parse(JSON.stringify(G.flags)),
      date: G.date, chapter: G.chapter, bg: window.BG_SCENES.current,
      bgm: window.AudioSys.currentName || null,
      part: window.Particles.mode,
      sprites: window.SpriteMgr.getState(),
      hist: window.Dialogue.getHistory().slice(-30),
    };
  }
  function save(slot) {
    const s = loadSlots(); s[slot] = snapshot(); saveSlots(s);
    return s[slot];
  }
  function autosave() { const s = loadSlots(); s["auto"] = snapshot(); saveSlots(s); }
  function load(slot) {
    const s = loadSlots(); const d = s[slot];
    if (!d) return null;
    return d;
  }
  function describe(d) {
    if (!d) return null;
    const dt = new Date(d.ts);
    return { chapter: d.chapter, date: d.date, route: d.route, time: `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` };
  }
  /* 全局进度元数据 */
  function markEnding(id, title, desc, type, route) {
    const m = meta(); m.endings[id] = { title, desc, type, route, ts: Date.now() }; saveMeta(m);
  }
  function markCG(id) { const m = meta(); m.cgs[id] = true; saveMeta(m); }
  function markCleared(route) { const m = meta(); m.cleared[route] = true; saveMeta(m); }
  function setName(n) { const m = meta(); m.name = n; saveMeta(m); }
  return { loadSlots, save, load, autosave, describe, meta, markEnding, markCG, markCleared, setName };
})();
