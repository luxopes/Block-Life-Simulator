/* ===========================================================
   furniture.js – nábytek: stůl, židle, pohovka, knihovna, skříň, lampa, květina, kuchyňská linka
   Kolizi, těžení a ukládání řeší neviditelný blok B.FURN (99); vzhled jsou 3D modely z krabic.
   Záznamy žijí v mapě G.furn, ukládají se spolu se světem.
   =========================================================== */
(function () {
'use strict';
const { B, I, SOLID, EMIT } = W;
const getB = G.getB, scene = G.scene;
const FURN = G.furn = new Map();
const key = (x, y, z) => x + ',' + y + ',' + z;
G.furnDone = new Set();

/* ---------- textury ---------- */
const TC = {};
const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function tex(name, r, g, b, kind, seed) {
  if (TC[name]) return TC[name];
  return TC[name] = TEX.make(16, 16, (x, y, rnd) => {
    let k = (rnd() - .5) * 12;
    if (kind === 'wood') k += Math.sin(y * .8 + Math.sin(x * .5 + seed) * 2) * 9 + (x % 8 === 0 ? -14 : 0);
    else if (kind === 'fabric') k += ((x + y) & 1) * 7 - 3 + (((x >> 2) + (y >> 2)) & 1) * 3;
    else if (kind === 'speck') k += rnd() < .12 ? 30 : 0;
    else if (kind === 'metal') k += (y % 4 === 0 ? 10 : 0) + Math.sin(x * .6) * 4;
    else if (kind === 'leaf') k += rnd() < .25 ? -26 : rnd() > .85 ? 24 : 0;
    else if (kind === 'flat') k *= .35;
    return [clamp(r + k), clamp(g + k), clamp(b + k), 255];
  }, seed || 1);
}
const PAL = {
  oak: () => tex('oak', 178, 134, 82, 'wood', 1), walnut: () => tex('walnut', 96, 62, 40, 'wood', 2), white: () => tex('white', 228, 226, 218, 'wood', 3),
  sofa: () => tex('sofa', 74, 104, 126, 'fabric', 4), sofaD: () => tex('sofaD', 56, 82, 104, 'fabric', 5), cushion: () => tex('cushion', 196, 120, 84, 'fabric', 6),
  metal: () => tex('metal', 150, 152, 160, 'metal', 7), dark: () => tex('dark', 38, 36, 40, 'flat', 8), granite: () => tex('granite', 62, 64, 70, 'speck', 9),
  terra: () => tex('terra', 178, 94, 62, 'flat', 10), soil: () => tex('soil', 70, 50, 36, 'flat', 11), leaf: () => tex('leaf', 56, 124, 50, 'leaf', 12), leaf2: () => tex('leaf2', 86, 152, 62, 'leaf', 13),
  red: () => tex('red', 196, 56, 52, 'wood', 16), blue: () => tex('blue', 54, 104, 190, 'wood', 17), yellow: () => tex('yellow', 236, 188, 54, 'wood', 18), sand: () => tex('sand', 226, 208, 150, 'speck', 19), rope: () => tex('rope', 150, 120, 80, 'fabric', 20),
  cream: () => tex('cream', 214, 208, 190, 'wood', 14), glass: () => tex('glass', 170, 205, 225, 'flat', 15)
};
const BOOKS = [[150, 40, 40], [40, 70, 130], [40, 110, 70], [190, 150, 50], [110, 60, 120], [206, 204, 190], [70, 70, 76], [160, 90, 40]];

/* ---------- pomocné stavění modelů ---------- */
function mkMat(g, name, glow) {
  const m = new THREE.MeshBasicMaterial(glow ? { color: 0xffd9a0 } : { map: PAL[name]() });
  if (glow) g.userData.glow.push(m); else g.userData.mats.push(m);
  return m;
}
function bx(g, m, w, h, d, x, y, z, ry) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z); if (ry) mesh.rotation.y = ry; g.add(mesh); return mesh;
}
function bookRow(g, rnd, y, h0, x0, x1, z, depth) {
  let x = x0;
  while (x < x1 - .06) {
    const w = .05 + rnd() * .05, h = h0 * (.72 + rnd() * .28), c = BOOKS[Math.floor(rnd() * BOOKS.length)];
    if (x + w > x1) break;
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255) }); mat.userData = { tint: c };
    g.userData.mats.push(mat);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat); mesh.position.set(x + w / 2, y + h / 2, z); g.add(mesh);
    x += w + .004;
    if (rnd() < .08) x += .1; // mezera
  }
}


