/* ===========================================================
   tex.js – procedurální textury (atlas bloků, ikony předmětů, textury mobů)
   =========================================================== */
(function () {
'use strict';
const { B, I, T, BL, hash3 } = W;
const TEX = {};
window.TEX = TEX;

/* ---------- atlas ---------- */
// Všechna pixelová data držíme v paměti (bez čtení z canvasu – některé prohlížeče, např. Firefox
// s ochranou proti sledování, výsledek čtení z canvasu zašumí a textury se pak rozsypou).
const ATLAS = { data: new Uint8ClampedArray(128 * 256 * 4), w: 128 };
TEX.dataTexture = (data, w, h) => {
  const f = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) f.set(data.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  const t = new THREE.DataTexture(f, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
};

const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function j(r, g, b, v, rnd, a) { const k = (rnd() - .5) * v; return [clamp(r + k), clamp(g + k), clamp(b + k), a === undefined ? 255 : a]; }

function paint(target, ox, oy, size, seed, fn) {
  const rnd = W.mulberry(seed * 977 + 13);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = fn(x, y, rnd);
    const i = ((oy + y) * target.w + ox + x) * 4;
    target.data[i] = c[0]; target.data[i + 1] = c[1]; target.data[i + 2] = c[2]; target.data[i + 3] = c[3] === undefined ? 255 : c[3];
  }
}
function tile(idx, fn) { paint(ATLAS, (idx % 8) * 16, (idx >> 3) * 16, 16, idx, fn); }
let atlasTexture = null;
TEX.atlasTexture = () => atlasTexture || (atlasTexture = TEX.dataTexture(ATLAS.data, 128, 256));
const hh = (x, y, s) => hash3(x, y, 0, s);

tile(T.ASPHALT, (x, y, r) => { const k = hh(x, y, 91); const c = j(54, 55, 60, 10, r); if (k > .93) { c[0] += 22; c[1] += 22; c[2] += 22; } return c; });
const asphaltLine = (alongX) => (x, y, r) => { const u = alongX ? x : y, w = alongX ? y : x; if ((w === 7 || w === 8) && u < 10) return j(228, 228, 220, 8, r); return j(54, 55, 60, 10, r); };
tile(T.LINE_X, asphaltLine(true)); tile(T.LINE_Z, asphaltLine(false));
tile(T.CONCRETE, (x, y, r) => { const seam = x === 0 || y === 0 ? -20 : 0; return j(172 + seam, 172 + seam, 170 + seam, 9, r); });
tile(T.CONCRETE_D, (x, y, r) => { const seam = x === 0 || y === 0 ? -16 : 0; return j(98 + seam, 100 + seam, 106 + seam, 8, r); });
tile(T.MGLASS, (x, y, r) => { const edge = x === 0 || y === 0 || x === 15 || y === 15; if (edge) return [70, 92, 112, 235]; if ((x === y + 2 || x === y + 3) && x > 3 && x < 12) return [180, 220, 240, 150]; return [48, 98, 132, 150]; });
tile(T.STEEL, (x, y, r) => { const rivet = (x === 2 || x === 13) && (y === 2 || y === 13); if (rivet) return [200, 204, 210, 255]; const b = y % 4 === 0 ? 14 : 0; return j(130 + b, 134 + b, 142 + b, 7, r); });
tile(T.PANEL, (x, y, r) => { const seam = x === 0 || y === 0 || x === 8 || y === 8 ? -26 : 0; return j(236 + seam, 236 + seam, 232 + seam, 5, r); });
tile(T.SIDEWALK, (x, y, r) => { const seam = x % 8 === 0 || y % 8 === 0 ? -34 : 0; const b = hh(x >> 3, y >> 3, 93) * 14; return j(160 + b + seam, 158 + b + seam, 154 + b + seam, 8, r); });
tile(T.GRASS_TOP, (x, y, r) => j(104, 168, 62, 30, r));
tile(T.GRASS_SIDE, (x, y, r) => y < 3 + (hh(x, 0, 5) < .5 ? 1 : 0) ? j(104, 168, 62, 30, r) : j(134, 96, 67, 28, r));
tile(T.DIRT, (x, y, r) => j(134, 96, 67, 30, r));
tile(T.STONE, (x, y, r) => { const b = hh(x >> 1, y >> 1, 3) * 24; return j(118 + b - 10, 118 + b - 10, 120 + b - 10, 14, r); });
tile(T.COBBLE, (x, y, r) => {
  const row = y >> 2, off = (row & 1) * 2, cx = (x + off) >> 2;
  let g = 95 + hh(cx, row, 8) * 50;
  if (((x + off) & 3) === 0 || (y & 3) === 0) g -= 30;
  return j(g, g, g + 2, 10, r);
});
tile(T.SAND, (x, y, r) => j(221, 207, 152, 16, r));
tile(T.LOG_SIDE, (x, y, r) => { const v = 92 + ((x * 7) % 5) * 5 + (hh(x, 0, 11) * 14); return j(v, v * .74, v * .45, 10, r); });
tile(T.LOG_TOP, (x, y, r) => {
  const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
  if (d > 6.5) return j(92, 68, 40, 10, r);
  return Math.floor(d) % 2 ? j(150, 118, 70, 10, r) : j(176, 142, 88, 10, r);
});
tile(T.LEAVES, (x, y, r) => { const b = hh(x, y, 4); return b < .3 ? j(40, 100, 30, 20, r) : b > .75 ? j(86, 160, 56, 20, r) : j(62, 130, 44, 20, r); });
tile(T.PLANKS, (x, y, r) => {
  let g = 1;
  if ((y & 3) === 3) g = .78;
  if ((y >> 2) % 2 === 0 ? x === 7 : x === 0) g = .8;
  return j(172 * g, 136 * g, 84 * g, 12, r);
});
tile(T.WATER, (x, y, r) => j(46 + (hh(x >> 1, y >> 1, 2) * 18), 100 + hh(x >> 1, y >> 1, 3) * 20, 205, 8, r, 175));
tile(T.SNOW, (x, y, r) => j(243, 247, 250, 8, r));
tile(T.SNOW_SIDE, (x, y, r) => y < 4 + (hh(x, 0, 9) < .4 ? 1 : 0) ? j(243, 247, 250, 8, r) : j(134, 96, 67, 28, r));
tile(T.BEDROCK, (x, y, r) => { const g = 40 + hh(x >> 1, y >> 1, 12) * 50; return j(g, g, g, 12, r); });
function ore(col) { return (x, y, r) => { const b = hh(x >> 1, y >> 1, 3) * 24; const o = hh(x >> 1, y >> 1, 77) < .32; return o ? j(col[0], col[1], col[2], 20, r) : j(118 + b - 10, 118 + b - 10, 120 + b - 10, 14, r); }; }
tile(T.COAL, ore([32, 32, 34]));
tile(T.IRON, ore([214, 172, 140]));
tile(T.GRAVEL, (x, y, r) => { const g = 105 + hh(x, y, 14) * 70; return [g, g * .97, g * .93, 255]; });
tile(T.GLASS, (x, y, r) => {
  const edge = x === 0 || y === 0 || x === 15 || y === 15;
  if (edge) return [215, 238, 246, 235];
  if ((x === y + 3 || x === y + 4) && x > 4 && x < 11) return [255, 255, 255, 140];
  return [190, 225, 240, 55];
});
tile(T.SANDSTONE, (x, y, r) => { const band = (y % 8 === 0) ? -14 : 0; return j(214 + band, 198 + band, 142 + band, 12, r); });
tile(T.TORCH, (x, y, r) => {
  if ((x === 7 || x === 8) && y >= 6) return j(120, 86, 42, 16, r);
  if ((x === 7 || x === 8) && y >= 3 && y < 6) return y === 3 ? [255, 240, 120, 255] : [255, 170, 40, 255];
  return [0, 0, 0, 0];
});
tile(T.TALLGRASS, (x, y, r) => {
  const bladeH = [9, 12, 7, 14, 10, 6, 13, 8, 11, 7, 14, 9, 6, 12, 10, 8][x];
  if (x % 2 === 1 && x !== 1) return [0, 0, 0, 0];
  if (y >= 16 - bladeH) return j(78, 150, 50, 36, r);
  return [0, 0, 0, 0];
});
function flower(c) {
  return (x, y, r) => {
    if (x === 7 && y >= 8) return [60, 130, 40, 255];
    if (x === 8 && y >= 12) return [60, 130, 40, 255];
    if (x >= 6 && x <= 9 && y >= 4 && y <= 7) { if ((x === 7 || x === 8) && (y === 5 || y === 6)) return [250, 220, 60, 255]; return c; }
    if (x === 5 && y === 6) return c; if (x === 10 && y === 5) return c;
    if (x === 7 && y === 3) return c; if (x === 8 && y === 8) return [60, 130, 40, 255];
    return [0, 0, 0, 0];
  };
}
tile(T.FLOWER_R, flower([220, 40, 50, 255]));
tile(T.FLOWER_Y, flower([250, 215, 40, 255]));
tile(T.GLOWSTONE, (x, y, r) => { const b = hh(x >> 1, y >> 1, 21); return j(230 + b * 20 - 10, 180 + b * 40 - 20, 90 + b * 40, 18, r); });
tile(T.LAVA, (x, y, r) => { const b = hh(x >> 1, y >> 1, 31); return b > .6 ? j(255, 200, 60, 20, r) : b > .25 ? j(240, 110, 20, 20, r) : j(200, 60, 10, 20, r); });
tile(T.CACTUS_SIDE, (x, y, r) => { if (x === 0 || x === 15) return j(30, 90, 30, 10, r); const s = (x % 4 === 2) ? -18 : 0; if ((x + y * 3) % 11 === 0) return [230, 230, 190, 255]; return j(54 + s, 128 + s, 44 + s, 14, r); });
tile(T.CACTUS_TOP, (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; return e ? j(30, 90, 30, 10, r) : j(70, 150, 56, 14, r); });
tile(T.BRICKS, (x, y, r) => {
  const row = y >> 2, off = (row & 1) * 4;
  if ((y & 3) === 3 || ((x + off) & 7) === 7) return j(190, 182, 170, 8, r);
  return j(156, 74, 58, 18, r);
});
tile(T.PATH_TOP, (x, y, r) => j(154, 124, 74, 22, r));
tile(T.FARM_TOP, (x, y, r) => (x % 4 === 0 ? j(60, 38, 22, 8, r) : j(92, 60, 36, 14, r)));
tile(T.WHEAT, (x, y, r) => {
  const col = x % 3;
  if (col === 1) { const hgt = 10 + (x * 5) % 5; if (y >= 16 - hgt) return y < 16 - hgt + 4 ? j(222, 190, 80, 20, r) : j(170, 160, 60, 20, r); }
  return [0, 0, 0, 0];
});


/* ---------- realističtější materiály (periodický šum, voronoi, žilky) ---------- */
const sm_ = (t) => t * t * (3 - 2 * t);
function pn(x, y, f, seed) { // periodický value-noise, f buněk na 16 px
  const sz = 16 / f, gx = x / sz, gy = y / sz, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = sm_(gx - x0), ty = sm_(gy - y0);
  const v = (a, b) => hh(((a % f) + f) % f, ((b % f) + f) % f, seed);
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}
const fbm_ = (x, y, s) => pn(x, y, 2, s) * .45 + pn(x, y, 4, s + 1) * .3 + pn(x, y, 8, s + 2) * .25;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k, a) => [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k), a === undefined ? 255 : a];
function vor(x, y, n, seed) { // voronoi na n×n buňkách přes 16 px; vrací [F1, F2, id]
  const sz = 16 / n; let f1 = 9, f2 = 9, id = 0;
  const cx = Math.floor(x / sz), cy = Math.floor(y / sz);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const gx = cx + a, gy = cy + b, wx = ((gx % n) + n) % n, wy = ((gy % n) + n) % n;
    const px = (gx + .15 + hh(wx, wy, seed) * .7) * sz, py = (gy + .15 + hh(wx, wy, seed + 9) * .7) * sz;
    const d = Math.hypot(x + .5 - px, y + .5 - py);
    if (d < f1) { f2 = f1; f1 = d; id = hh(wx, wy, seed + 17); } else if (d < f2) f2 = d;
  }
  return [f1 / sz, f2 / sz, id];
}
const GREEN_D = [52, 104, 34], GREEN_M = [88, 146, 50], GREEN_L = [132, 178, 72], GREEN_Y = [158, 170, 70];
function grassTop(x, y) {
  const n = fbm_(x, y, 41), t = Math.min(1, Math.max(0, n * 1.5 - .25));
  let c = t < .5 ? mixc(GREEN_D, GREEN_M, t * 2) : mixc(GREEN_M, GREEN_L, (t - .5) * 2);
  const k = hh(x, y, 43);
  if (k < .09) c = mixc(c, GREEN_D, .6); else if (k > .93) c = mixc(c, GREEN_Y, .55);
  if (hh(x, y + 1, 44) < .06 && hh(x, y, 44) < .5) c = mixc(c, GREEN_L, .5);   // svislé stébla
  return shade(c, .94 + hh(x, y, 45) * .12);
}
tile(T.GRASS_TOP, (x, y) => grassTop(x, y));
tile(T.GRASS_SIDE, (x, y) => {
  const edge = 3 + Math.floor(hh(x, 0, 47) * 3) - (hh(x, 1, 48) < .3 ? 1 : 0);
  if (y < edge) return grassTop(x, y);
  const n = fbm_(x, y, 51), c = mixc([108, 74, 50], [146, 104, 72], n);
  const g = y === edge ? .8 : 1;
  const peb = hh(x, y, 52) < .05 ? 1.22 : 1;
  return shade(c, (.92 + hh(x, y, 53) * .16) * g * peb);
});
function dirtC(x, y) {
  const n = fbm_(x, y, 55); let c = mixc([104, 72, 48], [150, 108, 76], n);
  const k = hh(x, y, 56);
  if (k < .05) c = mixc(c, [64, 44, 30], .7);
  else if (k > .955) c = [158, 146, 130];
  return shade(c, .93 + hh(x, y, 57) * .14);
}
tile(T.DIRT, (x, y) => dirtC(x, y));
function stoneC(x, y, seed) {
  const n = fbm_(x, y, seed), base = 112 + n * 40;
  const crack = Math.abs(pn(x, y, 4, seed + 5) - .5) < .035 || Math.abs(pn(x, y, 8, seed + 6) - .5) < .02;
  let g = base * (.94 + hh(x, y, seed + 7) * .1);
  if (crack) g *= .66;
  const warm = pn(x, y, 2, seed + 9);
  return [clamp(g + warm * 6), clamp(g + 1), clamp(g + 3 - warm * 5), 255];
}
tile(T.STONE, (x, y) => stoneC(x, y, 61));
tile(T.COBBLE, (x, y) => {
  const v = vor(x, y, 4, 71), edge = v[1] - v[0];
  let g = 92 + v[2] * 62; const n = hh(x, y, 72) * 14;
  const c = [g + n + (v[2] > .6 ? 8 : -2), g + n, g + n - (v[2] > .6 ? 2 : -3)];
  if (edge < .17) return shade([62, 62, 64], .85 + hh(x, y, 73) * .3);
  const rim = Math.min(1, edge * 2.4);
  return shade(c, .72 + .32 * rim);
});
tile(T.SAND, (x, y) => {
  const n = fbm_(x, y, 81), rip = Math.sin((y + pn(x, y, 4, 82) * 5) * .9) * .035;
  return shade(mixc([214, 198, 144], [232, 218, 168], n), .95 + rip + (hh(x, y, 83) - .5) * .09);
});
tile(T.GRAVEL, (x, y) => {
  const v = vor(x, y, 5, 91), edge = v[1] - v[0];
  const g = 96 + v[2] * 80, w = hh(Math.floor(v[2] * 50), 0, 92);
  const c = [g + w * 14, g + w * 6, g - w * 10];
  return shade(c, edge < .15 ? .55 : (.8 + .3 * Math.min(1, edge * 2)) * (.95 + hh(x, y, 93) * .1));
});
tile(T.PLANKS, (x, y) => {
  const row = y >> 2, bw = hh(row, 0, 101), seamX = ((row & 1) ? 3 : 11) + (row % 3);
  const tone = .88 + bw * .22;
  let c = mixc([156, 114, 66], [190, 148, 92], pn(x * .35, y * 2.2, 2, 102 + row) * .6 + bw * .4);
  const grain = Math.sin((x * .55 + pn(x, y, 4, 103 + row) * 6) * 2.2) * .05;
  let k = tone + grain;
  if ((y & 3) === 3) k *= .62;
  else if ((y & 3) === 0) k *= 1.06;
  if (x === seamX) k *= .6;
  if ((x === seamX - 2 || x === seamX + 2) && (y & 3) === 1 && hh(x, y, 104) < .5) k *= .5; // hřebíky
  return shade(c, k);
});
tile(T.LOG_SIDE, (x, y) => {
  const f = pn(x, y * .2, 8, 111), f2 = pn(x + 3, y * .3, 4, 112);
  const furrow = Math.abs(((x + f2 * 3) % 4) - 2) < .6;
  let c = mixc([70, 50, 32], [112, 82, 52], f * .7 + .15);
  let k = furrow ? .68 : 1.04;
  if (hh(x, y, 113) < .05) k *= .75;
  return shade(c, k * (.94 + hh(x, y, 114) * .12));
});
tile(T.LEAVES, (x, y) => {
  const v = vor(x, y, 5, 121), edge = v[1] - v[0];
  let c = mixc([36, 92, 28], [92, 158, 54], v[2]);
  const hi = pn(x, y, 4, 122);
  c = mixc(c, [124, 176, 70], Math.max(0, hi - .55) * 1.4);
  let k = edge < .2 ? .62 : .9 + .25 * Math.min(1, edge);
  if (hh(x, y, 123) < .06) k *= .6;
  return shade(c, k);
});
tile(T.SANDSTONE, (x, y) => {
  const band = Math.sin(y * .8 + pn(x, y, 4, 131) * 3) * .06 + (y % 8 === 0 ? -.1 : 0);
  return shade(mixc([204, 186, 132], [224, 206, 150], fbm_(x, y, 132)), .96 + band + (hh(x, y, 133) - .5) * .08);
});
tile(T.BRICKS, (x, y) => {
  const row = y >> 2, off = (row & 1) * 4, bx = Math.floor(((x + off) & 15) / 8);
  const bt = hh(bx + (row & 1) * 2, row, 141);
  if ((y & 3) === 3 || ((x + off) & 7) === 7) return shade([178, 172, 160], .9 + hh(x, y, 142) * .2);
  const c = mixc([142, 62, 46], [176, 88, 64], bt);
  return shade(c, (.9 + hh(x, y, 143) * .2) * (pn(x, y, 8, 144) * .3 + .85) * ((y & 3) === 0 ? 1.08 : 1));
});
tile(T.SNOW, (x, y) => shade([240, 244, 250], .95 + fbm_(x, y, 151) * .08 + (hh(x, y, 152) - .5) * .03));
tile(T.PATH_TOP, (x, y) => {
  const v = vor(x, y, 5, 161); const k = hh(x, y, 162);
  let c = mixc([142, 112, 70], [170, 140, 92], fbm_(x, y, 163));
  if (v[2] > .72 && v[1] - v[0] > .25) c = mixc(c, [150, 148, 140], .7);
  return shade(c, .92 + k * .14);
});
tile(T.FARM_TOP, (x, y) => {
  const furrow = Math.sin(x * Math.PI / 2) * .5 + .5; const c = mixc([62, 40, 26], [98, 64, 40], furrow * .8 + fbm_(x, y, 171) * .3);
  return shade(c, .92 + hh(x, y, 172) * .16);
});
tile(T.TALLGRASS, (x, y) => {
  // několik zakřivených stébel různé výšky se gradientem od tmavé paty ke světlé špičce
  for (let b = 0; b < 7; b++) {
    const bx = [1.5, 4, 6.5, 8.5, 10.5, 12.5, 14.5][b], h = [10, 13, 8, 15, 9, 12, 7][b], lean = [.5, -.4, .3, -.2, .5, -.5, .3][b];
    const t = (15 - y) / h; if (t < 0 || t > 1) continue;
    const cx = bx + lean * t * t * 4 - (b % 2) * .4;
    const w = 1.0 - t * .5; if (Math.abs(x + .5 - cx - .5) <= w * .7 + .12) {
      const c = mixc([40, 96, 30], [134, 186, 70], t);
      return shade(c, .9 + hh(x, y, 181 + b) * .2);
    }
  }
  return [0, 0, 0, 0];
});
function flower2(petal, centre, stem) {
  return (x, y) => {
    const dx = x - 7.5, dy = y - 5;
    if (Math.abs(x - 7.5) <= .8 && y >= 7) return shade(stem, .85 + hh(x, y, 191) * .3);
    if (x === 5 && y === 11) return stem; if (x === 10 && y === 13) return stem;
    if (x === 6 && y >= 10 && y <= 11) return shade(stem, .9);
    const d = Math.hypot(dx, dy);
    if (d < 1.3) return shade(centre, .95 + hh(x, y, 192) * .1);
    if (d < 3.6) { const ang = Math.atan2(dy, dx); const lobe = Math.cos(ang * 5) * .5 + .5; if (d < 2.4 + lobe * 1.2) return shade(petal, .82 + (d / 3.6) * .3 + hh(x, y, 193) * .1); }
    return [0, 0, 0, 0];
  };
}
tile(T.FLOWER_R, flower2([212, 40, 52], [250, 214, 70], [54, 120, 38]));
tile(T.FLOWER_Y, flower2([252, 214, 46], [196, 120, 30], [54, 120, 38]));

