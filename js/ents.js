/* ===========================================================
   ents.js – zvuk, fyzika těles, příšery, vesničané, předměty, šípy, částice
   =========================================================== */
(function () {
'use strict';
const { B, BL, I, H, SOLID, HGT } = W;
const getB = G.getB, scene = G.scene;
const rand = Math.random;
const rr = (a, b) => a + rand() * (b - a);

/* ================= ZVUK ================= */
let AC = null, master = null;
G.muted = false;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .55; master.connect(AC.destination); } catch (e) { AC = false; } }
  return AC;
}
G.audioInit = ac;
let nbuf = null;
function noiseBuf() {
  if (nbuf) return nbuf;
  nbuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return nbuf;
}
function noise(dur, vol, ftype, f0, f1, q) {
  const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = noiseBuf(); s.loop = true;
  const f = AC.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 1;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tone(f0, f1, dur, vol, wave) {
  const t = AC.currentTime, o = AC.createOscillator(); o.type = wave || 'square';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
}
G.sfx = function (name, x, y, z) {
  if (G.muted || !ac()) return;
  let v = 1;
  if (x !== undefined && G.player) { const d = Math.hypot(x - G.player.x, y - G.player.y, z - G.player.z); v = Math.max(0, 1 - d / (name === 'bell' ? 90 : 26)); if (v < .03) return; v *= v; }
  switch (name) {
    case 'break': noise(.16, .5 * v, 'lowpass', 1400, 300, 1); break;
    case 'place': noise(.08, .35 * v, 'bandpass', 500, 300, 2); break;
    case 'step': noise(.07, .12 * v, 'lowpass', 600, 250, 1); break;
    case 'hit': noise(.1, .5 * v, 'bandpass', 900, 400, 2); tone(220, 90, .09, .12 * v, 'square'); break;
    case 'hurt': tone(300, 110, .25, .3 * v, 'sawtooth'); noise(.12, .25 * v, 'bandpass', 700, 300, 1); break;
    case 'pop': tone(500, 900, .09, .15 * v, 'sine'); break;
    case 'zombie': tone(rr(85, 110), 55, .6, .35 * v, 'sawtooth'); tone(rr(150, 190), 90, .5, .1 * v, 'square'); break;
    case 'skeleton': for (let i = 0; i < 3; i++) setTimeout(() => ac() && noise(.04, .3 * v, 'highpass', 3000, 3500, 4), i * 60); break;
    case 'spider': noise(.3, .3 * v, 'bandpass', 2500, 1800, 5); break;
    case 'hiss': noise(1.4, .45 * v, 'highpass', 2500, 5000, 1); break;
    case 'explode': noise(1.1, 1.0 * v, 'lowpass', 900, 80, 1); tone(70, 28, .8, .6 * v, 'sawtooth'); break;
    case 'shoot': noise(.12, .3 * v, 'bandpass', 1500, 2500, 3); tone(300, 600, .1, .06 * v, 'triangle'); break;
    case 'villager': tone(rr(220, 280), rr(170, 210), .22, .2 * v, 'square'); break;
    case 'eat': for (let i = 0; i < 3; i++) setTimeout(() => ac() && noise(.06, .3, 'bandpass', 800, 500, 2), i * 120); break;
    case 'burn': noise(.2, .12 * v, 'bandpass', 3000, 1000, 1); break;
    case 'splash': noise(.25, .35 * v, 'lowpass', 2500, 600, 1); break;
    case 'cow': tone(rr(110, 130), 70, .7, .35 * v, 'sawtooth'); tone(rr(220, 250), 140, .6, .08 * v, 'square'); break;
    case 'pig': tone(rr(180, 220), 110, .16, .3 * v, 'square'); setTimeout(() => ac() && tone(rr(160, 200), 100, .14, .25 * v, 'square'), 150); break;
    case 'sheep': tone(rr(280, 330), 250, .5, .22 * v, 'sawtooth'); tone(rr(560, 620), 480, .45, .06 * v, 'square'); break;
    case 'chicken': tone(rr(900, 1100), 700, .1, .15 * v, 'square'); setTimeout(() => ac() && tone(rr(1000, 1200), 800, .09, .12 * v, 'square'), 120); break;
    case 'horse': tone(rr(380, 440), rr(220, 280), .55, .28 * v, 'sawtooth'); tone(rr(700, 800), 450, .4, .06 * v, 'square'); break;
    case 'rabbit': tone(rr(1400, 1700), 1100, .06, .1 * v, 'square'); break;
    case 'wolf': tone(rr(140, 170), 80, .5, .3 * v, 'sawtooth'); noise(.3, .15 * v, 'bandpass', 500, 300, 2); break;
    case 'thunder': noise(2.2, 1.0 * v, 'lowpass', 500, 50, 1); tone(55, 28, 1.6, .5 * v, 'sawtooth'); break;
    case 'bell': tone(523, 515, 1.8, .42 * v, 'sine'); tone(1046, 1030, 1.3, .18 * v, 'sine'); tone(1568, 1550, .9, .1 * v, 'sine'); tone(2093, 2080, .5, .05 * v, 'sine'); break;
    case 'golem': tone(60, 40, .5, .45 * v, 'sawtooth'); noise(.3, .3 * v, 'lowpass', 400, 150, 1); break;
    case 'pillager': tone(rr(120, 150), 90, .35, .3 * v, 'sawtooth'); tone(rr(240, 280), 170, .25, .08 * v, 'square'); break;
    case 'door_open': noise(.18, .3 * v, 'bandpass', 500, 900, 3); tone(180, 260, .1, .08 * v, 'square'); break;
    case 'door_close': noise(.14, .35 * v, 'bandpass', 700, 300, 3); tone(140, 90, .1, .1 * v, 'square'); break;
    case 'chest': noise(.2, .3 * v, 'bandpass', 300, 600, 3); tone(120, 180, .15, .1 * v, 'square'); break;
  }
};

/* šum deště (smyčka) */
let rainNode = null;
G.setRainVolume = function (v) {
  if (G.muted || !ac()) { if (rainNode) rainNode.g.gain.value = 0; return; }
  if (!rainNode) {
    const s = AC.createBufferSource(); s.buffer = noiseBuf(); s.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = .5;
    const g = AC.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    rainNode = { g, f };
  }
  rainNode.g.gain.setTargetAtTime(Math.max(0, v) * .16, AC.currentTime, .5);
};
/* ================= FYZIKA ================= */
const EPS = 1e-4;
/** nejvyšší bod rampy pod tělem entity (lokálně 0..1) */
function rampTop(id, x, z, e) {
  const ax0 = Math.max(0, e.x - e.w - x), ax1 = Math.min(1, e.x + e.w - x), az0 = Math.max(0, e.z - e.w - z), az1 = Math.min(1, e.z + e.w - z);
  const d = W.rampDir(id);
  return d === 0 ? ax1 : d === 2 ? 1 - ax0 : d === 1 ? az1 : 1 - az0;
}
/** výška povrchu v bodě (x,z) nejblíž pod yRef (rampy plynule) */
G.surfaceY = function (x, z, yRef) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let y = Math.floor(yRef + 1.3); y >= Math.floor(yRef - 3); y--) {
    const id = getB(bx, y, bz);
    if (!SOLID[id]) continue;
    if (W.isRamp(id)) return y + W.rampH(W.rampDir(id), x - bx, z - bz);
    return y + HGT[id];
  }
  return yRef;
};
function collides(e) {
  const x0 = Math.floor(e.x - e.w), x1 = Math.floor(e.x + e.w), y0 = Math.floor(e.y), y1 = Math.floor(e.y + e.h), z0 = Math.floor(e.z - e.w), z1 = Math.floor(e.z + e.w);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const id = getB(x, y, z);
    if (SOLID[id]) {
      if (id >= 224 && W.isStair(id)) { // schody: spodní půlka + zadní půlka nahoře
        if (e.y >= y + 1 - 1e-6) continue;
        if (e.y < y + .5 - 1e-6) return true;
        const bxs = W.stairBoxesAt(W.stairDir(id), (dx, dz) => getB(x + dx, y, z + dz));
        for (let q = 1; q < bxs.length; q++) { const hb = bxs[q]; if (e.x + e.w > x + hb[0] && e.x - e.w < x + hb[3] && e.z + e.w > z + hb[2] && e.z - e.w < z + hb[5]) return true; }
        continue;
      }
      if (W.isRamp(id)) { // šikmá plocha: kolize jen pod nejvyšším bodem v dosahu těla
        if (e.y >= y + 1 - 1e-6) continue;
        if (e.y >= y + rampTop(id, x, z, e) - 1e-6) continue;
        return true;
      }
      const h = HGT[id]; if (h < 1 && e.y >= y + h - 1e-6) continue; return true;
    }
  }
  return false;
}
G.collides = collides;
function groundTop(e) {
  const y0 = Math.floor(e.y); let top = -1e9;
  for (let x = Math.floor(e.x - e.w); x <= Math.floor(e.x + e.w); x++) for (let z = Math.floor(e.z - e.w); z <= Math.floor(e.z + e.w); z++) {
    const id = getB(x, y0, z);
    if (SOLID[id]) {
      if (W.isStair(id)) { const bxs = W.stairBoxesAt(W.stairDir(id), (dx, dz) => getB(x + dx, y0, z + dz)); let hi = false; for (let q = 1; q < bxs.length; q++) { const hb = bxs[q]; if (e.x + e.w > x + hb[0] && e.x - e.w < x + hb[3] && e.z + e.w > z + hb[2] && e.z - e.w < z + hb[5]) hi = true; } top = Math.max(top, y0 + (hi ? 1 : .5)); }
      else if (W.isRamp(id)) top = Math.max(top, y0 + rampTop(id, x, z, e));
      else top = Math.max(top, y0 + HGT[id]);
    }
  }
  return top > -1e8 ? top : y0 + 1;
}
function tryStep(e) { const y0 = e.y; e.y = y0 + .6 + EPS; if (collides(e)) { e.y = y0; return false; } return true; }
G.moveBody = function (e, dt) {
  e.groundPrev = e.onGround; e.onGround = false; e.hitX = false; e.hitZ = false;
  let steps = Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy), Math.abs(e.vz)) * dt / .3);
  if (steps < 1) steps = 1; if (steps > 12) steps = 12;
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    let d = e.vx * h;
    if (d) { e.x += d; if (collides(e)) { if (e.step && (e.groundPrev || e.onGround) && tryStep(e)) { } else { e.x = d > 0 ? Math.floor(e.x + e.w) - e.w - EPS : Math.floor(e.x - e.w) + 1 + e.w + EPS; e.vx = 0; e.hitX = true; } } }
    d = e.vz * h;
    if (d) { e.z += d; if (collides(e)) { if (e.step && (e.groundPrev || e.onGround) && tryStep(e)) { } else { e.z = d > 0 ? Math.floor(e.z + e.w) - e.w - EPS : Math.floor(e.z - e.w) + 1 + e.w + EPS; e.vz = 0; e.hitZ = true; } } }
    d = e.vy * h;
    if (d) {
      e.y += d;
      if (collides(e)) {
        if (d < 0) { e.y = groundTop(e) + EPS; e.onGround = true; } else e.y = Math.floor(e.y + e.h) - e.h - EPS;
        e.vy = 0;
      }
    }
  }
};
G.inFluid = (e, id, dy) => { const v = getB(Math.floor(e.x), Math.floor(e.y + dy), Math.floor(e.z)); return id === B.WATER ? W.isWater(v) : id === B.LAVA ? W.isLava(v) : v === id; };

/* ================= POMOCNÉ ================= */
G.entities = [];
const entities = G.entities;
const P = () => G.player;
function rayClear(x0, y0, z0, x1, y1, z1) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, d = Math.hypot(dx, dy, dz), n = Math.ceil(d / .4);
  for (let i = 1; i < n; i++) { const t = i / n; if (SOLID[getB(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t), Math.floor(z0 + dz * t))]) return false; }
  return true;
}
G.rayClear = rayClear;
function angTo(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k); }

/* ================= ČÁSTICE ================= */
const parts = [];
const pGeo = new THREE.BoxGeometry(.14, .14, .14);
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.visible = false; scene.add(m);
  parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0, g: 18 });
}
let pi = 0;
G.burst = function (x, y, z, col, n, sp, life, grav) {
  for (let k = 0; k < n; k++) {
    const p = parts[pi]; pi = (pi + 1) % parts.length;
    p.m.visible = true; p.m.position.set(x + rr(-.25, .25), y + rr(-.25, .25), z + rr(-.25, .25));
    const v = rr(.7, 1.1);
    p.m.material.color.setRGB(col[0] / 255 * v, col[1] / 255 * v, col[2] / 255 * v);
    p.vx = rr(-sp, sp); p.vy = rr(.2, sp * 1.2); p.vz = rr(-sp, sp); p.life = rr(.4, 1) * (life || .8); p.g = grav === undefined ? 18 : grav;
    const s = rr(.5, 1.2); p.m.scale.setScalar(s);
  }
};
function updateParticles(dt) {
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt; if (p.life <= 0) { p.m.visible = false; continue; }
    p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    const bx = Math.floor(p.m.position.x), by = Math.floor(p.m.position.y), bz = Math.floor(p.m.position.z);
    if (SOLID[getB(bx, by, bz)]) { p.vy = 0; p.vx *= .5; p.vz *= .5; p.m.position.y = by + 1.07; }
  }
}

/* ================= GEOMETRIE BLOKU (drželka, předměty) ================= */
const FACES = [
  [1, 0, 0, 1, 0, 1, 0, 0, -1, 0, 1, 0, .7], [-1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, .7], [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, -1, 1],
  [0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, .5], [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, .85], [0, 0, -1, 1, 0, 0, -1, 0, 0, 0, 1, 0, .85]];
const blockGeoCache = new Map();
G.blockGeo = function (id, s) {
  const key = id + '_' + s;
  if (blockGeoCache.has(key)) return blockGeoCache.get(key);
  const bl = BL[id], pos = [], uv = [], col = [], idx = [];
  FACES.forEach((F, f) => {
    const tile = f === 2 ? bl.top : f === 3 ? bl.bot : bl.side;
    const u0 = (tile & 7) / 8, v0 = 1 - ((tile >> 3) + 1) / 16, w = .125, wv = .0625, base = pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const cu = [0, 1, 1, 0][k], cv = [0, 0, 1, 1][k];
      pos.push((F[3] + cu * F[6] + cv * F[9] - .5) * s, (F[4] + cu * F[7] + cv * F[10] - .5) * s, (F[5] + cu * F[8] + cv * F[11] - .5) * s);
      uv.push(u0 + cu * w, v0 + cv * wv); col.push(F[12], F[12], F[12]);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  blockGeoCache.set(key, g); return g;
};
G.blockMat = new THREE.MeshBasicMaterial({ map: G.atlasTex, vertexColors: true, transparent: true, alphaTest: .1 });
const itemTexCache = new Map();
G.itemTex = function (id) {
  if (itemTexCache.has(id)) return itemTexCache.get(id);
  const t = TEX.itemTexture(id);
  itemTexCache.set(id, t); return t;
};
const isCubeItem = (id) => (id < 100 || W.isStair(id) || W.isNB(id)) && BL[id] && !BL[id].cross && !BL[id].flat;
G.isCubeItem = isCubeItem;
G.itemMesh = function (id, size) {
  if (isCubeItem(id)) return new THREE.Mesh(G.blockGeo(id, size), G.blockMat);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.5, size * 1.5), new THREE.MeshBasicMaterial({ map: G.itemTex(id), transparent: true, alphaTest: .3, side: THREE.DoubleSide }));
  return m;
};

/* ================= PŘEDMĚTY NA ZEMI ================= */
G.dropItem = function (x, y, z, id, count, vx, vy, vz) {
  const mesh = G.itemMesh(id, .28);
  scene.add(mesh);
  const e = { kind: 'item', id, count: count || 1, x, y, z, vx: vx === undefined ? rr(-1.5, 1.5) : vx, vy: vy === undefined ? rr(3, 5) : vy, vz: vz === undefined ? rr(-1.5, 1.5) : vz, w: .14, h: .28, age: 0, mesh, pickDelay: .5 };
  entities.push(e);
};
function updateItem(e, dt) {
  e.age += dt; e.pickDelay -= dt;
  e.vy -= 24 * dt; if (e.vy < -30) e.vy = -30;
  if (G.inFluid(e, B.WATER, .1)) { e.vy += 40 * dt; if (e.vy > 1.5) e.vy = 1.5; e.vx *= .9; e.vz *= .9; }
  if (G.inFluid(e, B.LAVA, .1)) { e.dead = true; G.burst(e.x, e.y, e.z, [255, 120, 0], 6, 2); return; }
  G.moveBody(e, dt);
  if (e.onGround) { e.vx *= .85; e.vz *= .85; }
  e.mesh.position.set(e.x, e.y + .2 + Math.sin(e.age * 3) * .05, e.z);
  e.mesh.rotation.y = e.age * 1.6;
  if (e.age > 300) e.dead = true;
  const p = P();
  if (p && p.alive && e.pickDelay <= 0) {
    const dx = p.x - e.x, dy = p.y + .9 - e.y, dz = p.z - e.z, d = Math.hypot(dx, dy, dz);
    if (d < 2.4) { const k = 7 / (d + .2); e.vx += dx / d * k * dt * 8; e.vz += dz / d * k * dt * 8; e.vy += (dy / d * k * dt * 8) + 24 * dt; }
    if (d < 1.0) {
      const rest = G.addItem(e.id, e.count);
      if (rest < e.count) { G.sfx('pop'); G.refreshUI(); }
      e.count = rest; if (rest <= 0) e.dead = true;
    }
  }
}


/* ================= ŠÍPY ================= */
const arrows = [];
const arrowGeo = new THREE.BoxGeometry(.05, .05, .7);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xd8d0b8 });
G.shootArrow = function (x, y, z, dx, dy, dz, speed, dmg, hostile) {
  const m = new THREE.Mesh(arrowGeo, arrowMat); scene.add(m);
  arrows.push({ x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, m, life: 30, stuck: 0, dmg, hostile: !!hostile });
  G.sfx('shoot', x, y, z);
};
function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (a.stuck > 0) { a.stuck -= dt; if (a.stuck <= 0) a.life = 0; }
    else {
      a.life -= dt; a.vy -= 16 * dt;
      const n = 4;
      for (let s = 0; s < n && !a.stuck && a.life > 0; s++) {
        a.x += a.vx * dt / n; a.y += a.vy * dt / n; a.z += a.vz * dt / n;
        if (SOLID[getB(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))]) { a.stuck = 20; G.sfx('place', a.x, a.y, a.z); break; }
        if (a.hostile) { const pl = P(); if (pl && pl.alive && Math.abs(a.x - pl.x) < .45 && a.y > pl.y - .1 && a.y < pl.y + 1.85 && Math.abs(a.z - pl.z) < .45) { G.hurtPlayer(a.dmg, a.x - a.vx, a.z - a.vz); a.life = 0; break; } }
        for (const e of entities) {
          if (e.kind !== 'mob' || e.dead) continue;
          if (a.hostile && !(e.type === 'villager' || e.type === 'golem')) continue;
          if (Math.abs(a.x - e.x) < e.w + .08 && a.y > e.y - .05 && a.y < e.y + e.h + .05 && Math.abs(a.z - e.z) < e.w + .08) {
            e.hurt = 0; G.damageEntity(e, a.dmg, a.vx, a.vz, !a.hostile); a.life = 0; a.stuck = 0; break;
          }
        }
      }
    }
    a.m.position.set(a.x, a.y, a.z);
    if (!a.stuck) a.m.lookAt(a.x + a.vx, a.y + a.vy, a.z + a.vz);
    if (a.life <= 0) { scene.remove(a.m); arrows.splice(i, 1); }
  }
}

/* ================= DVEŘE ================= */
const autoDoors = new Map();
G.setDoor = function (x, y, z, open, auto) {
  let id = getB(x, y, z);
  if (!W.isDoor(id)) return false;
  const by = ((id - 28) & 1) === 0 ? y : y - 1;
  const b = getB(x, by, z), t = getB(x, by + 1, z);
  if (!W.isDoor(b) || !W.isDoor(t)) return false;
  const isOpen = (b - 28) >= 4;
  if (isOpen === open) return false;
  const d = open ? 4 : -4;
  G.setBlock(x, by, z, b + d); G.setBlock(x, by + 1, z, t + d);
  G.sfx(open ? 'door_open' : 'door_close', x, by, z);
  if (auto && open) autoDoors.set(x + ',' + by + ',' + z, { x, y: by, z, t: 2.5 });
  return true;
};
G.toggleDoor = function (x, y, z) {
  const id = getB(x, y, z), by = ((id - 28) & 1) === 0 ? y : y - 1;
  const b = getB(x, by, z);
  autoDoors.delete(x + ',' + by + ',' + z);
  return G.setDoor(x, by, z, (b - 28) < 4, false);
};
function updateDoors(dt) {
  const p = P();
  for (const [k, d] of autoDoors) {
    let near = Math.hypot(p.x - (d.x + .5), p.z - (d.z + .5)) < 1.6 && Math.abs(p.y - d.y) < 2;
    if (!near) for (const e of entities) if (e.kind === 'mob' && e.type === 'villager' && Math.hypot(e.x - (d.x + .5), e.z - (d.z + .5)) < 1.7 && Math.abs(e.y - d.y) < 2) { near = true; break; }
    if (near) d.t = 2.5; else d.t -= dt;
    if (d.t <= 0) { G.setDoor(d.x, d.y, d.z, false, false); autoDoors.delete(k); }
  }
}

