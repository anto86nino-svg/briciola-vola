/* Briciola vola! — mini gioco di Natale dal libro «Aiuto, è caduta una renna!» di Antonino Campanella.
   Nessuna pubblicità, nessun tracciamento, nessun dato raccolto o salvato. */
(() => {
'use strict';
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const TEST = /[?&]test=1/.test(location.search);
let W = 450, H = 800, SC = 1, DPR = 1;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  H = 800;
  W = Math.round(Math.min(1100, Math.max(360, 800 * vw / vh)));
  SC = Math.min(vw / W, vh / H);
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * SC * DPR); cv.height = Math.round(H * SC * DPR);
  cv.style.width = Math.round(W * SC) + 'px'; cv.style.height = Math.round(H * SC) + 'px';
}
window.addEventListener('resize', resize); resize();

// ---------- immagini ----------
const IMG = {};
const SRC = { bri: 'assets/briciola.png', gab: 'assets/gabbiano.png', sli: 'assets/slitta.png', cop: 'assets/copertina.jpg' };
for (let i = 1; i <= 14; i++) SRC['c' + i] = 'assets/cap' + String(i).padStart(2, '0') + '.jpg';
let loaded = 0; const total = Object.keys(SRC).length;
for (const k in SRC) { const im = new Image(); im.onload = im.onerror = () => loaded++; im.src = SRC[k]; IMG[k] = im; }
const ok = im => im && im.complete && im.naturalWidth > 0;

// ---------- audio (WebAudio, generato) ----------
let AC = null, master = null, musicGain = null, muted = false, musicTimer = null, musicStep = 0;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
  AC = new A(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
  musicGain = AC.createGain(); musicGain.gain.value = 0.11; musicGain.connect(master);
  startMusic();
}
function tone(f, t0, dur, type = 'sine', vol = 0.2, dest = master, slide = 0) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  tin(p = 0) { if (!AC) return; const t = AC.currentTime, f = 1568 * Math.pow(2, p / 12);
    tone(f, t, 0.9, 'sine', 0.22); tone(f * 2.76, t, 0.5, 'sine', 0.07); tone(f * 5.4, t, 0.25, 'sine', 0.03); },
  hic() { if (!AC) return; const t = AC.currentTime; tone(330, t, 0.12, 'square', 0.05, master, 2.2); },
  pof() { if (!AC) return; const t = AC.currentTime; tone(160, t, 0.16, 'triangle', 0.16, master, 0.5); },
  ahi() { if (!AC) return; const t = AC.currentTime; tone(220, t, 0.25, 'sawtooth', 0.05, master, 0.6); },
  gnam() { if (!AC) return; const t = AC.currentTime; tone(660, t, 0.08, 'triangle', 0.12); tone(880, t + 0.08, 0.12, 'triangle', 0.12); },
  squawk() { if (!AC) return; const t = AC.currentTime; tone(900, t, 0.18, 'sawtooth', 0.05, master, 0.55); tone(800, t + 0.16, 0.2, 'sawtooth', 0.04, master, 0.5); },
  letter() { if (!AC) return; const t = AC.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.09, 0.4, 'sine', 0.13)); },
  fanfare() { if (!AC) return; const t = AC.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.13, 0.5, 'triangle', 0.14)); },
  laugh() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 8; i++) tone(500 + (i % 2) * 120 + i * 20, t + i * 0.11, 0.1, 'triangle', 0.08); }
};
// "Jingle Bells" (J. L. Pierpont, 1857, pubblico dominio), ritornello semplificato. [nota MIDI, ottavi]
const MEL = [[64,2],[64,2],[64,4],[64,2],[64,2],[64,4],[64,2],[67,2],[60,3],[62,1],[64,8],
  [65,2],[65,2],[65,3],[65,1],[65,2],[64,2],[64,2],[64,1],[64,1],[64,2],[62,2],[62,2],[64,2],[62,4],[67,4],
  [64,2],[64,2],[64,4],[64,2],[64,2],[64,4],[64,2],[67,2],[60,3],[62,1],[64,8],
  [65,2],[65,2],[65,3],[65,1],[65,2],[64,2],[64,2],[64,1],[64,1],[67,2],[67,2],[65,2],[62,2],[60,8],[0,8]];
const BASS = { 64: 48, 65: 53, 67: 55, 62: 55, 60: 48 };
function startMusic() {
  if (!AC || musicTimer) return;
  let next = AC.currentTime + 0.2; const e = 0.16;
  musicTimer = setInterval(() => {
    if (!AC) return;
    while (next < AC.currentTime + 0.6) {
      const [n, d] = MEL[musicStep % MEL.length];
      if (n) { const f = 440 * Math.pow(2, (n - 69) / 12); tone(f, next, d * e * 0.95, 'triangle', 0.5, musicGain);
        if (musicStep % 2 === 0) tone(440 * Math.pow(2, (BASS[n] - 69) / 12), next, d * e, 'sine', 0.35, musicGain); }
      next += d * e; musicStep++;
    }
  }, 120);
}
function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, AC.currentTime, 0.05); }
document.addEventListener('visibilitychange', () => { if (!AC) return; if (document.hidden) AC.suspend(); else AC.resume(); });

// ---------- util ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const FONT = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function text(s, x, y, size, color = '#fff', align = 'center', weight = 'bold', stroke = null, sw = 0) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function wrap(s, maxW, size, weight = 'normal') {
  ctx.font = `${weight} ${size}px ${FONT}`; const out = [];
  for (const para of s.split('\n')) { let line = '';
    for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line); }
  return out;
}