function doorBoard(x, y, r) {
  // svislá prkna s kresbou dřeva
  const bi = Math.floor(x / 3.2), seam = Math.abs(x - bi * 3.2 - 3.2) < .5 || x === 0 || x === 15;
  const tone = 0.88 + ((bi * 37) % 5) * 0.045;
  const grain = ((x * 5 + y * 3) % 7 === 0) ? -10 : 0;
  if (seam) return j(78, 50, 26, 8, r);
  return j(150 * tone + grain, 104 * tone + grain, 56 * tone + grain, 10, r);
}
tile(T.DOOR_LOW, (x, y, r) => {
  if (x === 0 || x === 15 || y === 0 || y === 15) return j(84, 54, 28, 8, r);
  if ((y >= 2 && y <= 3) || (y >= 12 && y <= 13)) { // příčné vzpěry
    if ((x === 2 || x === 13) && (y === 2 || y === 13)) return [44, 44, 50, 255];
    return j(112, 76, 38, 8, r);
  }
  if (x >= 11 && x <= 12 && y >= 7 && y <= 8) return (x === 11 && y === 7) ? [250, 226, 120, 255] : [196, 160, 60, 255]; // klika
  if (x === 1 && (y === 3 || y === 12)) return [58, 58, 64, 255];
  return doorBoard(x, y, r);
});
tile(T.DOOR_UP, (x, y, r) => {
  if (x === 0 || x === 15 || y === 0 || y === 15) return j(84, 54, 28, 8, r);
  const win = (x >= 4 && x <= 11 && y >= 3 && y <= 8);
  if (win) {
    if (x === 7 || x === 8 || y === 5 || y === 6) return j(96, 64, 34, 8, r); // příčky okénka
    const sh = 150 + (x + y) * 3; return [88 + (x + y) % 4 * 4, sh * .85, sh * 1.0, 255];
  }
  if (x >= 3 && x <= 12 && y >= 2 && y <= 9) return j(100, 66, 34, 8, r); // rám okénka
  if (y >= 12 && y <= 13) return j(112, 76, 38, 8, r);
  return doorBoard(x, y, r);
});
tile(T.BED_HEAD, (x, y, r) => {
  if (x === 0 || y === 0 || y === 15) return j(120, 20, 24, 8, r);
  if (x >= 9 && x <= 14 && y >= 2 && y <= 13) return j(238, 238, 244, 8, r);
  return j(190, 36, 40, 14, r);
});
tile(T.BED_FOOT, (x, y, r) => (x === 15 || y === 0 || y === 15) ? j(120, 20, 24, 8, r) : (x % 4 === 0 ? j(170, 28, 34, 10, r) : j(196, 40, 44, 12, r)));
tile(T.BED_SIDE, (x, y, r) => y < 6 ? j(190, 36, 40, 10, r) : y < 8 ? j(235, 235, 240, 6, r) : j(150, 108, 60, 12, r));
tile(T.CHEST_TOP, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? j(80, 52, 24, 8, r) : j(170, 120, 60, 14, r));
tile(T.CHEST_SIDE, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15 || y === 5) ? j(80, 52, 24, 8, r) : j(172, 122, 62, 14, r));
tile(T.CHEST_FRONT, (x, y, r) => {
  if (x === 0 || x === 15 || y === 0 || y === 15 || y === 5) return j(80, 52, 24, 8, r);
  if (x >= 7 && x <= 8 && y >= 4 && y <= 8) return [232, 200, 90, 255];
  return j(172, 122, 62, 14, r);
});
tile(T.LADDER, (x, y, r) => {
  if (x === 2 || x === 3 || x === 12 || x === 13) return j(120, 86, 46, 14, r);
  if (y % 4 === 1 && x > 3 && x < 12) return j(140, 100, 54, 14, r);
  return [0, 0, 0, 0];
});
tile(T.OBSIDIAN, (x, y, r) => { const b = hh(x >> 1, y >> 1, 61); return b > .8 ? j(90, 50, 140, 20, r) : j(22, 14, 36, 14, r); });
tile(T.GRANITE, (x, y, r) => { const b = hh(x >> 1, y >> 1, 71); return b > .7 ? j(176, 118, 100, 20, r) : j(150, 96, 82, 24, r); });
tile(T.DIORITE, (x, y, r) => { const b = hh(x >> 1, y >> 1, 72); return b > .55 ? j(200, 200, 200, 16, r) : j(150, 150, 152, 22, r); });
tile(T.ANDESITE, (x, y, r) => { const b = hh(x >> 1, y >> 1, 73); return b > .6 ? j(150, 150, 146, 14, r) : j(126, 128, 124, 18, r); });
tile(T.DEEPSLATE, (x, y, r) => { const row = (y % 5 === 0) ? -14 : 0; const b = hh(x >> 1, y >> 1, 74) * 14; return j(62 + b + row, 62 + b + row, 70 + b + row, 10, r); });
function ore2(base, col) { return (x, y, r) => { const o = hh(x >> 1, y >> 1, 75 + col[0]) < .3; const b = hh(x >> 1, y >> 1, 3) * 24; return o ? j(col[0], col[1], col[2], 22, r) : j(base + b - 10, base + b - 10, base + 2 + b - 10, 14, r); }; }
tile(T.GOLD_ORE, ore2(118, [244, 206, 60]));
tile(T.DIAMOND_ORE, ore2(118, [90, 232, 226]));
tile(T.STONE_BRICKS, (x, y, r) => { const row = y >> 2, off = (row & 1) * 4; if ((y & 3) === 3 || ((x + off) & 7) === 7) return j(86, 86, 90, 8, r); return j(132, 132, 136, 12, r); });
tile(T.IRON_BLOCK, (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; return e ? j(170, 170, 178, 8, r) : j(214, 214, 222, 12, r); });
tile(T.PUMPKIN_TOP, (x, y, r) => { if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return [90, 120, 40, 255]; return (x % 4 === 0) ? j(190, 100, 20, 10, r) : j(228, 130, 28, 14, r); });
tile(T.PUMPKIN_FACE, (x, y, r) => {
  const eye = (y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)));
  const mouth = (y >= 9 && y <= 11 && x >= 4 && x <= 11 && (y === 9 || x % 3 !== 0));
  if (eye || mouth) return [250, 200, 70, 255];
  return (x % 4 === 0) ? j(190, 100, 20, 10, r) : j(228, 130, 28, 14, r);
});
tile(T.PUMPKIN_SIDE, (x, y, r) => { const ridge = x % 4 === 0 ? -34 : (x % 4 === 3 ? 10 : 0); return j(226 + ridge, 128 + ridge * .6, 26 + ridge * .3, 12, r); });
tile(T.FURNACE_FRONT, (x, y, r) => {
  const b = hh(x >> 2, y >> 2, 8) * 40;
  if (x >= 4 && x <= 11 && y >= 7 && y <= 13) return (y >= 11 && x >= 6 && x <= 9) ? [255, 160, 40, 255] : [24, 24, 26, 255];
  if (x >= 4 && x <= 11 && y >= 3 && y <= 5) return [50, 50, 54, 255];
  return j(112 + b - 10, 112 + b - 10, 114 + b - 10, 14, r);
});
tile(T.FURNACE_TOP, (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; return e ? j(86, 86, 90, 8, r) : j(120, 120, 124, 12, r); });
function gemBlock(base, hi, dk) { return (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; if (e) return j(dk[0], dk[1], dk[2], 8, r); return ((x + y) % 7 === 0 || (x === 3 && y < 7)) ? j(hi[0], hi[1], hi[2], 10, r) : j(base[0], base[1], base[2], 14, r); }; }
tile(T.GOLD_BLOCK, gemBlock([240, 200, 50], [255, 244, 160], [170, 130, 20]));
tile(T.DIAMOND_BLOCK, gemBlock([70, 210, 215], [190, 255, 250], [30, 130, 140]));
tile(T.EMERALD_BLOCK, gemBlock([30, 190, 80], [150, 250, 170], [10, 110, 40]));
tile(T.RAIL_S, (x, y, r) => {
  if (x === 4 || x === 5 || x === 10 || x === 11) return j(176, 176, 184, 14, r);
  if (y % 4 === 1 && x > 5 && x < 10) return j(120, 86, 46, 14, r);
  if (y % 4 === 1 && (x === 3 || x === 12)) return j(120, 86, 46, 14, r);
  return [0, 0, 0, 0];
});
tile(T.RAIL_C, (x, y, r) => {
  const d = Math.hypot(x + .5 - 16, y + .5 - 16), a = Math.atan2(16 - (y + .5), 16 - (x + .5));
  if (Math.abs(d - 5.5) < 1 || Math.abs(d - 11.5) < 1) return j(176, 176, 184, 14, r);
  if (d > 5 && d < 12 && Math.abs(((a * 180 / Math.PI) + 360) % 22.5 - 11) < 3.2) return j(120, 86, 46, 14, r);
  return [0, 0, 0, 0];
});
tile(T.DUST, (x, y, r) => ((x === 7 || x === 8) || (y === 7 || y === 8)) ? j(235, 235, 235, 14, r) : [0, 0, 0, 0]);
tile(T.RS_BLOCK, gemBlock([190, 20, 20], [250, 110, 90], [100, 0, 0]));
tile(T.LAMP_OFF, (x, y, r) => { const g = (x % 8 === 0 || y % 8 === 0); return g ? j(80, 60, 36, 8, r) : j(140, 112, 70, 14, r); });
tile(T.LAMP_ON, (x, y, r) => { const g = (x % 8 === 0 || y % 8 === 0); return g ? j(200, 150, 70, 8, r) : j(255, 232, 160, 14, r); });
tile(T.RS_ORE, ore2(118, [220, 30, 30]));
tile(T.LEVER, (x, y, r) => {
  if (x >= 6 && x <= 9 && y >= 12) return j(110, 110, 114, 10, r);
  if (x >= 7 && x <= 8 && y >= 3 && y < 12) return j(130, 94, 50, 14, r);
  if (x >= 6 && x <= 9 && y >= 1 && y <= 3) return [210, 40, 40, 255];
  return [0, 0, 0, 0];
});
tile(T.TNT_SIDE, (x, y, r) => {
  const band = y >= 5 && y <= 10;
  if (band) {
    const letter = (y >= 6 && y <= 9) && ((x >= 2 && x <= 4 && (y === 6 || x === 3)) || (x >= 6 && x <= 9 && (x === 6 || x === 9 || (x === 7 && y === 7) || (x === 8 && y === 8))) || (x >= 11 && x <= 13 && (y === 6 || x === 12)));
    return letter ? [40, 40, 40, 255] : j(238, 232, 220, 10, r);
  }
  return (y === 0 || y === 15) ? j(130, 20, 18, 8, r) : j(200, 36, 30, 16, r);
});
tile(T.TNT_TOP, (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return [40, 40, 40, 255]; return e ? j(150, 20, 20, 8, r) : j(214, 200, 170, 14, r); });
tile(T.WOOL, (x, y, r) => j(238, 238, 240, 16, r));
tile(T.HAY_SIDE, (x, y, r) => (y === 4 || y === 11) ? j(150, 100, 40, 10, r) : j(214, 178, 60, 30, r));
tile(T.HAY_TOP, (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; return e ? j(170, 130, 40, 10, r) : ((x + y) % 3 === 0 ? j(190, 150, 50, 12, r) : j(226, 190, 70, 20, r)); });