/* ---------- cedule a nápisy ---------- */
const STY = {
  wood: ['#b08850', '#4a3418', '#6a4a2c'], red: ['#b82828', '#ffffff', '#ffffff'], blue: ['#2c4f9e', '#ffffff', '#ffffff'], green: ['#2f7a3a', '#ffffff', '#ffffff'],
  white: ['#f0f0ee', '#c42a2a', '#c42a2a'], stone: ['#7a7a80', '#f0f0f0', '#d8d8d8'], orange: ['#d9822b', '#fff6e0', '#fff6e0'], plate: ['#c2272d', '#ffffff', '#ffffff']
};
const STEX = {};
function signTex(text, style, cross) {
  const k = text + '|' + style + (cross ? 'x' : ''); if (STEX[k]) return STEX[k];
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const c = cv.getContext('2d');
  const st = STY[style] || STY.wood;
  c.fillStyle = st[0]; c.fillRect(0, 0, 256, 96);
  c.strokeStyle = st[2]; c.lineWidth = 6; c.strokeRect(5, 5, 246, 86);
  if (style === 'wood') { c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2; for (let y = 18; y < 96; y += 16) { c.beginPath(); c.moveTo(8, y); c.lineTo(248, y); c.stroke(); } }
  c.fillStyle = st[1]; c.textAlign = 'center'; c.textBaseline = 'middle';
  let size = 54; c.font = 'bold ' + size + 'px sans-serif';
  const tw = () => c.measureText(text).width, maxW = cross ? 160 : 224;
  while (tw() > maxW && size > 14) { size -= 2; c.font = 'bold ' + size + 'px sans-serif'; }
  c.fillText(text, cross ? 150 : 128, 52);
  if (cross) { c.fillStyle = '#d02828'; c.fillRect(20, 36, 44, 14 + 10); c.fillRect(31, 25, 22, 46); }
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  return STEX[k] = t;
}
const DEC = []; G.decals = DEC;
const decDone = new Set();
function addDecal(x, y, z, dx, dz, w, h, text, style, cross) {
  const front = new THREE.MeshBasicMaterial({ map: signTex(text, style, cross) }), side = new THREE.MeshBasicMaterial({ color: 0x5a4028 }); side.userData = { tint: [90, 64, 40] };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, .05), [side, side, side, side, front, side]);
  mesh.position.set(x, y, z); mesh.rotation.y = Math.atan2(dx, dz); scene.add(mesh);
  DEC.push({ mesh, mats: [front, side], x, y, z }); return mesh;
}
G.addDecal = addDecal;
const BUILD_SIGNS = {
  station: ['HASIČI', 'red', 3.6, .95], clinic: ['ZÁCHRANKA', 'white', 3.8, .95, true], police: ['POLICIE', 'blue', 3.4, .95], playground: ['HŘIŠTĚ', 'green', 3.0, .8],
  church: ['KOSTEL', 'stone', 3.0, .8], market: ['TRH', 'orange', 2.0, .8], smithy: ['KOVÁRNA', 'stone', 3.0, .8]
};
function addPostBoard(x, z, dx, dz, w, h, text, style, cross, gy) {
  const g = new THREE.Group(), front = new THREE.MeshBasicMaterial({ map: signTex(text, style, cross) }), wood = new THREE.MeshBasicMaterial({ color: 0x5a4028 }); wood.userData = { tint: [90, 64, 40] };
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, .08), [wood, wood, wood, wood, front, front]); board.position.set(0, 1.55 + h / 2, 0); g.add(board);
  for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.0, .12), wood); pole.position.set(sx * (w / 2 - .1), 1.0, -.02); g.add(pole); }
  g.position.set(x, gy + 1, z); g.rotation.y = Math.atan2(dx, dz); scene.add(g);
  DEC.push({ mesh: g, mats: [front, wood], x, y: gy + 2, z });
  g.traverse((o) => { if (o.geometry) o.geometry.__dec = 1; });
}
function decorateBuilding(v, bd, idx, vIdx) {
  if (!bd.in || !bd.out) return;
  let dx = bd.out.x - bd.in.x, dz = bd.out.z - bd.in.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  const mx = (bd.in.x + bd.out.x) / 2 + dx * .5 + dx * .03, mz = (bd.in.z + bd.out.z) / 2 + dz * .5 + dz * .03, px = -dz, pz = dx;
  const S = BUILD_SIGNS[bd.type];
  if (S) addPostBoard(bd.out.x + dx * .9 + px * (S[2] / 2 + 1.1), bd.out.z + dz * .9 + pz * (S[2] / 2 + 1.1), dx, dz, S[2], S[3], S[0], S[1], S[4], bd.gy);
  if (bd.type === 'house' || bd.type === 'large' || bd.type === 'tall') {
    const no = (Math.floor(W.hash3(v.x, 5, v.z, 12) * 180) + 1 + vIdx * 2);
    addDecal(mx + px * 1.2, bd.gy + 1.9, mz + pz * 1.2, dx, dz, .62, .3, 'č.p. ' + no, 'plate');
  }
}

