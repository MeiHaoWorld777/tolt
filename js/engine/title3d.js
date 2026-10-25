/* ============ 主页 three.js 全 3D 场景 ============ */
window.Title3D = (function () {
  let renderer = null, scene = null, camera = null, timer = null;
  let beamGroup = null, flashDiv = null, holder = null;
  let t0 = 0, lastT = 0, beamT = 0;
  let camBase = null, camTgt = null, parX = 0, parY = 0;
  const sevenL = [-52, -38, -24, -8, 8, 24, 38];

  const supported = (function () {
    try {
      if (!window.THREE) return false;
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch (e) { return false; }
  })();

  function glowTex(inner, outer) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); return t;
  }

  function mount(screen) {
    if (!supported || renderer) return;
    holder = document.createElement("div");
    holder.id = "title-gl";
    holder.style.cssText = "position:absolute;inset:0;z-index:1;";
    const inner = screen.querySelector("#title-inner");
    if (inner) inner.style.cssText += ";position:relative;z-index:10;";
    screen.insertBefore(holder, screen.firstChild);

    flashDiv = document.createElement("div");
    flashDiv.style.cssText = "position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 60% 30%, rgba(220,235,255,.9), rgba(160,200,255,.25) 55%, transparent 80%);";
    screen.insertBefore(flashDiv, screen.children[1]);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x060c1c);
    holder.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0c1a30, 60, 210);
    camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
    camBase = new THREE.Vector3(0, 4.4, 27); camTgt = new THREE.Vector3(0, 3.6, 0);
    camera.position.set(0, 1.0, 44);
    camera.lookAt(camTgt);

    /* --- 天穹渐变 --- */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(240, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {},
        vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "varying vec3 vP; void main(){ float h = clamp(vP.y/240.0,0.0,1.0); vec3 c = mix(vec3(0.086,0.188,0.306), vec3(0.020,0.039,0.094), pow(h,0.65)); gl_FragColor = vec4(c,1.0); }"
      })
    );
    scene.add(sky);

    /* --- 星空（三层闪烁） --- */
    const starGeo = () => {
      const g = new THREE.BufferGeometry(); const pos = [];
      for (let i = 0; i < 220; i++) {
        const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.42 + 0.05, r = 225;
        pos.push(r * Math.cos(e) * Math.sin(a), r * Math.sin(e), r * Math.cos(e) * Math.cos(a));
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return g;
    };
    window._t3dStars = [0.5, 0.8, 1.1].map(ph => {
      const m = new THREE.PointsMaterial({ color: 0xcdd9f5, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false });
      const p = new THREE.Points(starGeo(), m); p.userData.ph = ph; scene.add(p); return p;
    });

    /* --- 月亮 --- */
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40), new THREE.MeshBasicMaterial({ color: 0xeef2fc, fog: false }));
    moon.position.set(34, 44, -180); scene.add(moon);
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(225,238,255,.85)", "rgba(225,238,255,0)"), transparent: true, opacity: 0.55, fog: false }));
    moonGlow.position.copy(moon.position); moonGlow.scale.set(42, 42, 1); scene.add(moonGlow);

    /* --- 海面 --- */
    const seaMat = new THREE.ShaderMaterial({
      fog: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: [
        "varying vec2 vUv; uniform float uT;",
        "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }",
        "void main(){",
        "  float d = vUv.y;",                       // 0=近岸 1=远
        "  vec3 deep = vec3(0.030,0.068,0.125); vec3 far = vec3(0.055,0.145,0.26);",
        "  vec3 c = mix(deep, far, pow(d,1.4));",
        "  float band = sin(vUv.x*90.0 + uT*1.6 + sin(vUv.y*24.0+uT*0.7)*1.8)*0.5+0.5;",
        "  c += vec3(0.035,0.07,0.11) * band * d * 0.4;",
        "  float sp = hash(floor(vUv*vec2(160.0,60.0)) + floor(uT*3.0));",
        "  c += vec3(0.10,0.16,0.22) * step(0.985, sp) * (0.25+d);",
        "  gl_FragColor = vec4(c,1.0);",
        "}"
      ].join("\n")
    });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 170, 1, 1), seaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, 12);
    scene.add(sea);
    window._t3dSea = seaMat;

    /* --- 远岸城市（左） --- */
    const cityMat = new THREE.MeshBasicMaterial({ color: 0x0a1120, fog: true });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
    for (let i = 0; i < 10; i++) {
      const w = 3 + Math.random() * 4, h = 4 + Math.random() * 8;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), cityMat);
      b.position.set(-62 + i * 5.6, h / 2, -82 - Math.random() * 14);
      scene.add(b);
      for (let k = 0; k < 2 + Math.random() * 3; k++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.5), winMat);
        win.position.set(b.position.x + (Math.random() - .5) * w * .7, 1 + Math.random() * (h - 1.5), b.position.z + 2.6);
        scene.add(win);
      }
    }

    /* --- 悬崖（右） --- */
    const cliffMat = new THREE.MeshBasicMaterial({ color: 0x0a0f1c, fog: true });
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(24, 6.5, 13), cliffMat);
    cliff.position.set(30, 3.25, -8); scene.add(cliff);
    const cliff2 = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 9), cliffMat);
    cliff2.position.set(15, 2.1, -1); scene.add(cliff2);

    /* --- 灯塔 --- */
    const towerMat = new THREE.MeshBasicMaterial({ color: 0x0b0f1a, fog: true });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.5, 10, 14), towerMat);
    tower.position.set(13, 9.5, 1.5); scene.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.4, 14), towerMat);
    cap.position.set(13, 15.2, 1.5); scene.add(cap);
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 14), towerMat);
    gallery.position.set(13, 14.35, 1.5); scene.add(gallery);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.05, 14),
      new THREE.MeshBasicMaterial({ color: 0xffe096, fog: false }));
    lamp.position.set(13, 14.8, 1.5); scene.add(lamp);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,226,150,.95)", "rgba(255,226,150,0)"), transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    lampGlow.position.set(13, 14.8, 1.5); lampGlow.scale.set(11, 11, 1); scene.add(lampGlow);

    /* --- 旋转光束（双锥） --- */
    beamGroup = new THREE.Group();
    beamGroup.position.set(13, 14.8, 1.5);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const b1 = new THREE.Mesh(new THREE.ConeGeometry(4.2, 52, 20, 1, true), beamMat);
    b1.rotation.z = Math.PI / 2; b1.position.x = 26;
    const b2 = b1.clone(); b2.rotation.z = -Math.PI / 2; b2.position.x = -26;
    beamGroup.add(b1, b2); scene.add(beamGroup);

    /* --- 七帆灯（岸灯 + 水面倒影条） --- */
    const cols = [0x7aa7ff, 0x6f8fe8, 0x9aa8c8, 0xdec282, 0xa8b4ea, 0xf0a06a, 0x6ab0d8];
    window._t3dLamps = cols.map((col, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex("rgba(255,255,255,.95)", "rgba(255,255,255,0)"),
        color: col, transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      const x = sevenL[i], z = -26 - (i % 3) * 4;
      s.position.set(x, 1.1, z); s.scale.set(4.5, 4.5, 1);
      scene.add(s);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), cliffMat);
      pole.position.set(x, 1.1, z); scene.add(pole);
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 16),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      rf.rotation.x = -Math.PI / 2;
      rf.position.set(x, 0.06, z + 12); scene.add(rf);
      return { s, rf, ph: i * 0.9 };
    });

    /* --- 视差（鼠标 / 陀螺仪） --- */
    window.addEventListener("pointermove", e => {
      parX = (e.clientX / innerWidth - 0.5) * 1.6;
      parY = (e.clientY / innerHeight - 0.5) * 0.8;
    }, { passive: true });
    window.addEventListener("deviceorientation", e => {
      if (e.gamma != null) parX = Math.max(-1, Math.min(1, e.gamma / 28)) * 1.4;
      if (e.beta != null) parY = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.7;
    }, { passive: true });

    window.addEventListener("resize", onResize);

    t0 = lastT = performance.now();
    timer = setInterval(loop, 33);   // 与全局一致：不依赖 rAF
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }

  function loop() {
    if (!renderer) return;
    const t = (performance.now() - t0) / 1000;
    const dt = Math.min(0.1, (performance.now() - lastT) / 1000); lastT = performance.now();

    // 开场运镜：低近 → 高远，缓出
    const k = Math.min(1, t / 3.6), e = 1 - Math.pow(1 - k, 3);
    camera.position.set(
      camBase.x + parX,
      1.0 + (camBase.y - 1.0) * e + parY,
      44 + (camBase.z - 44) * e
    );
    camera.lookAt(camTgt.x + parX * 2.2, camTgt.y, camTgt.z);

    // 光束旋转
    beamT += dt * 0.42;
    beamGroup.rotation.y = beamT;
    const toward = Math.abs(Math.cos(beamT));
    flashDiv.style.opacity = (toward > 0.86 ? (toward - 0.86) / 0.14 : 0) * 0.34;

    // 星光呼吸 / 海面流动 / 七灯脉冲
    window._t3dStars.forEach((p, i) => { p.material.opacity = 0.45 + 0.3 * Math.abs(Math.sin(t * 0.7 + p.userData.ph)); });
    window._t3dSea.uniforms.uT.value = t;
    window._t3dLamps.forEach(L => {
      const k2 = 0.75 + 0.25 * Math.sin(t * 1.3 + L.ph);
      L.s.material.opacity = k2; L.s.scale.set(4.5 * k2 + 1.5, 4.5 * k2 + 1.5, 1);
      L.rf.material.opacity = 0.16 * k2;
    });

    renderer.render(scene, camera);
  }

  function unmount() {
    if (timer) { clearInterval(timer); timer = null; }
    if (flashDiv) { flashDiv.remove(); flashDiv = null; }
    if (holder) { holder.remove(); holder = null; }
    if (renderer) { renderer.dispose(); renderer = null; }
    scene = null; camera = null; beamGroup = null;
  }

  return { supported, mount, unmount };
})();