/* ================= MODELY ================= */
const T8 = (r, g, b, v, seed) => TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * v; return [r + k, g + k, b + k, 255]; }, seed);
const dark = [18, 18, 20];
function faceTex(base, fn, seed, v) {
  return TEX.make(8, 8, (x, y, rnd) => { const c = fn(x, y); if (c) return [c[0], c[1], c[2], 255]; const k = (rnd() - .5) * (v || 18); return [base[0] + k, base[1] + k, base[2] + k, 255]; }, seed);
}
const MODELS = {};
const ROBE = [[122, 84, 48], [70, 72, 80], [228, 222, 204], [236, 236, 238], [48, 70, 124], [196, 44, 40], [238, 240, 238], [44, 60, 108]];
const ROBE_D = [[96, 66, 36], [40, 40, 46], [190, 182, 160], [196, 60, 60], [34, 48, 90], [120, 28, 26], [58, 150, 96], [26, 34, 66]];
function buildTextures() {
  if (MODELS.ready) return;
  const M = MODELS;
  M.vSkin = T8(196, 146, 118, 14, 15);
  M.vFace = faceTex([196, 146, 118], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? ((x === 2 || x === 5) ? [50, 110, 60] : [235, 235, 235]) : (y === 2 && x >= 1 && x <= 6) ? [80, 55, 40] : null, 16);
  M.vSleep = faceTex([196, 146, 118], (x, y) => (y === 3 && x >= 1 && x <= 6) ? [60, 40, 30] : null, 17);
  M.vNose = T8(170, 120, 96, 12, 17);
  M.vRobe = ROBE.map((c, i) => T8(c[0], c[1], c[2], 16, 18 + i));
  M.vRobeD = ROBE_D.map((c, i) => T8(c[0], c[1], c[2], 12, 30 + i));
  M.hatStraw = T8(222, 192, 104, 22, 40); M.hatYellow = T8(236, 190, 40, 14, 41); M.hatGray = T8(140, 140, 150, 14, 42); M.lamp = T8(255, 230, 120, 10, 43); M.hatRed = T8(206, 40, 36, 14, 44); M.hatNavy = T8(34, 46, 92, 12, 45); M.hatWhite = T8(240, 240, 236, 8, 46); M.refl = T8(236, 214, 60, 10, 47);
  // golem
  M.gBody = TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * 22; const vine = (x + y * 3) % 11 === 0; return vine ? [70, 120, 60, 255] : [188 + k, 188 + k, 182 + k, 255]; }, 50);
  M.gFace = faceTex([188, 188, 182], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? [30, 30, 30] : (y === 2 && x >= 1 && x <= 6) ? [120, 120, 118] : null, 51);
  M.gNose = T8(150, 120, 100, 10, 52);
  // zvířata
  M.cowBody = TEX.make(8, 8, (x, y, rnd) => { const w = W.hash3(x >> 1, y >> 1, 4, 9) < .4; const k = (rnd() - .5) * 14; return w ? [236 + k, 232 + k, 228 + k, 255] : [86 + k, 56 + k, 38 + k, 255]; }, 60);
  M.cowFace = faceTex([86, 56, 38], (x, y) => (y === 3 && (x === 1 || x === 6)) ? dark : (y >= 5) ? [214, 170, 160] : (y === 6 && (x === 2 || x === 5)) ? [90, 60, 60] : null, 61);
  M.cowHead = T8(86, 56, 38, 16, 62); M.cowHorn = T8(230, 226, 210, 8, 63);
  M.pigBody = T8(240, 160, 156, 14, 64);
  M.pigFace = faceTex([240, 160, 156], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? ((x === 1 || x === 6) ? [255, 255, 255] : dark) : null, 65, 12);
  M.pigSnout = faceTex([226, 130, 128], (x, y) => (y === 3 && (x === 2 || x === 5)) ? [120, 50, 50] : null, 66, 8);
  M.wool = TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * 30; return [232 + k, 232 + k, 234 + k, 255]; }, 67);
  M.sheepFace = faceTex([214, 190, 160], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? ((x === 1 || x === 6) ? [240, 240, 240] : dark) : null, 68, 12);
  M.sheepSkin = T8(210, 186, 156, 12, 69);
  M.chBody = T8(246, 246, 244, 12, 70); M.chBeak = T8(240, 160, 30, 8, 71); M.chComb = T8(210, 40, 40, 8, 72); M.chLeg = T8(230, 150, 30, 8, 73);
  M.chFace = faceTex([246, 246, 244], (x, y) => (y === 3 && (x === 1 || x === 6)) ? dark : null, 74, 8);
  // pillager
  M.pSkin = T8(150, 160, 140, 14, 80);
  M.pFace = faceTex([150, 160, 140], (x, y) => (y === 2 && x >= 1 && x <= 6) ? [50, 50, 46] : (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? ((x === 2 || x === 5) ? [30, 30, 30] : [220, 220, 210]) : (y >= 4 && y <= 5 && (x === 3 || x === 4)) ? [120, 130, 110] : (y === 6 && x >= 2 && x <= 5) ? [60, 50, 50] : null, 81);
  M.pCoat = TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * 14; return (x === 3 || x === 4) ? [150 + k, 130 + k, 100 + k, 255] : [64 + k, 60 + k, 58 + k, 255]; }, 82);
  M.pPants = T8(50, 52, 60, 10, 83); M.pHat = T8(46, 44, 44, 10, 84);
  M.vCoat = TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * 14; return (x === 3 || x === 4) ? [150 + k, 40 + k, 40 + k, 255] : [62 + k, 90 + k, 66 + k, 255]; }, 88);
  M.axeHead = T8(190, 192, 202, 12, 89); M.axeHandle = T8(112, 82, 46, 12, 92);
  M.banner = TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * 10; return ((x + y) % 4 === 0 || y === 0 || y === 7) ? [30 + k, 30 + k, 42 + k, 255] : [150 + k, 28 + k, 28 + k, 255]; }, 93);
  M.ravBody = T8(98, 80, 70, 22, 94);
  M.ravFace = faceTex([104, 86, 74], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? [220, 40, 30] : (y >= 5 && x >= 2 && x <= 5) ? [60, 44, 40] : null, 95, 16);
  M.horn = T8(226, 220, 200, 10, 96);
  // zlý golem
  M.eBody = TEX.make(8, 8, (x, y, rnd) => { const k = (rnd() - .5) * 18; const vein = (x * 2 + y * 3) % 9 === 0; return vein ? [170, 30, 30, 255] : [72 + k, 72 + k, 78 + k, 255]; }, 85);
  M.eFace = faceTex([72, 72, 78], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? [240, 40, 30] : (y === 2 && x >= 1 && x <= 6) ? [30, 30, 34] : null, 86);
  M.eNose = T8(90, 60, 56, 10, 87);
  M.horseCoats = [[140, 90, 50], [236, 234, 228], [44, 40, 38], [176, 112, 60]].map((c, i) => ({ body: T8(c[0], c[1], c[2], 14, 100 + i), mane: T8(c[0] * .45, c[1] * .45, c[2] * .45, 10, 110 + i), face: faceTex([c[0], c[1], c[2]], (x, y) => (y === 3 && (x === 1 || x === 6)) ? [20, 20, 22] : (y >= 5 && y <= 6 && (x === 2 || x === 5)) ? [60, 40, 40] : null, 120 + i, 12) }));
  M.rabBody = T8(200, 180, 150, 22, 130); M.rabFace = faceTex([200, 180, 150], (x, y) => (y === 3 && (x === 1 || x === 6)) ? [30, 20, 20] : (y === 5 && (x === 3 || x === 4)) ? [220, 150, 140] : null, 131, 18); M.rabEar = T8(220, 190, 170, 12, 132);
  M.wolfBody = T8(176, 176, 176, 22, 140); M.wolfFace = faceTex([176, 176, 176], (x, y) => (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) ? ((x === 1 || x === 6) ? [30, 30, 30] : [210, 190, 80]) : (y === 5 && (x === 3 || x === 4)) ? [40, 40, 40] : null, 141, 16); M.wolfSnout = T8(210, 205, 200, 12, 142); M.collar = T8(210, 30, 30, 8, 143);
  M.cart = T8(150, 150, 160, 14, 90); M.cartD = T8(60, 60, 68, 10, 91);
  M.ready = true;
}
const matTexCache = new Map();
function golemMatTex(id) {
  if (matTexCache.has(id)) return matTexCache.get(id);
  const src = TEX.itemBuf(id), body = new Uint8ClampedArray(src), face = new Uint8ClampedArray(src), nose = new Uint8ClampedArray(src);
  const put = (buf, x, y, c) => { const i = (y * 16 + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; };
  for (let i = 0; i < nose.length; i += 4) { nose[i] *= .65; nose[i + 1] *= .65; nose[i + 2] *= .65; }
  for (let x = 2; x <= 13; x++) { put(face, x, 4, [28, 28, 32]); put(face, x, 5, [28, 28, 32]); }
  for (const ex of [3, 4, 10, 11]) for (const ey of [7, 8]) put(face, ex, ey, ey === 7 ? [240, 240, 235] : [20, 20, 24]);
  for (let x = 6; x <= 9; x++) put(face, x, 12, [40, 40, 44]);
  if (id === B.GLASS) for (const buf of [body, face, nose]) for (let i = 3; i < buf.length; i += 4) buf[i] = 190;
  const r = { trans: id === B.GLASS, body: TEX.dataTexture(body, 16, 16), face: TEX.dataTexture(face, 16, 16), nose: TEX.dataTexture(nose, 16, 16) };
  matTexCache.set(id, r); return r;
}
function mkBox(w, h, d, mats, pivotTop) {
  const g = new THREE.BoxGeometry(w, h, d); if (pivotTop) g.translate(0, -h / 2, 0);
  return new THREE.Mesh(g, mats);
}
function basic(e, tex) { const m = new THREE.MeshBasicMaterial({ map: tex }); e.mats.push(m); return m; }
function leg4(e, inner, mat, w, h, y, xs, zs) {
  e.legs = [];
  for (const x of xs) for (const z of zs) { const l = mkBox(w, h, w, mat, true); l.position.set(x, y, z); inner.add(l); e.legs.push(l); }
}

/* ---------- vesničanky: textury a model ---------- */
const FSKIN = [[212, 166, 136], [236, 198, 168], [158, 110, 82]];
const FHAIR = [[84, 52, 30], [222, 184, 96], [34, 26, 26], [164, 70, 36], [120, 82, 52]];
const FEYE = [[60, 130, 70], [64, 110, 180], [96, 64, 36]];
const FDRESS = [[102, 142, 80], [86, 88, 98], [208, 164, 76], [192, 74, 74], [64, 124, 134], [196, 44, 40], [238, 240, 238], [44, 60, 108]];
const FDRESSD = [[72, 106, 56], [58, 58, 66], [168, 124, 52], [226, 224, 220], [44, 92, 102], [120, 28, 26], [58, 150, 96], [26, 34, 66]];
const FTC = {};
function fTex(key, mk) { return FTC[key] || (FTC[key] = mk()); }
function fFace(si, ei, hi) {
  return fTex('face' + si + ei + hi, () => TEX.make(16, 16, (x, y, rnd) => {
    const sk = FSKIN[si], ey = FEYE[ei], hr = FHAIR[hi], k = (rnd() - .5) * 8;
    const lash = (xx) => (xx >= 3 && xx <= 5) || (xx >= 10 && xx <= 12);
    if (y === 5 && lash(x)) return [hr[0] * .8, hr[1] * .8, hr[2] * .8, 255];                    // obočí
    if (y === 4 && (x === 3 || x === 12)) return [hr[0] * .8, hr[1] * .8, hr[2] * .8, 255];
    if (y === 7 && lash(x)) return [40, 28, 28, 255];                                              // řasy
    if (y === 7 && (x === 2 || x === 13)) return [60, 44, 40, 255];
    if (y === 8 && lash(x)) { const c = (x === 4 || x === 11) ? ey : [244, 244, 244]; return [c[0], c[1], c[2], 255]; }
    if (y === 9 && lash(x)) return [sk[0] * .9, sk[1] * .82, sk[2] * .82, 255];                  // stín pod okem
    if (y === 10 && (x === 2 || x === 3 || x === 12 || x === 13)) return [Math.min(255, sk[0] + 14), sk[1] - 18, sk[2] - 12, 255]; // tváře
    if ((y === 9 || y === 10) && (x === 7 || x === 8)) return [sk[0] * .9, sk[1] * .86, sk[2] * .84, 255];                          // nos
    if (y === 12 && x >= 6 && x <= 9) return [186, 78, 90, 255];                                    // rty
    if (y === 11 && (x === 5 || x === 10)) return [sk[0] * .86, sk[1] * .6, sk[2] * .6, 255];                // koutky úst (úsměv)
    if (y === 12 && (x === 5 || x === 10)) return [sk[0] * .92, sk[1] * .8, sk[2] * .78, 255];
    return [sk[0] + k, sk[1] + k, sk[2] + k, 255];
  }, 120 + si * 7 + ei * 3 + hi));
}
const fSkinTex = (si) => fTex('skin' + si, () => TEX.make(8, 8, (x, y, r) => { const k = (r() - .5) * 12, c = FSKIN[si]; return [c[0] + k, c[1] + k, c[2] + k, 255]; }, 140 + si));
const fHairTex = (hi) => fTex('hair' + hi, () => TEX.make(16, 16, (x, y, r) => {
  const c = FHAIR[hi], k = Math.sin(x * 1.9 + Math.floor(y / 5) * 1.3) * 13 + (r() - .5) * 12 + (y < 3 ? 16 : y > 12 ? -8 : 0);
  return [Math.max(0, Math.min(255, c[0] + k)), Math.max(0, Math.min(255, c[1] + k * .9)), Math.max(0, Math.min(255, c[2] + k * .8)), 255];
}, 150 + hi));
const fCloth = (name, c, seed) => fTex(name, () => TEX.make(8, 8, (x, y, r) => { const k = (r() - .5) * 10 + ((x + y) & 1) * 6 - 3; return [c[0] + k, c[1] + k, c[2] + k, 255]; }, seed));
function buildFemale(e, inner, M, p) {
  const si = e.skinC | 0, ei = e.eyeC | 0, hi = e.hairC | 0, st = e.hairS | 0;
  const sk = basic(e, fSkinTex(si)), face = basic(e, fFace(si, ei, hi)), hair = basic(e, fHairTex(hi));
  const dress = basic(e, fCloth('dr' + p, FDRESS[p], 160 + p)), dressD = basic(e, fCloth('drd' + p, FDRESSD[p], 170 + p)), shoe = basic(e, fCloth('shoe', [66, 44, 30], 180));
  // hlava jako skupina, aby se vlasy otáčely s ní
  const headG = new THREE.Group(); headG.position.y = 1.62;
  const head = mkBox(.5, .62, .5, [sk, sk, sk, sk, face, sk]); headG.add(head);
  const nz = mkBox(.07, .1, .08, sk); nz.position.set(0, -.04, .27); headG.add(nz);
  const add = (w, h, d, x, y, z, m, rx) => { const b = mkBox(w, h, d, m || hair); b.position.set(x, y, z); if (rx) b.rotation.x = rx; headG.add(b); return b; };
  add(.55, .13, .55, 0, .3, -.01);                           // temeno
  add(.55, .1, .1, 0, .22, .23); add(.2, .1, .08, -.19, .2, .27); add(.2, .1, .08, .19, .2, .27); // ofina s pěšinkou
  add(.55, .5, .1, 0, .06, -.28);                            // vlasy vzadu
  add(.06, .3, .12, .28, .12, -.18); add(.06, .3, .12, -.28, .12, -.18);
  if (st === 0) { add(.5, .62, .09, 0, -.38, -.3); add(.08, .5, .1, .27, -.2, -.16); add(.08, .5, .1, -.27, -.2, -.16); }          // dlouhé
  else if (st === 1) { add(.13, .55, .12, 0, -.2, -.38, hair, .18); add(.17, .06, .15, 0, .06, -.36, basic(e, fCloth('tie' + p, FDRESSD[p], 190))); } // culík
  else if (st === 2) { add(.55, .3, .12, 0, -.14, -.28); add(.07, .34, .3, .29, -.05, -.06); add(.07, .34, .3, -.29, -.05, -.06); }  // delší bob
  else { add(.22, .2, .22, 0, .42, -.16); add(.26, .05, .26, 0, .35, -.16, basic(e, fCloth('tie' + p, FDRESSD[p], 190))); }          // drdol
  inner.add(headG);
  // tělo: živůtek, výstřih, pásek, sukně, zástěra, boty
  const bodice = mkBox(.46, .52, .3, dress); bodice.position.y = 1.2;
  const neck = mkBox(.18, .1, .04, sk); neck.position.set(0, 1.42, .14);
  const belt = mkBox(.48, .06, .32, dressD); belt.position.y = .97;
  const sk1 = mkBox(.56, .22, .38, dress); sk1.position.y = .8;
  const sk2 = mkBox(.66, .2, .46, dress); sk2.position.y = .6;
  const hem = mkBox(.68, .05, .48, dressD); hem.position.y = .48;
  inner.add(bodice, neck, belt, sk1, sk2, hem);
  const legL = mkBox(.17, .56, .2, sk, true), legR = mkBox(.17, .56, .2, sk, true);
  legL.position.set(.12, .56, 0); legR.position.set(-.12, .56, 0);
  const shL = mkBox(.19, .1, .28, shoe), shR = mkBox(.19, .1, .28, shoe); shL.position.set(0, -.5, .03); shR.position.set(0, -.5, .03);
  legL.add(shL); legR.add(shR);
  inner.add(legL, legR);
  e.legs = [legL, legR];
  // sepnuté ruce v rukávech
  const arms = mkBox(.66, .2, .24, dress); arms.position.set(0, 1.18, .2);
  const hands = mkBox(.18, .1, .1, sk); hands.position.set(0, 1.18, .33);
  const cuffL = mkBox(.08, .22, .26, dressD), cuffR = mkBox(.08, .22, .26, dressD); cuffL.position.set(.33, 1.18, .2); cuffR.position.set(-.33, 1.18, .2);
  inner.add(arms, hands, cuffL, cuffR);
  // doplňky povolání
  const sAp = basic(e, fCloth('ap' + p, p === 1 ? [118, 76, 44] : [236, 234, 228], 200 + p));
  if (p === 1 || p === 3 || p === 0) { const ap = mkBox(.44, .6, .03, sAp); ap.position.set(0, .86, .24); const bib = mkBox(.28, .2, .03, sAp); bib.position.set(0, 1.28, .17); inner.add(ap, bib); }
  const hat = (w, h, d, y, m) => { const b = mkBox(w, h, d, m); b.position.y = 1.62 + y; b.userData.hat = 1; inner.add(b); return b; };
  if (p === 0) { hat(.9, .05, .9, .42, basic(e, M.hatStraw)); hat(.52, .16, .52, .5, basic(e, M.hatStraw)); }
  if (p === 2) { hat(.62, .12, .62, .41, basic(e, M.hatYellow)); hat(.56, .14, .56, .5, basic(e, M.hatYellow)); }
  if (p === 4) { hat(.58, .14, .58, .43, basic(e, M.hatGray)); const l = mkBox(.14, .1, .06, basic(e, M.lamp)); l.position.set(0, 2.06, .32); inner.add(l); }
  if (p >= 5) {
    const hm = p === 5 ? M.hatRed : p === 6 ? M.hatWhite : M.hatNavy;
    hat(.62, .15, .62, .42, basic(e, hm));
    if (p === 5) hat(.7, .05, .7, .35, basic(e, hm));
    if (p === 7) { const br = mkBox(.6, .04, .2, basic(e, M.hatNavy)); br.position.set(0, 1.62 + .34, .35); br.userData.hat = 1; inner.add(br); }
    const st = mkBox(.5, .08, .32, basic(e, M.refl)); st.position.y = .98; inner.add(st);
    if (p === 6) { const cr = mkBox(.16, .16, .03, basic(e, M.hatRed)); cr.position.set(0, 1.25, .17); inner.add(cr); }
  }
  e.parts = { head: headG };
}
function makeModel(e) {
  buildTextures();
  const M = MODELS, g = new THREE.Group(); g.rotation.order = 'YXZ';
  e.mats = [];
  const inner = new THREE.Group();
  const t = e.type;
  if (t === 'villager' && e.fem) {
    buildFemale(e, inner, M, e.prof);
  } else if (t === 'villager') {
    const p = e.prof;
    const sk = basic(e, M.vSkin), face = basic(e, M.vFace), nose = basic(e, M.vNose), robe = basic(e, M.vRobe[p]), robeD = basic(e, M.vRobeD[p]);
    const head = mkBox(.5, .62, .5, [sk, sk, sk, sk, face, sk]); head.position.y = 1.62;
    const nz = mkBox(.12, .22, .12, nose); nz.position.set(0, 1.55, .3);
    const body = mkBox(.52, .8, .34, robe); body.position.y = 1.05;
    const legL = mkBox(.24, .66, .26, robeD, true), legR = mkBox(.24, .66, .26, robeD, true);
    legL.position.set(.13, .66, 0); legR.position.set(-.13, .66, 0);
    const arms = mkBox(.82, .24, .26, robeD); arms.position.set(0, 1.05, .22);
    inner.add(head, nz, body, legL, legR, arms);
    e.legs = [legL, legR];
    if (p === 0) { const a = mkBox(.9, .05, .9, basic(e, M.hatStraw)), b = mkBox(.52, .16, .52, basic(e, M.hatStraw)); a.position.y = 1.97; b.position.y = 2.05; inner.add(a, b); }
    if (p === 1) { const ap = mkBox(.44, .66, .03, basic(e, M.vRobeD[1])); ap.position.set(0, .9, .19); inner.add(ap); }
    if (p === 2) { const a = mkBox(.62, .12, .62, basic(e, M.hatYellow)), b = mkBox(.56, .14, .56, basic(e, M.hatYellow)); a.position.y = 1.96; b.position.y = 2.06; inner.add(a, b); }
    if (p === 3) { const ap = mkBox(.46, .7, .03, basic(e, M.vRobeD[3])); ap.position.set(0, .85, .19); inner.add(ap); }
    if (p === 4) { const a = mkBox(.58, .14, .58, basic(e, M.hatGray)); a.position.y = 1.98; const l = mkBox(.14, .1, .06, basic(e, M.lamp)); l.position.set(0, 2.0, .31); inner.add(a, l); }
    if (p >= 5) {
      const hm = p === 5 ? M.hatRed : p === 6 ? M.hatWhite : M.hatNavy;
      const a = mkBox(.6, .16, .6, basic(e, hm)); a.position.y = 1.99; inner.add(a);
      if (p === 7) { const br = mkBox(.6, .04, .2, basic(e, M.hatNavy)); br.position.set(0, 1.94, .35); inner.add(br); }
      if (p === 5) { const br = mkBox(.66, .05, .66, basic(e, M.hatRed)); br.position.y = 1.9; inner.add(br); }
      const st = mkBox(.54, .09, .36, basic(e, M.refl)); st.position.y = .95; inner.add(st);
      if (p === 6) { const cr = mkBox(.16, .16, .03, basic(e, M.hatRed)); cr.position.set(0, 1.2, .19); inner.add(cr); }
    }
    e.parts = { head };
  } else if (t === 'golem' || t === 'evilgolem') {
    const evil = t === 'evilgolem';
    const mt = (!evil && e.mat && e.mat !== B.IRON_BLOCK && golemInfo(e.mat)) ? golemMatTex(e.mat) : null;
    const gmats0 = e.mats.length;
    const bd = basic(e, mt ? mt.body : evil ? M.eBody : M.gBody), face = basic(e, mt ? mt.face : evil ? M.eFace : M.gFace), nose = basic(e, mt ? mt.nose : evil ? M.eNose : M.gNose);
    if (mt && mt.trans) for (let k = gmats0; k < e.mats.length; k++) { e.mats[k].transparent = true; e.mats[k].depthWrite = false; }
    const head = mkBox(.5, .55, .5, [bd, bd, bd, bd, face, bd]); head.position.set(0, 2.35, .05);
    const nz = mkBox(.14, .3, .14, nose); nz.position.set(0, 2.25, .38);
    const body = mkBox(1.1, .95, .6, bd); body.position.y = 1.75;
    const hip = mkBox(.62, .55, .4, bd); hip.position.y = 1.0;
    const armL = mkBox(.3, 1.45, .3, bd, true), armR = mkBox(.3, 1.45, .3, bd, true);
    armL.position.set(.7, 2.15, 0); armR.position.set(-.7, 2.15, 0);
    inner.add(head, nz, body, hip, armL, armR);
    leg4(e, inner, bd, .34, .85, .85, [.2, -.2], [0]);
    e.parts = { head, armL, armR };
  } else if (t === 'pillager' || t === 'vindicator') {
    const vind = t === 'vindicator';
    const sk = basic(e, M.pSkin), face = basic(e, M.pFace), coat = basic(e, vind ? M.vCoat : M.pCoat), pants = basic(e, M.pPants), hat = basic(e, M.pHat);
    const head = mkBox(.5, .5, .5, [sk, sk, hat, sk, face, sk]); head.position.y = 1.65;
    const cap = mkBox(.54, vind ? .1 : .14, .54, hat); cap.position.y = vind ? 1.9 : 1.93;
    const body = mkBox(.55, .72, .3, coat); body.position.y = 1.05;
    const armL = mkBox(.22, .7, .22, coat, true), armR = mkBox(.22, .7, .22, coat, true);
    armL.position.set(.4, 1.4, 0); armR.position.set(-.4, 1.4, 0);
    const legL = mkBox(.24, .7, .24, pants, true), legR = mkBox(.24, .7, .24, pants, true);
    legL.position.set(.13, .7, 0); legR.position.set(-.13, .7, 0);
    if (vind) {
      const hd = mkBox(.06, .62, .06, basic(e, M.axeHandle)); hd.position.set(0, -.62, .1);
      const ah = mkBox(.1, .26, .34, basic(e, M.axeHead)); ah.position.set(0, -.88, .22);
      armR.add(hd, ah);
    } else {
      const xb = mkBox(.1, .1, .6, hat); xb.position.set(0, -.62, .3); const xb2 = mkBox(.55, .06, .06, hat); xb2.position.set(0, -.62, .55);
      armR.add(xb, xb2);
    }
    inner.add(head, cap, body, armL, armR, legL, legR);
    if (e.captain) {
      const pole = mkBox(.06, 1.1, .06, basic(e, M.axeHandle)); pole.position.set(0, 1.6, -.24);
      const flag = mkBox(.46, .5, .04, basic(e, M.banner)); flag.position.set(0, 1.92, -.26);
      inner.add(pole, flag);
    }
    e.parts = { head, armL, armR, legL, legR };
    e.legs = [legL, legR];
  } else if (t === 'ravager') {
    const bd = basic(e, M.ravBody), face = basic(e, M.ravFace), horn = basic(e, M.horn);
    const body = mkBox(1.25, 1.05, 1.8, bd); body.position.set(0, 1.35, 0);
    const neck = mkBox(.6, .8, .6, bd); neck.position.set(0, 1.85, 1.0);
    const head = mkBox(.9, .8, .95, [bd, bd, bd, bd, face, bd]); head.position.set(0, 1.95, 1.5);
    const h1 = mkBox(.14, .6, .14, horn), h2 = mkBox(.14, .6, .14, horn); h1.position.set(.3, 2.5, 1.75); h2.position.set(-.3, 2.5, 1.75);
    h1.rotation.x = -.5; h2.rotation.x = -.5;
    const rm = mkBox(.4, .5, .6, bd); rm.position.set(0, 2.1, .1);
    inner.add(body, neck, head, h1, h2, rm);
    leg4(e, inner, bd, .4, .95, .95, [.45, -.45], [.65, -.65]);
    e.parts = { head };
  } else if (t === 'horse') {
    const co = M.horseCoats[(e.coat || 0) % 4], bd = basic(e, co.body), mn = basic(e, co.mane), face = basic(e, co.face);
    const body = mkBox(.72, .78, 1.4, bd); body.position.set(0, 1.12, 0);
    const neck = mkBox(.34, .8, .34, bd); neck.position.set(0, 1.6, .62);
    const head = mkBox(.34, .4, .72, [bd, bd, bd, bd, face, bd]); head.position.set(0, 1.98, .92);
    const mane = mkBox(.1, .8, .2, mn); mane.position.set(0, 1.62, .45);
    const tail = mkBox(.1, .6, .12, mn, true); tail.position.set(0, 1.4, -.72); tail.rotation.x = .3;
    const ear1 = mkBox(.08, .16, .08, bd), ear2 = mkBox(.08, .16, .08, bd); ear1.position.set(.1, 2.26, .7); ear2.position.set(-.1, 2.26, .7);
    inner.add(body, neck, head, mane, tail, ear1, ear2);
    leg4(e, inner, mn, .22, .8, .8, [.25, -.25], [.52, -.52]);
    e.parts = { head };
  } else if (t === 'rabbit') {
    const bd = basic(e, M.rabBody), face = basic(e, M.rabFace), ear = basic(e, M.rabEar);
    const body = mkBox(.32, .3, .5, bd); body.position.set(0, .3, 0);
    const head = mkBox(.26, .24, .26, [bd, bd, bd, bd, face, bd]); head.position.set(0, .44, .3);
    const e1 = mkBox(.07, .24, .05, ear), e2 = mkBox(.07, .24, .05, ear); e1.position.set(.07, .68, .28); e2.position.set(-.07, .68, .28);
    const tl = mkBox(.1, .1, .1, ear); tl.position.set(0, .34, -.3);
    inner.add(body, head, e1, e2, tl);
    leg4(e, inner, bd, .1, .18, .18, [.1, -.1], [.18, -.18]);
    e.parts = { head };
  } else if (t === 'wolf') {
    const bd = basic(e, M.wolfBody), face = basic(e, M.wolfFace), sn = basic(e, M.wolfSnout), cl = basic(e, M.collar);
    const body = mkBox(.42, .42, .85, bd); body.position.set(0, .65, 0);
    const head = mkBox(.36, .34, .34, [bd, bd, bd, bd, face, bd]); head.position.set(0, .86, .55);
    const snout = mkBox(.18, .14, .22, sn); snout.position.set(0, .8, .8);
    const e1 = mkBox(.1, .14, .06, bd), e2 = mkBox(.1, .14, .06, bd); e1.position.set(.12, 1.08, .55); e2.position.set(-.12, 1.08, .55);
    const tail = mkBox(.1, .1, .45, bd); tail.position.set(0, .82, -.62); tail.rotation.x = -.5;
    inner.add(body, head, snout, e1, e2, tail);
    e.collar = mkBox(.4, .12, .12, cl); e.collar.position.set(0, .8, .38); e.collar.visible = !!e.owner; inner.add(e.collar);
    leg4(e, inner, bd, .13, .46, .46, [.14, -.14], [.3, -.3]);
    e.parts = { head };
  } else if (t === 'tnt') {
    if (!M.tntSide) { M.tntSide = TEX.dataTexture(TEX.itemBuf(B.TNT), 16, 16); const tp = new Uint8ClampedArray(TEX.itemBuf(B.TNT)); M.tntTop = TEX.dataTexture(tp, 16, 16); }
    const sm = basic(e, M.tntSide), tm = basic(e, M.tntSide);
    const box = mkBox(.98, .98, .98, [sm, sm, tm, tm, sm, sm]); box.position.y = .49;
    inner.add(box); e.parts = { head: box };
  } else if (t === 'car') {
    const col = e.carCol || [200, 40, 40], vt = e.vtype || 'car';
    const key = 'car' + col.join('_');
    if (!M[key]) M[key] = T8(col[0], col[1], col[2], 10, 200 + col[0] + col[1]);
    if (!M.carGlass) { M.carGlass = T8(40, 52, 70, 8, 201); M.carDark = T8(24, 24, 28, 6, 202); M.carHead = T8(250, 240, 170, 6, 203); M.carTail = T8(200, 30, 30, 6, 204); M.carWhite = T8(235, 235, 235, 8, 205); M.carRed = T8(200, 36, 36, 8, 206); M.carBlue = T8(40, 80, 190, 8, 207); M.carGrey = T8(150, 152, 160, 8, 208); }
    const body = basic(e, M[key]), glass = basic(e, M.carGlass), dk = basic(e, M.carDark), hd = basic(e, M.carHead), tl = basic(e, M.carTail), wh = basic(e, M.carWhite), rd = basic(e, M.carRed), bl = basic(e, M.carBlue), gr = basic(e, M.carGrey);
    const add = (w, h, d, mat, x, y, z) => { const b = mkBox(w, h, d, mat); b.position.set(x, y + h / 2, z); inner.add(b); return b; };
    const L = vt === 'fire' ? 4.2 : vt === 'ambulance' ? 3.4 : 3.0, hl = L / 2;
    for (const sx of [-1, 1]) for (const z of (vt === 'fire' ? [-1.3, -.3, 1.3] : [-hl + .75, hl - .75])) add(.2, .52, .52, dk, sx * .72, 0, z);
    e.lightMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    if (vt === 'fire') {
      add(1.5, .8, L, rd, 0, .3, 0); add(1.52, .12, L * .9, wh, 0, .62, 0);
      add(1.4, .7, 1.2, [glass, glass, rd, rd, glass, glass], 0, 1.1, hl - 1.0);
      add(1.2, .1, 2.0, gr, 0, 1.1, -.9); add(.12, .1, 2.2, gr, .35, 1.2, -.9); add(.12, .1, 2.2, gr, -.35, 1.2, -.9);
      for (let i = 0; i < 6; i++) add(.7, .05, .06, gr, 0, 1.22, -1.9 + i * .35);
      add(.8, .12, .22, e.lightMat, 0, 1.8, hl - 1.0);
    } else if (vt === 'ambulance') {
      add(1.5, .7, L, wh, 0, .3, 0); add(1.52, .16, L * .85, rd, 0, .55, 0);
      add(1.45, .85, 1.1, [glass, glass, wh, wh, glass, glass], 0, 1.0, hl - .9);
      add(1.45, .9, 1.9, wh, 0, 1.0, -.55); add(.5, .16, .04, rd, 0, 1.5, -.95).position.x = 0; add(.16, .5, .04, rd, 0, 1.33, -.95);
      add(.9, .12, .24, e.lightMat, 0, 1.9, hl - 1.0);
    } else if (vt === 'police') {
      add(1.4, .5, L, bl, 0, .25, 0); add(1.42, .18, L * .9, wh, 0, .5, 0);
      add(1.3, .48, 1.6, [glass, glass, wh, wh, glass, glass], 0, .75, -.1);
      add(.7, .12, .22, e.lightMat, 0, 1.23, -.1);
    } else {
      add(1.4, .5, L, body, 0, .25, 0);
      add(1.3, .48, 1.6, [glass, glass, body, body, glass, glass], 0, .75, -.15);
    }
    add(.3, .16, .05, hd, -.45, .45, hl + .01); add(.3, .16, .05, hd, .45, .45, hl + .01);
    add(.3, .16, .05, tl, -.45, .45, -hl - .01); add(.3, .16, .05, tl, .45, .45, -hl - .01);
    e.parts = { head: null };
  } else if (t === 'cart') {
    const m = basic(e, M.cart), d = basic(e, M.cartD);
    const fl = mkBox(.9, .08, 1.15, m); fl.position.y = .24;
    const s1 = mkBox(.08, .36, 1.15, m), s2 = mkBox(.08, .36, 1.15, m), s3 = mkBox(.9, .36, .08, m), s4 = mkBox(.9, .36, .08, m);
    s1.position.set(.46, .42, 0); s2.position.set(-.46, .42, 0); s3.position.set(0, .42, .54); s4.position.set(0, .42, -.54);
    inner.add(fl, s1, s2, s3, s4);
    for (const [x, z] of [[.4, .38], [-.4, .38], [.4, -.38], [-.4, -.38]]) { const w = mkBox(.1, .2, .2, d); w.position.set(x, .1, z); inner.add(w); }
    e.parts = { head: fl };
  } else if (t === 'cow') {
    const bd = basic(e, M.cowBody), hd = basic(e, M.cowHead), face = basic(e, M.cowFace), horn = basic(e, M.cowHorn);
    const body = mkBox(.72, .64, 1.1, bd); body.position.set(0, .88, 0);
    const head = mkBox(.46, .46, .44, [hd, hd, hd, hd, face, hd]); head.position.set(0, 1.12, .72);
    const h1 = mkBox(.07, .16, .07, horn), h2 = mkBox(.07, .16, .07, horn); h1.position.set(.2, 1.42, .66); h2.position.set(-.2, 1.42, .66);
    inner.add(body, head, h1, h2);
    leg4(e, inner, hd, .2, .56, .56, [.22, -.22], [.4, -.4]);
    e.parts = { head };
  } else if (t === 'pig') {
    const bd = basic(e, M.pigBody), face = basic(e, M.pigFace), sn = basic(e, M.pigSnout);
    const body = mkBox(.62, .52, .92, bd); body.position.set(0, .6, 0);
    const head = mkBox(.5, .46, .46, [bd, bd, bd, bd, face, bd]); head.position.set(0, .72, .62);
    const snout = mkBox(.26, .18, .1, sn); snout.position.set(0, .66, .88);
    inner.add(body, head, snout);
    leg4(e, inner, bd, .2, .34, .34, [.2, -.2], [.3, -.3]);
    e.parts = { head };
  } else if (t === 'sheep') {
    const wl = basic(e, M.wool), sk = basic(e, M.sheepSkin), face = basic(e, M.sheepFace);
    const body = mkBox(.82, .7, 1.05, wl); body.position.set(0, .93, 0);
    const head = mkBox(.4, .42, .42, [sk, sk, sk, sk, face, sk]); head.position.set(0, 1.08, .7);
    const cap = mkBox(.44, .16, .46, wl); cap.position.set(0, 1.34, .66);
    inner.add(body, head, cap);
    leg4(e, inner, sk, .18, .66, .66, [.2, -.2], [.35, -.35]);
    e.parts = { head };
  } else if (t === 'chicken') {
    const bd = basic(e, M.chBody), face = basic(e, M.chFace), beak = basic(e, M.chBeak), comb = basic(e, M.chComb), lg = basic(e, M.chLeg);
    const body = mkBox(.36, .34, .52, bd); body.position.set(0, .42, 0);
    const head = mkBox(.2, .3, .2, [bd, bd, bd, bd, face, bd]); head.position.set(0, .66, .3);
    const bk = mkBox(.1, .06, .1, beak); bk.position.set(0, .62, .43);
    const cm = mkBox(.05, .1, .12, comb); cm.position.set(0, .84, .3);
    const wl = mkBox(.04, .22, .3, bd, true), wr = mkBox(.04, .22, .3, bd, true); wl.position.set(.2, .52, 0); wr.position.set(-.2, .52, 0);
    inner.add(body, head, bk, cm, wl, wr);
    leg4(e, inner, lg, .06, .26, .26, [.08, -.08], [0]);
    e.wings = [wl, wr]; e.parts = { head };
  }
  g.add(inner);
  e.group = g;
  g.scale.setScalar(e.scale || 1);
  return g;
}

/* ================= MOBY ================= */
const STATS = {
  villager: { hp: 20, w: .3, h: 1.85, speed: 1.4, animal: false, sound: 'villager', name: 'Vesničan' },
  golem: { hp: 100, w: .7, h: 2.7, speed: 1.1, animal: false, sound: 'golem', name: 'Železný golem' },
  pillager: { hp: 24, w: .3, h: 1.9, speed: 2.6, animal: false, hostile: true, sound: 'pillager', name: 'Pillager' },
  vindicator: { hp: 28, w: .3, h: 1.9, speed: 3.1, animal: false, hostile: true, sound: 'pillager', name: 'Vindikátor' },
  ravager: { hp: 110, w: .9, h: 2.0, speed: 3.2, animal: false, hostile: true, sound: 'golem', name: 'Pustošník' },
  evilgolem: { hp: 90, w: .7, h: 2.7, speed: 2.9, animal: false, hostile: true, sound: 'golem', name: 'Zlý golem' },
  tnt: { hp: 100, w: .49, h: .98, speed: 0, animal: false, hostile: false, sound: null, name: 'Zapálené TNT' },
  cart: { hp: 8, w: .5, h: .7, speed: 0, animal: false, hostile: false, sound: null, name: 'Vozík' },
  car: { hp: 1e9, w: .85, h: 1.35, speed: 0, animal: false, hostile: false, sound: null, name: 'Auto' },
  horse: { hp: 24, w: .6, h: 1.6, speed: 1.8, animal: true, sound: 'horse', name: 'Kůň' },
  rabbit: { hp: 3, w: .2, h: .5, speed: 1.8, animal: true, sound: 'rabbit', name: 'Králík' },
  wolf: { hp: 16, w: .35, h: .85, speed: 2.6, animal: true, sound: 'wolf', name: 'Vlk' },
  cow: { hp: 10, w: .45, h: 1.4, speed: 1.3, animal: true, sound: 'cow', name: 'Kráva' },
  pig: { hp: 10, w: .4, h: .9, speed: 1.3, animal: true, sound: 'pig', name: 'Prase' },
  sheep: { hp: 8, w: .4, h: 1.25, speed: 1.3, animal: true, sound: 'sheep', name: 'Ovce' },
  chicken: { hp: 4, w: .2, h: .7, speed: 1.4, animal: true, sound: 'chicken', name: 'Kuře' }
};
G.STATS = STATS;
// materiály golemů: id bloku -> název, životy, zranění, rychlost, kořist
const GOLEM_MATS = {
  [B.IRON_BLOCK]: { name: 'Železný golem', hp: 100, dmg: 20, spd: 1, drop: [I.IRON, 3, 5] },
  [B.GOLD_BLOCK]: { name: 'Zlatý golem', hp: 70, dmg: 14, spd: 1.35, drop: [I.GOLD, 3, 5] },
  [B.DIAMOND_BLOCK]: { name: 'Diamantový golem', hp: 170, dmg: 28, spd: 1.1, drop: [I.DIAMOND, 2, 3] },
  [B.EMERALD_BLOCK]: { name: 'Smaragdový golem', hp: 130, dmg: 22, spd: 1.15, drop: [I.EMERALD, 3, 5] },
  [B.COBBLE]: { name: 'Kamenný golem', hp: 90, dmg: 16, spd: .95, drop: [B.COBBLE, 3, 6] },
  [B.STONE_BRICKS]: { name: 'Golem z kamenných cihel', hp: 105, dmg: 17, spd: .95, drop: [B.STONE_BRICKS, 3, 5] },
  [B.PLANKS]: { name: 'Dřevěný golem', hp: 55, dmg: 10, spd: 1.2, drop: [B.PLANKS, 3, 6] },
  [B.OBSIDIAN]: { name: 'Obsidiánový golem', hp: 240, dmg: 34, spd: .75, drop: [B.OBSIDIAN, 1, 2] },
  [B.SNOW]: { name: 'Sněhový golem', hp: 24, dmg: 5, spd: 1.5, drop: [B.SNOW, 3, 6] },
  [B.SANDSTONE]: { name: 'Pískovcový golem', hp: 75, dmg: 12, spd: 1.05, drop: [B.SANDSTONE, 3, 5] },
  [B.BRICKS]: { name: 'Cihlový golem', hp: 95, dmg: 16, spd: .95, drop: [B.BRICKS, 3, 5] },
  [B.HAY]: { name: 'Slaměný golem', hp: 40, dmg: 7, spd: 1.2, drop: [B.HAY, 2, 4] },
  [B.WOOL]: { name: 'Vlněný golem', hp: 32, dmg: 5, spd: 1.3, drop: [B.WOOL, 3, 5] },
  [B.GLOWSTONE]: { name: 'Svítící golem', hp: 80, dmg: 15, spd: 1.1, drop: [B.GLOWSTONE, 2, 4] },
  [B.GRANITE]: { name: 'Žulový golem', hp: 95, dmg: 16, spd: .95, drop: [B.GRANITE, 3, 5] },
  [B.DEEPSLATE]: { name: 'Břidlicový golem', hp: 140, dmg: 22, spd: .85, drop: [B.DEEPSLATE, 3, 5] },
  [B.TNT]: { name: 'TNT golem', hp: 36, dmg: 12, spd: 1.35, drop: [B.TNT, 1, 2] },
  [B.DIRT]: { name: 'Hliněný golem', hp: 28, dmg: 5, spd: 1.2, drop: [B.DIRT, 3, 6] },
  [B.GLASS]: { name: 'Skleněný golem', hp: 14, dmg: 16, spd: 1.4, drop: [B.GLASS, 1, 3] },
  [B.SAND]: { name: 'Písečný golem', hp: 34, dmg: 6, spd: 1.2, drop: [B.SAND, 3, 6] },
  [B.GRAVEL]: { name: 'Štěrkový golem', hp: 48, dmg: 9, spd: 1.05, drop: [B.GRAVEL, 3, 6] },
  [B.LOG]: { name: 'Klacový golem', hp: 62, dmg: 12, spd: 1.1, drop: [B.LOG, 2, 4] },
  [B.GRASS]: { name: 'Trávový golem', hp: 40, dmg: 7, spd: 1.2, drop: [B.DIRT, 2, 4] },
  [B.CACTUS]: { name: 'Kaktusový golem', hp: 52, dmg: 13, spd: 1.1, drop: [B.CACTUS, 2, 4] }
};
// libovolný plný blok dá golema; nezadané materiály dostanou hodnoty podle tvrdosti
function golemInfo(id) {
  if (GOLEM_MATS[id]) return GOLEM_MATS[id];
  const d = BL[id];
  if (!d || id === 0 || id === B.BEDROCK || id === B.PUMPKIN || d.cross || d.custom || W.isWater(id) || W.isLava(id) || !(d.solid || id === B.GLASS)) return null;
  const h = d.hard > 0 ? d.hard : 2;
  return (GOLEM_MATS[id] = { name: 'Golem: ' + d.name, hp: Math.round(20 + h * 28), dmg: Math.round(4 + h * 4), spd: Math.max(.8, 1.4 - h * .1), drop: [id, 2, 4] });
}
G.golemInfo = golemInfo;
G.GOLEM_MATS = GOLEM_MATS;
const PROFS = ['Farmář', 'Kovář', 'Stavitel', 'Řezník', 'Horník', 'Hasič', 'Záchranář', 'Strážník'];
const PROFS_F = ['Farmářka', 'Kovářka', 'Stavitelka', 'Řeznice', 'Horníčka', 'Hasička', 'Záchranářka', 'Strážnice'];
G.PROFS = PROFS; G.PROFS_F = PROFS_F;
G.mobName = (e) => e.cname ? e.cname : e.type === 'wolf' && e.owner ? 'Ochočený vlk' : e.type === 'villager' && e.child ? (e.fem ? 'Holčička' : 'Chlapeček') : e.type === 'villager' ? (e.fem ? PROFS_F : PROFS)[e.prof] : (e.type === 'golem' && e.mat && golemInfo(e.mat)) ? golemInfo(e.mat).name : STATS[e.type].name;
G.spawnMob = function (type, x, y, z, extra) {
  const st = STATS[type];
  const e = Object.assign({ kind: 'mob', type, x, y, z, vx: 0, vy: 0, vz: 0, w: st.w, h: st.h, hp: st.hp, maxhp: st.hp, speed: st.speed, animal: st.animal, hostile: !!st.hostile, step: true,
    yaw: rand() * 6.28, hurt: 0, cd: 1, wander: 0, wx: x, wz: z, snd: rr(3, 9), phase: rand() * 6, anger: 0, prof: 0, scale: 1, flee: 0, stuckT: 0, jumpCd: 0 }, extra || {});
  if (type === 'villager') { if (e.fem === undefined) e.fem = rand() < .5; if (e.hairC === undefined) e.hairC = Math.floor(rand() * 5); if (e.hairS === undefined) e.hairS = Math.floor(rand() * 4); if (e.skinC === undefined) e.skinC = Math.floor(rand() * 3); if (e.eyeC === undefined) e.eyeC = Math.floor(rand() * 3); }
  if (type === 'golem' && e.mat && golemInfo(e.mat)) { const m = golemInfo(e.mat); e.hp = e.maxhp = m.hp; e.dmg = m.dmg; e.speed = st.speed * m.spd; }
  makeModel(e);
  e.group.position.set(x, y, z); scene.add(e.group);
  entities.push(e);
  return e;
};
G.summonGolems = function (x, z, n) {
  let count = 0; for (const o of entities) if (o.type === 'golem' && !o.dead && Math.hypot(o.x - x, o.z - z) < 60) count++;
  for (let i = 0; i < n && count < 3; i++) {
    for (let at = 0; at < 8; at++) {
      const a = rand() * 6.28, d = rr(4, 8), gx = x + Math.cos(a) * d, gz = z + Math.sin(a) * d;
      if (!G.isLoaded(Math.floor(gx), Math.floor(gz))) continue;
      const top = G.topY(Math.floor(gx), Math.floor(gz));
      if (top < 1 || SOLID[getB(Math.floor(gx), top + 1, Math.floor(gz))]) continue;
      G.spawnMob('golem', gx, top + 1.02, gz, { anger: 60 }); G.burst(gx, top + 1.5, gz, [190, 190, 184], 14, 3); G.sfx('golem', gx, top, gz); count++; break;
    }
  }
};
G.alertGolems = function (x, z) {
  for (const o of entities) if (o.type === 'golem' && !o.owner && Math.hypot(o.x - x, o.z - z) < 40) o.anger = 40;
};
G.damageEntity = function (e, amt, kx, kz, byPlayer) {
  if (e.type === 'car') return;
  if (e.dead || (e.hurt > .3 && !byPlayer)) return;
  e.hp -= amt; e.hurt = .4;
  const d = Math.hypot(kx, kz) || 1;
  e.vx = kx / d * 6; e.vz = kz / d * 6; e.vy = 5;
  e.sleeping = false;
  if (e.type === 'villager') {
    e.flee = 6; e.fleeX = -kx; e.fleeZ = -kz; G.sfx('villager', e.x, e.y, e.z);
    if (byPlayer) { G.alertGolems(e.x, e.z); let near = false; for (const o of entities) if (o.type === 'golem' && !o.dead && Math.hypot(o.x - e.x, o.z - e.z) < 40) near = true; if (!near) G.summonGolems(e.x, e.z, 1); }
  }
  else if (e.type === 'wolf') { G.sfx('wolf', e.x, e.y, e.z); if (byPlayer && !e.owner) e.anger = 30; }
  else if (e.animal) { e.flee = 5; e.fleeX = kx; e.fleeZ = kz; G.sfx(STATS[e.type].sound, e.x, e.y, e.z); }
  else { G.sfx('hit', e.x, e.y, e.z); if (e.type === 'golem' && byPlayer && !e.owner) e.anger = 40; }
  if (byPlayer && e.type === 'villager') G.socialHit(e, e.hp <= 0);
  if (e.hp <= 0) killMob(e, byPlayer);
};
function killMob(e, byPlayer) {
  e.dead = true;
  if (e.type === 'golem' && e.mat === B.TNT) { G.explode(e.x, e.y + 1.2, e.z, 4.6); return; }
  if (byPlayer && (e.type === 'pillager' || e.type === 'vindicator' || e.type === 'ravager' || e.type === 'evilgolem')) G.socialDefend(e);
  if (e.spouse && G.family && G.family.sp) { G.family.sp.dead = true; G.msg('Tvůj manžel/ka zemřel(a).', 4000); }
  if (e.famKid && G.family) { const i = G.family.kids.findIndex(k => k.name === e.name); if (i >= 0) G.family.kids.splice(i, 1); }
  if (e.captain) { G.msg('Kapitán nájezdníků padl!', 2500); if (rand() < .9) G.dropItem(e.x, e.y + .5, e.z, I.EMERALD, 3); }
  if (byPlayer && (e.type === 'golem' || e.type === 'villager')) { G.alertGolems(e.x, e.z); G.summonGolems(e.x, e.z, 1); }
  const c = { villager: [196, 146, 118], golem: [190, 190, 184], vindicator: [90, 120, 94], ravager: [98, 80, 70], horse: [140, 90, 50], rabbit: [200, 180, 150], wolf: [170, 170, 170], tnt: [200, 40, 30], cart: [150, 150, 160], car: [150, 150, 160], pillager: [150, 160, 140], evilgolem: [80, 80, 86], cow: [90, 60, 40], pig: [240, 160, 156], sheep: [235, 235, 235], chicken: [245, 245, 245] }[e.type];
  G.burst(e.x, e.y + e.h / 2, e.z, c, 14, 3.5);
  const n = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const drop = (id, cnt) => { if (cnt > 0) G.dropItem(e.x, e.y + .5, e.z, id, cnt); };
  if (e.type === 'cow') { drop(I.BEEF, n(1, 3)); if (rand() < .8) drop(I.LEATHER, n(1, 2)); }
  else if (e.type === 'pig') drop(I.PORK, n(1, 3));
  else if (e.type === 'sheep') drop(B.WOOL, n(1, 2));
  else if (e.type === 'chicken') { drop(I.CHICKEN, 1); if (rand() < .6) drop(I.FEATHER, n(1, 2)); }
  else if (e.type === 'golem') { const gi = e.mat && golemInfo(e.mat), dm = gi ? gi.drop : [I.IRON, 3, 5]; drop(dm[0], n(dm[1], dm[2])); }
  else if (e.type === 'villager') drop(I.EMERALD, n(1, 3));
  else if (e.type === 'cart') drop(I.MINECART, 1);
  else if (e.type === 'horse') { if (rand() < .7) drop(I.LEATHER, n(1, 2)); }
  else if (e.type === 'rabbit') drop(I.RABBIT, 1);
  else if (e.type === 'vindicator') { drop(I.EMERALD, n(0, 2)); if (rand() < .1) drop(I.AXE_I, 1); if (rand() < .3) drop(I.IRON, 1); }
  else if (e.type === 'ravager') { drop(I.LEATHER, n(1, 3)); drop(I.EMERALD, n(2, 4)); }
  else if (e.type === 'pillager') { if (rand() < .5) drop(I.EMERALD, 1); if (rand() < .6) drop(I.ARROW, n(1, 3)); if (rand() < .06) drop(I.CROSSBOW, 1); }
  else if (e.type === 'evilgolem') { drop(I.IRON, n(2, 4)); if (rand() < .2) drop(I.DIAMOND, 1); drop(I.EMERALD, n(1, 2)); }
}

G.touchCactus = function (e) {
  const x0 = Math.floor(e.x - e.w - .1), x1 = Math.floor(e.x + e.w + .1), z0 = Math.floor(e.z - e.w - .1), z1 = Math.floor(e.z + e.w + .1);
  for (let y = Math.floor(e.y); y <= Math.floor(e.y + e.h - .1); y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (getB(x, y, z) === B.CACTUS) return true;
  return false;
};
function exposed(e) { return G.skyExposed(Math.floor(e.x), Math.floor(e.y + e.h * .5), Math.floor(e.z)); }
const _pr = { x: 0, y: 0, z: 0, w: 0, h: 0 };
function probeHit(e, a, dist, up) { _pr.x = e.x + Math.sin(a) * dist; _pr.z = e.z + Math.cos(a) * dist; _pr.y = e.y + up + .02; _pr.w = e.w; _pr.h = e.h; return collides(_pr); }
// 0 = zeď, 1 = volno (i schod), 2 = nutný skok
function pathClass(e, a) {
  if (!probeHit(e, a, .85, 0) && !probeHit(e, a, .45, 0)) return 1;
  if (e.type === 'villager') { const fy = Math.floor(e.y + .1), x = Math.floor(e.x + Math.sin(a) * .85), z = Math.floor(e.z + Math.cos(a) * .85); if (W.isDoor(getB(x, fy, z)) || W.isDoor(getB(x, fy + 1, z))) return 1; }
  if (!probeHit(e, a, .85, .62) && !probeHit(e, a, .45, .62)) return 1;
  if (!probeHit(e, a, .85, 1.1) && !probeHit(e, a, .5, 1.1)) return 2;
  return 0;
}
/* ---- A* po blocích (jen když to lokální obcházení nezvládne) ---- */
const clearCell = (x, y, z) => { const id = getB(x, y, z); return !SOLID[id] || W.isDoor(id); };
function standAt(x, z, y) { // y = úroveň chodidel
  for (const yy of [y + 1, y, y - 1, y - 2]) {
    const sup = getB(x, yy - 1, z);
    if (!SOLID[sup] || W.isDoor(sup)) continue;
    if (!clearCell(x, yy, z) || !clearCell(x, yy + 1, z)) continue;
    if (W.isWater(getB(x, yy, z)) || W.isLava(getB(x, yy, z)) || W.isLava(getB(x, yy - 1, z))) continue;
    if (yy > y && !clearCell(x, y + 2, z)) continue; // místo na skok
    return yy;
  }
  return null;
}
function findPath(e, tx, tz) {
  const sx = Math.floor(e.x), sz = Math.floor(e.z), sy = Math.floor(e.y + .05), gx = Math.floor(tx), gz = Math.floor(tz);
  const key = (x, y, z) => ((x - sx + 64) * 128 + (z - sz + 64)) * 64 + (y - sy + 32);
  const open = [], best = new Map(), from = new Map();
  const push = (n) => { open.push(n); let i = open.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (open[q].f <= open[i].f) break; [open[q], open[i]] = [open[i], open[q]]; i = q; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (; ;) { let l = i * 2 + 1, r = l + 1, m = i; if (l < open.length && open[l].f < open[m].f) m = l; if (r < open.length && open[r].f < open[m].f) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
  const h = (x, z) => Math.hypot(x - gx, z - gz);
  best.set(key(sx, sy, sz), 0); push({ x: sx, y: sy, z: sz, g: 0, f: h(sx, sz) });
  let it = 0, goal = null, nearest = null, nd = 1e9;
  while (open.length && it++ < 2200) {
    const n = pop();
    if (n.g > best.get(key(n.x, n.y, n.z)) + 1e-9) continue;
    const dh = h(n.x, n.z); if (dh < nd) { nd = dh; nearest = n; }
    if (dh < 1.1 && Math.abs(n.y - Math.floor(e.y + .05)) < 6) { goal = n; break; }
    for (let k = 0; k < 8; k++) {
      const dx = k < 4 ? [1, -1, 0, 0][k] : [1, 1, -1, -1][k - 4], dz = k < 4 ? [0, 0, 1, -1][k] : [1, -1, 1, -1][k - 4];
      const nx = n.x + dx, nz = n.z + dz;
      if (Math.abs(nx - sx) > 60 || Math.abs(nz - sz) > 60 || !G.isLoaded(nx, nz)) continue;
      if (k >= 4 && (!clearCell(n.x + dx, n.y, n.z) || !clearCell(n.x, n.y, n.z + dz) || !clearCell(n.x + dx, n.y + 1, n.z) || !clearCell(n.x, n.y + 1, n.z + dz))) continue;
      const ny = standAt(nx, nz, n.y); if (ny === null) continue;
      if (ny - sy > 2 || sy - ny > 3) continue; // žádné lezení po střechách
      const g = n.g + (k < 4 ? 1 : 1.42) + (ny !== n.y ? .6 : 0);
      const kk = key(nx, ny, nz); if (best.has(kk) && best.get(kk) <= g) continue;
      best.set(kk, g); from.set(kk, n); push({ x: nx, y: ny, z: nz, g, f: g + h(nx, nz) * 1.05 });
    }
  }
  const end = goal || (nd < h(sx, sz) - 2 ? nearest : null); // nedosažitelné → aspoň nejblíž
  if (!end) return null;
  const pts = []; let c = end;
  while (c && !(c.x === sx && c.y === sy && c.z === sz)) { pts.push({ x: c.x + .5, z: c.z + .5 }); c = from.get(key(c.x, c.y, c.z)); }
  pts.reverse();
  return pts.length ? pts : null;
}
function moveToward(e, tx, tz, sp, dt, np) {
  e.pathCd = (e.pathCd || 0) - dt;
  if (!np && e.path) {
    e.pathAge += dt;
    if (Math.hypot(e.pathTx - tx, e.pathTz - tz) > 2.5 || e.pathAge > 20 || e.pathI >= e.path.length) e.path = null;
    else {
      let wp = e.path[e.pathI];
      while (wp && Math.hypot(wp.x - e.x, wp.z - e.z) < .5 && e.pathI < e.path.length - 1) wp = e.path[++e.pathI];
      if (wp && Math.hypot(wp.x - e.x, wp.z - e.z) < .5) e.path = null;
      else { moveToward(e, wp.x, wp.z, sp, dt, true); return; }
    }
  }
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
  const k = Math.min(1, (e.onGround ? 9 : 2.2) * dt);
  let ang = Math.atan2(dx, dz), found = true;
  if (e.avoidT > 0) { e.avoidT -= dt; ang = e.avoidAng; }
  else if (e.onGround || e.type === 'villager') {
    const c = pathClass(e, ang);
    if (c === 0) {
      if (!np && e.pathCd <= 0 && d > 2.5 && (e.type === 'villager')) {
        e.pathCd = 1.5; const pth = findPath(e, tx, tz);
        if (pth) { e.path = pth; e.pathI = 0; e.pathTx = tx; e.pathTz = tz; e.pathAge = 0; return moveToward(e, tx, tz, sp, dt); }
      }
      found = false;
      const side = e.avSide || (e.avSide = rand() < .5 ? 1 : -1);
      for (const off of [.5, 1, 1.5, 2, 2.6]) { for (const sd of [side, -side]) { const a2 = ang + off * sd; if (pathClass(e, a2) > 0) { e.avoidAng = a2; e.avoidT = .4; e.avSide = sd; ang = a2; found = true; break; } } if (found) break; }
    } else if (c === 2 && e.onGround && e.jumpCd <= 0) { e.vy = 8.6; e.jumpCd = .4; }
  }
  e.vx += (Math.sin(ang) * sp - e.vx) * k; e.vz += (Math.cos(ang) * sp - e.vz) * k;
  e.yaw = angTo(e.yaw, ang, 8 * dt);
  if (!found && (e.hitX || e.hitZ) && e.onGround && e.jumpCd <= 0) { e.vy = 8.6; e.jumpCd = .35; }
}
function stop(e, dt) { const k = Math.min(1, 8 * dt); e.vx -= e.vx * k; e.vz -= e.vz * k; }
function dropAhead(e, dx, dz) {
  const d = Math.hypot(dx, dz) || 1, x = e.x + dx / d * .9, z = e.z + dz / d * .9;
  const fy = Math.floor(e.y + .1);
  for (let k = 1; k <= 3; k++) { const id = getB(Math.floor(x), fy - k, Math.floor(z)); if (SOLID[id] || W.isWater(id)) return false; }
  return true;
}
const inRect = (b, x, z, m) => x >= b.x0 - m && x <= b.x0 + b.sx + m && z >= b.z0 - m && z <= b.z0 + b.sz + m;

function villagerDoors(e) {
  const fy = Math.floor(e.y + .1), sp = Math.hypot(e.vx, e.vz);
  const pts = [[e.x, e.z]]; if (sp > .2) pts.push([e.x + e.vx / sp * 1.1, e.z + e.vz / sp * 1.1]);
  for (const [px, pz] of pts) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
    if (Math.hypot(x + .5 - px, z + .5 - pz) > 1.2) continue;
    for (const y of [fy, fy + 1]) { const id = getB(x, y, z); if (W.isDoor(id) && (id - 28) < 4) G.setDoor(x, y, z, true, true); }
  }
}

function pickWanderPoint(e, cx, cz, r) {
  for (let t = 0; t < 8; t++) {
    const x = cx + rr(-r, r), z = cz + rr(-r, r);
    const top = G.topY(Math.floor(x), Math.floor(z));
    if (top < 1 || !G.isLoaded(Math.floor(x), Math.floor(z))) continue;
    if (Math.abs(top - e.y) > 3) continue;
    const b = getB(Math.floor(x), top, Math.floor(z));
    if (W.isWater(b) || W.isLava(b)) continue;
    if (e.type === 'villager') { let hollow = false; for (let k = 1; k <= 4; k++) if (getB(Math.floor(x), top - k, Math.floor(z)) === 0) hollow = true; if (hollow || W.isStair(b)) continue; } // ne na střechu
    if (SOLID[getB(Math.floor(x), top + 1, Math.floor(z))]) continue;
    return [x, z];
  }
  return [e.x, e.z];
}

/* ---------- stavitelé: opravy a stavba nových domů ---------- */
G.extraBuilds = G.extraBuilds || [];
const nowS = () => performance.now() / 1000;
function finishJob(v) {
  const job = v.job; if (!job) return;
  if (job.type === 'build') {
    const bd = job.bd;
    v.extras = (v.extras || []).filter(x => x !== bd);
    v.builds.push(bd); v.added = (v.added || 0) + 1; v.bp = null;
    G.extraBuilds.push({ vx: v.x, vz: v.z, bd });
    const key = v.x + ',' + v.z, gy = G.topY(Math.floor(bd.in.x), Math.floor(bd.in.z)) + 1.02;
    const prof = rand() < .35 ? 2 : Math.floor(rand() * 5);
    G.spawnMob('villager', bd.in.x, gy, bd.in.z, { prof, homeB: bd.bed ? bd : null, workB: bd, village: v, villageKey: key, wx: v.x, wz: v.z });
    if (Math.hypot(v.x - P().x, v.z - P().z) < 90) G.msg('Stavitel dokončil nový dům – do vesnice se nastěhoval obyvatel!', 3500);
  } else { for (const t of job.list) if (v.holes) v.holes.delete(t[0] + ',' + t[1] + ',' + t[2]); }
  v.job = null;
}
function workJob(e, dt) {
  const v = e.village, job = v.job;
  if (!job || job.i >= job.list.length) { finishJob(v); e.jobActive = false; return false; }
  const t = job.list[job.i];
  if (!G.isLoaded(t[0], t[2])) { job.i++; return false; }
  const d = Math.hypot(t[0] + .5 - e.x, t[2] + .5 - e.z), dy = t[1] - e.y;
  let moving = false;
  if (d > 5 || dy > 4 || dy < -6) {
    moveToward(e, t[0] + .5, t[2] + .5, 2.7, dt); moving = true; villagerDoors(e);
    job.stuck = (job.stuck || 0) + dt;
    if (job.stuck > 10) { e.x = t[0] + .5 + (rand() < .5 ? 2 : -2); e.z = t[2] + .5; e.y = Math.max(e.y, t[1] + 1); e.vy = 0; job.stuck = 0; }
  } else {
    stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(t[0] + .5 - e.x, t[2] + .5 - e.z), 8 * dt); job.stuck = 0;
    job.t -= dt;
    if (job.t <= 0) {
      const cur = getB(t[0], t[1], t[2]);
      const inside = SOLID[t[3]] && Math.abs(t[0] + .5 - e.x) < .9 && Math.abs(t[2] + .5 - e.z) < .9 && t[1] > e.y - 1 && t[1] < e.y + 2;
      if (inside) { job.t = .3; moveToward(e, e.x + 3, e.z + 3, 2.7, dt); }
      else {
        if (cur !== t[3] && !(job.type === 'repair' && !(cur === 0 || (BL[cur] && BL[cur].cross)))) {
          G.setBlock(t[0], t[1], t[2], t[3]);
          if (t[3] !== 0) { G.sfx('place', t[0], t[1], t[2]); G.burst(t[0] + .5, t[1] + .5, t[2] + .5, [200, 180, 140], 2, 1.2, .5); e.swing = .25; }
        }
        job.i++; job.t = job.type === 'build' ? .1 : .45;
      }
    }
  }
  return moving;
}
function scanRepairs(v) {
  if (!v.bp) { v.bp = W.villageBlueprint(v); v.cursor = 0; }
  if (!v.holes) v.holes = new Map();
  const bp = v.bp, n = bp.length; if (!n) return;
  const t = nowS();
  for (let k = 0; k < 900; k++) {
    const en = bp[v.cursor]; v.cursor = (v.cursor + 1) % n;
    if (!G.isLoaded(en[0], en[2])) continue;
    const cur = getB(en[0], en[1], en[2]), key = en[0] + ',' + en[1] + ',' + en[2];
    if (cur === 0 || (BL[cur] && BL[cur].cross)) { if (!v.holes.has(key)) v.holes.set(key, { p: en, t0: t }); }
    else if (v.holes.has(key)) v.holes.delete(key);
  }
}
let bT = 0;
function updateBuilders(dt) {
  bT -= dt; if (bT > 0) return; bT = 1;
  const day = G.dayFactor, p = P(), now = nowS();
  const vills = new Map();
  for (const e of entities) if (e.kind === 'mob' && e.type === 'villager' && e.prof === 2 && !e.dead && e.village) {
    if (!vills.has(e.village)) vills.set(e.village, []); vills.get(e.village).push(e);
  }
  for (const [v, list] of vills) {
    for (const b of list) b.jobActive = false;
    if (!G.isLoaded(v.x, v.z) || Math.hypot(v.x - p.x, v.z - p.z) > 110) continue;
    const builder = list[0];
    if (v.job) { if (day >= .38) builder.jobActive = true; continue; }
    if (day < .45) continue;
    scanRepairs(v);
    const ready = [];
    for (const [k, h] of v.holes) if (now - h.t0 >= 25) ready.push(h.p);
    if (ready.length) {
      ready.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      v.job = { type: 'repair', list: ready.slice(0, 300), i: 0, t: .5 }; builder.jobActive = true; continue;
    }
    v.bt = (v.bt || 0) + 1;
    if (v.bt > 150 && (v.added || 0) < 6 && v.builds.length < 22) {
      v.bt = 0;
      const bd = W.planExtraBuild(v);
      if (!bd) continue;
      const list = W.buildingBlueprint(bd, v).filter(en => getB(en[0], en[1], en[2]) !== en[3]);
      if (list.length < 40 || list.some(en => !G.isLoaded(en[0], en[2]))) continue;
      list.sort((a, b) => a[1] - b[1] || (Math.abs(a[0] - bd.cx) + Math.abs(a[2] - bd.cz)) - (Math.abs(b[0] - bd.cx) + Math.abs(b[2] - bd.cz)));
      v.extras = v.extras || []; v.extras.push(bd);
      v.job = { type: 'build', bd, list, i: 0, t: .6 }; builder.jobActive = true;
      if (Math.hypot(v.x - p.x, v.z - p.z) < 90) G.msg('Stavitel začal stavět nový dům…', 2500);
    }
  }
}
G.updateBuilders = updateBuilders;
/* ---------- chytřejší chování: denní režim, rodiny, děti a složky IZS ---------- */
function goInside(e, home, dt) {
  const inside = inRect(home, e.x, e.z, -.4);
  if (inside) {
    const tx = home.bed ? home.bed.x : home.in.x, tz = home.bed ? home.bed.z : home.in.z;
    if (Math.hypot(tx - e.x, tz - e.z) > 1.2) { moveToward(e, tx, tz, 1.8, dt); return true; }
    stop(e, dt); return false;
  }
  const dOut = Math.hypot(home.out.x - e.x, home.out.z - e.z);
  if (dOut < 1.3) e.rs = 1; else if (dOut > 8) e.rs = 0;
  moveToward(e, e.rs ? home.in.x : home.out.x, e.rs ? home.in.z : home.out.z, 2.2, dt);
  return true;
}
function patrol(e, dt, v, R, sp, c) {
  e.wander -= dt;
  if (e.wander <= 0) {
    e.wander = rr(4, 9);
    const cc = c || (v ? [v.x, v.z] : [e.wx, e.wz]);
    const pt = pickWanderPoint(e, cc[0], cc[1], R);
    e.wtx = pt[0]; e.wtz = pt[1]; e.walking = rand() < .88;
  }
  if (e.walking && Math.hypot(e.wtx - e.x, e.wtz - e.z) > 1.2 && !dropAhead(e, e.wtx - e.x, e.wtz - e.z)) { moveToward(e, e.wtx, e.wtz, sp, dt); return true; }
  stop(e, dt); return false;
}
function faceTo(e, x, z, dt) { e.yaw = angTo(e.yaw, Math.atan2(x - e.x, z - e.z), 6 * dt); }
function friendNear(e, range) {
  let best = null, bd = range * range;
  for (const o of entities) {
    if (o === e || o.kind !== 'mob' || o.dead || o.type !== 'villager' || o.village !== e.village || o.sleeping) continue;
    const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (d < bd && d > 1) { bd = d; best = o; }
  }
  return best;
}
function incidentsTick(dt) {
  const t = performance.now() / 1000, list = G.incidents;
  for (let i = list.length - 1; i >= 0; i--) if (list[i].hp <= 0 || t - list[i].t > 120) list.splice(i, 1);
}
function updateService(e, dt, p, dp, dxp, dzp, day) {
  const v = e.village; let moving = false;
  if (e.talking > 0) { e.talking -= dt; stop(e, dt); faceTo(e, p.x, p.z, dt); return false; }
  e.sleeping = false;
  if (e.prof === 5) { // hasič
    let inc = null, bd = 150 * 150;
    for (const o of G.incidents) { const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (d < bd) { bd = d; inc = o; } }
    if (inc) {
      const d = Math.sqrt(bd);
      if (!inc.alerted && dp < 70) { inc.alerted = true; G.msg('Hasiči jedou na místo události!', 2600); }
      if (d > 5) { moveToward(e, inc.x, inc.z, 4.2, dt); moving = true; e.spray = 0; }
      else {
        stop(e, dt); faceTo(e, inc.x, inc.z, dt); e.swing = Math.max(e.swing || 0, .3);
        e.spray = (e.spray || 0) - dt;
        if (e.spray <= 0) { e.spray = .12; G.burst(inc.x + rr(-1.5, 1.5), inc.y + rr(.2, 1.5), inc.z + rr(-1.5, 1.5), [110, 170, 255], 5, 2.4, .8, 5); G.burst(e.x + Math.sin(e.yaw) * .9, e.y + 1.3, e.z + Math.cos(e.yaw) * .9, [170, 210, 255], 2, 3, .5, 5); }
        inc.hp -= dt * (1 + 0.4 * (G.incidents.length > 1 ? 0 : 1));
        if (inc.hp <= 0 && dp < 80) G.msg('Hasiči zásah ukončili.', 2000);
      }
    } else moving = patrol(e, dt, v, 22, 1.5);
  } else if (e.prof === 6) { // záchranář
    let tg = null, bd = 48 * 48;
    for (const o of entities) {
      if (o === e || o.kind !== 'mob' || o.dead || (o.type !== 'villager' && o.type !== 'golem')) continue;
      if (o.hp >= o.maxhp - .5) continue;
      const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (d < bd) { bd = d; tg = o; }
    }
    let isP = false;
    if (!tg && p.alive && p.hp < p.maxhp && dp < 32 && v && Math.hypot(p.x - v.x, p.z - v.z) < 90) { tg = p; bd = dp * dp; isP = true; }
    if (tg) {
      const d = Math.sqrt(bd);
      if (d > 2.3) { moveToward(e, tg.x, tg.z, 3.8, dt); moving = true; }
      else {
        stop(e, dt); faceTo(e, tg.x, tg.z, dt);
        e.heal = (e.heal || 0) - dt;
        if (e.heal <= 0) {
          e.heal = .7; G.burst(tg.x, (tg.y || 0) + 1.6, tg.z, [255, 90, 130], 4, 1.2, 1, -1.5);
          if (isP) G.healPlayer(1); else tg.hp = Math.min(tg.maxhp, tg.hp + 4);
        }
      }
    } else moving = patrol(e, dt, v, 20, 1.4);
  } else { // strážník
    const alarm = v && v.alarmT > 0;
    const foe = nearestHostile(e, alarm ? 75 : 26);
    if (foe) {
      const dx = foe.x - e.x, dz = foe.z - e.z, d = Math.hypot(dx, dz);
      if (d > 2.0) { moveToward(e, foe.x, foe.z, alarm ? 4.4 : 3.7, dt); moving = true; } else { stop(e, dt); faceTo(e, foe.x, foe.z, dt); }
      if (d < 2.5 && Math.abs(foe.y - e.y) < 2.2 && e.cd <= 0) { e.cd = .9; e.swing = .4; G.sfx('hit', e.x, e.y, e.z); G.damageEntity(foe, alarm ? 9 : 6, dx, dz); }
    } else if (dp < 6 && p.alive) { stop(e, dt); faceTo(e, p.x, p.z, dt); }
    else moving = patrol(e, dt, v, 26, 1.6);
  }
  if (moving) villagerDoors(e);
  if (e.snd <= 0) { e.snd = rr(12, 28); if (dp < 12) G.sfx('villager', e.x, e.y, e.z); }
  return moving;
}
function updateChild(e, dt, p, dp, dxp, dzp, day) {
  const v = e.village, home = e.homeB; let moving = false;
  e.sleeping = false;
  const T = G.time;
  if ((T > .70 || (G.weather && G.weather.rain > .35)) && home && home.bed) return goInside(e, home, dt);
  const par = e.parent && !e.parent.dead ? e.parent : null;
  e.modeT = (e.modeT || 0) - dt;
  if (e.modeT <= 0) {
    e.modeT = rr(7, 16);
    if (e.play === undefined) { e.play = null; if (v) { let bd = 1e9; for (const b of v.builds) if (b.type === 'playground') { const d = Math.hypot(b.cx - e.x, b.cz - e.z); if (d < bd) { bd = d; e.play = b; } } } }
    const r = rand();
    e.mode = (r < .4 && par) ? 'follow' : (r < .85 && e.play) ? 'play' : 'wander';
  }
  if (e.mode === 'follow' && par) {
    const d = Math.hypot(par.x - e.x, par.z - e.z);
    if (d > 3.2) { moveToward(e, par.x, par.z, d > 8 ? 3.4 : 2.3, dt); moving = true; }
    else { stop(e, dt); faceTo(e, par.x, par.z, dt); if (e.onGround && rand() < dt * .4) e.vy = 5.5; }
  } else if (e.mode === 'play' && e.play) {
    e.wander -= dt;
    const b = e.play;
    if (e.wander <= 0) { e.wander = rr(1.5, 3.5); e.wtx = b.x0 + 1.5 + rand() * (b.sx - 3); e.wtz = b.z0 + 1.5 + rand() * (b.sz - 3); e.walking = true; }
    if (e.walking && Math.hypot(e.wtx - e.x, e.wtz - e.z) > .9) { moveToward(e, e.wtx, e.wtz, 2.5, dt); moving = true; if (e.onGround && rand() < dt * .6) e.vy = 6; }
    else { stop(e, dt); if (rand() < dt * .5) G.burst(e.x, e.y + 1.2, e.z, [255, 224, 90], 3, 1, .8, -1); }
  } else moving = patrol(e, dt, v, 10, 2.0, home ? [home.cx, home.cz] : null);
  if (moving) villagerDoors(e);
  if (e.snd <= 0) { e.snd = rr(7, 16); if (dp < 14) G.sfx('villager', e.x, e.y, e.z); }
  return moving;
}
function updateVillager(e, dt, p, dp, dxp, dzp, day) {
  const home = e.homeB, work = e.workB;
  let moving = false;
  if (e.spouse) return updateSpouse(e, dt, p, dp, dxp, dzp, day);
  if (e.mem) { e.mem.hit = Math.max(0, e.mem.hit - dt * .03); if ((e.mem.hit > 40 || e.mem.kin) && dp < 8 && p.alive && !(e.prof >= 5 && !e.child)) { e.flee = Math.max(e.flee, .8); e.fleeX = e.x - p.x; e.fleeZ = e.z - p.z; } }
  if (e.prof >= 5 && !e.child && !e.fleeAlways) return updateService(e, dt, p, dp, dxp, dzp, day);
  const foe = nearestHostile(e, 11);
  if (foe) { e.flee = Math.max(e.flee, 1.5); e.fleeX = e.x - foe.x; e.fleeZ = e.z - foe.z; e.talking = 0; }
  if (e.talking > 0) { e.talking -= dt; stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 6 * dt); }
  else if (e.flee > 0) {
    moveToward(e, e.x + (e.fleeX || Math.sin(e.yaw)), e.z + (e.fleeZ || Math.cos(e.yaw)), 4.4, dt); moving = true;
  } else if (e.jobActive && day >= .38 && e.village && e.village.job) {
    moving = workJob(e, dt);
  } else if (day < .38 && home && home.bed) {
    // noc – jdi spát
    const inside = inRect(home, e.x, e.z, -.4);
    let tx, tz;
    if (inside) { tx = home.bed.x; tz = home.bed.z; }
    else { if (Math.hypot(home.out.x - e.x, home.out.z - e.z) < 1.3) e.rs = 1; else if (Math.hypot(home.out.x - e.x, home.out.z - e.z) > 8) e.rs = 0; tx = e.rs ? home.in.x : home.out.x; tz = e.rs ? home.in.z : home.out.z; }
    const d = Math.hypot(tx - e.x, tz - e.z);
    if (inside && d < .9) { e.sleeping = true; stop(e, dt); }
    else { e.sleeping = false; moveToward(e, tx, tz, 2.0, dt); moving = true; }
  } else if (e.child) {
    moving = updateChild(e, dt, p, dp, dxp, dzp, day);
  } else if (home && home.bed && G.weather && G.weather.rain > .4 && home.type !== 'farm') {
    e.sleeping = false; moving = goInside(e, home, dt);  // při dešti domů
  } else if (home && home.bed && G.time > .70 && e.fam) {
    e.sleeping = false; moving = goInside(e, home, dt);  // rodiny se večer vrací domů
  } else {
    e.sleeping = false;
    const inside = home && inRect(home, e.x, e.z, -.4);
    if (inside && home.type !== 'farm') {
      const tx = Math.hypot(home.in.x - e.x, home.in.z - e.z) > 1 && !e.leaving2 ? home.in.x : home.out.x, tz = Math.hypot(home.in.x - e.x, home.in.z - e.z) > 1 && !e.leaving2 ? home.in.z : home.out.z;
      if (Math.hypot(home.in.x - e.x, home.in.z - e.z) <= 1) e.leaving2 = true;
      moveToward(e, tx, tz, 1.8, dt); moving = true;
    } else {
      e.leaving2 = false;
      e.wander -= dt;
      if (e.wander <= 0) {
        e.wander = rr(3, 8);
        const T = G.time, social = e.village && ((T > .46 && T < .56) || (T > .64 && T < .74));
        const fr = (e.partner && !e.partner.dead && !e.partner.sleeping && rand() < .5) ? e.partner : social ? friendNear(e, 16) : null;
        e.friend = fr;
        if (fr && rand() < .75) {
          const a = rand() * 6.28; e.wtx = fr.x + Math.cos(a) * 1.5; e.wtz = fr.z + Math.sin(a) * 1.5; e.walking = true; e.wander = rr(6, 12);
        } else {
          const c = social ? [e.village.x, e.village.z] : work ? [work.cx, work.cz] : (e.village ? [e.village.x, e.village.z] : [e.wx, e.wz]);
          const r = social ? (e.village.town ? 13 : 7) : work ? (work.type === 'farm' || work.type === 'pen' ? Math.max(work.sx, work.sz) / 2 - 1.5 : 6) : 12;
          const pt = pickWanderPoint(e, c[0], c[1], social ? r : (work ? Math.max(3, r) : 12));
          e.wtx = pt[0]; e.wtz = pt[1]; e.walking = rand() < .75;
        }
      }
      if (e.walking && Math.hypot(e.wtx - e.x, e.wtz - e.z) > 1.1 && !dropAhead(e, e.wtx - e.x, e.wtz - e.z)) { moveToward(e, e.wtx, e.wtz, 1.4, dt); moving = true; }
      else {
        stop(e, dt);
        const fr = e.friend;
        if (fr && !fr.dead && Math.hypot(fr.x - e.x, fr.z - e.z) < 4) {
          faceTo(e, fr.x, fr.z, dt);
          e.chatT = (e.chatT || 0) - dt;
          if (e.chatT <= 0) { e.chatT = rr(2.5, 5); G.burst(e.x, e.y + 2.1, e.z, [250, 250, 250], 3, .7, .9, -.8); if (rand() < .3) G.sfx('villager', e.x, e.y, e.z); }
        } else if (dp < 5) e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 3 * dt);
      }
    }
  }
  if (moving) villagerDoors(e);
  if (e.snd <= 0) { e.snd = rr(10, 24); if (dp < 12 && !e.sleeping) G.sfx('villager', e.x, e.y, e.z); }
  return moving;
}
function nearestHostile(e, range) {
  let best = null, bd = range * range;
  for (const o of entities) if (o.kind === 'mob' && o.hostile && !o.dead) { const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2 + (o.y - e.y) ** 2 * .3; if (d < bd) { bd = d; best = o; } }
  return best;
}
function raidTarget(e, range) {
  const p = P(); let best = null, bd = range * range;
  if (p && p.alive) { const d = (p.x - e.x) ** 2 + (p.z - e.z) ** 2 + (p.y - e.y) ** 2 * .3; if (d < bd) { bd = d; best = p; } }
  for (const o of entities) if (o.kind === 'mob' && !o.dead && (o.type === 'villager' || o.type === 'golem')) { const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2 + (o.y - e.y) ** 2 * .3; if (d < bd * .85) { bd = d / .85; best = o; } }
  return best;
}
function raiderIdle(e, dt) {
  // nájezdníci míří na střed vesnice, jinak se potulují
  if (e.raidV) { moveToward(e, e.raidV.x, e.raidV.z, e.speed * .85, dt); villagerDoors(e); return true; }
  e.wander -= dt;
  if (e.wander <= 0) { e.wander = rr(3, 7); e.walking = rand() < .6; e.wyaw = rand() * 6.28; }
  if (e.walking) { moveToward(e, e.x + Math.sin(e.wyaw) * 3, e.z + Math.cos(e.wyaw) * 3, e.speed * .45, dt); return true; }
  stop(e, dt); return false;
}
function updatePillager(e, dt) {
  let moving = false;
  const tgt = raidTarget(e, e.raid ? 46 : 34);
  e.strafeT = (e.strafeT || 0) - dt; if (e.strafeT <= 0) { e.strafeT = rr(1.5, 3.5); e.strafeDir = rand() < .5 ? 1 : -1; }
  if (e.retreat > 0) e.retreat -= dt;
  if (!tgt) moving = raiderIdle(e, dt);
  else {
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz) || 1;
    const see = rayClear(e.x, e.y + 1.5, e.z, tgt.x, tgt.y + 1.3, tgt.z);
    if (e.hp < e.maxhp * .3 && !e.retreat && !e.fled) { e.retreat = 5; e.fled = true; }
    if (e.retreat > 0) { moveToward(e, e.x - dx, e.z - dz, e.speed * 1.15, dt); moving = true; villagerDoors(e); }
    else if (d > 16 || !see) { moveToward(e, tgt.x, tgt.z, e.speed, dt); moving = true; villagerDoors(e); }
    else if (d < 6) { moveToward(e, e.x - dx, e.z - dz, e.speed, dt); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 8 * dt); moving = true; }
    else {
      moveToward(e, e.x + (-dz / d) * e.strafeDir * 3 + dx / d * .3, e.z + (dx / d) * e.strafeDir * 3 + dz / d * .3, e.speed * .55, dt, true);
      e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 10 * dt); moving = true;
    }
    // nabíjení a výstřel s předsazením
    if (see && d < 26 && e.retreat <= 0) {
      if (e.drawT === undefined || e.drawT < 0) { if (e.cd <= 0) { e.drawT = .75; e.aimed = tgt; } }
      else {
        e.drawT -= dt;
        if (e.drawT <= 0) {
          e.cd = rr(1.2, 2.0); e.drawT = -1;
          const t0 = e.aimed || tgt;
          const sx = e.x, sy = e.y + 1.5, sz = e.z, l0 = Math.hypot(t0.x - sx, t0.z - sz), tt = l0 / 25;
          const tx = t0.x + (t0.vx || 0) * tt, tz = t0.z + (t0.vz || 0) * tt, tyy = t0.y + 1.2, l = Math.hypot(tx - sx, tyy - sy, tz - sz) || 1;
          const lift = Math.min(.3, l * .01);
          const sp = rr(-.04, .04) * l / 12;
          G.shootArrow(sx, sy, sz, (tx - sx) / l + sp, (tyy - sy) / l + lift, (tz - sz) / l + sp, 25, 5, true);
        }
      }
    } else e.drawT = -1;
  }
  if (e.snd <= 0) { e.snd = rr(5, 11); G.sfx('pillager', e.x, e.y, e.z); }
  return moving;
}
function updateVindicator(e, dt) {
  let moving = false;
  const tgt = raidTarget(e, e.raid ? 46 : 34);
  if (!tgt) moving = raiderIdle(e, dt);
  else {
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz) || 1;
    if (d > 1.7) { moveToward(e, tgt.x, tgt.z, e.speed * (d < 8 ? 1.2 : 1), dt); moving = true; villagerDoors(e); }
    else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 10 * dt); }
    if (d < 2.2 && Math.abs(tgt.y - e.y) < 2 && e.cd <= 0) {
      e.cd = .95; e.swing = .4; G.sfx('hit', e.x, e.y, e.z);
      if (tgt === P()) G.hurtPlayer(8, e.x, e.z); else G.damageEntity(tgt, 11, dx, dz);
    }
  }
  if (e.snd <= 0) { e.snd = rr(5, 11); G.sfx('pillager', e.x, e.y, e.z); }
  return moving;
}
function updateRavager(e, dt) {
  let moving = false;
  const tgt = raidTarget(e, e.raid ? 50 : 36);
  e.chargeT = (e.chargeT || 0) - dt;
  if (!tgt) moving = raiderIdle(e, dt);
  else {
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz) || 1;
    if (e.chargeT < -2.2) e.chargeT = 3;
    const charging = e.chargeT > 0;
    if (d > 2.2) { moveToward(e, tgt.x, tgt.z, e.speed * (charging ? 1.45 : .85), dt); moving = true; villagerDoors(e); }
    else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 8 * dt); }
    if (d < 2.9 && Math.abs(tgt.y - e.y) < 2.4 && e.cd <= 0) {
      e.cd = 1.4; e.swing = .4; G.sfx('golem', e.x, e.y, e.z);
      if (tgt === P()) { G.hurtPlayer(12, e.x, e.z); tgt.vy = 7; tgt.vx += dx / d * 8; tgt.vz += dz / d * 8; }
      else { G.damageEntity(tgt, 18, dx, dz); tgt.vy = 8; }
    }
    // rozbíjí listí a plot v cestě
    if ((e.hitX || e.hitZ) && e.onGround) {
      const fx = Math.floor(e.x + Math.sin(e.yaw) * 1.3), fz = Math.floor(e.z + Math.cos(e.yaw) * 1.3);
      for (let k = 0; k < 2; k++) { const id = getB(fx, Math.floor(e.y) + k, fz); if (id === B.LEAVES || id === B.FENCE) G.setBlock(fx, Math.floor(e.y) + k, fz, 0); }
    }
  }
  if (e.snd <= 0) { e.snd = rr(6, 12); G.sfx('golem', e.x, e.y, e.z); }
  return moving;
}
function updateEvilGolem(e, dt) {
  let moving = false;
  const tgt = raidTarget(e, 36);
  if (tgt) {
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz);
    if (d > 2.0) { moveToward(e, tgt.x, tgt.z, e.speed, dt); moving = true; } else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 8 * dt); }
    if (d < 2.7 && Math.abs(tgt.y - e.y) < 2.5 && e.cd <= 0) {
      e.cd = 1.3; e.swing = .4; G.sfx('golem', e.x, e.y, e.z);
      if (tgt === P()) { G.hurtPlayer(9, e.x, e.z); tgt.vy = 8; }
      else G.damageEntity(tgt, 14, dx, dz);
    }
  } else stop(e, dt);
  if (e.snd <= 0) { e.snd = rr(8, 18); G.sfx('golem', e.x, e.y, e.z); }
  return moving;
}
function updateGolem(e, dt, p, dp, dxp, dzp) {
  let moving = false;
  // golem vytvořený hráčem: chrání ho a následuje ho
  if (e.owner && p.alive) {
    let foe = null, bd = 1e9;
    for (const o of entities) if (o.kind === 'mob' && o.hostile && !o.dead) {
      const dg = Math.hypot(o.x - e.x, o.z - e.z), dpl = Math.hypot(o.x - p.x, o.z - p.z);
      if ((dg < 18 || dpl < 20) && Math.min(dg, dpl * 1.2) < bd) { bd = Math.min(dg, dpl * 1.2); foe = o; }
    }
    if (foe) {
      const dx = foe.x - e.x, dz = foe.z - e.z, d = Math.hypot(dx, dz);
      if (d > 2.0) { moveToward(e, foe.x, foe.z, 3.5, dt); moving = true; } else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 8 * dt); }
      if (d < 2.7 && Math.abs(foe.y - e.y) < 2.5 && e.cd <= 0) { e.cd = 1.0; e.swing = .4; G.sfx("golem", e.x, e.y, e.z); G.damageEntity(foe, e.dmg || 20, dx, dz); }
    } else if (dp > 45) { e.x = p.x + rr(-3, 3); e.z = p.z + rr(-3, 3); e.y = p.y + 1; e.vy = 0; }
    else if (dp > 6) { moveToward(e, p.x, p.z, dp > 14 ? 3.8 : 2.4, dt); moving = true; }
    else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 3 * dt); }
    if (e.snd <= 0) { e.snd = rr(14, 30); G.sfx('golem', e.x, e.y, e.z); }
    return moving;
  }
  // klidný golem brání vesnici před zlými tvory
  if (e.anger <= 0) {
    const alarm = e.village && e.village.alarmT > 0;
    const foe = nearestHostile(e, alarm ? 90 : G.raid ? 38 : 16);
    if (foe) {
      const dx = foe.x - e.x, dz = foe.z - e.z, d = Math.hypot(dx, dz);
      if (d > 2.0) moveToward(e, foe.x, foe.z, alarm ? 3.8 : 3.3, dt); else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 8 * dt); }
      if (d < 2.7 && e.cd <= 0) { e.cd = 1.2; e.swing = .4; G.sfx('golem', e.x, e.y, e.z); G.damageEntity(foe, Math.round((e.dmg || 20) * .7), dx, dz); }
      return d > 2.0;
    }
  }
  if (e.anger > 0 && p.alive && dp < 40) {
    if (dp > 2.0) { moveToward(e, p.x, p.z, 3.4, dt); moving = true; } else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 8 * dt); }
    if (dp < 2.6 && Math.abs(p.y - e.y) < 2.5 && e.cd <= 0) { e.cd = 1.3; e.swing = .4; G.hurtPlayer(Math.round((e.dmg || 20) * .35), e.x, e.z); p.vy = 8; G.sfx('golem', e.x, e.y, e.z); }
  } else {
    e.wander -= dt;
    if (e.wander <= 0) { e.wander = rr(4, 9); const c = e.village || { x: e.x, z: e.z }; const pt = pickWanderPoint(e, c.x, c.z, 12); e.wtx = pt[0]; e.wtz = pt[1]; e.walking = rand() < .6; }
    if (e.walking && Math.hypot(e.wtx - e.x, e.wtz - e.z) > 1.5 && !dropAhead(e, e.wtx - e.x, e.wtz - e.z)) { moveToward(e, e.wtx, e.wtz, 1.0, dt); moving = true; } else stop(e, dt);
  }
  if (e.snd <= 0) { e.snd = rr(12, 30); if (dp < 20) G.sfx('golem', e.x, e.y, e.z); }
  return moving;
}
function updateWolf(e, dt, p, dp, dxp, dzp) {
  let moving = false;
  if (e.collar) e.collar.visible = !!e.owner;
  if (e.owner && p.alive) {
    let foe = null, bd = 14 * 14;
    for (const o of entities) if (o.kind === 'mob' && o.hostile && !o.dead) { const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (d < bd) { bd = d; foe = o; } }
    if (foe) {
      const dx = foe.x - e.x, dz = foe.z - e.z, d = Math.hypot(dx, dz);
      if (d > 1.5) { moveToward(e, foe.x, foe.z, 4.2, dt); moving = true; } else stop(e, dt);
      if (d < 1.9 && e.cd <= 0) { e.cd = .9; e.swing = .3; G.damageEntity(foe, 6, dx, dz); G.sfx('wolf', e.x, e.y, e.z); }
    } else if (dp > 40) { e.x = p.x + rr(-2, 2); e.z = p.z + rr(-2, 2); e.y = p.y + 1; e.vy = 0; }
    else if (dp > 5) { moveToward(e, p.x, p.z, dp > 12 ? 4.4 : 2.9, dt); moving = true; }
    else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 3 * dt); }
    if (e.snd <= 0) { e.snd = rr(12, 26); G.sfx('wolf', e.x, e.y, e.z); }
    return moving;
  }
  if (e.anger > 0 && p.alive) {
    if (dp > 1.4) { moveToward(e, p.x, p.z, 3.8, dt); moving = true; } else { stop(e, dt); e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 8 * dt); }
    if (dp < 1.9 && Math.abs(p.y - e.y) < 1.8 && e.cd <= 0) { e.cd = 1; e.swing = .3; G.hurtPlayer(4, e.x, e.z); G.sfx('wolf', e.x, e.y, e.z); }
    if (e.snd <= 0) { e.snd = rr(3, 6); G.sfx('wolf', e.x, e.y, e.z); }
    return moving;
  }
  return updateAnimal(e, dt, p, dp, dxp, dzp);
}
function updateAnimal(e, dt, p, dp, dxp, dzp) {
  let moving = false;
  if (e.rider) {
    const c = e.ctrl || { vx: 0, vz: 0, jump: false }, k = Math.min(1, 10 * dt);
    e.vx += (c.vx - e.vx) * k; e.vz += (c.vz - e.vz) * k;
    if (c.jump && e.onGround) e.vy = 9.8;
    if (c.vx || c.vz) e.yaw = angTo(e.yaw, Math.atan2(c.vx, c.vz), 12 * dt);
    if (e.snd <= 0) { e.snd = rr(10, 20); G.sfx('horse', e.x, e.y, e.z); }
    return Math.hypot(e.vx, e.vz) > .3;
  }
  const lure = p.alive && p.holding === I.WHEAT_ITEM && dp < 9 && dp > 1.6;
  if (e.flee > 0) { moveToward(e, e.x + (e.fleeX || 1), e.z + (e.fleeZ || 0), e.speed * 2.6, dt); moving = true; }
  else if (lure) { moveToward(e, p.x, p.z, e.speed * 1.6, dt); moving = true; }
  else {
    e.wander -= dt;
    if (e.wander <= 0) { e.wander = rr(2, 7); e.walking = rand() < .5; e.wyaw = rand() * 6.28; }
    const dx = Math.sin(e.wyaw), dz = Math.cos(e.wyaw);
    if (e.walking && !dropAhead(e, dx, dz)) { moveToward(e, e.x + dx * 3, e.z + dz * 3, e.speed * .6, dt); moving = true; }
    else { if (e.walking) e.wander = 0; stop(e, dt); }
  }
  if (e.snd <= 0) { e.snd = rr(8, 22); if (dp < 22) G.sfx(STATS[e.type].sound, e.x, e.y, e.z); }
  if (e.type === 'chicken' && !e.onGround && e.vy < -1.5) e.vy = -1.5;
  if (e.type === 'rabbit' && moving && e.onGround && e.jumpCd <= 0) { e.vy = 5.6; e.jumpCd = .4 + rand() * .3; }
  return moving;
}

