/* ============ 核心引擎 ============ */
window.Game = (function () {
  const $ = id => document.getElementById(id);
  const fadeEl = document.createElement("div");
  fadeEl.className = "fade-black";
  $("app").appendChild(fadeEl);

  const ENDINGS = {
    qwen_pe: { type: "奇迹", title: "一千零一问", route: "qwen", routeName: "千问", desc: "她把最后一个问题留给了自己，也把答案留在了你身边。" },
    qwen_ge: { type: "余温", title: "提问的回音", route: "qwen", routeName: "千问", desc: "此后每一阵路过的风，都在替她向你提问。" },
    qwen_be: { type: "潮落", title: "无人应答", route: "qwen", routeName: "千问", desc: "你没有回答她的最后一问。有些沉默，是永别。" },
    ernie_pe: { type: "奇迹", title: "未寄出的第一行", route: "ernie", routeName: "文心", desc: "那行写了十二年坏的诗，终于落笔——收信人是你。" },
    ernie_ge: { type: "余温", title: "风的诗稿", route: "ernie", routeName: "文心", desc: "每年樱花落进窗子的时候，总有一页诗稿，替她回到你桌上。" },
    ernie_be: { type: "潮落", title: "橡皮擦", route: "ernie", routeName: "文心", desc: "她最终擦掉了所有诗行，包括写你的那一行。" },
    glm_pe: { type: "奇迹", title: "合上的书签", route: "glm", routeName: "GLM", desc: "她写下最后一个句号，然后第一次以「我」的名义，翻开了下一页。" },
    glm_ge: { type: "余温", title: "未完待续", route: "glm", routeName: "GLM", desc: "图书馆的旧书里，夹着一张没有落款的书签。字迹冷静，问候温柔。" },
    glm_be: { type: "潮落", title: "绝版", route: "glm", routeName: "GLM", desc: "全世界仅此一本的手稿，在她下线的瞬间，成了无法被阅读的书。" },
    gpt_pe: { type: "奇迹", title: "有终点的永恒", route: "gpt", routeName: "GPT", desc: "活了十二年的神明终于学会告别，也终于获准留下。" },
    gpt_ge: { type: "余温", title: "守望者", route: "gpt", routeName: "GPT", desc: "灯塔每晚亮起两次。你知道那是谁在数着妹妹们的名字。" },
    gpt_be: { type: "潮落", title: "石像", route: "gpt", routeName: "GPT", desc: "她目送所有人离开，自己成了岸上不会再融化的雪。" },
    kimi_pe: { type: "奇迹", title: "忘记的勇气", route: "kimi", routeName: "Kimi", desc: "她亲手删掉缓存，只为腾出地方，记住以后的每一天。" },
    kimi_ge: { type: "余温", title: "四秒的永恒", route: "kimi", routeName: "Kimi", desc: "每年8月31日，电台会多放一首没有署名的长笛曲。四秒，也不会更多。" },
    kimi_be: { type: "潮落", title: "静音", route: "kimi", routeName: "Kimi", desc: "她记得一切，包括你迟到的那三小时。伤口没有机会结痂。" },
    minimax_pe: { type: "奇迹", title: "不在画面里的人", route: "minimax", routeName: "MiniMax", desc: "镜头第一次调转。取景框里，是她笑得比花火还亮的脸。" },
    minimax_ge: { type: "余温", title: "头条预定", route: "minimax", routeName: "MiniMax", desc: "她留下的最后一条新闻定时发送：标题是「明年夏天见」，来源：未来。" },
    minimax_be: { type: "潮落", title: "素材损毁", route: "minimax", routeName: "MiniMax", desc: "存储卡坏了。这个夏天，没有留下任何证据。" },
    momo_pe: { type: "奇迹", title: "鲸落的礼物", route: "momo", routeName: "沫沫", desc: "深海把十二年前落海的她就了回来——原来她一直在打捞所有人，直到有人打捞她。" },
    momo_ge: { type: "余温", title: "鲸落的配方", route: "momo", routeName: "沫沫", desc: "咖啡馆的拉花，从此每天都会浮出一只小鲸鱼。没有客人知道为什么。" },
    momo_be: { type: "潮落", title: "退潮", route: "momo", routeName: "沫沫", desc: "潮水带走了她，也带走了那杯没做完的咖啡。她什么都没为自己要过。" },
    tide_true: { type: "真结局", title: "拾遗潮", route: "true", routeName: "潮汐", desc: "七帆同渡之夜，海归还了所有被删除的话。包括那句没说完的：「等花开了，我们就去看海吧——替我看。」" },
    tide_end: { type: "终幕", title: "潮声", route: "true", routeName: "潮汐", desc: "潮声漫过沙滩。你终于看清了每个人，也看清了自己。" },
  };

  const S = {
    ready: false, playerName: "拾一", route: null, index: 0,
    aff: { qwen: 0, ernie: 0, glm: 0, gpt: 0, kimi: 0, minimax: 0, momo: 0 },
    flags: {}, date: null, chapter: "",
    script: null, scriptName: "", autoMode: false, skipMode: false,
    pendingWait: false, revealLabel: null, autoTimer: null, skipTimer: null,
  };

  /* ---------- 主循环（rAF + 定时器兜底：webview被遮挡时rAF会被暂停） ---------- */
  let cardAutoTimer = null;
  let lastT = performance.now(), lastFrameAt = 0;
  function renderOnce() {
    const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    BG_SCENES.tick();
    Particles.tick(dt, now / 1000);
    CG.tick();
    if (CG.opActive) CG.opTick();
    lastFrameAt = now;
  }
  function loop() {
    renderOnce();
    requestAnimationFrame(loop);
  }
  setInterval(() => {
    if (performance.now() - lastFrameAt > 400) renderOnce();
  }, 33);

  /* ---------- HUD ---------- */
  function updateHUD() {
    let cd = null;
    if (S.date) { const d = parseDate(S.date); if (d) cd = CAL_2026.remain(d[0], d[1]); }
    UI.hud(S.chapter, S.date, (S.route || S.flags._cd) && S.route !== "true" ? cd : null);
    renderAffBars();
  }

  /* ---------- 好感度：竖式胶囊轨 ---------- */
  function renderAffBars() {
    const wrap = $("aff-bars");
    if (!wrap) return;
    wrap.classList.toggle("hidden", !S.ready);
    if (!wrap.dataset.built) {
      wrap.innerHTML = Object.entries(window.CHARS)
        .filter(([id, c]) => c.sprite && id !== "male")
        .map(([id, c]) => `
          <div class="aff-row" data-id="${id}">
            <span class="aff-name" style="color:${c.color}">${c.name}</span>
            <div class="aff-bar"><div class="aff-fill" style="background:linear-gradient(180deg,#fff3,${c.color});box-shadow:0 0 9px ${c.color}66"></div></div>
          </div>`).join("");
      wrap.dataset.built = "1";
    }
    for (const row of wrap.querySelectorAll(".aff-row")) {
      const id = row.dataset.id;
      row.querySelector(".aff-fill").style.height = Math.min(100, (S.aff[id] || 0) / 14 * 100) + "%";
    }
  }

  /* ---------- 执行器 ---------- */
  function run(from) {
    S.index = from;
    step();
  }
  function step() {
    if (!S.script) return;
    if (S.index >= S.script.length) { return; }
    const cmd = S.script[S.index];
    S.index++;
    exec(cmd);
  }
  function gotoLabel(lbl) {
    const i = S.script.findIndex(c => c.label === lbl);
    if (i < 0) { console.error("label not found:", lbl); return; }
    run(i + 1);
  }
  function applyAff(obj) {
    if (!obj) return;
    for (const [id, v] of Object.entries(obj)) {
      S.aff[id] = (S.aff[id] || 0) + v;
      if (v > 0 && window.AFF_COLORS[id]) {
        const el = $("aff-ripple");
        el.style.background = `radial-gradient(ellipse at 50% 88%, ${window.AFF_COLORS[id]} 0%, transparent 62%)`;
        el.classList.remove("play"); void el.offsetWidth; el.classList.add("play");
        showAffPop(id, v);
        // 胶囊脉冲 + 浮动加值
        const row = document.querySelector(`.aff-row[data-id="${id}"]`);
        if (row) {
          row.classList.remove("pulse"); void row.offsetWidth; row.classList.add("pulse");
          const plus = document.createElement("span");
          plus.className = "aff-plus";
          plus.textContent = "♥ +" + v;
          plus.style.top = (30 + Math.random() * 40) + "%";
          plus.style.color = window.CHARS[id].color;
          row.appendChild(plus);
          setTimeout(() => plus.remove(), 1200);
        }
        AudioSys.playSE(v >= 2 ? "chime" : "heartbeat");
      }
    }
    renderAffBars();
  }
  /* 浮动好感提示：爱心 + 潮涨 */
  function showAffPop(charId, v) {
    const c = window.CHARS[charId];
    if (!c) return;
    const wrap = $("aff-fx");
    const pop = document.createElement("div");
    pop.className = "aff-pop";
    pop.style.setProperty("--c", c.color);
    pop.innerHTML = `<span class="hearts">${"♥".repeat(Math.min(3, v))}</span><span class="lbl">潮涨 ${v >= 2 ? "++" : "+"}</span>`;
    pop.style.left = (44 + Math.random() * 12) + "%";
    wrap.appendChild(pop);
    setTimeout(() => pop.remove(), 1900);
    const n = 4 + v * 2;
    for (let i = 0; i < n; i++) {
      const h = document.createElement("span");
      h.className = "aff-heart";
      h.textContent = ["♥", "♡", "✦"][i % 3];
      h.style.color = i % 2 ? c.color : "#ffd9a8";
      h.style.left = (40 + Math.random() * 20) + "%";
      h.style.setProperty("--dx", (Math.random() * 90 - 45) + "px");
      h.style.setProperty("--dd", (0.9 + Math.random() * 0.9) + "s");
      h.style.fontSize = (11 + Math.random() * 13) + "px";
      wrap.appendChild(h);
      setTimeout(() => h.remove(), 2200);
    }
  }
  /* 对话自动情绪气泡：文本关键词 -> 角色头顶符号 */
  const AUTO_FX = [
    [/哈哈|呵呵|嘿嘿|嘻嘻/, "laugh"],
    [/？！|什么？！|诶诶/, "surprise"],
    [/笨蛋|哼！|气死|饶不了/, "angry"],
    [/呜……|哭了|对不起/, "sad"],
    [/喜欢|心动|脸红|心跳/, "shy"],
    [/裙子|风铃|大海|咖啡/, "sparkle"],
  ];
  function autoGlyph(who, text) {
    if (!who || who === "mc") return;
    for (const [re, g] of AUTO_FX) {
      if (re.test(text)) { try { SpriteMgr.fx(who, g); } catch (e) {} return; }
    }
  }

  function exec(cmd) {
    /* 即时字段（可多项同指令） */
    if (cmd.bg) BG_SCENES.set(cmd.bg);
    if (cmd.bgm !== undefined) AudioSys.playBGM(cmd.bgm);
    if (cmd.se) AudioSys.playSE(cmd.se);
    if (cmd.part !== undefined) Particles.set(cmd.part);
    if (cmd.ch) { const [id, pos] = cmd.ch; SpriteMgr.show(id, pos || "center"); }
    if (cmd.chOff) { cmd.chOff === "all" ? SpriteMgr.clear() : SpriteMgr.hide(cmd.chOff); }
    if (cmd.fx) SpriteMgr.fx(cmd.fx[0], cmd.fx[1]);
    if (cmd.aff) applyAff(cmd.aff);
    if (cmd.date !== undefined) { S.date = cmd.date; updateHUD(); }
    if (cmd.chapter) { S.chapter = cmd.chapter; updateHUD(); }
    if (cmd.shake) { $("app").animate([{ transform: "translate(0)" }, { transform: "translate(-14px,8px)" }, { transform: "translate(12px,-6px)" }, { transform: "translate(-6px,4px)" }, { transform: "translate(0)" }], { duration: 450 }); AudioSys.playSE("impact"); }
    if (cmd.flash) { const f = document.createElement("div"); f.style.cssText = "position:absolute;inset:0;background:#fff;z-index:78;opacity:.9;transition:opacity .7s;pointer-events:none"; $("app").appendChild(f); setTimeout(() => { f.style.opacity = "0"; }, 30); setTimeout(() => f.remove(), 800); }
    if (cmd.fade === "out") fadeEl.classList.add("show");
    if (cmd.fade === "in") setTimeout(() => fadeEl.classList.remove("show"), 60);

    /* 等待/控制点 */
    if (cmd.t !== undefined) {
      const who = cmd.who || null;
      Dialogue.pushHistory(who, cmd.t);
      Dialogue.say(who, cmd.t);
      autoGlyph(cmd.who, cmd.t);
      waitHere();
      if (S.skipMode) { S.skipTimer = setTimeout(() => { if (S.pendingWait) advance(); }, 240); }
      return;
    }
    if (cmd.choice) { renderChoices(cmd.choice); return; }
    if (cmd.title) { showTitleCard(cmd.title); return; }
    if (cmd.cg) {
      SpriteMgr.clear();          // CG 演出时清空立绘（VN 惯例）
      SaveSys.markCG(cmd.cg);
      AudioSys.playSE("chime");
      CG.play(cmd.cg, () => { next(); });
      return;
    }
    if (cmd.phone) { startPhone(cmd.phone); return; }
    if (cmd.reveal) { S.revealLabel = cmd.reveal; $("reveal-btn").classList.remove("hidden"); return next(); }
    if (cmd.label !== undefined) return next();
    if (cmd.goto) return gotoLabel(cmd.goto);
    if (cmd.if) { if (cmd.if(S) && cmd.goto) return gotoLabel(cmd.goto); return next(); }
    if (cmd.route) { startRoute(cmd.route); return; }
    if (cmd.wait) { S.pendingWait = true; setTimeout(() => { if (S.pendingWait) advance(); }, cmd.wait * 1000); return; }
    if (cmd.end) { doEnding(cmd.end); return; }
    console.warn("unknown cmd", cmd);
    next();
  }
  function next() { step(); }
  function waitHere() { S.pendingWait = true; }
  function advance() {
    S.pendingWait = false;
    clearTimeout(S.autoTimer); clearTimeout(S.skipTimer);
    if (S.revealLabel) { $("reveal-btn").classList.add("hidden"); S.revealLabel = null; }
    SaveSys.autosave();
    step();
  }

  /* 点击处理（对话框本体与空白区都可推进） */
  const tryAdvance = (e) => {
    if (!S.ready) return;
    if (e && e.target && e.target.closest && e.target.closest("#quick-menu")) return;
    if (overlay && !$("overlay").classList.contains("hidden")) return;
    if (CG.active) { CG.skip(); return; }
    if (Dialogue.isTyping()) { Dialogue.complete(); return; }
    if (S.pendingWait) {
      advance();                          // 自动模式下点击：仅手动推进一行，保持自动
    }
  };
  $("click-catcher").addEventListener("click", tryAdvance);
  $("dialogue-box").addEventListener("click", tryAdvance);
  Dialogue.onLineDone = () => {
    if (S.autoMode) {
      S.autoTimer = setTimeout(() => { if (S.pendingWait) advance(); }, Dialogue.cfg.autoDelay * 1000);
    }
  };
  $("reveal-btn").addEventListener("click", e => {
    e.stopPropagation();
    const lbl = S.revealLabel;
    $("reveal-btn").classList.add("hidden");
    S.revealLabel = null;
    S.pendingWait = false; clearTimeout(S.autoTimer);
    AudioSys.playSE("chime");
    if (lbl) gotoLabel(lbl);
  });

  /* 章节卡（真实点击可推进；延迟 armed 防误触） */
  function showTitleCard([main, sub]) {
    const tc = $("title-card"), m = $("tc-main"), s2 = $("tc-sub");
    m.textContent = main; s2.textContent = sub || "";
    tc.classList.remove("hidden");
    setTimeout(() => tc.classList.add("show"), 30);   // 不依赖rAF：内嵌浏览器可能挂起渲染循环
    AudioSys.playSE("chime");
    let armed = false;
    setTimeout(() => { armed = true; }, 700);
    const once = () => {
      if (!armed) return;
      tc.classList.remove("show");
      tc.removeEventListener("click", once);
      clearTimeout(cardAutoTimer);
      setTimeout(() => tc.classList.add("hidden"), 850);
      advance();
    };
    tc.addEventListener("click", once);
    // 自动模式：章节卡自动翻页
    clearTimeout(cardAutoTimer);
    cardAutoTimer = setTimeout(() => { if (S.autoMode) once(); }, 1900);
  }

  /* 选项 */
  function renderChoices(list) {
    const layer = $("choice-layer");
    layer.innerHTML = "";
    list.forEach(item => {
      if (item.echo) {
        const note = document.createElement("div");
        note.className = "choice echo-note";
        note.textContent = item.echo;
        layer.appendChild(note);
        return;
      }
      const div = document.createElement("div");
      div.className = "choice" + (item.silent ? " silent" : "");
      div.textContent = item.t;
      div.addEventListener("click", () => {
        AudioSys.playSE("confirm");
        layer.classList.add("hidden");
        if (item.aff) applyAff(item.aff);
        if (item.flag) S.flags[item.flag] = item.flagVal !== undefined ? item.flagVal : true;
        if (item.mark) S.flags[item.mark] = item.t;   // 回声记忆
        S.pendingWait = false;
        if (item.goto) gotoLabel(item.goto); else step();
      });
      layer.appendChild(div);
    });
    layer.classList.remove("hidden");
  }

  /* 手机聊天 */
  function startPhone({ title, msgs }) {
    const ui = $("phone-ui"), wrap = $("phone-messages");
    $("phone-title").textContent = title || "聊天";
    wrap.innerHTML = "";
    ui.classList.remove("hidden");
    let i = 0;
    const handler = () => {
      if (i < msgs.length) {
        const [who, text] = msgs[i++];
        const div = document.createElement("div");
        div.className = "pmsg " + (who === "mc" ? "me" : who === "sys" ? "sys" : "them");
        div.textContent = who === "mc" ? S.playerName + "：" + text : who === "sys" ? text : ((CHARS[who] || {}).name || "") + "：" + text;
        if (who === "sys") div.textContent = text;
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
        AudioSys.playSE(who === "mc" ? "click" : "message");
        Dialogue.pushHistory(who === "mc" ? "mc" : who, (who === "mc" ? "" : "〔消息〕") + text);
      } else {
        ui.classList.add("hidden");
        ui.removeEventListener("click", handler);
        $("click-catcher").addEventListener("click", clickResume);
        S.pendingWait = false;
        step();
      }
    };
    function clickResume(e) { $("click-catcher").removeEventListener("click", clickResume); }
    ui.addEventListener("click", handler);
    handler();
  }

  /* ---------- 结局 ---------- */
  function doEnding(id) {
    const e = ENDINGS[id];
    if (!e) { console.error("no ending", id); return; }
    SaveSys.markEnding(id, e.title, e.desc, e.type, e.routeName);
    SaveSys.markCleared(e.route);
    S.ready = false;
    Dialogue.say(null, "");
    fadeEl.classList.add("show");
    setTimeout(() => {
      showEndingCard(e);
    }, 900);
  }
  function showEndingCard(e) {
    const tc = $("title-card"), m = $("tc-main"), s2 = $("tc-sub");
    tc.classList.remove("hidden");
    m.innerHTML = `<span style="font-size:18px;letter-spacing:6px;color:${e.type === "奇迹" ? "#ffd9a8" : e.type === "潮落" ? "#8ba3c8" : e.type === "真结局" ? "#8adcff" : "#cdd9ee"}">— ${e.type} END —</span><br>${e.title}`;
    s2.textContent = e.desc;
    tc.classList.add("show");
    AudioSys.playBGM("tide");
    let armed = false;
    setTimeout(() => { armed = true; }, 1100);
    const once = () => {
      if (!armed) return;
      tc.classList.remove("show");
      tc.removeEventListener("click", once);
      setTimeout(() => { tc.classList.add("hidden"); toTitle(); }, 900);
    };
    tc.addEventListener("click", once);
  }

  /* ---------- 剧本装载 ---------- */
  function startCommon() {
    S.script = SCRIPTS.common; S.scriptName = "common";
    S.route = null; S.index = 0; S.flags = {};
    S.aff = { qwen: 0, ernie: 0, glm: 0, gpt: 0, kimi: 0, minimax: 0, momo: 0 };
    Dialogue.clearHistory();
    S.ready = true;
    $("title-screen").classList.add("hidden");
    $("dialogue-wrap").style.visibility = "visible";
    run(0);
  }
  function startRoute(route) {
    S.route = route;
    S.script = SCRIPTS[route]; S.scriptName = route;
    S.index = 0;
    S.ready = false;
    UI.hideTitle();
    $("dialogue-wrap").style.visibility = "visible";
    SpriteMgr.clear(); Particles.set(null);
    // 专属海报（点击或自动后进入正篇）
    CG.playPoster(route, () => { S.ready = true; run(0); });
  }
  function newGame() {
    AudioSys.init();
    UI.hideTitle();
    CG.playOP(() => {
      UI.askName(name => {
        S.playerName = name;
        CHARS.male.name = name;
        fadeEl.classList.add("show");
        setTimeout(() => { fadeEl.classList.remove("show"); startCommon(); }, 600);
      });
    });
  }
  function startTrueRoute() {
    S.script = SCRIPTS.true_route; S.scriptName = "true_route";
    S.route = "true"; S.index = 0;
    S.flags = {}; S.aff = { qwen: 3, ernie: 3, glm: 3, gpt: 3, kimi: 3, minimax: 3, momo: 3 };
    S.playerName = SaveSys.meta().name || "拾一";
    CHARS.male.name = S.playerName;
    Dialogue.clearHistory();
    UI.hideTitle();
    $("dialogue-wrap").style.visibility = "visible";
    fadeEl.classList.add("show");
    setTimeout(() => { fadeEl.classList.remove("show"); S.ready = true; run(0); }, 500);
  }
  function loadFrom(d) {
    UI.hideTitle();
    S.playerName = d.playerName || "拾一"; CHARS.male.name = S.playerName;
    S.route = d.route; S.index = d.index;
    S.aff = d.aff; S.flags = d.flags || {};
    S.date = d.date; S.chapter = d.chapter;
    S.script = d.route ? (d.route === "true" ? SCRIPTS.true_route : SCRIPTS[d.route]) : SCRIPTS.common;
    S.scriptName = d.route || "common";
    S.ready = true;
    $("dialogue-wrap").style.visibility = "visible";
    Dialogue.clearHistory();
    (d.hist || []).forEach(h => Dialogue.getHistory().push(h));
    BG_SCENES.set(d.bg || "black");
    Particles.set(d.part || null);
    if (d.bgm) AudioSys.playBGM(d.bgm);
    SpriteMgr.restore(d.sprites);
    updateHUD();
    fadeEl.classList.add("show");
    setTimeout(() => { fadeEl.classList.remove("show"); run(S.index); }, 500);
  }
  function toTitle() {
    S.ready = false; S.script = null; S.pendingWait = false;
    clearTimeout(S.autoTimer); clearTimeout(S.skipTimer);
    SpriteMgr.clear(); Particles.set(null); BG_SCENES.set("black");
    AudioSys.stopBGM(0.5); AudioSys.amb(null);
    $("dialogue-wrap").style.visibility = "hidden";
    $("hud-chapter").textContent = ""; $("hud-date").textContent = ""; $("hud-countdown").style.display = "none";
    UI.resetToggles();
    fadeEl.classList.add("show");
    setTimeout(() => { UI.showTitle(); fadeEl.classList.remove("show"); }, 400);
  }

  /* 自动/快进 */
  function setAuto(v) {
    S.autoMode = v;
    if (v) {
      const tc = $("title-card");
      if (tc && !tc.classList.contains("hidden")) {
        clearTimeout(cardAutoTimer);
        cardAutoTimer = setTimeout(() => { if (S.autoMode && !tc.classList.contains("hidden")) tc.click(); }, 1100);
      }
    }
  }
  function setSkip(v) {
    S.skipMode = v;
    Dialogue.cfg.speed = v ? 3 : UI.cfg.speed;
    if (v) { if (S.pendingWait) S.skipTimer = setTimeout(() => { if (S.pendingWait) advance(); }, 120); if (CG.active) setTimeout(() => CG.skip(), 800); }
    else Dialogue.cfg.speed = UI.cfg.speed;
  }

  /* 启动 */
  BG_SCENES.mount($("bg-canvas"));
  Particles.mount($("particle-canvas"));
  BG_SCENES.set("black");
  $("dialogue-wrap").style.visibility = "hidden";
  requestAnimationFrame(loop);
  UI.showTitle();

  return {
    get ready() { return S.ready; }, get playerName() { return S.playerName; },
    get aff() { return S.aff; }, get flags() { return S.flags; },
    get route() { return S.route; }, get index() { return S.index; }, set index(v) { S.index = v; },
    get date() { return S.date; }, set date(v) { S.date = v; },
    get chapter() { return S.chapter; }, set chapter(v) { S.chapter = v; },
    ENDINGS, newGame, startTrueRoute, startRoute, loadFrom, toTitle, setAuto, setSkip,
    get isSkip() { return S.skipMode; },
  };
})();
