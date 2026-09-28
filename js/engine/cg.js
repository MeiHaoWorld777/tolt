/* ============ CG 动画系统 + OP 开场 ============ */
window.CG = (function () {
  const cv = document.getElementById("cg-canvas");
  const ctx = cv.getContext("2d");
  let dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize(); window.addEventListener("resize", resize);
  const K = window.BGKit;

  const R = { active: false, dur: 0, t0: 0, painter: null, caption: "", onEnd: null };

  /* 每个CG：painter(ctx,W,H,p) p∈[0,1] 进度，带本地时间 tt */
  const CGS = {};

  /* ---------- 立绘预载与合成 ---------- */
  const spCache = {};
  const bgCache = {};
  function cgImg(name) {
    if (!bgCache[name]) { const im = new Image(); bgCache[name] = im; im.src = "assets/bg/" + name + ".png"; }
    return bgCache[name];
  }
  function drawCover(c, name, W, H) {
    const im = cgImg(name);
    if (!im.complete || !im.naturalWidth) return false;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    return true;
  }
  (function preload() {
    for (const [id, c] of Object.entries(window.CHARS || {})) {
      if (c && c.sprite) { const im = new Image(); spCache[id] = im; im.src = c.sprite; }
    }
  })();
  function drawSprite(c, id, xFeet, yFeet, h, alpha) {
    const im = spCache[id];
    if (!im || !im.complete || !im.naturalWidth) return;
    const w = im.naturalWidth / im.naturalHeight * h;
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
    c.drawImage(im, xFeet - w / 2, yFeet - h, w, h);
    c.restore();
  }
  window.CGS_renderThumb = function (id, cx) {
    const W = cx.canvas.width, H = cx.canvas.height;
    if (id.indexOf("poster_") === 0) {
      const rid = id.slice(7);
      const P = (window.POSTERS || {})[rid];
      const ch = window.CHARS[rid];
      if (!P) return;
      const g = cx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#05070d"); g.addColorStop(1, ch.dark);
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      const im = spCache[rid];
      if (im && im.complete) {
        const h = H * 0.92, w = im.naturalWidth / im.naturalHeight * h;
        cx.drawImage(im, W * 0.72 - w / 2, H - h, w, h);
      }
      cx.fillStyle = "#f0ead8"; cx.font = `300 ${Math.floor(H*0.14)}px 'Songti SC','SimSun',serif`;
      cx.fillText(P.title, W * 0.06, H * 0.42);
      cx.fillStyle = ch.color; cx.font = `600 ${Math.floor(H*0.055)}px sans-serif`;
      cx.fillText(ch.name, W * 0.06, H * 0.24);
      cx.fillStyle = "#9fb6dd"; cx.font = `${Math.floor(H*0.04)}px sans-serif`;
      cx.fillText(P.quote.slice(0, 14), W * 0.06, H * 0.56);
      return;
    }
    const cg = CGS[id];
    if (cg) cg.painter(cx, W, H, 4.2, 0.5);
  };

  function letterbox(c, W, H, p) {
    const bh = H * 0.11 * Math.min(1, Math.min(p * 4, (1 - p) * 4 + 0.25));
    c.fillStyle = "#04060c";
    c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh);
  }
  function captionBar(c, W, H, text, p) {
    const a = Math.min(1, p * 3) * Math.min(1, (1 - p) * 5 + 0.2);
    c.save(); c.globalAlpha = a;
    c.fillStyle = "rgba(8,12,22,.78)";
    const tw = c.measureText(text).width;
    c.font = "300 26px 'Songti SC','SimSun',serif";
    const w2 = c.measureText(text).width;
    c.fillRect(W / 2 - w2 / 2 - 28, H * 0.86, w2 + 56, 52);
    c.fillStyle = "#f0ead8"; c.textAlign = "center";
    c.fillText(text, W / 2, H * 0.86 + 35);
    c.restore();
  }

  /* ---------- 花火 ---------- */
  function fireworksPainter(c, W, H, tt, p) {
    K.vgrad(c, W, H, [[0, "#0a1328"], [0.6, "#142342"], [1, "#1c2a48"]]);
    K.stars(c, W, H, tt, 130, 101);
    // 岸边剪影
    c.fillStyle = "#0a0e1a";
    c.beginPath(); c.moveTo(0, H);
    c.quadraticCurveTo(W * 0.3, H * 0.82, W * 0.55, H * 0.92);
    c.quadraticCurveTo(W * 0.8, H * 0.98, W, H * 0.88); c.lineTo(W, H); c.closePath(); c.fill();
    // 海面反光
    const horizon = H * 0.72;
    const g = c.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "rgba(40,60,110,.5)"); g.addColorStop(1, "rgba(10,16,32,0)");
    c.fillStyle = g; c.fillRect(0, horizon, W, H - horizon);
    // 花火序列（密集交错，避免空档）
    const bursts = [[0.04, 0.3, 0.5, "#ffd9a8"], [0.12, 0.62, 0.62, "#ff9a9a"], [0.2, 0.45, 0.42, "#a8d8ff"],
                    [0.28, 0.72, 0.55, "#e8b0ff"], [0.36, 0.34, 0.66, "#ffe8a8"], [0.44, 0.55, 0.48, "#b0ffd8"],
                    [0.52, 0.4, 0.58, "#ffc8b0"], [0.6, 0.66, 0.44, "#c8dcff"], [0.68, 0.28, 0.5, "#ffd9a8"],
                    [0.76, 0.52, 0.64, "#ff9a9a"], [0.84, 0.38, 0.46, "#e8b0ff"], [0.9, 0.6, 0.55, "#fff2c8"]];
    c.save(); c.globalCompositeOperation = "screen";
    for (const [st, x, y, col] of bursts) {
      for (const lag of [0, 0.06]) {          // 双重绽放
        const bp = (p - st - lag) / 0.15;
        if (bp < 0 || bp > 1) continue;
        const cx = W * x, cy = H * y, r = 50 + bp * (100 * y * 2);
        const r2 = K.rng((st * 1000 + lag * 997) | 0);
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2 + r2() * 0.2;
          const dr = r * (0.75 + r2() * 0.45) * Math.min(1, bp * 2.4);
          const fade = Math.max(0, 1 - Math.abs(bp - 0.42) * 1.6);
          const px = cx + Math.cos(a) * dr, py = cy + Math.sin(a) * dr + bp * bp * 26;
          c.globalAlpha = fade * (0.5 + 0.5 * r2());
          K.circle(c, px, py, 1.6 + 2.4 * (1 - bp), col);
        }
        // 水面倒影
        for (let i = 0; i < 9; i++) {
          c.globalAlpha = fade * 0.15;
          c.fillStyle = col;
          c.fillRect(cx - r * 0.5 + (r2() - 0.5) * r, horizon + 14 + i * 10, 18 + r2() * 26, 2.2);
        }
      }
    }
    // 中央光晕（保证任何时刻都有可见光）
    const glowA = 0.16 + 0.08 * Math.sin(tt * 2.2);
    const gg = c.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, H * 0.55);
    gg.addColorStop(0, `rgba(255,214,160,${glowA})`); gg.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = 1; c.fillStyle = gg; c.beginPath(); c.arc(W / 2, H * 0.4, H * 0.55, 0, 7); c.fill();
    c.restore();
  }
  CGS.fireworks = { dur: 11, cap: "夏至祭 · 大花火", painter: fireworksPainter };

  /* ---------- 摩天轮之夜（千问线名场面基底） ---------- */
  CGS.ferris_window = { dur: 10, cap: "摩天轮 · 顶点的景色", sprite: { id: "qwen", x: 0.66, y: 1.02, h: 0.84, a: 0.92 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#0a1228"], [0.5, "#16224a"], [1, "#222c48"]]);
    K.stars(c, W, H, tt, 150, 103);
    // 舱内视角：窗框
    c.fillStyle = "#1c2434";
    c.fillRect(0, 0, W, H * 0.1); c.fillRect(0, H * 0.9, W, H * 0.1);
    c.fillRect(0, 0, W * 0.06, H); c.fillRect(W * 0.94, 0, W * 0.06, H);
    c.fillRect(W * 0.485, 0, W * 0.03, H * 0.42);
    c.fillStyle = "#2c3444";
    c.fillRect(W * 0.05, H * 0.08, W * 0.9, H * 0.02); c.fillRect(W * 0.05, H * 0.9, W * 0.9, H * 0.02);
    // 远处城市与摩天轮灯
    K.buildings(c, W * 0.9, H * 0.75, H * 0.8, 105, "#10162a", "rgba(255,210,140,.8)", H * 0.3, true);
    K.ferris(c, W * 0.42, H * 0.52, H * 0.3, tt * 0.5 + 2, "#6a86b8", "#ffd9a8", true);
    // 缓缓上升的星星
    const r = K.rng(9);
    for (let i = 0; i < 16; i++) {
      const x = W * (0.08 + r() * 0.84), y = H * (0.15 + ((r() * 0.7 + tt * 0.008) % 0.7));
      c.globalAlpha = 0.3 + 0.4 * Math.sin(tt + i * 2); K.circle(c, x, y, 1.4, "#ffe8c8");
    }
    c.globalAlpha = 1;
  } };

  /* ---------- 暴雨问答（千问） ---------- */
  CGS.rain_qa = { dur: 9, cap: "暴雨 · 一千零一问", sprite: { id: "qwen", x: 0.6, y: 1.06, h: 0.95, a: 0.85 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#2a3448"], [0.5, "#3a4458"], [1, "#28303c"]]);
    K.godRays(c, W, H, W * 0.6, 0, tt, "rgba(160,190,240,");
    // 雨幕
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 + tt * 400) % (W + 100) - 50, y = (i * 211 + tt * 900) % H;
      c.strokeStyle = "rgba(200,220,250,.25)"; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 8, y + 22); c.stroke();
    }
    // 水洼涟漪
    for (let i = 0; i < 7; i++) {
      const rp = (tt * 0.7 + i * 0.37) % 1;
      c.strokeStyle = `rgba(180,210,250,${0.3 * (1 - rp)})`; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(W * (0.15 + i * 0.13), H * 0.88, rp * 46, rp * 12, 0, 0, 7); c.stroke();
    }
    K.vignette(c, W, H, 0.5);
  } };

  /* ---------- 星空提问（千问 PE） ---------- */
  CGS.star_ask = { dur: 10, cap: "星之问", sprite: { id: "qwen", x: 0.5, y: 1.07, h: 1.0, a: 0.82 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#060a1e"], [1, "#101c38"]]);
    K.stars(c, W, H, tt, 240, 107);
    K.shootingStar(c, W, H, tt, 4);
    // 银河
    c.save(); c.globalCompositeOperation = "screen";
    const g = c.createLinearGradient(0, H * 0.2, W, H * 0.6);
    g.addColorStop(0, "rgba(120,150,220,0)"); g.addColorStop(0.5, "rgba(140,170,235,.14)"); g.addColorStop(1, "rgba(120,150,220,0)");
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, H * 0.25);
    for (let x = 0; x <= W; x += 40) c.lineTo(x, H * (0.32 + Math.sin(x * 0.002 + 1) * 0.06));
    for (let x = W; x >= 0; x -= 40) c.lineTo(x, H * (0.52 + Math.sin(x * 0.002 + 1) * 0.06));
    c.closePath(); c.fill(); c.restore();
    // 问题文字漂浮
    c.save(); c.globalAlpha = 0.5; c.fillStyle = "#cfe0ff"; c.font = "300 18px serif";
    const qs = ["为什么", "如果", "那么", "会怎样", "然后呢", "假如"];
    qs.forEach((q, i) => {
      const x = W * (0.12 + i * 0.15), y = H * (0.3 + 0.3 * Math.sin(tt * 0.4 + i));
      c.fillText(q, x, y);
    });
    c.restore();
    K.vignette(c, W, H, 0.36);
  } };

  /* ---------- 诗稿纷飞（文心） ---------- */
  CGS.poem_snow = { dur: 9, cap: "未寄出的第一行", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#e8dcf0"], [0.5, "#f0e4ec"], [1, "#e2d0e0"]]);
    c.save(); c.globalAlpha = 0.12; c.fillStyle = "#b88ac0";
    for (let i = 0; i < 6; i++) K.circle(c, (i * 331 + tt * 8) % W, (i * 211 + tt * 14) % H, 60 + i * 30, "#b88ac0");
    c.restore();
    // 稿纸雪
    const r = K.rng(31);
    for (let i = 0; i < 26; i++) {
      const x = (r() * W + Math.sin(tt * 0.7 + i) * 40 + tt * 10) % W, y = (r() * H + tt * (26 + r() * 30)) % (H + 60) - 30;
      c.save(); c.translate(x, y); c.rotate(Math.sin(tt + i) * 0.6);
      c.fillStyle = "rgba(252,248,252,.95)"; c.fillRect(-14, -10, 28, 20);
      c.strokeStyle = "rgba(140,110,160,.5)";
      for (let l = 0; l < 3; l++) { c.beginPath(); c.moveTo(-10, -5 + l * 6); c.lineTo(10, -5 + l * 6); c.stroke(); }
      c.strokeStyle = "rgba(200,80,100,.6)"; c.beginPath(); c.moveTo(-10, -7); c.lineTo(-2, -7); c.stroke();
      c.restore();
    }
    // 中央大字
    c.save(); c.globalAlpha = Math.min(1, p * 2) * 0.85;
    c.fillStyle = "#8a4a64"; c.font = "300 120px 'Songti SC','SimSun',serif"; c.textAlign = "center";
    c.fillText("写", W * 0.5, H * 0.42 + Math.sin(tt) * 4);
    c.restore();
    K.vignette(c, W, H, 0.3);
  } };

  /* ---------- 樱色第一行（文心 PE） ---------- */
  CGS.sakura_firstline = { dur: 10, cap: "第一行 · 写给你", sprite: { id: "ernie", x: 0.34, y: 1.05, h: 0.95, a: 0.92 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#f8e8f0"], [0.5, "#fceef2"], [1, "#f0dce8"]]);
    K.sun(c, W * 0.78, H * 0.24, 44, "rgba(255,240,230,1)", W, H);
    const r = K.rng(41);
    for (let i = 0; i < 40; i++) {
      const x = (r() * W + Math.sin(tt * 0.8 + i * 2) * 50) % W, y = (r() * H + tt * (30 + r() * 36)) % (H + 40) - 20;
      c.save(); c.translate(x, y); c.rotate(tt * 0.6 + i);
      c.fillStyle = `rgba(255,${185 + r() * 40},${205 + r() * 25},.9)`;
      c.beginPath(); c.ellipse(0, 0, 6, 3.6, 0, 0, 7); c.fill(); c.restore();
    }
    c.save(); c.globalAlpha = 0.55 * Math.min(1, p * 1.5);
    c.fillStyle = "#9a4468"; c.font = "300 34px 'Songti SC','SimSun',serif"; c.textAlign = "center";
    c.fillText("「春天来信的第一行，」", W / 2, H * 0.46);
    c.fillText("「是你的名字。」", W / 2, H * 0.56);
    c.restore();
    K.bokeh(c, W, H, tt, "rgba(255,220,240,A", 18, 43);
  } };

  /* ---------- 书页飞散成星（GLM） ---------- */
  CGS.book_star = { dur: 10, cap: "故事飞起来的夜晚", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#0e1626"], [1, "#1a2438"]]);
    // 翻开的书（中央底座）
    c.save(); c.translate(W / 2, H * 0.72);
    c.fillStyle = "#f0ead8";
    c.beginPath(); c.moveTo(-140, 0); c.quadraticCurveTo(0, -30, 140, 0);
    c.quadraticCurveTo(0, 26, -140, 0); c.fill();
    c.strokeStyle = "rgba(90,80,110,.5)";
    c.beginPath(); c.moveTo(-140, 0); c.quadraticCurveTo(0, -30, 140, 0); c.stroke();
    c.restore();
    // 页片化星上升
    const r = K.rng(51);
    for (let i = 0; i < 34; i++) {
      const ph = (r() * 2 + tt * 0.14 + i * 0.03) % 1;
      const x = W / 2 + Math.sin(i * 2.4) * W * 0.36 * ph, y = H * 0.72 - ph * H * 0.6;
      c.save(); c.translate(x, y); c.rotate(tt * 0.8 + i);
      c.globalAlpha = (1 - ph) * 0.9;
      c.fillStyle = ph > 0.5 ? "#ffe8b0" : "#f0ead8";
      c.fillRect(-7, -5, 14, 10); c.restore();
    }
    K.stars(c, W, H, tt, 120, 109);
    K.vignette(c, W, H, 0.4);
  } };

  /* ---------- 白龙极夜（GPT） ---------- */
  CGS.aurora_dragon = { dur: 12, cap: "永夜之龙", sprite: { id: "gpt", x: 0.79, y: 1.03, h: 0.85, a: 0.5 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#03060f"], [0.5, "#07101f"], [1, "#0c1830"]]);
    K.stars(c, W, H, tt, 220, 113);
    for (let b = 0; b < 5; b++) {
      const hue = [150, 180, 200, 120, 170][b];
      c.save(); c.globalCompositeOperation = "screen";
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 26) c.lineTo(x, H * (0.3 + b * 0.045) + Math.sin(x * 0.005 + tt * (0.24 + b * 0.07) + b * 1.9) * H * 0.1);
      for (let x = W; x >= 0; x -= 26) c.lineTo(x, H * (0.3 + b * 0.045) + Math.sin(x * 0.005 + tt * (0.24 + b * 0.07) + b * 1.9 + 1.2) * H * 0.1 - H * (0.14 + b * 0.03));
      c.closePath();
      const g = c.createLinearGradient(0, H * 0.1, 0, H * 0.5);
      g.addColorStop(0, `hsla(${hue},85%,60%,.04)`); g.addColorStop(0.7, `hsla(${hue},85%,55%,.2)`); g.addColorStop(1, `hsla(${hue},80%,50%,0)`);
      c.fillStyle = g; c.fill(); c.restore();
    }
    // 龙影游过极光
    c.save(); c.globalAlpha = 0.5;
    const dx = W * (0.1 + 0.8 * ((tt * 0.02) % 1)), dy = H * 0.34 + Math.sin(tt * 0.4) * H * 0.04;
    c.strokeStyle = "rgba(230,240,255,.7)"; c.lineWidth = 5; c.lineCap = "round";
    c.beginPath(); c.moveTo(dx - 220, dy);
    for (let i = 0; i <= 10; i++) c.lineTo(dx - 220 + i * 44, dy + Math.sin(i * 0.9 + tt * 2) * 18);
    c.stroke();
    c.fillStyle = "rgba(240,246,255,.8)";
    c.beginPath(); c.ellipse(dx, dy - 4, 14, 8, 0.3, 0, 7); c.fill();
    // 翼
    c.fillStyle = "rgba(230,240,255,.35)";
    c.beginPath(); c.moveTo(dx - 40, dy); c.quadraticCurveTo(dx - 10, dy - 90, dx + 60, dy - 60);
    c.quadraticCurveTo(dx + 10, dy - 20, dx - 40, dy); c.fill();
    c.restore();
    // 雪原
    c.fillStyle = "#dce8f2"; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) c.lineTo(x, H * 0.86 + Math.sin(x * 0.007 + 3) * H * 0.025);
    c.lineTo(W, H); c.closePath(); c.fill();
    K.vignette(c, W, H, 0.35);
  } };

  /* ---------- 流星落人间（GPT PE） ---------- */
  CGS.meteor_fall = { dur: 10, cap: "有终点的永恒", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#080e20"], [0.6, "#182444"], [1, "#3c4c74"]]);
    K.stars(c, W, H, tt, 160, 117);
    // 坠落的星
    const sp = Math.min(1, p * 1.4);
    const x = W * (0.72 - 0.5 * sp), y = H * (0.12 + 0.6 * sp);
    c.save(); c.globalCompositeOperation = "screen";
    const g = c.createRadialGradient(x, y, 2, x, y, 60);
    g.addColorStop(0, "rgba(255,250,230,.95)"); g.addColorStop(1, "rgba(255,250,230,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 60, 0, 7); c.fill();
    c.strokeStyle = "rgba(255,248,220,.8)"; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 120, y - 140); c.stroke();
    c.restore();
    // 地平线亮起
    const hz = H * 0.74;
    const g2 = c.createLinearGradient(0, hz - 60, 0, H);
    g2.addColorStop(0, "rgba(255,214,150,0)"); g2.addColorStop(1, `rgba(255,214,150,${0.16 + sp * 0.25})`);
    c.fillStyle = g2; c.fillRect(0, hz - 60, W, H - hz + 60);
    c.fillStyle = "#141c30"; c.fillRect(0, hz, W, H - hz);
    K.vignette(c, W, H, 0.4);
  } };

  /* ---------- 月光琴房（Kimi） ---------- */
  CGS.moon_piano = { dur: 10, cap: "月的缓存", sprite: { id: "kimi", x: 0.64, y: 1.06, h: 0.98, a: 0.92 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#0c1428"], [0.6, "#16224a"], [1, "#222c48"]]);
    K.moon(c, W * 0.5, H * 0.24, 46);
    c.save(); c.globalCompositeOperation = "screen";
    const g = c.createLinearGradient(W * 0.5, H * 0.24, W * 0.42, H);
    g.addColorStop(0, "rgba(180,200,255,.22)"); g.addColorStop(1, "rgba(180,200,255,0)");
    c.fillStyle = g; c.beginPath();
    c.moveTo(W * 0.44, H * 0.3); c.lineTo(W * 0.56, H * 0.3); c.lineTo(W * 0.52, H); c.lineTo(W * 0.3, H); c.closePath(); c.fill();
    c.restore();
    // 钢琴剪影与四手
    c.save(); c.translate(W * 0.5, H * 0.8); c.scale(1.2, 1);
    c.fillStyle = "#141824";
    c.beginPath(); c.moveTo(-160, 0); c.quadraticCurveTo(-140, -78, 84, -70);
    c.quadraticCurveTo(140, -66, 158, -30); c.quadraticCurveTo(110, -16, -160, 0); c.closePath(); c.fill();
    c.fillStyle = "#e8e4da"; c.fillRect(-36, -11, 178, 8);
    c.restore();
    // 音符上升成星
    const r = K.rng(7);
    c.save(); c.globalAlpha = 0.8;
    for (let i = 0; i < 12; i++) {
      const ph = (r() + tt * 0.09 + i * 0.08) % 1;
      const x = W * (0.3 + r() * 0.4 + Math.sin(tt * 0.5 + i) * 0.03), y = H * 0.72 - ph * H * 0.5;
      c.globalAlpha = (1 - ph) * 0.9; c.fillStyle = "#cfd8f4"; c.font = "20px serif";
      c.fillText(["♪", "♫", "♩"][i % 3], x, y);
    }
    c.restore();
    K.vignette(c, W, H, 0.44);
  } };

  /* ---------- 忘却之海日出（Kimi PE） ---------- */
  CGS.sea_dawn = { dur: 10, cap: "忘记的勇气", painter: (c, W, H, tt, p) => {
    const lp = Math.min(1, p * 1.2);
    K.vgrad(c, W, H, [[0, `rgba(${30 + lp * 60},${40 + lp * 80},${80 + lp * 90},1)`], [0.5, `rgba(${70 + lp * 130},${80 + lp * 90},${110 + lp * 60},1)`], [1, `rgba(${100 + lp * 150},${100 + lp * 110},${110 + lp * 70},1)`]]);
    const horizon = H * 0.56;
    K.sun(c, W * 0.5, horizon - 10 - (1 - lp) * 60, 34 + lp * 20, "rgba(255,236,190,1)", W, H);
    K.sea(c, W, H, horizon, tt, "#e8a878", "#4a4868", W * 0.5);
    K.foamEdge(c, W, H, H * 0.86, tt);
    // 忘却的气泡
    const r = K.rng(13);
    for (let i = 0; i < 18; i++) {
      const ph = (r() + tt * 0.05 + i * 0.06) % 1;
      const x = W * r(), y = H - ph * H * 0.5;
      c.strokeStyle = `rgba(255,244,220,${(1 - ph) * 0.4})`; c.lineWidth = 1.4;
      c.beginPath(); c.arc(x, y, 4 + r() * 8, 0, 7); c.stroke();
    }
    K.bokeh(c, W, H, tt, "rgba(255,230,190,A", 20, 53);
    K.vignette(c, W, H, 0.3);
  } };

  /* ---------- 胶片雨（MiniMax） ---------- */
  CGS.film_rain = { dur: 10, cap: "不在画面里的人", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#1c2030"], [0.5, "#2c3044"], [1, "#22262f"]]);
    // 投影光柱
    c.save(); c.globalCompositeOperation = "screen";
    const g = c.createLinearGradient(W * 0.5, 0, W * 0.34, H);
    g.addColorStop(0, "rgba(220,230,255,.2)"); g.addColorStop(1, "rgba(220,230,255,0)");
    c.fillStyle = g; c.beginPath();
    c.moveTo(W * 0.44, 0); c.lineTo(W * 0.56, 0); c.lineTo(W * 0.72, H); c.lineTo(W * 0.24, H); c.closePath(); c.fill();
    c.restore();
    // 胶片条飘落
    const r = K.rng(23);
    for (let i = 0; i < 14; i++) {
      const x = (r() * W + Math.sin(tt * 0.6 + i * 2) * 60) % W, y = (r() * H + tt * (34 + r() * 40)) % (H + 80) - 40;
      c.save(); c.translate(x, y); c.rotate(Math.sin(tt * 0.5 + i) * 0.5);
      c.fillStyle = "rgba(30,32,40,.95)"; c.fillRect(-8, -34, 16, 68);
      c.fillStyle = "rgba(240,230,210,.85)";
      for (let h = 0; h < 5; h++) c.fillRect(-5, -30 + h * 13, 10, 8);
      c.restore();
    }
    // 雨丝
    for (let i = 0; i < 50; i++) {
      const x = (i * 131 + tt * 240) % W, y = (i * 89 + tt * 640) % H;
      c.strokeStyle = "rgba(200,220,250,.16)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 14); c.stroke();
    }
    K.vignette(c, W, H, 0.48);
  } };

  /* ---------- 镜头反转（MiniMax PE） ---------- */
  CGS.camera_turn = { dur: 10, cap: "这次，换你入画", sprite: { id: "minimax", x: 0.5, y: 1.09, h: 1.05, a: 0.95 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#f8f0e0"], [0.5, "#fce8cc"], [1, "#f0dcc0"]]);
    K.sun(c, W * 0.8, H * 0.2, 40, "rgba(255,244,210,1)", W, H);
    // 取景框
    c.strokeStyle = "rgba(60,50,40,.8)"; c.lineWidth = 3;
    [[0.08, 0.12], [0.92, 0.12], [0.08, 0.88], [0.92, 0.88]].forEach(([x, y]) => {
      c.beginPath(); c.moveTo(W * x, H * y + (y < 0.5 ? 24 : -24)); c.lineTo(W * x, H * y); c.lineTo(W * x + (x < 0.5 ? 24 : -24), H * y); c.stroke();
    });
    // REC 红点
    c.fillStyle = `rgba(220,60,60,${0.5 + 0.5 * Math.sin(tt * 4)})`;
    c.beginPath(); c.arc(W * 0.13, H * 0.16, 7, 0, 7); c.fill();
    c.fillStyle = "rgba(60,50,40,.9)"; c.font = "600 20px monospace"; c.fillText("REC 00:" + String(Math.floor(tt) % 60).padStart(2, "0"), W * 0.155, H * 0.167);
    // 光斑
    K.bokeh(c, W, H, tt, "rgba(255,220,170,A", 24, 59);
    K.vignette(c, W, H, 0.26);
  } };

  /* ---------- 深海下潜·群鲸灯（沫沫） ---------- */
  CGS.whale_fall = { dur: 12, cap: "鲸落 · 深海", sprite: { id: "momo", x: 0.52, y: 0.96, h: 0.75, a: 0.55 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#0e2a44"], [0.4, "#081c34"], [1, "#030a18"]]);
    K.godRays(c, W, H, W * 0.4, -40, tt, "rgba(110,190,240,");
    // 群鲸
    K.whaleSil(c, W * 0.5, H * 0.42, 2.2, "rgba(90,150,200,.55)", tt * 0.3);
    K.whaleSil(c, W * 0.2, H * 0.62, 1.1, "rgba(70,130,190,.4)", tt * 0.4 + 2);
    K.whaleSil(c, W * 0.8, H * 0.68, 0.8, "rgba(60,110,180,.35)", tt * 0.5 + 4);
    K.whaleSil(c, W * 0.35, H * 0.85, 0.5, "rgba(50,100,170,.28)", tt * 0.6);
    // 发光浮游
    const r = K.rng(61);
    for (let i = 0; i < 70; i++) {
      const x = (r() * W + Math.sin(tt * 0.4 + i) * 20) % W, y = (r() * H + tt * (4 + r() * 8)) % H;
      c.globalAlpha = 0.14 + 0.16 * Math.sin(tt * 1.2 + i * 2.3);
      K.circle(c, x, y, 1 + r() * 2.4, "#9adcff");
    }
    c.globalAlpha = 1;
    K.letterFloat(c, W * 0.7, H * 0.3, 1, tt, "rgba(150,210,255,.4)");
    K.letterFloat(c, W * 0.12, H * 0.55, 0.7, tt + 2, "rgba(150,210,255,.4)");
    K.vignette(c, W, H, 0.5);
  } };

  /* ---------- 满海的信（沫沫 PE / 真结局共用） ---------- */
  CGS.letters_tide = { dur: 12, cap: "拾遗潮 · 归还之夜", sprite: { id: "momo", x: 0.28, y: 1.07, h: 0.98, a: 0.85 }, painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#060f1e"], [0.45, "#0d1e3a"], [1, "#122a48"]]);
    K.stars(c, W, H, tt, 150, 127);
    K.moon(c, W * 0.6, H * 0.16, 30);
    const horizon = H * 0.5;
    // 满海信笺
    const r = K.rng(71);
    for (let i = 0; i < 22; i++) {
      K.letterFloat(c, W * ((i * 0.047 + 0.02) % 1), H * (0.52 + (i * 0.13) % 0.42), 0.7 + (i % 3) * 0.25, tt * 0.8 + i, "rgba(150,220,255,.45)");
    }
    // 潮光
    const g = c.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "rgba(60,140,200,.4)"); g.addColorStop(1, "rgba(20,60,110,.15)");
    c.fillStyle = g; c.fillRect(0, horizon, W, H - horizon);
    c.save(); c.globalCompositeOperation = "screen";
    for (let i = 0; i < 20; i++) {
      const pr = i / 20, y = horizon + Math.pow(pr, 1.5) * (H - horizon);
      c.strokeStyle = `rgba(140,225,255,${0.1 + 0.1 * Math.sin(tt * 1.8 + i * 2)})`;
      c.lineWidth = 1.6 + pr * 2;
      c.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const yy = y + Math.sin(x * 0.013 + tt * (1.3 + pr) + i) * (2 + pr * 6);
        x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
      }
      c.stroke();
    }
    c.restore();
    K.bokeh(c, W, H, tt, "rgba(150,225,255,A", 26, 131);
    K.vignette(c, W, H, 0.4);
  } };

  /* ---------- 摘纸袋 · 逆光背影（每线终幕通用） ---------- */
  CGS.reveal_moment = { dur: 9, cap: "纸袋之下", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#f8e8c8"], [0.4, "#fcecd0"], [1, "#e8d0a8"]]);
    K.sun(c, W * 0.5, H * 0.4, 60, "rgba(255,246,214,1)", W, H);
    // 逆光少年剪影
    c.save(); c.globalAlpha = 0.92;
    const swx = Math.sin(tt * 0.5) * 4;
    c.fillStyle = "rgba(40,32,26,.92)";
    c.beginPath(); c.arc(W * 0.5 + swx, H * 0.42, 26, 0, 7); c.fill();                 // 头
    c.beginPath(); c.moveTo(W * 0.5 - 42 + swx, H);                                     // 身
    c.quadraticCurveTo(W * 0.5 - 38 + swx, H * 0.58, W * 0.5 - 14 + swx, H * 0.52);
    c.lineTo(W * 0.5 + 14 + swx, H * 0.52);
    c.quadraticCurveTo(W * 0.5 + 38 + swx, H * 0.58, W * 0.5 + 42 + swx, H);
    c.closePath(); c.fill();
    // 手中的纸袋
    const bp = Math.min(1, p * 1.6);
    const bx = W * 0.5 + 60 + bp * 30, by = H * 0.62 + bp * 20;
    c.fillStyle = "rgba(190,160,110,.95)";
    c.beginPath(); c.roundRect(bx - 16, by - 22, 32, 40, 4); c.fill();
    c.strokeStyle = "rgba(120,96,60,.7)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(bx - 10, by - 22); c.lineTo(bx + 10, by - 22); c.stroke();
    c.restore();
    // 光尘
    K.bokeh(c, W, H, tt, "rgba(255,240,200,A", 26, 137);
    K.vignette(c, W, H, 0.3);
  } };

  /* ---------- 七帆同渡（真结局） ---------- */
  CGS.seven_sails = { dur: 12, cap: "方舟 · 七帆", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#081226"], [0.5, "#122040"], [1, "#1c3054"]]);
    K.stars(c, W, H, tt, 200, 139);
    K.moon(c, W * 0.5, H * 0.18, 38);
    // 七道光帆渡海
    const cols = ["#6f8fe8", "#5f74d8", "#9aa8c8", "#c8cede", "#a8b4ea", "#f0a06a", "#6ab0d8"];
    const horizon = H * 0.52;
    cols.forEach((col, i) => {
      const ph = (i / 7 + tt * 0.03) % 1;
      const x = W * (-0.1 + ph * 1.2), y = horizon + 24 + Math.sin(tt * 0.8 + i * 1.5) * 8 + i * 6;
      c.save(); c.globalCompositeOperation = "screen";
      const g = c.createLinearGradient(x, y - 70, x, y);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, col);
      c.fillStyle = g;
      c.beginPath(); c.moveTo(x - 20, y); c.quadraticCurveTo(x, y - 74, x + 20, y); c.closePath(); c.fill();
      c.globalAlpha = 0.4; K.circle(c, x, y - 30, 26, col);
      c.restore();
    });
    const g2 = c.createLinearGradient(0, horizon, 0, H);
    g2.addColorStop(0, "rgba(50,100,170,.35)"); g2.addColorStop(1, "rgba(16,40,80,.15)");
    c.fillStyle = g2; c.fillRect(0, horizon, W, H - horizon);
    K.bokeh(c, W, H, tt, "rgba(160,220,255,A", 30, 141);
    K.vignette(c, W, H, 0.38);
  } };

  /* ---------- 小舟之句（真结局终幕） ---------- */
  CGS.funane_msg = { dur: 12, cap: "「等花开了，我们就去看海吧——替我看。」", painter: (c, W, H, tt, p) => {
    K.vgrad(c, W, H, [[0, "#0a1626"], [0.5, "#14223e"], [1, "#20344e"]]);
    K.stars(c, W, H, tt, 130, 149);
    const horizon = H * 0.55;
    K.sun(c, W * 0.5, horizon - 30, 26, "rgba(255,240,210,.9)", W, H);
    K.sea(c, W, H, horizon, tt, "#4a6a94", "#182c48", W * 0.5);
    // 小船灯
    const bx = W * 0.5 + Math.sin(tt * 0.3) * 14, by = horizon + 26 + Math.sin(tt * 0.8) * 4;
    c.fillStyle = "rgba(40,44,58,.95)";
    c.beginPath(); c.moveTo(bx - 22, by); c.quadraticCurveTo(bx, by + 12, bx + 22, by); c.lineTo(bx + 14, by - 8); c.lineTo(bx - 14, by - 8); c.closePath(); c.fill();
    const g = c.createRadialGradient(bx, by - 16, 2, bx, by - 16, 34);
    g.addColorStop(0, "rgba(255,232,170,.9)"); g.addColorStop(1, "rgba(255,232,170,0)");
    c.fillStyle = g; c.beginPath(); c.arc(bx, by - 16, 34, 0, 7); c.fill();
    K.letterFloat(c, W * 0.24, H * 0.72, 1, tt, "rgba(180,230,255,.5)");
    K.letterFloat(c, W * 0.74, H * 0.66, 0.8, tt + 2, "rgba(180,230,255,.5)");
    K.bokeh(c, W, H, tt, "rgba(255,235,190,A", 20, 151);
    K.vignette(c, W, H, 0.4);
  } };

  /* ---------- 个人线海报 ---------- */
  const posterEl = document.getElementById("poster");
  const posterCv = document.getElementById("poster-canvas");
  const pctx = posterCv.getContext("2d");
  let posterActive = false, posterCb = null, posterTimer = null, posterSeed = Math.random() * 99;

  function playPoster(routeId, onEnd) {
    const P = (window.POSTERS || {})[routeId];
    const ch = window.CHARS[routeId];
    if (!P || !ch) { onEnd(); return; }
    SaveSys.markCG("poster_" + routeId);
    posterActive = true; posterCb = onEnd;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    posterCv.width = innerWidth * dpr; posterCv.height = innerHeight * dpr;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    posterEl.classList.remove("hidden");
    requestAnimationFrame(() => posterEl.classList.add("show"));
    drawPoster(routeId, P, ch);
    clearTimeout(posterTimer);
    posterTimer = setTimeout(() => endPoster(), 4200);
  }
  function drawPoster(rid, P, ch) {
    const W = innerWidth, H = innerHeight, c = pctx;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#04060c"); g.addColorStop(0.62, ch.dark); g.addColorStop(1, "#04060c");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const t = (performance.now() - posterSeed * 100) / 1000;
    // 主题色装饰环
    c.save(); c.strokeStyle = ch.color; c.globalAlpha = 0.22;
    [[0.74, 0.5, 0.42], [0.74, 0.5, 0.55], [0.74, 0.5, 0.30]].forEach(([px, py, r], i) => {
      c.lineWidth = i === 2 ? 1 : 2;
      c.beginPath(); c.ellipse(W * px + Math.sin(t * 0.4 + i) * 6, H * py, W * r * 0.55, H * r * 0.72, 0, 0, 7); c.stroke();
    });
    c.globalAlpha = 0.1;
    K.circle(c, W * 0.74, H * 0.48, W * 0.2, ch.color);
    c.restore();
    // 粒子光尘
    c.save(); c.globalCompositeOperation = "screen";
    const r = K.rng(199);
    for (let i = 0; i < 46; i++) {
      const x = (r() * W + t * 7 * (0.3 + r())) % W, y = (r() * H + t * 11) % H;
      c.globalAlpha = 0.16 + 0.2 * Math.sin(t * 1.4 + i * 2.1);
      K.circle(c, x, y, 1 + r() * 2, "#cfe0ff");
    }
    c.restore();
    // 立绘
    drawSprite(c, rid, W * 0.74, H * 1.02, H * 0.9, 0.97);
    // 左侧文字块
    c.save(); c.textAlign = "left";
    c.fillStyle = ch.color; c.font = "600 17px sans-serif";
    c.fillText("个 人 线 · " + P.tag, W * 0.09, H * 0.3);
    c.fillStyle = "#f2f6ff"; c.font = `300 ${Math.min(64, W * 0.055)}px 'Songti SC','SimSun',serif`;
    c.fillText(P.title, W * 0.09, H * 0.42);
    c.strokeStyle = ch.color; c.globalAlpha = 0.8; c.lineWidth = 2;
    c.beginPath(); c.moveTo(W * 0.09, H * 0.465); c.lineTo(W * 0.32, H * 0.465); c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = "#9fb6dd"; c.font = "300 17px 'Songti SC','SimSun',serif";
    c.fillText(P.quote, W * 0.09, H * 0.53);
    c.fillStyle = "rgba(210,222,242,.5)"; c.font = "300 12px sans-serif";
    c.fillText("TIDE OF LOST THINGS · " + ch.name.toUpperCase(), W * 0.09, H * 0.9);
    c.restore();
  }
  function endPoster() {
    if (!posterActive) return;
    posterActive = false;
    clearTimeout(posterTimer);
    posterEl.classList.remove("show");
    setTimeout(() => posterEl.classList.add("hidden"), 620);
    const cb = posterCb; posterCb = null;
    if (cb) setTimeout(cb, 240);
  }
  posterEl.addEventListener("click", () => {
    if (!posterActive) return;
    window.AudioSys.playSE("confirm");
    endPoster();
  });

  /* ---------- 播放接口 ---------- */
  function play(id, onEnd) {
    const cg = CGS[id];
    if (!cg) { if (onEnd) onEnd(); return; }
    R.active = true; R.dur = cg.dur; R.t0 = performance.now();
    R.painter = cg.painter; R.caption = cg.cap || ""; R.onEnd = onEnd; R.cg = cg;
    if (window.AudioSys) { AudioSys.playSE("tide"); }
  }
  function tick() {
    if (!R.active) return;
    const el = (performance.now() - R.t0) / 1000;
    const p = Math.min(1, el / R.dur);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    R.painter(ctx, innerWidth, innerHeight, el, p);
    if (R.cg && R.cg.sprite) {
      const s2 = R.cg.sprite;
      drawSprite(ctx, s2.id, innerWidth * s2.x, innerHeight * s2.y, innerHeight * s2.h, s2.a);
    }
    letterbox(ctx, innerWidth, innerHeight, p);
    if (R.caption) captionBar(ctx, innerWidth, innerHeight, R.caption, p);
    if (p >= 1) {
      R.active = false;
      // 淡出并清屏，避免最后一帧残影留在后续场景上
      cv.style.transition = "opacity .8s";
      cv.style.opacity = "0";
      const cb = R.onEnd;
      R.onEnd = null;
      if (cb) cb();
      setTimeout(() => {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        cv.style.transition = "";
        cv.style.opacity = "1";
      }, 850);
    }
  }
  function skip() {
    if (!R.active) return;
    R.active = false;
    cv.style.transition = "opacity .4s";
    cv.style.opacity = "0";
    const cb = R.onEnd;
    R.onEnd = null;
    setTimeout(() => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      cv.style.transition = "";
      cv.style.opacity = "1";
    }, 450);
    if (cb) cb();
  }

  /* ---------- OP 开场动画 ---------- */
  const opEl = document.getElementById("op-screen");
  const opCv = document.getElementById("op-canvas");
  const opCtx = opCv.getContext("2d");
  let opActive = false, opT0 = 0, opOnEnd = null;
  function opResize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    opCv.width = innerWidth * dpr; opCv.height = innerHeight * dpr;
    opCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  opResize(); window.addEventListener("resize", opResize);

  const OP_DUR = 34;
  function playOP(onEnd) {
    opActive = true; opT0 = performance.now(); opOnEnd = onEnd;
    opEl.classList.remove("hidden");
    if (window.AudioSys) AudioSys.playBGM("op");
  }
  function endOP() {
    opActive = false; opEl.classList.add("hidden");
    if (window.AudioSys) AudioSys.stopBGM(1);
    if (opOnEnd) opOnEnd();
  }
  document.getElementById("op-skip").addEventListener("click", endOP);

  function opTick() {
    if (!opActive) return;
    const t = (performance.now() - opT0) / 1000;
    const p = t / OP_DUR;
    const W = innerWidth, H = innerHeight, c = opCtx;
    c.clearRect(0, 0, W, H);
    // 阶段1（0-6s）：深海，纸袋下沉
    if (p < 0.18) {
      const q = p / 0.18;
      K.vgrad(c, W, H, [[0, "#0e2a44"], [0.5, "#081c34"], [1, "#030a18"]]);
      K.godRays(c, W, H, W * 0.5, -40, t, "rgba(110,190,240,");
      const y = H * (0.2 + q * 0.6), x = W / 2 + Math.sin(t * 0.8) * 26;
      c.save(); c.translate(x, y); c.rotate(Math.sin(t * 0.6) * 0.25);
      // 一只白色折纸船
      c.fillStyle = "rgba(246,242,230,.96)";
      c.beginPath(); c.moveTo(-30, 12); c.lineTo(30, 12); c.lineTo(14, -2); c.lineTo(-14, -2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-14, -2); c.lineTo(0, -30); c.lineTo(14, -2); c.closePath(); c.fill();
      c.strokeStyle = "rgba(160,170,190,.7)"; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -2); c.stroke();
      c.restore();
      const r = K.rng(3);
      for (let i = 0; i < 40; i++) {
        const px = (r() * W + Math.sin(t * 0.4 + i) * 20) % W, py = (r() * H + t * 8) % H;
        c.globalAlpha = 0.2; K.circle(c, px, py, 1.4, "#9adcff");
      }
      c.globalAlpha = 1;
      opText(c, W, H, "三年前，一句没说完的话，", q, 0.1);
      opText(c, W, H, "沉入了海的深处。", q, 0.45);
    }
    // 阶段2（6-12s）：城市黄昏+剪影少女们
    else if (p < 0.36) {
      const q = (p - 0.18) / 0.18;
      K.vgrad(c, W, H, [[0, "#5a6aa8"], [0.4, "#c87888"], [0.62, "#f0a868"], [1, "#f8cc98"]]);
      K.sun(c, W * 0.5, H * 0.5, 50, "rgba(255,220,150,1)", W, H);
      K.buildings(c, W, H, H * 0.68, 161, "rgba(60,44,64,.9)", null, H * 0.3, false);
      K.sea(c, W, H * 0.68, H, t, "#e09868", "#4a3858", W * 0.5);
      opText(c, W, H, "而这座城市，藏着最后的七位「她」。", q, 0.15);
    }
    // 阶段3（12-26s）：七帆登场闪影
    else if (p < 0.78) {
      const names = [["千问", "#6f8fe8"], ["文心", "#5f74d8"], ["GLM", "#9aa8c8"], ["GPT", "#c8cede"], ["Kimi", "#a8b4ea"], ["MiniMax", "#f0a06a"], ["沫沫", "#6ab0d8"]];
      const q = (p - 0.36) / 0.42;
      const idx = Math.min(6, Math.floor(q * 7));
      const inQ = (q * 7) % 1;
      const [nm, col] = names[idx];
      K.vgrad(c, W, H, [[0, "#0a1224"], [1, "#16223e"]]);
      K.stars(c, W, H, t, 120, 163);
      // 色光晕背景
      const g = c.createRadialGradient(W / 2, H * 0.44, 10, W / 2, H * 0.44, W * 0.5);
      g.addColorStop(0, col.replace(")", ",.22)").replace("#", "rgba(").replace(/rgba\((..)(..)(..)/, (m, r, gg, b) => `rgba(${parseInt(r, 16)},${parseInt(gg, 16)},${parseInt(b, 16)}`));
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 名字大字
      c.save();
      c.globalAlpha = Math.sin(inQ * Math.PI);
      c.fillStyle = "#f0ead8"; c.font = `300 ${Math.min(120, W * 0.09)}px 'Songti SC','SimSun',serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(nm, W / 2, H * 0.46);
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.moveTo(W * 0.3, H * 0.58); c.lineTo(W * 0.7, H * 0.58); c.stroke();
      c.restore();
      // 立绘剪影渐显（用已加载图）
      drawSpriteSil(c, W, H, idx, inQ, t);
    }
    // 阶段4（26-34s）：标题
    else {
      const q = (p - 0.78) / 0.22;
      K.vgrad(c, W, H, [[0, "#060c1c"], [1, "#0e1c34"]]);
      K.stars(c, W, H, t, 200, 167);
      // 潮光
      c.save(); c.globalCompositeOperation = "screen";
      for (let i = 0; i < 14; i++) {
        const y = H * (0.5 + i * 0.036);
        c.strokeStyle = `rgba(120,200,255,${0.06 * Math.sin(t * 1.2 + i) + 0.05})`;
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= W; x += 30) {
          const yy = y + Math.sin(x * 0.01 + t + i) * 6;
          x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
        }
        c.stroke();
      }
      c.restore();
      c.save(); c.globalAlpha = Math.min(1, q * 2.4);
      c.fillStyle = "#f2f6ff"; c.textAlign = "center";
      c.font = `300 ${Math.min(110, W * 0.1)}px 'Songti SC','SimSun',serif`;
      c.fillText("拾 遗 潮", W / 2, H * 0.46);
      c.font = "300 16px sans-serif"; c.fillStyle = "#9db4dc";
      c.fillText("T I D E   O F   L O S T   T H I N G S", W / 2, H * 0.56);
      c.restore();
    }
    if (p >= 1) endOP();
  }
  function opText(c, W, H, text, q, delay) {
    const a = Math.max(0, Math.min(1, (q - delay) * 3)) * Math.max(0, 1 - Math.max(0, (q - delay) - 0.42) * 2.2);
    if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    c.fillStyle = "#e8ecf4"; c.font = "300 24px 'Songti SC','SimSun',serif"; c.textAlign = "center";
    c.fillText(text, W / 2, H * 0.8);
    c.restore();
  }
  const silCache = {};
  function drawSpriteSil(c, W, H, idx, q, t) {
    const ids = ["qwen", "ernie", "glm", "gpt", "kimi", "minimax", "momo"];
    const id = ids[idx];
    if (!silCache[id]) {
      const ch = window.CHARS[id];
      if (!ch || !ch.sprite) return;
      const im = new Image();
      silCache[id] = im; im.src = ch.sprite;
    }
    const im = silCache[id];
    if (!im.complete || !im.naturalWidth) return;
    const h = H * 0.8, w = im.naturalWidth / im.naturalHeight * h;
    c.save();
    c.globalAlpha = 0.5 * Math.sin(q * Math.PI);
    c.filter = "grayscale(1) brightness(1.6)";
    c.globalCompositeOperation = "screen";
    c.drawImage(im, W / 2 - w / 2 + Math.sin(t * 0.7) * 8, H - h + 10, w, h);
    c.restore();
  }

  return { play, tick, skip, playOP, opTick, playPoster, drawSprite, get active() { return R.active; }, get opActive() { return opActive; }, CGS };
})();