/* ---------- typy ---------- */
const TYPES = {
  table: {
    item: I.F_TABLE, name: 'Stůl', h: 1, build(g, M) {
      const o = M('oak'), w = M('walnut');
      bx(g, o, .96, .07, .96, 0, .72, 0); bx(g, w, .86, .06, .86, 0, .66, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, w, .08, .66, .08, sx * .4, 0, sz * .4);
    }
  },
  chair: {
    item: I.F_CHAIR, name: 'Židle', h: 1, build(g, M) {
      const o = M('oak'), w = M('walnut');
      bx(g, o, .5, .06, .5, 0, .42, .02);
      for (const sx of [-1, 1]) { bx(g, w, .06, .42, .06, sx * .22, 0, .22); bx(g, w, .06, .95, .06, sx * .22, 0, -.2); }
      bx(g, o, .5, .09, .05, 0, .82, -.2); bx(g, o, .5, .09, .05, 0, .66, -.2); bx(g, o, .5, .09, .05, 0, .5, -.2);
    }
  },
  sofa: {
    item: I.F_SOFA, name: 'Pohovka', h: 1, build(g, M) {
      const f = M('sofa'), d = M('sofaD'), c = M('cushion'), w = M('walnut');
      bx(g, w, .9, .1, .74, 0, 0, 0, 0); bx(g, f, .96, .22, .8, 0, .1, 0);
      bx(g, d, .96, .55, .22, 0, .1, -.29);
      bx(g, f, .74, .14, .52, 0, .32, .1); bx(g, f, .74, .3, .12, 0, .42, -.12);
      for (const sx of [-1, 1]) bx(g, d, .12, .34, .8, sx * .42, .1, 0);
      bx(g, c, .22, .22, .08, -.22, .46, -.12, .2);
    }
  },
  shelf: {
    item: I.F_SHELF, name: 'Knihovna', h: 2, store: true, build(g, M, rnd) {
      const w = M('walnut'), o = M('oak');
      for (const sx of [-1, 1]) bx(g, w, .07, 1.95, .42, sx * .465, 0, 0);
      bx(g, w, .86, 1.9, .04, 0, .02, -.19);
      for (const y of [0, .5, .98, 1.46, 1.9]) bx(g, o, .9, .05, .42, 0, y, 0);
      for (const y of [.05, .53, 1.01, 1.49]) if (y < 1.7) bookRow(g, rnd, y, .36, -.42, .42, -.03, .24);
    }
  },
  ward: {
    item: I.F_WARD, name: 'Skříň', h: 2, store: true, build(g, M) {
      const w = M('walnut'), o = M('oak'), m = M('metal');
      bx(g, w, 1, 1.95, .56, 0, 0, 0); bx(g, o, 1.04, .06, .6, 0, 1.92, 0);
      for (const sx of [-1, 1]) bx(g, o, .46, 1.78, .03, sx * .24, .08, .29);
      bx(g, w, .02, 1.78, .04, 0, .08, .29);
      for (const sx of [-1, 1]) bx(g, m, .035, .18, .04, sx * .07, .9, .31);
    }
  },
  lamp: {
    item: I.F_LAMP, name: 'Stojací lampa', h: 2, light: 13, build(g, M) {
      const m = M('metal'), d = M('dark');
      bx(g, d, .34, .04, .34, 0, 0, 0); bx(g, m, .05, 1.42, .05, 0, .04, 0);
      const sh = bx(g, mkMat(g, null, true), .42, .32, .42, 0, 1.46, 0);
      bx(g, d, .3, .03, .3, 0, 1.42, 0);
    }
  },
  plant: {
    item: I.F_PLANT, name: 'Květina v květináči', h: 1, build(g, M, rnd) {
      const t = M('terra'), s = M('soil'), l1 = M('leaf'), l2 = M('leaf2');
      bx(g, t, .34, .26, .34, 0, 0, 0); bx(g, t, .4, .05, .4, 0, .24, 0); bx(g, s, .3, .02, .3, 0, .29, 0);
      for (let i = 0; i < 9; i++) {
        const a = rnd() * 6.28, r = rnd() * .12, h = .2 + rnd() * .38;
        bx(g, i & 1 ? l1 : l2, .2 + rnd() * .1, h, .06, Math.cos(a) * r, .3 + rnd() * .1, Math.sin(a) * r, rnd() * 3.14);
      }
    }
  },

  swing: {
    item: I.F_SWING, name: 'Houpačka', h: 2, build(g, M) {
      const w = M('walnut'), r = M('red'), ro = M('rope');
      for (const sx of [-1, 1]) { bx(g, w, .08, 1.9, .08, sx * .46, 0, .3, 0); bx(g, w, .08, 1.9, .08, sx * .46, 0, -.3, 0); }
      bx(g, w, .06, .06, .72, -.46, 1.86, 0); bx(g, w, .06, .06, .72, .46, 1.86, 0);
      bx(g, w, 1.0, .1, .1, 0, 1.9, 0);
      for (const sx of [-.16, .16]) bx(g, ro, .02, 1.1, .02, sx, .62, 0);
      bx(g, r, .44, .05, .2, 0, .6, 0);
    }
  },
  slide: {
    item: I.F_SLIDE, name: 'Skluzavka', h: 2, build(g, M) {
      const b = M('blue'), y = M('yellow'), w = M('walnut');
      for (const sx of [-1, 1]) bx(g, w, .07, 1.8, .07, sx * .36, 0, -.36);
      bx(g, y, .86, .08, .3, 0, 1.4, -.34);
      for (let i = 0; i < 6; i++) bx(g, b, .66, .06, .22, 0, 1.28 - i * .22, -.06 + i * .14, 0).rotation.x = .0;
      for (let i = 0; i < 5; i++) { const s = bx(g, b, .66, .05, .3, 0, 1.2 - i * .2 - .02, .0 + i * .18); s.rotation.x = -.52; }
      for (const sx of [-1, 1]) bx(g, y, .04, .36, .9, sx * .35, .1, .35).rotation.x = 0;
      for (let k = 0; k < 6; k++) bx(g, w, .5, .04, .08, 0, .22 + k * .22, -.42 - 0);
    }
  },
  seesaw: {
    item: I.F_SEESAW, name: 'Houpačka na prkně', h: 1, build(g, M) {
      const w = M('walnut'), r = M('red'), y = M('yellow');
      bx(g, w, .1, .3, .3, 0, 0, 0);
      const plank = bx(g, r, 1.0, .06, .22, 0, .3, 0); plank.rotation.z = .16; plank.position.y = .33;
      bx(g, y, .08, .18, .08, -.38, .36, .0); bx(g, y, .08, .18, .08, .38, .26, 0);
    }
  },
  sandbox: {
    item: I.F_SANDBOX, name: 'Pískoviště', h: 1, build(g, M, rnd) {
      const w = M('oak'), s = M('sand'), b = M('blue');
      for (const sz of [-1, 1]) { bx(g, w, .98, .22, .08, 0, 0, sz * .45); bx(g, w, .08, .22, .98, sz * .45, 0, 0); }
      bx(g, s, .86, .17, .86, 0, 0, 0);
      bx(g, b, .16, .1, .16, .2, .17, .1); bx(g, M('red'), .12, .06, .12, -.18, .17, -.2);
    }
  },
  sign: {
    item: I.F_SIGN, name: 'Cedule', h: 1, build(g, M, rnd, rec) {
      const w = M('walnut'), txt = (rec && rec.txt) || 'Cedule';
      bx(g, w, .09, .95, .09, 0, 0, 0);
      const front = new THREE.MeshBasicMaterial({ map: signTex(txt, 'wood') }), side = M('walnut');
      g.userData.mats.push(front);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.92, .46, .06), [side, side, side, side, front, side]);
      mesh.position.set(0, .78, .07); g.add(mesh);
    }
  },
  counter: {
    item: I.F_COUNTER, name: 'Kuchyňská linka', h: 1, store: true, build(g, M) {
      const c = M('cream'), gr = M('granite'), m = M('metal'), d = M('dark');
      bx(g, d, .96, .1, .6, 0, 0, -.01); bx(g, c, .98, .78, .62, 0, .1, 0);
      bx(g, gr, 1, .06, .66, 0, .88, 0);
      bx(g, m, .02, .72, .02, 0, .12, .32); bx(g, m, .02, .14, .02, -.2, .5, .33); bx(g, m, .02, .14, .02, .2, .5, .33);
      for (const [x, z] of [[-.2, -.1], [.2, -.1], [-.2, .15], [.2, .15]]) bx(g, d, .17, .012, .17, x, .94, z);
    }
  }
};
G.FURN_TYPES = TYPES;
G.FURN_BY_ITEM = {}; for (const t in TYPES) G.FURN_BY_ITEM[TYPES[t].item] = t;