// ---------- livelli ----------
const LETTERE = {
  lalla: { from: 'Un foglietto a righe', body: 'Caro Babbo Natale, caro Babbo Natale,\nun amico dinosauro per Gino. Per Gino.\nLalla, 5 anni (5 anni)' },
  pasq: { from: 'Una lettera ingiallita', body: 'Caro Babbo Natale,\nvorrei un campanello per la mia bicicletta, così tutti mi sentono arrivare.\nPasqualino, 7 anni' },
  bri: { from: 'Un biglietto scritto con uno zoccolo', body: 'Dall’ultimo posto a sinistra si vede tutto il mondo.\nStanotte guarderò la tua casa.\nLa tua amica Briciola' }
};
// un livello per ogni capitolo del libro
const LEVELS = [
  { name: 'Un tonfo sulla pasticceria', mode: 'night', ground: 'case', gulls: 0, chim: 0.45, speed: 140,
    intro: 'È la notte del 19 dicembre. Briciola fa il suo primo volo con la slitta… e cade! Prima del tonfo, prova a volare un po’ sopra i tetti di Torre Pinella.',
    quote: '«Mi scusi tanto per il disturbo» disse Briciola. «Sono caduta.»' },
  { name: 'Non è un cane', mode: 'night', ground: 'case', gulls: 0, chim: 0.5, speed: 145,
    intro: 'Briciola ha il singhiozzo: ogni «hic!» la fa salire. Prendi le risate di Lalla e non svegliare tutto il paese!',
    quote: '«È un cane» sussurrò Lalla. «È un cane.»' },
  { name: 'Nonno Tonino non ci sente', mode: 'night', ground: 'case', gulls: 0, chim: 0.55, speed: 150,
    intro: 'Il nonno ha scoperto tutto, ma fa finta di niente. Raccogli le cartellate: Briciola ne va matta!',
    quote: 'Il nonno Tonino diventò improvvisamente sordo dall’orecchio sinistro.' },
  { name: 'Il sonaglio perduto', mode: 'day', ground: 'case', gulls: 1, chim: 0.55, speed: 150,
    intro: 'Il sonaglio è sparito! Cerca tra i tetti al sole. La signora Addolorata guarda tutto col binocolo…',
    quote: '«Poi è arrivato l’Ammiraglio, e se l’è preso.»' },
  { name: 'Un cane molto, molto grosso', mode: 'day', ground: 'case', gulls: 1, chim: 0.6, speed: 155, letter: 'lalla',
    intro: 'Briciola è travestita da cane, con il cappotto dello zio Peppino. Attraversa il paese senza farti scoprire dal vigile Spinaci!',
    quote: '«BAU» disse Briciola. Il vigile Spinaci non era per niente convinto.' },
  { name: 'Il gabbiano che rubava le stelle', mode: 'day', ground: 'molo', gulls: 4, chim: 0.4, speed: 155,
    intro: 'Al porto ci sono tanti gabbiani. Uno è grosso come un tacchino: è l’Ammiraglio! Stagli lontano.',
    quote: '«È lui» disse Briciola. «Lo sento. Ha qualcosa che mi appartiene.»' },
  { name: 'Su per il campanile', mode: 'day', ground: 'case', towers: true, gulls: 4, chim: 0.5, speed: 160,
    intro: 'Il nido dell’Ammiraglio è in cima al campanile storto. Vola tra i campanili e i comignoli!',
    quote: '«L’avete cacciato!» disse zi’ Nunzio. «In quarant’anni, nessuno ci era mai riuscito!»' },
  { name: 'Una telefonata dai Caraibi', mode: 'sunset', ground: 'case', gulls: 2, chim: 0.6, speed: 160,
    intro: 'Stasera torna la mamma dal mare. Il cielo è rosa: raccogli le risate prima che faccia buio.',
    quote: '«Tutto bene» disse Nico. «Non fa niente.»' },
  { name: 'Il pesce più strano del mercato', mode: 'day', ground: 'molo', gulls: 4, chim: 0.45, speed: 165,
    intro: 'È la mattina del mercato del pesce. Il sonaglio è da qualche parte sulla banchina…',
    quote: '«I cani» disse il vigile Spinaci «non portano i campanelli da bicicletta.»' },
  { name: 'Il presepe vivente più vivente del mondo', mode: 'night', ground: 'case', towers: true, gulls: 1, chim: 0.5, speed: 165,
    intro: 'Briciola fa l’asinello nel presepe vivente. Se le viene il singhiozzo, vola davanti a tutti!',
    quote: 'I bambini ridevano, e il sonaglio, sulla bicicletta del vigile, suonò da solo.' },
  { name: 'Il segreto del vigile Spinaci', mode: 'day', ground: 'case', gulls: 2, chim: 0.6, speed: 170, letter: 'pasq',
    intro: 'Il vigile ha un segreto, scritto in una vecchia lettera. Trovala tra i tetti!',
    quote: 'Poi, per la prima volta in cinquant’anni, il vigile Spinaci rise.' },
  { name: 'Il sonaglio che non suona', mode: 'sunset', ground: 'case', gulls: 2, chim: 0.65, speed: 170,
    intro: 'Il sonaglio è tornato, ma è addormentato. Servono tante, tantissime risate!',
    quote: '«Piangere» disse il nonno «è come impastare. E lievita sempre di notte.»' },
  { name: 'Mezzanotte sul molo', mode: 'night', ground: 'molo', gulls: 3, chim: 0.5, speed: 175, letter: 'bri', finale: true,
    intro: 'È la notte della Vigilia. Tutto il paese è sul molo e la slitta di Babbo Natale sta arrivando. Porta Briciola al suo posto: l’ultimo a sinistra!',
    quote: '«Ogni Vigilia, a mezzanotte, guarda il mare. Ci sarà una luce azzurra, all’ultimo posto a sinistra.»' },
  { name: 'Farina sulle spalle', mode: 'dawn', ground: 'case', gulls: 0, chim: 0.4, speed: 150, last: true,
    intro: 'È la mattina di Natale e Torre Pinella è bianca di zucchero a velo. Un ultimo volo, per salutare tutti!',
    quote: '' }
];
LEVELS.forEach((l, i) => { l.roof = l.towers ? [130, 220] : [110, 195]; l.num = i + 1; l.img = 'c' + (i + 1); l.len = 2600 + (i % 3) * 200; l.letterObj = l.letter ? LETTERE[l.letter] : null; });
const BELL_TARGET = 120;

// ---------- stato ----------
let state = 'loading', L = null, LI = 0, tWorld = 0, dist = 0, time = 0, timeScale = 1;
let bri, houses, chims, items, gulls, parts = [], pops = [], stars = [], snow = [], far = [];
let score = 0, risate = 0, cart = 0, lettere = 0, bell = 0, combo = 0;
let overlay = null; // {type:'letter'|'level'|'intro', ...}
let endPhase = null, endT = 0, sleigh = null, finale = null;
let buttons = [];
let hintT = 0, bellRing = 0, flash = 0;

function newGame() { score = 0; risate = 0; cart = 0; lettere = 0; bell = 0; combo = 0; startIntro(0); }
function startIntro(i) { LI = i; L = LEVELS[i]; buildLevel(); state = 'intro'; }
function buildLevel() {
  const R = rng(1000 + LI * 77);
  dist = 0; time = 0; endPhase = null; endT = 0; sleigh = null; finale = null; overlay = null;
  bri = { x: 0, y: 330, s: 0.5, vy: 0, nose: 'base', noseT: 0, hurt: 0, ang: 0, wob: 0 };
  houses = []; chims = []; items = []; gulls = []; parts = []; pops = []; snow = [];
  // case (o molo)
  let x = -200;
  while (x < L.len + 2000) {
    const w = 90 + R() * 90;
    if (L.ground === 'molo') { houses.push({ x, w, h: 118, molo: true }); }
    else {
      const h = L.roof[0] + R() * (L.roof[1] - L.roof[0]);
      const tower = L.towers && x > 700 && R() < 0.07 && !houses.some(o => o.tower && x - o.x < 1200);
      houses.push({ x, w: tower ? 90 : w, h: tower ? 380 + R() * 30 : h, dome: !tower && R() < 0.18, tower, win: Math.floor(R() * 3), door: R() < 0.6, ger: R() < 0.4, col: R() < 0.5 ? '#2f74b5' : '#3c9a6a', R: R() });
    }
    x += (houses[houses.length - 1].w) + (L.ground !== 'molo' && R() < 0.25 ? 20 + R() * 30 : 0);
  }
  // comignoli / lampioni
  for (const h of houses) {
    if (h.x < 500 || h.x > L.len - 200 || h.tower) continue;
    if (R() < L.chim) {
      if (L.ground === 'molo') chims.push({ x: h.x + h.w * (0.2 + R() * 0.6), w: 14, top: H - h.h - 120 - R() * 70, lamp: true });
      else chims.push({ x: h.x + 15 + R() * (h.w - 50), w: 30, top: H - h.h - 45 - R() * 75, base: H - h.h, lamp: false });
    }
  }
  // oggetti: percorso dolce
  let ix = 420; let k = 0;
  const letterAt = Math.floor(L.len * (0.45 + R() * 0.2));
  let letterPlaced = false;
  while (ix < L.len - 150) {
    const yPath = 300 + Math.sin(ix / 420 + LI) * 120 + Math.sin(ix / 157) * 30;
    if (L.letterObj && !letterPlaced && ix > letterAt) { items.push({ x: ix, y: clamp(yPath - 40, 170, 430), t: 'lettera', r: 26, got: false }); letterPlaced = true; ix += 160; continue; }
    const kind = (k % 4 === 3) ? 'cart' : 'risata';
    const n = kind === 'risata' ? 3 : 1;
    for (let j = 0; j < n; j++) items.push({ x: ix + j * 58, y: clamp(yPath + (j - 1) * 12, 160, safeYAt(ix + j * 58) - 40), t: kind, r: kind === 'cart' ? 22 : 20, got: false });
    ix += 260 + R() * 160; k++;
  }
  // gabbiani
  for (let g = 0; g < L.gulls; g++) gulls.push({ x: 900 + (g + R() * 0.6) * ((L.len - 1300) / L.gulls), y: 200 + R() * 180, ph: R() * 6, spd: 70 + R() * 40, active: false, hit: false, gone: false, warn: 0 });
  // sfondo
  stars = []; const R2 = rng(5); for (let i = 0; i < 90; i++) stars.push({ x: R2() * 1200, y: R2() * 420, s: R2() * 1.8 + 0.4, p: R2() * 6 });
  far = []; let fx = 0; while (fx < 6000) { const w = 30 + R() * 60; far.push({ x: fx, w, h: 25 + R() * 55, tower: R() < 0.06 }); fx += w - 4; }
}
function houseAt(wx) { for (const h of houses) if (wx >= h.x && wx < h.x + h.w) return h; return null; }
function safeYAt(wx) { let y = H - 100; for (const h of houses) if (wx > h.x - 40 && wx < h.x + h.w + 40) y = Math.min(y, H - h.h); for (const c of chims) if (Math.abs(wx - c.x) < 50) y = Math.min(y, c.top - 20); return y; }

