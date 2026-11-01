/* ===========================================================
   redstone.js – redstonový prach, páčky, lampy, redstonový blok, ovládání dveří
   Síť se přepočítá po každé změně relevantního bloku (registr bloků v paměti).
   =========================================================== */
(function () {
'use strict';
const { B } = W;
const getB = G.getB;
const REG = new Map();           // "x,y,z" -> [x,y,z] všechny redstonové bloky položené hráčem
const isDust = (id) => id === 81 || id === 82;
const isLever = (id) => id >= 87 && id <= 96;
const leverOn = (id) => (id - 87) & 1;
const isRs = (id) => id >= 81 && id <= 96;
const key = (x, y, z) => x + ',' + y + ',' + z;
let dirty = false, tmr = 0;
const rsDoors = new Set();
G.rsBusy = false;

G.rsHook = function (x, y, z, oldId, id) {
  if (G.rsBusy) return;
  const k = key(x, y, z);
  if (isRs(oldId) && !isRs(id)) REG.delete(k);
  if (isRs(id)) REG.set(k, [x, y, z]);
  if (isRs(oldId) || isRs(id) || W.isDoor(id)) dirty = true;
};
G.rsRebuild = function () {
  REG.clear(); rsDoors.clear();
  for (const [ck, mods] of G.modsMap) {
    const cx = Math.floor(ck / 65536) - 32768, cz = (ck % 65536) - 32768;
    for (const idx in mods) {
      const id = mods[idx];
      if (isRs(id)) { const i = +idx; const x = cx * 16 + (i % 16), z = cz * 16 + (Math.floor(i / 16) % 16), y = Math.floor(i / 256); REG.set(key(x, y, z), [x, y, z]); }
    }
  }
  dirty = true;
};
G.rsClear = () => { REG.clear(); rsDoors.clear(); dirty = false; };

const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const H4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function recompute() {
  G.rsBusy = true;
  const level = new Map();
  const queue = [];
  const setLv = (x, y, z, l) => { const k = key(x, y, z); if ((level.get(k) || 0) < l) { level.set(k, l); queue.push([x, y, z, l]); } };
  const active = new Set(); // aktivní zdroje (pozice)
  for (const [k, p] of REG) {
    const id = getB(p[0], p[1], p[2]);
    if (id === B.RS_BLOCK || (isLever(id) && leverOn(id))) {
      active.add(k);
      for (const [dx, dy, dz] of N6) if (isDust(getB(p[0] + dx, p[1] + dy, p[2] + dz))) setLv(p[0] + dx, p[1] + dy, p[2] + dz, 15);
      // páčka na zdi/podlaze také zapne prach pod sebou a diagonálně dole
      for (const [dx, dz] of H4) if (isDust(getB(p[0] + dx, p[1] - 1, p[2] + dz))) setLv(p[0] + dx, p[1] - 1, p[2] + dz, 14);
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y, z, l] = queue[qi];
    if (l <= 1) continue;
    for (const [dx, dz] of H4) for (const dy of [0, 1, -1]) if (isDust(getB(x + dx, y + dy, z + dz))) setLv(x + dx, y + dy, z + dz, l - 1);
  }
  const poweredCells = []; // buňky, které dodávají energii sousedům
  // prach
  for (const [k, p] of REG) {
    const id = getB(p[0], p[1], p[2]);
    if (isDust(id)) {
      const on = (level.get(k) || 0) > 0;
      const want = on ? B.DUST_ON : B.DUST_OFF;
      if (id !== want) G.setBlock(p[0], p[1], p[2], want);
      if (on) poweredCells.push(p);
    }
  }
  for (const k of active) poweredCells.push(REG.get(k));
  // spotřebiče
  const powered = new Set(poweredCells.map(p => key(p[0], p[1], p[2])));
  const nearPowered = (x, y, z) => { for (const [dx, dy, dz] of N6) if (powered.has(key(x + dx, y + dy, z + dz))) return true; return false; };
  for (const [k, p] of REG) {
    const id = getB(p[0], p[1], p[2]);
    if (id === B.LAMP_OFF || id === B.LAMP_ON) {
      const on = nearPowered(p[0], p[1], p[2]);
      const want = on ? B.LAMP_ON : B.LAMP_OFF;
      if (id !== want) G.setBlock(p[0], p[1], p[2], want);
    }
  }
  // dveře
  const want = new Set();
  for (const p of poweredCells) for (const [dx, dy, dz] of N6) {
    const x = p[0] + dx, y = p[1] + dy, z = p[2] + dz, id = getB(x, y, z);
    if (id === B.TNT) { G.primeTnt(x, y, z, 3); continue; }
    if (W.isDoor(id)) want.add(key(x, ((id - 28) & 1) === 0 ? y : y - 1, z));
  }
  for (const k of want) { const [x, y, z] = k.split(',').map(Number); if (!rsDoors.has(k)) { G.setDoor(x, y, z, true, false); rsDoors.add(k); } }
  for (const k of [...rsDoors]) if (!want.has(k)) { const [x, y, z] = k.split(',').map(Number); G.setDoor(x, y, z, false, false); rsDoors.delete(k); }
  G.rsBusy = false;
}
G.rsTick = function (dt) {
  tmr -= dt;
  if (dirty && tmr <= 0) { tmr = .08; dirty = false; recompute(); }
};
})();