/* ---------- TNT a výbuch ---------- */
G.incidents = G.incidents || [];
G.explode = function (x, y, z, r, byPlayer) {
  G.sfx('explode', x, y, z);
  if (byPlayer) G.socialBlast(x, z);
  if (W.nearVillage(x, z, 40)) G.incidents.push({ x, y, z, t: performance.now() / 1000, hp: 5 + r, kind: 'fire' });
  const R = Math.ceil(r), cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
  const chain = [];
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > r * (.8 + W.hash3(cx + dx, cy + dy, cz + dz, 77) * .35)) continue;
    const bx = cx + dx, by = cy + dy, bz = cz + dz, id = getB(bx, by, bz);
    if (id === 0 || id === B.BEDROCK || id === B.OBSIDIAN || W.isWater(id) || W.isLava(id) || !G.isLoaded(bx, bz)) continue;
    if (id === B.TNT) { chain.push([bx, by, bz]); continue; }
    if (rand() < .2 && !BL[id].cross) { const dr = G.dropOf(id, { pick: 4, sword: 0, axe: 0, shovel: 0 }); if (dr) G.dropItem(bx + .5, by + .5, bz + .5, dr[0], dr[1]); }
    G.setBlock(bx, by, bz, 0);
  }
  for (const [bx, by, bz] of chain) G.primeTnt(bx, by, bz, .3 + rand() * .6, byPlayer);
  G.burst(x, y, z, [90, 90, 90], 24, 6, 1.3, 4); G.burst(x, y, z, [255, 160, 40], 20, 7, .7, 2); G.burst(x, y, z, [40, 40, 40], 14, 4, 1.4, 1);
  const p = P();
  for (const o of [p].concat(entities)) {
    if (!o || o.kind === 'item' || o.dead || (o === p && !o.alive)) continue;
    const dx = o.x - x, dy = o.y + (o.h || 1.8) * .5 - y, dz = o.z - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > r * 2.2) continue;
    const f = Math.pow(1 - d / (r * 2.2), 1.3), dmg = Math.round(30 * f), kx = dx / (d || 1), kz = dz / (d || 1);
    if (o === p) { G.hurtPlayer(dmg, x, z); p.vx += kx * 12 * f; p.vz += kz * 12 * f; p.vy += 7 * f; p.shake = .6; }
    else if (o.type === 'tnt') { o.vx += kx * 8 * f; o.vz += kz * 8 * f; o.vy += 5 * f; }
    else { o.hurt = 0; G.damageEntity(o, dmg, kx, kz); o.vy = 6 * f + 2; }
  }
};
G.primeTnt = function (x, y, z, fuse, byPlayer) {
  G.setBlock(x, y, z, 0);
  const t = G.spawnMob('tnt', x + .5, y, z + .5, { fuse: fuse || 4, byPlayer: !!byPlayer });
  t.vy = 4; t.vx = rr(-1, 1); t.vz = rr(-1, 1); G.sfx('hiss', x, y, z);
  return t;
};
function updateTnt(e, dt) {
  e.fuse -= dt;
  e.vy -= 30 * dt; e.vx *= 1 - 2 * dt; e.vz *= 1 - 2 * dt;
  if (G.inFluid(e, B.WATER, .3)) { e.vy += 40 * dt; if (e.vy > 1.5) e.vy = 1.5; }
  G.moveBody(e, dt);
  e.group.position.set(e.x, e.y, e.z);
  const flash = Math.floor(e.fuse * 6) % 2 === 0, s = 1 + Math.max(0, 1 - e.fuse) * .12;
  e.group.scale.setScalar(s);
  for (const m of e.mats) m.color.setScalar(flash ? 3 : 1);
  if (e.fuse <= 0) { e.dead = true; G.explode(e.x, e.y + .5, e.z, 4.2, e.byPlayer); }
}
/* ---------- vozík na kolejích ---------- */
const railAt = (x, y, z) => getB(x, y, z) === B.RAIL;
function cartInit(e) {
  e.cx = Math.floor(e.x); e.cy = Math.floor(e.y); e.cz = Math.floor(e.z);
  e.dx = 1; e.dz = 0;
  for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (railAt(e.cx + dx, e.cy, e.cz + dz) || railAt(e.cx + dx, e.cy + 1, e.cz + dz) || railAt(e.cx + dx, e.cy - 1, e.cz + dz)) { e.dx = dx; e.dz = dz; break; }
  e.prog = 0; e.departed = false; e.nextDy = 0; e.v = e.v || 0; e.inited = true; e.derail = false;
}
G.cartFlip = function (e) {
  if (e.prog > 0 && e.departed) { e.cx += e.dx; e.cy += e.nextDy; e.cz += e.dz; e.dx = -e.dx; e.dz = -e.dz; e.nextDy = -e.nextDy; e.prog = 1 - e.prog; }
  else { e.dx = -e.dx; e.dz = -e.dz; e.departed = false; e.prog = 0; }
};
function cartPick(e) {
  for (const [dx, dz] of [[e.dx, e.dz], [-e.dz, e.dx], [e.dz, -e.dx]]) for (const dy of [0, 1, -1]) if (railAt(e.cx + dx, e.cy + dy, e.cz + dz)) return { dx, dz, dy };
  return null;
}
function updateCart(e, dt) {
  if (!e.inited) cartInit(e);
  if (!railAt(e.cx, e.cy, e.cz) && !(e.departed && e.prog > 0)) {
    // spadl z kolejí – klesá, dokud nenajde kolej
    e.derail = true; e.vx = e.vz = 0; e.vy -= 30 * dt; G.moveBody(e, dt);
    if (railAt(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z))) { e.v = 0; cartInit(e); }
    e.group.position.set(e.x, e.y, e.z); return;
  }
  if (e.v < 0) { G.cartFlip(e); e.v = -e.v; }
  e.v += (e.input || 0) * 5.5 * dt;
  e.v *= 1 - (e.rider ? .22 : .55) * dt;
  if (!e.input && e.v < .06) e.v = 0;
  if (e.v > 9) e.v = 9;
  if (e.nextDy > 0 && e.departed) e.v = Math.max(0, e.v - 4 * dt); else if (e.nextDy < 0 && e.departed) e.v = Math.min(9, e.v + 3 * dt);
  let rem = e.v * dt;
  while (rem > 1e-5) {
    if (e.prog === 0 && !e.departed) { const nx = cartPick(e); if (!nx) { e.v = 0; break; } e.dx = nx.dx; e.dz = nx.dz; e.nextDy = nx.dy; e.departed = true; }
    const step = Math.min(rem, 1 - e.prog); e.prog += step; rem -= step;
    if (e.prog >= 1 - 1e-9) { e.cx += e.dx; e.cy += e.nextDy; e.cz += e.dz; e.prog = 0; e.departed = false; }
  }
  const p = e.departed ? e.prog : 0;
  e.x = e.cx + .5 + e.dx * p; e.z = e.cz + .5 + e.dz * p;
  // výška podle skutečné koleje pod vozíkem (včetně rampy)
  const fx = Math.floor(e.x), fz = Math.floor(e.z);
  let ry = e.cy; for (const k of [e.cy + 1, e.cy, e.cy - 1]) if (railAt(fx, k, fz)) { ry = k; break; }
  let sy = ry + .1;
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (railAt(fx + sx, ry + 1, fz + sz) && !railAt(fx + sx, ry, fz + sz)) {
    const f = (e.x - fx) * sx + (e.z - fz) * sz + ((sx + sz) < 0 ? 1 : 0);
    sy = ry + .1 + f; e.slope = sx || sz ? f : 0; break;
  }
  e.y = sy;
  e.group.position.set(e.x, e.y, e.z);
  e.group.rotation.y = Math.atan2(e.dx, e.dz);
  e.yaw = e.group.rotation.y;
}