function buildGroup(rec) {
  const T = TYPES[rec.t], g = new THREE.Group();
  g.userData = { mats: [], glow: [] };
  const rnd = W.mulberry(Math.floor(W.hash3(rec.x, rec.y, rec.z, 77) * 4294967296));
  T.build(g, (n) => mkMat(g, n), rnd, rec);
  g.position.set(rec.x + .5, rec.y, rec.z + .5); g.rotation.y = (rec.r || 0) * Math.PI / 2;
  scene.add(g); rec.g = g; rec.bl = 0; rec.blT = Math.random() * 1.5;
  return g;
}
function disposeGroup(rec) {
  const g = rec.g; if (!g) return;
  scene.remove(g);
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  for (const m of g.userData.mats.concat(g.userData.glow)) m.dispose();
  rec.g = null;
}

/* ---------- API ---------- */
G.furnPlace = function (x, y, z, type, rot, txt) {
  const T = TYPES[type]; if (!T) return false;
  const k0 = key(x, y, z), rec = { t: type, r: rot | 0, x, y, z, h: T.h, txt };
  FURN.set(k0, rec);
  if (T.h === 2) FURN.set(key(x, y + 1, z), { top: true, base: k0, x, y: y + 1, z });
  buildGroup(rec);
  G.setBlock(x, y, z, B.FURN); if (T.h === 2) G.setBlock(x, y + 1, z, B.FURN);
  if (T.store && !G.chests.has(k0)) G.chests.set(k0, new Array(27).fill(null));
  return true;
};
G.furnBase = function (x, y, z) {
  const r = FURN.get(key(x, y, z)); if (!r) return null;
  return r.top ? FURN.get(r.base) : r;
};
G.furnName = (x, y, z) => { const r = G.furnBase(x, y, z); return r ? TYPES[r.t].name + (TYPES[r.t].store ? ' (pravé tl.)' : '') : 'Nábytek'; };
G.furnRemove = function (x, y, z) {
  const base = G.furnBase(x, y, z); if (!base) { G.setBlock(x, y, z, 0); return null; }
  const T = TYPES[base.t];
  disposeGroup(base);
  FURN.delete(key(base.x, base.y, base.z)); if (T.h === 2) FURN.delete(key(base.x, base.y + 1, base.z));
  G.setBlock(base.x, base.y, base.z, 0); if (T.h === 2) G.setBlock(base.x, base.y + 1, base.z, 0);
  return base.t;
};
G.furnLight = function (x, y, z) { const r = FURN.get(key(x, y, z)); if (!r) return 0; const b = r.top ? FURN.get(r.base) : r; return (b && TYPES[b.t].light) || 0; };
G.furnData = () => { const out = []; for (const r of FURN.values()) if (!r.top) out.push({ x: r.x, y: r.y, z: r.z, t: r.t, r: r.r, txt: r.txt }); return out; };
G.furnLoad = function (list) {
  for (const d of list || []) {
    if (!TYPES[d.t]) continue;
    const rec = { t: d.t, r: d.r | 0, x: d.x, y: d.y, z: d.z, h: TYPES[d.t].h, txt: d.txt };
    FURN.set(key(d.x, d.y, d.z), rec);
    if (rec.h === 2) FURN.set(key(d.x, d.y + 1, d.z), { top: true, base: key(d.x, d.y, d.z), x: d.x, y: d.y + 1, z: d.z });
    buildGroup(rec);
  }
};
G.furnClear = function () { for (const r of FURN.values()) disposeGroup(r); FURN.clear(); G.furnDone.clear(); for (const d of DEC) { scene.remove(d.mesh); d.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } DEC.length = 0; decDone.clear(); };
G.signSet = function (rec, txt) { rec.txt = txt; disposeGroup(rec); buildGroup(rec); };