// ---------- input ----------
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); const p = toLogical(e); press(p.x, p.y); }, { passive: false });
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); audioInit(); if (state === 'play' && !overlay) hic(); else primary(); }
  else if (e.code === 'Enter') { audioInit(); primary(); }
  else if (e.code === 'KeyM') { setMuted(!muted); }
});
function press(x, y) {
  for (const b of buttons) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return; }
  if (state === 'play' && !overlay) hic();
}
function primary() { const b = buttons.find(b => b.primary); if (b) b.fn(); }
function hic() {
  if (endPhase === 'fly' || endPhase === 'done' || endPhase === 'molo' || endPhase === 'away') return;
  bri.vy = -340; bri.wob = 1; SFX.hic();
  pops.push({ x: bri.x - 30, y: bri.y - 40, s: 'hic!', t: 0, c: '#fff' });
  for (let i = 0; i < 4; i++) parts.push({ x: bri.x - 30, y: bri.y + 10, vx: -60 - Math.random() * 60, vy: 40 + Math.random() * 60, t: 0, life: 0.6, c: 'rgba(200,230,255,0.9)', r: 3 });
}
function setNose(n, t) { bri.nose = n; bri.noseT = t; }

// ---------- update ----------
function update(dt) {
  time += dt; bellRing = Math.max(0, bellRing - dt); flash = Math.max(0, flash - dt);
  for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
  parts = parts.filter(p => p.t < p.life);
  for (const p of pops) { p.t += dt; p.y -= 40 * dt; }
  pops = pops.filter(p => p.t < 1.1);
  if (state === 'ending') { updSnow(dt, 1); finale.t += dt; finale.x -= 140 * dt; finale.y -= 30 * dt; return; }
  if (state === 'play' && L && L.mode === 'dawn') updSnow(dt, 0.6);
  if (state !== 'play' || overlay) return;
  bri.x = W * 0.3;
  if (bri.noseT > 0) { bri.noseT -= dt; if (bri.noseT <= 0) bri.nose = 'base'; }
  bri.hurt = Math.max(0, bri.hurt - dt); bri.wob = Math.max(0, bri.wob - dt * 3);
  hintT += dt;
  if (endPhase) { updEnd(dt); return; }
  dist += L.speed * dt;
  bri.vy = Math.min(bri.vy + 820 * dt, 380); bri.y += bri.vy * dt;
  if (bri.y < 110) { bri.y = 110; bri.vy = Math.max(bri.vy, 40); }
  const wx = dist + bri.x;
  const h = houseAt(wx); const floor = h ? H - h.h - 34 : H - 70;
  if (bri.y > floor) { bri.y = floor; bri.vy = -280; SFX.pof(); pops.push({ x: bri.x, y: bri.y + 30, s: 'pof!', t: 0, c: '#ffe' }); }
  bri.ang = clamp(bri.vy / 900, -0.35, 0.45);
  // comignoli e campanili
  if (bri.hurt <= 0) {
    for (const c of chims) { const cx = c.x - dist; if (Math.abs(cx - bri.x) < c.w / 2 + 26 && bri.y + 24 > c.top) { bump(c.lamp ? 'Ahi, un lampione!' : 'Ahi, un comignolo!'); break; } }
    if (h && h.tower && bri.y + 24 > H - h.h) bump('Ahi, il campanile!');
  }
  // oggetti
  for (const it of items) {
    if (it.got) continue; const ix = it.x - dist; if (ix < -50 || ix > W + 50) continue;
    const dx = ix - (bri.x + 8), dy = it.y + Math.sin(time * 3 + it.x) * 6 - bri.y;
    if (dx * dx + dy * dy < (it.r + 30) * (it.r + 30)) collect(it, ix);
  }
  // gabbiani
  for (const g of gulls) {
    if (g.gone) continue;
    const sx = g.x - dist;
    if (!g.active && sx < W + 220) { g.active = true; g.sx = W + 120; g.warn = 1.2; }
    if (!g.active) continue;
    if (g.warn > 0) { g.warn -= dt; continue; }
    g.sx -= (L.speed * 0.5 + g.spd) * dt; g.ph += dt * 2.2;
    g.yy = g.y + Math.sin(g.ph) * 45;
    if (g.sx < -150) g.gone = true;
    if (!g.hit && bri.hurt <= 0) { const dx = g.sx - bri.x, dy = g.yy - bri.y; if (dx * dx + dy * dy < 50 * 50) steal(g); }
  }
  if (dist >= L.len) {
    if (L.finale) { endPhase = 'molo'; endT = 0; }
    else if (L.last) { state = 'ending'; finale = { t: 0 }; SFX.fanfare(); }
    else { state = 'play'; overlay = { type: 'level' }; SFX.fanfare(); }
  }
}
function bump(msg) {
  bri.hurt = 1.4; bri.vy = -260; setNose('blu', 1.4); SFX.ahi(); combo = 0;
  if (bell > 0) bell -= 1;
  pops.push({ x: bri.x, y: bri.y - 50, s: msg, t: 0, c: '#bfe3ff' }); flash = 0.15;
}
function steal(g) {
  g.hit = true; bri.hurt = 1.2; setNose('blu', 1.4); SFX.squawk(); combo = 0;
  if (cart > 0) { cart--; score = Math.max(0, score - 25); pops.push({ x: bri.x, y: bri.y - 50, s: 'L’Ammiraglio ha rubato una cartellata!', t: 0, c: '#ffe08a' }); }
  else pops.push({ x: bri.x, y: bri.y - 50, s: 'Squaaak! Che spavento!', t: 0, c: '#ffe08a' });
  g.ph += 3; g.spd += 120;
}
function collect(it, ix) {
  it.got = true;
  if (it.t === 'risata') {
    risate++; combo++; bell = Math.min(BELL_TARGET, bell + 1); score += 10 + Math.min(combo, 10);
    setNose('rosa', 0.8); bellRing = 0.5; SFX.tin(Math.min(combo, 12));
    pops.push({ x: ix, y: it.y - 24, s: 'tin!', t: 0, c: '#fff6c2' });
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; parts.push({ x: ix, y: it.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, t: 0, life: 0.5, c: '#ffe56b', r: 3 }); }
  } else if (it.t === 'cart') {
    cart++; score += 25; setNose('oro', 1.5); SFX.gnam();
    pops.push({ x: ix, y: it.y - 24, s: 'gnam!', t: 0, c: '#ffcf6b' });
  } else if (it.t === 'lettera') {
    lettere++; score += 100; SFX.letter(); overlay = { type: 'letter', L: L.letterObj };
  }
}
function updEnd(dt) {
  endT += dt;
  bri.vy = Math.min(bri.vy + 820 * dt, 380);
  if (endPhase === 'molo') {
    // tutto il paese ride, e anche Nico
    bri.y = lerp(bri.y, 330, dt * 2); bri.vy = 0;
    if (Math.floor(endT * 6) !== Math.floor((endT - dt) * 6) && bell < BELL_TARGET) { bell = Math.min(BELL_TARGET, bell + 3); SFX.tin(Math.floor(Math.random() * 12)); bellRing = 0.5; }
    if (endT > 0.05 && endT - dt <= 0.05) SFX.laugh();
    if (endT > 3.6) { bell = BELL_TARGET; endPhase = 'sleigh'; endT = 0; sleigh = { x: W + 40, y: 220, s: Math.min(0.78, (W * 0.95) / 720) }; SFX.fanfare(); }
    return;
  }
  if (endPhase === 'sleigh') {
    // la slitta arriva da destra e rallenta
    sleigh.x = lerp(sleigh.x, W * 0.62 - 405 * sleigh.s, dt * 1.4);
    sleigh.y = 210 + Math.sin(time * 1.5) * 8;
    const gx = sleigh.x + 405 * sleigh.s, gy = sleigh.y + 172 * sleigh.s - 6;
    sleigh.gx = gx; sleigh.gy = gy;
    // il giocatore vola; un aiutino lo porta piano verso il posto vuoto
    const assist = clamp(endT / 7, 0.25, 1);
    bri.y += bri.vy * dt * (1 - assist * 0.8);
    bri.y = lerp(bri.y, gy, dt * (0.6 + assist * 2.2));
    bri.x = lerp(bri.x, gx, dt * (0.25 + assist * 0.9));
    bri.y = clamp(bri.y, 110, H - 160);
    const d = Math.hypot(bri.x - gx, bri.y - gy);
    bri.s = lerp(sleigh.s * 0.6, 0.5, clamp(d / 250, 0, 1));
    bri.ang = 0;
    if (d < 22 || endT > 9) {
      endPhase = 'away'; endT = 0; SFX.fanfare(); for (let i = 0; i < 4; i++) setTimeout(() => SFX.tin(i * 3), i * 140);
      score += 200;
    }
    return;
  }
  if (endPhase === 'away') {
    updSnow(dt, 1);
    sleigh.x -= 60 * dt * endT * 3; sleigh.y -= 40 * dt * endT * 2;
    bri.x = sleigh.gx = sleigh.x + 405 * sleigh.s; bri.y = sleigh.gy = sleigh.y + 172 * sleigh.s - 6; bri.s = sleigh.s * 0.6;
    if (endT > 3.2) { overlay = { type: 'level' }; }
  }
}
function updSnow(dt, k) {
  if (snow.length < 220 * k) for (let i = 0; i < 4; i++) snow.push({ x: Math.random() * W, y: -10, vy: 30 + Math.random() * 50, vx: (Math.random() - 0.5) * 20, r: 1 + Math.random() * 2.4, p: Math.random() * 6 });
  for (const s of snow) { s.y += s.vy * dt; s.x += s.vx * dt + Math.sin(time + s.p) * 0.3; if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; } }
}

