(function () {
  "use strict";

  var CROPS = {
    wheat:  { grow: 5,  value: 2, dot: "#e4b93c", leaf: "#7bb84a", leafRipe: "#d9b53a" },
    carrot: { grow: 8,  value: 6, dot: "#ee8a2e", leaf: "#4c9a3f", leafRipe: null },
    potato: { grow: 10, value: 4, dot: "#c9a25b", leaf: "#6b8f4e", leafRipe: "#a97c4f" },
    corn:   { grow: 4,  value: 3, dot: "#f4e04d", leaf: "#4f9d3a", leafRipe: "#e0c93a" }
  };
  var CROP_NAMES = ["wheat", "carrot", "potato", "corn"];
  var SHOP = [
    { id: "water",   name: "Penyiram",    desc: "water(): tanaman tumbuh 2x lebih cepat",              cost: 30 },
    { id: "carrot",  name: "Wortel",      desc: "plant(Carrot): matang lebih lama, bernilai 6 koin",   cost: 60 },
    { id: "potato",  name: "Kentang",     desc: "plant(Potato): tumbuh sedang, bernilai 4 koin",       cost: 90 },
    { id: "corn",    name: "Jagung",      desc: "plant(Corn): tumbuh cepat, bernilai 3 koin",          cost: 120 },
    { id: "field12", name: "Lahan 12x12", desc: "Petak lebih luas (lahan direset)",                    cost: 150, requires: "carrot", need: "Butuh Wortel dulu" }
  ];
  var DRONE_COST = [120, 300, 650], MAX_DRONES = 4;
  var DELAYS = [800, 500, 300, 180, 100, 50, 20, 0];
  var DIRS = { North: [0, 1], South: [0, -1], East: [1, 0], West: [-1, 0] };
  var BODY = ["#f2c879", "#9ad0f5", "#b5db7a", "#f0a3b8"];
  var PEST_CHANCE = 0.05;
  var KEY = "dronefarm.v6", MAXTICKS = 20000, W = 560, H = 400;

  var BASIC_CODE = [
    "while True:",
    "    if can_harvest():",
    "        harvest()",
    "    plant(Wheat)",
    "    move(East)",
    "    if get_pos_x() == 0:",
    "        move(North)",
    ""
  ].join("\n");
  var CARROT_CODE = "# Beli Wortel di toko dulu\n" + BASIC_CODE.replace("Wheat", "Carrot");
  var POTATO_CODE = "# Beli Kentang di toko dulu\n" + BASIC_CODE.replace("Wheat", "Potato");
  var PEST_CODE = [
    "# Kalau ada hama, bersihkan dulu sebelum menanam lagi",
    "while True:",
    "    if has_pest():",
    "        clear_pest()",
    "    elif can_harvest():",
    "        harvest()",
    "    elif get_pos_x() == get_pos_x():",
    "        plant(Wheat)",
    "    move(East)",
    "    if get_pos_x() == 0:",
    "        move(North)",
    ""
  ].join("\n");
  var DRONE_CODE = [
    "def work():",
    "    while True:",
    "        if can_harvest():",
    "            harvest()",
    "        plant(Wheat)",
    "        move(East)",
    "        if get_pos_x() == 0:",
    "            move(North)",
    "",
    "if num_drones() < max_drones():",
    "    spawn_drone(work)",
    "    for i in range(4):",
    "        move(North)",
    "work()",
    ""
  ].join("\n");
  var CORN_DRONE_CODE = "# Beli Jagung dulu di toko\n" + DRONE_CODE.replace("Wheat", "Corn");
  var MIX_CODE = [
    "# Tanam bergantian: gandum, wortel, kentang, jagung",
    "crops = [Wheat, Carrot, Potato, Corn]",
    "i = 0",
    "while True:",
    "    if has_pest():",
    "        clear_pest()",
    "    elif can_harvest():",
    "        harvest()",
    "    else:",
    "        plant(crops[i % 4])",
    "        i += 1",
    "    move(East)",
    "    if get_pos_x() == 0:",
    "        move(North)",
    ""
  ].join("\n");

  // ---------- levels & quests ----------
  var LEVELS = [
    { id: 1, name: "Level 1 \u2014 Panen Pertama", quest: "Panen 5 gandum", starter: BASIC_CODE, par: 60,
      progress: function (s) { return s.harvested.wheat + "/5 gandum"; },
      done: function (s) { return s.harvested.wheat >= 5; } },
    { id: 2, name: "Level 2 \u2014 Pemburu Koin", quest: "Kumpulkan 40 koin dalam satu percobaan", starter: BASIC_CODE, par: 120,
      progress: function (s) { return s.coinsEarned + "/40 koin"; },
      done: function (s) { return s.coinsEarned >= 40; } },
    { id: 3, name: "Level 3 \u2014 Petani Basah", quest: "Beli Penyiram di toko, lalu panen 8 gandum", starter: BASIC_CODE, par: 150,
      progress: function (s) { return (P.unlocked.water ? "Penyiram \u2713 " : "Beli Penyiram \u2014 ") + s.harvested.wheat + "/8 gandum"; },
      done: function (s) { return !!P.unlocked.water && s.harvested.wheat >= 8; } },
    { id: 4, name: "Level 4 \u2014 Kebun Wortel", quest: "Beli Wortel di toko dan panen 5 wortel", starter: CARROT_CODE, par: 150,
      progress: function (s) { return (P.unlocked.carrot ? "Wortel \u2713 " : "Beli Wortel \u2014 ") + s.harvested.carrot + "/5 wortel"; },
      done: function (s) { return !!P.unlocked.carrot && s.harvested.carrot >= 5; } },
    { id: 5, name: "Level 5 \u2014 Kebun Kentang", quest: "Beli Kentang di toko dan panen 16 kentang", starter: POTATO_CODE, par: 300,
      progress: function (s) { return (P.unlocked.potato ? "Kentang \u2713 " : "Beli Kentang \u2014 ") + s.harvested.potato + "/16 kentang"; },
      done: function (s) { return !!P.unlocked.potato && s.harvested.potato >= 16; } },
    { id: 6, name: "Level 6 \u2014 Armada Drone", quest: "Beli drone tambahan, lalu jalankan 2 drone sekaligus", starter: DRONE_CODE, par: 80,
      progress: function (s) { return "Drone bersamaan tertinggi: " + s.maxDrones; },
      done: function (s) { return s.maxDrones >= 2; } },
    { id: 7, name: "Level 7 \u2014 Efisiensi Panen", quest: "Panen total 20 tanaman, jenis apa saja", starter: BASIC_CODE, par: 100,
      progress: function (s) { return cropTotal(s) + "/20 panen"; },
      done: function (s) { return cropTotal(s) >= 20; } },
    { id: 8, name: "Level 8 \u2014 Pengendali Hama", quest: "Panen 8 gandum dan bersihkan 5 hama", starter: PEST_CODE, par: 200, pests: true,
      progress: function (s) { return s.harvested.wheat + "/8 gandum, " + s.pestsCleared + "/5 hama dibersihkan"; },
      done: function (s) { return s.harvested.wheat >= 8 && s.pestsCleared >= 5; } },
    { id: 9, name: "Level 9 \u2014 Ladang Jagung", quest: "Beli Jagung, jalankan 2 drone, dan panen 10 jagung", starter: CORN_DRONE_CODE, par: 150,
      progress: function (s) { return (P.unlocked.corn ? "Jagung \u2713 " : "Beli Jagung \u2014 ") + s.harvested.corn + "/10 jagung, drone " + s.maxDrones; },
      done: function (s) { return !!P.unlocked.corn && s.harvested.corn >= 10 && s.maxDrones >= 2; } },
    { id: 10, name: "Level 10 \u2014 Panen Campuran", quest: "Panen 15 tanaman dari minimal 3 jenis berbeda", starter: MIX_CODE, par: 140, pests: true,
      progress: function (s) { return cropTotal(s) + "/15 panen, " + cropVariety(s) + "/3 jenis"; },
      done: function (s) { return cropTotal(s) >= 15 && cropVariety(s) >= 3; } },
    { id: "free", name: "Mode Bebas", quest: "Tidak ada quest \u2014 main dan kumpulkan koin sepuasnya", starter: MIX_CODE,
      progress: function () { return ""; }, done: function () { return false; } }
  ];
  function cropTotal(s) { return s.harvested.wheat + s.harvested.carrot + s.harvested.potato + s.harvested.corn; }
  function cropVariety(s) { return CROP_NAMES.filter(function (c) { return s.harvested[c] > 0; }).length; }
  var LAST_QUEST_ID = LEVELS[LEVELS.length - 2].id;
  function levelById(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null; }
  function levelUnlocked(id) {
    if (id === 1) return true;
    if (id === "free") return !!P.completed[LAST_QUEST_ID];
    return !!P.completed[id - 1];
  }
  function starsFor(par, ticks) { return ticks <= par ? 3 : ticks <= par * 1.6 ? 2 : 1; }
  function starText(n) { return "\u2605".repeat(n) + "\u2606".repeat(3 - n); }

  var ACHIEVEMENTS = [
    { name: "Petani Pemula", desc: "Panen pertamamu", check: function () { return cropTotal({ harvested: P.inv }) >= 1; } },
    { name: "Kolektor Emas", desc: "Kumpulkan 200 koin sepanjang waktu", check: function () { return P.totalCoins >= 200; } },
    { name: "Pembasmi Hama", desc: "Bersihkan 20 hama sepanjang waktu", check: function () { return P.totalPests >= 20; } },
    { name: "Armada Lengkap", desc: "Punya 4 drone", check: function () { return P.drones >= MAX_DRONES; } },
    { name: "Master Efisiensi", desc: "Raih 3 bintang di satu level", check: function () { return Object.keys(P.stars).some(function (k) { return P.stars[k] >= 3; }); } },
    { name: "Legenda Drone Farm", desc: "Selesaikan semua level utama", check: function () { return LEVELS.filter(function (l) { return l.id !== "free"; }).every(function (l) { return P.completed[l.id]; }); } }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var ctx = $("cv").getContext("2d"), logEl = $("log"), src = $("src"), nowEl = $("now");
  var P = load(), F, Dv = [], D = [], cur = null, POP = [];
  var tw = { t0: 0, dur: 1 }, running = false, stopFlag = false;
  var level = null, stats = null;

  function load() {
    var d = {
      coins: 0, inv: { wheat: 0, carrot: 0, potato: 0, corn: 0 }, unlocked: {}, drones: 1,
      completed: {}, seenTutorial: false, levelCode: {}, stars: {}, totalCoins: 0, totalPests: 0
    };
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.inv && s.unlocked) d = s;
    } catch (e) {}
    CROP_NAMES.forEach(function (c) { d.inv[c] = d.inv[c] || 0; });
    d.completed = d.completed || {}; d.levelCode = d.levelCode || {}; d.stars = d.stars || {};
    d.totalCoins = d.totalCoins || 0; d.totalPests = d.totalPests || 0;
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function log(m, c) {
    var d = document.createElement("div");
    if (c) d.className = c;
    d.textContent = m;
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function hud() {
    $("coins").textContent = P.coins;
    $("inv-wheat").textContent = P.inv.wheat;
    $("inv-carrot").textContent = P.inv.carrot;
    $("inv-potato").textContent = P.inv.potato;
    $("inv-corn").textContent = P.inv.corn;
    $("ticks").textContent = F.ticks;
    $("drones").textContent = Math.max(D.length, 1) + "/" + P.drones;
    $("quest-progress").textContent = level ? level.progress(stats) : "";
  }
  function mkDrone(x, y, main) { return { id: Dv.length, x: x, y: y, x0: x, y0: y, main: main, dead: false, gen: null }; }
  function newField() {
    var n = P.unlocked.field12 ? 12 : 8, g = [];
    for (var i = 0; i < n * n; i++) g.push(null);
    F = { n: n, grid: g, ticks: 0 };
    Dv = []; Dv.push(mkDrone(0, 0, true)); D = []; POP = [];
  }

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("active", s.id === id); });
  }
  function goDashboard() {
    var totalQuests = LEVELS.length - 1;
    $("dash-stats").innerHTML =
      "<span>Koin <b>" + P.coins + "</b></span><span>Drone <b>" + P.drones + "</b></span>" +
      "<span>Level selesai <b>" + Object.keys(P.completed).length + "/" + totalQuests + "</b></span>" +
      "<span>Total koin <b>" + P.totalCoins + "</b></span>";
    renderAchievements();
    show("screen-dashboard");
  }
  function renderAchievements() {
    var box = $("achievements"); if (!box) return;
    box.textContent = "";
    ACHIEVEMENTS.forEach(function (a) {
      var ok = a.check();
      var row = document.createElement("div"); row.className = "u";
      var t = document.createElement("div");
      var b = document.createElement("b"); b.textContent = a.name;
      var d = document.createElement("span"); d.textContent = a.desc;
      t.appendChild(b); t.appendChild(d);
      var mark = document.createElement("span"); mark.className = "badge" + (ok ? " on" : "");
      mark.textContent = ok ? "Tercapai \u2713" : "Belum";
      row.appendChild(t); row.appendChild(mark); box.appendChild(row);
    });
  }
  function goLevels() {
    var grid = $("level-grid"); grid.textContent = "";
    LEVELS.forEach(function (lv) {
      var unlocked = levelUnlocked(lv.id), done = !!P.completed[lv.id];
      var btn = document.createElement("button");
      btn.className = "lvl" + (unlocked ? "" : " locked") + (done ? " done" : "");
      var badge = done ? starText(P.stars[lv.id] || 1) : unlocked ? "Terbuka" : "Terkunci";
      btn.innerHTML = "<b>" + lv.name + "</b><span>" + lv.quest + "</span>" + "<span class=\"badge\">" + badge + "</span>";
      btn.disabled = !unlocked;
      btn.onclick = function () { openLevel(lv.id); };
      grid.appendChild(btn);
    });
    show("screen-levels");
  }
  function openLevel(id) {
    level = levelById(id);
    stats = { harvested: { wheat: 0, carrot: 0, potato: 0, corn: 0 }, coinsEarned: 0, maxDrones: 1, pestsCleared: 0 };
    src.value = P.levelCode[id] || level.starter;
    $("quest-name").textContent = level.name;
    $("quest-desc").textContent = level.quest;
    logEl.textContent = ""; nowEl.textContent = "";
    newField(); renderShop(); hud();
    show("screen-game");
  }
  function closeOverlay() { $("overlay").classList.add("hidden"); }
  function winLevel() {
    var stars = level.par ? starsFor(level.par, F.ticks) : 3;
    P.stars[level.id] = Math.max(P.stars[level.id] || 0, stars);
    P.completed[level.id] = true; save();
    var next = LEVELS[LEVELS.findIndex(function (l) { return l.id === level.id; }) + 1];
    $("win-title").textContent = "Level selesai! " + starText(stars);
    $("win-text").textContent = level.quest + " \u2014 tuntas dalam " + F.ticks + " tick.";
    $("win-next").style.display = next ? "" : "none";
    if (next) $("win-next").onclick = function () { closeOverlay(); openLevel(next.id); };
    $("win-levels").onclick = function () { closeOverlay(); goLevels(); };
    $("overlay").classList.remove("hidden");
  }

  // ---------- tutorial ----------
  var TUT = [
    { t: "Selamat datang di Drone Farm", b: "Kamu memprogram drone dengan kode mirip Python di kotak hitam sebelah kiri, lalu drone menjalankannya sendiri di lahan." },
    { t: "Perintah dasar", b: "move(North|South|East|West) menggerakkan drone.\nplant(Wheat) menanam.\nharvest() memanen kalau sudah matang dan memberimu koin.", code: true },
    { t: "Kondisi & loop", b: "can_harvest() memberitahu apakah tanaman di bawah drone sudah matang.\nPakai while True: supaya drone bekerja terus tanpa berhenti.", code: true },
    { t: "Tombol Run", b: "Klik \u25B6 untuk menjalankan kode, \u25A0 untuk menghentikannya. Slider kecepatan mengatur seberapa cepat drone bergerak." },
    { t: "Toko & level", b: "Koin dari panen bisa dibelikan upgrade di toko: penyiram, wortel, kentang, jagung, lahan lebih luas, dan drone tambahan. Beberapa level punya hama \u2014 pakai has_pest() dan clear_pest(). Tiap level punya quest sendiri dan diberi bintang berdasarkan kecepatan." },
    { t: "Siap main?", b: "Tekan Lanjut untuk masuk ke dashboard, lalu tekan Play." }
  ];
  var ti = 0;
  function renderTut() {
    var s = TUT[ti];
    var html = "<h2>" + s.t + "</h2><p>" + s.b.replace(/\n/g, "<br>") + "</p>";
    if (s.code) html += "<div class=\"stage\">plant(Wheat)\nif can_harvest():\n    harvest()\nmove(East)</div>";
    $("tut-body").innerHTML = html;
    $("tut-prev").style.visibility = ti === 0 ? "hidden" : "visible";
    $("tut-next").textContent = ti === TUT.length - 1 ? "Mulai Main" : "Lanjut";
    var dots = $("tut-dots"); dots.innerHTML = "";
    TUT.forEach(function (_, i) { dots.innerHTML += "<span class=\"" + (i === ti ? "on" : "") + "\"></span>"; });
  }
  $("tut-next").onclick = function () {
    if (ti < TUT.length - 1) { ti++; renderTut(); }
    else { P.seenTutorial = true; save(); goDashboard(); }
  };
  $("tut-prev").onclick = function () { if (ti > 0) { ti--; renderTut(); } };
  $("btn-play").onclick = goLevels;
  $("btn-tutorial-again").onclick = function () { ti = 0; renderTut(); show("screen-tutorial"); };
  $("btn-to-dash").onclick = goDashboard;
  $("btn-to-levels").onclick = function () { stopFlag = true; setTimeout(goLevels, 0); };
  $("btn-reset-all").onclick = function () {
    if (!confirm("Hapus semua progres (koin, level, unlock, drone, bintang)?")) return;
    P = {
      coins: 0, inv: { wheat: 0, carrot: 0, potato: 0, corn: 0 }, unlocked: {}, drones: 1,
      completed: {}, seenTutorial: true, levelCode: {}, stars: {}, totalCoins: 0, totalPests: 0
    };
    save(); goDashboard();
  };

  // ---------- rendering (top-down, East=right, North=up) ----------
  function render() {
    var now = performance.now(), n = F.n, TW = (W - 50) / n, PT = 300 / n, OY = 64, CX = W / 2, s = TW / 62, g = ctx;
    function sc(j) { return 0.86 + 0.14 * j / n; }
    function X(i, k) { return CX + (i - n / 2) * TW * k; }
    function poly(p, fill) {
      g.fillStyle = fill; g.beginPath(); g.moveTo(p[0][0], p[0][1]);
      for (var q = 1; q < p.length; q++) g.lineTo(p[q][0], p[q][1]);
      g.closePath(); g.fill();
    }
    function sprout(x, y, cr, p, z) {
      var h = (4 + p * 15) * z, ripe = p >= 1;
      g.fillStyle = ripe && cr.leafRipe ? cr.leafRipe : cr.leaf;
      g.beginPath();
      g.ellipse(x - 3.5 * z, y - h * 0.6, 3.6 * z, h * 0.55, -0.5, 0, 7);
      g.ellipse(x + 3.5 * z, y - h * 0.6, 3.6 * z, h * 0.55, 0.5, 0, 7);
      g.fill();
      if (ripe) { g.fillStyle = cr.dot; g.beginPath(); g.arc(x, y - 1.5 * z, 3.6 * z, 0, 7); g.fill(); }
    }
    g.clearRect(0, 0, W, H);
    var u = Math.max(0, Math.min(1, (now - tw.t0) / Math.max(tw.dur, 1)));
    for (var j = 0; j < n; j++) {
      var y0 = OY + j * PT, y1 = y0 + PT * 0.78, y2 = y0 + PT, s0 = sc(j), s1 = sc(j + 0.78), s2 = sc(j + 1);
      for (var i = 0; i < n; i++) {
        poly([[X(i, s1), y1], [X(i + 1, s1), y1], [X(i + 1, s2), y2], [X(i, s2), y2]], "#8f4d17");
        var top = [[X(i, s0), y0], [X(i + 1, s0), y0], [X(i + 1, s1), y1], [X(i, s1), y1]];
        poly(top, (i + j) % 2 ? "#d17f2f" : "#c97528");
        var cell = F.grid[(n - 1 - j) * n + i];
        if (!cell) continue;
        if (cell.w) poly(top, "rgba(60,120,200,.3)");
        var cr = CROPS[cell.c], p = Math.min(cell.g / cr.grow, 1), sm = (s0 + s1) / 2, cx = X(i + 0.5, sm), cy = (y0 + y1) / 2;
        [[-.22, -.2], [.22, -.2], [-.22, .32], [.22, .32]].forEach(function (o) {
          sprout(cx + o[0] * TW * sm, cy + o[1] * PT, cr, p, s * sm);
        });
        if (cell.pest) {
          g.fillStyle = "#e23c3c"; g.strokeStyle = "#5a0f0f"; g.lineWidth = 1.5 * s * sm;
          g.beginPath(); g.arc(cx, cy - 6 * s * sm, 5 * s * sm, 0, 7); g.fill(); g.stroke();
          g.fillStyle = "#fff"; g.font = "bold " + Math.round(7 * s * sm + 3) + "px sans-serif"; g.textAlign = "center";
          g.fillText("!", cx, cy - 3 * s * sm);
        }
      }
    }
    poly([[X(0, sc(n)), OY + n * PT], [X(n, sc(n)), OY + n * PT], [X(n, sc(n)), OY + n * PT + 14 * s], [X(0, sc(n)), OY + n * PT + 14 * s]], "#6b3a10");
    var list = Dv.filter(function (d) { return !d.dead || d.main; }).map(function (d) {
      return { d: d, vx: Math.abs(d.x - d.x0) > 1 ? d.x : d.x0 + (d.x - d.x0) * u, vy: Math.abs(d.y - d.y0) > 1 ? d.y : d.y0 + (d.y - d.y0) * u };
    }).sort(function (a, b) { return b.vy - a.vy; });
    list.forEach(function (o) {
      var jc = (n - 1 - o.vy) + 0.39, k = sc(jc), px = X(o.vx + 0.5, k), py = OY + jc * PT;
      var z = s * k, cy = py - (24 + Math.sin(now / 260 + o.d.id) * 2) * z;
      g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(px, py, 14 * z, 6 * z, 0, 0, 7); g.fill();
      g.strokeStyle = "#3b2a1a"; g.lineWidth = 3 * z; g.lineCap = "round";
      for (var b = 0; b < 4; b++) {
        var a = now / 45 + b * Math.PI / 2;
        g.beginPath(); g.moveTo(px + Math.cos(a) * 6 * z, cy + Math.sin(a) * 3 * z); g.lineTo(px + Math.cos(a) * 20 * z, cy + Math.sin(a) * 10 * z); g.stroke();
      }
      g.fillStyle = BODY[o.d.id % 4]; g.strokeStyle = "#7a5a22"; g.lineWidth = 2 * z;
      g.beginPath(); g.ellipse(px, cy, 11 * z, 9 * z, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "#3b2a1a"; g.font = "bold " + Math.round(11 * z) + "px sans-serif"; g.textAlign = "center";
      g.fillText(String(o.d.id + 1), px, cy + 4 * z);
    });
    POP = POP.filter(function (p) { return now - p.t0 < 900; });
    POP.forEach(function (p) {
      var a = (now - p.t0) / 900, jc = (n - 1 - p.y) + 0.39, k = sc(jc);
      g.globalAlpha = 1 - a; g.fillStyle = "#ffd166"; g.strokeStyle = "#5a3a08"; g.lineWidth = 3;
      g.font = "bold " + Math.round(15 * s * k + 3) + "px sans-serif"; g.textAlign = "center";
      var x = X(p.x + 0.5, k), y = OY + jc * PT - (20 + a * 28) * s;
      g.strokeText(p.text, x, y); g.fillText(p.text, x, y);
      g.globalAlpha = 1;
    });
  }
  function frame() { if ($("screen-game").classList.contains("active")) render(); requestAnimationFrame(frame); }

  // ---------- shop ----------
  function shopRows() {
    var rows = SHOP.map(function (u) {
      return {
        name: u.name, desc: u.desc, cost: u.cost, done: !!P.unlocked[u.id],
        ok: !u.requires || !!P.unlocked[u.requires], need: u.need,
        buy: function () { P.unlocked[u.id] = true; if (u.id === "field12") newField(); }
      };
    });
    rows.push({
      name: "Drone tambahan (" + P.drones + "/" + MAX_DRONES + ")",
      desc: "spawn_drone(nama_fungsi): jalankan fungsi di drone baru", cost: DRONE_COST[P.drones - 1],
      done: P.drones >= MAX_DRONES, doneText: "Penuh", ok: true, buy: function () { P.drones++; }
    });
    return rows;
  }
  function renderShop() {
    var box = $("unlocks"); box.textContent = "";
    shopRows().forEach(function (r) {
      var row = document.createElement("div"); row.className = "u";
      var t = document.createElement("div");
      var b = document.createElement("b"); b.textContent = r.name;
      var d = document.createElement("span"); d.textContent = r.desc;
      t.appendChild(b); t.appendChild(d);
      var btn = document.createElement("button");
      if (r.done) { btn.textContent = r.doneText || "Terbuka"; btn.disabled = true; }
      else {
        btn.textContent = r.cost + " koin";
        btn.disabled = running || !r.ok || P.coins < r.cost;
        if (!r.ok) btn.title = r.need;
        btn.onclick = function () {
          if (running || P.coins < r.cost) return;
          P.coins -= r.cost; r.buy(); save(); renderShop(); hud();
          log("Dibeli: " + r.name, "ok");
        };
      }
      row.appendChild(t); row.appendChild(btn); box.appendChild(row);
    });
  }

  // ---------- drone API ----------
  function idx() { return cur.y * F.n + cur.x; }
  var B = {
    North: "North", South: "South", East: "East", West: "West",
    Wheat: "wheat", Carrot: "carrot", Potato: "potato", Corn: "corn",
    move: function* (dir) {
      var v = DIRS[dir];
      if (!v) throw new Error("Arah tidak dikenal, pakai North/South/East/West");
      cur.x = (cur.x + v[0] + F.n) % F.n; cur.y = (cur.y + v[1] + F.n) % F.n;
      yield "tick";
    },
    plant: function* (name) {
      name = name || "wheat";
      if (!CROPS[name]) throw new Error("Tanaman tidak dikenal, pakai Wheat, Carrot, Potato, atau Corn");
      if (name === "carrot" && !P.unlocked.carrot) throw new Error("Wortel belum di-unlock");
      if (name === "potato" && !P.unlocked.potato) throw new Error("Kentang belum di-unlock");
      if (name === "corn" && !P.unlocked.corn) throw new Error("Jagung belum di-unlock");
      if (F.grid[idx()] === null) F.grid[idx()] = { c: name, g: 0, w: false, pest: false };
      yield "tick";
    },
    water: function* () {
      if (!P.unlocked.water) throw new Error("water() belum di-unlock");
      var c = F.grid[idx()]; if (c) c.w = true;
      yield "tick";
    },
    harvest: function* () {
      var c = F.grid[idx()];
      if (c && !c.pest && c.g >= CROPS[c.c].grow) {
        var v = CROPS[c.c].value;
        P.inv[c.c]++; P.coins += v; P.totalCoins += v; F.grid[idx()] = null; save();
        stats.harvested[c.c]++; stats.coinsEarned += v;
        POP.push({ x: cur.x, y: cur.y, text: "+" + v, t0: performance.now() });
      }
      yield "tick";
    },
    can_harvest: function () { var c = F.grid[idx()]; return !!c && !c.pest && c.g >= CROPS[c.c].grow; },
    has_pest: function () { var c = F.grid[idx()]; return !!(c && c.pest); },
    clear_pest: function* () {
      var c = F.grid[idx()];
      if (c && c.pest) { c.pest = false; stats.pestsCleared++; P.totalPests++; save(); }
      yield "tick";
    },
    get_pos_x: function () { return cur.x; },
    get_pos_y: function () { return cur.y; },
    get_world_size: function () { return F.n; },
    get_coins: function () { return P.coins; },
    num_items: function (name) { return P.inv[name] || 0; },
    num_drones: function () { return D.length; },
    max_drones: function () { return P.drones; },
    spawn_drone: function (f) {
      if (D.length >= P.drones) throw new Error(P.drones > 1 ? "Semua drone sedang aktif" : "Belum punya drone tambahan, beli di toko");
      var d = mkDrone(cur.x, cur.y, false);
      d.gen = PyLite.spawn(f);
      Dv.push(d); D.push(d);
      stats.maxDrones = Math.max(stats.maxDrones, D.length);
      return null;
    },
    print: function () { log(Array.prototype.slice.call(arguments).join(" ")); }
  };

  // ---------- scheduler ----------
  function pause0() { return new Promise(function (z) { setTimeout(z, 0); }); }
  function endRound(ms) {
    F.ticks++;
    for (var i = 0; i < F.grid.length; i++) {
      var c = F.grid[i];
      if (!c) continue;
      if (level.pests && !c.pest && c.g < CROPS[c.c].grow && Math.random() < PEST_CHANCE) { c.pest = true; continue; }
      if (!c.pest) c.g = Math.min(c.g + (c.w ? 2 : 1), CROPS[c.c].grow);
    }
    if (F.ticks > MAXTICKS) throw new Error("Batas " + MAXTICKS + " tick tercapai");
    tw.t0 = performance.now(); tw.dur = ms;
    hud();
  }
  function status() {
    var L = src.value.split("\n");
    nowEl.textContent = D.map(function (d) {
      var ln = d.gen.R.line;
      return "D" + (d.id + 1) + " baris " + ln + ": " + (L[ln - 1] || "").trim();
    }).join("   ");
  }
  async function drive() {
    var ops = 0, wonYet = false;
    while (D.length) {
      if (level.done(stats) && !wonYet) { wonYet = true; throw "WIN"; }
      tw.t0 = Infinity;
      Dv.forEach(function (d) { d.x0 = d.x; d.y0 = d.y; });
      var round = D.slice(), ticked = false;
      for (var i = 0; i < round.length; i++) {
        var d = round[i]; cur = d;
        for (;;) {
          if (stopFlag) throw "STOP";
          var r = d.gen.next();
          if (r.done) { d.dead = true; break; }
          if (r.value === "tick") { ticked = true; break; }
          if (++ops % 400 === 0) { await pause0(); cur = d; }
        }
      }
      D = D.filter(function (x) { return !x.dead; });
      stats.maxDrones = Math.max(stats.maxDrones, D.length);
      if (ticked) {
        var ms = DELAYS[+$("spd").value - 1];
        endRound(ms); status();
        if (level.done(stats)) throw "WIN";
        await new Promise(function (z) { setTimeout(z, ms); });
      }
    }
  }
  async function run() {
    if (running) return;
    P.levelCode[level.id] = src.value; save();
    var gen;
    try { gen = PyLite.run(src.value, B); }
    catch (e) { logEl.textContent = ""; log(e.message, "err"); return; }
    Dv = []; Dv.push(mkDrone(0, 0, true)); Dv[0].gen = gen; D = [Dv[0]]; F.ticks = 0;
    logEl.textContent = ""; running = true; stopFlag = false;
    renderShop(); hud();
    try { await drive(); log("Selesai dalam " + F.ticks + " tick", "ok"); }
    catch (e) {
      if (e === "WIN") { log("Quest tercapai!", "ok"); running = false; D = []; renderShop(); hud(); winLevel(); return; }
      if (e === "STOP") log("Dihentikan");
      else log((e && e.message) || String(e), "err");
    }
    D = []; Dv = Dv.filter(function (d) { return d.main; });
    running = false; nowEl.textContent = "";
    renderShop(); hud();
  }

  $("run").onclick = run;
  $("stop").onclick = function () { stopFlag = true; };
  $("reset-field").onclick = function () {
    stopFlag = true;
    setTimeout(function () { newField(); logEl.textContent = ""; hud(); }, 0);
  };
  src.addEventListener("input", function () { if (level) { P.levelCode[level.id] = src.value; save(); } });
  src.addEventListener("keydown", function (e) {
    if (e.key === "Tab") { e.preventDefault(); src.setRangeText("    ", src.selectionStart, src.selectionEnd, "end"); }
    else if (e.key === "Escape") src.blur();
  });

  if (!P.seenTutorial) { renderTut(); show("screen-tutorial"); } else { goDashboard(); }
  requestAnimationFrame(frame);
})();