/* ---------- osvětlení modelů ---------- */
function blockLight(x, y, z) {
  let best = 0;
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) for (let dy = -3; dy <= 4; dy++) {
    const id = getB(x + dx, y + dy, z + dz); if (!id) continue;
    let e = EMIT[id]; if (id === B.FURN) e = G.furnLight(x + dx, y + dy, z + dz);
    if (!e) continue;
    const lvl = e - 2 * (Math.abs(dx) + Math.abs(dy) + Math.abs(dz));
    if (lvl > best) best = lvl;
  }
  return best;
}
G.furnUpdate = function (dt) {
  const p = G.player; if (!p) return;
  const df = G.dayFactor === undefined ? 1 : G.dayFactor;
  for (const d of DEC) { const dd = (d.x - p.x) ** 2 + (d.z - p.z) ** 2; d.mesh.visible = dd < 100 * 100; if (!d.mesh.visible) continue; const L = G.skyExposed(Math.floor(d.x), Math.floor(d.y), Math.floor(d.z)) ? .35 + .65 * df : .55; for (const m of d.mats) { const t = m.userData && m.userData.tint; if (t) m.color.setRGB(t[0] / 255 * L, t[1] / 255 * L, t[2] / 255 * L); else m.color.setRGB(L, L, L); } }
  if (!FURN.size) return;
  for (const r of FURN.values()) {
    if (r.top || !r.g) continue;
    const d2 = (r.x + .5 - p.x) ** 2 + (r.z + .5 - p.z) ** 2;
    const vis = d2 < 90 * 90; r.g.visible = vis; if (!vis) continue;
    r.blT -= dt;
    if (r.blT <= 0) { r.blT = 1.4 + Math.random() * .4; r.bl = blockLight(r.x, r.y, r.z); }
    const exposed = G.skyExposed(r.x, r.y + 2, r.z);
    const sky = exposed ? .3 + .7 * df : .1 + .4 * df;
    const L = Math.min(1, Math.max(sky, .045 + .955 * Math.pow(Math.max(0, r.bl) / 15, 1.35)) * .94);
    for (const m of r.g.userData.mats) { const t = m.userData && m.userData.tint; if (t) m.color.setRGB(t[0] / 255 * L, t[1] / 255 * L, t[2] / 255 * L); else m.color.setRGB(L, L, L); }
  }
};