/* ---------- auta ---------- */
const CAR_COLS = [[200, 40, 40], [40, 90, 190], [230, 200, 60], [232, 232, 232], [64, 64, 70], [40, 150, 80], [220, 120, 40], [120, 40, 150]];
function carFits(x, z, y, alongX, L) {
  const hx = alongX ? L / 2 : .8, hz = alongX ? .8 : L / 2;
  for (let xx = Math.floor(x - hx); xx <= Math.floor(x + hx); xx++) for (let zz = Math.floor(z - hz); zz <= Math.floor(z + hz); zz++) {
    if (!G.isLoaded(xx, zz)) return false;
    const gy = G.topY(xx, zz); if (Math.abs(gy + 1 - y) > .6) return false;
    for (let yy = Math.floor(y); yy <= Math.floor(y + 1.5); yy++) if (SOLID[getB(xx, yy, zz)]) return false;
  }
  return true;
}
G.spawnCar = function (x, z, vt, extra) {
  const y = G.topY(Math.floor(x), Math.floor(z)) + 1.0;
  const e = G.spawnMob('car', x, y, z, Object.assign({ vtype: vt || 'car', carCol: CAR_COLS[Math.floor(rand() * CAR_COLS.length)], cname: vt === 'fire' ? 'Hasičské auto' : vt === 'ambulance' ? 'Sanitka' : vt === 'police' ? 'Policejní auto' : 'Auto', w: .85, h: 1.35 }, extra || {}));
  return e;
};
function updateCar(e, dt) {
  const g = e.group, p = P();
  if (!e.parked) {
    const v = e.town; if (!v) return;
    const axisX = e.axis === 'x', c0 = axisX ? v.x : v.z;
    // brzdění před překážkou
    let brake = false;
    const look = 3.2 + e.v * .5;
    const chk = (o) => { const ax = axisX ? o.x - e.x : o.z - e.z, lat = axisX ? o.z - e.z : o.x - e.x; return ax * e.sgn > .6 && ax * e.sgn < look && Math.abs(lat) < 1.4; };
    if (p.alive && chk(p)) brake = true;
    if (!brake) for (const o of entities) if (o !== e && !o.dead && o.kind === 'mob' && (o.type === 'villager' || o.type === 'car') && chk(o)) { brake = true; break; }
    const sp = e.vtype === 'car' ? 5.2 : 4.2;
    const tv = brake ? 0 : sp;
    e.v += Math.max(-16 * dt, Math.min(4 * dt, tv - e.v));
    // překážka v cestě (blok)
    const fx = e.x + (axisX ? e.sgn * 2 : 0), fz = e.z + (axisX ? 0 : e.sgn * 2);
    let blocked = false;
    for (let yy = Math.floor(e.y + .3); yy <= Math.floor(e.y + 1.2); yy++) if (SOLID[getB(Math.floor(fx), yy, Math.floor(fz))]) blocked = true;
    if (blocked) { e.v = 0; e.sgn = -e.sgn; e.uT = 1.5; }
    const step = e.v * dt * e.sgn;
    if (axisX) e.x += step; else e.z += step;
    // přejezd středu křižovatky → možná odboč
    const rel = (axisX ? e.x : e.z) - c0, cell = Math.round(rel / 18) * 18, was = e.lastRel === undefined ? rel : e.lastRel;
    if (Math.abs(cell) <= 36 && (was - cell) * (rel - cell) <= 0 && e.v > 1 && (e.lastCell !== cell)) {
      e.lastCell = cell;
      if (rand() < .4) { // odbočka
        e.axis = axisX ? 'z' : 'x'; e.sgn = rand() < .5 ? 1 : -1; e.lane = cell;
      }
    }
    e.lastRel = rel; if (e.lastCell !== undefined && Math.abs(rel - e.lastCell) > 4) e.lastCell = undefined;
    const nax = e.axis === 'x', cc0 = nax ? v.x : v.z, cc1 = nax ? v.z : v.x;
    if (e.lane === undefined) e.lane = 0;
    // vyrovnání do jízdního pruhu
    const laneC = (nax ? v.z : v.x) + e.lane + .85 * e.sgn * (nax ? -1 : 1);
    if (nax) e.z += (laneC - e.z) * Math.min(1, 6 * dt); else e.x += (laneC - e.x) * Math.min(1, 6 * dt);
    // konec města → otoč se
    const aNow = (nax ? e.x : e.z) - cc0;
    if (Math.abs(aNow) > 50 && aNow * e.sgn > 0) e.sgn = -e.sgn;
    // výška
    const ty = G.surfaceY(e.x, e.z, e.y + .3);
    if (Math.abs(ty - e.y) > 1.3) { e.x -= (nax ? step : 0); e.z -= (nax ? 0 : step); e.sgn = -e.sgn; e.v = 0; }
    else e.y += (ty - e.y) * Math.min(1, 12 * dt);
    const tyaw = nax ? (e.sgn > 0 ? Math.PI / 2 : -Math.PI / 2) : (e.sgn > 0 ? 0 : Math.PI);
    e.yaw = angTo(e.yaw, tyaw, 5 * dt);
    e.phase += e.v * dt;
  }
  g.position.set(e.x, e.y, e.z); g.rotation.order = 'YXZ'; g.rotation.y = e.yaw;
  if (!e.parked) { const dx = e.axis === 'x' ? e.sgn : 0, dz = e.axis === 'x' ? 0 : e.sgn; const ya = G.surfaceY(e.x + dx * 1.3, e.z + dz * 1.3, e.y + .3), yb = G.surfaceY(e.x - dx * 1.3, e.z - dz * 1.3, e.y + .3); e.pit = (e.pit || 0) + (-Math.atan2(ya - yb, 2.6) - (e.pit || 0)) * .25; g.rotation.x = e.pit; }
  // osvětlení a majáky
  const L = exposed(e) ? .35 + .65 * G.dayFactor : .6;
  for (const m of e.mats) m.color.setRGB(L, L, L);
  if (e.lightMat) { const emerg = G.incidents.length > 0 && Math.hypot(G.incidents[0].x - e.x, G.incidents[0].z - e.z) < 160; const f = emerg && Math.floor(performance.now() / 180) % 2 === 0; e.lightMat.color.setHex(f ? (e.vtype === 'police' ? 0x3060ff : 0xff3030) : (emerg ? (e.vtype === 'police' ? 0xff3030 : 0x601010) : 0x502020)); }
}