/* praskliny pro těžení – samostatné textury 16x16 */
TEX.crackTextures = [];
for (let s = 0; s < 10; s++) {
  const c = { data: new Uint8ClampedArray(16 * 16 * 4), w: 16 };
  paint(c, 0, 0, 16, 500 + s, (x, y, r) => {
    const v = hh(x, y, 300);
    const line = ((x * 3 + y * 5 + (x ^ y)) % 7 === 0) && v < (s + 1) * .1;
    return (v < (s + 1) * .045 || line) ? [0, 0, 0, 170] : [0, 0, 0, 0];
  });
  TEX.crackTextures.push(TEX.dataTexture(c.data, 16, 16));
}

/* průměrné barvy bloků (pro částice) */
TEX.avgColor = (id) => {
  const bl = BL[id]; if (!bl) return [128, 128, 128];
  const t = bl.side;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = (((t >> 3) * 16 + y) * 128 + (t % 8) * 16 + x) * 4, d = ATLAS.data; if (d[i + 3] > 100) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } }
  return n ? [r / n, g / n, b / n] : [128, 128, 128];
};

/* ---------- ikony předmětů (16x16) ---------- */
function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
function line(ctx, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx - dy;
  for (;;) { px(ctx, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } }
}
const TOOLCOL = { D: ['#7cf0f0', '#35b8c8'], W: ['#a9824a', '#8a6636'], S: ['#9a9a9a', '#6d6d6d'], I: ['#e8e8ee', '#b4b4c0'] };
const ITEMS = {
  [I.STICK]: (c) => { line(c, 3, 13, 12, 4, '#8a6636'); line(c, 4, 13, 12, 5, '#a9824a'); },
  [I.COAL]: (c) => { c.fillStyle = '#26262a'; c.fillRect(4, 5, 8, 7); c.fillRect(5, 4, 6, 9); c.fillStyle = '#4a4a52'; c.fillRect(5, 5, 2, 2); c.fillRect(9, 8, 2, 2); },
  [I.IRON]: (c) => { c.fillStyle = '#c8c8d2'; c.fillRect(3, 6, 10, 5); c.fillStyle = '#eeeef4'; c.fillRect(3, 6, 10, 2); c.fillStyle = '#8f8f9c'; c.fillRect(3, 10, 10, 1); },
  [I.WHEAT_ITEM]: (c) => { for (let k = 0; k < 4; k++) { line(c, 3 + k * 3, 14, 4 + k * 3, 4, '#c9a53c'); px(c, 4 + k * 3, 3, '#e8c85a'); px(c, 3 + k * 3, 5, '#e8c85a'); px(c, 5 + k * 3, 6, '#e8c85a'); } },
  [I.BREAD]: (c) => { c.fillStyle = '#b57a35'; c.fillRect(3, 6, 10, 6); c.fillRect(4, 5, 8, 8); c.fillStyle = '#d29a52'; c.fillRect(4, 6, 8, 2); c.fillStyle = '#8a5a22'; c.fillRect(4, 12, 8, 1); },
  [I.APPLE]: (c) => { c.fillStyle = '#c4202a'; c.fillRect(4, 6, 8, 7); c.fillRect(5, 5, 6, 9); c.fillStyle = '#e8505a'; c.fillRect(5, 6, 2, 2); px(c, 8, 4, '#6b4a20'); px(c, 9, 3, '#4aa03a'); px(c, 10, 3, '#4aa03a'); },
};