/* ---------- nábytek v domech vesnic ---------- */
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // rot 0..3 → směr „předku“
const rotOf = (dx, dz) => Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 0 : 2);
function floorY(x, z, gy) {
  for (let y = gy + 1; y <= gy + 4; y++) if (getB(x, y, z) === 0 && SOLID[getB(x, y - 1, z)]) return y;
  return -1;
}
function furnishHouse(v, bd, idx) {
  const fr = W.frameOf(bd), rnd = W.mulberry(Math.floor(W.hash3(v.x, v.z, idx, 91) * 4294967296));
  const cx = bd.x0 + bd.sx / 2, cz = bd.z0 + bd.sz / 2, La = fr.La, Lb = fr.Lb;
  const used = new Set();
  const put = (a, b, type, face) => {
    if (a < 1 || b < 1 || a > La - 2 || b > Lb - 2) return false;
    const [x, z] = fr.wv(a, b), k = x + ',' + z; if (used.has(k)) return false;
    const y = floorY(x, z, bd.gy); if (y < 0) return false;
    if (TYPES[type].h === 2 && getB(x, y + 1, z) !== 0) return false;
    let dx = cx - (x + .5), dz = cz - (z + .5);
    if (face) { const [fx, fz] = fr.wv(face[0], face[1]); dx = fx - x; dz = fz - z; }
    used.add(k); return G.furnPlace(x, y, z, type, rotOf(dx, dz));
  };
  if (bd.bed) { const bx0 = Math.floor(bd.bed.x), bz0 = Math.floor(bd.bed.z); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) used.add((bx0 + dx) + ',' + (bz0 + dz)); }
  const am = La >> 1, bm = Lb >> 1;
  put(am, bm, 'table');
  put(am + 1, bm, 'chair', [am, bm]);
  if (La >= 7) put(am - 1, bm, 'chair', [am, bm]);
  put(1, Lb - 2, 'shelf');
  put(La - 2, Lb - 2, 'ward');
  put(La - 2, 1, 'lamp');
  put(1, 1, 'plant');
  if (bd.type === 'large') { put(1, 2, 'sofa', [am, 2]); put(La - 2, 3, 'counter'); put(1, Lb - 4, 'plant'); }
  else if (rnd() < .6) put(La - 2, 2, 'counter');
}
let vt = 0;
G.furnVillages = function (dt) {
  vt -= dt; if (vt > 0) return; vt = 2.2;
  const p = G.player, REG = W.REG;
  for (let rx = Math.floor((p.x - 100) / REG); rx <= Math.floor((p.x + 100) / REG); rx++) for (let rz = Math.floor((p.z - 100) / REG); rz <= Math.floor((p.z + 100) / REG); rz++) {
    const v = W.getVillage(rx, rz); if (!v) continue;
    v.builds.forEach((bd, i) => {
      const dk = v.x + ',' + v.z + ',' + i;
      if (!decDone.has(dk) && bd.out && G.isLoaded(Math.floor(bd.out.x), Math.floor(bd.out.z)) && G.isLoaded(Math.floor(bd.in.x), Math.floor(bd.in.z))) { decDone.add(dk); decorateBuilding(v, bd, i, i); }
      if (bd.type === 'playground') {
        const k = v.x + ',' + v.z + ',' + i; if (G.furnDone.has(k)) return;
        if (!G.isLoaded(bd.x0, bd.z0) || !G.isLoaded(bd.x0 + bd.sx - 1, bd.z0 + bd.sz - 1)) return;
        G.furnDone.add(k);
        for (const f of W.playPositions(bd)) if (!FURN.has(key(f.x, f.y, f.z)) && G.getB(f.x, f.y, f.z) === 0) G.furnPlace(f.x, f.y, f.z, f.t, f.r);
        return;
      }
      if (bd.type !== 'house' && bd.type !== 'large' && bd.type !== 'tall') return;
      const k = v.x + ',' + v.z + ',' + i; if (G.furnDone.has(k)) return;
      if (!G.isLoaded(bd.x0, bd.z0) || !G.isLoaded(bd.x0 + bd.sx - 1, bd.z0 + bd.sz - 1)) return;
      G.furnDone.add(k); furnishHouse(v, bd, i);
    });
  }
};
})();
