/* ===========================================================
   fluid.js – tekoucí voda a láva, obsidián a dlažba při styku
   Simulace se spouští změnou bloku (vykopání, položení vody/lávy…).
   =========================================================== */
(function () {
'use strict';
const { B, BL, SOLID, H } = W;
const getB = G.getB;
const q = new Map();
const nowS = () => performance.now() / 1000;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const isCross = (id) => BL[id] && BL[id].cross;

function add(x, y, z, delay) {
  if (y < 0 || y >= H) return;
  const k = x + ',' + y + ',' + z;
  if (q.has(k)) return;
  const id = getB(x, y, z);
  q.set(k, { x, y, z, t: nowS() + (delay !== undefined ? delay : (W.isLava(id) ? .9 : .22)), waited: false });
}
G.fluidKick = function (x, y, z) {
  add(x, y, z); add(x + 1, y, z); add(x - 1, y, z); add(x, y, z + 1); add(x, y, z - 1); add(x, y + 1, z); add(x, y - 1, z);
};
function supply(x, y, z, water) {
  const ok = water ? W.isWater : W.isLava, maxL = water ? 7 : 3;
  let best = 99;
  if (ok(getB(x, y + 1, z))) best = 1;
  for (const [dx, dz] of DIRS) {
    const n = getB(x + dx, y, z + dz);
    if (!ok(n)) continue;
    const below = getB(x + dx, y - 1, z + dz);
    if (SOLID[below] || (ok(below) && W.levelOf(below) === 0)) best = Math.min(best, W.levelOf(n) + 1);
  }
  return best <= maxL ? best : 99;
}
function touchesWater(x, y, z) {
  if (W.isWater(getB(x, y + 1, z))) return true;
  for (const [dx, dz] of DIRS) if (W.isWater(getB(x + dx, y, z + dz))) return true;
  return false;
}
function fizz(x, y, z) { G.sfx('burn', x, y, z); G.burst(x + .5, y + .8, z + .5, [200, 200, 205], 5, 1.5, .8, -2); }

function proc(c) {
  const { x, y, z } = c;
  if (!G.isLoaded(x, z)) return;
  const id = getB(x, y, z);
  if (SOLID[id]) return;
  const wat = W.isWater(id), lav = W.isLava(id);
  if (lav && touchesWater(x, y, z)) { G.setBlock(x, y, z, W.levelOf(id) === 0 ? B.OBSIDIAN : B.COBBLE); fizz(x, y, z); return; }
  if ((wat || lav) && W.levelOf(id) === 0) return; // zdroj
  if (!(id === 0 || wat || lav || isCross(id))) return;
  const sw = supply(x, y, z, true), sl = supply(x, y, z, false);
  let target = 0;
  if (sw < 99 && sw <= sl) target = 55 + sw;
  else if (sl < 99) {
    if (!lav && !c.waited && id === 0) { c.waited = true; c.t = nowS() + .7; return; }
    if (W.isWater(id)) { G.setBlock(x, y, z, B.COBBLE); fizz(x, y, z); return; }
    target = 62 + sl;
  }
  if (target === 0 && isCross(id)) return; // pochodeň/květina bez vody zůstává
  if (target !== id && !(target === 0 && id === 0)) {
    if (target && target >= 63 && touchesWater(x, y, z)) { G.setBlock(x, y, z, B.COBBLE); fizz(x, y, z); return; }
    G.setBlock(x, y, z, target);
  }
}
G.updateFluids = function () {
  if (!q.size) return;
  const t = nowS();
  let n = 0;
  for (const [k, c] of q) {
    if (c.t > t) continue;
    q.delete(k);
    proc(c);
    if (c.t > t) q.set(k, c); // přeplánováno (láva čeká)
    if (++n >= 90) break;
  }
};
G.fluidClear = () => q.clear();
})();
