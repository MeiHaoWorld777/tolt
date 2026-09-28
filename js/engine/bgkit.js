/* ============ 背景绘制工具库 ============ */
window.BGKit = (function () {
  function rng(seed) { let a = seed | 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function vgrad(ctx, W, H, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); }
  function glowCircle(ctx, x, y, r, color, glowR) {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, glowR);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, glowR, 0, 7); ctx.fill();
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g2.addColorStop(0, color.replace(/[\d.]+\)$/, "1)")); g2.addColorStop(1, "rgba(0,0,0,0)");
  }
  function sun(ctx, x, y, r, color, W, H) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, color); g.addColorStop(0.25, color.replace(/,1\)/, ",.55)")); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    circle(ctx, x, y, r, color.replace(/,1\)/, ",.95)"));
  }
  function moon(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
    g.addColorStop(0, "rgba(220,230,255,.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    circle(ctx, x, y, r, "#e8edf8");
    circle(ctx, x - r * 0.38, y - r * 0.22, r * 0.82, "rgba(200,212,235,.55)"); // 弯月遮挡
  }
  function stars(ctx, W, H, t, n, seed, maxY) {
    maxY = maxY || 0.75;
    const r = rng(seed || 7);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H * maxY, s = r();
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.4 + s) + i * 1.7));
      ctx.globalAlpha = tw * (0.35 + s * 0.6);
      circle(ctx, x, y, 0.6 + s * 1.5, "#dfe8ff");
    }
    ctx.restore();
  }
  function shootingStar(ctx, W, H, t, period) {
    const p = (t % period) / period;
    if (p > 0.22) return;
    const q = p / 0.22, x = W * (0.25 + q * 0.55), y = H * (0.08 + q * 0.3);
    ctx.save(); ctx.globalAlpha = Math.sin(q * Math.PI); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 90, y - 46); ctx.stroke(); ctx.restore();
  }
  function cloud(ctx, x, y, s, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    [[0, 0, 46], [40, -12, 34], [-42, -6, 30], [18, 14, 30], [-16, 12, 26]].forEach(c => {
      ctx.beginPath(); ctx.ellipse(x + c[0] * s, y + c[1] * s, c[2] * s, c[2] * s * 0.62, 0, 0, 7); ctx.fill();
    });
    ctx.restore();
  }
  function clouds(ctx, W, H, t, color, n, speed, seed, yMax) {
    const r = rng(seed || 3);
    for (let i = 0; i < n; i++) {
      const bx = r() * W * 1.3, y = H * (0.06 + r() * (yMax || 0.3)), s = 0.7 + r() * 1.5;
      const x = ((bx + t * speed * (0.5 + s * 0.4)) % (W * 1.3)) - W * 0.15;
      cloud(ctx, x, y, s, color, 0.16 + r() * 0.2);
    }
  }
  function sea(ctx, W, H, horizon, t, topColor, deepColor, sunX) {
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, topColor); g.addColorStop(1, deepColor);
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
    // 波光带
    ctx.save(); ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 26; i++) {
      const p = i / 26, y = horizon + Math.pow(p, 1.7) * (H - horizon);
      const amp = 2 + p * 7, yoff = Math.sin(t * (0.8 + p) + i * 2.2) * amp;
      const alpha = 0.05 + 0.1 * (1 - p);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1 + p * 2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const yy = y + Math.sin(x * 0.012 + t * (1 + p * 1.6) + i) * amp * 0.6 + yoff * 0.4;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // 太阳/月亮倒影
    if (sunX != null) {
      for (let i = 0; i < 18; i++) {
        const p = i / 18, y = horizon + 8 + Math.pow(p, 1.5) * (H - horizon) * 0.85;
        const w = (14 + p * 90) * (0.6 + 0.4 * Math.sin(t * 2 + i * 3));
        ctx.globalAlpha = 0.16 * (1 - p * 0.6);
        ctx.fillStyle = "#fff2d8";
        ctx.fillRect(sunX - w / 2 + Math.sin(t * 1.2 + i * 2.4) * 10 * p, y, w, 2.4 + p * 3);
      }
    }
    ctx.restore();
  }
  function foamEdge(ctx, W, H, yBase, t) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.beginPath(); ctx.moveTo(0, yBase + 14);
    for (let x = 0; x <= W; x += 18) {
      const y = yBase + Math.sin(x * 0.02 + t * 2.4) * 4 + Math.sin(x * 0.05 - t * 3.1) * 2.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, yBase + 14); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function sand(ctx, W, H, y, c1, c2) {
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
  }
  function buildings(ctx, W, H, baseY, seed, color, windowColor, maxH, night) {
    const r = rng(seed);
    let x = -20;
    while (x < W + 20) {
      const bw = 30 + r() * 70, bh = (maxH || H * 0.3) * (0.35 + r() * 0.75);
      ctx.fillStyle = color;
      ctx.fillRect(x, baseY - bh, bw, bh + 10);
      if (night && windowColor) {
        const cols = Math.max(1, Math.floor(bw / 14)), rows = Math.max(1, Math.floor(bh / 18));
        for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
          if (r() < 0.34) {
            ctx.fillStyle = windowColor;
            ctx.globalAlpha = 0.5 + r() * 0.5;
            ctx.fillRect(x + 5 + cx * 14, baseY - bh + 7 + cy * 18, 5, 7);
            ctx.globalAlpha = 1;
          }
        }
      }
      x += bw + 4 + r() * 26;
    }
  }
  function hill(ctx, W, H, baseY, amp, color, seed) {
    const r = rng(seed || 11);
    const pts = []; for (let i = 0; i <= 8; i++) pts.push(baseY - r() * amp);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * W, y = pts[i];
      i === 0 ? ctx.lineTo(x, y) : ctx.quadraticCurveTo(((i - 0.5) / 8) * W, (pts[i - 1] + y) / 2 - amp * 0.2, x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  function ground(ctx, W, H, y, c1, c2) {
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
  }
  function roadLines(ctx, W, H, y, t, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([26, 30]);
    ctx.lineDashOffset = -t * 26;
    ctx.beginPath(); ctx.moveTo(0, y + (H - y) * 0.55); ctx.lineTo(W, y + (H - y) * 0.55); ctx.stroke();
    ctx.setLineDash([]);
  }
  function tree(ctx, x, y, s, leaf, trunk, sway) {
    ctx.fillStyle = trunk; ctx.fillRect(x - 4 * s, y - 46 * s, 8 * s, 46 * s);
    const r = rng(x | 0);
    ctx.fillStyle = leaf;
    [[0, -66, 30], [-20, -52, 22], [20, -54, 24], [-8, -84, 20], [12, -80, 18]].forEach(c => {
      ctx.beginPath();
      ctx.ellipse(x + c[0] * s + Math.sin(sway) * 3, y + c[1] * s, c[2] * s, c[2] * s * 0.85, 0, 0, 7); ctx.fill();
    });
  }
  function sakuraTree(ctx, x, y, s, sway, t) {
    tree(ctx, x, y, s, "#e6a9c5", "#5c4650", sway);
    const r = rng(x * 3 | 0);
    ctx.fillStyle = "rgba(255,214,232,.8)";
    for (let i = 0; i < 22; i++) {
      const px = x + (r() - 0.5) * 70 * s, py = y - (30 + r() * 66) * s;
      circle(ctx, px + Math.sin(sway + i) * 2, py, 2.2 + r() * 2, `rgba(255,${210 + r() * 30},${225 + r() * 25},.85)`);
    }
  }
  function lanternString(ctx, W, y, t, n, c1, c2) {
    ctx.strokeStyle = "rgba(60,50,60,.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y - 20); ctx.quadraticCurveTo(W / 2, y + 26, W, y - 20); ctx.stroke();
    for (let i = 1; i < n; i++) {
      const p = i / n, x = p * W;
      const sag = Math.sin(p * Math.PI) * 44;
      const ly = y - 20 + sag * (1 - Math.abs(p - 0.5)) + 18;
      const sway = Math.sin(t * 1.1 + i) * 2;
      const g = ctx.createRadialGradient(x + sway, ly + 8, 2, x + sway, ly + 8, 26);
      g.addColorStop(0, c1); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + sway, ly + 8, 26, 0, 7); ctx.fill();
      ctx.fillStyle = c2 || "#ff9a56";
      ctx.beginPath(); ctx.ellipse(x + sway, ly + 8, 7, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(80,40,30,.9)"; ctx.fillRect(x + sway - 3.4, ly - 3, 6.8, 3.4); ctx.fillRect(x + sway - 3.4, ly + 15.6, 6.8, 3.4);
    }
  }
  function ferris(ctx, cx, cy, R, t, color, cabinColor, night) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-R * 0.55, R * 0.95); ctx.lineTo(0, 0); ctx.lineTo(R * 0.55, R * 0.95); ctx.stroke();
    const rot = t * 0.12;
    for (let i = 0; i < 12; i++) {
      const a = rot + (i / 12) * Math.PI * 2;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
      circle(ctx, Math.cos(a) * R, Math.sin(a) * R, 3.4, night ? "#ffd9a8" : color);
      const hx = Math.cos(a) * R, hy = Math.sin(a) * R;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 14); ctx.stroke();
      ctx.fillStyle = cabinColor;
      ctx.beginPath(); ctx.roundRect(hx - 9, hy + 14, 18, 15, 3); ctx.fill();
      if (night) { const g = ctx.createRadialGradient(hx, hy + 20, 2, hx, hy + 20, 30); g.addColorStop(0, "rgba(255,200,120,.5)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy + 20, 30, 0, 7); ctx.fill(); }
    }
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, 7); ctx.stroke();
    ctx.restore();
  }
  function carousel(ctx, cx, groundY, t, s) {
    s = s || 1;
    ctx.save(); ctx.translate(cx, groundY);
    // 顶棚
    const g = ctx.createLinearGradient(0, -150 * s, 0, -100 * s);
    g.addColorStop(0, "#f8e3c8"); g.addColorStop(1, "#e3a9a0");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-110 * s, -100 * s); ctx.lineTo(0, -160 * s); ctx.lineTo(110 * s, -100 * s);
    ctx.quadraticCurveTo(0, -84 * s, -110 * s, -100 * s); ctx.fill();
    ["#e86a7a", "#f2b04d", "#6aa8e0", "#8fce9a"].forEach((c, i) => {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo((i - 2) * 55 * s, -100 * s); ctx.lineTo((i - 1.5) * 55 * s, -130 * s); ctx.lineTo((i - 1) * 55 * s, -100 * s); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = "#a06a4a"; ctx.fillRect(-8 * s, -214 * s, 16 * s, 58 * s); circle(ctx, 0, -216 * s, 10 * s, "#f2b04d");
    // 灯
    for (let i = 0; i < 9; i++) {
      const lx = -96 * s + i * 24 * s;
      const g2 = ctx.createRadialGradient(lx, -92 * s, 1, lx, -92 * s, 16);
      g2.addColorStop(0, "rgba(255,224,150,.9)"); g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(lx, -92 * s, 16, 0, 7); ctx.fill();
    }
    // 中央柱与马
    ctx.fillStyle = "#c8a068"; ctx.fillRect(-10 * s, -100 * s, 20 * s, 100 * s);
    for (let i = 0; i < 3; i++) {
      const ph = t * 1.4 + i * 2.1, y = -14 * s + Math.sin(ph) * 22 * s;
      const px = (i - 1) * 58 * s;
      ctx.strokeStyle = "#e8d8b8"; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(px, -96 * s); ctx.lineTo(px, y - 20 * s); ctx.stroke();
      ctx.save(); ctx.translate(px, y); ctx.scale(s, s);
      ctx.fillStyle = ["#f0f0f0", "#e8c8d8", "#c8d8f0"][i];
      ctx.beginPath(); ctx.ellipse(0, 0, 17, 8, -0.2, 0, 7); ctx.fill();          // 身
      ctx.beginPath(); ctx.ellipse(14, -12, 6.5, 5.5, 0.4, 0, 7); ctx.fill();     // 头
      ctx.beginPath(); ctx.moveTo(11, -17); ctx.lineTo(9, -23); ctx.lineTo(14, -19); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-8, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(10, 20); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(90,60,40,.9)";
    ctx.beginPath(); ctx.ellipse(0, 4 * s, 120 * s, 14 * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function roomBase(ctx, W, H, wallTop, wallBot, floorC) {
    vgrad(ctx, W, H * 0.72, [[0, wallTop], [1, wallBot]]);
    const g = ctx.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, floorC[0]); g.addColorStop(1, floorC[1]);
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    // 地板透视
    ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1.5;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2 + i * W * 0.11, H); ctx.lineTo(W / 2 + i * W * 0.035, H * 0.72); ctx.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const y = H * (0.72 + 0.28 * Math.pow(i / 5, 1.6));
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,.14)"; ctx.fillRect(0, H * 0.715, W, 6);
  }
  function windowLight(ctx, x, y, w, h, sky, t) {
    ctx.fillStyle = "#3a3226"; ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#3a3226"; ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    // 洒进来的光
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.2 + 0.04 * Math.sin(t);
    const g2 = ctx.createLinearGradient(x, y + h, x + w * 0.4, H_g);
    g2.addColorStop(0, "rgba(255,244,214,.8)"); g2.addColorStop(1, "rgba(255,244,214,0)");
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w * 1.5, H_g); ctx.lineTo(x + w * 0.1, H_g); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  let H_g = 0;
  function setH(h) { H_g = h; }
  function deskRows(ctx, W, H, t, dark) {
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const p = (r + 1) / (rows + 1);
      const y = H * (0.56 + p * 0.34), sc = 0.6 + p * 0.75;
      for (let c = -2; c <= 2; c++) {
        const x = W / 2 + c * W * 0.17 * sc;
        ctx.fillStyle = dark ? "rgba(70,72,92,.9)" : "rgba(168,140,104,.95)";
        ctx.beginPath(); ctx.roundRect(x - 62 * sc, y, 124 * sc, 12 * sc, 3); ctx.fill();
        ctx.fillStyle = dark ? "rgba(50,52,68,.9)" : "rgba(120,96,66,.95)";
        ctx.fillRect(x - 56 * sc, y + 12 * sc, 8 * sc, 34 * sc);
        ctx.fillRect(x + 48 * sc, y + 12 * sc, 8 * sc, 34 * sc);
      }
    }
  }
  function blackboard(ctx, W, H) {
    const bw = W * 0.46, bh = H * 0.24, x = W * 0.27, y = H * 0.14;
    ctx.fillStyle = "#5c4a38"; ctx.fillRect(x - 12, y - 12, bw + 24, bh + 24);
    ctx.fillStyle = "#2e4438"; ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 10, y + 16 + i * 14); ctx.lineTo(x + bw - 20 - Math.random() * 60, y + 16 + i * 14); ctx.stroke(); }
    ctx.fillStyle = "#8a6a4a"; ctx.fillRect(x - 12, y + bh + 12, bw + 24, 8);
  }
  function bookshelf(ctx, x, y, w, h, seed, warm) {
    ctx.fillStyle = warm ? "#6a4e38" : "#4a4258"; ctx.fillRect(x, y, w, h);
    const r = rng(seed);
    const shelves = Math.floor(h / 46);
    for (let s2 = 0; s2 < shelves; s2++) {
      const sy = y + 10 + s2 * 46;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x + 4, sy + 34, w - 8, 4);
      let bx = x + 8;
      while (bx < x + w - 14) {
        const bw2 = 6 + r() * 9, bh2 = 22 + r() * 10;
        const hue = warm ? 20 + r() * 30 : 200 + r() * 60;
        ctx.fillStyle = `hsla(${hue},${30 + r() * 30}%,${28 + r() * 26}%,.95)`;
        ctx.fillRect(bx, sy + 34 - bh2, bw2, bh2);
        bx += bw2 + 2;
        if (r() < 0.1) bx += 8;
      }
    }
  }
  function bokeh(ctx, W, H, t, color, n, seed) {
    const r = rng(seed || 5);
    ctx.save(); ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, s = 6 + r() * 26;
      const a = 0.04 + 0.05 * Math.sin(t * 0.7 + i * 2.4);
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, color.replace("A", a.toFixed(3))); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function vignette(ctx, W, H, s) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(4,6,12,${s})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function godRays(ctx, W, H, x, y, t, color) {
    ctx.save(); ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.18 + Math.sin(t * 0.3 + i) * 0.02;
      const len = Math.max(W, H) * 1.2;
      const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      const al = 0.05 + 0.03 * Math.sin(t * 0.5 + i * 1.3);
      g.addColorStop(0, (color || "rgba(180,220,255,") + al + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - 0.035) * len, y + Math.sin(a - 0.035) * len);
      ctx.lineTo(x + Math.cos(a + 0.035) * len, y + Math.sin(a + 0.035) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function lighthouse(ctx, x, y, h, t, beamOn) {
    ctx.fillStyle = "#d8d2c4"; ctx.beginPath();
    ctx.moveTo(x - 16, y); ctx.lineTo(x - 11, y - h); ctx.lineTo(x + 11, y - h); ctx.lineTo(x + 16, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#a8443c"; ctx.fillRect(x - 13, y - h * 0.55, 26, h * 0.14);
    ctx.fillStyle = "#3c4654"; ctx.beginPath(); ctx.moveTo(x - 14, y - h); ctx.lineTo(x - 18, y - h - 16); ctx.lineTo(x + 18, y - h - 16); ctx.lineTo(x + 14, y - h); ctx.closePath(); ctx.fill();
    const ly = y - h - 6;
    circle(ctx, x, ly, 6, beamOn ? "#ffe9a8" : "#8890a0");
    if (beamOn) {
      ctx.save(); ctx.globalCompositeOperation = "screen";
      const a = Math.sin(t * 0.5) * 0.9;
      const len = Math.max(600, h * 3);
      const g = ctx.createLinearGradient(x, ly, x + Math.cos(a) * len, ly + Math.sin(a) * len * 0.4);
      g.addColorStop(0, "rgba(255,236,170,.35)"); g.addColorStop(1, "rgba(255,236,170,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x, ly);
      ctx.lineTo(x + Math.cos(a - 0.06) * len, ly + Math.sin(a - 0.06) * len * 0.4);
      ctx.lineTo(x + Math.cos(a + 0.06) * len, ly + Math.sin(a + 0.06) * len * 0.4);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  function signGlow(ctx, x, y, w, h, color, t, text) {
    ctx.fillStyle = "rgba(20,18,30,.95)"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
    const flick = 0.85 + 0.15 * Math.sin(t * 7 + x);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, color); g.addColorStop(1, color.replace("1)", "0.6)"));
    ctx.save(); ctx.globalAlpha = flick;
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 5); ctx.stroke();
    if (text) {
      ctx.fillStyle = color; ctx.font = `600 ${Math.floor(h * 0.5)}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    }
    ctx.restore();
    const g2 = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w);
    g2.addColorStop(0, color.replace(",1)", ",.22)")); g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w, 0, 7); ctx.fill();
  }
  function whaleSil(ctx, x, y, s, color, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 0.4) * 0.06);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.quadraticCurveTo(-30, -26, 20, -18);
    ctx.quadraticCurveTo(58, -12, 64, 2);
    ctx.quadraticCurveTo(40, 16, 0, 16);
    ctx.quadraticCurveTo(-40, 18, -60, 0);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(-58, -2); ctx.lineTo(-84, -20); ctx.lineTo(-76, 0); ctx.lineTo(-86, 14); ctx.closePath(); ctx.fill();
    circle(ctx, 42, -4, 2.4, "rgba(220,240,255,.7)");
    ctx.restore();
  }
  function letterFloat(ctx, x, y, s, t, color) {
    ctx.save(); ctx.translate(x, y + Math.sin(t + x) * 5); ctx.rotate(Math.sin(t * 0.6 + x * 0.01) * 0.2); ctx.scale(s, s);
    ctx.fillStyle = "rgba(250,246,232,.96)";
    ctx.beginPath(); ctx.roundRect(-16, -11, 32, 22, 2); ctx.fill();
    ctx.fillStyle = color || "rgba(120,140,190,.7)";
    ctx.fillRect(-11, -6, 22, 2); ctx.fillRect(-11, -1, 16, 2); ctx.fillRect(-11, 4, 19, 2);
    ctx.restore();
  }
  return { rng, vgrad, circle, glowCircle, sun, moon, stars, shootingStar, cloud, clouds, sea, foamEdge, sand,
           buildings, hill, ground, roadLines, tree, sakuraTree, lanternString, ferris, carousel, roomBase,
           windowLight, deskRows, blackboard, bookshelf, bokeh, vignette, godRays, lighthouse, signGlow,
           whaleSil, letterFloat, setH };
})();