function updateMob(e, dt) {
  if (e.type === 'cart') { updateCart(e, dt); return; }
  if (e.type === 'car') { updateCar(e, dt); return; }
  if (e.type === 'tnt') { updateTnt(e, dt); return; }
  e.hurt = Math.max(0, e.hurt - dt); e.cd -= dt; e.snd -= dt; e.anger = Math.max(0, e.anger - dt); e.flee = Math.max(0, e.flee - dt);
  e.jumpCd -= dt;
  const p = P(), day = G.dayFactor;
  const inW = G.inFluid(e, B.WATER, .3), headW = G.inFluid(e, B.WATER, e.h * .85);
  if (G.inFluid(e, B.LAVA, .2)) { e.lavaT = (e.lavaT || 0) + dt; if (e.lavaT > .5) { e.lavaT = 0; G.damageEntity(e, 4, 0, 0); } }
  if (inW) { e.vy -= 8 * dt; if (headW || e.vy < -2) e.vy += 20 * dt; if (e.vy > 2.5) e.vy = 2.5; e.vx *= 1 - 2 * dt; e.vz *= 1 - 2 * dt; }
  else { e.vy -= 30 * dt; if (e.vy < -45) e.vy = -45; }
  if (G.touchCactus(e)) { e.cactT = (e.cactT || 0) + dt; if (e.cactT > .5) { e.cactT = 0; G.damageEntity(e, 1, -Math.sin(e.yaw), -Math.cos(e.yaw)); } }
  const dxp = p.x - e.x, dzp = p.z - e.z, dp = Math.hypot(dxp, dzp);
  let moving;
  if (e.type === 'villager') { const al = e.village && e.village.alarmT > 0 && !(e.prof >= 5 && !e.child); moving = updateVillager(e, dt, p, dp, dxp, dzp, al ? 0 : day); if (al) e.sleeping = false; }
  else if (e.type === 'golem') moving = updateGolem(e, dt, p, dp, dxp, dzp);
  else if (e.type === 'pillager') moving = updatePillager(e, dt);
  else if (e.type === 'vindicator') moving = updateVindicator(e, dt);
  else if (e.type === 'ravager') moving = updateRavager(e, dt);
  else if (e.type === 'wolf') moving = updateWolf(e, dt, p, dp, dxp, dzp);
  else if (e.type === 'evilgolem') moving = updateEvilGolem(e, dt);
  else moving = updateAnimal(e, dt, p, dp, dxp, dzp);
  if (e.type === 'villager' && moving) villagerDoors(e);
  if (inW) e.wetT = .7; else if (e.wetT > 0) e.wetT -= dt;
  if ((inW || e.wetT > 0) && (e.type === 'villager' || e.type === 'golem')) { // vylez z vody
    e.swimT = (e.swimT || 0) - dt;
    if (e.swimT <= 0 || !e.shore) {
      e.swimT = .8; e.shore = null; let bd = 1e9;
      for (let r = 1; r <= 12; r += 1) { for (let q = 0; q < 16; q++) { const a = q / 16 * 6.283, x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r; if (!G.isLoaded(Math.floor(x), Math.floor(z))) continue; const top = G.topY(Math.floor(x), Math.floor(z)); const b = getB(Math.floor(x), top, Math.floor(z)); if (W.isWater(b) || W.isLava(b) || SOLID[getB(Math.floor(x), top + 1, Math.floor(z))] || Math.abs(top + 1 - e.y) > 3) continue; if (r < bd) { bd = r; e.shore = [x, z]; } } if (e.shore) break; }
    }
    if (e.shore) { e.sleeping = false; e.talking = 0; const dd = Math.hypot(e.shore[0] - e.x, e.shore[1] - e.z); moveToward(e, e.shore[0], e.shore[1], 2.6, dt); moving = true; if ((e.hitX || e.hitZ) || dd < 2) e.climbT = .45; }
  }
  if (e.climbT > 0) { e.climbT -= dt; if ((inW || e.wetT > 0) && e.vy < 5) e.vy = 5; }
  if (e.sleeping) { e.vx = e.vz = 0; }
  G.moveBody(e, dt);
  // zaseknutí – zkus nový cíl
  if (moving && Math.hypot(e.vx, e.vz) < .25) { e.stuckT += dt; if (e.stuckT > 1.6) { e.stuckT = 0; e.wander = 0; if (e.onGround) e.vy = 8.6; } } else e.stuckT = 0;

  // animace
  const spd = Math.hypot(e.vx, e.vz);
  e.phase += spd * dt * 2.6;
  const sw = Math.sin(e.phase) * Math.min(1, spd / 1.6) * .8;
  if (e.legs) { e.legs.forEach((l, i) => { l.rotation.x = ((i % 2) ^ (e.type === 'golem' ? 0 : (i >> 1) & 1)) ? sw : -sw; }); }
  if (e.wings) { const f = e.onGround ? 0 : Math.sin(e.phase * 6 + now() * 20) * .9 + .9; e.wings[0].rotation.z = -f; e.wings[1].rotation.z = f; }
  if (e.type === 'pillager') { const dr = e.drawT > 0 ? 1 - e.drawT / .75 : 0; e.parts.armR.rotation.x = -1.2 - dr * .35; e.parts.armL.rotation.x = -1.0 - dr * .3; }
  if (e.type === 'vindicator') { e.parts.armR.rotation.x = e.swing > 0 ? -2.4 + (1 - e.swing / .4) * 1.5 : -1.0 + Math.sin(e.phase) * .15; e.parts.armL.rotation.x = Math.sin(e.phase) * .6; }
  if (e.type === 'golem' || e.type === 'evilgolem') { e.parts.armL.rotation.x = -sw * .5 - (e.swing > 0 ? 1.8 : 0); e.parts.armR.rotation.x = sw * .5 - (e.swing > 0 ? 1.8 : 0); }
  if (e.parts && e.parts.head && e.animal && !moving) e.parts.head.rotation.x = Math.sin(now() * 1.3 + e.phase) * .15 + (e.walking ? 0 : .12);
  if (e.swing > 0) e.swing -= dt;

  const g = e.group;
  g.position.set(e.x, e.y, e.z); g.rotation.y = e.yaw;
  if (e.type === 'villager') {
    g.rotation.z = Math.sin(e.phase) * .05 * Math.min(1, spd);
    if (e.sleeping) { g.rotation.x = -Math.PI / 2; g.position.y = e.y + .55; } else g.rotation.x = 0;
    if (e.parts.head) e.parts.head.rotation.y = e.talking > 0 ? 0 : Math.sin(now() * .7 + e.phase) * .12;
  }
  let L = exposed(e) ? .3 + .7 * G.dayFactor : .6;
  if (e.type === 'villager' && e.sleeping) L *= .75;
  let r = L, gr = L, b = L;
  if (e.hurt > 0) { gr *= .35; b *= .35; r = Math.min(1.3, r * 1.4); }
  for (const m of e.mats) m.color.setRGB(r, gr, b);
}
const now = () => performance.now() / 1000;