function meat(a, b, c) { return (ctx) => { ctx.fillStyle = c; ctx.fillRect(4, 5, 8, 7); ctx.fillRect(5, 4, 6, 9); ctx.fillStyle = a; ctx.fillRect(5, 5, 6, 5); ctx.fillStyle = b; ctx.fillRect(6, 6, 3, 2); px(ctx, 11, 11, '#f0e8d8'); px(ctx, 12, 12, '#f0e8d8'); }; }
ITEMS[I.BEEF] = meat('#c4403c', '#e8706a', '#8a2a28'); ITEMS[I.PORK] = meat('#e8a09a', '#f4c4c0', '#c47870'); ITEMS[I.CHICKEN] = meat('#f0cfa8', '#f8e6cc', '#d4a678');
ITEMS[I.RABBIT] = meat('#d09a80', '#e8b8a0', '#a06a50'); ITEMS[I.RABBIT_C] = meat('#b8803c', '#d49c58', '#7a5020');
ITEMS[I.STEAK] = meat('#9a5a2c', '#b87840', '#5a3418'); ITEMS[I.PORKCHOP] = meat('#c88a50', '#e0a870', '#8a5a30'); ITEMS[I.CHICKEN_C] = meat('#d8a860', '#ecc888', '#9a6e30');
ITEMS[I.DOOR] = (c) => { c.fillStyle = '#6e4a24'; c.fillRect(4, 1, 8, 14); c.fillStyle = '#9a6a38'; c.fillRect(5, 2, 6, 5); c.fillRect(5, 8, 6, 6); c.fillStyle = '#bfe4f4'; c.fillRect(6, 3, 4, 3); px(c, 10, 9, '#e8c850'); };
ITEMS[I.BED] = (c) => { c.fillStyle = '#8a5a30'; c.fillRect(1, 11, 14, 3); c.fillStyle = '#c4282c'; c.fillRect(1, 7, 14, 5); c.fillStyle = '#eeeef4'; c.fillRect(2, 6, 5, 4); c.fillStyle = '#8a1a1e'; c.fillRect(8, 7, 7, 1); };
const R_ = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
ITEMS[I.F_TABLE] = (c) => { R_(c, '#b0834c', 1, 5, 14, 3); R_(c, '#7a5230', 1, 8, 14, 1); R_(c, '#7a5230', 2, 9, 2, 6); R_(c, '#7a5230', 12, 9, 2, 6); };
ITEMS[I.F_CHAIR] = (c) => { R_(c, '#a87a44', 3, 1, 2, 10); R_(c, '#b88a50', 5, 2, 6, 1); R_(c, '#b88a50', 5, 5, 6, 1); R_(c, '#b88a50', 3, 8, 10, 2); R_(c, '#7a5230', 3, 10, 2, 5); R_(c, '#7a5230', 11, 10, 2, 5); };
ITEMS[I.F_SOFA] = (c) => { R_(c, '#3f5d75', 1, 4, 14, 5); R_(c, '#4d6d85', 3, 8, 10, 3); R_(c, '#3f5d75', 0, 6, 3, 7); R_(c, '#3f5d75', 13, 6, 3, 7); R_(c, '#5f84a0', 3, 5, 10, 1); R_(c, '#5a3a22', 2, 13, 2, 2); R_(c, '#5a3a22', 12, 13, 2, 2); R_(c, '#c47850', 4, 5, 3, 3); };
ITEMS[I.F_SHELF] = (c) => { R_(c, '#6a4428', 2, 0, 12, 16); R_(c, '#3a2412', 3, 1, 10, 14); for (const y of [5, 10]) R_(c, '#8a5a36', 3, y, 10, 1); const cs = ['#a02828', '#2850a0', '#2a8048', '#d0a030', '#7a3c8a']; for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) R_(c, cs[(i + r * 2) % 5], 3 + i * 2, 1 + r * 5 + (i % 2), 2, 4 - (i % 2)); };
ITEMS[I.F_WARD] = (c) => { R_(c, '#6a4428', 3, 0, 10, 16); R_(c, '#8a5a36', 4, 1, 4, 13); R_(c, '#8a5a36', 8, 1, 4, 13); R_(c, '#2a1a0c', 7, 1, 1, 14); R_(c, '#d0d0d8', 6, 7, 1, 3); R_(c, '#d0d0d8', 9, 7, 1, 3); };
ITEMS[I.F_LAMP] = (c) => { R_(c, '#ffd890', 4, 1, 8, 5); R_(c, '#fff0c0', 5, 2, 6, 2); R_(c, '#555560', 7, 6, 2, 7); R_(c, '#38383e', 4, 13, 8, 2); };
ITEMS[I.F_PLANT] = (c) => { R_(c, '#3a7a30', 3, 3, 3, 6); R_(c, '#58a040', 10, 2, 3, 7); R_(c, '#4a9038', 6, 0, 4, 9); R_(c, '#58a040', 5, 4, 2, 4); R_(c, '#b05a3a', 4, 9, 8, 6); R_(c, '#8a4228', 4, 9, 8, 1); };
ITEMS[I.F_COUNTER] = (c) => { R_(c, '#3a3c40', 0, 4, 16, 3); R_(c, '#d8d4c8', 1, 7, 14, 8); R_(c, '#b0aca0', 8, 8, 1, 7); R_(c, '#9090a0', 5, 9, 1, 2); R_(c, '#9090a0', 11, 9, 1, 2); R_(c, '#1a1a1c', 3, 3, 3, 1); R_(c, '#1a1a1c', 10, 3, 3, 1); };
ITEMS[I.F_SWING] = (c) => { R_(c, '#6a4a2c', 1, 1, 14, 2); R_(c, '#6a4a2c', 2, 1, 2, 14); R_(c, '#6a4a2c', 12, 1, 2, 14); R_(c, '#a08050', 5, 3, 1, 7); R_(c, '#a08050', 10, 3, 1, 7); R_(c, '#c43c34', 4, 10, 8, 2); };
ITEMS[I.F_SLIDE] = (c) => { R_(c, '#6a4a2c', 2, 2, 2, 13); R_(c, '#ecbc36', 1, 3, 6, 2); R_(c, '#3668be', 6, 5, 3, 2); R_(c, '#3668be', 8, 7, 3, 2); R_(c, '#3668be', 10, 9, 3, 2); R_(c, '#3668be', 12, 11, 3, 2); };
ITEMS[I.F_SEESAW] = (c) => { R_(c, '#6a4a2c', 7, 8, 2, 6); R_(c, '#c43c34', 1, 10, 14, 2); R_(c, '#ecbc36', 2, 7, 2, 3); R_(c, '#ecbc36', 12, 11, 2, 3); };
ITEMS[I.F_SANDBOX] = (c) => { R_(c, '#b08850', 1, 8, 14, 2); R_(c, '#e2d096', 2, 6, 12, 3); R_(c, '#3668be', 9, 4, 3, 3); R_(c, '#c43c34', 4, 5, 2, 2); R_(c, '#b08850', 1, 11, 14, 2); };
ITEMS[I.F_SIGN] = (c) => { R_(c, '#6a4a2c', 7, 8, 2, 7); R_(c, '#b08850', 2, 2, 12, 7); R_(c, '#6a4a2c', 2, 2, 12, 1); R_(c, '#6a4a2c', 2, 8, 12, 1); R_(c, '#3a2a18', 4, 4, 8, 1); R_(c, '#3a2a18', 4, 6, 6, 1); };
ITEMS[I.LADDER] = (c) => { c.fillStyle = '#7a5630'; c.fillRect(4, 1, 2, 14); c.fillRect(10, 1, 2, 14); for (let y = 3; y < 15; y += 3) c.fillRect(6, y, 4, 1); };

