/* ============ 背景场景注册表：全部程序化绘制 ============ */
window.BG_SCENES = (function () {
  const K = window.BGKit;
  const S = {};

  function reg(id, amb, painter) { S[id] = { amb, painter }; }

  /* ---- 车站 ---- */
  reg("station_rain", "rain", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#3a4258"], [0.6, "#4c5670"], [1, "#38404f"]]);
    K.buildings(c, W, H, H * 0.62, 21, "#2c3346", null, H * 0.3, false);
    c.fillStyle = "#1d2330"; c.fillRect(0, H * 0.62, W, H * 0.38);
    // 站台
    c.fillStyle = "#252c3c"; c.fillRect(0, H * 0.66, W, H * 0.34);
    c.fillStyle = "#e8b84a"; c.fillRect(0, H * 0.72, W, 6);
    // 立柱与雨棚
    for (let i = 0; i < 4; i++) {
      const x = W * (0.12 + i * 0.25);
      c.fillStyle = "#39404f"; c.fillRect(x - 7, H * 0.28, 14, H * 0.44);
    }
    c.fillStyle = "#4a5262"; c.beginPath();
    c.moveTo(0, H * 0.3); c.lineTo(W, H * 0.26); c.lineTo(W, H * 0.31); c.lineTo(0, H * 0.35); c.closePath(); c.fill();
    K.signGlow(c, W * 0.4, H * 0.36, W * 0.2, H * 0.06, "rgba(150,210,255,1)", t, "临 汐");
    // 电车剪影
    c.fillStyle = "#161b26";
    c.fillRect(W * 0.08 + Math.sin(t * 0.1) * 4, H * 0.5, W * 0.42, H * 0.14);
    for (let i = 0; i < 6; i++) { c.fillStyle = "rgba(190,220,250,.14)"; c.fillRect(W * 0.08 + 14 + i * W * 0.066, H * 0.515, W * 0.05, H * 0.06); }
    K.bokeh(c, W, H, t, "rgba(150,190,240,A", 14, 8);
    K.vignette(c, W, H, 0.42);
  });
  reg("station_day", "wind", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#7fb2e8"], [0.55, "#bcd8f0"], [1, "#e8e2d2"]]);
    K.clouds(c, W, H, t, "#ffffff", 6, 16, 4);
    K.sun(c, W * 0.78, H * 0.2, 36, "rgba(255,244,210,1)", W, H);
    K.buildings(c, W, H, H * 0.6, 33, "#8a94a8", null, H * 0.28, false);
    K.hill(c, W, H, H * 0.62, H * 0.1, "#9fae8c", 5);
    c.fillStyle = "#6a7484"; c.fillRect(0, H * 0.66, W, H * 0.34);
    c.fillStyle = "#d8d2c2"; c.fillRect(0, H * 0.64, W, H * 0.05);
    K.signGlow(c, W * 0.4, H * 0.2, W * 0.2, H * 0.06, "rgba(90,140,210,1)", t, "临 汐 驿");
    K.vignette(c, W, H, 0.3);
  });

  /* ---- 咖啡馆「鲸落」---- */
  reg("cafe_whale", "cafe", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#4a3a34"], [0.7, "#5c4438"], [1, "#3c2e28"]]);
    K.roomBase(c, W, H, "#5c463a", "#4e3a30", ["#6a5244", "#42342c"]);
    // 吧台
    c.fillStyle = "#3a2c24"; c.beginPath(); c.roundRect(W * 0.08, H * 0.66, W * 0.84, H * 0.2, 10); c.fill();
    c.fillStyle = "#7a5c42"; c.beginPath(); c.roundRect(W * 0.08, H * 0.64, W * 0.84, H * 0.045, 6); c.fill();
    // 咖啡杯
    for (let i = 0; i < 3; i++) {
      const x = W * (0.25 + i * 0.22), y = H * 0.66;
      c.fillStyle = "#e8e0d2"; c.beginPath(); c.arc(x, y - 6, 14, Math.PI, 0); c.fill();
      c.strokeStyle = "#e8e0d2"; c.lineWidth = 3; c.beginPath(); c.arc(x + 15, y - 8, 6, -1.2, 1.2); c.stroke();
      c.save(); c.globalAlpha = 0.16 + 0.06 * Math.sin(t + i * 2);
      const g = c.createRadialGradient(x, y - 22, 2, x, y - 22, 30);
      g.addColorStop(0, "rgba(240,228,210,.8)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y - 22, 30, 0, 7); c.fill(); c.restore();
    }
    // 悬挂鲸鱼吊饰
    for (let i = 0; i < 4; i++) {
      const x = W * (0.14 + i * 0.24), y0 = H * 0.12;
      c.strokeStyle = "rgba(220,210,190,.35)"; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + H * 0.1 + Math.sin(t * 0.8 + i) * 6); c.stroke();
      K.whaleSil(c, x, y0 + H * 0.14 + Math.sin(t * 0.8 + i) * 6, 0.36 + i * 0.05, "rgba(120,160,200,.75)", t + i);
    }
    // 暖灯
    [0.2, 0.5, 0.8].forEach((p, i) => {
      const x = W * p, y = H * 0.08;
      const g = c.createRadialGradient(x, y, 4, x, y, 90);
      g.addColorStop(0, "rgba(255,208,140,.75)"); g.addColorStop(1, "rgba(255,208,140,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 90, 0, 7); c.fill();
    });
    K.bokeh(c, W, H, t, "rgba(255,200,130,A", 18, 12);
    K.vignette(c, W, H, 0.5);
  });

  /* ---- 教室 ---- */
  reg("classroom_day", null, (c, W, H, t) => {
    K.vgrad(c, W, H * 0.7, [[0, "#e8ecd8"], [1, "#d8dcc4"]]);
    K.setH(H);
    K.windowLight(c, W * 0.06, H * 0.12, W * 0.24, H * 0.34, ["#bfe0f4", "#e8f2f8"], t);
    K.windowLight(c, W * 0.36, H * 0.12, W * 0.24, H * 0.34, ["#bfe0f4", "#e8f2f8"], t + 1);
    K.windowLight(c, W * 0.66, H * 0.12, W * 0.24, H * 0.34, ["#bfe0f4", "#e8f2f8"], t + 2);
    K.blackboard(c, W, H);
    c.fillStyle = "rgba(90,80,60,.8)";
    c.fillRect(W * 0.78, H * 0.16, W * 0.14, H * 0.3);
    K.roomBase(c, W, H, "rgba(216,220,196,0)", "rgba(216,220,196,0)", ["#b09268", "#8a7048"]);
    K.deskRows(c, W, H, t, false);
    K.bokeh(c, W, H, t, "rgba(255,246,210,A", 10, 6);
    K.vignette(c, W, H, 0.32);
  });
  reg("classroom_sunset", null, (c, W, H, t) => {
    K.vgrad(c, W, H * 0.7, [[0, "#e8c8a0"], [1, "#d8b088"]]);
    K.setH(H);
    K.windowLight(c, W * 0.06, H * 0.12, W * 0.24, H * 0.34, ["#f4b26a", "#f8d8a8"], t);
    K.windowLight(c, W * 0.36, H * 0.12, W * 0.24, H * 0.34, ["#f4b26a", "#f8d8a8"], t + 1);
    K.windowLight(c, W * 0.66, H * 0.12, W * 0.24, H * 0.34, ["#f4b26a", "#f8d8a8"], t + 2);
    K.blackboard(c, W, H);
    K.roomBase(c, W, H, "rgba(0,0,0,0)", "rgba(0,0,0,0)", ["#a07448", "#7a5432"]);
    K.deskRows(c, W, H, t, true);
    K.bokeh(c, W, H, t, "rgba(255,190,120,A", 16, 9);
    K.vignette(c, W, H, 0.42);
  });

  /* ---- 走廊 ---- */
  reg("corridor", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#dce0d0"], [1, "#c8ccb8"]]);
    // 透视走廊：两侧墙与尽头窗
    c.fillStyle = "#c4c8b0"; c.beginPath();
    c.moveTo(0, 0); c.lineTo(W * 0.18, H * 0.16); c.lineTo(W * 0.18, H * 0.8); c.lineTo(0, H); c.closePath(); c.fill();
    c.fillStyle = "#d0d4bc"; c.beginPath();
    c.moveTo(W, 0); c.lineTo(W * 0.82, H * 0.16); c.lineTo(W * 0.82, H * 0.8); c.lineTo(W, H); c.closePath(); c.fill();
    c.fillStyle = "#e8ecd8"; c.fillRect(W * 0.18, H * 0.16, W * 0.64, H * 0.64);
    K.setH(H);
    K.windowLight(c, W * 0.3, H * 0.24, W * 0.13, H * 0.3, ["#bfe0f4", "#eef6fa"], t);
    K.windowLight(c, W * 0.57, H * 0.24, W * 0.13, H * 0.3, ["#bfe0f4", "#eef6fa"], t + 2);
    c.fillStyle = "#a89878"; c.fillRect(W * 0.18, H * 0.8, W * 0.64, H * 0.2);
    for (let i = 0; i < 5; i++) { c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(W * 0.18 + i * W * 0.13, H * 0.8, 3, H * 0.2); }
    for (let i = 0; i < 4; i++) {
      c.fillStyle = "#8a7c5c";
      c.fillRect(W * (0.02 + i * 0.004), H * (0.35 + i * 0.02), W * 0.03, H * 0.3);
    }
    K.bokeh(c, W, H, t, "rgba(255,250,220,A", 12, 7);
    K.vignette(c, W, H, 0.38);
  });

  /* ---- 天台 ---- */
  reg("rooftop", "wind", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#6a9cd8"], [0.5, "#a8c8e8"], [1, "#e8d8b8"]]);
    K.clouds(c, W, H, t, "#ffffff", 7, 20, 9);
    K.sun(c, W * 0.7, H * 0.26, 30, "rgba(255,246,214,1)", W, H);
    K.buildings(c, W, H, H * 0.78, 44, "#7a86a0", null, H * 0.34, false);
    K.hill(c, W, H, H * 0.8, H * 0.08, "#8a9a80", 6);
    c.fillStyle = "#9aa2ac"; c.fillRect(0, H * 0.8, W, H * 0.2);
    // 围栏
    c.strokeStyle = "#6a7480"; c.lineWidth = 4;
    for (let i = 0; i < 26; i++) { const x = i / 25 * W; c.beginPath(); c.moveTo(x, H * 0.8); c.lineTo(x, H * 0.66); c.stroke(); }
    c.lineWidth = 5; c.beginPath(); c.moveTo(0, H * 0.66); c.lineTo(W, H * 0.66); c.stroke();
    c.beginPath(); c.moveTo(0, H * 0.73); c.lineTo(W, H * 0.73); c.stroke();
    // 水塔
    c.fillStyle = "#8a8a92"; c.fillRect(W * 0.82, H * 0.56, W * 0.09, H * 0.1);
    c.beginPath(); c.moveTo(W * 0.81, H * 0.56); c.lineTo(W * 0.865, H * 0.5); c.lineTo(W * 0.92, H * 0.56); c.closePath(); c.fill();
    K.bokeh(c, W, H, t, "rgba(255,250,220,A", 14, 10);
    K.vignette(c, W, H, 0.3);
  });
  reg("rooftop_night", "wind", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#0a1024"], [0.6, "#16203c"], [1, "#232c44"]]);
    K.stars(c, W, H, t, 130, 17);
    K.shootingStar(c, W, H, t, 7);
    K.moon(c, W * 0.74, H * 0.2, 26);
    K.buildings(c, W, H, H * 0.78, 44, "#141a2c", "rgba(255,214,140,.8)", H * 0.34, true);
    c.fillStyle = "#3c4250"; c.fillRect(0, H * 0.8, W, H * 0.2);
    c.strokeStyle = "#565e6c"; c.lineWidth = 4;
    for (let i = 0; i < 26; i++) { const x = i / 25 * W; c.beginPath(); c.moveTo(x, H * 0.8); c.lineTo(x, H * 0.66); c.stroke(); }
    c.lineWidth = 5; c.beginPath(); c.moveTo(0, H * 0.66); c.lineTo(W, H * 0.66); c.stroke();
    K.vignette(c, W, H, 0.45);
  });

  /* ---- 图书馆 ---- */
  reg("library", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#3e3a34"], [1, "#2e2a26"]]);
    K.bookshelf(c, W * 0.02, H * 0.1, W * 0.2, H * 0.72, 31, true);
    K.bookshelf(c, W * 0.26, H * 0.06, W * 0.22, H * 0.8, 32, true);
    K.bookshelf(c, W * 0.56, H * 0.06, W * 0.22, H * 0.8, 33, true);
    K.bookshelf(c, W * 0.82, H * 0.1, W * 0.18, H * 0.72, 34, true);
    // 窗光
    K.setH(H);
    K.windowLight(c, W * 0.44, H * 0.16, W * 0.1, H * 0.24, ["#c8a86a", "#e8d8b0"], t);
    // 长桌与台灯
    c.fillStyle = "#5c4634"; c.beginPath(); c.roundRect(W * 0.3, H * 0.62, W * 0.4, H * 0.035, 4); c.fill();
    c.fillRect(W * 0.33, H * 0.655, W * 0.02, H * 0.16); c.fillRect(W * 0.65, H * 0.655, W * 0.02, H * 0.16);
    [0.38, 0.6].forEach((p, i) => {
      const x = W * p, y = H * 0.6;
      const g = c.createRadialGradient(x, y - 8, 3, x, y - 8, 70);
      g.addColorStop(0, "rgba(255,206,130,.55)"); g.addColorStop(1, "rgba(255,206,130,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y - 8, 70, 0, 7); c.fill();
      c.fillStyle = "#3a2f26"; c.fillRect(x - 1.6, y - 34, 3.2, 26);
      c.fillStyle = "#f4d894"; c.beginPath(); c.moveTo(x - 9, y - 34); c.lineTo(x + 9, y - 34); c.lineTo(x + 5, y - 42); c.lineTo(x - 5, y - 42); c.closePath(); c.fill();
    });
    // 漂浮尘埃
    const r = K.rng(9);
    c.save(); c.globalCompositeOperation = "screen";
    for (let i = 0; i < 24; i++) {
      const x = (r() * W + t * 4 * (0.3 + r())) % W, y = H * (0.2 + r() * 0.5) + Math.sin(t * 0.5 + i) * 8;
      c.globalAlpha = 0.14 + 0.1 * Math.sin(t + i * 2);
      K.circle(c, x, y, 1.4, "#ffe8b0");
    }
    c.restore();
    K.vignette(c, W, H, 0.52);
  });

  /* ---- 音乐室 ---- */
  reg("music_room", null, (c, W, H, t) => {
    K.vgrad(c, W, H * 0.72, [[0, "#e2d4bc"], [1, "#d4c4a8"]]);
    K.setH(H);
    K.windowLight(c, W * 0.1, H * 0.1, W * 0.2, H * 0.36, ["#f4d0a0", "#f8ecD8".toLowerCase()], t);
    K.windowLight(c, W * 0.72, H * 0.1, W * 0.2, H * 0.36, ["#f4d0a0", "#f8ecd8"], t + 2);
    K.roomBase(c, W, H, "rgba(0,0,0,0)", "rgba(0,0,0,0)", ["#8a6a48", "#6a4e32"]);
    // 三角钢琴剪影
    c.save(); c.translate(W * 0.5, H * 0.78); c.scale(1.15, 1);
    c.fillStyle = "#22242c";
    c.beginPath(); c.moveTo(-170, 0); c.quadraticCurveTo(-150, -84, 90, -76);
    c.quadraticCurveTo(150, -72, 168, -34); c.quadraticCurveTo(120, -18, -170, 0); c.closePath(); c.fill();
    c.fillStyle = "#161820"; c.fillRect(-176, 0, 300, 12);
    c.fillStyle = "#101218"; c.fillRect(-176, 12, 14, 44); c.fillRect(96, 12, 14, 44);
    // 琴键
    c.fillStyle = "#e8e4da"; c.fillRect(-40, -12, 190, 9);
    c.fillStyle = "#1a1c24";
    for (let i = 0; i < 22; i++) c.fillRect(-38 + i * 8.6, -12, 5, 6);
    c.restore();
    // 谱架上的乐谱
    c.fillStyle = "#f4efe2"; c.fillRect(W * 0.52, H * 0.66, W * 0.08, H * 0.05);
    c.strokeStyle = "rgba(60,60,80,.5)"; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(W * 0.525, H * (0.668 + i * 0.011)); c.lineTo(W * 0.595, H * (0.668 + i * 0.011)); c.stroke(); }
    // 音符粒子
    const r = K.rng(4);
    c.save(); c.globalAlpha = 0.3;
    for (let i = 0; i < 7; i++) {
      const x = W * (0.3 + r() * 0.4), y = H * 0.5 - ((t * 12 + i * 60) % (H * 0.4));
      c.fillStyle = "#8a7a5c"; c.font = "18px serif"; c.fillText("♪", x, y);
    }
    c.restore();
    K.bokeh(c, W, H, t, "rgba(255,230,180,A", 12, 8);
    K.vignette(c, W, H, 0.38);
  });

  /* ---- 校门与中庭 ---- */
  reg("school_gate", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#8ab4dc"], [0.6, "#c8dcE8".toLowerCase()], [1, "#e8e2cc"]]);
    K.clouds(c, W, H, t, "#ffffff", 6, 18, 13);
    K.hill(c, W, H, H * 0.6, H * 0.12, "#9aab84", 3);
    c.fillStyle = "#8a927c"; c.fillRect(0, H * 0.64, W, H * 0.36);
    // 校门柱
    c.fillStyle = "#c8c4b4"; c.fillRect(W * 0.24, H * 0.36, W * 0.035, H * 0.3);
    c.fillRect(W * 0.725, H * 0.36, W * 0.035, H * 0.3);
    c.fillStyle = "#7a8468"; c.beginPath(); c.moveTo(W * 0.23, H * 0.36); c.lineTo(W * 0.2575, H * 0.31); c.lineTo(W * 0.285, H * 0.36); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(W * 0.715, H * 0.36); c.lineTo(W * 0.7425, H * 0.31); c.lineTo(W * 0.77, H * 0.36); c.closePath(); c.fill();
    K.signGlow(c, W * 0.33, H * 0.38, W * 0.34, H * 0.06, "rgba(90,130,90,1)", t, "私立启明学园");
    // 栅栏
    c.strokeStyle = "#7a8266"; c.lineWidth = 3;
    for (let i = 0; i < 20; i++) { const x = W * 0.285 + i * W * 0.022; if (x > W * 0.715) break; c.beginPath(); c.moveTo(x, H * 0.5); c.lineTo(x, H * 0.66); c.stroke(); }
    // 樱花树
    K.sakuraTree(c, W * 0.12, H * 0.68, 1.35, t * 0.7, t);
    K.sakuraTree(c, W * 0.88, H * 0.68, 1.15, t * 0.7 + 2, t);
    K.bokeh(c, W, H, t, "rgba(255,220,240,A", 18, 14);
    K.vignette(c, W, H, 0.28);
  });
  reg("courtyard", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#9ac0e0"], [0.55, "#d0e0ea"], [1, "#e2deca"]]);
    K.clouds(c, W, H, t, "#ffffff", 5, 14, 15);
    // 教学楼立面
    c.fillStyle = "#d8d2bc"; c.fillRect(0, H * 0.14, W, H * 0.5);
    for (let f = 0; f < 3; f++) for (let i = 0; i < 10; i++) {
      c.fillStyle = "#b8d4e4"; c.fillRect(W * (0.05 + i * 0.095), H * (0.18 + f * 0.14), W * 0.06, H * 0.09);
      c.strokeStyle = "#b0aa94"; c.strokeRect(W * (0.05 + i * 0.095), H * (0.18 + f * 0.14), W * 0.06, H * 0.09);
    }
    c.fillStyle = "#b0aa94"; c.fillRect(0, H * 0.12, W, H * 0.025);
    // 中庭草地
    c.fillStyle = "#8aa06a"; c.fillRect(0, H * 0.64, W, H * 0.36);
    c.fillStyle = "#c8c2ac"; c.beginPath(); c.moveTo(W * 0.44, H * 0.64); c.lineTo(W * 0.56, H * 0.64); c.lineTo(W * 0.6, H); c.lineTo(W * 0.4, H); c.closePath(); c.fill();
    K.tree(c, W * 0.16, H * 0.88, 1.2, "#7a9a5c", "#6a5a44", t * 0.6);
    K.sakuraTree(c, W * 0.82, H * 0.86, 1.05, t * 0.7, t);
    K.vignette(c, W, H, 0.26);
  });

  /* ---- 商业街 ---- */
  function shoppingBase(c, W, H, t, night, dusk) {
    const sky = night ? [[0, "#0c1226"], [0.5, "#1a2440"], [1, "#2a3040"]]
              : dusk ? [[0, "#586a9c"], [0.5, "#c87898"], [1, "#f0a868"]]
                    : [[0, "#8ec0e8"], [0.6, "#c8dcea"], [1, "#e8e2d0"]];
    K.vgrad(c, W, H * 0.5, sky);
    if (night) { K.stars(c, W, H, t, 60, 21, 0.4); }
    // 商店街拱廊顶
    c.fillStyle = night ? "#2c3244" : dusk ? "#7a6a74" : "#9aa8b8";
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.16); c.quadraticCurveTo(W / 2, H * 0.24, 0, H * 0.16); c.closePath(); c.fill();
    // 店面
    c.fillStyle = night ? "#1c2232" : dusk ? "#5c5064" : "#7c8698"; c.fillRect(0, H * 0.2, W * 0.2, H * 0.62);
    c.fillRect(W * 0.8, H * 0.2, W * 0.2, H * 0.62);
    c.fillStyle = night ? "#222838" : dusk ? "#64586c" : "#848ea0"; c.fillRect(W * 0.2, H * 0.22, W * 0.6, H * 0.66);
    // 招牌群
    const signs = night
      ? [["rgba(255,150,120,1)", "鲷 烧"], ["rgba(120,200,255,1)", "书 店"], ["rgba(255,214,120,1)", "药 妆"], ["rgba(180,160,255,1)", "杂 货"]]
      : [["rgba(200,120,110,1)", "鲷 烧"], ["rgba(110,160,210,1)", "书 店"], ["rgba(220,180,110,1)", "药 妆"], ["rgba(150,150,210,1)", "杂 货"]];
    const positions = [[0.05, 0.3, 0.13, 0.07], [0.24, 0.34, 0.12, 0.065], [0.55, 0.32, 0.13, 0.07], [0.78, 0.28, 0.14, 0.075]];
    positions.forEach((p, i) => {
      const s2 = signs[i % signs.length];
      K.signGlow(c, W * p[0], H * p[1], W * p[2], H * p[3], night ? s2[0] : "rgba(90,100,120,1)", t, night ? s2[1] : s2[1]);
    });
    // 道路
    const g = c.createLinearGradient(0, H * 0.82, 0, H);
    g.addColorStop(0, night ? "#3a4050" : dusk ? "#8a7a70" : "#b0b4a4"); g.addColorStop(1, night ? "#2c3240" : dusk ? "#6a5c58" : "#989c8c");
    c.fillStyle = g; c.fillRect(0, H * 0.82, W, H * 0.18);
    K.roadLines(c, W, H, H * 0.82, t, "rgba(255,255,255,.25)");
    // 灯笼串（夜/暮）
    if (night || dusk) K.lanternString(c, W, H * 0.3, t, 9, "rgba(255,170,90,.5)", "#ffb066");
    if (night) K.bokeh(c, W, H, t, "rgba(255,190,130,A", 22, 18);
    K.vignette(c, W, H, night ? 0.5 : 0.34);
  }
  reg("shopping_day", "wind", (c, W, H, t) => shoppingBase(c, W, H, t, false, false));
  reg("shopping_dusk", null, (c, W, H, t) => shoppingBase(c, W, H, t, false, true));
  reg("shopping_night", null, (c, W, H, t) => shoppingBase(c, W, H, t, true, false));

  /* ---- 蛋糕店 ---- */
  reg("cake_shop", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#f6e8ee"], [0.65, "#f0dde6"], [1, "#e2ccd8"]]);
    // 展示柜
    c.fillStyle = "#d8c4ce"; c.beginPath(); c.roundRect(W * 0.06, H * 0.42, W * 0.88, H * 0.3, 12); c.fill();
    const g = c.createLinearGradient(0, H * 0.42, 0, H * 0.72);
    g.addColorStop(0, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(240,228,236,.55)");
    c.fillStyle = g; c.beginPath(); c.roundRect(W * 0.09, H * 0.45, W * 0.82, H * 0.24, 8); c.fill();
    c.strokeStyle = "#c8a8b8"; c.lineWidth = 3; c.strokeRect(W * 0.09, H * 0.45, W * 0.82, H * 0.24);
    // 蛋糕们
    for (let i = 0; i < 5; i++) {
      const x = W * (0.16 + i * 0.17), y = H * 0.66, s2 = 0.8 + (i % 3) * 0.2;
      c.fillStyle = ["#f8e0d0", "#f4d0dc", "#f0e4c4", "#e4ecf4", "#f8e8e0"][i];
      c.beginPath(); c.moveTo(x - 22 * s2, y); c.lineTo(x + 22 * s2, y); c.lineTo(x + 15 * s2, y - 20 * s2); c.lineTo(x - 15 * s2, y - 20 * s2); c.closePath(); c.fill();
      c.fillStyle = "#fff6f8"; c.beginPath(); c.ellipse(x, y - 20 * s2, 16 * s2, 6 * s2, 0, Math.PI, 0); c.fill();
      c.fillStyle = ["#e86a7a", "#e8a04d", "#8ac07a", "#7a9ce8", "#d88ab8"][i];
      K.circle(c, x, y - 27 * s2, 4.5 * s2, c.fillStyle);
    }
    // 招牌与吊灯
    K.signGlow(c, W * 0.36, H * 0.12, W * 0.28, H * 0.07, "rgba(220,140,170,1)", t, "甘 兔 庵");
    [0.22, 0.5, 0.78].forEach(p => {
      const x = W * p, y = H * 0.3;
      const g2 = c.createRadialGradient(x, y, 3, x, y, 60);
      g2.addColorStop(0, "rgba(255,236,246,.8)"); g2.addColorStop(1, "rgba(255,236,246,0)");
      c.fillStyle = g2; c.beginPath(); c.arc(x, y, 60, 0, 7); c.fill();
    });
    // 樱花吊饰
    for (let i = 0; i < 5; i++) {
      const x = W * (0.1 + i * 0.2), y = H * 0.24 + Math.sin(t + i) * 4;
      c.fillStyle = "rgba(244,180,205,.8)";
      for (let pt = 0; pt < 5; pt++) { const a = pt / 5 * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 3.4, 2.2, a, 0, 7); c.fill(); }
    }
    K.bokeh(c, W, H, t, "rgba(255,220,240,A", 14, 19);
    K.vignette(c, W, H, 0.28);
  });

  /* ---- 海边 ---- */
  function seaside(c, W, H, t, mode) {
    const horizon = H * 0.52;
    if (mode === "day") {
      K.vgrad(c, W, H, [[0, "#5aa8e0"], [0.45, "#a8d0ee"], [1, "#e8f0f4"]]);
      K.clouds(c, W, H, t, "#ffffff", 6, 15, 22);
      K.sun(c, W * 0.24, H * 0.2, 34, "rgba(255,250,224,1)", W, H);
      K.sea(c, W, H, horizon, t, "#5aa8c8", "#2c6488", W * 0.24);
      K.sand(c, W, H, H * 0.78, "#f0e4c8", "#d8c8a4");
      K.foamEdge(c, W, H, H * 0.78, t);
    } else if (mode === "sunset") {
      K.vgrad(c, W, H, [[0, "#5a6aa8"], [0.35, "#c87888"], [0.55, "#f09858"], [1, "#f8c890"]]);
      K.clouds(c, W, H, t, "#f4c8a8", 5, 10, 23, 0.25);
      K.sun(c, W * 0.52, horizon - 20, 44, "rgba(255,214,140,1)", W, H);
      K.sea(c, W, H, horizon, t, "#e09868", "#4a3858", W * 0.52);
      K.sand(c, W, H, H * 0.8, "#e2c8a0", "#b89878");
      K.foamEdge(c, W, H, H * 0.8, t);
      // 海鸟
      c.strokeStyle = "rgba(70,50,60,.65)"; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const x = W * (0.15 + i * 0.2) + Math.sin(t * 0.6 + i * 2) * 20, y = H * (0.2 + 0.04 * Math.sin(i * 3));
        c.beginPath(); c.moveTo(x - 10, y); c.quadraticCurveTo(x - 4, y - 6, x, y); c.quadraticCurveTo(x + 4, y - 6, x + 10, y); c.stroke();
      }
    } else {
      K.vgrad(c, W, H, [[0, "#060a1c"], [0.5, "#101c3c"], [1, "#1c2c4c"]]);
      K.stars(c, W, H, t, 160, 29, 0.5);
      K.shootingStar(c, W, H, t, 9);
      K.moon(c, W * 0.3, H * 0.2, 30);
      K.sea(c, W, H, horizon, t, "#28486c", "#0c182e", W * 0.3);
      K.sand(c, W, H, H * 0.8, "#3c3c50", "#23232f");
      K.foamEdge(c, W, H, H * 0.8, t);
      // 灯塔远光
      K.lighthouse(c, W * 0.88, horizon + 4, 64, t, true);
    }
  }
  reg("seaside_day", "wave", (c, W, H, t) => seaside(c, W, H, t, "day"));
  reg("seaside_sunset", "wave", (c, W, H, t) => seaside(c, W, H, t, "sunset"));
  reg("seaside_night", "wave", (c, W, H, t) => seaside(c, W, H, t, "night"));

  /* ---- 民宿 ---- */
  reg("minshuku_out", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#6888b8"], [0.5, "#c8a888"], [1, "#e8d0a8"]]);
    K.clouds(c, W, H, t, "#ffffff", 5, 12, 25);
    K.hill(c, W, H, H * 0.62, H * 0.14, "#6a8a5c", 27);
    K.sea(c, W, H * 0.58, H * 0.66, t, "#8ab8c8", "#5888a0", null);
    // 民宿小楼
    c.fillStyle = "#8a7460"; c.fillRect(W * 0.22, H * 0.34, W * 0.56, H * 0.32);
    c.fillStyle = "#5c4a3c"; c.beginPath();
    c.moveTo(W * 0.18, H * 0.36); c.lineTo(W * 0.5, H * 0.2); c.lineTo(W * 0.82, H * 0.36); c.closePath(); c.fill();
    // 檐廊与暖窗
    for (let i = 0; i < 4; i++) {
      c.fillStyle = "rgba(255,214,140,.85)";
      c.fillRect(W * (0.28 + i * 0.12), H * 0.44, W * 0.07, H * 0.09);
      c.strokeStyle = "#4c3c30"; c.lineWidth = 3; c.strokeRect(W * (0.28 + i * 0.12), H * 0.44, W * 0.07, H * 0.09);
    }
    c.fillStyle = "#6a5442"; c.fillRect(W * 0.24, H * 0.66, W * 0.52, H * 0.05);
    for (let i = 0; i < 6; i++) { c.fillStyle = "#5c4838"; c.fillRect(W * (0.25 + i * 0.1), H * 0.71, 6, H * 0.07); }
    K.lanternString(c, W, H * 0.4, t, 7, "rgba(255,180,100,.45)", "#ffb066");
    K.tree(c, W * 0.1, H * 0.72, 1.1, "#5a7a48", "#5c4a38", t * 0.5);
    K.bokeh(c, W, H, t, "rgba(255,220,170,A", 12, 26);
    K.vignette(c, W, H, 0.3);
  });
  reg("minshuku_room", null, (c, W, H, t) => {
    K.vgrad(c, W, H * 0.74, [[0, "#e2d4b8"], [1, "#d4c4a4"]]);
    // 障子门
    for (let i = 0; i < 4; i++) {
      const x = W * (0.06 + i * 0.235);
      c.fillStyle = "rgba(248,242,224,.92)"; c.fillRect(x, H * 0.1, W * 0.2, H * 0.6);
      c.strokeStyle = "#8a7458"; c.lineWidth = 5; c.strokeRect(x, H * 0.1, W * 0.2, H * 0.6);
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x + W * 0.1, H * 0.1); c.lineTo(x + W * 0.1, H * 0.7); c.stroke();
      c.beginPath(); c.moveTo(x, H * 0.4); c.lineTo(x + W * 0.2, H * 0.4); c.stroke();
      // 透出的天光
      const g = c.createLinearGradient(x, H * 0.1, x, H * 0.7);
      g.addColorStop(0, "rgba(190,214,230,.4)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(x, H * 0.1, W * 0.2, H * 0.6);
    }
    // 榻榻米
    const g2 = c.createLinearGradient(0, H * 0.74, 0, H);
    g2.addColorStop(0, "#d8cba0"); g2.addColorStop(1, "#b8a878");
    c.fillStyle = g2; c.fillRect(0, H * 0.74, W, H * 0.26);
    c.strokeStyle = "rgba(90,78,50,.35)"; c.lineWidth = 2;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, H * (0.74 + i * 0.065)); c.lineTo(W, H * (0.74 + i * 0.065)); c.stroke(); }
    c.beginPath(); c.moveTo(W * 0.5, H * 0.74); c.lineTo(W * 0.5, H); c.stroke();
    // 矮桌
    c.fillStyle = "#6a4e38"; c.beginPath(); c.roundRect(W * 0.32, H * 0.8, W * 0.36, H * 0.028, 4); c.fill();
    c.fillRect(W * 0.35, H * 0.828, W * 0.02, H * 0.07); c.fillRect(W * 0.63, H * 0.828, W * 0.02, H * 0.07);
    K.bokeh(c, W, H, t, "rgba(255,240,200,A", 10, 28);
    K.vignette(c, W, H, 0.34);
  });
  reg("minshuku_veranda", "wave", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#38507c"], [0.4, "#c87888"], [0.55, "#f0a468"], [1, "#f8cc98"]]);
    K.sea(c, W, H * 0.5, H * 0.62, t, "#e09868", "#4a3858", W * 0.5);
    // 檐廊地板
    const g = c.createLinearGradient(0, H * 0.66, 0, H);
    g.addColorStop(0, "#9a7454"); g.addColorStop(1, "#6a4c34");
    c.fillStyle = g; c.fillRect(0, H * 0.66, W, H * 0.34);
    c.strokeStyle = "rgba(40,26,16,.4)"; c.lineWidth = 2;
    for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(0, H * (0.68 + i * 0.045)); c.lineTo(W, H * (0.68 + i * 0.045)); c.stroke(); }
    // 柱子
    c.fillStyle = "#5c4230"; c.fillRect(W * 0.06, H * 0.2, W * 0.03, H * 0.5); c.fillRect(W * 0.91, H * 0.2, W * 0.03, H * 0.5);
    // 风铃
    const x = W * 0.14, y = H * 0.24 + Math.sin(t * 1.3) * 3;
    c.strokeStyle = "#4c3828"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, H * 0.2); c.lineTo(x, y); c.stroke();
    c.fillStyle = "#d8e8f0"; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.lineTo(x + 3, y + 14); c.lineTo(x - 3, y + 14); c.closePath(); c.fill();
    c.strokeStyle = "#a8c0cc"; c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x + Math.sin(t * 2.2) * 8, y + 26); c.stroke();
    K.bokeh(c, W, H, t, "rgba(255,200,150,A", 16, 30);
    K.vignette(c, W, H, 0.32);
  });

  /* ---- 游乐场 ---- */
  reg("park_entrance", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#6aa8dd"], [0.5, "#b8dcf0"], [1, "#f0ead2"]]);
    K.clouds(c, W, H, t, "#ffffff", 6, 16, 31);
    K.sun(c, W * 0.8, H * 0.18, 32, "rgba(255,250,220,1)", W, H);
    K.buildings(c, W, H, H * 0.66, 41, "#8a96aa", null, H * 0.2, false);
    K.ferris(c, W * 0.78, H * 0.44, H * 0.24, t, "#c88a5a", "#e8b06a", false);
    // 大门拱
    c.strokeStyle = "#c0687a"; c.lineWidth = W * 0.02;
    c.beginPath(); c.moveTo(W * 0.28, H * 0.62); c.quadraticCurveTo(W * 0.5, H * 0.28, W * 0.72, H * 0.62); c.stroke();
    K.signGlow(c, W * 0.38, H * 0.4, W * 0.24, H * 0.07, "rgba(255,140,160,1)", t, "临 汐 园 地");
    c.fillStyle = "#b0ae98"; c.fillRect(0, H * 0.66, W, H * 0.34);
    // 人群气球
    const r = K.rng(51);
    for (let i = 0; i < 8; i++) {
      const x = r() * W, y = H * (0.72 + r() * 0.2), bcol = ["#e86a7a", "#6a9ce8", "#f0c060", "#8ad0a0"][i % 4];
      c.strokeStyle = "rgba(80,70,60,.5)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(t + i) * 6, y - 34); c.stroke();
      c.fillStyle = bcol; c.beginPath(); c.ellipse(x + Math.sin(t + i) * 6, y - 44, 9, 11, 0, 0, 7); c.fill();
    }
    K.bokeh(c, W, H, t, "rgba(255,250,220,A", 12, 32);
    K.vignette(c, W, H, 0.26);
  });
  reg("carousel", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#7ab0dd"], [0.45, "#c8e0ef"], [1, "#f4eed8"]]);
    K.clouds(c, W, H, t, "#ffffff", 5, 14, 33);
    K.carousel(c, W * 0.5, H * 0.8, t, Math.min(1.3, W / 900));
    c.fillStyle = "#c8c4ac"; c.fillRect(0, H * 0.8, W, H * 0.2);
    K.bokeh(c, W, H, t, "rgba(255,240,210,A", 20, 34);
    K.vignette(c, W, H, 0.28);
  });
  reg("ferris_day", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#5a9cd8"], [0.5, "#a8cee8"], [1, "#f0ead2"]]);
    K.clouds(c, W, H, t, "#ffffff", 7, 18, 35);
    K.sun(c, W * 0.2, H * 0.16, 30, "rgba(255,250,222,1)", W, H);
    K.hill(c, W, H, H * 0.72, H * 0.08, "#8aa070", 37);
    K.ferris(c, W * 0.5, H * 0.48, H * 0.34, t, "#b0765a", "#e0a068", false);
    c.fillStyle = "#a8a48c"; c.fillRect(0, H * 0.74, W, H * 0.26);
    K.tree(c, W * 0.12, H * 0.86, 1.0, "#6a8a50", "#5c4a38", t * 0.5);
    K.tree(c, W * 0.9, H * 0.88, 0.85, "#6a8a50", "#5c4a38", t * 0.6);
    K.vignette(c, W, H, 0.24);
  });
  reg("ferris_night", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#081026"], [0.55, "#142046"], [1, "#222c48"]]);
    K.stars(c, W, H, t, 150, 39);
    K.moon(c, W * 0.22, H * 0.16, 24);
    K.buildings(c, W, H, H * 0.74, 41, "#10162a", "rgba(255,210,140,.75)", H * 0.24, true);
    K.ferris(c, W * 0.5, H * 0.48, H * 0.34, t, "#6a86b8", "#ffd9a8", true);
    c.fillStyle = "#2c3444"; c.fillRect(0, H * 0.74, W, H * 0.26);
    K.bokeh(c, W, H, t, "rgba(255,200,140,A", 26, 40);
    K.vignette(c, W, H, 0.42);
  });

  /* ---- 夏祭 ---- */
  reg("festival_street", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#0c1428"], [0.6, "#1c2440"], [1, "#282c3c"]]);
    K.stars(c, W, H, t, 70, 43, 0.3);
    // 两侧摊位
    [[0.02, 1], [0.66, -1]].forEach(([bx, dir]) => {
      c.fillStyle = "#2c2430"; c.fillRect(W * bx, H * 0.34, W * 0.32, H * 0.42);
      c.fillStyle = "#3c3040"; c.beginPath();
      c.moveTo(W * bx - 10, H * 0.34); c.lineTo(W * (bx + 0.16), H * 0.24); c.lineTo(W * (bx + 0.32) + 10, H * 0.34); c.closePath(); c.fill();
      ["#e86a7a", "#f0c060", "#6a9ce8"].forEach((col, i) => {
        c.fillStyle = col; c.fillRect(W * bx + 8 + i * W * 0.105, H * 0.36, W * 0.07, H * 0.08);
      });
      const g = c.createLinearGradient(0, H * 0.44, 0, H * 0.76);
      g.addColorStop(0, "rgba(255,208,140,.35)"); g.addColorStop(1, "rgba(255,208,140,.05)");
      c.fillStyle = g; c.fillRect(W * bx, H * 0.44, W * 0.32, H * 0.32);
    });
    // 灯笼街
    K.lanternString(c, W, H * 0.12, t, 10, "rgba(255,170,90,.5)", "#ff9a56");
    K.lanternString(c, W, H * 0.3, t + 2, 8, "rgba(255,190,120,.4)", "#ffb066");
    // 参道地面
    const g2 = c.createLinearGradient(0, H * 0.76, 0, H);
    g2.addColorStop(0, "#3a3444"); g2.addColorStop(1, "#241f2e");
    c.fillStyle = g2; c.fillRect(0, H * 0.76, W, H * 0.24);
    K.bokeh(c, W, H, t, "rgba(255,180,120,A", 26, 44);
    K.vignette(c, W, H, 0.46);
  });
  reg("shrine", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#101a30"], [0.6, "#1e2a44"], [1, "#2c3040"]]);
    K.stars(c, W, H, t, 60, 47, 0.25);
    // 鸟居
    c.fillStyle = "#a83830";
    c.fillRect(W * 0.3, H * 0.3, W * 0.035, H * 0.44);
    c.fillRect(W * 0.665, H * 0.3, W * 0.035, H * 0.44);
    c.beginPath(); c.moveTo(W * 0.26, H * 0.3); c.quadraticCurveTo(W * 0.5, H * 0.24, W * 0.74, H * 0.3);
    c.lineTo(W * 0.74, H * 0.345); c.quadraticCurveTo(W * 0.5, H * 0.285, W * 0.26, H * 0.345); c.closePath(); c.fill();
    c.fillRect(W * 0.29, H * 0.42, W * 0.42, W * 0.012);
    // 石阶
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(${120 - i * 8},${116 - i * 8},${108 - i * 8},1)`;
      c.fillRect(0, H * (0.74 + i * 0.038), W, H * 0.038);
    }
    K.lanternString(c, W, H * 0.5, t, 8, "rgba(255,170,90,.4)", "#ff9a56");
    K.bokeh(c, W, H, t, "rgba(255,180,120,A", 18, 48);
    K.vignette(c, W, H, 0.44);
  });

  /* ---- 特殊场景 ---- */
  reg("deep_sea", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#0a2038"], [0.4, "#061428"], [1, "#020a18"]]);
    K.godRays(c, W, H, W * 0.5, -40, t, "rgba(120,200,240,");
    // 数据尘埃
    const r = K.rng(55);
    for (let i = 0; i < 60; i++) {
      const x = (r() * W + t * 8 * (0.2 + r() * 0.5)) % W;
      const y = H * r() + Math.sin(t * 0.4 + i) * 10;
      c.globalAlpha = 0.2 + 0.2 * Math.sin(t + i * 1.7);
      K.circle(c, x, y, 1 + r() * 2, "#9adcff");
    }
    c.globalAlpha = 1;
    K.whaleSil(c, W * 0.3, H * 0.4, 1.5, "rgba(80,140,190,.5)", t * 0.5);
    K.whaleSil(c, W * 0.72, H * 0.66, 0.9, "rgba(60,110,170,.4)", t * 0.4 + 2);
    K.whaleSil(c, W * 0.5, H * 0.85, 0.6, "rgba(50,90,150,.3)", t * 0.6 + 4);
    K.letterFloat(c, W * 0.15, H * 0.7, 1, t, "rgba(140,200,255,.5)");
    K.letterFloat(c, W * 0.85, H * 0.5, 0.8, t + 2, "rgba(140,200,255,.5)");
    K.vignette(c, W, H, 0.55);
  });
  reg("lighthouse", "wind", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#0a1228"], [1, "#182238"]]);
    // 星图穹顶
    K.stars(c, W, H, t, 200, 61);
    // 星座连线
    c.strokeStyle = "rgba(150,180,230,.25)"; c.lineWidth = 1;
    const r = K.rng(62);
    let px = r() * W, py = r() * H * 0.6;
    for (let i = 0; i < 8; i++) {
      const nx = r() * W, ny = r() * H * 0.6;
      c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
      K.circle(c, nx, ny, 2, "rgba(200,220,255,.7)");
      px = nx; py = ny;
    }
    // 环形机房
    c.strokeStyle = "rgba(140,170,220,.3)"; c.lineWidth = 2;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(W / 2, H * 0.95, W * i * 0.16, H * 0.06, 0, 0, 7); c.stroke(); }
    // 中央主机
    const g = c.createRadialGradient(W / 2, H * 0.78, 4, W / 2, H * 0.78, 120);
    g.addColorStop(0, `rgba(160,220,255,${0.5 + 0.2 * Math.sin(t * 1.4)})`); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.beginPath(); c.arc(W / 2, H * 0.78, 120, 0, 7); c.fill();
    c.fillStyle = "#2c3a52"; c.beginPath(); c.roundRect(W * 0.44, H * 0.7, W * 0.12, H * 0.18, 8); c.fill();
    for (let i = 0; i < 5; i++) {
      const on = Math.sin(t * 3 + i * 2.4) > 0.2;
      c.fillStyle = on ? "#7adcff" : "#2c4a5c";
      c.fillRect(W * 0.455 + i * W * 0.02, H * 0.73, W * 0.012, H * 0.015);
    }
    K.vignette(c, W, H, 0.48);
  });
  reg("aurora_night", "wind", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#04081a"], [0.5, "#081226"], [1, "#101c30"]]);
    K.stars(c, W, H, t, 190, 71);
    // 极光帷幕
    for (let b = 0; b < 4; b++) {
      const hue = [160, 190, 130, 210][b];
      c.save(); c.globalCompositeOperation = "screen";
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 30) {
        const y = H * (0.42 + b * 0.05) + Math.sin(x * 0.004 + t * (0.3 + b * 0.08) + b * 2) * H * 0.09;
        c.lineTo(x, y);
      }
      for (let x = W; x >= 0; x -= 30) {
        const y = H * (0.42 + b * 0.05) + Math.sin(x * 0.004 + t * (0.3 + b * 0.08) + b * 2 + 1) * H * 0.09 - H * (0.16 + b * 0.04);
        c.lineTo(x, y);
      }
      c.closePath();
      const g = c.createLinearGradient(0, H * 0.2, 0, H * 0.55);
      g.addColorStop(0, `hsla(${hue},80%,60%,.05)`); g.addColorStop(0.7, `hsla(${hue},85%,58%,.22)`); g.addColorStop(1, `hsla(${hue},80%,50%,0)`);
      c.fillStyle = g; c.fill(); c.restore();
    }
    // 雪原
    c.fillStyle = "#d8e4ee"; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) c.lineTo(x, H * 0.85 + Math.sin(x * 0.008 + 2) * H * 0.03);
    c.lineTo(W, H); c.closePath(); c.fill();
    K.vignette(c, W, H, 0.35);
  });
  reg("rain_street", "rain", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#2c3448"], [0.5, "#3c4458"], [1, "#2a3040"]]);
    K.buildings(c, W, H, H * 0.66, 73, "#222838", "rgba(255,214,150,.6)", H * 0.3, true);
    // 湿漉路面反光
    const g = c.createLinearGradient(0, H * 0.66, 0, H);
    g.addColorStop(0, "#3a4252"); g.addColorStop(1, "#1c2230");
    c.fillStyle = g; c.fillRect(0, H * 0.66, W, H * 0.34);
    for (let i = 0; i < 8; i++) {
      const x = W * (0.08 + i * 0.12);
      c.globalAlpha = 0.12; c.fillStyle = "#ffd9a8";
      c.fillRect(x, H * 0.66, 26, H * 0.3);
    }
    c.globalAlpha = 1;
    // 路灯
    [0.24, 0.72].forEach(p => {
      const x = W * p;
      c.fillStyle = "#2c303c"; c.fillRect(x - 3, H * 0.3, 6, H * 0.4);
      const g2 = c.createRadialGradient(x, H * 0.3, 4, x, H * 0.3, 110);
      g2.addColorStop(0, "rgba(255,232,180,.7)"); g2.addColorStop(1, "rgba(255,232,180,0)");
      c.fillStyle = g2; c.beginPath(); c.arc(x, H * 0.3, 110, 0, 7); c.fill();
    });
    K.bokeh(c, W, H, t, "rgba(190,210,250,A", 16, 74);
    K.vignette(c, W, H, 0.5);
  });
  reg("night_street", "wind", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#0a1020"], [0.5, "#141c32"], [1, "#1e2434"]]);
    K.stars(c, W, H, t, 60, 77, 0.3);
    K.buildings(c, W, H, H * 0.62, 79, "#121828", "rgba(255,210,140,.8)", H * 0.3, true);
    K.hill(c, W, H, H * 0.64, H * 0.05, "#101626", 81);
    const g = c.createLinearGradient(0, H * 0.64, 0, H);
    g.addColorStop(0, "#2a3040"); g.addColorStop(1, "#181c2a");
    c.fillStyle = g; c.fillRect(0, H * 0.64, W, H * 0.36);
    K.roadLines(c, W, H, H * 0.64, t, "rgba(255,255,255,.18)");
    [0.3, 0.7].forEach(p => {
      const x = W * p;
      const g2 = c.createRadialGradient(x, H * 0.34, 4, x, H * 0.34, 100);
      g2.addColorStop(0, "rgba(255,230,180,.5)"); g2.addColorStop(1, "rgba(255,230,180,0)");
      c.fillStyle = g2; c.beginPath(); c.arc(x, H * 0.34, 100, 0, 7); c.fill();
    });
    K.bokeh(c, W, H, t, "rgba(255,200,150,A", 18, 78);
    K.vignette(c, W, H, 0.46);
  });
  reg("bedroom", null, (c, W, H, t) => {
    K.vgrad(c, W, H * 0.74, [[0, "#e8e0d0"], [1, "#d8ccb8"]]);
    K.setH(H);
    K.windowLight(c, W * 0.08, H * 0.12, W * 0.26, H * 0.36, ["#c8dcec", "#f0e8d4"], t);
    // 窗外街景
    c.fillStyle = "#b8c4d0"; c.fillRect(W * 0.08, H * 0.12, W * 0.26, H * 0.36);
    K.buildings(c, W * 0.36, H * 0.36, H * 0.44, 83, "#8a94a4", null, H * 0.2, false);
    c.save(); c.beginPath(); c.rect(W * 0.08, H * 0.12, W * 0.26, H * 0.36); c.clip();
    K.buildings(c, W * 0.36, H * 0.42, H * 0.34, 84, "#9aa4b4", null, H * 0.22, false); c.restore();
    // 窗框
    c.strokeStyle = "#8a7c64"; c.lineWidth = 8; c.strokeRect(W * 0.08, H * 0.12, W * 0.26, H * 0.36);
    c.lineWidth = 5; c.beginPath(); c.moveTo(W * 0.21, H * 0.12); c.lineTo(W * 0.21, H * 0.48); c.stroke();
    K.roomBase(c, W, H, "rgba(0,0,0,0)", "rgba(0,0,0,0)", ["#b89878", "#8a6c4e"]);
    // 床
    c.fillStyle = "#8a7460"; c.beginPath(); c.roundRect(W * 0.52, H * 0.68, W * 0.42, H * 0.2, 10); c.fill();
    c.fillStyle = "#d8ccd8"; c.beginPath(); c.roundRect(W * 0.52, H * 0.68, W * 0.42, H * 0.1, 10); c.fill();
    c.fillStyle = "#f0ece0"; c.beginPath(); c.roundRect(W * 0.55, H * 0.64, W * 0.12, H * 0.05, 6); c.fill();
    // 书桌
    c.fillStyle = "#a8845c"; c.fillRect(W * 0.1, H * 0.72, W * 0.3, H * 0.025);
    c.fillRect(W * 0.12, H * 0.745, W * 0.02, H * 0.14); c.fillRect(W * 0.36, H * 0.745, W * 0.02, H * 0.14);
    K.vignette(c, W, H, 0.3);
  });
  reg("tide_night", "wave", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#06101e"], [0.45, "#0c1c34"], [1, "#122840"]]);
    K.stars(c, W, H, t, 170, 91);
    K.moon(c, W * 0.62, H * 0.16, 34);
    // 发光潮水
    const horizon = H * 0.5;
    const g = c.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "#1c4462"); g.addColorStop(1, "#0a2038");
    c.fillStyle = g; c.fillRect(0, horizon, W, H - horizon);
    c.save(); c.globalCompositeOperation = "screen";
    for (let i = 0; i < 34; i++) {
      const p = i / 34, y = horizon + Math.pow(p, 1.6) * (H - horizon);
      const a = 0.05 + 0.09 * (1 - p) * (0.6 + 0.4 * Math.sin(t * 1.6 + i * 2.1));
      c.strokeStyle = `rgba(130,220,255,${a})`; c.lineWidth = 1.5 + p * 2.5;
      c.beginPath();
      for (let x = 0; x <= W; x += 22) {
        const yy = y + Math.sin(x * 0.014 + t * (1.2 + p) + i * 1.7) * (2 + p * 6);
        x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
      }
      c.stroke();
    }
    c.restore();
    // 浮起的信
    for (let i = 0; i < 6; i++) {
      K.letterFloat(c, W * (0.12 + i * 0.15), H * (0.62 + (i % 3) * 0.11), 0.9 + (i % 2) * 0.3, t + i, "rgba(150,220,255,.5)");
    }
    K.bokeh(c, W, H, t, "rgba(140,220,255,A", 24, 92);
    K.vignette(c, W, H, 0.42);
  });
  reg("letter_sea", "wave", (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#f8e8d8"], [0.5, "#f0d0b8"], [1, "#e8c8a8"]]);
    K.sun(c, W * 0.5, H * 0.2, 40, "rgba(255,234,200,1)", W, H);
    const horizon = H * 0.46;
    const g = c.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "#f0c8a0"); g.addColorStop(1, "#d8a880");
    c.fillStyle = g; c.fillRect(0, horizon, W, H - horizon);
    for (let i = 0; i < 14; i++) {
      K.letterFloat(c, W * (0.06 + (i * 0.071) % 0.9), H * (0.5 + (i % 6) * 0.08), 0.8 + (i % 3) * 0.25, t * 0.7 + i * 1.3, "rgba(200,140,110,.5)");
    }
    K.bokeh(c, W, H, t, "rgba(255,240,220,A", 20, 93);
    K.vignette(c, W, H, 0.3);
  });
  reg("memory_white", null, (c, W, H, t) => {
    K.vgrad(c, W, H, [[0, "#f4f2ec"], [1, "#e8e4d8"]]);
    c.save(); c.globalAlpha = 0.5;
    const r = K.rng(94);
    for (let i = 0; i < 30; i++) {
      const x = r() * W, y = r() * H + Math.sin(t * 0.3 + i) * 6;
      K.letterFloat(c, x, y, 0.5, t + i, "rgba(160,150,140,.3)");
    }
    c.restore();
    K.vignette(c, W, H, 0.4);
  });
  reg("black", null, (c, W, H) => { c.fillStyle = "#05070d"; c.fillRect(0, 0, W, H); });
  reg("white", null, (c, W, H) => { c.fillStyle = "#f2f0ea"; c.fillRect(0, 0, W, H); });

  /* ---- 图片背景系统（Blender 渲染图 + 缓慢漂移） ---- */
  const IMGS = {};
  function registerImage(id, url, amb) {
    const im = new Image();
    im.src = url;
    IMGS[id] = im;
    S[id] = { amb: amb || null, painter: (c, W, H, t) => {
      if (!im.complete || !im.naturalWidth) { c.fillStyle = "#05070d"; c.fillRect(0, 0, W, H); return; }
      const scale = 1.1 + Math.sin(t * 0.05) * 0.012;
      const w = W * scale, h = H * scale;
      const px = (W - w) / 2 + Math.sin(t * 0.04) * W * 0.009;
      const py = (H - h) * 0.18 + Math.cos(t * 0.03) * H * 0.007;
      c.drawImage(im, px, py, w, h);
      K.vignette(c, W, H, 0.32);
    } };
  }
  registerImage("cafe_whale", "assets/bg/cafe_whale.jpg", "cafe");
  registerImage("classroom_day", "assets/bg/classroom_day.jpg", null);
  registerImage("classroom_sunset", "assets/bg/classroom_sunset.jpg", null);
  registerImage("library", "assets/bg/library.jpg", null);
  registerImage("rooftop", "assets/bg/rooftop.jpg", "wind");
  registerImage("rooftop_night", "assets/bg/rooftop_night.jpg", "wind");
  registerImage("shopping_night", "assets/bg/shopping_night.jpg", null);
  registerImage("seaside_day", "assets/bg/seaside_day.jpg", "wave");
  registerImage("seaside_sunset", "assets/bg/seaside_sunset.jpg", "wave");
  registerImage("seaside_night", "assets/bg/seaside_night.jpg", "wave");
  registerImage("festival_street", "assets/bg/festival_street.jpg", "wind");
  registerImage("ferris_night", "assets/bg/ferris_night.jpg", "wind");
  registerImage("minshuku_veranda", "assets/bg/minshuku_veranda.jpg", "wave");
  registerImage("bedroom", "assets/bg/bedroom.jpg", null);
  registerImage("cake_shop", "assets/bg/cake_shop.jpg", null);
  registerImage("park_entrance", "assets/bg/park_entrance.jpg", "wind");
  registerImage("ferris_day", "assets/bg/ferris_day.jpg", "wind");
  registerImage("school_gate", "assets/bg/school_gate.jpg", "wind");
  registerImage("corridor", "assets/bg/corridor.jpg", null);
  registerImage("music_room", "assets/bg/music_room.jpg", null);
  registerImage("courtyard", "assets/bg/courtyard.jpg", "wind");
  registerImage("station_rain", "assets/bg/station_rain.jpg", "rain");
  registerImage("station_day", "assets/bg/station_day.jpg", "wind");
  registerImage("minshuku_out", "assets/bg/minshuku_out.jpg", "wind");
  registerImage("minshuku_room", "assets/bg/minshuku_room.jpg", null);
  registerImage("shopping_day", "assets/bg/shopping_day.jpg", "wind");
  registerImage("shopping_dusk", "assets/bg/shopping_dusk.jpg", null);

  /* ---- BG 渲染循环 ---- */
  let cur = null, canvas = null, ctx2 = null, t0 = performance.now();
  function mount(cnv) { canvas = cnv; ctx2 = cnv.getContext("2d"); resize(); }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  function set(id) {
    if (cur === id) return;
    cur = id;
    const sc = S[id];
    if (window.AudioSys) AudioSys.amb(sc && sc.amb ? sc.amb : null);
  }
  function tick() {
    if (!ctx2 || !cur || !S[cur]) return;
    const t = (performance.now() - t0) / 1000;
    S[cur].painter(ctx2, innerWidth, innerHeight, t);
  }
  return { registry: S, mount, set, tick, get current() { return cur; } };
})();
