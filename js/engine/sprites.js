/* ============ 立绘管理 ============ */
window.SpriteMgr = (function () {
  const layer = document.getElementById("sprite-layer");
  const shown = {};   // id -> element
  const loaded = {};

  /* 表情/动作符号气泡 */
  const GLYPHS = {
    laugh:    { ch: "♫", color: "#ffd9a8" },
    happy:    { ch: "❤", color: "#ff8aa0" },
    shy:      { ch: "♡", color: "#ff9ab0" },
    angry:    { ch: "❛❛", color: "#ff7a6a" },
    surprise: { ch: "!", color: "#ffe27a" },
    sweat:    { ch: "〰", color: "#9ad4ff" },
    sad:      { ch: "…", color: "#aebad4" },
    note:     { ch: "♩", color: "#cfd8f4" },
    sparkle:  { ch: "✦", color: "#ffe8a8" },
  };

  function img(id) {
    if (!loaded[id]) {
      const c = window.CHARS[id];
      loaded[id] = new Promise(res => {
        if (!c || !c.sprite) return res(null);
        const im = new Image();
        im.onload = () => res(im); im.onerror = () => res(null);
        im.src = c.sprite;
      });
    }
    return loaded[id];
  }

  async function show(id, pos) {
    const c = window.CHARS[id];
    if (!c || !c.sprite) return;
    const im = await img(id);
    if (!im) return;
    let el = shown[id];
    if (!el) {
      el = document.createElement("div");
      el.className = "sp";
      el.dataset.id = id;
      el.appendChild(im.cloneNode());
      layer.appendChild(el);
      shown[id] = el;
    }
    el.classList.remove("enter-l", "enter-r", "enter-c");
    void el.offsetWidth;
    el.style.left = { left: "23%", center: "50%", right: "77%" }[pos || "center"];
    el.style.transform = "translateX(-50%)";
    el.classList.add(pos === "left" ? "enter-l" : pos === "right" ? "enter-r" : "enter-c");
    el.style.setProperty("--sp-glow", hexToGlow(c.color));
    el.style.setProperty("--sway-d", (c.sway || 6.5) + "s");
    el.style.setProperty("--breath-d", (c.breath || 5.2) + "s");
    el.style.opacity = 1;
  }
  function hide(id) {
    const el = shown[id];
    if (!el) return;
    el.style.opacity = 0;
    setTimeout(() => { if (el.style.opacity === "0") { el.remove(); delete shown[id]; } }, 520);
  }
  function clear() { Object.keys(shown).forEach(hide); }
  function focus(speakerId) {
    for (const [id, el] of Object.entries(shown)) {
      el.classList.toggle("dim", !!speakerId && id !== speakerId);
    }
  }

  /* 符号气泡：笑/怒/羞等情绪可视化 */
  function glyph(id, type) {
    const el = shown[id];
    const g = GLYPHS[type];
    if (!el || !g) return;
    if (el.querySelectorAll(".sp-glyph").length >= 3) return;
    const s = document.createElement("span");
    s.className = "sp-glyph g-" + type;
    s.textContent = g.ch;
    s.style.color = g.color;
    s.style.right = (8 + Math.random() * 16) + "%";
    s.style.top = (2 + Math.random() * 9) + "%";
    s.style.fontSize = (22 + Math.random() * 14) + "px";
    el.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }

  function fx(id, name) {
    const el = shown[id];
    if (!el) return;
    el.classList.remove("enter-l", "enter-r", "enter-c");
    if (GLYPHS[name]) { glyph(id, name); return; }
    if (name === "jump") {
      el.style.transition = "none"; el.style.marginBottom = "6%";
      setTimeout(() => { el.style.transition = "margin-bottom .5s cubic-bezier(.2,8,.4,1)"; el.style.marginBottom = "0%"; }, 30);
    } else if (name === "shake") {
      el.animate([
        { transform: "translateX(-50%)" },
        { transform: "translateX(calc(-50% - 12px))" },
        { transform: "translateX(calc(-50% + 10px))" },
        { transform: "translateX(calc(-50% - 6px))" },
        { transform: "translateX(-50%)" },
      ], { duration: 420 });
    } else if (name === "nod") {
      el.animate([
        { transform: "translateX(-50%) rotate(0deg)" },
        { transform: "translateX(-50%) rotate(1.6deg)" },
        { transform: "translateX(-50%) rotate(0deg)" },
      ], { duration: 600 });
    }
  }
  function getState() { return Object.keys(shown).map(id => ({ id, left: shown[id].style.left })); }
  async function restore(arr) {
    layer.innerHTML = ""; Object.keys(shown).forEach(k => delete shown[k]);
    for (const s of arr || []) await show(s.id, leftToPos(s.left));
  }
  function leftToPos(left) {
    if (left === "23%") return "left";
    if (left === "77%") return "right";
    return "center";
  }
  function hexToGlow(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},.4)`;
  }
  return { show, hide, clear, focus, fx, glyph, getState, restore };
})();