function sword(k) { return (c) => { const [a, b] = TOOLCOL[k]; line(c, 4, 11, 13, 2, a); line(c, 5, 11, 13, 3, b); line(c, 4, 10, 12, 2, a); line(c, 3, 10, 6, 13, '#6b4a20'); line(c, 2, 14, 4, 12, '#4a3418'); line(c, 5, 9, 8, 12, '#7a5a30'); }; }
function pick(k) { return (c) => { const [a, b] = TOOLCOL[k]; line(c, 3, 13, 12, 4, '#8a6636'); line(c, 4, 13, 12, 5, '#6b4a20'); line(c, 3, 5, 6, 2, a); line(c, 6, 2, 11, 2, a); line(c, 11, 2, 14, 5, a); line(c, 3, 6, 6, 3, b); line(c, 6, 3, 11, 3, b); line(c, 11, 3, 13, 5, b); }; }
function axe(k) { return (c) => { const [a, b] = TOOLCOL[k]; line(c, 3, 14, 10, 6, '#8a6636'); line(c, 4, 14, 11, 6, '#6b4a20'); c.fillStyle = a; c.fillRect(8, 2, 5, 4); c.fillRect(11, 5, 3, 3); c.fillStyle = b; c.fillRect(8, 5, 4, 1); c.fillRect(13, 3, 1, 4); }; }
function shovel(k) { return (c) => { const [a, b] = TOOLCOL[k]; line(c, 3, 14, 10, 7, '#8a6636'); line(c, 4, 14, 11, 7, '#6b4a20'); c.fillStyle = a; c.fillRect(10, 2, 4, 5); c.fillRect(11, 7, 2, 1); c.fillStyle = b; c.fillRect(13, 3, 1, 4); c.fillRect(10, 6, 3, 1); }; }
for (const [k, n] of [['W', 0], ['S', 1], ['I', 2], ['D', 3]]) { ITEMS[130 + n] = axe(k); ITEMS[134 + n] = shovel(k); }
ITEMS[I.SWORD_D] = sword('D'); ITEMS[I.PICK_D] = pick('D');
ITEMS[I.GOLD] = (c) => { c.fillStyle = '#e8c030'; c.fillRect(3, 6, 10, 5); c.fillStyle = '#fff0a0'; c.fillRect(3, 6, 10, 2); c.fillStyle = '#b08818'; c.fillRect(3, 10, 10, 1); };
ITEMS[I.DIAMOND] = (c) => { c.fillStyle = '#35c8d8'; c.fillRect(5, 4, 6, 8); c.fillRect(4, 6, 8, 4); c.fillStyle = '#9af4f4'; c.fillRect(5, 5, 3, 3); c.fillStyle = '#1e8898'; c.fillRect(9, 9, 2, 2); };
ITEMS[I.RAW_IRON] = (c) => { c.fillStyle = '#b8947a'; c.fillRect(4, 5, 8, 7); c.fillRect(5, 4, 6, 9); c.fillStyle = '#d8bca4'; c.fillRect(5, 5, 3, 3); c.fillStyle = '#7a5a46'; c.fillRect(9, 9, 2, 2); };
ITEMS[I.RAW_GOLD] = (c) => { c.fillStyle = '#d8b040'; c.fillRect(4, 5, 8, 7); c.fillRect(5, 4, 6, 9); c.fillStyle = '#f8e080'; c.fillRect(5, 5, 3, 3); c.fillStyle = '#9a7820'; c.fillRect(9, 9, 2, 2); };
ITEMS[I.FEATHER] = (c) => { line(c, 3, 13, 12, 3, '#e8e8ee'); line(c, 4, 13, 12, 4, '#cfcfd8'); line(c, 5, 12, 11, 6, '#f6f6fa'); line(c, 2, 14, 4, 12, '#8a6636'); };
ITEMS[I.STRING] = (c) => { line(c, 3, 12, 6, 6, '#e8e4d8'); line(c, 6, 6, 9, 11, '#e8e4d8'); line(c, 9, 11, 13, 4, '#e8e4d8'); };
ITEMS[I.ARROW] = (c) => { line(c, 3, 13, 12, 4, '#8a6636'); c.fillStyle = '#b8b8c0'; c.fillRect(11, 2, 3, 3); px(c, 10, 5, '#b8b8c0'); line(c, 2, 12, 4, 14, '#e8e8ee'); line(c, 3, 11, 5, 13, '#e8e8ee'); };
ITEMS[I.BOW] = (c) => { line(c, 11, 2, 13, 7, '#8a6636'); line(c, 13, 7, 13, 10, '#8a6636'); line(c, 13, 10, 11, 14, '#8a6636'); line(c, 11, 2, 11, 14, '#e8e4d8'); line(c, 10, 3, 8, 3, '#6b4a20'); };
ITEMS[I.CROSSBOW] = (c) => { c.fillStyle = '#6b4a20'; c.fillRect(2, 7, 11, 3); c.fillStyle = '#8a6636'; c.fillRect(11, 3, 2, 11); c.fillStyle = '#e8e4d8'; c.fillRect(12, 3, 1, 11); c.fillStyle = '#b8b8c0'; c.fillRect(6, 6, 6, 1); };

