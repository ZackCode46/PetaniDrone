/* Farm3D — renderer 3D (Three.js) untuk Drone Farm. Hanya menggambar; logika game tetap di game.js. */
(function () {
  "use strict";
  var T = THREE, BODY = [0xf2c879, 0x9ad0f5, 0xb5db7a, 0xf0a3b8];
  var ok = false, R, scene, cam, world, N = 0, tiles = [], slots = [], drones = [], pops = [], clouds = [], fid = 0;
  var az = 0, el = 0.85, dist = 15, W = 0, H = 0, drag = null, tmp = new T.Color();
  var DRY = [], WET = [];
  function mat(c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, flatShading: true }, o || {})); }
  function mesh(g, m, x, y, z) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; return o; }
  function rnd(i) { var v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function label(text, color, size) {
    var c = document.createElement("canvas"); c.width = 128; c.height = 64;
    var g = c.getContext("2d"); g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 8; g.strokeStyle = "rgba(40,24,4,.9)"; g.strokeText(text, 64, 34); g.fillStyle = color; g.fillText(text, 64, 34);
    var s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthTest: false }));
    s.scale.set(size * 2, size, 1); s.renderOrder = 10; return s;
  }

  // ---------- tanaman: tiap cell punya material sendiri supaya warna bisa berubah sesuai pertumbuhan ----------
  function mkCrop(type, seed) {
    var g = new T.Group(), mats = [], ripe = [];
    function lerpMat(c0, c1) { var m = mat(c0); mats.push([m, c0, c1]); return m; }
    var k, o;
    if (type === "wheat") {
      var st = lerpMat(0x7bb84a, 0xd9b53a), hd = lerpMat(0x9bc95a, 0xe4b93c);
      for (k = 0; k < 7; k++) {
        var ox = (rnd(seed + k) - 0.5) * 0.7, oz = (rnd(seed + k + 9) - 0.5) * 0.7;
        g.add(mesh(new T.CylinderGeometry(0.018, 0.026, 0.7, 5), st, ox, 0.35, oz));
        o = mesh(new T.SphereGeometry(0.05, 6, 5), hd, ox, 0.72, oz); o.scale.set(1, 2.6, 1); g.add(o);
      }
    } else if (type === "carrot") {
      var lf = mat(0x4c9a3f), rt = mat(0xee8a2e);
      for (k = 0; k < 6; k++) {
        o = mesh(new T.ConeGeometry(0.05, 0.5, 4), lf, 0, 0.3, 0); o.rotation.set((rnd(seed + k) - 0.5) * 0.9, k, (rnd(seed + k + 5) - 0.5) * 0.9); g.add(o);
      }
      o = mesh(new T.ConeGeometry(0.1, 0.34, 7), rt, 0, 0.02, 0); o.rotation.x = Math.PI; g.add(o);
    } else if (type === "potato") {
      var bush = lerpMat(0x6b8f4e, 0x8a7a45), tub = mat(0xc9a25b);
      for (k = 0; k < 5; k++) { o = mesh(new T.SphereGeometry(0.17, 7, 6), bush, (rnd(seed + k) - 0.5) * 0.4, 0.17, (rnd(seed + k + 3) - 0.5) * 0.4); o.scale.y = 0.75; g.add(o); }
      for (k = 0; k < 3; k++) { o = mesh(new T.SphereGeometry(0.09, 7, 6), tub, (k - 1) * 0.22, 0.04, 0.3 - k * 0.05); o.scale.set(1.2, 0.8, 1); ripe.push(o); g.add(o); }
    } else {
      var sk = lerpMat(0x4f9d3a, 0xcdb84a), cob = mat(0xf4e04d);
      g.add(mesh(new T.CylinderGeometry(0.05, 0.07, 1.1, 6), sk, 0, 0.55, 0));
      for (k = 0; k < 4; k++) { o = mesh(new T.BoxGeometry(0.5, 0.02, 0.08), sk, 0, 0.55 + k * 0.14, 0); o.rotation.set(0, k * 1.57, 0.5); g.add(o); }
      o = mesh(new T.SphereGeometry(0.07, 7, 6), cob, 0.1, 0.68, 0); o.scale.set(1, 2.2, 1); ripe.push(o); g.add(o);
    }
    g.userData = { mats: mats, ripe: ripe }; return g;
  }
  function mkPest() {
    var g = new T.Group(), m = mat(0xe23c3c, { emissive: 0x7a0f0f });
    g.add(mesh(new T.IcosahedronGeometry(0.15, 0), m, 0, 0, 0));
    [-1, 1].forEach(function (s) { g.add(mesh(new T.SphereGeometry(0.04, 6, 5), mat(0xffffff, { emissive: 0xffffff }), s * 0.06, 0.04, 0.12)); });
    g.position.y = 0.6; g.visible = false; return g;
  }
  function mkDrone(id) {
    var wrap = new T.Group(), fly = new T.Group(), c = BODY[id % 4];
    var sh = new T.Mesh(new T.CircleGeometry(0.3, 16), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.135; wrap.add(sh);
    var body = mesh(new T.SphereGeometry(0.19, 14, 10), mat(c, { roughness: 0.4, flatShading: false }), 0, 0, 0); body.scale.set(1.2, 0.6, 1.2); fly.add(body);
    var dome = mesh(new T.SphereGeometry(0.1, 12, 8), mat(0x233, { roughness: 0.2, metalness: 0.4, flatShading: false }), 0, 0.07, 0.07); fly.add(dome);
    var arm = mat(0x2d2f36); [Math.PI / 4, -Math.PI / 4].forEach(function (r) { var a = mesh(new T.BoxGeometry(0.78, 0.035, 0.05), arm, 0, 0, 0); a.rotation.y = r; fly.add(a); });
    var blades = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
      var mo = mesh(new T.CylinderGeometry(0.045, 0.045, 0.07, 8), arm, p[0] * 0.27, 0.03, p[1] * 0.27); fly.add(mo);
      var bl = mesh(new T.BoxGeometry(0.4, 0.01, 0.05), mat(0xdfe6ea), p[0] * 0.27, 0.075, p[1] * 0.27); blades.push(bl); fly.add(bl);
    });
    var beam = new T.Mesh(new T.ConeGeometry(0.3, 0.95, 18, 1, true), new T.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.13, depthWrite: false, side: T.DoubleSide }));
    beam.position.y = -0.5; fly.add(beam);
    var tag = label(String(id + 1), "#ffffff", 0.3); tag.position.y = 0.5; fly.add(tag);
    wrap.add(fly); wrap.userData = { fly: fly, blades: blades }; scene.add(wrap); return wrap;
  }

  // ---------- adegan ----------
  function sky() {
    var c = document.createElement("canvas"); c.width = 4; c.height = 256; var g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#4f9fe0"); gr.addColorStop(0.6, "#a9d9f0"); gr.addColorStop(1, "#e6f4ea"); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  function scenery() {
    var ground = mesh(new T.CylinderGeometry(60, 60, 0.6, 48), mat(0x6fae4a), 0, -0.45, 0); ground.castShadow = false; scene.add(ground);
    var i, tr, k;
    for (i = 0; i < 12; i++) {
      var a = i * 0.52 + rnd(i) * 0.3, r = 11 + rnd(i + 20) * 5; tr = new T.Group();
      tr.add(mesh(new T.CylinderGeometry(0.12, 0.17, 0.8, 6), mat(0x6b4a2b), 0, 0.4, 0));
      for (k = 0; k < 3; k++) tr.add(mesh(new T.ConeGeometry(0.85 - k * 0.2, 1.1, 7), mat(0x2f7d46), 0, 1.1 + k * 0.55, 0));
      tr.position.set(Math.cos(a) * r, -0.15, Math.sin(a) * r); tr.scale.setScalar(0.9 + rnd(i + 40) * 0.8); scene.add(tr);
    }
    for (i = 0; i < 6; i++) {
      var cl = new T.Group(), cm = mat(0xffffff, { emissive: 0x8899aa, flatShading: false });
      for (k = 0; k < 4; k++) { var b = mesh(new T.SphereGeometry(0.9 + rnd(i + k) * 0.7, 10, 8), cm, k * 1.1 - 1.6, rnd(k + i) * 0.3, 0); b.castShadow = false; cl.add(b); }
      cl.position.set(-22 + i * 9, 9 + rnd(i) * 3, -10 - rnd(i + 7) * 14); scene.add(cl); clouds.push(cl);
    }
    scene.add(new T.HemisphereLight(0xcfe8ff, 0x4a6b3a, 0.9));
    var sun = new T.DirectionalLight(0xfff0d0, 1.7); sun.position.set(7, 13, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0006; scene.add(sun);
  }
  function build(n) {
    if (world) scene.remove(world);
    world = new T.Group(); scene.add(world); N = n; tiles = []; slots = [];
    var wood = mat(0x8b5a2b), rim = n / 2 + 0.11, len = n + 0.44;
    world.add(mesh(new T.BoxGeometry(n + 0.2, 0.2, n + 0.2), mat(0x5a3818), 0, -0.05, 0));
    [[0, rim, len, 0.22], [0, -rim, len, 0.22], [rim, 0, 0.22, len], [-rim, 0, 0.22, len]].forEach(function (b) { world.add(mesh(new T.BoxGeometry(b[2], 0.3, b[3]), wood, b[0], 0.05, b[1])); });
    var tg = new T.BoxGeometry(0.95, 0.24, 0.95);
    for (var i = 0; i < n * n; i++) {
      var x = i % n, y = (i / n) | 0, px = x + 0.5 - n / 2, pz = -(y + 0.5 - n / 2);
      var t = mesh(tg, DRY[(x + y) % 2], px, 0, pz); t.castShadow = false; world.add(t); tiles.push(t);
      var s = new T.Group(); s.position.set(px, 0.12, pz); s.userData = { crop: null, type: null, pest: mkPest() }; s.add(s.userData.pest); world.add(s); slots.push(s);
    }
    dist = 7 + n * 0.95;
  }
  function size() {
    var c = R.domElement, w = c.clientWidth, h = c.clientHeight;
    if (w && h && (w !== W || h !== H)) { W = w; H = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  }

  var api = {
    init: function (canvas) {
      try {
        R = new T.WebGLRenderer({ canvas: canvas, antialias: true }); R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        R.outputColorSpace = T.SRGBColorSpace; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
        scene = new T.Scene(); scene.background = sky(); scene.fog = new T.Fog(0xcfe9ee, 28, 75);
        cam = new T.PerspectiveCamera(40, 1.4, 0.1, 200);
        DRY = [mat(0x7a4a22), mat(0x84522a)]; WET = [mat(0x45291a), mat(0x4d2f1e)];
        scenery();
        canvas.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
        canvas.addEventListener("pointermove", function (e) { if (!drag) return; az -= (e.clientX - drag.x) * 0.008; el = clamp(el + (e.clientY - drag.y) * 0.006, 0.3, 1.4); drag = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener("pointerup", function () { drag = null; });
        canvas.addEventListener("wheel", function (e) { e.preventDefault(); dist = clamp(dist + e.deltaY * 0.01, 6, 34); }, { passive: false });
        canvas.addEventListener("dblclick", function () { az = 0; el = 0.85; dist = 7 + N * 0.95; });
        ok = true;
      } catch (e) { ok = false; if (window.console) console.warn("WebGL tidak tersedia:", e); }
    },
    draw: function (F, Dv, POP, tw, CROPS) {
      if (!ok) return;
      var now = performance.now(), n = F.n, i, u;
      fid++; size(); if (n !== N) build(n);
      u = clamp((now - tw.t0) / Math.max(tw.dur, 1), 0, 1);
      for (i = 0; i < slots.length; i++) {
        var s = slots[i], d = s.userData, cell = F.grid[i];
        tiles[i].material = (cell && cell.w ? WET : DRY)[((i % n) + ((i / n) | 0)) % 2];
        if (!cell) { if (d.crop) d.crop.visible = false; d.pest.visible = false; continue; }
        if (!d.crop || d.type !== cell.c) { if (d.crop) s.remove(d.crop); d.crop = mkCrop(cell.c, i); d.type = cell.c; s.add(d.crop); }
        var p = Math.min(cell.g / CROPS[cell.c].grow, 1), cr = d.crop;
        cr.visible = true; cr.scale.setScalar(0.3 + 0.7 * p); cr.rotation.z = Math.sin(now / 700 + i) * 0.035;
        cr.userData.mats.forEach(function (m) { m[0].color.setHex(m[1]).lerp(tmp.setHex(m[2]), p); });
        cr.userData.ripe.forEach(function (r) { r.visible = p >= 1; });
        d.pest.visible = !!cell.pest; if (cell.pest) { d.pest.position.y = 0.6 + Math.sin(now / 160 + i) * 0.06; d.pest.rotation.y = now / 300; }
      }
      drones.forEach(function (w) { w.visible = false; });
      Dv.forEach(function (d) {
        if (d.dead && !d.main) return;
        var w = drones[d.id] || (drones[d.id] = mkDrone(d.id)), dx = d.x - d.x0, dy = d.y - d.y0;
        var vx = Math.abs(dx) > 1 ? d.x : d.x0 + dx * u, vy = Math.abs(dy) > 1 ? d.y : d.y0 + dy * u;
        var tilt = Math.abs(dx) > 1 || Math.abs(dy) > 1 ? 0 : Math.sin(u * Math.PI) * 0.28, f = w.userData.fly;
        w.visible = true; w.position.set(vx + 0.5 - n / 2, 0, -(vy + 0.5 - n / 2));
        f.position.y = 1.25 + Math.sin(now / 260 + d.id) * 0.06; f.rotation.z = -Math.sign(dx) * tilt; f.rotation.x = -Math.sign(dy) * tilt;
        w.userData.blades.forEach(function (b, k) { b.rotation.y = now / 18 * (k % 2 ? 1 : -1); });
      });
      POP.forEach(function (q) {
        if (!q._s) { q._s = label(q.text, "#ffd166", 0.42); scene.add(q._s); pops.push(q); }
        var a = (now - q.t0) / 900; q._seen = fid; q._s.material.opacity = Math.max(0, 1 - a);
        q._s.position.set(q.x + 0.5 - n / 2, 0.9 + a * 1.3, -(q.y + 0.5 - n / 2));
      });
      for (i = pops.length - 1; i >= 0; i--) if (pops[i]._seen !== fid) { scene.remove(pops[i]._s); pops[i]._s.material.map.dispose(); pops[i]._s.material.dispose(); pops.splice(i, 1); }
      clouds.forEach(function (c, k) { c.position.x += 0.004 + k * 0.0006; if (c.position.x > 30) c.position.x = -30; });
      var A = az + (drag ? 0 : Math.sin(now / 5000) * 0.06);
      cam.position.set(dist * Math.cos(el) * Math.sin(A), dist * Math.sin(el), dist * Math.cos(el) * Math.cos(A)); cam.lookAt(0, 0.3, 0);
      R.render(scene, cam);
    }
  };
  window.Farm3D = api;
})();
