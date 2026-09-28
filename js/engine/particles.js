/* ============ 粒子系统：樱花/雪/雨/萤火/流星/泡沫/纸页 ============ */
window.Particles = (function () {
  let canvas, ctx, mode = null, parts = [], dpr = 1;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function mount(cnv) {
    canvas = cnv; ctx = cnv.getContext("2d");
    dpr = Math.min(2, window.devicePixelRatio || 1);
    resize(); window.addEventListener("resize", resize);
  }
  function resize() {
    if (!canvas) return;
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(m) {
    const W = innerWidth, H = innerHeight;
    const p = { x: rnd(0, W), y: rnd(-H * 0.2, H), vx: 0, vy: 0, r: 1, a: 1, rot: rnd(0, 7), vr: rnd(-1, 1), ph: rnd(0, 7) };
    switch (m) {
      case "sakura": p.r = rnd(3, 6.5); p.vy = rnd(26, 52); p.vx = rnd(-16, 22); p.a = rnd(.6, .95); break;
      case "snow": p.r = rnd(1.4, 3.6); p.vy = rnd(18, 44); p.vx = rnd(-12, 12); p.a = rnd(.5, .95); break;
      case "rain": p.x = rnd(-80, W + 80); p.y = rnd(-H, H); p.vy = rnd(560, 820); p.vx = rnd(-60, -20); p.r = rnd(8, 16); p.a = rnd(.18, .4); break;
      case "firefly": p.x = rnd(0, W); p.y = rnd(H * .3, H); p.r = rnd(1.6, 3); p.ph = rnd(0, 7); p.a = 0; break;
      case "meteor": p.x = rnd(W * .2, W); p.y = rnd(-40, H * .3); p.vx = -rnd(320, 480); p.vy = rnd(140, 220); p.r = rnd(1.2, 2.4); break;
      case "foam": p.x = rnd(0, W); p.y = H + rnd(0, 40); p.vy = -rnd(10, 26); p.vx = rnd(-8, 8); p.r = rnd(1.2, 3.4); p.a = rnd(.2, .5); break;
      case "petals": p.r = rnd(4, 8); p.vy = rnd(30, 60); p.vx = rnd(-20, 26); p.a = rnd(.5, .9); break;
      case "paper": p.r = rnd(5, 9); p.vy = rnd(20, 46); p.vx = rnd(-24, 24); p.vr = rnd(-2, 2); p.a = rnd(.5, .85); break;
      case "sparks": p.x = rnd(0, W); p.y = rnd(0, H); p.ph = rnd(0, 7); p.r = rnd(.8, 2); break;
    }
    return p;
  }
  function set(m) {
    mode = m; parts = [];
    if (!m || !ctx) return;
    const count = { sakura: 42, snow: 90, rain: 160, firefly: 26, meteor: 6, foam: 36, petals: 30, paper: 22, sparks: 40 }[m] || 30;
    for (let i = 0; i < count; i++) parts.push(spawn(m));
  }
  function tick(dt, t) {
    if (!ctx) return;
    const W = innerWidth, H = innerHeight;
    ctx.clearRect(0, 0, W, H);
    if (!mode) return;
    for (const p of parts) {
      switch (mode) {
        case "sakura": case "petals":
          p.x += (p.vx + Math.sin(t * 1.4 + p.ph) * 14) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y > H + 20) Object.assign(p, spawn(mode), { y: -20 });
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = mode === "sakura" ? `rgba(255,${190 + Math.sin(p.ph) * 20},215,${p.a})` : `rgba(255,${170 + Math.sin(p.ph) * 30},190,${p.a})`;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, 7); ctx.fill(); ctx.restore();
          break;
        case "snow":
          p.x += (p.vx + Math.sin(t + p.ph) * 10) * dt; p.y += p.vy * dt;
          if (p.y > H + 8) Object.assign(p, spawn(mode), { y: -8 });
          ctx.fillStyle = `rgba(240,246,255,${p.a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
          break;
        case "rain": {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y > H) { Object.assign(p, spawn(mode), { y: rnd(-60, 0) }); }
          ctx.strokeStyle = `rgba(200,220,250,${p.a})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.02, p.y + p.r); ctx.stroke();
          break;
        }
        case "firefly": {
          p.x += Math.sin(t * 0.7 + p.ph * 2) * 26 * dt; p.y += Math.cos(t * 0.5 + p.ph) * 18 * dt;
          p.a = Math.max(0, Math.sin(t * 1.3 + p.ph)) * 0.9;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `rgba(220,255,160,${p.a})`); g.addColorStop(1, "rgba(220,255,160,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 7); ctx.fill();
          break;
        }
        case "meteor": {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < -120 || p.y > H + 60) Object.assign(p, spawn(mode));
          ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = p.r;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.16, p.y - p.vy * 0.16); ctx.stroke();
          break;
        }
        case "foam":
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y < H * 0.4) Object.assign(p, spawn(mode));
          ctx.fillStyle = `rgba(230,250,255,${p.a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
          break;
        case "paper":
          p.x += (p.vx + Math.sin(t + p.ph) * 20) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y > H + 24) Object.assign(p, spawn(mode), { y: -24 });
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(248,244,232,${p.a})`;
          ctx.fillRect(-p.r * 0.7, -p.r * 0.5, p.r * 1.4, p.r); ctx.restore();
          break;
        case "sparks": {
          p.a = Math.max(0, Math.sin(t * 2 + p.ph * 3));
          ctx.fillStyle = `rgba(255,240,200,${p.a * .8})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
          break;
        }
      }
    }
  }
  return { mount, set, tick, get mode() { return mode; } };
})();