function armorIcon(slot, k) {
  return (c) => {
    const [a, b] = k;
    if (slot === 0) { c.fillStyle = a; c.fillRect(4, 3, 8, 6); c.fillRect(3, 5, 10, 3); c.fillStyle = b; c.fillRect(4, 9, 3, 4); c.fillRect(9, 9, 3, 4); c.fillRect(4, 8, 8, 1); }
    else if (slot === 1) { c.fillStyle = a; c.fillRect(4, 3, 8, 11); c.fillRect(1, 3, 3, 5); c.fillRect(12, 3, 3, 5); c.fillStyle = b; c.fillRect(6, 3, 4, 2); c.fillRect(4, 12, 8, 2); c.fillRect(1, 7, 3, 1); c.fillRect(12, 7, 3, 1); }
    else if (slot === 2) { c.fillStyle = a; c.fillRect(4, 2, 8, 4); c.fillRect(4, 6, 3, 8); c.fillRect(9, 6, 3, 8); c.fillStyle = b; c.fillRect(4, 5, 8, 1); c.fillRect(4, 13, 3, 1); c.fillRect(9, 13, 3, 1); }
    else { c.fillStyle = a; c.fillRect(3, 6, 4, 6); c.fillRect(9, 6, 4, 6); c.fillStyle = b; c.fillRect(2, 11, 5, 3); c.fillRect(9, 11, 5, 3); }
  };
}
const ARMOR_COL = [['#e8e8ee', '#9a9aa8'], ['#f8d848', '#b08818'], ['#7cf0f0', '#2aa8b8']];
for (let slot = 0; slot < 4; slot++) ITEMS[162 + slot] = armorIcon(slot, ['#a8683a', '#6e4222']);
const EGG_COL = { 170: ['#c8c8c0', '#4a8a3a'], 171: ['#5a3a26', '#f0eee8'], 172: ['#f0a0a0', '#d06060'], 173: ['#f0f0f0', '#b8a888'], 174: ['#f4f4f0', '#d03030'], 175: ['#c4926f', '#6a4a8a'], 176: ['#7a8070', '#3a3a40'], 177: ['#4a4a52', '#d02020'], 190: ['#8a5a30', '#f0e8d8'], 191: ['#d8c8b0', '#f0f0f0'], 192: ['#a8a8a8', '#3a3a3a'], 193: ['#5a7a5e', '#c0c0c8'], 194: ['#6a5448', '#e0d8c4'] };
for (const id in EGG_COL) ITEMS[id] = (c) => {
  const [a, b] = EGG_COL[id];
  c.fillStyle = a; c.fillRect(5, 2, 6, 2); c.fillRect(4, 4, 8, 3); c.fillRect(3, 7, 10, 4); c.fillRect(4, 11, 8, 2); c.fillRect(5, 13, 6, 1);
  c.fillStyle = b; c.fillRect(5, 5, 2, 2); c.fillRect(9, 4, 2, 2); c.fillRect(6, 9, 3, 2); c.fillRect(10, 8, 2, 2); c.fillRect(4, 11, 2, 1);
  c.fillStyle = '#ffffff'; c.fillRect(6, 3, 1, 1);
};
ITEMS[I.EMERALD] = (c) => { c.fillStyle = '#17a84a'; c.fillRect(5, 3, 6, 10); c.fillRect(4, 5, 8, 6); c.fillStyle = '#5cf08a'; c.fillRect(5, 4, 3, 3); c.fillStyle = '#0c6a2c'; c.fillRect(9, 9, 2, 3); };
W.EGG_MATS.forEach((mat, i) => {
  ITEMS[200 + i] = (c) => {
    const col = TEX.avgColor(mat), hex = (m) => '#' + col.map(v => Math.max(0, Math.min(255, Math.round(v * m))).toString(16).padStart(2, '0')).join('');
    const a = hex(1), b = hex(.55), l = hex(1.3);
    c.fillStyle = a; c.fillRect(5, 2, 6, 2); c.fillRect(4, 4, 8, 3); c.fillRect(3, 7, 10, 4); c.fillRect(4, 11, 8, 2); c.fillRect(5, 13, 6, 1);
    c.fillStyle = b; c.fillRect(5, 5, 2, 2); c.fillRect(9, 4, 2, 2); c.fillRect(6, 9, 3, 2); c.fillRect(10, 8, 2, 2); c.fillRect(4, 11, 2, 1);
    c.fillStyle = l; c.fillRect(6, 3, 1, 1); c.fillRect(4, 5, 1, 1);
  };
});
ITEMS[I.MINECART] = (c) => { c.fillStyle = '#9a9aa4'; c.fillRect(2, 6, 12, 6); c.fillStyle = '#6a6a74'; c.fillRect(2, 6, 12, 1); c.fillRect(2, 11, 12, 1); c.fillStyle = '#c4c4cc'; c.fillRect(4, 7, 8, 3); c.fillStyle = '#303036'; c.fillRect(4, 12, 3, 2); c.fillRect(9, 12, 3, 2); };
ITEMS[I.REDSTONE] = (c) => { c.fillStyle = '#c01818'; c.fillRect(3, 9, 10, 4); c.fillRect(5, 7, 6, 2); c.fillStyle = '#ff5a40'; c.fillRect(5, 8, 2, 2); c.fillRect(9, 10, 2, 2); c.fillRect(4, 11, 2, 1); c.fillStyle = '#7a0a0a'; c.fillRect(8, 12, 4, 1); };
ITEMS[I.FLINT_STEEL] = (c) => { c.fillStyle = '#c0c0c8'; c.fillRect(3, 8, 7, 5); c.fillStyle = '#f0f0f8'; c.fillRect(3, 8, 7, 1); c.fillStyle = '#202024'; c.fillRect(8, 3, 5, 5); c.fillStyle = '#505058'; c.fillRect(9, 4, 2, 2); c.fillStyle = '#ffb030'; c.fillRect(6, 6, 2, 2); };
ITEMS[I.LEATHER] = (c) => { c.fillStyle = '#a8683a'; c.fillRect(3, 4, 10, 9); c.fillRect(2, 5, 12, 6); c.fillStyle = '#c88a58'; c.fillRect(4, 5, 4, 3); c.fillStyle = '#6e4222'; c.fillRect(3, 12, 10, 1); c.fillRect(11, 8, 2, 2); };
for (let tier = 0; tier < 3; tier++) for (let slot = 0; slot < 4; slot++) ITEMS[150 + tier * 4 + slot] = armorIcon(slot, ARMOR_COL[tier]);
ITEMS[I.SWORD_W] = sword('W'); ITEMS[I.SWORD_S] = sword('S'); ITEMS[I.SWORD_I] = sword('I');
ITEMS[I.PICK_W] = pick('W'); ITEMS[I.PICK_S] = pick('S'); ITEMS[I.PICK_I] = pick('I');