// ---------- disegno ----------
function sky() {
  const m = L ? L.mode : 'night';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (m === 'day') { g.addColorStop(0, '#5fb3e8'); g.addColorStop(0.6, '#bfe6fb'); g.addColorStop(1, '#eaf7ff'); }
  else if (m === 'sunset') { g.addColorStop(0, '#5a5ea8'); g.addColorStop(0.35, '#e58ba0'); g.addColorStop(0.7, '#ffc58a'); g.addColorStop(1, '#ffe7c4'); }
  else if (m === 'dawn') { g.addColorStop(0, '#9fb8e8'); g.addColorStop(0.45, '#f7c3b0'); g.addColorStop(1, '#fff3df'); }
  else { g.addColorStop(0, '#070d2e'); g.addColorStop(0.6, '#1b2a63'); g.addColorStop(1, '#2c3d7a'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (m === 'night' || m === 'sunset') {
    for (const s of stars) { const a = (m === 'night' ? 0.9 : 0.35) * (0.6 + 0.4 * Math.sin(time * 2 + s.p)); ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.fillRect(((s.x - dist * 0.02) % 1200 + 1200) % 1200 * (W / 1200), s.y, s.s, s.s); }
  }
  if (m === 'night') { ctx.save(); ctx.shadowColor = '#fff8d0'; ctx.shadowBlur = 40; ctx.fillStyle = '#fbf3cf'; ctx.beginPath(); ctx.arc(W * 0.78, 150, 46, 0, 7); ctx.fill(); ctx.restore(); }
  if (m === 'day') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 5; i++) { const x = ((i * 330 - dist * 0.08) % (W + 300) + W + 300) % (W + 300) - 150, y = 150 + (i % 3) * 70; cloud(x, y, 1 + (i % 2) * 0.4); } }
  if (m === 'sunset') { ctx.fillStyle = 'rgba(255,230,210,0.55)'; for (let i = 0; i < 4; i++) { const x = ((i * 380 - dist * 0.08) % (W + 300) + W + 300) % (W + 300) - 150; cloud(x, 180 + (i % 2) * 90, 1.2); } }
}
function cloud(x, y, s) { ctx.beginPath(); ctx.arc(x, y, 26 * s, 0, 7); ctx.arc(x + 30 * s, y - 14 * s, 32 * s, 0, 7); ctx.arc(x + 64 * s, y, 24 * s, 0, 7); ctx.rect(x, y, 64 * s, 24 * s); ctx.fill(); }
function farLayer() {
  const m = L.mode === 'dawn' ? 'day' : L.mode; const seaY = H - 230;
  // mare
  const g = ctx.createLinearGradient(0, seaY, 0, H);
  if (m === 'day') { g.addColorStop(0, '#2a8fc4'); g.addColorStop(1, '#1b6ea3'); }
  else if (m === 'sunset') { g.addColorStop(0, '#d98c8f'); g.addColorStop(1, '#6a5c97'); }
  else { g.addColorStop(0, '#13265a'); g.addColorStop(1, '#0a1640'); }
  ctx.fillStyle = g; ctx.fillRect(0, seaY, W, H - seaY);
  if (m === 'night') { ctx.fillStyle = 'rgba(255,245,200,0.25)'; for (let i = 0; i < 9; i++) ctx.fillRect(W * 0.78 - 30 + Math.sin(time * 2 + i) * 10, seaY + 8 + i * 12, 60 - i * 4, 3); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 14; i++) { const x = ((i * 97 - dist * 0.45) % (W + 60) + W + 60) % (W + 60) - 30; ctx.fillRect(x, seaY + 14 + (i % 5) * 16, 18, 2); }
  // paese lontano sulla scogliera
  const off = dist * 0.18; const baseY = seaY + 4;
  const col = m === 'day' ? '#efe9dc' : m === 'sunset' ? '#f4d2c0' : '#2c3a70';
  const sh = m === 'day' ? '#d9d0bd' : m === 'sunset' ? '#d9a9a0' : '#202c5c';
  ctx.fillStyle = m === 'night' ? '#18224f' : (m === 'day' ? '#b8a88c' : '#a9837e');
  ctx.beginPath(); ctx.moveTo(0, baseY + 10); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, baseY - 10 + Math.sin((x + off) / 90) * 6); ctx.lineTo(W, baseY + 12); ctx.closePath(); ctx.fill();
  for (const f of far) { const x = f.x - (off % 5800); if (x < -100 || x > W + 100) continue;
    ctx.fillStyle = col; ctx.fillRect(x, baseY - 16 - f.h, f.w, f.h + 8); ctx.fillStyle = sh; ctx.fillRect(x + f.w * 0.75, baseY - 16 - f.h, f.w * 0.25, f.h + 8);
    if (m === 'night') { ctx.fillStyle = 'rgba(255,214,120,0.8)'; ctx.fillRect(x + f.w * 0.3, baseY - f.h, 4, 5); }
    if (f.tower) { ctx.save(); ctx.translate(x + f.w / 2, baseY - 16 - f.h); ctx.rotate(0.06); ctx.fillStyle = col; ctx.fillRect(-9, -70, 18, 70); ctx.beginPath(); ctx.moveTo(-11, -70); ctx.lineTo(0, -88); ctx.lineTo(11, -70); ctx.fill(); ctx.fillStyle = sh; ctx.fillRect(-4, -60, 8, 10); ctx.restore(); }
  }
  // barche nel porto (livello 1)
  if (m === 'day' || m === 'night') { const cols = ['#d94b3d', '#f2c230', '#3d8ad9', '#3fae6a']; for (let i = 0; i < 6; i++) { const x = ((i * 260 - dist * 0.5) % (W + 240) + W + 240) % (W + 240) - 120; boat(x, seaY + 50 + (i % 2) * 22, cols[i % 4]); } }
}
function boat(x, y, c) {
  const b = Math.sin(time * 2 + x) * 2; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y + b); ctx.lineTo(x + 70, y + b); ctx.lineTo(x + 58, y + 16 + b); ctx.lineTo(x + 10, y + 16 + b); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 24, y - 14 + b, 22, 14); ctx.fillStyle = '#5a4630'; ctx.fillRect(x + 34, y - 40 + b, 2, 26);
}
function nearLayer() {
  const m = L.mode === 'dawn' ? 'day' : L.mode; const sugar = L.mode === 'dawn';
  for (const h of houses) {
    const x = h.x - dist; if (x > W + 20 || x + h.w < -20) continue;
    const top = H - h.h;
    if (h.molo) {
      ctx.fillStyle = '#5c6378'; ctx.fillRect(x, top, h.w + 1, h.h); ctx.fillStyle = '#737b94'; ctx.fillRect(x, top, h.w + 1, 12);
      ctx.strokeStyle = 'rgba(30,35,55,0.5)'; ctx.lineWidth = 2; for (let yy = top + 30; yy < H; yy += 26) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + h.w, yy); ctx.stroke(); }
      ctx.fillStyle = '#3a3f52'; ctx.fillRect(x + h.w / 2 - 7, top - 14, 14, 14); continue;
    }
    const wall = m === 'day' ? '#fbf7ee' : m === 'sunset' ? '#ffe4d2' : '#c7cde8';
    const side = m === 'day' ? '#e3dccb' : m === 'sunset' ? '#e9bfae' : '#9aa3c9';
    if (h.tower) {
      ctx.save(); ctx.translate(x + h.w / 2, H); ctx.rotate(0.05);
      ctx.fillStyle = wall; ctx.fillRect(-h.w / 2, -h.h, h.w, h.h); ctx.fillStyle = side; ctx.fillRect(h.w / 4, -h.h, h.w / 4, h.h);
      ctx.fillStyle = '#6b4a2b'; rr(-16, -h.h + 30, 32, 44, 14); ctx.fill(); ctx.fillStyle = '#c9a23a'; ctx.beginPath(); ctx.arc(0, -h.h + 58, 11, 0, 7); ctx.fill();
      ctx.fillStyle = wall; ctx.beginPath(); ctx.moveTo(-h.w / 2 - 6, -h.h); ctx.lineTo(0, -h.h - 46); ctx.lineTo(h.w / 2 + 6, -h.h); ctx.fill();
      ctx.restore(); continue;
    }
    ctx.fillStyle = wall; ctx.fillRect(x, top, h.w + 1, h.h); ctx.fillStyle = side; ctx.fillRect(x + h.w - 12, top, 12, h.h);
    ctx.fillStyle = m === 'night' ? '#aab3d8' : '#efe7d6'; ctx.fillRect(x - 3, top - 6, h.w + 6, 8);
    if (sugar) { ctx.fillStyle = '#ffffff'; rr(x - 5, top - 12, h.w + 10, 12, 6); ctx.fill(); }
    if (h.dome) { ctx.fillStyle = wall; ctx.beginPath(); ctx.arc(x + h.w / 2, top - 4, h.w * 0.28, Math.PI, 0); ctx.fill(); }
    const lit = m === 'night' || m === 'sunset';
    for (let i = 0; i <= h.win; i++) { const wx = x + 16 + i * 30; if (wx > x + h.w - 30) break; ctx.fillStyle = lit && (i + Math.floor(h.R * 5)) % 2 === 0 ? '#ffd27a' : h.col; rr(wx, top + 24, 16, 20, 7); ctx.fill(); }
    if (h.door) { ctx.fillStyle = h.col; rr(x + h.w - 44, H - 52, 24, 52, 11); ctx.fill(); }
    if (h.ger) { for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#d9283a' : '#2e8b47'; ctx.beginPath(); ctx.arc(x + 14 + i * 7, top + 52, 4, 0, 7); ctx.fill(); } }
  }
  for (const c of chims) {
    const x = c.x - dist; if (x < -40 || x > W + 40) continue;
    if (c.lamp) {
      ctx.fillStyle = '#2b2f40'; ctx.fillRect(x - 4, c.top + 20, 8, H - c.top);
      ctx.save(); ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 30; ctx.fillStyle = '#ffe9a8'; rr(x - 12, c.top, 24, 26, 5); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#2b2f40'; ctx.fillRect(x - 15, c.top - 6, 30, 7);
    } else {
      const wall = m === 'day' ? '#f3ede0' : m === 'sunset' ? '#f7d6c4' : '#b9c0de';
      ctx.fillStyle = wall; ctx.fillRect(x - c.w / 2, c.top, c.w, c.base - c.top); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + c.w / 2 - 7, c.top, 7, c.base - c.top);
      ctx.fillStyle = '#b5523b'; ctx.fillRect(x - c.w / 2 - 5, c.top - 8, c.w + 10, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 3; i++) { const t = (time * 0.6 + i / 3) % 1; ctx.beginPath(); ctx.arc(x + Math.sin(t * 6 + c.x) * 6, c.top - 14 - t * 50, 6 + t * 8, 0, 7); ctx.fill(); }
    }
  }
}
function drawItem(it) {
  const x = it.x - dist; if (x < -40 || x > W + 40) return;
  const y = it.y + Math.sin(time * 3 + it.x) * 6;
  if (it.t === 'risata') {
    ctx.save(); ctx.shadowColor = '#ffe57a'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - 6, y - 3, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 6, y - 3, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = '#9b3b1e'; ctx.beginPath(); ctx.arc(x, y + 3, 7, 0, Math.PI); ctx.fill();
    text('ah!', x + 20, y - 18, 12, '#fff', 'center', 'bold', 'rgba(120,70,0,0.6)', 3);
  } else if (it.t === 'cart') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.8);
    ctx.shadowColor = '#ffb84a'; ctx.shadowBlur = 12; ctx.strokeStyle = '#c9781e'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); for (let a = 0; a < 15; a += 0.2) { const r = 1.3 * a; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#f2b45a'; ctx.lineWidth = 3; ctx.beginPath(); for (let a = 0; a < 15; a += 0.2) { const r = 1.3 * a; ctx.lineTo(Math.cos(a) * r - 1, Math.sin(a) * r - 1); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.cos(i * 2) * 10, Math.sin(i * 2) * 10, 2, 2);
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 2) * 0.12);
    ctx.shadowColor = '#fff6b0'; ctx.shadowBlur = 26 + Math.sin(time * 5) * 8; ctx.fillStyle = '#fbf3df'; ctx.fillRect(-24, -16, 48, 32); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-24, -16); ctx.lineTo(0, 4); ctx.lineTo(24, -16); ctx.stroke();
    ctx.fillStyle = '#c4202f'; ctx.beginPath(); ctx.arc(0, 3, 6, 0, 7); ctx.fill(); ctx.restore();
  }
}
const NOSE = { base: '#bfe6ff', blu: '#2d5bff', rosa: '#ff8fa8', oro: '#ffc23a' };
function drawBri(x, y, ang, flip = false, s = 0.5) {
  if (bri.hurt > 0 && Math.floor(bri.hurt * 12) % 2 === 0 && state === 'play' && !endPhase) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.sin(bri.wob * 9) * 0.06 * bri.wob); if (flip) ctx.scale(-1, 1);
  const w = 240 * s, h = 212 * s;
  if (ok(IMG.bri)) ctx.drawImage(IMG.bri, -w / 2, -h / 2, w, h);
  else { ctx.fillStyle = '#b07a3e'; ctx.beginPath(); ctx.ellipse(0, 0, w / 2.4, h / 3.4, 0, 0, 7); ctx.fill(); }
  // naso che cambia colore
  const nx = -w / 2 + 215 * s, ny = -h / 2 + 95 * s;
  ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = NOSE[bri.nose]; ctx.shadowBlur = 22; ctx.fillStyle = NOSE[bri.nose];
  ctx.beginPath(); ctx.arc(nx, ny, 13 * s * 2 * 0.55, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(nx - 2, ny - 2, 2.2, 0, 7); ctx.fill();
  ctx.restore();
}
function drawGull(g) {
  if (!g.active || g.gone) return;
  if (g.warn > 0) { const a = 0.5 + 0.5 * Math.sin(time * 18); ctx.fillStyle = `rgba(255,80,60,${a})`; ctx.beginPath(); ctx.arc(W - 30, g.y, 18, 0, 7); ctx.fill(); text('!', W - 30, g.y + 1, 24, '#fff'); return; }
  const w = 200 * 0.6, h = 166 * 0.6; ctx.save(); ctx.translate(g.sx, g.yy); ctx.rotate(Math.sin(g.ph * 2) * 0.08);
  if (ok(IMG.gab)) ctx.drawImage(IMG.gab, -w / 2, -h / 2, w, h); ctx.restore();
}
function drawSleigh(sl, withBri) {
  const w = 720 * sl.s, h = 239 * sl.s;
  if (ok(IMG.sli)) ctx.drawImage(IMG.sli, sl.x, sl.y, w, h);
  if (!withBri && sl.gx) { const a = 0.5 + 0.5 * Math.sin(time * 5); ctx.strokeStyle = `rgba(160,220,255,${0.4 + a * 0.5})`; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(sl.gx, sl.gy, 34 + a * 6, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
}
function hud() {
  ctx.fillStyle = 'rgba(10,18,60,0.55)'; rr(8, 8, W - 16, 78, 18); ctx.fill();
  text('★ ' + score, 22, 30, 22, '#ffe27a', 'left');
  const cx = W - 24; ctx.font = `bold 17px ${FONT}`;
  // contatori allineati a destra
  let x = cx; const items = [[lettere + '/3', miniLetter], ['' + cart, miniCart], ['' + risate, smallFace]];
  for (const [v, ic] of items) { const tw = ctx.measureText(v).width; text(v, x, 30, 17, '#fff', 'right'); x -= tw + 16; ic(x, 30); x -= 22; }
  // sonaglio
  const bx = 22, bw = W - 84;
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(bx, 56, bw, 16, 8); ctx.fill();
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#cfe9ff'); g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g; rr(bx, 56, Math.max(16, bw * bell / BELL_TARGET), 16, 8); ctx.fill();
  text('Sonaglio', bx + 8, 64, 11, '#1f3a7a', 'left', 'bold');
  bellIcon(W - 40, 62, bellRing);
  text(L.num + '. ' + L.name, 16, 150, 14, '#fff', 'left', 'bold', 'rgba(10,20,60,0.7)', 4);
  iconButton(W - 52, 94, 40, 'mute', () => setMuted(!muted));
  iconButton(W - 100, 94, 40, 'restart', () => { newGame(); });
}
function smallFace(x, y) { ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#9b3b1e'; ctx.beginPath(); ctx.arc(x, y + 1, 4, 0, Math.PI); ctx.fill(); }
function miniCart(x, y) { ctx.strokeStyle = '#e69a35'; ctx.lineWidth = 3; ctx.beginPath(); for (let a = 0; a < 13; a += 0.3) ctx.lineTo(x + Math.cos(a) * a * 0.7, y + Math.sin(a) * a * 0.7); ctx.stroke(); }
function miniLetter(x, y) { ctx.fillStyle = '#fbf3df'; ctx.fillRect(x - 10, y - 7, 20, 14); ctx.strokeStyle = '#b89b6a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 10, y - 7); ctx.lineTo(x, y + 1); ctx.lineTo(x + 10, y - 7); ctx.stroke(); }
function bellIcon(x, y, ring) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 30) * 0.3 * ring);
  ctx.fillStyle = '#e9eef5'; ctx.strokeStyle = '#8a96a8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-11, 8); ctx.quadraticCurveTo(-11, -12, 0, -12); ctx.quadraticCurveTo(11, -12, 11, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a96a8'; ctx.beginPath(); ctx.arc(0, 10, 3.5, 0, 7); ctx.fill(); ctx.fillStyle = '#f2c230'; star(0, -2, 4); ctx.restore();
  if (ring > 0) text('tin!', x - 4, y - 26 + ring * 6, 14, '#fff');
}
function star(x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); }
function iconButton(x, y, s, kind, fn) {
  buttons.push({ x, y, w: s, h: s, fn });
  ctx.fillStyle = 'rgba(10,18,60,0.6)'; rr(x, y, s, s, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; rr(x, y, s, s, 12); ctx.stroke();
  const cx = x + s / 2, cy = y + s / 2; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (kind === 'mute') {
    ctx.beginPath(); ctx.moveTo(cx - 11, cy - 4); ctx.lineTo(cx - 6, cy - 4); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 6, cy + 4); ctx.lineTo(cx - 11, cy + 4); ctx.closePath(); ctx.fill();
    if (muted) { ctx.beginPath(); ctx.moveTo(cx + 4, cy - 6); ctx.lineTo(cx + 12, cy + 6); ctx.moveTo(cx + 12, cy - 6); ctx.lineTo(cx + 4, cy + 6); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(cx + 2, cy, 6, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 2, cy, 11, -0.9, 0.9); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, 10, -0.3, Math.PI * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, cy - 9); ctx.lineTo(cx + 10, cy - 2); ctx.lineTo(cx + 3, cy - 3); ctx.stroke();
  }
}
function bigButton(label, cx, cy, w, fn, primary = true, col = '#d6283b') {
  const h = 62, x = cx - w / 2, y = cy - h / 2; buttons.push({ x, y, w, h, fn, primary });
  const p = 1 + Math.sin(time * 4) * (primary ? 0.025 : 0);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(x + 3, y + 5, w, h, 31); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, col === '#d6283b' ? '#ff5a5f' : '#4fb6ff'); g.addColorStop(1, col);
  ctx.fillStyle = g; rr(x, y, w, h, 31); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(x, y, w, h, 31); ctx.stroke();
  text(label, cx, cy + 1, 26, '#fff', 'center', 'bold', 'rgba(90,0,10,0.5)', 4); ctx.restore();
}
function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(x + 4, y + 6, w, h, 26); ctx.fill();
  ctx.fillStyle = '#fff8ec'; rr(x, y, w, h, 26); ctx.fill(); ctx.strokeStyle = '#d6283b'; ctx.lineWidth = 5; rr(x, y, w, h, 26); ctx.stroke();
  ctx.strokeStyle = '#2e8b47'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]); rr(x + 9, y + 9, w - 18, h - 18, 20); ctx.stroke(); ctx.setLineDash([]);
}
function drawParticles() {
  for (const p of parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  for (const p of pops) { ctx.globalAlpha = clamp(1.2 - p.t, 0, 1); text(p.s, clamp(p.x, 120, W - 120), p.y, p.s.length > 10 ? 18 : 24, p.c, 'center', 'bold', 'rgba(20,30,70,0.7)', 4); } ctx.globalAlpha = 1;
}
function drawSnow() { ctx.fillStyle = 'rgba(255,255,255,0.92)'; for (const s of snow) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); } }
function scene() {
  sky(); farLayer(); nearLayer();
  for (const it of items) if (!it.got) drawItem(it);
  for (const g of gulls) drawGull(g);
  if (endPhase === 'molo') crowd();
  if (sleigh) drawSleigh(sleigh, endPhase === 'away');
  drawBri(bri.x, bri.y, bri.ang, endPhase === 'away', bri.s || 0.5);
  drawParticles();
  if (endPhase === 'away' || L.mode === 'dawn') drawSnow();
  if (flash > 0) { ctx.fillStyle = `rgba(120,170,255,${flash})`; ctx.fillRect(0, 0, W, H); }
}
function crowd() {
  const R = rng(9); const base = H - 118;
  for (let i = 0; i < 26; i++) { const x = (i + 0.5) * (W / 26) + (R() - 0.5) * 10, hh = 34 + R() * 22, j = Math.abs(Math.sin(time * 9 + i)) * 6;
    const cols = ['#d6283b', '#2f74b5', '#f2c230', '#3fae6a', '#e27ab0', '#8a5cc7']; ctx.fillStyle = cols[i % 6];
    rr(x - 9, base - hh - j, 18, hh, 7); ctx.fill(); ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(x, base - hh - 10 - j, 9, 0, 7); ctx.fill(); }
  // Nico: maglione blu con la stella
  const nx = W * 0.3, j = Math.abs(Math.sin(time * 10)) * 8;
  ctx.fillStyle = '#2f5fb5'; rr(nx - 13, base - 58 - j, 26, 46, 9); ctx.fill(); ctx.fillStyle = '#fff'; star(nx, base - 38 - j, 8);
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(nx, base - 70 - j, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(nx, base - 76 - j, 12, Math.PI, 0); ctx.fill(); ctx.fillRect(nx - 2, base - 92 - j, 4, 8);
  ctx.fillStyle = '#d6283b'; ctx.fillRect(nx - 11, base - 12 - j, 9, 12); ctx.fillRect(nx + 2, base - 12 - j, 9, 12);
  const a = clamp(endT / 0.6, 0, 1); ctx.globalAlpha = a; panel(W / 2 - 190, 150, 380, 120);
  text('Tutto il paese ride…', W / 2, 192, 26, '#b3172b'); text('…e finalmente ride anche Nico!', W / 2, 232, 22, '#1f3a7a'); ctx.globalAlpha = 1;
}
function drawCover() {
  ctx.fillStyle = '#0b1640'; ctx.fillRect(0, 0, W, H);
  if (ok(IMG.cop)) { const s = Math.max(W / 600, H / 960); const w = 600 * s, h = 960 * s; ctx.globalAlpha = 0.35; ctx.drawImage(IMG.cop, (W - w) / 2, (H - h) / 2, w, h); ctx.globalAlpha = 1;
    const s2 = Math.min(W / 600, (H * 0.62) / 960); const w2 = 600 * s2, h2 = 960 * s2; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.drawImage(IMG.cop, (W - w2) / 2, 18, w2, h2); ctx.restore(); }
}
function titleScreen() {
  drawCover(); updSnow(1 / 60, 0.5); drawSnow();
  const py = H * 0.62 - 10; panel(W / 2 - Math.min(200, W / 2 - 14), py, Math.min(400, W - 28), H - py - 16);
  text('Briciola vola!', W / 2, py + 46, 44, '#d6283b', 'center', 'bold', '#fff', 6);
  text('Un gioco di Natale', W / 2, py + 86, 18, '#1f3a7a', 'center', 'bold');
  text('dal libro di Antonino Campanella', W / 2, py + 110, 17, '#1f3a7a', 'center', 'normal');
  bigButton('Gioca!', W / 2, py + 165, 220, () => { audioInit(); newGame(); });
  let ty = py + 218; for (const l of wrap('14 capitoli, 14 voli. Tocca lo schermo (o premi spazio): Briciola fa «hic!» e vola su. Niente pubblicità, niente dati.', Math.min(400, W - 28) - 50, 14)) { text(l, W / 2, ty, 14, '#444', 'center', 'normal'); ty += 19; }
  iconButton(W - 52, 14, 40, 'mute', () => setMuted(!muted));
}
function introScreen() {
  scene(); ctx.fillStyle = 'rgba(8,14,45,0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(420, W - 28), px = W / 2 - pw / 2, py = 70, ph = H - 140; panel(px, py, pw, ph);
  text('Capitolo ' + L.num + ' di 14', W / 2, py + 40, 18, '#2e8b47');
  text(L.name, W / 2, py + 76, 32, '#d6283b');
  const im = IMG[L.img]; if (ok(im)) { const iw = pw - 60, ih = iw * im.naturalHeight / im.naturalWidth; const h2 = Math.min(ih, 240), w2 = h2 * im.naturalWidth / im.naturalHeight; ctx.save(); rr(W / 2 - w2 / 2, py + 102, w2, h2, 14); ctx.clip(); ctx.drawImage(im, W / 2 - w2 / 2, py + 102, w2, h2); ctx.restore(); }
  const lines = wrap(L.intro, pw - 60, 18); let y = py + 370;
  for (const l of lines) { text(l, W / 2, y, 18, '#2a2a3a', 'center', 'normal'); y += 25; }
  bigButton('Via!', W / 2, py + ph - 56, 200, () => { state = 'play'; hintT = 0; bri.vy = -200; });
}
function letterOverlay() {
  ctx.fillStyle = 'rgba(8,14,45,0.6)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(400, W - 28), px = W / 2 - pw / 2, py = 170, ph = 420;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(px + 4, py + 6, pw, ph, 10); ctx.fill();
  ctx.fillStyle = '#f7ecd0'; rr(px, py, pw, ph, 10); ctx.fill(); ctx.strokeStyle = '#c9ad78'; ctx.lineWidth = 3; rr(px, py, pw, ph, 10); ctx.stroke();
  text('Hai trovato una lettera perduta!', W / 2, py + 36, 20, '#b3172b'); text(overlay.L.from, W / 2, py + 64, 15, '#7a6440', 'center', 'normal');
  let y = py + 110; for (const l of wrap(overlay.L.body, pw - 60, 20, 'italic')) { text(l, W / 2, y, 20, '#3b2f1e', 'center', 'italic'); y += 30; }
  text('+100 ★', W / 2, py + ph - 110, 22, '#c9781e');
  bigButton('Continua', W / 2, py + ph - 52, 200, () => { overlay = null; bri.vy = -250; });
}
function levelOverlay() {
  ctx.fillStyle = 'rgba(8,14,45,0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(400, W - 28), px = W / 2 - pw / 2, py = 150, ph = 470; panel(px, py, pw, ph);
  text('Capitolo superato!', W / 2, py + 50, 30, '#d6283b');
  text(L.name, W / 2, py + 88, 20, '#2e8b47');
  text('★ ' + score + ' punti', W / 2, py + 140, 26, '#c9781e');
  text('Risate: ' + risate + '   Cartellate: ' + cart + '   Lettere: ' + lettere + '/3', W / 2, py + 180, 16, '#333', 'center', 'normal');
  let y = py + 240; for (const l of wrap(L.quote, pw - 70, 18, 'italic')) { text(l, W / 2, y, 18, '#444', 'center', 'italic'); y += 26; }
  bigButton('Avanti!', W / 2, py + ph - 60, 200, () => { startIntro(LI + 1); });
}
function endingScreen() {
  // notte, slitta che si allontana, neve di zucchero a velo
  L = LEVELS[12]; sky(); farLayer(); nearLayer();
  ctx.save(); const s = Math.min(0.5, W / 900);
  const span = W + 720 * s + 40, fx = W + 20 - ((finale.t * 80) % span), fy = 50 + Math.sin(finale.t * 1.3) * 10;
  if (ok(IMG.sli)) ctx.drawImage(IMG.sli, fx, fy, 720 * s, 239 * s);
  ctx.translate(fx + 405 * s, fy + 166 * s); ctx.scale(-1, 1); if (ok(IMG.bri)) { const bw = 240 * s * 0.6, bh = 212 * s * 0.6; ctx.drawImage(IMG.bri, -bw / 2, -bh / 2, bw, bh); }
  ctx.restore();
  drawSnow();
  const pw = Math.min(420, W - 28), px = W / 2 - pw / 2, py = 205, ph = 530; panel(px, py, pw, ph);
  text('Ce l’hai fatta!', W / 2, py + 48, 36, '#d6283b');
  const l1 = wrap('Hai volato per tutti i 14 capitoli! Briciola è tornata al suo posto, l’ultimo a sinistra, e su Torre Pinella nevica zucchero a velo.', pw - 60, 18);
  let y = py + 94; for (const l of l1) { text(l, W / 2, y, 18, '#1f3a7a', 'center', 'normal'); y += 25; }
  text('★ ' + score + ' punti', W / 2, y + 22, 30, '#c9781e'); y += 60;
  text('Risate: ' + risate + '   Cartellate: ' + cart + '   Lettere: ' + lettere + '/3', W / 2, y, 16, '#333', 'center', 'normal'); y += 40;
  const aug = wrap('Buon Natale! Ogni volta che ridi, da qualche parte, un sonaglio fa tin. E stanotte, all’ultimo posto a sinistra, una piccola luce azzurra ti saluta.', pw - 60, 18, 'italic');
  for (const l of aug) { text(l, W / 2, y, 18, '#3b2f1e', 'center', 'italic'); y += 25; }
  text('— Antonino Campanella', W / 2, y + 10, 16, '#7a6440', 'center', 'normal');
  bigButton('Ricomincia', W / 2, py + ph - 52, 230, () => { newGame(); });
  text('dal libro «Aiuto, è caduta una renna!»', W / 2, H - 34, 15, '#e8eeff', 'center', 'normal');
  iconButton(W - 52, 14, 40, 'mute', () => setMuted(!muted));
}

// ---------- ciclo ----------
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now; dt *= timeScale;
  buttons = [];
  ctx.setTransform(SC * DPR, 0, 0, SC * DPR, 0, 0);
  if (state === 'loading') {
    ctx.fillStyle = '#0b1640'; ctx.fillRect(0, 0, W, H); text('Briciola sta arrivando… ' + Math.round(loaded / total * 100) + '%', W / 2, H / 2, 22);
    if (loaded >= total) state = 'title';
  } else if (state === 'title') { time += dt; titleScreen(); }
  else if (state === 'intro') { time += dt; introScreen(); }
  else if (state === 'play') {
    // passi fissi per stabilità
    let t = dt; while (t > 0) { const s = Math.min(t, 1 / 60); update(s); t -= s; }
    scene(); hud();
    if (hintT < 3.5 && LI === 0 && !overlay) { ctx.globalAlpha = clamp(3.5 - hintT, 0, 1); text('Tocca per fare «hic!» e volare', W / 2, H * 0.5, 24, '#fff', 'center', 'bold', 'rgba(10,20,60,0.8)', 5); ctx.globalAlpha = 1; }
    if (endPhase === 'sleigh') text('Vola all’ultimo posto a sinistra!', W / 2, 140, 22, '#fff', 'center', 'bold', 'rgba(10,20,60,0.8)', 5);
    if (overlay && overlay.type === 'letter') letterOverlay();
    if (overlay && overlay.type === 'level') levelOverlay();
  } else if (state === 'ending') { let t = dt; while (t > 0) { const s = Math.min(t, 1 / 60); update(s); t -= s; } endingScreen(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (TEST) window.__BV = {
  get: () => ({ state, level: LI, endPhase, overlay: overlay && overlay.type, score, risate, cart, lettere, bell, y: bri && bri.y, vy: bri && bri.vy, dist, len: L && L.len, W, H }),
  tap: () => press(-1, -1), primary: () => primary(), speed: k => { timeScale = k; },
  safe: () => bri ? safeYAt(dist + bri.x + 120) : 0
};
})();