/* ================= SPAWN A SPRÁVA ================= */
const VILL_SPAWNED = new Set();
let spawnT = 0, villT = 0, raidT = 10;
G.resetEntities = function () {
  for (const e of entities) { if (e.group) scene.remove(e.group); if (e.mesh) scene.remove(e.mesh); }
  entities.length = 0; autoDoors.clear(); G.raid = null; raidCool = 120;
  for (const a of arrows) scene.remove(a.m); arrows.length = 0;
  VILL_SPAWNED.clear();
};
/* ================= IDENTITA, PAMĚŤ, POVĚST, RODINA ================= */
const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seeded = (s) => { let a = hash32(String(s)); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const NAMES_F = ['Anežka', 'Marie', 'Eliška', 'Karolína', 'Tereza', 'Lucie', 'Klára', 'Barbora', 'Hana', 'Alena', 'Petra', 'Veronika', 'Jitka', 'Markéta', 'Adéla', 'Dagmar', 'Božena', 'Zdena'];
const NAMES_M = ['Karel', 'Jan', 'Petr', 'Tomáš', 'Josef', 'Martin', 'Václav', 'Ondřej', 'Matěj', 'Jakub', 'Vojtěch', 'Zdeněk', 'Pavel', 'Radek', 'Oldřich', 'Bohumil', 'Filip', 'Emil'];
const TRAITS = {
  friendly: { m: 'přátelský', f: 'přátelská', need: 35, gain: 1.3 },
  shy: { m: 'plachý', f: 'plachá', need: 45, gain: .8, talks: 5 },
  proud: { m: 'hrdý', f: 'hrdá', need: 55, gain: 1, rep: 15 },
  worker: { m: 'pracovitý', f: 'pracovitá', need: 45, gain: 1, trades: 3 },
  romantic: { m: 'romantický', f: 'romantická', need: 40, gain: 1.1, gifts: 1 }
};
const TRAIT_IDS = Object.keys(TRAITS);
const freshMem = (sr) => ({ aff: 6 + Math.floor((sr ? sr() : rand()) * 12), hit: 0, kin: 0, talk: 0, gifts: 0, trades: 0, lastTalk: 0, lastGift: 0, lastNo: 0, no: 0 });
G.memStore = {}; G.rep = { g: 0, v: {} }; G.family = null;
G.resetSocial = () => { G.memStore = {}; G.rep = { g: 0, v: {} }; G.family = null; };
const nowSec = () => Date.now() / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function giveIdentity(e, sr, slot, fem) {
  e.slot = slot; e.name = (fem ? NAMES_F : NAMES_M)[Math.floor(sr() * 18)]; e.trait = TRAIT_IDS[Math.floor(sr() * TRAIT_IDS.length)];
  e.mem = G.memStore[slot] || (G.memStore[slot] = freshMem(sr));
}
G.repKey = (e) => e.villageKey || (e.village && (e.village.x + ',' + e.village.z)) || 'x';
G.traitName = (e) => TRAITS[e.trait] ? (e.fem ? TRAITS[e.trait].f : TRAITS[e.trait].m) : '';
const repKey = (e) => e.villageKey || (e.village && (e.village.x + ',' + e.village.z)) || 'x';
const repScore = (key) => (G.rep.v[key] || 0) + G.rep.g * .5;
G.repScore = repScore;
G.repLabel = (key) => { const r = repScore(key); return r > 40 ? 'Hrdina vesnice' : r > 15 ? 'Vážený host' : r > -15 ? 'Neznámý' : r > -40 ? 'Podezřelý' : 'Nežádoucí osoba'; };
function repAdd(key, dv, dg) { G.rep.v[key] = clamp((G.rep.v[key] || 0) + dv, -100, 100); G.rep.g = clamp(G.rep.g + (dg || 0), -100, 100); }
function witnessesOf(e, range) {
  const out = [];
  for (const o of entities) {
    if (o === e || o.kind !== 'mob' || o.dead || o.type !== 'villager' || !o.mem) continue;
    if (Math.hypot(o.x - e.x, o.z - e.z) > range) continue;
    if (!rayClear(o.x, o.y + 1.5, o.z, e.x, e.y + 1.2, e.z)) continue;
    out.push(o);
  }
  return out;
}
const isKin = (a, b) => a === b.partner || b === a.partner || a === b.parent || b === a.parent || (a.fam && a.fam === b.fam) || (G.family && G.family.sp && ((a.spouse && b.famKid) || (b.spouse && a.famKid)));
// hráč zasáhl vesničana
G.socialHit = function (e, lethal) {
  if (e.type !== 'villager') return;
  const m = e.mem;
  if (m) { m.hit = Math.min(100, m.hit + (e.child ? 60 : 35)); m.aff -= lethal ? 100 : 25; }
  const key = repKey(e);
  repAdd(key, lethal ? -25 : -6, lethal ? -8 : -2);
  const P0 = P();
  for (const o of witnessesOf(e, 16)) {
    o.mem.aff -= lethal ? 20 : 8; o.mem.hit = Math.min(100, o.mem.hit + (lethal ? 30 : 8));
    o.flee = Math.max(o.flee, 3); o.fleeX = o.x - P0.x; o.fleeZ = o.z - P0.z;
  }
  if (lethal) for (const o of entities) {
    if (o === e || o.kind !== 'mob' || o.dead || o.type !== 'villager' || !o.mem) continue;
    if (isKin(e, o)) { o.mem.kin = 100; o.mem.hit = 100; o.mem.aff = -100; }
  }
  if (lethal && e.spouse && G.family && G.family.sp) { G.family.sp.dead = true; G.family.sp.murdered = true; G.msg('Zabil jsi vlastního manžela/ku…', 4000); }
};
// zabití nájezdníka v blízkosti vesnice
G.socialDefend = function (e) {
  if (!W.nearVillage(e.x, e.z, 60)) return;
  for (const o of entities) if (o.kind === 'mob' && !o.dead && o.type === 'villager' && o.mem && o.village && Math.hypot(o.x - e.x, o.z - e.z) < 40) { o.mem.aff = Math.min(100, o.mem.aff + 4); repAdd(repKey(o), 1.5, .3); }
};
// výbuch v blízkosti vesnice, zapálený hráčem
G.socialBlast = function (x, z) {
  for (const o of entities) if (o.kind === 'mob' && !o.dead && o.type === 'villager' && o.mem && Math.hypot(o.x - x, o.z - z) < 36) { o.mem.aff -= 12; o.mem.hit = Math.min(100, o.mem.hit + 6); }
  const seen = new Set();
  for (const o of entities) if (o.kind === 'mob' && o.type === 'villager' && o.village && Math.hypot(o.x - x, o.z - z) < 40 && !seen.has(repKey(o))) { seen.add(repKey(o)); repAdd(repKey(o), -12, -3); }
};
G.socialTick = function (dt) {
  const r = G.rep, k = dt * .004;
  r.g += clamp(-r.g, -k, k); for (const key in r.v) r.v[key] += clamp(-r.v[key], -k, k);
};
const SAY = {
  hit: ['Uhodil jsi mě. To nezapomenu.', 'Drž se ode mě dál!'],
  kin: ['Zabil jsi někoho z mé rodiny. Nikdy.', 'Vrahu! Pryč!']
};
const pick = (a) => a[Math.floor(rand() * a.length)];
function mood(e) { const a = e.mem.aff; return a > 70 ? 'Zbožňuje tě' : a > 45 ? 'Má tě rád(a)' : a > 20 ? 'Přátelský přístup' : a > 0 ? 'Neutrální' : 'Nedůvěřuje ti'; }
G.npcMood = mood;
G.socialTalk = function (e) {
  const m = e.mem, t = TRAITS[e.trait] || TRAITS.friendly, t0 = nowSec();
  if (m.kin) return { say: pick(SAY.kin), bad: 1 };
  if (m.hit > 60) return { say: pick(SAY.hit), bad: 1 };
  if (t0 - m.lastTalk < 25) return { say: 'Už jsme si dnes pěkně popovídali… dej mi chvilku.' };
  m.lastTalk = t0; m.talk++;
  const bonus = t.gain * (G.repScore(repKey(e)) > 20 ? 1.3 : 1);
  m.aff = Math.min(100, m.aff + 4 * bonus);
  const lines = e.fem ? ['Ráda tě vidím!', 'Dnes je krásně, že?', 'Vyprávěj, co je nového ve světě.'] : ['Rád tě vidím!', 'Dneska je pěkně, že?', 'Vyprávěj, co je nového ve světě.'];
  if (m.hit > 20) return { say: 'Jsem pořád trochu naštvaný(á)… ale poslouchám.' };
  return { say: pick(lines), good: 1 };
};
const GIFT_VAL = () => ({ [B.FLOWER_R]: 8, [B.FLOWER_Y]: 8, [I.EMERALD]: 6, [I.DIAMOND]: 12, [I.GOLD]: 5, [I.APPLE]: 3, [I.BREAD]: 3, [I.STEAK]: 4 });
G.giftValue = (id) => GIFT_VAL()[id] || 0;
G.socialGift = function (e, id) {
  const m = e.mem, t = TRAITS[e.trait] || TRAITS.friendly, t0 = nowSec();
  if (m.kin) return { say: pick(SAY.kin), bad: 1, keep: 1 };
  if (m.hit > 60) return { say: 'Nechci nic od tebe.', bad: 1, keep: 1 };
  if (t0 - m.lastGift < 20) return { say: 'Děkuju, ale nechci tě připravit o všechno.', keep: 1 };
  let v = G.giftValue(id);
  if (!v) return { say: 'Hmm… díky? Tohle asi nepotřebuju.', keep: 1 };
  if (e.trait === 'romantic' && (id === B.FLOWER_R || id === B.FLOWER_Y)) v *= 2;
  if (e.trait === 'proud' && v < 5) v = 2;
  m.lastGift = t0; m.gifts++;
  m.aff = Math.min(100, m.aff + v * t.gain);
  m.hit = Math.max(0, m.hit - v * 1.5);
  return { say: v >= 12 ? 'To je nádherné! Děkuju ti!' : 'Děkuju, to je milé.', good: 1 };
};
// žádost o ruku
G.socialPropose = function (e) {
  const m = e.mem, t = TRAITS[e.trait] || TRAITS.friendly, t0 = nowSec(), key = repKey(e), f = e.fem;
  if (G.family && G.family.sp && !G.family.sp.dead) return { say: 'Vždyť už máš rodinu!', keep: 1 };
  if (m.kin) return { say: pick(SAY.kin), bad: 1 };
  if (m.hit > 20) return refuse(e, f ? 'Uhodil jsi mě. Jak bych si tě mohla vzít?' : 'Uhodil jsi mě. Jak bych si tě mohl vzít?');
  if (t0 - m.lastNo < 120) { m.aff -= 10; m.lastNo = t0; return { say: f ? 'Už jsem ti řekla ne. Dej mi čas.' : 'Už jsem ti řekl ne. Dej mi čas.', bad: 1 }; }
  if (m.talk < 3) return { say: 'Skoro se neznáme. Pojďme si nejdřív povídat.', soft: 1 };
  const rs = G.repScore(key);
  if (rs < -25) return refuse(e, 'Ve vsi se o tobě říká samé zlé. Nemůžu.');
  if (t.talks && m.talk < t.talks) return refuse(e, f ? 'Jsem plachá… potřebuju víc času. Popovídej si se mnou.' : 'Jsem plachý… potřebuju víc času. Popovídej si se mnou.', 1);
  if (t.rep && rs < t.rep) return refuse(e, 'Chci někoho, koho ve vsi uznávají. Zasloužit si respekt.', 1);
  if (t.trades && m.trades < t.trades) return refuse(e, f ? 'Chci někoho, kdo si váží práce druhých. Obchoduj se mnou.' : 'Chci někoho, kdo si váží práce druhých. Obchoduj se mnou.', 1);
  if (t.gifts && m.gifts < t.gifts) return refuse(e, f ? 'Jsem romantička… potěš mě nějakým dárkem, třeba květinou.' : 'Jsem romantik… potěš mě nějakým dárkem, třeba květinou.', 1);
  if (m.aff < t.need) return refuse(e, 'Zatím to necítím. Dávej na sebe pozor a buď mi nablízku.');
  if (!(G.homePoint && G.homePoint())) return { say: 'Kde bychom bydleli? Postav si dům a vyspi se ve své posteli – pak přijď.', soft: 1 };
  if (m.aff - t.need < 12 && rand() < .3) return refuse(e, 'Chtěla bych… ale ještě si nejsem jistá. Zkus to později.', 1);
  marry(e);
  return { say: f ? 'Ano! Ráda se za tebe provdám! 💍' : 'Ano! Rád si tě vezmu! 💍', good: 1, married: 1 };
};
function refuse(e, say, soft) { e.mem.lastNo = nowSec(); e.mem.no++; e.mem.aff -= 4; return { say, bad: 1, hint: 1 }; }
function marry(e) {
  const hp = G.homePoint();
  G.family = { home: { x: hp.x, y: hp.y, z: hp.z }, kids: [], since: nowSec(), lastKid: nowSec(), sp: { slot: e.slot, name: e.name, fem: e.fem, prof: e.prof, hairC: e.hairC, hairS: e.hairS, skinC: e.skinC, eyeC: e.eyeC, trait: e.trait, follow: false, aff: e.mem.aff } };
  G.burst(e.x, e.y + 1.8, e.z, [255, 90, 140], 22, 3, 1.6, -1);
  e.dead = true; // starý zápis z vesnice zmizí, objeví se doma
  G.family.ent = null;
  repAdd(repKey(e), 8, 2);
}
G.famFx = () => { };
G.socialBaby = function () {
  const F = G.family;
  if (!F || !F.sp || F.sp.dead) return { say: 'Nemáš s kým.', keep: 1 };
  if (F.kids.length >= 3) return { say: 'Tři děti jsou pro náš dům akorát.' };
  const t0 = nowSec();
  if (t0 - F.lastKid < 90) return { say: 'Pojďme chvíli počkat… ještě jsme si nevydechli.' };
  if (!F.ent || F.ent.dead) return { say: 'Musí být doma, aby to šlo.' };
  const sr = seeded('kid' + F.kids.length + F.since), fem = sr() < .5;
  const kid = { name: (fem ? NAMES_F : NAMES_M)[Math.floor(sr() * 18)], fem, hairC: F.sp.hairC, hairS: Math.floor(sr() * 4), skinC: F.sp.skinC, eyeC: Math.floor(sr() * 3) };
  F.kids.push(kid); F.lastKid = t0; spawnFamKid(kid);
  return { say: (fem ? 'Je to holčička! Říkáme jí ' : 'Je to chlapeček! Říkáme mu ') + kid.name + '. ❤', good: 1 };
};
function spawnFamKid(k) {
  const F = G.family, x = F.home.x + rr(-1, 1), z = F.home.z + rr(-1, 1);
  const c = G.spawnMob('villager', x, F.home.y + .1, z, { child: true, scale: .62, w: .2, h: 1.2, prof: 0, fem: k.fem, hairC: k.hairC, hairS: k.hairS, skinC: k.skinC, eyeC: k.eyeC, name: k.name, famKid: true, parent: F.ent, wx: F.home.x, wz: F.home.z });
  c.mem = freshMem(); c.mem.aff = 80; c.persistChild = true;
  return c;
}
// přivolá rodinu domů, když je načtený domov
function familyTick() {
  const F = G.family; if (!F || !F.sp || F.sp.dead) return;
  if (F.ent && !F.ent.dead && entities.includes(F.ent)) return;
  const hx = Math.floor(F.home.x), hz = Math.floor(F.home.z);
  if (!G.isLoaded(hx, hz)) return;
  const s = F.sp;
  const e = G.spawnMob('villager', F.home.x + .6, F.home.y + .1, F.home.z + .6, { prof: s.prof, fem: s.fem, hairC: s.hairC, hairS: s.hairS, skinC: s.skinC, eyeC: s.eyeC, name: s.name, trait: s.trait, spouse: true, wx: F.home.x, wz: F.home.z });
  e.mem = freshMem(); e.mem.aff = s.aff || 70; e.slot = s.slot; F.ent = e;
  for (const kid of F.kids) spawnFamKid(kid);
}
G.familyTick = familyTick;
function updateSpouse(e, dt, p, dp, dxp, dzp, day) {
  const F = G.family; let moving = false;
  const hx = F ? F.home.x : e.wx, hz = F ? F.home.z : e.wz;
  e.sleeping = false;
  const foe = nearestHostile(e, 11);
  if (foe) { moveToward(e, e.x - (foe.x - e.x), e.z - (foe.z - e.z), 4.2, dt); return true; }
  if (e.talking > 0) { e.talking -= dt; stop(e, dt); faceTo(e, p.x, p.z, dt); return false; }
  const hd = Math.hypot(hx - e.x, hz - e.z);
  if (F && F.sp.follow && p.alive) {
    if (dp > 3.6) { moveToward(e, p.x, p.z, dp > 10 ? 3.8 : 2.4, dt); moving = true; } else { stop(e, dt); faceTo(e, p.x, p.z, dt); }
    if (dp > 45 && G.isLoaded(Math.floor(p.x), Math.floor(p.z))) { e.x = p.x + 1.5; e.z = p.z + 1.5; e.y = G.topY(Math.floor(e.x), Math.floor(e.z)) + 1.05; e.vy = 0; }
  } else if (day < .38) {
    if (hd > 1.6) { moveToward(e, hx, hz, 2.0, dt); moving = true; } else { e.sleeping = true; stop(e, dt); }
  } else if (G.weather && G.weather.rain > .4 && hd > 4) { moveToward(e, hx, hz, 2.2, dt); moving = true; }
  else {
    e.wander -= dt;
    if (e.wander <= 0) { e.wander = rr(3, 8); const pt = pickWanderPoint(e, hx, hz, 9); e.wtx = pt[0]; e.wtz = pt[1]; e.walking = rand() < .75; }
    if (e.walking && Math.hypot(e.wtx - e.x, e.wtz - e.z) > 1.1 && !dropAhead(e, e.wtx - e.x, e.wtz - e.z)) { moveToward(e, e.wtx, e.wtz, 1.5, dt); moving = true; }
    else { stop(e, dt); if (dp < 5) e.yaw = angTo(e.yaw, Math.atan2(dxp, dzp), 3 * dt); }
  }
  return moving;
}
G.npcLabel = function (e) {
  if (e.type !== 'villager') return G.mobName(e);
  const nm = e.name ? e.name + ' – ' : '';
  if (e.child) {
    const par = e.parent && !e.parent.dead ? e.parent : null;
    return nm + (e.fem ? 'holčička' : 'chlapeček') + (e.famKid ? ' (tvoje dítě)' : par ? ' (dítě: ' + (par.name || 'rodič') + ')' : '');
  }
  const prof = (e.fem ? PROFS_F : PROFS)[e.prof];
  let rel;
  if (e.spouse) rel = e.fem ? 'tvoje manželka' : 'tvůj manžel';
  else if (e.partner && !e.partner.dead) {
    let kids = 0; for (const o of entities) if (o.child && !o.dead && (o.parent === e || o.parent === e.partner)) kids++;
    rel = (e.fem ? 'vdaná za ' : 'ženatý s ') + (e.partner.name || 'partnerem') + (kids ? ', ' + kids + (kids === 1 ? ' dítě' : kids < 5 ? ' děti' : ' dětí') : '');
  } else if (e.prof < 5) rel = e.fem ? 'svobodná' : 'svobodný';
  return nm + prof + (rel ? ' (' + rel + ')' : '');
};

function spawnVillageFolk(v) {
  const key = v.x + ',' + v.z;
  if (VILL_SPAWNED.has(key)) return;
  if (!G.isLoaded(v.x, v.z)) return;
  const rr0 = v.town ? 26 : 8;
  for (const [ox, oz] of [[rr0, rr0], [-rr0, rr0], [rr0, -rr0], [-rr0, -rr0]]) if (!G.isLoaded(v.x + ox, v.z + oz)) return;
  VILL_SPAWNED.add(key);
  const homes = v.builds.filter(b => b.bed);
  const farms = v.builds.filter(b => b.type === 'farm'), smith = v.builds.filter(b => b.type === 'smithy'), pens = v.builds.filter(b => b.type === 'pen');
  const roles = [0, 1, 3, 2, 4, 0, 2, 4, 3, 1];
  const nTown = v.town ? Math.min(20, Math.max(10, homes.length)) : Math.min(10, Math.max(4, homes.length + 2));
  const groundAt = (x, z) => G.topY(Math.floor(x), Math.floor(z)) + 1.01;
  const adults = [], plan = [];
  for (let i = 0; i < nTown; i++) {
    const slot = key + '#a' + i, sr = seeded(slot);
    const prof = roles[i % roles.length];
    const home = homes.length ? homes[i % homes.length] : null;
    let work = null;
    if (prof === 0 && farms.length) work = farms[(i >> 1) % farms.length];
    else if ((prof === 1 || prof === 4) && smith.length) work = smith[0];
    else if (prof === 3 && pens.length) work = pens[0];
    else if (home) work = home;
    const mate = home ? plan.find(q => q.home === home) : null;
    const fem = mate ? !mate.fem : sr() < .5;
    plan.push({ slot, sr, prof, home, work, fem, i });
  }
  for (const q of plan) {
    if (G.family && G.family.sp && G.family.sp.slot === q.slot) continue; // provdala se / přestěhovala k hráči
    const a = rand() * 6.28, d = v.town ? rr(3, 22) : rr(2.5, 6);
    const x = v.x + Math.cos(a) * d + .5, z = v.z + Math.sin(a) * d + .5;
    if (!G.isLoaded(Math.floor(x), Math.floor(z))) continue;
    const sr = q.sr;
    const e = G.spawnMob('villager', x, groundAt(x, z), z, { prof: q.prof, homeB: q.home, workB: q.work, village: v, villageKey: key, wx: v.x, wz: v.z, fam: q.home, fem: q.fem, hairC: Math.floor(sr() * 5), hairS: Math.floor(sr() * 4), skinC: Math.floor(sr() * 3), eyeC: Math.floor(sr() * 3) });
    giveIdentity(e, sr, q.slot, q.fem);
    e.seed = Math.floor(rand() * 1e9);
    adults.push(e);
  }
  // rodiny: dospělí se stejným domovem jsou rodiče, přibydou děti
  const byHome = new Map();
  for (const a of adults) if (a.homeB) { if (!byHome.has(a.homeB)) byHome.set(a.homeB, []); byHome.get(a.homeB).push(a); }
  let hi = 0;
  for (const [home, list] of byHome) {
    hi++;
    if (list.length >= 2) { list[0].partner = list[1]; list[1].partner = list[0]; }
    const ksr = seeded(key + '#kids' + hi);
    const kids = v.town ? Math.floor(ksr() * 3) : (ksr() < .6 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const slot = key + '#c' + hi + '_' + k, sr = seeded(slot), fem = sr() < .5;
      const x = home.in.x + rr(-.8, .8), z = home.in.z + rr(-.8, .8);
      if (!G.isLoaded(Math.floor(x), Math.floor(z))) continue;
      const c = G.spawnMob('villager', x, home.gy + 1.05, z, { child: true, scale: .62, w: .2, h: 1.2, prof: Math.floor(sr() * 5), fem, hairC: Math.floor(sr() * 5), hairS: Math.floor(sr() * 4), skinC: Math.floor(sr() * 3), eyeC: Math.floor(sr() * 3), homeB: home, village: v, villageKey: key, wx: v.x, wz: v.z, parent: list.length ? list[Math.floor(sr() * list.length)] : null, fam: home });
      giveIdentity(c, sr, slot, fem);
      c.seed = Math.floor(rand() * 1e9);
    }
  }
  // složky IZS
  const svc = v.town ? [5, 5, 6, 6, 7, 7, 7] : [7];
  const station = { 5: v.builds.find(b => b.type === 'station'), 6: v.builds.find(b => b.type === 'clinic'), 7: v.builds.find(b => b.type === 'police') };
  let svcN = 0;
  for (const prof of svc) {
    const st = station[prof];
    const a = rand() * 6.28, d = rr(3, 18);
    const x = st ? st.out.x + rr(-.8, .8) : v.x + Math.cos(a) * d + .5, z = st ? st.out.z + rr(-.8, .8) : v.z + Math.sin(a) * d + .5;
    if (!G.isLoaded(Math.floor(x), Math.floor(z))) continue;
    const slot = key + '#s' + (svcN++), sr = seeded(slot), fem = sr() < .5;
    const e = G.spawnMob('villager', x, groundAt(x, z), z, { prof, workB: st || null, village: v, villageKey: key, wx: v.x, wz: v.z, fem, hairC: Math.floor(sr() * 5), hairS: Math.floor(sr() * 4), skinC: Math.floor(sr() * 3), eyeC: Math.floor(sr() * 3) });
    giveIdentity(e, sr, slot, fem);
    e.seed = Math.floor(rand() * 1e9);
  }
  // auta: jezdí po ulicích, služební stojí u svých budov
  if (v.town) {
    const TS = [-36, -18, 0, 18, 36];
    for (let i = 0; i < 4; i++) {
      const axis = rand() < .5 ? 'x' : 'z', S = TS[Math.floor(rand() * 5)], a = rr(-38, 38), sgn = rand() < .5 ? 1 : -1;
      const x = axis === 'x' ? v.x + a : v.x + S + .85 * -sgn, z = axis === 'x' ? v.z + S + .85 * sgn : v.z + a;
      if (!G.isLoaded(Math.floor(x), Math.floor(z))) continue;
      if (Math.abs(a) < 15 && Math.abs(S) < 15) continue;
      const car = G.spawnCar(x, z, 'car', { town: v, axis, sgn, lane: S, villageKey: key, v: 0 });
      car.yaw = axis === 'x' ? (sgn > 0 ? Math.PI / 2 : -Math.PI / 2) : (sgn > 0 ? 0 : Math.PI);
    }
    for (const [t, vt] of [['station', 'fire'], ['clinic', 'ambulance'], ['police', 'police']]) {
      const st = v.builds.find(b => b.type === t); if (!st) continue;
      let dx = st.out.x - st.in.x, dz = st.out.z - st.in.z; const Ld = Math.hypot(dx, dz) || 1; dx /= Ld; dz /= Ld;
      const L = vt === 'fire' ? 4.2 : vt === 'ambulance' ? 3.4 : 3.0, alongX = Math.abs(dz) > .5;
      let done = false;
      for (const k of [4.5, 6, 8]) { for (const m of [0, -3, 3, -5, 5]) {
        if (done) break;
        const x = st.out.x + dx * k - dz * m, z = st.out.z + dz * k + dx * m;
        const y = G.topY(Math.floor(x), Math.floor(z)) + 1.0;
        if (!carFits(x, z, y, alongX, L)) continue;
        const car = G.spawnCar(x, z, vt, { parked: true, villageKey: key, town: v });
        car.yaw = alongX ? Math.PI / 2 : 0; done = true;
      } if (done) break; }
    }
  }
  // golemové
  const ng = v.town ? 3 : 1;
  for (let i = 0; i < ng; i++) {
    const a = rand() * 6.28, d = rr(4, 8), x = v.x + Math.cos(a) * d + .5, z = v.z + Math.sin(a) * d + .5;
    if (G.isLoaded(Math.floor(x), Math.floor(z))) G.spawnMob('golem', x, groundAt(x, z), z, { village: v, villageKey: key });
  }
  // zvířata v ohradě
  for (const pen of pens) {
    const kinds = ['cow', 'cow', 'sheep', 'sheep', 'pig', 'pig', 'chicken', 'chicken'];
    for (const k of kinds) {
      const x = pen.x0 + 1.5 + rand() * (pen.sx - 3), z = pen.z0 + 1.5 + rand() * (pen.sz - 3);
      if (G.isLoaded(Math.floor(x), Math.floor(z))) G.spawnMob(k, x, pen.gy + 1.05, z, { villageKey: key });
    }
  }
}
function villageCheck() {
  const p = P(), REG = W.REG;
  const rx0 = Math.floor((p.x - 120) / REG), rx1 = Math.floor((p.x + 120) / REG), rz0 = Math.floor((p.z - 120) / REG), rz1 = Math.floor((p.z + 120) / REG);
  for (let rx = rx0; rx <= rx1; rx++) for (let rz = rz0; rz <= rz1; rz++) {
    const v = W.getVillage(rx, rz);
    if (v && Math.hypot(v.x - p.x, v.z - p.z) < G.R * 16 - 8) spawnVillageFolk(v);
  }
}
/* ---------- nájezd ve vlnách ---------- */
G.raid = null; let raidChk = 40, raidCool = 120;
/* ---------- zvon a poplach ---------- */
G.ringBell = function (x, y, z) { G.sfx('bell', x, y, z); G.burst(x, y + .3, z, [255, 215, 90], 7, 1.8, .9, 2); };
const RAIDERS = new Set(['pillager', 'vindicator', 'ravager', 'evilgolem']);
let alarmChk = 0, alarmVills = new Set();
function alarmTick(dt) {
  alarmChk -= dt;
  if (alarmChk <= 0) {
    alarmChk = 1; alarmVills = new Set();
    for (const o of entities) if (o.kind === 'mob' && !o.dead && o.village && (o.type === 'villager' || o.type === 'golem')) alarmVills.add(o.village);
    for (const v of alarmVills) {
      let threat = G.raid && G.raid.v === v;
      if (!threat) for (const o of entities) if (o.kind === 'mob' && !o.dead && RAIDERS.has(o.type) && (o.x - v.x) ** 2 + (o.z - v.z) ** 2 < 48 * 48) { threat = true; break; }
      if (threat) { if (!(v.alarmT > 0) && G.player && Math.hypot(v.x - G.player.x, v.z - G.player.z) < 120) G.msg('Ve vesnici zvoní poplašný zvon!', 2600); v.alarmT = Math.max(v.alarmT || 0, 22); }
    }
  }
  for (const v of alarmVills) {
    if (!(v.alarmT > 0)) continue;
    v.alarmT -= dt; v.ringT = (v.ringT || 0) - dt;
    if (v.ringT <= 0) { v.ringT = 2.2; G.ringBell(v.x + .5, (v.gy || 64) + 3.5, v.z + .5); }
  }
}
function villagersOf(v) { let n = 0; for (const o of entities) if (o.type === 'villager' && !o.dead && o.village === v) n++; return n; }
function spawnWave(R) {
  R.wave++;
  const v = R.v, W_ = R.wave;
  const plan = W_ === 1 ? { pillager: 3, vindicator: 1, ravager: 0, captain: false } : W_ === 2 ? { pillager: 3, vindicator: 2, ravager: 0, captain: true } : { pillager: 4, vindicator: 3, ravager: 1, captain: true };
  const a0 = rand() * 6.28, d = rr(36, 46);
  const bx = v.x + Math.cos(a0) * d, bz = v.z + Math.sin(a0) * d;
  let first = true, n = 0;
  for (const [type, cnt] of [['pillager', plan.pillager], ['vindicator', plan.vindicator], ['ravager', plan.ravager]]) for (let i = 0; i < cnt; i++) {
    const x = Math.floor(bx + rr(-5, 5)), z = Math.floor(bz + rr(-5, 5));
    if (!G.isLoaded(x, z)) continue;
    const top = G.topY(x, z); if (top < 1) continue;
    const e = G.spawnMob(type, x + .5, top + 1.02, z + .5, { raid: true, raidV: v, captain: plan.captain && first && type === 'pillager' });
    if (e.captain) { e.hp = e.maxhp = 44; }
    first = false; R.list.push(e); n++;
  }
  R.waveTotal = Math.max(1, n); R.state = 'wave'; R.age = 0;
  G.msg(`Nájezd – vlna ${W_}/${R.waves}!`, 3000); G.sfx('golem');
}
function updateRaid(dt) {
  const p = P(); let R = G.raid;
  if (!R) {
    raidCool -= dt; raidChk -= dt;
    if (raidChk > 0 || raidCool > 0) return; raidChk = 20;
    if (G.dayFactor > .3 || rand() > .22) return;
    let best = null, bd = 100;
    const REG = W.REG;
    for (let rx = Math.floor((p.x - 100) / REG); rx <= Math.floor((p.x + 100) / REG); rx++) for (let rz = Math.floor((p.z - 100) / REG); rz <= Math.floor((p.z + 100) / REG); rz++) {
      const v = W.getVillage(rx, rz); if (!v) continue;
      const d = Math.hypot(v.x - p.x, v.z - p.z);
      if (d < bd && G.isLoaded(v.x, v.z) && villagersOf(v) >= 3) { bd = d; best = v; }
    }
    if (!best) return;
    G.raid = { v: best, wave: 0, waves: 3, list: [], state: 'pause', t: 6, waveTotal: 1 };
    G.msg('Blíží se nájezd na vesnici! Braň ji!', 4500); G.sfx('golem');
    return;
  }
  R.list = R.list.filter(x => !x.dead);
  if (villagersOf(R.v) === 0 && R.state !== 'done') { G.msg('Vesnice padla…', 3500); G.raid = null; raidCool = 400; return; }
  if (R.state === 'wave') {
    R.age = (R.age || 0) + dt;
    if (R.age > 240) { for (const x of R.list) { x.dead = true; G.burst(x.x, x.y + 1, x.z, [200, 200, 200], 6, 2); } R.list = []; }
    if (R.list.length === 0) {
      if (R.wave >= R.waves) {
        G.msg('Nájezd odražen! Vesničané ti děkují.', 4500);
        if (G.addItem) { G.addItem(I.EMERALD, 6 + Math.floor(rand() * 5)); G.refreshUI(); }
        G.sfx('pop'); G.raid = null; raidCool = 360; return;
      }
      R.state = 'pause'; R.t = 8;
    }
  } else { R.t -= dt; if (R.t <= 0) spawnWave(R); }
}
G.updateRaid = updateRaid;
function trySpawnRaid() {
  const p = P(), night = G.dayFactor < .35;
  if (!night) return;
  if (G.raid) return;
  let np = 0, ne = 0; for (const o of entities) { if (o.type === 'pillager') np++; else if (o.type === 'evilgolem') ne++; }
  if (np >= 4) return;
  // 60 % u nejbližší vesnice, jinak náhodně kolem hráče
  let cx = p.x, cz = p.z, near = null, bd = 130;
  const REG = W.REG;
  for (let rx = Math.floor((p.x - 130) / REG); rx <= Math.floor((p.x + 130) / REG); rx++) for (let rz = Math.floor((p.z - 130) / REG); rz <= Math.floor((p.z + 130) / REG); rz++) {
    const v = W.getVillage(rx, rz); if (v) { const d = Math.hypot(v.x - p.x, v.z - p.z); if (d < bd) { bd = d; near = v; } }
  }
  if (near && rand() < .6) { cx = near.x; cz = near.z; }
  for (let at = 0; at < 10; at++) {
    const a = rand() * 6.28, d = near && cx === near.x ? rr(26, 40) : rr(26, 46);
    const x = Math.floor(cx + Math.cos(a) * d), z = Math.floor(cz + Math.sin(a) * d);
    if (!G.isLoaded(x, z) || Math.hypot(x - p.x, z - p.z) < 20) continue;
    const top = G.topY(x, z), g = getB(x, top, z);
    if (top < 1 || W.isWater(g) || W.isLava(g) || g === B.LEAVES || g === B.CACTUS) continue;
    if (SOLID[getB(x, top + 1, z)] || SOLID[getB(x, top + 2, z)]) continue;
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) { const xx = x + rr(-2, 2), zz = z + rr(-2, 2), t2 = G.topY(Math.floor(xx), Math.floor(zz)); if (t2 > 0 && Math.abs(t2 - top) <= 1 && !SOLID[getB(Math.floor(xx), t2 + 1, Math.floor(zz))]) G.spawnMob('pillager', xx, t2 + 1.02, zz); }
    if (ne < 2 && rand() < .22) G.spawnMob('evilgolem', x + .5, top + 1.02, z + 1.5);
    return;
  }
}
function trySpawn() {
  const p = P();
  let n = 0; for (const e of entities) if (e.kind === 'mob' && e.animal && !e.villageKey) n++;
  if (n >= 20) return;
  for (let at = 0; at < 10; at++) {
    const a = rand() * 6.28, d = rr(18, 55);
    const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
    if (!G.isLoaded(x, z)) continue;
    const top = G.topY(x, z);
    if (top < 1 || getB(x, top, z) !== B.GRASS) continue;
    if (SOLID[getB(x, top + 1, z)] || SOLID[getB(x, top + 2, z)]) continue;
    if (W.nearVillage(x, z, 2)) continue;
    const r = rand(), type = r < .2 ? 'cow' : r < .4 ? 'sheep' : r < .58 ? 'pig' : r < .75 ? 'chicken' : r < .83 ? 'horse' : r < .93 ? 'rabbit' : 'wolf';
    const cnt = type === 'chicken' ? 3 : type === 'horse' ? 1 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2);
    const coat = Math.floor(rand() * 4);
    for (let i = 0; i < cnt; i++) {
      const xx = x + rr(-2.5, 2.5), zz = z + rr(-2.5, 2.5), t2 = G.topY(Math.floor(xx), Math.floor(zz));
      if (t2 < 1 || Math.abs(t2 - top) > 1 || getB(Math.floor(xx), t2, Math.floor(zz)) !== B.GRASS) continue;
      G.spawnMob(type, xx, t2 + 1.02, zz, type === 'horse' ? { coat } : {});
    }
    return;
  }
}
G.spawnAnimalsNow = (n) => { for (let i = 0; i < n; i++) trySpawn(); };
G.updateEntities = function (dt) {
  const p = P();
  spawnT -= dt; villT -= dt;
  if (villT <= 0) { villT = 2; villageCheck(); }
  if (spawnT <= 0) { spawnT = 2.5; trySpawn(); }
  raidT -= dt; if (raidT <= 0) { raidT = 9; trySpawnRaid(); }
  updateRaid(dt);
  alarmTick(dt); updateParticles(dt); updateDoors(dt); updateArrows(dt); updateBuilders(dt); incidentsTick(dt); G.socialTick(dt); familyTick();
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    if (e.dead) { if (e.group) scene.remove(e.group); if (e.mesh) scene.remove(e.mesh); entities.splice(i, 1); continue; }
    const dist = Math.hypot(e.x - p.x, e.z - p.z);
    if (e.kind === 'mob') {
      if (e.villageKey) {
        if (dist > (G.R + 4) * 16) {
          e.dead = true;
          let left = false; for (const o of entities) if (o !== e && o.villageKey === e.villageKey && !o.dead) left = true;
          if (!left) VILL_SPAWNED.delete(e.villageKey);
          continue;
        }
      } else if (e.hostile && (e.raid ? dist > 170 : (dist > 100 || (G.dayFactor > .65 && dist > 26 && rand() < dt * .2)))) { e.dead = true; continue; }
      else if (e.animal && !e.owner && !e.rider && (dist > 110 || (dist > 70 && rand() < dt * .03))) { e.dead = true; continue; }
      if (!G.isLoaded(Math.floor(e.x), Math.floor(e.z)) || dist > 90) continue;
      updateMob(e, dt);
      if (e.y < -10) e.dead = true;
    } else if (e.kind === 'item') {
      if (!G.isLoaded(Math.floor(e.x), Math.floor(e.z))) { e.mesh.position.set(e.x, e.y, e.z); continue; }
      updateItem(e, dt);
    }
  }
};
})();