/* malý "canvas" v paměti pro painter předmětů (jen fillStyle + fillRect) */
function PixCtx() { this.data = new Uint8ClampedArray(16 * 16 * 4); this.fillStyle = '#000000'; }
PixCtx.prototype.fillRect = function (x, y, w, h) {
  const s = this.fillStyle, r = parseInt(s.slice(1, 3), 16), g = parseInt(s.slice(3, 5), 16), b = parseInt(s.slice(5, 7), 16);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx < 0 || yy < 0 || xx > 15 || yy > 15) continue;
    const i = (yy * 16 + xx) * 4; this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
  }
};
const bufCache = new Map();
/* 16x16 RGBA pixely předmětu (nebo dlaždice bloku) */
TEX.itemBuf = (id) => {
  if (bufCache.has(id)) return bufCache.get(id);
  let buf;
  if (ITEMS[id]) { const c = new PixCtx(); ITEMS[id](c); buf = c.data; }
  else {
    buf = new Uint8ClampedArray(16 * 16 * 4);
    const bl = BL[id];
    if (bl) { const t = bl.side; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const si = (((t >> 3) * 16 + y) * 128 + (t % 8) * 16 + x) * 4, di = (y * 16 + x) * 4; for (let k = 0; k < 4; k++) buf[di + k] = ATLAS.data[si + k]; } }
  }
  bufCache.set(id, buf);
  return buf;
};
TEX.itemTexture = (id) => TEX.dataTexture(TEX.itemBuf(id), 16, 16);

