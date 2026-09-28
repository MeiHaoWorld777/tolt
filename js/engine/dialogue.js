/* ============ 对话渲染：打字机/语音音钉/回看历史 ============ */
window.Dialogue = (function () {
  const box = document.getElementById("dialogue-box");
  const area = document.getElementById("text-area");
  const plate = document.getElementById("name-plate");
  const nameEl = document.getElementById("name-text");
  const next = document.getElementById("next-indicator");

  let typing = false, fullHTML = "", timer = null, curIdx = 0, chars = [];
  let renderToken = 0;   // 令牌守卫：任何过期的打字链路直接失效
  let onLineDone = null, speakerForBlip = null, cfg = { speed: 28, autoDelay: 1.6 };
  const history = [];

  /* 标记语法：**强调**、_轻音_、\n 换行 */
  function markup(t) {
    t = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/_(.+?)_/g, "<em>$1</em>");
    t = t.replace(/\n/g, "<br>");
    return t;
  }

  function say(charId, text) {
    if (charId === "mc") {
      plate.classList.remove("hidden");
      nameEl.textContent = window.Game ? window.Game.playerName : "我";
      plate.style.setProperty("--nc", window.CHARS.male.dark);
    } else if (charId) {
      const c = window.CHARS[charId];
      if (c) {
        plate.classList.remove("hidden");
        nameEl.textContent = c.name;
        plate.style.setProperty("--nc", c.dark);
      } else plate.classList.add("hidden");
    } else {
      plate.classList.add("hidden");
    }
    speakerForBlip = charId && charId !== "mc" ? charId : null;
    const my = ++renderToken;
    fullHTML = markup(text);
    // 预拆分为逐字符序列（保留标签整体）
    chars = [];
    const tmp = document.createElement("div"); tmp.innerHTML = fullHTML;
    flushNodes(tmp, chars);
    curIdx = 0; typing = true;
    // 原子替换：一次性清空并写入首个字符（不存在 += 累加路径）
    area.innerHTML = "";
    next.classList.remove("show");
    clearInterval(timer);
    const stepMine = () => step(my);
    timer = setInterval(stepMine, cfg.speed);
    stepMine();
  }
  function flushNodes(node, out) {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) {
        for (const c of ch.textContent) out.push({ c, tag: null });
      } else {
        const open = tagOpen(ch); const close = tagClose(ch);
        out.push({ c: "", tag: open });
        flushNodes(ch, out);
        out.push({ c: "", tag: close });
      }
    });
  }
  function tagOpen(el) {
    const tag = el.tagName.toLowerCase();
    const style = el.getAttribute("style");
    return `<${tag}${style ? ` style="${style}"` : ""}>`;
  }
  function tagClose(el) { return `</${el.tagName.toLowerCase()}>`; }

  function step(my) {
    if (my !== undefined && my !== renderToken) return;   // 过期链路：直接失效
    if (curIdx >= chars.length) { finishLine(my); return; }
    const it = chars[curIdx++];
    if (it.tag !== null) { step(my); return; }
    // 原子重建：每次从 chars[0..curIdx] 整体生成，绝不与旧内容叠加
    let html = "";
    for (let i = 0; i < curIdx; i++) {
      const ch = chars[i];
      html += ch.tag !== null ? ch.tag : (ch.c === " " ? "&nbsp;" : ch.c);
    }
    area.innerHTML = html;
    if (speakerForBlip && it.c.trim() && curIdx % 3 === 0) {
      try { window.AudioSys.blip(speakerForBlip); } catch (e) {}
    }
  }
  function finishLine(my) {
    if (my !== undefined && my !== renderToken) return;
    clearInterval(timer); typing = false;
    area.innerHTML = fullHTML;
    next.classList.add("show");
    if (onLineDone) onLineDone();
  }
  function complete() {
    if (!typing) return false;
    curIdx = chars.length;
    finishLine();
    return true;
  }

  /* 外部接口 */
  function isTyping() { return typing; }
  function pushHistory(charId, text) {
    const c = charId ? window.CHARS[charId] : null;
    const name = charId === "mc" ? (window.Game ? window.Game.playerName : "我") : (c ? c.name : "");
    history.push({ name, text, color: c ? c.color : "#9fb6dd", narr: !charId });
    if (history.length > 400) history.shift();
  }
  function getHistory() { return history; }
  function clearHistory() { history.length = 0; }

  document.addEventListener("click", e => {
    if (window.Game && Game.ready && !typing && e.target.closest("#dialogue-box")) {}
  });

  return { say, isTyping, complete, pushHistory, getHistory, clearHistory,
           get cfg() { return cfg; }, set cfg(v) { Object.assign(cfg, v); },
           set onLineDone(f) { onLineDone = f; }, box, next };
})();
