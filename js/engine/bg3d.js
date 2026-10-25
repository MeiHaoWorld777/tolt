/* ============ 全场景 three.js 背景框架 ============ */
window.BG3D = (function () {
  const supported = (function () {
    try { if (!window.THREE) return false; const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; }
  })();
  let renderer = null, scene = null, camera = null, holder = null, grp = null;
  let skyU = null, stars = [], clouds = [], rainPts = null, wheel = null;
  let cur = null, t0 = 0, camCfg = null;

  const PAL = {
    day:    { sky: [0x4fa3e8, 0xcfe8ff], fog: 0xbcd8f0, sun: 0xfff2d0 },
    sunset: { sky: [0x35407a, 0xff9a5a], fog: 0xd98a5e, sun: 0xffc37a },
    dusk:   { sky: [0x1c2750, 0xc2743f], fog: 0x7a6a88, sun: 0xffb070 },
    night:  { sky: [0x04070f, 0x12304c], fog: 0x0e2038, sun: 0xdfe8ff },
    rain:   { sky: [0x232a3e, 0x4c5670], fog: 0x4c5670, sun: 0xfff2d0 }
  };

  function glowTex() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  let GT = null;

  /* ---- 元件助手 ---- */
  function box(g, w, h, d, c, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c, fog: true }));
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m;
  }
  function cyl(g, r1, r2, h, c, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 12), new THREE.MeshBasicMaterial({ color: c, fog: true }));
    m.position.set(x, y, z); g.add(m); return m;
  }
  function glow(g, color, x, y, z, s, op) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color, transparent: true, opacity: op == null ? 0.8 : op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sp.position.set(x, y, z); sp.scale.set(s, s, 1); g.add(sp); return sp;
  }
  function flat(g, w, h, c, x, y, z, rx, ry, op) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op == null ? 1 : op, side: THREE.DoubleSide, fog: true }));
    m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; g.add(m); return m;
  }
  function winRow(g, x0, y0, z, n, dx, c, w, h) {
    for (let i = 0; i < n; i++) flat(g, w || 0.5, h || 0.7, c, x0 + i * (dx || 1), y0, z);
  }
  function tree(g, x, z, s, dark) {
    cyl(g, 0.12 * s, 0.18 * s, 1.6 * s, 0x3a2c22, x, 0.8 * s, z, 8);
    [[0, 2.1], [-0.6, 1.7], [0.6, 1.75]].forEach(o => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 10, 8), new THREE.MeshBasicMaterial({ color: dark || 0x2a4a30, fog: true }));
      b.position.set(x + o[0], o[1] * s, z); b.scale.y = 0.85; g.add(b);
    });
  }
  function lampPost(g, x, z, c) {
    cyl(g, 0.06, 0.08, 3.4, 0x2a2f3a, x, 1.7, z, 8);
    flat(g, 0.7, 0.16, 0xfff2c8, x, 3.42, z, 0, 0);
    glow(g, c || 0xffe2a0, x, 3.45, z, 2.0, 0.8);
  }
  function building(g, x, z, w, h, d, c, lit) {
    box(g, w, h, d, c, x, h / 2, z);
    if (lit) for (let r = 0; r < Math.floor(h / 1.6); r++)
      for (let k = 0; k < Math.floor(w / 1.4); k++)
        if ((r * 7 + k * 3 + x) % 5 > 1)
          flat(g, 0.4, 0.6, (r + k) % 3 ? 0xffd9a0 : 0xbfe0ff, x - w / 2 + 0.7 + k * 1.4, 1 + r * 1.6, z + d / 2 + 0.02);
  }
  function sea(g, c1, c2, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(420, 130, 1, 1), new THREE.ShaderMaterial({
      fog: false, uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(c1) }, uB: { value: new THREE.Color(c2) } },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; uniform float uT; uniform vec3 uA; uniform vec3 uB;" +
        "void main(){ float d=vUv.y; vec3 c=mix(uA,uB,pow(d,1.3));" +
        " c += vec3(.05,.09,.13)*(.5+.5*sin(vUv.x*80.0+uT*1.5+sin(vUv.y*20.0+uT*.6)*1.6))*d*.5;" +
        " gl_FragColor=vec4(c,1.0); }"
    }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -0.05, z == null ? 8 : z);
    g.add(m); return m;
  }

  /* ---- 场景建造器 ---- */
  const B = {};
  const W4 = [0xffd9a0, 0xbfe0ff, 0xfff2c8];

  function roomShell(g, P, floorC, wallC) {
    flat(g, 46, 34, floorC, 0, 0, 2, -Math.PI / 2);
    flat(g, 46, 13, wallC, 0, 6.5, -11);
    flat(g, 34, 13, wallC, -23, 6.5, -4, 0, Math.PI / 2);
    flat(g, 34, 13, wallC, 23, 6.5, -4, 0, -Math.PI / 2);
    flat(g, 46, 13, wallC, 0, 13, -4, 0, Math.PI, 0.92);
  }
  B.classroom = (g, P) => {
    roomShell(g, P, 0x9a8a70, P.night ? 0x22304a : 0xcfd6d4);
    flat(g, 7, 2.4, 0x2e4436, 0, 4.2, -10.8);
    for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 4; c2++) {
      box(g, 1.7, 0.1, 1, 0xb08d5e, -6 + c2 * 4, 1.5, 1 + r * 3.2);
      box(g, 1.4, 0.9, 0.5, 0x8a6a44, -6 + c2 * 4, 1.0, 1.9 + r * 3.2);
    }
    for (let i = 0; i < 4; i++) {
      flat(g, 2.6, 3.4, P.winSky, -16 + i * 10.4, 6.4, -10.9);
      flat(g, 0.18, 3.4, 0xffffff, -16 + i * 10.4 - 1.3, 6.4, -10.85);
    }
    glow(g, P.winSky, 0, 4.5, -6, 16, P.night ? 0.25 : 0.5);
  };
  B.library = (g, P) => {
    roomShell(g, P, 0x8a7458, 0xb9a27e);
    for (let i = 0; i < 4; i++) {
      box(g, 1, 5.5, 14, 0x5e4630, -16 + i * 10.4, 2.75, -7);
      for (let r = 0; r < 5; r++) flat(g, 0.9, 0.85, [0xa04a4a, 0x4a6ea0, 0x6aa04a, 0xc0a050][r % 4], -16 + i * 10.4, 1.2 + r * 1.05, -7);
    }
    for (let i = 0; i < 3; i++) { box(g, 6, 0.16, 1.6, 0x8a6a44, -8 + i * 8, 1.5, 4); cyl(g, 0.08, 0.08, 1.5, 0x5e4630, -10 + i * 8, 0.75, 4, 6); cyl(g, 0.08, 0.08, 1.5, 0x5e4630, -6 + i * 8, 0.75, 4, 6); glow(g, 0xffe2a0, -8 + i * 8, 3.4, 4, 3, 0.7); }
  };
  B.music = (g, P) => {
    roomShell(g, P, 0x7a6248, 0xd6c8a8);
    box(g, 2.6, 1.1, 1.4, 0x101018, 4, 0.85, -7); flat(g, 2.3, 0.75, 0xf0f0f0, 4, 1.42, -6.55, -0.5);
    box(g, 1.1, 1.3, 0.5, 0x101018, 5.5, 0.65, -7.6);
    for (let i = 0; i < 5; i++) { box(g, 0.9, 1.5, 0.9, 0x6a4a30, -12 + i * 3.2, 0.75, -2); glow(g, P.sunC, -12 + i * 3.2, 4, -9.5, 6, 0.4); }
    for (let i = 0; i < 4; i++) flat(g, 3.4, 4.4, P.winSky, -15 + i * 10, 6.2, -10.9);
    glow(g, P.winSky, 0, 5, -6, 18, 0.55);
  };
  B.corridor = (g, P) => {
    flat(g, 12, 60, 0x9aa0a8, 0, 0, -12, -Math.PI / 2);
    flat(g, 60, 8, P.night ? 0x1c2840 : 0xd8dce0, 0, 4, -42, 0, 0);
    flat(g, 60, 8, P.night ? 0x24304a : 0xc8ccd2, -6, 4, -12, 0, Math.PI / 2);
    flat(g, 60, 8, P.night ? 0x1a2438 : 0xe0e4e8, 6, 4, -12, 0, -Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      flat(g, 5, 3.2, P.winSky, -6.02, 4.8, -8 - i * 6.4, 0, Math.PI / 2);
      box(g, 0.2, 4.4, 2.4, P.night ? 0x2c3850 : 0xb8bcc4, 5.9, 2.2, -8 - i * 6.4);
      glow(g, 0xfff6dd, 0, 7.2, -6 - i * 6.4, 3.4, 0.85);
    }
  };
  B.bedroom = (g, P) => {
    roomShell(g, P, 0x5e4a3a, 0x3a4664);
    box(g, 4.4, 0.7, 7.2, 0x8a5a3a, -13, 0.6, -3); flat(g, 4.2, 6.8, 0xc8d8e8, -13, 1.0, -3, -Math.PI / 2);
    box(g, 1.6, 0.35, 1, 0xf0f0f4, -13, 1.05, 0.2);
    box(g, 3.4, 0.14, 1.6, 0x6a4a30, 12, 1.7, -8); box(g, 0.16, 1.7, 0.16, 0x6a4a30, 13.4, 0.85, -8);
    glow(g, 0xffd9a0, 11.6, 2.4, -8, 4, 0.9);
    flat(g, 3, 2.6, 0x8ab4d8, 0, 6.2, -10.85); glow(g, 0xdfe8ff, 0, 6.2, -9, 7, 0.4);
    const mo = glow(g, 0xf4f6fc, 2, 12, -60, 8, 0.95);
  };
  B.minshukuRoom = (g, P) => {
    roomShell(g, P, 0x6a7a4e, 0xcaba96);
    for (let i = 0; i < 8; i++) flat(g, 0.06, 34, 0x4e5c38, -21 + i * 5.6, 0.02, 2, -Math.PI / 2);
    box(g, 3.4, 0.5, 2, 0x7a5a3a, 0, 0.35, -3); flat(g, 3.2, 1.8, 0x40342a, 0, 0.62, -3, -Math.PI / 2);
    for (let i = 0; i < 3; i++) flat(g, 8.6, 4.6, 0xfff2d0, -14 + i * 14, 6.4, -10.9, 0, 0, 0.9);
    for (let i = 0; i < 4; i++) flat(g, 0.1, 4.6, 0x8a7450, -18.2 + i * 5.2, 6.4, -10.8);
    glow(g, 0xffe8c0, 0, 5.5, -8, 20, 0.5);
  };
  B.minshukuVeranda = (g, P) => {
    flat(g, 10, 60, 0x8a6a48, 0, 0.02, -6, -Math.PI / 2);
    for (let i = 0; i < 30; i++) flat(g, 0.1, 60, 0x6a4c30, 0, 0.04, -6, -Math.PI / 2), box(g, 10, 0.3, 60, 0x000000, 0, -1, -6);
    box(g, 30, 8, 0.6, 0x4a3828, 0, 4, -14); for (let i = 0; i < 5; i++) flat(g, 3, 3.6, 0xffe8c0, -10 + i * 5, 4.4, -13.6, 0, 0, 0.85);
    for (let i = 0; i < 6; i++) box(g, 0.3, 2.6, 0.3, 0x5e4630, 4.6, 1.3, -20 + i * 8);
    flat(g, 40, 40, 0x1c2a20, -14, 0, -10, -Math.PI / 2);
    tree(g, -8, -12, 1.6, 0x223c26); tree(g, -16, -20, 2, 0x1e3622);
    glow(g, 0xffca70, -8, 1.2, -16, 3, 0.9); glow(g, 0xffca70, 4.6, 2.4, -6, 3.2, 0.8);
  };
  B.minshukuOut = (g, P) => {
    flat(g, 60, 60, 0x2a3038, 0, 0, 0, -Math.PI / 2);
    box(g, 34, 9, 12, 0x3a3228, 0, 4.5, -22); box(g, 38, 1.4, 15, 0x26201a, 0, 9.6, -21);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) flat(g, 1.6, 1.9, 0xffd9a0, -12 + i * 6, 3 + r * 3.6, -15.9);
    for (let i = 0; i < 6; i++) flat(g, 2.2, 8, 0x6a5a42, -25 + i * 10, 4, -14.5);
    for (let i = 0; i < 4; i++) glow(g, 0xff9a4a, -13.5 + i * 9, 3.4, -12, 3.4, 0.95);
    flat(g, 3.4, 30, 0x565c60, 0, 0.02, 4, -Math.PI / 2);
    tree(g, -14, 6, 1.5, 0x1c3018); tree(g, 14, 8, 1.7, 0x1c3018);
  };
  B.cakeShop = (g, P) => {
    roomShell(g, P, 0xd8cfc0, 0xf2e6d4);
    box(g, 20, 1.2, 2, 0x8a5a3a, 0, 0.6, -7.5); flat(g, 20, 0.9, 0xf4ecdd, 0, 1.28, -7.5, -Math.PI / 2);
    const caseM = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.28 }));
    caseM.position.set(-4, 2.1, -6.4); g.add(caseM);
    for (let i = 0; i < 4; i++) cyl(g, 0.3, 0.34, 0.5, [0xf0a0b8, 0xf4d0a0, 0xc8a0e0, 0xa0d0c0][i], -5.4 + i * 1, 1.7, -6.4, 10);
    for (let i = 0; i < 6; i++) { box(g, 1.6, 0.5, 0.9, i % 2 ? 0xf0a0b8 : 0xfff4e0, -5 + i * 2, 8.6, -9.6); }
    glow(g, 0xffe8c0, 0, 4.6, -4, 16, 0.5);
    for (let i = 0; i < 3; i++) glow(g, 0xfff0d0, -6 + i * 6, 6.6, -9, 5, 0.9);
  };
  B.courtyard = (g, P) => {
    flat(g, 300, 300, 0x9aa38c, 0, 0, -60, -Math.PI / 2);
    flat(g, 3.4, 40, 0xb8b0a0, 0, 0.02, 0, -Math.PI / 2);
    flat(g, 40, 9, 0xc8bca8, 0, 4.5, -16); box(g, 1.2, 7, 1.2, 0xb0a490, -6, 3.5, -12); box(g, 1.2, 7, 1.2, 0xb0a490, 6, 3.5, -12);
    box(g, 14.4, 1, 1.4, 0xb0a490, 0, 7.4, -12);
    tree(g, -13, -6, 1.9, 0x33663a); tree(g, 13, -8, 2.1, 0x2e5c34); tree(g, -17, 8, 1.4, 0x33663a);
  };
  B.schoolGate = (g, P) => {
    flat(g, 400, 400, 0x8e9a88, 0, 0, -60, -Math.PI / 2);
    flat(g, 8, 60, 0xb0a898, 0, 0.02, 0, -Math.PI / 2);
    box(g, 1.6, 6.5, 1.6, 0xc8bca8, -4.4, 3.25, -10); box(g, 1.6, 6.5, 1.6, 0xc8bca8, 4.4, 3.25, -10);
    box(g, 10.6, 1, 1.3, 0xc8bca8, 0, 7, -10);
    box(g, 40, 10, 10, 0xd0c4ae, 0, 5, -34);
    winRow(g, -14, 4.2, -28.8, 9, 3.4, P.winSky, 1.8, 2.2);
    for (let i = 0; i < 6; i++) { flat(g, 14, 0.16, 0x5a6068, -22 + i * 8, 4.4, -6, 0, Math.PI / 2, 0.7); box(g, 0.16, 4.4, 0.16, 0x5a6068, -22 + i * 8, 2.2, -6); }
    tree(g, -12, -2, 1.8, 0x2e5c34); tree(g, 12, -3, 2, 0x2e5c34);
  };
  B.park = (g, P) => {
    flat(g, 400, 400, 0x7e9a70, 0, 0, -60, -Math.PI / 2);
    flat(g, 5, 60, 0xc0b090, 0, 0.02, 0, -Math.PI / 2);
    for (let i = 0; i < 6; i++) { tree(g, -8 - (i % 2) * 3, -4 - i * 7, 1.7 + (i % 3) * 0.3, 0x2e5c34); tree(g, 8 + (i % 2) * 3, -8 - i * 7, 1.6 + (i % 2) * 0.4, 0x33663a); }
    for (let i = 0; i < 4; i++) lampPost(g, -4.4, -6 - i * 12, P.sunC);
  };
  B.rooftop = (g, P) => {
    flat(g, 400, 240, P.cityC, 0, -0.02, -60, -Math.PI / 2);
    sea(g, P.seaA, P.seaB, -150);
    flat(g, 60, 60, P.roofC, 0, 0.04, 0, -Math.PI / 2);
    box(g, 7, 4.4, 6, P.wallC, -20, 2.2, -14); box(g, 3.4, 2.6, 0.3, 0x3a6a8a, -19, 1.3, -10.9);
    cyl(g, 2.4, 2.4, 3.4, 0x9aa4ac, -18, 6.1, -16, 16);
    for (let i = 0; i < 4; i++) cyl(g, 0.1, 0.1, 1.6, 0x8a9098, -19.4 + i * 1.2, 4.6, -16, 6);
    box(g, 3, 1.4, 2.2, P.wallC, 16, 0.7, 8); cyl(g, 0.3, 0.4, 1.1, 0x9aa4ac, 13.4, 0.55, 8, 10);
    for (let i = 0; i < 11; i++) { box(g, 0.14, 1.5, 0.14, 0x6a7a88, -27 + i * 5.4, 0.75, 13); if (i < 10) box(g, 5.4, 0.12, 0.12, 0x6a7a88, -24.3 + i * 5.4, 1.4, 13); }
    for (let i = 0; i < 8; i++) { box(g, 0.14, 1.5, 0.14, 0x6a7a88, 28, 0.75, -22 + i * 5.4); if (i < 7) box(g, 0.12, 0.12, 5.4, 0x6a7a88, 28, 1.4, -19.3 + i * 5.4); }
    for (let i = 0; i < 9; i++) building(g, -58 + i * 8.5, -95, 6, 5 + (i * 13) % 12, 6, P.cityC, P.night);
    const lh = cyl(g, 0.5, 0.8, 6, 0xd8dde4, 24, 3, -110, 10); glow(g, 0xfff2c8, 24, 6.4, -110, 6, P.night ? 1 : 0.8);
    glow(g, P.sunC, -30, 20, -180, 34, 0.5);
  };
  B.seaside = (g, P) => {
    flat(g, 400, 200, P.sandC, 0, 0, 30, -Math.PI / 2);
    sea(g, P.seaA, P.seaB, -6);
    for (let i = 0; i < 6; i++) { cyl(g, 0.22, 0.26, 2.2, 0x4a4038, -18 + i * 7, 0.9, -6, 8); if (i < 5) box(g, 7, 0.22, 0.4, 0x4a4038, -14.5 + i * 7, 1.85, -6); }
    if (P.night) glow(g, 0xdfe8ff, 22, 26, -120, 16, 0.95);
    else glow(g, P.sunC, P.night ? 0 : 26, P.night ? 24 : 12, -130, 44, 0.55);
  };
  B.shopping = (g, P) => {
    flat(g, 400, 400, 0x3c4048, 0, 0, -60, -Math.PI / 2);
    flat(g, 9, 70, 0x4a4e56, 0, 0.02, 0, -Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const h = 9 + (i % 3) * 3;
      building(g, -13, -8 - i * 10, 10, h, 7, P.bldC, false);
      building(g, 13, -13 - i * 10, 10, 8 + (i % 2) * 4, 7, P.bldC2, false);
      const sc = [0xff6a8a, 0x5ad0ff, 0xffd050, 0x8affa0][i % 4];
      flat(g, 3.2, 1.4, sc, -7.9, 5.4 - (i % 3), -8 - i * 10, 0, Math.PI / 2);
      flat(g, 3.2, 1.4, [0x50e0c0, 0xffa050, 0xff8adf, 0xa0c8ff][i % 4], 7.9, 5 - (i % 3), -13 - i * 10, 0, -Math.PI / 2);
      glow(g, sc, -7.6, 5.4 - (i % 3), -8 - i * 10, 3.6, P.night ? 0.9 : 0.35);
    }
    lampPost(g, -5.6, -8, P.sunC); lampPost(g, 5.6, -26, P.sunC); lampPost(g, -5.6, -44, P.sunC);
  };
  B.festival = (g, P) => {
    flat(g, 400, 400, 0x3a3630, 0, 0, -60, -Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      building(g, -13, -8 - i * 13, 11, 10, 7, 0x2c2820, false);
      building(g, 13, -14 - i * 13, 11, 9, 7, 0x302c24, false);
      box(g, 4.4, 2.4, 3, 0x5e4a30, -7.4, 1.2, -10 - i * 13); box(g, 4.4, 2.4, 3, 0x5e4a30, 7.4, 1.2, -16 - i * 13);
      flat(g, 4.8, 0.5, i % 2 ? 0xd04848 : 0xe8e0d0, -7.4, 2.6, -8.4 - i * 13, -0.5);
      flat(g, 3.4, 1.2, 0xfff2d0, -7.4, 1.8, -8.3 - i * 13);
    }
    for (let i = 0; i < 14; i++) {
      const lx = -11 + (i % 2) * 22, lz = -6 - i * 4.6;
      glow(g, i % 2 ? 0xff5a4a : 0xff8a3a, lx, 6.2, lz, 3.4, 0.95);
      flat(g, 0.9, 1.3, i % 2 ? 0xd04848 : 0xe87a3a, lx, 6.2, lz, 0, Math.PI / 2);
    }
    box(g, 0.08, 0.08, 66, 0x2a2620, -11, 6.9, -32); box(g, 0.08, 0.08, 66, 0x2a2620, 11, 6.9, -32);
  };
  B.station = (g, P) => {
    flat(g, 400, 200, P.groundC, 0, 0, -20, -Math.PI / 2);
    box(g, 26, 1.1, 60, P.platC, 0, 0.55, -8);
    flat(g, 1.1, 56, 0xe8b84a, 0, 1.12, -10, -Math.PI / 2);
    box(g, 22, 0.5, 44, P.roofC, -2, 9.6, -12); box(g, 22, 0.4, 3, P.roofC, -2, 10.1, -12);
    for (let i = 0; i < 6; i++) cyl(g, 0.28, 0.34, 9, P.pilC, -11 + i * 4.4, 4.8, -20 + (i % 2) * 14, 10);
    box(g, 4.6, 1.3, 0.3, 0x2c3448, -6, 6.8, -6); glow(g, 0x96d2ff, -6, 6.8, -5.7, 5.4, 0.9);
    for (let i = 0; i < 3; i++) lampPost(g, -14 + i * 12, 6, 0xffe2a0);
    for (let i = 0; i < 7; i++) building(g, -52 + i * 8, -85, 6.4, 6 + (i * 11) % 13, 6, P.cityC, P.night);
    sea(g, P.seaA, P.seaB, -150);
    box(g, 30, 2.2, 3, 0x141a26, 14, 1.6, -34);
    glow(g, P.sunC, 34, 14, -110, 30, 0.5);
  };
  B.ferris = (g, P) => {
    flat(g, 400, 400, P.groundC, 0, 0, -60, -Math.PI / 2);
    const wh = new THREE.Group(); wh.position.set(0, 15, -34);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(12.6, 0.32, 8, 40), new THREE.MeshBasicMaterial({ color: P.rimC, fog: true }));
    wh.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(10.4, 0.18, 6, 32), new THREE.MeshBasicMaterial({ color: P.rimC, fog: true })); wh.add(rim2);
    for (let i = 0; i < 8; i++) { const sp = box(wh, 0.22, 25.2, 0.22, P.spokeC, 0, 0, 0); sp.rotation.z = i * Math.PI / 8; }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const cab = box(wh, 1.5, 1.2, 1.3, P.night ? 0x303a52 : 0xd8dde4, Math.cos(a) * 11.5, Math.sin(a) * 11.5, 0);
      if (P.night) flat(g, 0.01, 0.01, 0, 0, 0, 0);
      if (P.night) glow(g, 0xffe2a0, 0, 0, 0, 0.01);
      cab.userData.a = a;
    }
    wh.userData.cabs = [];
    wh.children.forEach(m => { if (m.geometry && m.geometry.type === "BoxGeometry" && m.userData.a != null) wh.userData.cabs.push(m); });
    // 舱厢保持竖直：每帧由 loop 修正（记录角度）
    window._bg3dWheel = { wh, cabs: wh.userData.cabs };
    box(g, 1.6, 15, 1.6, P.spokeC, -5, 7.5, -34); box(g, 1.6, 15, 1.6, P.spokeC, 5, 7.5, -34);
    box(g, 12, 1.2, 3, P.spokeC, 0, 0.6, -34);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; glow(g, P.sunC, Math.cos(a) * 12.6, 15 + Math.sin(a) * 12.6, -34, 2.6, P.night ? 0.95 : 0.5); }
    glow(g, P.sunC, 0, 15, -33, 7, P.night ? 0.95 : 0.6);
    tree(g, -26, 6, 1.6, 0x2e5c34); tree(g, 26, 4, 1.7, 0x33663a);
  };

  /* ---- 场景注册表 ---- */
  const SCN = {
    classroom_day: { b: "classroom", p: "day", cam: [0, 4.6, 12], look: [0, 4, -6], winSky: 0xbfe0ff, sunC: 0xfff2d0 },
    classroom_sunset: { b: "classroom", p: "sunset", cam: [0, 4.6, 12], look: [0, 4, -6], winSky: 0xffb070, sunC: 0xff9a5a },
    library: { b: "library", p: "day", cam: [0, 4.2, 12], look: [0, 3.4, -6], winSky: 0xbfe0ff, sunC: 0xfff2d0 },
    music_room: { b: "music", p: "sunset", cam: [0, 4.4, 12], look: [0, 4, -6], winSky: 0xffb070, sunC: 0xff9a5a },
    corridor: { b: "corridor", p: "day", cam: [0, 4, 6], look: [0, 4, -30], winSky: 0xcfe8ff, sunC: 0xfff2d0 },
    bedroom: { b: "bedroom", p: "night", cam: [0, 4.4, 11], look: [0, 4.2, -6], winSky: 0x8ab4d8, sunC: 0xdfe8ff },
    minshuku_room: { b: "minshukuRoom", p: "day", cam: [0, 4.4, 12], look: [0, 4, -6], winSky: 0xfff2d0, sunC: 0xffe8c0 },
    minshuku_veranda: { b: "minshukuVeranda", p: "night", cam: [0, 4.2, 10], look: [0, 3.6, -14], winSky: 0xffe8c0, sunC: 0xffca70 },
    minshuku_out: { b: "minshukuOut", p: "night", cam: [0, 4.8, 14], look: [0, 4.4, -14], winSky: 0xffd9a0, sunC: 0xffca70 },
    cake_shop: { b: "cakeShop", p: "day", cam: [0, 4.4, 11], look: [0, 4, -6], winSky: 0xfff2d0, sunC: 0xffe8c0 },
    courtyard: { b: "courtyard", p: "day", cam: [0, 4.6, 14], look: [0, 4, -10], winSky: 0xbfe0ff, sunC: 0xfff2d0 },
    school_gate: { b: "schoolGate", p: "day", cam: [0, 4.8, 14], look: [0, 4.4, -12], winSky: 0xbfe0ff, sunC: 0xfff2d0 },
    park_entrance: { b: "park", p: "day", cam: [0, 4.6, 14], look: [0, 4, -16], winSky: 0xbfe0ff, sunC: 0xfff2d0 },
    rooftop: { b: "rooftop", p: "day", cam: [0, 6, 16], look: [0, 5, -30], winSky: 0x7ec3f0, sunC: 0xfff2d0, roofC: 0xa8b0b8, wallC: 0xc4ccd0, cityC: 0xb8c4cc, seaA: 0x3a7ac0, seaB: 0x8ac8e8 },
    rooftop_night: { b: "rooftop", p: "night", cam: [0, 6, 16], look: [0, 5, -30], winSky: 0x8ab4d8, sunC: 0xdfe8ff, roofC: 0x39424e, wallC: 0x465064, cityC: 0x1a2434, seaA: 0x0c2440, seaB: 0x2a5a80, stars: true, night: true },
    seaside_day: { b: "seaside", p: "day", cam: [0, 4.6, 14], look: [0, 4.4, -20], winSky: 0x7ec3f0, sunC: 0xfff2d0, sandC: 0xe8dcb8, seaA: 0x2a6ab0, seaB: 0x7ec3f0 },
    seaside_sunset: { b: "seaside", p: "sunset", cam: [0, 4.6, 14], look: [0, 4.4, -20], winSky: 0xffb070, sunC: 0xffc37a, sandC: 0xc8a878, seaA: 0x4a4a80, seaB: 0xff9a5a },
    seaside_night: { b: "seaside", p: "night", cam: [0, 4.6, 14], look: [0, 4.4, -20], winSky: 0x8ab4d8, sunC: 0xdfe8ff, sandC: 0x4a4a54, seaA: 0x081c34, seaB: 0x1e4468, stars: true, night: true },
    shopping_day: { b: "shopping", p: "day", cam: [0, 5, 13], look: [0, 4.6, -20], winSky: 0x7ec3f0, sunC: 0xfff2d0, bldC: 0xcfc4b4, bldC2: 0xd8ccc0 },
    shopping_dusk: { b: "shopping", p: "dusk", cam: [0, 5, 13], look: [0, 4.6, -20], winSky: 0xffb070, sunC: 0xffb070, bldC: 0x4a4258, bldC2: 0x544a60, stars: false },
    shopping_night: { b: "shopping", p: "night", cam: [0, 5, 13], look: [0, 4.6, -20], winSky: 0x8ab4d8, sunC: 0xdfe8ff, bldC: 0x20293e, bldC2: 0x26314a, stars: true, night: true },
    festival_street: { b: "festival", p: "night", cam: [0, 4.8, 13], look: [0, 4.4, -24], winSky: 0xffe8c0, sunC: 0xff8a3a, stars: true, night: true },
    station_day: { b: "station", p: "day", cam: [0, 5.2, 15], look: [0, 4.6, -24], winSky: 0x7ec3f0, sunC: 0xfff2d0, groundC: 0x8a9096, platC: 0xb8bcc2, roofC: 0x6a747e, pilC: 0x9aa2ac, cityC: 0xb8c4cc, seaA: 0x3a7ac0, seaB: 0x8ac8e8 },
    station_rain: { b: "station", p: "rain", cam: [0, 5.2, 15], look: [0, 4.6, -24], winSky: 0x96b4cc, sunC: 0xffd9a0, groundC: 0x2c3442, platC: 0x4a5264, roofC: 0x3a4250, pilC: 0x525a6a, cityC: 0x222a3c, seaA: 0x1a2c44, seaB: 0x38506c, rain: true, night: true },
    ferris_day: { b: "ferris", p: "day", cam: [0, 7, 24], look: [0, 10, -30], winSky: 0x7ec3f0, sunC: 0xfff2d0, groundC: 0x7e9a70, rimC: 0xe8e4da, spokeC: 0xb8b4aa },
    ferris_night: { b: "ferris", p: "night", cam: [0, 7, 24], look: [0, 10, -30], winSky: 0x8ab4d8, sunC: 0xffe2a0, groundC: 0x242e28, rimC: 0x8ab4ff, spokeC: 0x3a4458, stars: true, night: true }
  };

  function build(id) {
    const cfg = SCN[id]; if (!cfg) return false;
    const P = PAL[cfg.p];
    // 清空
    if (grp) { scene.remove(grp); grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    grp = new THREE.Group(); scene.add(grp);
    skyU.uA.value.set(cfg.sky ? PAL[cfg.p].sky[0] : P.sky[0]); skyU.uA.value.set(P.sky[0]); skyU.uB.value.set(P.sky[1]);
    stars.forEach(s => s.visible = !!cfg.stars);
    clouds.forEach(c2 => c2.visible = !P.night && !cfg.rain);
    camCfg = { cam: cfg.cam, look: cfg.look };
    B[cfg.b](grp, Object.assign({ night: !!cfg.night }, cfg));
    // 雨
    if (cfg.rain) {
      const pos = [];
      for (let i = 0; i < 500; i++) pos.push((Math.random() - .5) * 60, Math.random() * 26, -40 + Math.random() * 55);
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      rainPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xa8c4e0, size: 0.13, transparent: true, opacity: 0.55 }));
      grp.add(rainPts);
    } else rainPts = null;
    return true;
  }

  function mount() {
    if (!supported || renderer) return;
    const bgCanvas = document.getElementById("bg-canvas");
    holder = document.createElement("div");
    holder.id = "bg-gl";
    holder.style.cssText = "position:absolute;inset:0;z-index:1;pointer-events:none;";
    bgCanvas.parentNode.insertBefore(holder, bgCanvas.nextSibling);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    holder.appendChild(renderer.domElement);
    GT = glowTex();
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbcd8f0, 40, 190);
    camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 600);
    // 天穹
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uA: { value: new THREE.Color(0x4fa3e8) }, uB: { value: new THREE.Color(0xcfe8ff) } },
      vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec3 vP; uniform vec3 uA; uniform vec3 uB; void main(){ float h=clamp(vP.y/300.0,0.0,1.0); gl_FragColor=vec4(mix(uB,uA,pow(h,0.6)),1.0); }"
    }));
    scene.add(sky); skyU = sky.material.uniforms;
    // 星
    for (let ph = 0; ph < 3; ph++) {
      const g2 = new THREE.BufferGeometry(); const pos = [];
      for (let i = 0; i < 160; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.04, r = 285; pos.push(r * Math.cos(e) * Math.sin(a), r * Math.sin(e), r * Math.cos(e) * Math.cos(a)); }
      g2.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const st = new THREE.Points(g2, new THREE.PointsMaterial({ color: 0xcdd9f5, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false }));
      st.userData.ph = ph * 0.4 + 0.3; scene.add(st); stars.push(st);
    }
    // 云（白天）
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color: 0xffffff, transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
      sp.position.set(-160 + Math.random() * 320, 60 + Math.random() * 55, -200 - Math.random() * 40);
      sp.scale.set(70 + Math.random() * 60, 22 + Math.random() * 14, 1);
      sp.userData.v = 0.4 + Math.random() * 0.5;
      scene.add(sp); clouds.push(sp);
    }
    t0 = performance.now();
    setInterval(tick3d, 33);
    window.addEventListener("resize", () => { if (!renderer) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  }

  function tick3d() {
    if (!renderer || !cur) return;
    const t = (performance.now() - t0) / 1000;
    if (camCfg) {
      camera.position.set(camCfg.cam[0] + Math.sin(t * 0.28) * 0.35, camCfg.cam[1] + Math.sin(t * 0.21) * 0.18, camCfg.cam[2]);
      camera.lookAt(camCfg.look[0], camCfg.look[1], camCfg.look[2]);
    }
    stars.forEach(s => s.material.opacity = 0.4 + 0.3 * Math.abs(Math.sin(t * 0.7 + s.userData.ph)));
    clouds.forEach(c2 => { c2.position.x += c2.userData.v * 0.033; if (c2.position.x > 190) c2.position.x = -190; });
    if (window._bg3dWheel) {
      const w2 = window._bg3dWheel; w2.wh.rotation.z += 0.0016;
      w2.cabs.forEach(cb => { const a = cb.userData.a + w2.wh.rotation.z; cb.position.set(Math.cos(a) * 11.5, Math.sin(a) * 11.5, 0); cb.rotation.z = -w2.wh.rotation.z; });
    }
    if (rainPts) {
      const p = rainPts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { let y = p.getY(i) - 0.85; if (y < 0) y = 26; p.setY(i, y); }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function show(id) {
    if (!supported) return false;
    if (!renderer) mount();
    if (!SCN[id]) return false;
    if (cur !== id) { build(id); cur = id; }
    holder.style.display = "block";
    return true;
  }
  function hide() { if (holder) holder.style.display = "none"; cur = null; }

  return { supported, has: id => !!SCN[id], show, hide, get current() { return cur; } };
})();