/* ---------- ikony v HUD: <canvas data-icon="..."> se kreslí automaticky ---------- */
TEX.icon = (key) => 'icon:' + key;
let atlasCv = null;
function getAtlasCv() {
  if (atlasCv) return atlasCv;
  atlasCv = document.createElement('canvas'); atlasCv.width = 128; atlasCv.height = 256;
  atlasCv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(ATLAS.data), 128, 256), 0, 0);
  return atlasCv;
}
function drawIcon(c, key) {
  if (typeof key === 'string' && key[0] === 'h') { // srdíčko
    const kind = +key[1]; c.width = 7; c.height = 6; const x = c.getContext('2d');
    const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    rows.forEach((r, y) => { for (let i = 0; i < 7; i++) if (r[i] === 'X') { x.fillStyle = kind === 2 || (kind === 1 && i < 4) ? (y < 2 && i < 3 ? '#ff7b7b' : '#e01a24') : '#3a1218'; x.fillRect(i, y, 1, 1); } });
    return;
  }
  const id = +key, bl = BL[id];
  if ((id < 100 || W.isStair(id) || W.isNB(id)) && bl && !bl.cross && !bl.flat && id !== B.WATER) {
    c.width = c.height = 48;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const src = getAtlasCv();
    const draw = (t, m, shade) => {
      ctx.save(); ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(src, (t % 8) * 16, (t >> 3) * 16, 16, 16, 0, 0, 16, 16);
      if (shade) { ctx.fillStyle = 'rgba(0,0,0,' + shade + ')'; ctx.fillRect(0, 0, 16, 16); }
      ctx.restore();
    };
    draw(bl.top, [1, .5625, -1, .5625, 24, 6], 0);
    draw(bl.side, [1, .5625, 0, 1.125, 8, 15], .22);
    draw(bl.side, [1, -.5625, 0, 1.125, 24, 24], .4);
    if (W.isStair(id)) { ctx.clearRect(24, 0, 24, 14); ctx.clearRect(24, 14, 24, 4); }
  } else {
    c.width = c.height = 16;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(TEX.itemBuf(id)), 16, 16), 0, 0);
  }
}
function hydrate(root) {
  const list = [];
  if (root.matches && root.matches('canvas[data-icon]')) list.push(root);
  if (root.querySelectorAll) list.push(...root.querySelectorAll('canvas[data-icon]'));
  for (const c of list) { const k = c.getAttribute('data-icon'); if (c.getAttribute('data-done') === k) continue; drawIcon(c, k); c.setAttribute('data-done', k); }
}
new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) hydrate(n); }).observe(document.body, { childList: true, subtree: true });
hydrate(document.body);

/* ---------- textury mobů ---------- */
TEX.make = (w, h, fn, seed) => {
  const data = new Uint8ClampedArray(w * h * 4);
  const rnd = W.mulberry((seed || 1) * 31 + 7);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = fn(x, y, rnd), i = (y * w + x) * 4;
    data[i] = col[0]; data[i + 1] = col[1]; data[i + 2] = col[2]; data[i + 3] = col[3] === undefined ? 255 : col[3];
  }
  return TEX.dataTexture(data, w, h);
};
})();
