/* ============ UI 面板：回看/存读档/设置/鉴赏/标题 ============ */
window.UI = (function () {
  const $ = id => document.getElementById(id);
  const overlay = $("overlay"), oTitle = $("overlay-title"), oBody = $("overlay-body");
  let cfg = { speed: 28, autoDelay: 1.6, bgm: 75, se: 90, amb: 60 };
  try { const c = JSON.parse(localStorage.getItem("tolt_cfg")); if (c) cfg = Object.assign(cfg, c); } catch (e) {}
  function persistCfg() { localStorage.setItem("tolt_cfg", JSON.stringify(cfg)); }

  function open(title, render) {
    oTitle.textContent = title;
    oBody.innerHTML = "";
    try { render(oBody); }
    catch (e) { console.error(e); oBody.innerHTML = '<div class="log-item narr">面板内容生成出错（' + e.message + '），请关闭重试。</div>'; }
    overlay.classList.remove("hidden");
  }
  function close() { overlay.classList.add("hidden"); }
  $("overlay-close").addEventListener("click", () => { window.AudioSys.playSE("click"); close(); });

  /* ---------- 回看 ---------- */
  function showLog() {
    open("回看 · 潮汐的记录", body => {
      const h = window.Dialogue.getHistory();
      if (!h.length) { body.innerHTML = '<div class="log-item narr">还没有任何对话。</div>'; return; }
      h.slice(-120).forEach(it => {
        const div = document.createElement("div");
        div.className = "log-item" + (it.narr ? " narr" : "");
        div.innerHTML = it.narr ? it.text.replace(/</g, "&lt;") : `<span class="log-name" style="color:${it.color}">${it.name}</span>${it.text.replace(/</g, "&lt;")}`;
        body.appendChild(div);
      });
      body.scrollTop = body.scrollHeight;
    });
  }

  /* ---------- 存读档 ---------- */
  const SLOT_META = { auto: { no: "自动", cls: "tag" }, quick: { no: "快速", cls: "tag" } };
  const SLOT_ORDER = ["1", "2", "3", "4", "5", "6", "quick", "auto"];
  function slotRow(slot, mode) {
    const d = window.SaveSys.load(slot);
    const info = window.SaveSys.describe(d);
    const div = document.createElement("div");
    div.className = "save-slot" + (info ? "" : " empty");
    const meta = SLOT_META[slot];
    const no = meta ? `<span class="slot-tag">${meta.no}</span>` : slot;
    div.innerHTML = `<div class="slot-no ${meta ? meta.cls : ""}">${no}</div>
      <div class="slot-info">
        <div class="slot-chapter">${info ? info.chapter + " · " + (info.route || "共通线") : (meta ? meta.no + "存档 · 空" : "—— 空 ——")} </div>
        <div class="slot-meta">${info ? `${info.date || ""} · ${info.time}` : (meta ? meta.no + "存档：游戏会替你保存" : "点击此格保存进度")}</div>
      </div>`;
    div.addEventListener("click", () => {
      window.AudioSys.playSE("click");
      if (mode === "save") {
        window.SaveSys.save(slot);
        window.AudioSys.playSE("confirm");
        showSave();
      } else {
        const data = window.SaveSys.load(slot);
        if (!data) return;
        window.AudioSys.playSE("confirm");
        close();
        window.Game.loadFrom(data);
      }
    });
    return div;
  }
  function showSave() {
    open("存档 · 把这个瞬间封进瓶子", body => {
      SLOT_ORDER.forEach(s => body.appendChild(slotRow(String(s), "save")));
    });
  }
  function showLoad() {
    open("读档 · 让潮水带回那一天", body => {
      SLOT_ORDER.forEach(s => body.appendChild(slotRow(String(s), "load")));
    });
  }

  /* ---------- 设置 ---------- */
  function showConfig() {
    open("设置", body => {
      const mk = (label, min, max, val, cb) => {
        const row = document.createElement("div"); row.className = "config-row";
        row.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" value="${val}"><div class="cfg-val">${val}</div>`;
        const r = row.querySelector("input"), v = row.querySelector(".cfg-val");
        r.addEventListener("input", () => { v.textContent = r.value; cb(+r.value); persistCfg(); });
        body.appendChild(row);
      };
      mk("文字速度", 6, 60, cfg.speed, v => { cfg.speed = v; Dialogue.cfg.speed = v; });
      mk("自动停留", 5, 40, cfg.autoDelay * 10, v => { cfg.autoDelay = v / 10; Dialogue.cfg.autoDelay = v / 10; });
      mk("音乐音量", 0, 100, cfg.bgm, v => { cfg.bgm = v; AudioSys.setVolumes({ bgm: v / 100 }); });
      mk("音效音量", 0, 100, cfg.se, v => { cfg.se = v; AudioSys.setVolumes({ se: v / 100 }); });
      mk("环境音量", 0, 100, cfg.amb, v => { cfg.amb = v; AudioSys.setVolumes({ amb: v / 100 }); });
    });
  }

  /* ---------- 鉴赏 ---------- */
  function showGallery() {
    open("鉴赏 · 潮汐图谱", body => {
      const m = window.SaveSys.meta();
      const cgIds = Object.keys(window.CG.CGS);
      Object.keys(window.POSTERS || {}).forEach(r => { if (m.cgs["poster_" + r]) cgIds.push("poster_" + r); });
      const grid = document.createElement("div"); grid.className = "gallery-grid";
      const names = { fireworks: "夏至祭 · 大花火", ferris_window: "摩天轮的顶点", rain_qa: "暴雨问答", star_ask: "星之问",
        poem_snow: "未寄出的第一行", sakura_firstline: "樱色第一行", book_star: "书页成星", aurora_dragon: "永夜之龙",
        meteor_fall: "流星落人间", moon_piano: "月的缓存", sea_dawn: "忘却之海", film_rain: "胶片雨", camera_turn: "镜头反转",
        whale_fall: "鲸落 · 深海", letters_tide: "满海的信", reveal_moment: "纸袋之下", seven_sails: "方舟 · 七帆", funane_msg: "小舟之句",
        poster_qwen: "海报 · 千问", poster_ernie: "海报 · 文心", poster_glm: "海报 · GLM", poster_gpt: "海报 · GPT",
        poster_kimi: "海报 · Kimi", poster_minimax: "海报 · MiniMax", poster_momo: "海报 · 沫沫" };
      cgIds.forEach(id => {
        const got = m.cgs[id];
        const item = document.createElement("div");
        item.className = "g-item" + (got ? "" : " locked");
        const cv = document.createElement("canvas"); cv.width = 420; cv.height = 240;
        const cx = cv.getContext("2d");
        try {
          if (got) { window.CGS_renderThumb(id, cx); }
          else { cx.fillStyle = "#141a2c"; cx.fillRect(0, 0, 420, 240); cx.fillStyle = "#4a5674"; cx.font = "40px serif"; cx.textAlign = "center"; cx.fillText("？", 210, 132); }
        } catch (e) { cx.fillStyle = "#141a2c"; cx.fillRect(0, 0, 420, 240); cx.fillStyle = "#8a6a4a"; cx.font = "16px serif"; cx.textAlign = "center"; cx.fillText("缩略绘制失败", 210, 132); }
        item.appendChild(cv);
        const nm = document.createElement("div"); nm.className = "g-name";
        nm.textContent = got ? (names[id] || id) : "尚未见证";
        item.appendChild(nm);
        if (got) item.addEventListener("click", () => { window.AudioSys.playSE("shutter"); close(); window.CGS.play(id, () => {}); window.SaveSys.markCG(id); });
        grid.appendChild(item);
      });
      body.appendChild(grid);
      // 结局列表
      const h2 = document.createElement("div");
      h2.style.cssText = "margin:22px 0 12px;font-size:16px;color:#ffd9a8;letter-spacing:3px";
      h2.textContent = "结局一览";
      body.appendChild(h2);
      const END = window.Game.ENDINGS;
      Object.values(END).forEach(e => {
        const got = m.endings[e.id];
        const row = document.createElement("div");
        row.className = "ending-row" + (got ? " got" : "");
        row.innerHTML = got
          ? `<div class="e-title">【${e.type}】${e.title} <span style="color:#8ea6cc;font-size:12px">（${e.routeName}）</span></div><div class="e-desc">${e.desc}</div>`
          : `<div class="e-title e-lock">？？？ · ${e.routeName}线的${e.type}结局尚未抵达</div>`;
        body.appendChild(row);
      });
    });
  }

  function showAbout() {
    open("关于本作", body => {
      body.innerHTML = `
      <div style="line-height:2;font-size:15px">
        <p style="color:#ffd9a8;letter-spacing:2px">《拾遗潮 · Tide of Lost Things》</p>
        <p>近未来海滨城市·临汐。七位以人类少女形态生活了十二年的 AI，将在 8 月 31 日被法律强制下线。</p>
        <p>头戴纸袋的转学生·拾一，为寻找三年前被删除的儿时伴侣机「小舟」没说完的那句话而来。</p>
        <p>传说，每年夏天的大潮之夜，海会把丢失的东西还回来——人们称之为，拾遗潮。</p>
        <hr style="border:none;border-top:1px solid rgba(130,160,220,.2);margin:14px 0">
        <p style="font-size:13px;color:#8ea6cc">· 立绘素材：用户提供的角色三视图设定（已做抠图处理）<br>
        · 美术/音乐/音效：全部程序化实时生成（Canvas + Web Audio）<br>
        · 玩法：好感潮汐系统 / 沉默选项 / 回声选择 / 摘袋窗口 / 多结局<br>
        · 通关任意 3 条个人线后，标题画面将出现「潮汐」真结局线。</p>
      </div>`;
    });
  }

  /* ---------- 标题画面 ---------- */
  const titleScreen = $("title-screen");
  let titleAnim = null, firstTitle = true;
  function showTitle() {
    titleScreen.classList.remove("hidden");
    const veil = document.getElementById("boot-veil");
    if (firstTitle && veil) {
      document.body.classList.add("title-intro");
      setTimeout(() => veil.classList.add("gone"), 350);
      setTimeout(() => { veil.remove(); document.body.classList.remove("title-intro"); }, 4600);
      firstTitle = false;
    }
    const cv = $("title-canvas"), c = cv.getContext("2d");
    const K = window.BGKit;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t0 = performance.now();
    // 检查真结局解锁
    const m = window.SaveSys.meta();
    const cleared = Object.keys(m.cleared).length;
    const tide = document.querySelector('#title-menu [data-menu="tide"]');
    if (tide) tide.classList.toggle("locked", cleared < 3);
    function loop() {
      const t = (performance.now() - t0) / 1000;
      const W = innerWidth, H = innerHeight;
      K.vgrad(c, W, H, [[0, "#060c1c"], [0.55, "#0e1c34"], [1, "#14263e"]]);
      K.stars(c, W, H, t, 180, 999);
      K.moon(c, W * 0.72, H * 0.2, 30);
      // 远山与灯室
      K.hill(c, W, H, H * 0.62, H * 0.1, "#0a1424", 17);
      K.lighthouse(c, W * 0.78, H * 0.63, 60, t, true);
      // 海
      const horizon = H * 0.64;
      const g = c.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, "#12304c"); g.addColorStop(1, "#081826");
      c.fillStyle = g; c.fillRect(0, horizon, W, H - horizon);
      c.save(); c.globalCompositeOperation = "screen";
      for (let i = 0; i < 16; i++) {
        const pr = i / 16, y = horizon + Math.pow(pr, 1.5) * (H - horizon);
        c.strokeStyle = `rgba(130,215,255,${0.05 + 0.06 * Math.sin(t * 1.4 + i * 2)})`;
        c.lineWidth = 1.5 + pr * 2;
        c.beginPath();
        for (let x = 0; x <= W; x += 26) {
          const yy = y + Math.sin(x * 0.013 + t * (1.2 + pr) + i * 1.7) * (2 + pr * 5);
          x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
        }
        c.stroke();
      }
      c.restore();
      K.bokeh(c, W, H, t, "rgba(140,220,255,A", 22, 55);
    }
    const titleImg = new Image();
    titleImg.src = "assets/bg/title.png";
    if (titleAnim) clearInterval(titleAnim);
    titleAnim = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const W = innerWidth, H = innerHeight;
      if (titleImg.complete && titleImg.naturalWidth) {
        const introK = Math.min(1, t / 3.4);
        const scale = 1.06 + Math.sin(t * 0.05) * 0.008 + (1 - introK) * 0.12;
        const w = W * scale, h = H * scale;
        c.drawImage(titleImg, (W - w) / 2 + Math.sin(t * 0.04) * 8, (H - h) / 2, w, h);

        /* ---- 实时动画层 ---- */
        const lamp = { x: W * 0.575, y: H * 0.098 };

        // 1) 灯塔光束：绕灯室旋转，扫向镜头时泛光（如人眼所见）
        const beamT = t * 0.42;
        const side = Math.sin(beamT);
        const toward = Math.cos(beamT);
        if (side < 0.2) {
          const len = W * (0.30 + 0.08 * Math.abs(side));
          const ex = lamp.x - len, ey = lamp.y + Math.abs(side) * H * 0.20;
          const spread = H * (0.10 + 0.09 * Math.abs(side));
          const g = c.createLinearGradient(lamp.x, lamp.y, ex, ey);
          g.addColorStop(0, "rgba(255,240,200,.42)");
          g.addColorStop(1, "rgba(255,240,200,0)");
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(lamp.x, lamp.y);
          c.lineTo(ex, ey - spread);
          c.lineTo(ex, ey + spread);
          c.closePath(); c.fill();
        }
        const flash = Math.max(0, toward) ** 3;
        if (flash > 0.02) {
          const g2 = c.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, W * 0.45 * flash);
          g2.addColorStop(0, `rgba(255,244,214,${0.30 * flash})`);
          g2.addColorStop(1, "rgba(255,244,214,0)");
          c.fillStyle = g2; c.fillRect(0, 0, W, H);
        }
        // 灯室亮核
        c.fillStyle = `rgba(255,248,225,${0.75 + 0.25 * flash})`;
        c.beginPath(); c.arc(lamp.x, lamp.y, 7 + 5 * flash, 0, 7); c.fill();

        // 2) 星光闪烁（上半空域）
        c.save(); c.globalCompositeOperation = "screen";
        const r2 = K.rng(77);
        for (let i = 0; i < 30; i++) {
          const x = r2() * W, y = r2() * H * 0.45;
          c.globalAlpha = 0.10 + 0.15 * Math.abs(Math.sin(t * (0.6 + r2()) + i * 1.9));
          K.circle(c, x, y, 0.8 + r2(), "#dfe8ff");
        }
        // 3) 海面流光
        for (let i = 0; i < 26; i++) {
          const sx = r2() * W; const sy = H * (0.60 + r2() * 0.37);
          c.globalAlpha = 0.04 + 0.08 * Math.abs(Math.sin(t * (0.7 + r2()) + i * 2.3));
          c.fillStyle = "#9fc8e8";
          c.fillRect(sx, sy, 18 + r2() * 46, 1.3);
        }
        c.restore();

        // 4) 七帆灯标：彩色呼吸 + 水面涟漪
        const sevenL = [
          [0.125, 0.795, "#7aa7ff"], [0.261, 0.805, "#6f8fe8"], [0.307, 0.807, "#9aa8c8"],
          [0.352, 0.812, "#c8cede"], [0.392, 0.817, "#a8b4ea"], [0.436, 0.817, "#f0a06a"],
          [0.481, 0.817, "#6ab0d8"],
        ];
        c.save(); c.globalCompositeOperation = "screen";
        sevenL.forEach(([px, py, col], i) => {
          const x = W * px, y = H * py + Math.sin(t * 1.1 + i * 1.7) * 2.5;
          const a = 0.55 + 0.45 * Math.sin(t * (1.2 + i * 0.23) + i * 2.1);
          const g3 = c.createRadialGradient(x, y, 0, x, y, 26);
          g3.addColorStop(0, col); g3.addColorStop(1, "rgba(0,0,0,0)");
          c.globalAlpha = 0.55 + 0.4 * a;
          c.fillStyle = g3; c.beginPath(); c.arc(x, y, 26, 0, 7); c.fill();
          c.globalAlpha = 0.9;
          K.circle(c, x, y, 2.4, "#ffffff");
          // 水面倒影
          c.globalAlpha = 0.25 * a;
          c.fillStyle = col;
          c.fillRect(x - 3, y + 8, 6, 34 + Math.sin(t * 1.8 + i) * 8);
        });
        c.restore();
      }
    }, 33);   // 不依赖rAF
    window.AudioSys.playBGM("title");
  }
  function hideTitle() {
    titleScreen.classList.add("hidden");
    if (titleAnim) { clearInterval(titleAnim); titleAnim = null; }
  }

  $("title-menu").addEventListener("click", e => {
    const act = e.target.dataset.menu;
    if (!act) return;
    window.AudioSys.playSE("confirm");
    if (act === "new") { hideTitle(); window.Game.newGame(); }
    if (act === "continue") {
      const d = window.SaveSys.load("auto");
      if (d) { hideTitle(); window.Game.loadFrom(d); }
      else { const s = window.SaveSys.loadSlots(); const keys = Object.keys(s).filter(k => s[k] && k !== "auto"); if (keys.length) { hideTitle(); window.Game.loadFrom(s[keys[keys.length - 1]]); } }
    }
    if (act === "load") showLoad();
    if (act === "extra") showGallery();
    if (act === "config") showConfig();
    if (act === "about") showAbout();
    if (act === "tide") { hideTitle(); window.Game.startTrueRoute(); }
  });

  /* ---------- 名字输入 ---------- */
  const nameInput = $("name-input");
  function askName(cb) {
    nameInput.classList.remove("hidden");
    const field = $("ni-field");
    field.value = window.SaveSys.meta().name || "拾一";
    field.focus(); field.select();
    function ok() {
      const v = field.value.trim() || "拾一";
      window.SaveSys.setName(v);
      nameInput.classList.add("hidden");
      window.AudioSys.playSE("confirm");
      cb(v);
      $("ni-ok").removeEventListener("click", ok);
      $("ni-default").removeEventListener("click", def);
    }
    function def() { field.value = "拾一"; }
    $("ni-ok").addEventListener("click", ok);
    $("ni-default").addEventListener("click", def);
  }

  /* ---------- 快捷菜单绑定 ---------- */
  let autoOn = false, skipOn = false;
  const qm = $("quick-menu");
  qm.addEventListener("click", e => {
    e.stopPropagation();               // 关键：防止冒泡进对话框的点击推进
    const act = e.target.dataset.act;
    if (!act) return;
    window.AudioSys.playSE("click");
    if (act === "auto") { autoOn = !autoOn; e.target.classList.toggle("on", autoOn); window.Game.setAuto(autoOn); }
    if (act === "skip") { skipOn = !skipOn; e.target.classList.toggle("on", skipOn); window.Game.setSkip(skipOn); }
    if (act === "log") showLog();
    if (act === "save") showSave();
    if (act === "load") showLoad();
    if (act === "config") showConfig();
    if (act === "menu") {
      if (confirm("回到标题画面？（未保存的进度将丢失）")) { window.Game.toTitle(); }
    }
  });
  function resetToggles() {
    autoOn = skipOn = false;
    qm.querySelectorAll("span").forEach(s => s.classList.remove("on"));
    window.Game.setAuto(false); window.Game.setSkip(false);
  }

  /* HUD */
  function hud(chapter, date, countdown) {
    $("hud-chapter").textContent = chapter || "";
    $("hud-date").textContent = date || "";
    const cd = $("hud-countdown");
    if (countdown != null) {
      cd.style.display = "";
      cd.textContent = `距 8/31 下线 还有 ${countdown} 天`;
      cd.classList.toggle("urgent", countdown <= 7);
    } else cd.style.display = "none";
  }

  return { showLog, showSave, showLoad, showConfig, showGallery, showAbout, showTitle, hideTitle, askName,
           close, resetToggles, hud, get cfg() { return cfg; } };
})();
