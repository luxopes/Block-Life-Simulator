/* ===========================================================
   game.js – hráč, ovládání, inventář, výroba, obchod, ukládání, hlavní smyčka
   =========================================================== */
(function () {
'use strict';
const { B, BL, I, H, SOLID } = W;
const { scene, camera, getB } = G;
const $ = (id) => document.getElementById(id);
const rand = Math.random;
/* ---------- úložiště světů ---------- */
const WORLDS_KEY = 'perlicky_worlds_v1', WORLD_PFX = 'perlicky_world_';
const readIndex = () => { try { const a = JSON.parse(localStorage.getItem(WORLDS_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const writeIndex = (a) => { try { localStorage.setItem(WORLDS_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } };
let curWorld = null; // { id, name } právě hraný svět
// migrace jediného staršího uložení (BlokoCraft / první Perlicky) do seznamu světů
try {
  for (const lk of ['perlicky_save_v2', 'blokocraft_save_v2']) {
    const raw = localStorage.getItem(lk); if (!raw) continue;
    let d = null; try { d = JSON.parse(raw); } catch (e) {}
    if (d) {
      const id = 'old' + Date.now().toString(36) + (lk[0] === 'b' ? 'b' : 'p'), idx = readIndex();
      localStorage.setItem(WORLD_PFX + id, raw);
      idx.push({ id, name: 'Starý svět', creative: !!d.creative, seed: d.seed, last: Date.now() }); writeIndex(idx);
    }
    localStorage.removeItem(lk);
  }
} catch (e) {}
const DAY_LEN = 720; // sekund na celý den

/* ---------- názvy ---------- */
const NAMES = {
  [I.STICK]: 'Tyčka', [I.COAL]: 'Uhlí', [I.IRON]: 'Železo', [I.WHEAT_ITEM]: 'Pšenice', [I.BREAD]: 'Chleba', [I.APPLE]: 'Jablko',
  [I.SWORD_W]: 'Dřevěný meč', [I.SWORD_S]: 'Kamenný meč', [I.SWORD_I]: 'Železný meč',
  [I.PICK_W]: 'Dřevěný krumpáč', [I.PICK_S]: 'Kamenný krumpáč', [I.PICK_I]: 'Železný krumpáč',
  [I.BEEF]: 'Syrové hovězí', [I.PORK]: 'Syrové vepřové', [I.CHICKEN]: 'Syrové kuře', [I.STEAK]: 'Steak', [I.PORKCHOP]: 'Vepřová kotleta', [I.CHICKEN_C]: 'Pečené kuře',
  [I.F_TABLE]: 'Stůl', [I.F_CHAIR]: 'Židle', [I.F_SOFA]: 'Pohovka', [I.F_SHELF]: 'Knihovna', [I.F_WARD]: 'Skříň', [I.F_LAMP]: 'Stojací lampa', [I.F_PLANT]: 'Květina v květináči', [I.F_COUNTER]: 'Kuchyňská linka', [I.F_SWING]: 'Houpačka', [I.F_SLIDE]: 'Skluzavka', [I.F_SEESAW]: 'Houpačka na prkně', [I.F_SANDBOX]: 'Pískoviště', [I.F_SIGN]: 'Cedule',
  [I.DOOR]: 'Dveře', [I.BED]: 'Postel', [I.LADDER]: 'Žebřík', [I.GOLD]: 'Zlato', [I.DIAMOND]: 'Diamant',
  [I.AXE_W]: 'Dřevěná sekera', [I.AXE_S]: 'Kamenná sekera', [I.AXE_I]: 'Železná sekera', [I.AXE_D]: 'Diamantová sekera',
  [I.SHOVEL_W]: 'Dřevěná lopata', [I.SHOVEL_S]: 'Kamenná lopata', [I.SHOVEL_I]: 'Železná lopata', [I.SHOVEL_D]: 'Diamantová lopata',
  [I.SWORD_D]: 'Diamantový meč', [I.PICK_D]: 'Diamantový krumpáč',
  [I.EGG_VINDICATOR]: 'Vejce vindikátora', [I.EGG_RAVAGER]: 'Vejce pustošníka', [I.EGG_PILLAGER]: 'Vejce pillagera', [I.EGG_EVIL]: 'Vejce zlého golema', [I.EGG_GOLEM]: 'Vejce golema', [I.EGG_COW]: 'Vejce krávy', [I.EGG_PIG]: 'Vejce prasete', [I.EGG_SHEEP]: 'Vejce ovce', [I.EGG_CHICKEN]: 'Vejce kuřete', [I.EGG_VILLAGER]: 'Vejce vesničana',
  [I.RABBIT]: 'Syrové králičí', [I.RABBIT_C]: 'Pečené králičí', [I.EGG_HORSE]: 'Vejce koně', [I.EGG_RABBIT]: 'Vejce králíka', [I.EGG_WOLF]: 'Vejce vlka', [I.FLINT_STEEL]: 'Křesadlo', [I.MINECART]: 'Vozík', [I.REDSTONE]: 'Redstone prach', [I.EMERALD]: 'Smaragd', [I.LEATHER]: 'Kůže', [I.A_LEA_H]: 'Kožená helma', [I.A_LEA_C]: 'Kožený krunýř', [I.A_LEA_L]: 'Kožené kalhoty', [I.A_LEA_B]: 'Kožené boty',
  [I.A_IRON_H]: 'Železná helma', [I.A_IRON_C]: 'Železný krunýř', [I.A_IRON_L]: 'Železné kalhoty', [I.A_IRON_B]: 'Železné boty',
  [I.A_GOLD_H]: 'Zlatá helma', [I.A_GOLD_C]: 'Zlatý krunýř', [I.A_GOLD_L]: 'Zlaté kalhoty', [I.A_GOLD_B]: 'Zlaté boty',
  [I.A_DIA_H]: 'Diamantová helma', [I.A_DIA_C]: 'Diamantový krunýř', [I.A_DIA_L]: 'Diamantové kalhoty', [I.A_DIA_B]: 'Diamantové boty',
  [I.RAW_IRON]: 'Surové železo', [I.RAW_GOLD]: 'Surové zlato', [I.BOW]: 'Luk', [I.CROSSBOW]: 'Kuše', [I.ARROW]: 'Šíp', [I.FEATHER]: 'Pírko', [I.STRING]: 'Nit'
};
const nameOf = (id) => NAMES[id] || (BL[id] ? BL[id].name : '?');
G.nameOf = nameOf;
const TOOL = {
  [I.SWORD_W]: ['sword', 1], [I.SWORD_S]: ['sword', 2], [I.SWORD_I]: ['sword', 3],
  [I.PICK_W]: ['pick', 1], [I.PICK_S]: ['pick', 2], [I.PICK_I]: ['pick', 3], [I.PICK_D]: ['pick', 4], [I.SWORD_D]: ['sword', 4],
  [I.AXE_W]: ['axe', 1], [I.AXE_S]: ['axe', 2], [I.AXE_I]: ['axe', 3], [I.AXE_D]: ['axe', 4],
  [I.SHOVEL_W]: ['shovel', 1], [I.SHOVEL_S]: ['shovel', 2], [I.SHOVEL_I]: ['shovel', 3], [I.SHOVEL_D]: ['shovel', 4]
};
// brnění: id -> [slot (0 helma, 1 krunýř, 2 kalhoty, 3 boty), obrana]
const ARMOR = {};
[[2, 6, 5, 2], [2, 5, 3, 1], [3, 8, 6, 3]].forEach((def, tier) => def.forEach((d, slot) => { ARMOR[150 + tier * 4 + slot] = [slot, d]; }));
[1, 3, 2, 1].forEach((d, slot) => { ARMOR[162 + slot] = [slot, d]; });
const GOLEM_EGG = {};
const SPAWN_EGG = { [I.EGG_GOLEM]: 'golem', [I.EGG_COW]: 'cow', [I.EGG_PIG]: 'pig', [I.EGG_SHEEP]: 'sheep', [I.EGG_CHICKEN]: 'chicken', [I.EGG_VILLAGER]: 'villager', [I.EGG_HORSE]: 'horse', [I.EGG_RABBIT]: 'rabbit', [I.EGG_WOLF]: 'wolf', [I.EGG_PILLAGER]: 'pillager', [I.EGG_VINDICATOR]: 'vindicator', [I.EGG_RAVAGER]: 'ravager', [I.EGG_EVIL]: 'evilgolem' };
W.EGG_MATS.forEach((m, i) => { SPAWN_EGG[200 + i] = 'golem'; GOLEM_EGG[200 + i] = m; });
W.EGG_MATS.forEach((m, i) => { Object.defineProperty(NAMES, 200 + i, { get: () => 'Vejce: ' + ((G.golemInfo(m) || { name: 'golem' }).name) }); });
const SLOT_NAMES = ['Helma', 'Krunýř', 'Kalhoty', 'Boty'];
const maxStack = (id) => (TOOL[id] || ARMOR[id] || id === I.BOW || id === I.CROSSBOW) ? 1 : 64;
const armorPoints = () => player.armor.reduce((a, s) => a + (s && ARMOR[s.id] ? ARMOR[s.id][1] : 0), 0);
const FOOD = { [I.BREAD]: 6, [I.APPLE]: 4, [I.BEEF]: 3, [I.PORK]: 3, [I.CHICKEN]: 2, [I.RABBIT]: 3, [I.RABBIT_C]: 6, [I.STEAK]: 9, [I.PORKCHOP]: 9, [I.CHICKEN_C]: 6 };

/* ---------- hráč ---------- */
const player = G.player = {
  x: 0, y: 60, z: 0, vx: 0, vy: 0, vz: 0, w: .3, h: 1.8, yaw: 0, pitch: 0, onGround: false, alive: true,
  armor: [null, null, null, null], hp: 20, maxhp: 20, food: 20, foodT: 0, starveT: 0, creative: false, flying: false, inv: 0, fall: 0, peak: 0, air: 10, bob: 0, shake: 0, stepD: 0, regen: 0, lavaT: 0, hitX: false, hitZ: false
};
const inv = G.inv = new Array(36).fill(null);
let sel = 0;
let state = 'menu'; // menu | loading | play
let uiOpen = null;  // null | 'inv' | 'trade'
let locked = false;
let spawnPt = { x: .5, y: 60, z: .5 };
let held = null; // stack v kurzoru
let paused = false;
const keys = {};
let mouseL = false, mouseR = false;
let showDebug = false;

/* ---------- zprávy ---------- */
let toastT = 0;
function msg(t, ms) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 2200); }
G.msg = msg;

/* ---------- inventář ---------- */
function addItem(id, n) {
  const max = maxStack(id);
  for (let pass = 0; pass < 2 && n > 0; pass++) {
    for (let i = 0; i < 36 && n > 0; i++) {
      const s = inv[i];
      if (pass === 0 && s && s.id === id && s.count < max) { const a = Math.min(n, max - s.count); s.count += a; n -= a; }
      else if (pass === 1 && !s) { const a = Math.min(n, max); inv[i] = { id, count: a }; n -= a; }
    }
  }
  return n;
}
G.addItem = addItem;
const countItem = (id) => inv.reduce((a, s) => a + (s && s.id === id ? s.count : 0), 0);
function removeItem(id, n) {
  for (let i = 0; i < 36 && n > 0; i++) { const s = inv[i]; if (s && s.id === id) { const a = Math.min(n, s.count); s.count -= a; n -= a; if (s.count <= 0) inv[i] = null; } }
}
function toolInfo() {
  const s = inv[sel]; const r = { pick: 0, sword: 0, axe: 0, shovel: 0 };
  if (s && TOOL[s.id]) r[TOOL[s.id][0]] = TOOL[s.id][1];
  return r;
}
const NEEDS_PICK = new Set([B.STONE, B.COBBLE, B.COAL_ORE, B.IRON_ORE, B.SANDSTONE, B.BRICKS, B.SLAB_C, B.GRANITE, B.DIORITE, B.ANDESITE, B.DEEPSLATE, B.GOLD_ORE, B.DIAMOND_ORE, B.STONE_BRICKS, B.IRON_BLOCK, B.FURNACE, B.GOLD_BLOCK, B.DIAMOND_BLOCK, B.EMERALD_BLOCK, B.RS_ORE]);
const PICK_REQ = { [B.RS_ORE]: 3, [B.GOLD_BLOCK]: 3, [B.DIAMOND_BLOCK]: 3, [B.EMERALD_BLOCK]: 3, [B.IRON_BLOCK]: 2, [B.IRON_ORE]: 2, [B.GOLD_ORE]: 3, [B.DIAMOND_ORE]: 3, [B.OBSIDIAN]: 4 };
G.dropOf = function (id, tool) {
  if (id === B.OBSIDIAN) return tool && tool.pick < 4 ? null : [id, 1];
  if (tool && NEEDS_PICK.has(id) && tool.pick < (PICK_REQ[id] || 1)) return null;
  if (W.isDoor(id)) return [I.DOOR, 1];
  if (W.isBed(id)) return [I.BED, 1];
  if (W.isChest(id)) return [B.CHEST0, 1];
  if (W.isLadder(id)) return [I.LADDER, 1];
  if (id === B.DUST_OFF || id === B.DUST_ON) return [I.REDSTONE, 1];
  if (id === B.LAMP_ON) return [B.LAMP_OFF, 1];
  if (id >= 87 && id <= 96) return [87, 1];
  if (id === B.RS_ORE) return [I.REDSTONE, 4 + (rand() < .5 ? 1 : 0)];
  switch (id) {
    case B.STONE: return [B.COBBLE, 1];
    case B.COAL_ORE: return [I.COAL, 1];
    case B.IRON_ORE: return [I.RAW_IRON, 1];
    case B.GOLD_ORE: return [I.RAW_GOLD, 1];
    case B.DIAMOND_ORE: return [I.DIAMOND, 1];
    case B.GRASS: case B.PATH: case B.FARM: return [B.DIRT, 1];
    case B.LEAVES: return rand() < .07 ? [I.APPLE, 1] : rand() < .12 ? [I.STICK, 1] : null;
    case B.TALLGRASS: return rand() < .15 ? [I.WHEAT_ITEM, 1] : null;
    case B.WHEAT: return [I.WHEAT_ITEM, 1 + (rand() < .5 ? 1 : 0)];
    case B.GLASS: case B.BEDROCK: case B.WATER: case B.LAVA: return null;
    default: return [id, 1];
  }
};

/* ---------- UI: lišta, srdíčka ---------- */
function renderFood() {
  const el = $('food');
  if (player.creative) { el.innerHTML = ''; return; }
  let h = '';
  for (let i = 0; i < 10; i++) { const v = player.food - i * 2; h += `<canvas class="px" data-icon="${I.PORKCHOP}" style="opacity:${v >= 2 ? 1 : v >= 1 ? .6 : .18}"></canvas>`; }
  el.innerHTML = h;
}
function renderHearts() {
  renderFood();
  const el = $('hearts'); let h = '';
  const ap = armorPoints(); if (ap > 0) h += `<span style="color:#cfd8ff;font-size:14px;margin-right:8px;text-shadow:1px 1px 0 #000">🛡 ${ap}</span>`;
  for (let i = 0; i < 10; i++) { const v = player.hp - i * 2; h += `<canvas class="heart px" data-icon="h${v >= 2 ? 2 : v >= 1 ? 1 : 0}"></canvas>`; }
  if (player.air < 10) { let a = ''; for (let i = 0; i < Math.ceil(player.air); i++) a += '●'; h += `<span style="margin-left:10px;color:#7fc8ff">${a}</span>`; }
  el.innerHTML = h;
}
function slotHTML(s, extra) {
  return s ? `<canvas class="px" data-icon="${s.id}" title="${nameOf(s.id)}"></canvas>${s.count > 1 ? `<span class="cnt">${s.count}</span>` : ''}` : '';
}
function renderHotbar() {
  const hb = $('hotbar'); hb.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const d = document.createElement('div'); d.className = 'slot' + (i === sel ? ' sel' : '');
    d.innerHTML = `<span class="key">${i + 1}</span>` + slotHTML(inv[i]);
    hb.appendChild(d);
  }
}
function refreshUI() {
  renderHotbar(); renderHearts(); updateHand();
  if (uiOpen === 'inv') renderInv();
}
G.refreshUI = refreshUI;

/* ---------- inventář – obrazovka ---------- */
const CRE_ITEMS = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.SAND, B.GRAVEL, B.LOG, B.LEAVES, B.PLANKS, B.SNOW, B.GLASS, B.SANDSTONE, B.BRICKS, B.PATH, B.FARM, B.CACTUS,
  B.FENCE, ...W.STAIR_MATS.map((m, k) => W.STAIR0 + k * 4), B.SLAB_P, B.SLAB_C, B.TNT, I.FLINT_STEEL, B.RAIL, 87, I.REDSTONE, I.MINECART, B.RS_BLOCK, B.LAMP_OFF, B.RS_ORE, B.IRON_BLOCK, B.GOLD_BLOCK, B.DIAMOND_BLOCK, B.EMERALD_BLOCK, B.PUMPKIN, B.FURNACE, B.COAL_ORE, B.IRON_ORE, B.GOLD_ORE, B.DIAMOND_ORE, B.GRANITE, B.DIORITE, B.ANDESITE, B.DEEPSLATE, B.STONE_BRICKS, B.GLOWSTONE, B.ASPHALT, W.RAMP_IDS[0][0], W.RAMP_IDS[1][0], B.LINE_X, B.LINE_Z, B.CONCRETE, B.CONCRETE_D, B.PANEL, B.SIDEWALK, B.MGLASS, B.STEEL, B.TORCH, B.WOOL, B.HAY, B.SLAB_P, B.SLAB_C, B.CHEST0, I.DOOR, I.BED, I.F_TABLE, I.F_CHAIR, I.F_SOFA, I.F_SHELF, I.F_WARD, I.F_LAMP, I.F_PLANT, I.F_COUNTER, I.F_SWING, I.F_SLIDE, I.F_SEESAW, I.F_SANDBOX, I.F_SIGN, I.LADDER, B.TALLGRASS, B.FLOWER_R, B.FLOWER_Y, B.WHEAT, B.WATER, B.LAVA, B.OBSIDIAN, B.BEDROCK,
  I.STICK, I.COAL, I.IRON, I.GOLD, I.DIAMOND, 162, 163, 164, 165, I.LEATHER, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, ...W.EGG_MATS.map((m, i) => 200 + i), I.RABBIT, I.RABBIT_C, I.EGG_HORSE, I.EGG_RABBIT, I.EGG_WOLF, I.EMERALD, I.EGG_VINDICATOR, I.EGG_RAVAGER, I.EGG_PILLAGER, I.EGG_EVIL, I.EGG_GOLEM, I.EGG_VILLAGER, I.EGG_COW, I.EGG_PIG, I.EGG_SHEEP, I.EGG_CHICKEN, I.RAW_IRON, I.RAW_GOLD, I.BOW, I.CROSSBOW, I.ARROW, I.FEATHER, I.STRING, I.AXE_W, I.AXE_S, I.AXE_I, I.AXE_D, I.SHOVEL_W, I.SHOVEL_S, I.SHOVEL_I, I.SHOVEL_D, I.SWORD_D, I.PICK_D, I.WHEAT_ITEM, I.BREAD, I.APPLE, I.BEEF, I.PORK, I.CHICKEN, I.STEAK, I.PORKCHOP, I.CHICKEN_C, I.SWORD_W, I.SWORD_S, I.SWORD_I, I.PICK_W, I.PICK_S, I.PICK_I];
const RECIPES = [
  { out: [B.PLANKS, 4], in: [[B.LOG, 1]] },
  { out: [I.STICK, 4], in: [[B.PLANKS, 2]] },
  { out: [B.TORCH, 4], in: [[I.COAL, 1], [I.STICK, 1]] },
  { out: [I.PICK_W, 1], in: [[B.PLANKS, 3], [I.STICK, 2]] },
  { out: [I.PICK_S, 1], in: [[B.COBBLE, 3], [I.STICK, 2]] },
  { out: [I.PICK_I, 1], in: [[I.IRON, 3], [I.STICK, 2]] },
  { out: [I.SWORD_W, 1], in: [[B.PLANKS, 2], [I.STICK, 1]] },
  { out: [I.SWORD_S, 1], in: [[B.COBBLE, 2], [I.STICK, 1]] },
  { out: [I.SWORD_I, 1], in: [[I.IRON, 2], [I.STICK, 1]] },
  { out: [I.BREAD, 1], in: [[I.WHEAT_ITEM, 3]] },
  { out: [B.GLASS, 2], in: [[B.SAND, 2]] },
  { out: [B.SANDSTONE, 2], in: [[B.SAND, 4]] },
  { out: [B.BRICKS, 2], in: [[B.COBBLE, 2], [B.DIRT, 2]] },
  { out: [B.GLOWSTONE, 1], in: [[I.COAL, 2], [B.SAND, 2]] },
  { out: [B.COBBLE, 1], in: [[B.GRAVEL, 2]] },
  { out: [I.AXE_W, 1], in: [[B.PLANKS, 3], [I.STICK, 2]] }, { out: [I.AXE_S, 1], in: [[B.COBBLE, 3], [I.STICK, 2]] },
  { out: [I.AXE_I, 1], in: [[I.IRON, 3], [I.STICK, 2]] }, { out: [I.AXE_D, 1], in: [[I.DIAMOND, 3], [I.STICK, 2]] },
  { out: [I.SHOVEL_W, 1], in: [[B.PLANKS, 1], [I.STICK, 2]] }, { out: [I.SHOVEL_S, 1], in: [[B.COBBLE, 1], [I.STICK, 2]] },
  { out: [I.SHOVEL_I, 1], in: [[I.IRON, 1], [I.STICK, 2]] }, { out: [I.SHOVEL_D, 1], in: [[I.DIAMOND, 1], [I.STICK, 2]] },
  { out: [I.SWORD_D, 1], in: [[I.DIAMOND, 2], [I.STICK, 1]] }, { out: [I.PICK_D, 1], in: [[I.DIAMOND, 3], [I.STICK, 2]] },
  { out: [B.STONE_BRICKS, 4], in: [[B.COBBLE, 4]] },
  ...[5, 8, 7, 4].map((n, slot) => ({ out: [162 + slot, 1], in: [[I.LEATHER, n]] })),
  ...[[I.IRON, 0], [I.GOLD, 1], [I.DIAMOND, 2]].flatMap(([mat, tier]) => [5, 8, 7, 4].map((n, slot) => ({ out: [150 + tier * 4 + slot, 1], in: [[mat, n]] }))),
  { out: [B.TNT, 2], in: [[I.COAL, 4], [B.SAND, 4]] },
  { out: [I.FLINT_STEEL, 1], in: [[I.IRON, 1], [I.COAL, 1]] },
  { out: [B.FENCE, 3], in: [[B.PLANKS, 2], [I.STICK, 2]] },
  { out: [B.RAIL, 4], in: [[I.IRON, 1], [I.STICK, 1]] },
  { out: [I.MINECART, 1], in: [[I.IRON, 5]] },
  { out: [87, 1], in: [[I.STICK, 1], [B.COBBLE, 1]] },
  { out: [B.RS_BLOCK, 1], in: [[I.REDSTONE, 4]] },
  { out: [B.LAMP_OFF, 1], in: [[B.GLOWSTONE, 1], [I.REDSTONE, 4]] },
  { out: [B.FURNACE, 1], in: [[B.COBBLE, 8]] },
  { out: [B.IRON_BLOCK, 1], in: [[I.IRON, 4]] },
  { out: [B.GOLD_BLOCK, 1], in: [[I.GOLD, 4]] },
  { out: [B.DIAMOND_BLOCK, 1], in: [[I.DIAMOND, 4]] },
  { out: [B.EMERALD_BLOCK, 1], in: [[I.EMERALD, 4]] },
  { out: [I.STRING, 2], in: [[B.WOOL, 1]] },
  { out: [I.ARROW, 4], in: [[I.STICK, 1], [I.COAL, 1], [I.FEATHER, 1]] },
  { out: [I.BOW, 1], in: [[I.STICK, 3], [I.STRING, 3]] },
  { out: [I.CROSSBOW, 1], in: [[I.STICK, 3], [I.STRING, 2], [I.IRON, 1], [B.PLANKS, 1]] },
  { out: [I.DOOR, 1], in: [[B.PLANKS, 4]] },
  { out: [I.BED, 1], in: [[B.WOOL, 3], [B.PLANKS, 3]] },
  { out: [I.F_TABLE, 1], in: [[B.PLANKS, 4], [I.STICK, 4]] },
  { out: [I.F_CHAIR, 1], in: [[B.PLANKS, 2], [I.STICK, 3]] },
  { out: [I.F_SOFA, 1], in: [[B.WOOL, 3], [B.PLANKS, 2]] },
  { out: [I.F_SHELF, 1], in: [[B.PLANKS, 6], [I.LEATHER, 1]] },
  { out: [I.F_WARD, 1], in: [[B.PLANKS, 6], [I.IRON, 1]] },
  { out: [I.F_LAMP, 1], in: [[B.TORCH, 1], [B.WOOL, 1], [I.STICK, 2]] },
  { out: [I.F_PLANT, 1], in: [[B.FLOWER_R, 1], [B.BRICKS, 1]] },
  { out: [I.F_COUNTER, 1], in: [[B.PLANKS, 4], [B.COBBLE, 2]] },
  { out: [I.F_SWING, 1], in: [[I.STICK, 4], [B.PLANKS, 2]] },
  { out: [I.F_SLIDE, 1], in: [[B.PLANKS, 5], [I.STICK, 2]] },
  { out: [I.F_SEESAW, 1], in: [[B.PLANKS, 3], [I.STICK, 1]] },
  { out: [I.F_SANDBOX, 1], in: [[B.PLANKS, 4], [B.SAND, 4]] },
  { out: [I.F_SIGN, 2], in: [[B.PLANKS, 2], [I.STICK, 1]] },
  { out: [B.CHEST0, 1], in: [[B.PLANKS, 8]] },
  { out: [I.LADDER, 3], in: [[I.STICK, 5]] },
  { out: [B.SLAB_P, 6], in: [[B.PLANKS, 3]] },
  { out: [B.SLAB_C, 6], in: [[B.COBBLE, 3]] },
  ...W.STAIR_MATS.map((m, k) => ({ out: [W.STAIR0 + k * 4, 4], in: [[m, 6]] })),
  { out: [W.RAMP_IDS[0][0], 4], in: [[B.ASPHALT, 6]] }, { out: [W.RAMP_IDS[1][0], 4], in: [[B.CONCRETE, 6]] },
  { out: [B.HAY, 1], in: [[I.WHEAT_ITEM, 4]] },
  { out: [I.STEAK, 1], in: [[I.BEEF, 1], [I.COAL, 1]] },
  { out: [I.PORKCHOP, 1], in: [[I.PORK, 1], [I.COAL, 1]] },
  { out: [I.CHICKEN_C, 1], in: [[I.CHICKEN, 1], [I.COAL, 1]] },
  { out: [I.RABBIT_C, 1], in: [[I.RABBIT, 1], [I.COAL, 1]] }
];
let chestRef = null;
function slotEl(i, arr) {
  arr = arr || inv;
  const d = document.createElement('div'); d.className = 'slot'; d.innerHTML = slotHTML(arr[i]);
  d.onmousedown = (ev) => { ev.preventDefault(); clickSlot(i, ev.button, arr); };
  d.oncontextmenu = (e) => e.preventDefault();
  return d;
}
function clickSlot(i, button, inv) {
  if (inv === player.armor && held && !(ARMOR[held.id] && ARMOR[held.id][0] === i)) return;
  if (inv === player.armor && held && held.count > 1) return;
  if (chestRef && chestRef.furnace && inv === chestRef.arr && i === 2 && held) return;
  const s = inv[i];
  if (button === 2) { // pravé: půlka / jedna
    if (!held && s) { const half = Math.ceil(s.count / 2); held = { id: s.id, count: half }; s.count -= half; if (s.count <= 0) inv[i] = null; }
    else if (held && (!s || s.id === held.id)) { if (!s) inv[i] = { id: held.id, count: 1 }; else if (s.count < 64) s.count++; else return; held.count--; if (held.count <= 0) held = null; }
  } else {
    if (!held) { if (s) { held = s; inv[i] = null; } }
    else if (!s) { inv[i] = held; held = null; }
    else if (s.id === held.id && maxStack(s.id) > 1) { const a = Math.min(held.count, 64 - s.count); s.count += a; held.count -= a; if (held.count <= 0) held = null; }
    else { inv[i] = held; held = s; }
  }
  refreshUI(); renderHeld();
}
function renderHeld() {
  const el = $('held');
  if (!held) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = `<canvas class="px" data-icon="${held.id}"></canvas>${held.count > 1 ? `<span class="cnt">${held.count}</span>` : ''}`;
}
window.addEventListener('mousemove', (e) => { const el = $('held'); el.style.left = (e.clientX - 20) + 'px'; el.style.top = (e.clientY - 20) + 'px'; });
function renderInv() {
  const g = $('invGrid'), hb = $('invHot'); g.innerHTML = ''; hb.innerHTML = '';
  for (let i = 9; i < 36; i++) g.appendChild(slotEl(i));
  for (let i = 0; i < 9; i++) { const e = slotEl(i); if (i === sel) e.classList.add('sel'); hb.appendChild(e); }
  const ar = $('invArmor'); ar.innerHTML = '';
  for (let i = 0; i < 4; i++) { const e = slotEl(i, player.armor); e.title = SLOT_NAMES[i]; ar.appendChild(e); }
  $('armorPts').textContent = armorPoints() ? '  (obrana ' + armorPoints() + ')' : '';
  const rp = $('rightPane'); rp.innerHTML = '';
  if (chestRef && chestRef.furnace) {
    const f = chestRef.furnace;
    $('invTitle').textContent = 'Inventář';
    const wrap = document.createElement('div');
    wrap.innerHTML = '<h3>Pec – surovina, palivo → výsledek</h3>';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:10px';
    const col1 = document.createElement('div'); col1.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:center';
    col1.appendChild(slotEl(0, f.s));
    col1.insertAdjacentHTML('beforeend', `<div style="width:52px;height:10px;background:#555;border:1px solid #222"><i style="display:block;height:100%;width:${Math.min(100, f.burn / f.burnMax * 100)}%;background:#ff9a20"></i></div>`);
    col1.appendChild(slotEl(1, f.s));
    row.appendChild(col1);
    row.insertAdjacentHTML('beforeend', `<div style="font-size:26px">→<div style="width:60px;height:10px;background:#555;border:1px solid #222"><i style="display:block;height:100%;width:${Math.min(100, f.cook / 8 * 100)}%;background:#fff"></i></div></div>`);
    row.appendChild(slotEl(2, f.s));
    wrap.appendChild(row);
    wrap.insertAdjacentHTML('beforeend', '<p style="font-size:12px;max-width:300px">Palivo: uhlí (64 s), dřevo/prkna (12 s), tyčky. Vypeče: rudy (surové železo/zlato), písek → sklo, dlažbu → kámen, maso, dřevo → uhlí.</p>');
    rp.appendChild(wrap);
  } else if (chestRef) {
    $('invTitle').textContent = 'Inventář';
    const wrap = document.createElement('div');
    wrap.innerHTML = '<h3>Truhla</h3>';
    const gr = document.createElement('div'); gr.className = 'grid';
    for (let i = 0; i < 27; i++) gr.appendChild(slotEl(i, chestRef.arr));
    wrap.appendChild(gr); rp.appendChild(wrap);
  } else if (player.creative) {
    $('invTitle').textContent = 'Kreativní inventář';
    const wrap = document.createElement('div');
    wrap.innerHTML = '<h3>Všechny bloky a předměty (klik = do vybraného slotu)</h3>';
    const pal = document.createElement('div'); pal.id = 'palette';
    for (const id of CRE_ITEMS) {
      const d = document.createElement('div'); d.className = 'slot'; d.title = nameOf(id); d.innerHTML = `<canvas class="px" data-icon="${id}"></canvas>`;
      d.onclick = () => { inv[sel] = { id, count: 64 }; refreshUI(); };
      pal.appendChild(d);
    }
    wrap.appendChild(pal); rp.appendChild(wrap);
  } else {
    $('invTitle').textContent = 'Inventář';
    const wrap = document.createElement('div'); wrap.id = 'craft';
    wrap.innerHTML = '<h3>Výroba</h3>';
    for (const r of RECIPES) {
      const ok = r.in.every(([id, n]) => countItem(id) >= n);
      const d = document.createElement('div'); d.className = 'recipe' + (ok ? '' : ' no');
      d.innerHTML = `<canvas class="px" data-icon="${r.out[0]}"></canvas><div><b>${nameOf(r.out[0])}</b> ×${r.out[1]}<div class="need">${r.in.map(([id, n]) => `<span><canvas class="px" data-icon="${id}"></canvas>${n}× ${nameOf(id)}</span>`).join('')}</div></div>`;
      const b = document.createElement('button'); b.className = 'b sm'; b.textContent = 'Vyrobit'; b.disabled = !ok;
      b.onclick = () => craft(r);
      d.appendChild(b); wrap.appendChild(d);
    }
    rp.appendChild(wrap);
  }
}
function craft(r) {
  if (!r.in.every(([id, n]) => countItem(id) >= n)) return;
  for (const [id, n] of r.in) removeItem(id, n);
  const rest = addItem(r.out[0], r.out[1]);
  if (rest) G.dropItem(player.x, player.y + 1, player.z, r.out[0], rest);
  G.sfx('pop'); refreshUI();
}
function openInv() {
  if (state !== 'play' || !player.alive) return;
  uiOpen = 'inv'; $('inv').style.display = 'flex'; renderInv(); document.exitPointerLock();
}
G.furnaces = new Map();
const SMELT = { [I.RAW_IRON]: I.IRON, [I.RAW_GOLD]: I.GOLD, [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE, [I.BEEF]: I.STEAK, [I.PORK]: I.PORKCHOP, [I.CHICKEN]: I.CHICKEN_C, [I.RABBIT]: I.RABBIT_C, [B.LOG]: I.COAL };
const FUEL = { [I.COAL]: 64, [B.LOG]: 12, [B.PLANKS]: 12, [I.STICK]: 4, [B.SLAB_P]: 6 };
function furnaceAt(x, y, z) {
  const k = x + ',' + y + ',' + z;
  let f = G.furnaces.get(k);
  if (!f) { f = { s: [null, null, null], burn: 0, burnMax: 1, cook: 0 }; G.furnaces.set(k, f); }
  return f;
}
function openFurnace(x, y, z) {
  chestRef = { arr: furnaceAt(x, y, z).s, furnace: furnaceAt(x, y, z), x, y, z };
  G.sfx('chest'); openInv();
}
function updateFurnaces(dt) {
  for (const f of G.furnaces.values()) {
    const inp = f.s[0], fuel = f.s[1], out = f.s[2];
    const res = inp ? SMELT[inp.id] : undefined;
    const can = res !== undefined && (!out || (out.id === res && out.count < 64));
    if (f.burn <= 0 && can && fuel && FUEL[fuel.id]) { f.burn = f.burnMax = FUEL[fuel.id]; fuel.count--; if (fuel.count <= 0) f.s[1] = null; }
    if (f.burn > 0) {
      f.burn -= dt;
      if (can) {
        f.cook += dt;
        if (f.cook >= 8) { f.cook = 0; inp.count--; if (inp.count <= 0) f.s[0] = null; if (f.s[2]) f.s[2].count++; else f.s[2] = { id: res, count: 1 }; }
      } else f.cook = Math.max(0, f.cook - dt * 2);
    } else f.cook = Math.max(0, f.cook - dt);
  }
}
G.chests = new Map();
const LOOT = [[I.BREAD, 4, 3], [I.APPLE, 3, 3], [I.COAL, 5, 4], [I.IRON, 2, 3], [I.STICK, 6, 4], [I.WHEAT_ITEM, 5, 4], [B.TORCH, 6, 5], [I.PICK_W, 1, 1], [I.SWORD_S, 1, 1], [B.GLOWSTONE, 3, 2], [I.STEAK, 3, 2], [I.EMERALD, 4, 3], [I.GOLD, 1, 1], [I.LEATHER, 3, 2], [I.ARROW, 6, 3], [I.FEATHER, 3, 2], [I.AXE_W, 1, 1], [I.SHOVEL_S, 1, 1], [B.PLANKS, 8, 4], [B.WOOL, 3, 2]];
function chestKey(x, y, z) { return x + ',' + y + ',' + z; }
function chestArr(x, y, z) {
  const k = chestKey(x, y, z);
  let a = G.chests.get(k);
  if (!a) {
    a = new Array(27).fill(null);
    const r = W.mulberry(Math.floor(W.hash3(x, y, z, W.getSeed()) * 4294967296));
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) { const L = LOOT[Math.floor(r() * LOOT.length)]; const slot = Math.floor(r() * 27); if (!a[slot]) a[slot] = { id: L[0], count: 1 + Math.floor(r() * L[2]) }; }
    G.chests.set(k, a);
  }
  return a;
}
function openChest(x, y, z) {
  chestRef = { arr: chestArr(x, y, z), x, y, z };
  G.sfx('chest');
  openInv();
}
function signPrompt(rec) {
  let o = $('signUI');
  if (!o) {
    o = document.createElement('div'); o.id = 'signUI'; o.className = 'screen';
    o.innerHTML = '<div class="win" style="flex-direction:column;min-width:320px;gap:10px;align-items:center"><h3 style="font-size:18px">Text cedule</h3><input id="signIn" maxlength="16" style="font-size:20px;padding:8px;border-radius:6px;border:2px solid #777;background:#222;color:#fff;text-align:center;width:90%"><div style="display:flex;gap:8px"><button class="b sm" id="signOk">Uložit</button><button class="b sm" id="signNo">Zrušit</button></div></div>';
    document.body.appendChild(o);
  }
  uiOpen = 'sign'; document.exitPointerLock(); o.style.display = 'flex';
  const inp = $('signIn'); inp.value = rec.txt || ''; setTimeout(() => inp.focus(), 50);
  const fin = (ok) => { if (ok && inp.value.trim()) G.signSet(rec, inp.value.trim().slice(0, 16)); closeUI(); };
  $('signOk').onclick = () => fin(true); $('signNo').onclick = () => fin(false);
  inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); };
}
G.signPrompt = signPrompt;
function closeUI() {
  if (chestRef) { chestRef = null; G.sfx('chest'); }
  if (held) { const rest = addItem(held.id, held.count); if (rest) G.dropItem(player.x, player.y + 1, player.z, held.id, rest); held = null; renderHeld(); }
  uiOpen = null; $('inv').style.display = 'none'; $('trade').style.display = 'none'; { const su = $('signUI'); if (su) su.style.display = 'none'; }
  refreshUI(); lock();
  setTimeout(() => { if (state === 'play' && !uiOpen && !locked && !touchMode && !paused && player.alive) msg('Klikni do hry pro ovládání myší', 1800); }, 250);
}

/* ---------- obchod s vesničany ---------- */
const EM = I.EMERALD;
const OFFERS = [
  // 0 Farmář
  [{ give: [EM, 1], get: [I.BREAD, 6] }, { give: [EM, 1], get: [I.APPLE, 5] }, { give: [EM, 2], get: [B.HAY, 4] }, { give: [EM, 3], get: [I.STEAK, 4] },
   { give: [I.WHEAT_ITEM, 10], get: [EM, 1] }, { give: [I.APPLE, 6], get: [EM, 1] }, { give: [I.BREAD, 5], get: [EM, 1] }],
  // 1 Kovář
  [{ give: [EM, 2], get: [I.IRON, 3] }, { give: [EM, 5], get: [I.SWORD_I, 1] }, { give: [EM, 6], get: [I.PICK_I, 1] }, { give: [EM, 4], get: [I.AXE_I, 1] },
   { give: [EM, 4], get: [I.A_IRON_H, 1] }, { give: [EM, 8], get: [I.A_IRON_C, 1] }, { give: [EM, 7], get: [I.A_IRON_L, 1] }, { give: [EM, 3], get: [I.A_IRON_B, 1] }, { give: [EM, 12], get: [I.DIAMOND, 1] },
   { give: [I.IRON, 4], get: [EM, 1] }, { give: [I.COAL, 8], get: [EM, 1] }],
  // 2 Stavitel
  [{ give: [EM, 1], get: [B.BRICKS, 8] }, { give: [EM, 1], get: [B.GLASS, 8] }, { give: [EM, 2], get: [I.DOOR, 3] }, { give: [EM, 1], get: [B.PLANKS, 16] },
   { give: [EM, 3], get: [I.BED, 1] }, { give: [EM, 2], get: [I.F_CHAIR, 1] }, { give: [EM, 4], get: [I.F_TABLE, 1] }, { give: [EM, 5], get: [I.F_LAMP, 1] }, { give: [EM, 1], get: [B.TORCH, 10] }, { give: [EM, 3], get: [B.GLOWSTONE, 4] }, { give: [EM, 2], get: [B.STONE_BRICKS, 12] },
   { give: [B.COBBLE, 20], get: [EM, 1] }, { give: [B.SAND, 20], get: [EM, 1] }, { give: [B.LOG, 8], get: [EM, 1] }],
  // 3 Řezník
  [{ give: [EM, 1], get: [I.STEAK, 4] }, { give: [EM, 1], get: [I.PORKCHOP, 4] }, { give: [EM, 1], get: [I.CHICKEN_C, 5] }, { give: [EM, 2], get: [I.LEATHER, 4] },
   { give: [I.BEEF, 6], get: [EM, 1] }, { give: [I.PORK, 6], get: [EM, 1] }, { give: [I.CHICKEN, 8], get: [EM, 1] }, { give: [I.LEATHER, 4], get: [EM, 1] }],
  // 4 Horník
  [{ give: [EM, 1], get: [I.COAL, 8] }, { give: [EM, 3], get: [I.IRON, 4] }, { give: [EM, 5], get: [I.GOLD, 2] }, { give: [EM, 8], get: [I.DIAMOND, 1] },
   { give: [EM, 2], get: [B.TORCH, 12] }, { give: [EM, 3], get: [I.REDSTONE, 6] }, { give: [EM, 6], get: [I.PICK_S, 1] },
   { give: [I.IRON, 3], get: [EM, 1] }, { give: [I.GOLD, 1], get: [EM, 2] }, { give: [I.DIAMOND, 1], get: [EM, 6] }, { give: [I.REDSTONE, 6], get: [EM, 1] }],
  // 5 Hasič
  [{ give: [EM, 1], get: [B.TORCH, 12] }, { give: [EM, 2], get: [I.BREAD, 6] }, { give: [EM, 4], get: [I.A_IRON_H, 1] }, { give: [EM, 5], get: [I.AXE_I, 1] }, { give: [I.COAL, 8], get: [EM, 1] }],
  // 6 Záchranář
  [{ give: [EM, 1], get: [I.APPLE, 6] }, { give: [EM, 2], get: [I.STEAK, 4] }, { give: [EM, 3], get: [I.BREAD, 10] }, { give: [I.WHEAT_ITEM, 8], get: [EM, 1] }, { give: [I.APPLE, 6], get: [EM, 1] }],
  // 7 Strážník
  [{ give: [EM, 5], get: [I.SWORD_I, 1] }, { give: [EM, 8], get: [I.A_IRON_C, 1] }, { give: [EM, 6], get: [I.A_IRON_L, 1] }, { give: [EM, 3], get: [I.A_IRON_B, 1] }, { give: [I.IRON, 4], get: [EM, 1] }]
];
const GREET = [
  ['Čerstvá pšenice, čerstvý chléb!', 'Letos se úroda povedla.', 'Potřebuješ jídlo na cestu?'],
  ['Hlavně aby ti držel krumpáč!', 'Železo je to nejlepší, co můžeš nosit.', 'Pojď blíž, mám pro tebe kvalitní kousky.'],
  ['Dům se nepostaví sám.', 'Sklo, cihly, dveře… co to bude?', 'Dobré základy jsou půlka domu.'],
  ['Maso nejlepší v okolí!', 'Já ti to opeču, jen přines suroviny.', 'Krávy, prasata, ovce – o všechny je postaráno.'],
  ['Hluboko v jeskyních je spousta rudy!', 'Vem si pochodně, tma tam dole je opravdová.', 'Ještě jednu směnu a půjdu domů.'],
  ['Hasiči jsou vždy připraveni!', 'Pozor na oheň a TNT, hoří to rychle.', 'Nějaké pochodně pro tmu?'],
  ['Jsi zraněný? Jen řekni.', 'Zdraví je to nejcennější.', 'Jablko denně doktora šetří.'],
  ['Ve městě platí pořádek.', 'Dávej pozor na zombie po setmění.', 'Potřebuješ lepší výzbroj?']
];
function socialPanel(v, res) {
  let sp = $('socialPanel');
  if (!sp) { sp = document.createElement('div'); sp.id = 'socialPanel'; sp.style.cssText = 'margin:8px 0;padding:8px 10px;background:rgba(255,255,255,.08);border-radius:6px;font-size:15px;line-height:1.5;max-width:560px'; $('offers').parentNode.insertBefore(sp, $('offers')); }
  const m = v.mem, hearts = m ? Math.max(0, Math.min(5, Math.round(m.aff / 20))) : 0, key = G.repKey(v);
  let html = `<div><b>${v.name || ''}</b> · ${G.traitName(v)} · <span style="color:#ff6b8a">${'❤'.repeat(hearts)}${'♡'.repeat(5 - hearts)}</span> <span style="opacity:.7">(${m ? G.npcMood(v) : ''})</span></div>`;
  if (!v.spouse) html += `<div style="opacity:.8;font-size:13px">Pověst ve vsi: ${G.repLabel(key)}</div>`;
  if (res) html += `<div style="margin-top:6px;padding:6px 8px;border-left:3px solid ${res.bad ? '#e55' : res.good ? '#5c5' : '#aaa'}">„${res.say}“</div>`;
  sp.innerHTML = html + '<div class="sbtns" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"></div>';
  const bt = sp.querySelector('.sbtns');
  const btn = (txt, fn, dis) => { const b = document.createElement('button'); b.className = 'b sm'; b.textContent = txt; b.disabled = !!dis; b.onclick = fn; bt.appendChild(b); };
  const refresh = (r) => { refreshUI(); socialPanel(v, r); };
  btn('💬 Popovídat si', () => refresh(G.socialTalk(v)));
  const s0 = inv[sel], gv = s0 ? G.giftValue(s0.id) : 0;
  btn(s0 ? `🎁 Darovat: ${nameOf(s0.id)}` : '🎁 Darovat (drž předmět v ruce)', () => {
    const cur = inv[sel]; if (!cur) return;
    const r = G.socialGift(v, cur.id);
    if (!r.keep && !player.creative) removeItem(cur.id, 1);
    G.sfx('pop'); refresh(r);
  }, !s0 || !gv);
  if (v.spouse) {
    btn('👶 Mít dítě', () => refresh(G.socialBaby()));
    btn(G.family && G.family.sp.follow ? '🏠 Zůstaň doma' : '🚶 Pojď za mnou', () => { G.family.sp.follow = !G.family.sp.follow; refresh({ say: G.family.sp.follow ? 'Jasně, půjdu s tebou.' : 'Dobře, počkám doma.', good: 1 }); });
  } else if (!v.child && !v.partner) {
    btn('💍 Požádat o ruku', () => {
      const r = G.socialPropose(v); socialPanel(v, r);
      if (r.married) { msg('💍 ' + v.name + (v.fem ? ' se stala tvou manželkou' : ' se stal tvým manželem') + ' – čeká na tebe doma.', 4500); setTimeout(closeUI, 1600); }
    }, !!(G.family && G.family.sp && !G.family.sp.dead));
  }
}
function openTrade(v) {
  uiOpen = 'trade'; document.exitPointerLock();
  $('trade').style.display = 'flex';
  { const w = $('trade').querySelector('.win'); if (w) { w.style.maxHeight = '92vh'; w.style.overflowY = 'auto'; } }
  const el = $('offers'); el.innerHTML = '';
  v.talking = 8; v.sleeping = false; G.sfx('villager');
  const m = v.mem, hostile = m && (m.hit > 60 || m.kin);
  const prof = (v.fem ? G.PROFS_F : G.PROFS)[v.prof];
  if (v.spouse) $('tradeTitle').textContent = `${v.name} – ${v.fem ? 'tvoje manželka' : 'tvůj manžel'}`;
  else if (hostile) $('tradeTitle').textContent = `${v.name || ''} – ${prof}`;
  else $('tradeTitle').textContent = `${v.name ? v.name + ' – ' : (v.fem ? 'Vesničanka – ' : 'Vesničan – ')}${prof}: „${GREET[v.prof][Math.floor(rand() * 3)]}“   [💎 smaragdy: ${player.creative ? '∞' : countItem(EM)}]`;
  socialPanel(v, hostile ? { say: m.kin ? 'S tebou nechci mít nic společného. Zabil jsi mi někoho blízkého.' : 'Neobchoduju s někým, kdo mě bije.', bad: 1 } : null);
  $('tradeClose').onclick = closeUI;
  if (v.spouse || hostile) return;
  const rs = G.repScore(G.repKey(v)), mult = rs < -40 ? 1.5 : rs > 40 ? .8 : 1;
  if (mult !== 1) { const n = document.createElement('div'); n.style.cssText = 'font-size:13px;opacity:.8;margin-bottom:4px'; n.textContent = mult > 1 ? 'Kvůli tvé pověsti ti účtují příplatek (+50 % smaragdů).' : 'Jako hrdina vesnice dostáváš slevu (−20 % smaragdů).'; el.appendChild(n); }
  for (const o of OFFERS[v.prof]) {
    const give = o.give[0] === EM ? [EM, Math.max(1, Math.round(o.give[1] * mult))] : o.give;
    const ok = player.creative || countItem(give[0]) >= give[1];
    const d = document.createElement('div'); d.className = 'offer';
    d.innerHTML = `<canvas class="px" data-icon="${give[0]}"></canvas><span>${give[1]}× ${nameOf(give[0])}</span><span style="font-size:22px">→</span><canvas class="px" data-icon="${o.get[0]}"></canvas><span style="flex:1">${o.get[1]}× ${nameOf(o.get[0])}</span>`;
    const b = document.createElement('button'); b.className = 'b sm'; b.textContent = 'Směnit'; b.disabled = !ok;
    b.onclick = () => {
      if (!player.creative) { if (countItem(give[0]) < give[1]) return; removeItem(give[0], give[1]); }
      const rest = addItem(o.get[0], o.get[1]); if (rest) G.dropItem(player.x, player.y + 1, player.z, o.get[0], rest);
      if (m) { m.trades++; m.aff = Math.min(100, m.aff + 1.2); } G.sfx('villager'); G.sfx('pop'); refreshUI(); openTrade(v);
    };
    d.appendChild(b); el.appendChild(d);
  }
}

/* ---------- vstup ---------- */
function lock() { if (state === 'play' && !uiOpen && player.alive) { try { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } }
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === $('gl');
  if (!locked && state === 'play' && !uiOpen && player.alive && !G.chatOpen) { paused = true; $('pause').style.display = 'flex'; save(); }
  else if (locked) { paused = false; $('pause').style.display = 'none'; }
});
$('bResume').onclick = () => { paused = false; $('pause').style.display = 'none'; lock(); };
$('gl').addEventListener('click', () => { if (state === 'play' && !locked && !uiOpen && player.alive && !paused) lock(); });
$('bMenu').onclick = () => { const wasMp = G.mp; if (G.netLeave) G.netLeave(); if (!wasMp) save(); paused = false; $('pause').style.display = 'none'; state = 'menu'; curWorld = null; $('hud').style.display = 'none'; $('menu').style.display = 'flex'; showMenu(); startMenuBg(); };
window.addEventListener('mousemove', (e) => {
  if (!locked) return;
  player.yaw -= e.movementX * .0022; player.pitch -= e.movementY * .0022;
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch));
});
let lastSpace = 0;
const KALIAS = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' };
window.addEventListener('keydown', (e) => {
  if (state !== 'play') return;
  if (e.target && e.target.tagName === 'INPUT') return;
  const c = KALIAS[e.code] || e.code;
  if (c === 'Space' || e.code.startsWith('Arrow') || c === 'Tab') e.preventDefault();
  if (c === 'F3') { e.preventDefault(); showDebug = !showDebug; $('debug').style.display = showDebug ? 'block' : 'none'; return; }
  if (e.repeat) return;
  keys[c] = true;
  if (c === 'KeyE') { if (uiOpen === 'inv') closeUI(); else if (!uiOpen) openInv(); return; }
  if (c === 'Escape' && uiOpen) { closeUI(); return; }
  if (c === 'KeyM') { G.muted = !G.muted; msg(G.muted ? 'Zvuk vypnut' : 'Zvuk zapnut', 900); }
  if (uiOpen) return;
  if (c.startsWith('Digit') && c !== 'Digit0') { sel = +c.slice(5) - 1; refreshUI(); }
  if (c === 'KeyN') { G.musicSet(!G.musicOn()); msg(G.musicOn() ? 'Hudba zapnuta' : 'Hudba vypnuta', 900); }
  if (c === 'KeyF' && player.creative) { player.flying = !player.flying; msg(player.flying ? 'Létání zapnuto' : 'Létání vypnuto', 900); }
  if (c === 'Space') {
    const now = performance.now();
    if (player.creative && !player.flying && now - lastSpace < 280) { player.flying = !player.flying; msg(player.flying ? 'Létání zapnuto' : 'Létání vypnuto', 900); }
    lastSpace = now;
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (KALIAS[e.code]) keys[KALIAS[e.code]] = false; });
document.querySelectorAll('.musicBtn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); G.musicSet(!G.musicOn()); }));
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
window.addEventListener('wheel', (e) => { if (state !== 'play' || uiOpen || !locked) return; sel = (sel + (e.deltaY > 0 ? 1 : 8)) % 9; refreshUI(); }, { passive: true });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousedown', (e) => {
  if (state !== 'play' || !(locked || G.forceRun) || uiOpen) return;
  if (e.button === 0) mouseL = true;
  if (e.button === 2) { mouseR = true; useItem(true); }
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) { mouseR = false; releaseBow(); } });

/* ---------- dotykové ovládání (mobil / tablet) ---------- */
const touchMode = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || /[?&]touch=1/.test(location.search);
if (touchMode) {
  document.body.classList.add('touch');
  const T = $('touch'), zl = $('tzL'), zr = $('tzR'), stick = $('stick'), knob = $('knob');
  const fire = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
  setInterval(() => { T.style.display = (state === 'play' && !uiOpen) ? 'block' : 'none'; $('tFly').style.display = player.creative ? 'flex' : 'none'; }, 250);
  // --- joystick (levá polovina) ---
  let jid = null, jx = 0, jy = 0;
  const setDir = (f, b, l, r, sp) => { keys.KeyW = f; keys.KeyS = b; keys.KeyA = l; keys.KeyD = r; keys.ShiftLeft = sp || keys.__sneak; };
  const stopMove = () => { jid = null; stick.style.display = 'none'; setDir(false, false, false, false, false); };
  zl.addEventListener('touchstart', (e) => {
    e.preventDefault(); if (jid !== null) return; const t = e.changedTouches[0]; jid = t.identifier; jx = t.clientX; jy = t.clientY;
    stick.style.display = 'block'; stick.style.left = jx + 'px'; stick.style.top = jy + 'px'; knob.style.transform = 'translate(-50%,-50%)';
  }, { passive: false });
  zl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === jid) {
      let dx = t.clientX - jx, dy = t.clientY - jy; const R = 55, d = Math.hypot(dx, dy) || 1, c = Math.min(d, R);
      const nx = dx / d * c, ny = dy / d * c; knob.style.transform = `translate(calc(-50% + ${nx}px),calc(-50% + ${ny}px))`;
      const m = c / R, ax = nx / R, ay = ny / R;
      setDir(m > .25 && ay < -.35, m > .25 && ay > .35, m > .25 && ax < -.35, m > .25 && ax > .35, m > .92 && ay < -.6 && !riding && !ridingH && !player.flying);
    }
  }, { passive: false });
  const endJ = (e) => { for (const t of e.changedTouches) if (t.identifier === jid) stopMove(); };
  zl.addEventListener('touchend', endJ); zl.addEventListener('touchcancel', endJ);
  // --- rozhlížení + klepnutí / podržení (pravá polovina) ---
  let lid = null, lx = 0, ly = 0, moved = 0, t0 = 0, ts0 = 0, holdT = 0, mining = false;
  zr.addEventListener('touchstart', (e) => {
    e.preventDefault(); if (lid !== null) return; const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; moved = 0; t0 = performance.now(); ts0 = e.timeStamp; mining = false;
    holdT = setTimeout(() => { if (lid !== null && moved < 14) { mining = true; mouseL = true; if (navigator.vibrate) navigator.vibrate(15); } }, G.holdMs || 380);
  }, { passive: false });
  zr.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === lid) {
      const dx = t.clientX - lx, dy = t.clientY - ly; lx = t.clientX; ly = t.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (state === 'play' && !uiOpen && !paused) { player.yaw -= dx * .0052; player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - dy * .0052)); }
    }
  }, { passive: false });
  const endL = (e) => {
    for (const t of e.changedTouches) if (t.identifier === lid) {
      clearTimeout(holdT); lid = null;
      // krátké klepnutí se při zpožděném vykreslení (časovač vyběhl dřív než touchend) nesmí změnit v těžení
      const quick = (e.timeStamp - ts0) < (G.holdMs || 380) && moved < 14;
      if (mining) {
        mining = false; mouseL = false;
        if (quick && state === 'play' && !uiOpen && !paused) {
          const lb = G.lastBreak;
          if (lb && performance.now() - lb.at < 1500 && lb.id && getB(lb.x, lb.y, lb.z) === 0) { G.pa = true; G.setBlock(lb.x, lb.y, lb.z, lb.id); G.pa = false; }
          mine.active = false; mine.prog = 0; useCd = 0; useItem(true); releaseBow();
        }
      }
      else if (moved < 14 && quick && state === 'play' && !uiOpen && !paused) { useItem(true); releaseBow(); }
    }
  };
  zr.addEventListener('touchend', endL); zr.addEventListener('touchcancel', endL);
  // --- tlačítka ---
  const hold = (id, down, up) => { const el = $(id); el.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false }); const u = (e) => { e.preventDefault(); up(); }; el.addEventListener('touchend', u, { passive: false }); el.addEventListener('touchcancel', u, { passive: false }); };
  const tap = (id, fn) => hold(id, fn, () => { });
  hold('tJump', () => { keys.Space = true; }, () => { keys.Space = false; });
  hold('tMine', () => { mouseL = true; }, () => { mouseL = false; });
  hold('tUse', () => { if (state === 'play' && !uiOpen && !paused) { mouseR = true; useItem(true); } }, () => { mouseR = false; releaseBow(); });
  hold('tSneak', () => { keys.__sneak = true; keys.ShiftLeft = true; }, () => { keys.__sneak = false; keys.ShiftLeft = false; });
  tap('tInv', () => { if (state === 'play' && !paused) fire('keydown', 'KeyE'); });
  tap('tFly', () => { fire('keydown', 'KeyF'); fire('keyup', 'KeyF'); });
  tap('tPause', () => { if (state === 'play' && !uiOpen && player.alive && !paused) { paused = true; $('pause').style.display = 'flex'; save(); } });
  // výběr předmětu v liště
  $('hotbar').addEventListener('touchstart', (e) => {
    e.preventDefault(); const t = e.changedTouches[0], el = document.elementFromPoint(t.clientX, t.clientY), sl = el && el.closest && el.closest('.slot');
    if (sl) { const i = [...$('hotbar').children].indexOf(sl); if (i >= 0) { sel = i; refreshUI(); } }
  }, { passive: false });
  // celá obrazovka při startu
  $('bResume').addEventListener('click', () => { try { const de = document.documentElement; if (!document.fullscreenElement && de.requestFullscreen) de.requestFullscreen().then(() => { try { screen.orientation.lock('landscape'); } catch (e) {} }).catch(() => {}); } catch (e) {} });
}
$('invClose').onclick = () => closeUI();

/* ---------- raycast ---------- */
const FULL = [[0, 0, 0, 1, 1, 1]];
/* skutečné hitboxy bloků (lokální souřadnice 0..1) – odpovídají meshi */
function blockBoxes(id, x, y, z) {
  const d = BL[id];
  if (!d) return FULL;
  if (d.cross) {
    if (id === B.TORCH) return [[.4375, 0, .4375, .5625, .625, .5625]];
    if (id === B.WHEAT) return [[.1, 0, .1, .9, .75, .9]];
    if (id === B.TALLGRASS) return [[.1, 0, .1, .9, .8, .9]];
    return [[.25, 0, .25, .75, .7, .75]];
  }
  if (!d.custom) return id === B.CACTUS ? [[.0625, 0, .0625, .9375, 1, .9375]] : FULL;
  switch (d.custom) {
    case 'door': { const base = id - 28, ax = (base >> 1) & 1, open = base >> 2; return [!open ? (ax === 0 ? [0, 0, .40625, 1, 1, .59375] : [.40625, 0, 0, .59375, 1, 1]) : (ax === 0 ? [0, 0, 0, .1875, 1, 1] : [0, 0, 0, 1, 1, .1875])]; }
    case 'bed': return [[0, 0, 0, 1, .5625, 1]];
    case 'chest': return [[.0625, 0, .0625, .9375, .875, .9375]];
    case 'slab': return [[0, 0, 0, 1, .5, 1]];
    case 'stair': return W.stairBoxesAt(W.stairDir(id), (dx, dz) => getB(x + dx, y, z + dz));
    case 'bell': return [[.2, .1, .2, .8, 1, .8]];
    case 'ramp': return [[0, 0, 0, 1, .5, 1], W.rampDir(id) === 0 ? [.5, .5, 0, 1, 1, 1] : W.rampDir(id) === 1 ? [0, .5, .5, 1, 1, 1] : W.rampDir(id) === 2 ? [0, .5, 0, .5, 1, 1] : [0, .5, 0, 1, 1, .5]];
    case 'ladder': { const k = (id - 48) & 3; return [k === 0 ? [.92, 0, 0, 1, 1, 1] : k === 2 ? [0, 0, 0, .08, 1, 1] : k === 1 ? [0, 0, .92, 1, 1, 1] : [0, 0, 0, 1, 1, .08]]; }
    case 'dust': return [[0, 0, 0, 1, .05, 1]];
    case 'rail': {
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (getB(x + sx, y + 1, z + sz) === B.RAIL && getB(x + sx, y, z + sz) !== B.RAIL) return [[0, 0, 0, 1, .8, 1]];
      return [[0, 0, 0, 1, .0625, 1]];
    }
    case 'lever': {
      const o = Math.floor((id - 87) / 2);
      if (o === 0) return [[.1, 0, .25, .72, .8, .75]];
      const k = o - 1;
      return [k === 0 ? [.55, .25, .3, 1, .75, .7] : k === 2 ? [0, .25, .3, .45, .75, .7] : k === 1 ? [.3, .25, .55, .7, .75, 1] : [.3, .25, 0, .7, .75, .45]];
    }
    case 'fence': {
      const c = (dx, dz) => { const n = getB(x + dx, y, z + dz); return n === B.FENCE || OCCT[n]; };
      const out = [[.375, 0, .375, .625, 1, .625]];
      if (c(1, 0)) out.push([.625, .375, .4375, 1, .875, .5625]);
      if (c(-1, 0)) out.push([0, .375, .4375, .375, .875, .5625]);
      if (c(0, 1)) out.push([.4375, .375, .625, .5625, .875, 1]);
      if (c(0, -1)) out.push([.4375, .375, 0, .5625, .875, .375]);
      return out;
    }
  }
  return FULL;
}
const OCCT = W.OCC;
function rayAabb(ox, oy, oz, dx, dy, dz, mn, mx) {
  const o = [ox, oy, oz], d = [dx, dy, dz];
  let t0 = 0, t1 = 1e9, ax = -1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < mn[i] || o[i] > mx[i]) return null; }
    else {
      let a = (mn[i] - o[i]) / d[i], b = (mx[i] - o[i]) / d[i];
      if (a > b) { const q = a; a = b; b = q; }
      if (a > t0) { t0 = a; ax = i; }
      if (b < t1) t1 = b;
      if (t0 > t1) return null;
    }
  }
  return { t: t0, ax };
}
function raycast(ox, oy, oz, dx, dy, dz, max) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9)), tdz = Math.abs(1 / (dz || 1e-9));
  let tx = (dx > 0 ? x + 1 - ox : ox - x) * tdx, ty = (dy > 0 ? y + 1 - oy : oy - y) * tdy, tz = (dz > 0 ? z + 1 - oz : oz - z) * tdz;
  let nx = 0, ny = 0, nz = 0, t = 0;
  const dd = [dx, dy, dz];
  for (let i = 0; i < 40; i++) {
    const id = getB(x, y, z);
    if (BL[id] && BL[id].target) {
      let best = null, bbox = null;
      for (const bx of blockBoxes(id, x, y, z)) {
        const mn = [x + bx[0], y + bx[1], z + bx[2]], mxv = [x + bx[3], y + bx[4], z + bx[5]];
        const r = rayAabb(ox, oy, oz, dx, dy, dz, mn, mxv);
        if (r && r.t <= max && (!best || r.t < best.t)) { best = r; bbox = [mn, mxv]; }
      }
      if (best) {
        let hn = [0, 0, 0];
        if (best.ax >= 0) hn[best.ax] = dd[best.ax] > 0 ? -1 : 1; else { hn = [nx, ny, nz]; }
        return { x, y, z, nx: hn[0], ny: hn[1], nz: hn[2], t: best.t, id, box: bbox };
      }
    }
    if (tx < ty && tx < tz) { t = tx; if (t > max) return null; x += sx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { t = ty; if (t > max) return null; y += sy; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { t = tz; if (t > max) return null; z += sz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}
function rayBox(ox, oy, oz, dx, dy, dz, e) {
  const mn = [e.x - e.w, e.y, e.z - e.w], mx = [e.x + e.w, e.y + e.h, e.z + e.w], o = [ox, oy, oz], d = [dx, dy, dz];
  let t0 = 0, t1 = 1e9;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < mn[i] || o[i] > mx[i]) return -1; }
    else { let a = (mn[i] - o[i]) / d[i], b = (mx[i] - o[i]) / d[i]; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return -1; }
  }
  return t0;
}

/* ---------- zvýraznění a praskliny ---------- */
const hiMesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .75 }));
hiMesh.visible = false; scene.add(hiMesh);
const crackTex = TEX.crackTextures;
const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), new THREE.MeshBasicMaterial({ map: crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
crackMesh.visible = false; scene.add(crackMesh);

/* ---------- držená věc ---------- */
const hand = new THREE.Group(); camera.add(hand);
const heldBlockMat = new THREE.MeshBasicMaterial({ map: G.atlasTex, vertexColors: true, transparent: false, alphaTest: .5 });
const armMat = new THREE.MeshBasicMaterial({ color: 0xc4926f });
G.HAND_LAYER = 2;
let handMesh = null, handId = -2, swing = 0;
function updateHand() {
  const s = inv[sel], id = s ? s.id : -1;
  if (id === handId) return;
  handId = id;
  if (handMesh) { hand.remove(handMesh); handMesh = null; }
  let m;
  if (id < 0) { m = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .6), armMat); m.position.set(.38, -.32, -.55); m.rotation.set(.3, .35, 0); }
  else if (G.isCubeItem(id)) { m = new THREE.Mesh(G.blockGeo(id, .3), heldBlockMat); m.position.set(.4, -.34, -.62); m.rotation.set(.2, .7, 0); }
  else { m = G.itemMesh(id, .5); m.material = new THREE.MeshBasicMaterial({ map: m.material.map, transparent: false, alphaTest: .5, side: THREE.DoubleSide }); m.position.set(.4, -.3, -.6); m.rotation.set(0, -.5, .25); if (TOOL[id]) m.rotation.set(0, -.6, .4); }
  m.frustumCulled = false; m.layers.set(G.HAND_LAYER);
  hand.add(m); handMesh = m;
}

/* ---------- interakce ---------- */
let bowing = false, bowCharge = 0;
function fireArrow(speed, dmg) {
  const dx = -Math.sin(player.yaw) * Math.cos(player.pitch), dy = Math.sin(player.pitch), dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
  G.shootArrow(player.x + dx * .6, player.y + 1.55 + dy * .6, player.z + dz * .6, dx, dy, dz, speed, dmg);
  swingHand(); useCd = .2;
}
function releaseBow() {
  if (!bowing) return; bowing = false;
  const s = inv[sel]; if (!s) return;
  if (s.id === I.BOW) {
    if (bowCharge < .15) return;
    const pw = Math.min(1, bowCharge);
    if (!player.creative) { removeItem(I.ARROW, 1); refreshUI(); }
    fireArrow(14 + 26 * pw, 2 + 8 * pw);
  } else if (s.id === I.CROSSBOW && bowCharge >= 1.1) {
    if (!player.creative) { removeItem(I.ARROW, 1); refreshUI(); }
    player.crossLoaded = true; G.sfx('place'); msg('Kuše nabita – klikni pro výstřel', 1500);
  }
}
let mine = { x: 0, y: 0, z: 0, prog: 0, active: false }, mineCd = 0, atkCd = 0, useCd = 0;
let target = null, entTarget = null;
function findTargets() {
  const dx = -Math.sin(player.yaw) * Math.cos(player.pitch), dy = Math.sin(player.pitch), dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
  const ox = player.x, oy = player.y + 1.62, oz = player.z;
  target = raycast(ox, oy, oz, dx, dy, dz, 5.5);
  entTarget = null; let bt = 3.7;
  if (target) bt = Math.min(bt, target.t);
  for (const e of G.entities) {
    if (e.kind !== 'mob' || e.dead) continue;
    const t = rayBox(ox, oy, oz, dx, dy, dz, { x: e.x, y: e.y, z: e.z, w: e.w + .12, h: e.h + .05 });
    if (t >= 0 && t < bt) { bt = t; entTarget = e; }
  }
  if (entTarget) target = null;
  return [dx, dy, dz];
}
const DIRV = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function breakBlock(x, y, z) {
  G.lastBreak = { x, y, z, id: getB(x, y, z), at: performance.now() };
  const id = getB(x, y, z), bl = BL[id];
  if (!bl || id === B.BEDROCK) return;
  if (id === B.FURN) {
    const base = G.furnBase(x, y, z);
    if (base) {
      const k = chestKey(base.x, base.y, base.z), arr = G.chests.get(k);
      if (arr) { for (const it of arr) if (it) G.dropItem(base.x + .5, base.y + .5, base.z + .5, it.id, it.count); G.chests.delete(k); }
      G.burst(x + .5, y + .5, z + .5, [150, 110, 70], 10, 3, .7);
    }
    const t = G.furnRemove(x, y, z); G.sfx('break');
    if (t && !player.creative) G.dropItem(x + .5, y + .4, z + .5, G.FURN_TYPES[t].item, 1);
    return;
  }
  const c = TEX.avgColor(id);
  G.burst(x + .5, y + .5, z + .5, c, 10, 3, .7);
  let dropId = W.isStair(id) ? W.stairBase(id) : W.isRamp(id) ? W.rampBase(id) : id;
  if (W.isDoor(id)) {
    const by = ((id - 28) & 1) === 0 ? y : y - 1;
    G.setBlock(x, by, z, 0); G.setBlock(x, by + 1, z, 0);
  } else if (W.isBed(id)) {
    const head = id >= 40, d = (id - (head ? 40 : 36)) & 3, v = DIRV[d];
    G.setBlock(x, y, z, 0); G.setBlock(head ? x - v[0] : x + v[0], y, head ? z - v[1] : z + v[1], 0);
  } else if (W.isChest(id)) {
    const k = chestKey(x, y, z), arr = G.chests.get(k) || (!player.creative ? chestArr(x, y, z) : []);
    for (const it of arr) if (it) G.dropItem(x + .5, y + .5, z + .5, it.id, it.count);
    G.chests.delete(k);
    G.setBlock(x, y, z, 0);
  } else if (id === B.FURNACE) {
    const k = chestKey(x, y, z), f = G.furnaces.get(k);
    if (f) for (const it of f.s) if (it) G.dropItem(x + .5, y + .5, z + .5, it.id, it.count);
    G.furnaces.delete(k); G.setBlock(x, y, z, 0);
  } else G.setBlock(x, y, z, 0);
  G.sfx('break');
  if (!player.creative) {
    const d = G.dropOf(dropId, toolInfo());
    if (d) G.dropItem(x + .5, y + .4, z + .5, d[0], d[1]);
  }
  const above = getB(x, y + 1, z);
  if (BL[above] && BL[above].cross) { const d = !player.creative ? G.dropOf(above, null) : null; G.setBlock(x, y + 1, z, 0); if (d) G.dropItem(x + .5, y + 1.4, z + .5, d[0], d[1]); }
  else if (W.isDoor(above) && ((above - 28) & 1) === 0) breakBlock(x, y + 1, z);
}
function swingHand() { swing = 1; }
function attack() {
  const t = toolInfo();
  const dmg = player.creative ? 8 : Math.max([1, 4, 5, 6, 8][t.sword], t.axe ? 2 + t.axe : 0, t.pick ? 1 + t.pick : 0, t.shovel ? 1 + t.shovel : 0);
  const e = entTarget;
  const dx = e.x - player.x, dz = e.z - player.z;
  G.damageEntity(e, dmg, dx, dz, true);
  if (e.type === 'creeper') e.fuse = Math.max(0, e.fuse - .3);
  swingHand(); atkCd = .45;
}
const free = (id) => id === 0 || W.isWater(id) || W.isLava(id) || (BL[id] && BL[id].cross);
const solidBelow = (x, y, z) => { const b = getB(x, y - 1, z); return SOLID[b] && !(BL[b] && BL[b].cross); };
function facingDir() { const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw); return Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 0 : 2) : (fz > 0 ? 1 : 3); }
let riding = null, ridingH = null;
function mountHorse(h) {
  if (h.rider) return;
  ridingH = h; h.rider = true; h.ctrl = { vx: 0, vz: 0, jump: false };
  msg('Jedeš na koni – WASD, mezerník skok, Shift sesednout', 2600); G.sfx('horse', h.x, h.y, h.z);
}
function mountCart(c) {
  if (c.rider) return;
  riding = c; c.rider = true; c.input = 0;
  msg('Jedeš ve vozíku – W/S zrychlit a brzdit, Shift vystoupit', 2600); G.sfx('place');
}
function checkGolem(px, py, pz) {
  const mat = getB(px, py - 1, pz);
  if (!G.golemInfo(mat) || getB(px, py - 2, pz) !== mat) return;
  for (const [dx, dz] of [[1, 0], [0, 1]]) {
    if (getB(px + dx, py - 1, pz + dz) === mat && getB(px - dx, py - 1, pz - dz) === mat) {
      for (const [x, y, z] of [[px, py, pz], [px, py - 1, pz], [px, py - 2, pz], [px + dx, py - 1, pz + dz], [px - dx, py - 1, pz - dz]]) G.setBlock(x, y, z, 0);
      const gl = G.spawnMob('golem', px + .5, py - 2 + .05, pz + .5, { anger: 0, owner: true, mat });
      G.burst(px + .5, py - 1, pz + .5, TEX.avgColor(mat), 24, 4); G.sfx('golem', px, py, pz);
      msg('Vytvořil jsi: ' + G.mobName(gl) + '!', 2500); return;
    }
  }
}
function sleepInBed(t) {
  spawnPt = { x: t.x + .5, y: t.y + 1, z: t.z + .5, bed: true };
  if (G.dayFactor < .45) { G.time = .26; msg('Prospal jsi noc. Dobré ráno! (domov nastaven)', 2600); }
  else msg('Spát můžeš jen v noci – ale tvůj domov je nastaven.', 2600);
  G.sfx('pop'); useCd = .5;
}
G.homePoint = () => (spawnPt && spawnPt.bed ? spawnPt : null);
G.healPlayer = (n) => { player.hp = Math.min(player.maxhp, player.hp + n); renderHearts(); };
G._dbg = () => ({ target: target && { x: target.x, y: target.y, z: target.z, id: target.id, ny: target.ny }, sel, s: inv[sel], paused, uiOpen, state });
function useItem(first) {
  if (useCd > 0) return;
  findTargets();
  const s = inv[sel], s0 = s;
  if (entTarget && entTarget.type === 'villager' && first) {
    if (entTarget.child) { G.burst(entTarget.x, entTarget.y + 1.3, entTarget.z, [255, 120, 160], 6, 1.5, 1, -1.5); G.sfx('villager', entTarget.x, entTarget.y, entTarget.z); msg(entTarget.fem ? 'Holčička se na tebe usmála.' : 'Chlapeček se na tebe usmál.', 1500); useCd = .5; swingHand(); return; }
    openTrade(entTarget); return;
  }
  if (entTarget && entTarget.type === 'cart' && first) { mountCart(entTarget); return; }
  if (entTarget && entTarget.type === 'horse' && first) { mountHorse(entTarget); return; }
  if (entTarget && entTarget.type === 'wolf' && first && s && FOOD[s.id] && s.id !== I.BREAD && s.id !== I.APPLE) {
    const w = entTarget;
    if (w.owner) { if (w.hp < w.maxhp) { w.hp = Math.min(w.maxhp, w.hp + FOOD[s.id]); if (!player.creative) { s.count--; if (s.count <= 0) inv[sel] = null; refreshUI(); } G.sfx('eat'); } return; }
    if (!player.creative) { s.count--; if (s.count <= 0) inv[sel] = null; refreshUI(); }
    G.sfx('eat'); useCd = .4;
    if (player.creative || rand() < .4) { w.owner = true; w.anger = 0; w.hp = w.maxhp; G.burst(w.x, w.y + 1, w.z, [240, 80, 120], 12, 2.5, 1, -2); msg('Vlk je ochočený!', 1800); }
    else G.burst(w.x, w.y + 1, w.z, [150, 150, 150], 6, 1.5, .8, -2);
    return;
  }
  if (first && target) {
    const tid = target.id;
    if (W.isDoor(tid)) { G.toggleDoor(target.x, target.y, target.z); swingHand(); useCd = .25; return; }
    if (W.isBed(tid)) { sleepInBed(target); return; }
    if (tid >= 87 && tid <= 96) { G.setBlock(target.x, target.y, target.z, tid + (((tid - 87) & 1) ? -1 : 1)); G.sfx('place'); swingHand(); useCd = .25; return; }
    if (tid === B.BELL) { G.ringBell(target.x + .5, target.y + .5, target.z + .5); useCd = .5; return; }
    if (W.isChest(tid)) { openChest(target.x, target.y, target.z); useCd = .3; return; }
    if (tid === B.FURN) { const fb = G.furnBase(target.x, target.y, target.z); if (fb && fb.t === 'sign') { signPrompt(fb); useCd = .3; return; } if (fb && G.FURN_TYPES[fb.t].store) { openChest(fb.x, fb.y, fb.z); useCd = .3; return; } }
    if (tid === B.TNT && s0 && s0.id === I.FLINT_STEEL) { G.primeTnt(target.x, target.y, target.z, 4, true); swingHand(); useCd = .4; return; }
    if (tid === B.FURNACE) { openFurnace(target.x, target.y, target.z); useCd = .3; return; }
  }
  if (s && ARMOR[s.id]) {
    if (!first) return;
    const sl = ARMOR[s.id][0], old = player.armor[sl];
    player.armor[sl] = s; inv[sel] = old || null;
    G.sfx('place'); refreshUI(); useCd = .3; msg(nameOf(s.id) + ' nasazeno', 1200); return;
  }
  if (s && (s.id === I.BOW || s.id === I.CROSSBOW)) {
    if (!first) return;
    if (s.id === I.CROSSBOW && player.crossLoaded) { fireArrow(42, 11); player.crossLoaded = false; return; }
    if (!player.creative && countItem(I.ARROW) <= 0) { msg('Nemáš šípy (vyrob je z tyčky, uhlí a pírka)', 1500); return; }
    bowing = true; bowCharge = 0; return;
  }
  if (s && FOOD[s.id] && first) {
    if (player.creative) { if (player.hp < player.maxhp) player.hp = Math.min(player.maxhp, player.hp + Math.ceil(FOOD[s.id] / 3)); G.sfx('eat'); swingHand(); useCd = .4; msg('Mňam!', 700); renderHearts(); return; }
    if (player.food < 20 || player.hp < player.maxhp) {
      player.food = Math.min(20, player.food + FOOD[s.id]);
      player.hp = Math.min(player.maxhp, player.hp + Math.ceil(FOOD[s.id] / 3));
      s.count--; if (s.count <= 0) inv[sel] = null;
      G.sfx('eat'); refreshUI(); useCd = .4; swingHand();
    } else msg('Nemáš hlad', 900);
    return;
  }
  if (!target || !s) return;
  const consume = () => { if (!player.creative) { s.count--; if (s.count <= 0) inv[sel] = null; refreshUI(); } };
  let px = target.x + target.nx, py = target.y + target.ny, pz = target.z + target.nz;
  if (BL[target.id] && BL[target.id].cross && target.id !== B.TORCH) { px = target.x; py = target.y; pz = target.z; }
  if (SPAWN_EGG[s.id]) {
    if (!first) return;
    const type = SPAWN_EGG[s.id], ex = target.x + target.nx + .5, ey = target.y + target.ny + (target.ny < 0 ? -1.9 : .02), ez = target.z + target.nz + .5;
    if (SOLID[getB(Math.floor(ex), Math.floor(ey + 1), Math.floor(ez))]) return;
    G.spawnMob(type, ex, ey, ez, type === 'horse' ? { coat: Math.floor(rand() * 4) } : type === 'villager' ? { prof: Math.floor(rand() * 5) } : type === 'golem' ? { owner: true, mat: GOLEM_EGG[s.id] || B.IRON_BLOCK } : {});
    G.burst(ex, ey + .8, ez, [240, 240, 240], 10, 2.5); G.sfx('pop'); swingHand(); useCd = .3; consume(); return;
  }
  if (s.id === I.LADDER) {
    let id, ax = px, ay = py, az = pz;
    if (W.isLadder(target.id)) { ax = target.x; ay = target.y + 1; az = target.z; id = target.id; }
    else if (target.ny === 0) id = B.LADDER0 + ((target.nx === -1 ? 0 : target.nx === 1 ? 2 : target.nz === -1 ? 1 : 3));
    else return;
    if (!free(getB(ax, ay, az)) || ay >= H) return;
    G.setBlock(ax, ay, az, id); G.sfx('place'); swingHand(); useCd = .2; consume(); return;
  }
  if (s.id === I.REDSTONE) {
    if (!first) return;
    if (!free(getB(px, py, pz)) || !solidBelow(px, py, pz)) return;
    G.setBlock(px, py, pz, B.DUST_OFF); G.sfx('place'); swingHand(); useCd = .2; consume(); return;
  }
  if (s.id === I.MINECART) {
    if (!first || target.id !== B.RAIL) return;
    G.spawnMob('cart', target.x + .5, target.y + .08, target.z + .5); G.sfx('place'); swingHand(); useCd = .3; consume(); return;
  }
  if (s.id === B.RAIL && !solidBelow(px, py, pz)) return;
  if (s.id === 87) {
    let o = 0;
    if (target.ny === 1) o = 0;
    else if (target.ny === 0) o = target.nx === -1 ? 1 : target.nz === -1 ? 2 : target.nx === 1 ? 3 : 4;
    else return;
    if (!free(getB(px, py, pz))) return;
    G.setBlock(px, py, pz, 87 + o * 2); G.sfx('place'); swingHand(); useCd = .2; consume(); return;
  }
  if (G.FURN_BY_ITEM[s.id]) {
    const type = G.FURN_BY_ITEM[s.id], hh = G.FURN_TYPES[type].h;
    if (py < 0 || py + hh >= H || !solidBelow(px, py, pz)) return;
    for (let k = 0; k < hh; k++) if (!free(getB(px, py + k, pz))) return;
    for (let k = 0; k < hh; k++) {
      if (px + 1 > player.x - player.w - .02 && px < player.x + player.w + .02 && pz + 1 > player.z - player.w - .02 && pz < player.z + player.w + .02 && py + k + 1 > player.y && py + k < player.y + player.h) return;
      for (const m of G.entities) if (m.kind === 'mob' && !m.dead && px + 1 > m.x - m.w && px < m.x + m.w && pz + 1 > m.z - m.w && pz < m.z + m.w && py + k + 1 > m.y && py + k < m.y + m.h) return;
    }
    const rot = ((Math.round(player.yaw / (Math.PI / 2)) % 4) + 4) % 4;
    G.furnPlace(px, py, pz, type, rot); G.sfx('place'); swingHand(); useCd = .25; consume();
    if (type === 'sign') { const fb = G.furnBase(px, py, pz); if (fb) signPrompt(fb); }
    return;
  }
  if (s.id >= 100 && s.id !== I.DOOR && s.id !== I.BED && !W.isStair(s.id) && !W.isNB(s.id)) return;
  if (py < 0 || py >= H) return;
  if (s.id === I.DOOR) {
    if (!free(getB(px, py, pz)) || !free(getB(px, py + 1, pz)) || !solidBelow(px, py, pz)) return;
    const ax = (Math.abs(Math.sin(player.yaw)) > Math.abs(Math.cos(player.yaw))) ? 1 : 0;
    G.setBlock(px, py, pz, B.DOOR_B0 + ax * 2); G.setBlock(px, py + 1, pz, B.DOOR_T0 + ax * 2);
    G.sfx('place'); swingHand(); useCd = .25; consume(); return;
  }
  if (s.id === I.BED) {
    const d = facingDir(), v = DIRV[d], hx = px + v[0], hz = pz + v[1];
    if (!free(getB(px, py, pz)) || !free(getB(hx, py, hz)) || !solidBelow(px, py, pz) || !solidBelow(hx, py, hz)) return;
    G.setBlock(px, py, pz, B.BED_F0 + d); G.setBlock(hx, py, hz, B.BED_H0 + d);
    G.sfx('place'); swingHand(); useCd = .25; consume(); return;
  }
  const cur = getB(px, py, pz);
  if (!free(cur)) return;
  let placeId = s.id;
  if (W.isChest(s.id)) placeId = B.CHEST0 + ((facingDir() + 2) & 3);
  if (W.isStair(s.id)) placeId = W.stairBase(s.id) + facingDir();
  else if (W.isRamp(s.id)) { const rb = W.RAMP_IDS[W.RAMP_IDS.findIndex(a => a.includes(s.id))]; placeId = rb[facingDir()]; }
  if (SOLID[s.id]) {
    const e = { x: player.x, y: player.y, z: player.z, w: player.w + .02, h: player.h };
    if (px + 1 > e.x - e.w && px < e.x + e.w && pz + 1 > e.z - e.w && pz < e.z + e.w && py + 1 > e.y && py < e.y + e.h) return;
    for (const m of G.entities) if (m.kind === 'mob' && !m.dead && px + 1 > m.x - m.w && px < m.x + m.w && pz + 1 > m.z - m.w && pz < m.z + m.w && py + 1 > m.y && py < m.y + m.h) return;
  }
  G.setBlock(px, py, pz, placeId); G.lastPlace = { x: px, y: py, z: pz, at: performance.now() };
  if (W.isChest(placeId)) G.chests.set(chestKey(px, py, pz), new Array(27).fill(null));
  G.sfx('place'); swingHand(); useCd = .22;
  if (placeId === B.PUMPKIN) checkGolem(px, py, pz);
  consume();
}

function updateInteraction(dt) {
  mineCd -= dt; atkCd -= dt; useCd -= dt;
  if (swing > 0) swing = Math.max(0, swing - dt * 4.5);
  const dir = findTargets();
  const tl = $('tgt');
  if (entTarget) tl.textContent = G.npcLabel(entTarget) + (entTarget.type === 'villager' && !entTarget.child ? ' – pravé tl.' : '') + '  ' + Math.ceil(entTarget.hp) + '/' + entTarget.maxhp + ' ♥';
  else if (target && (W.isChest(target.id) || W.isBed(target.id) || W.isDoor(target.id))) tl.textContent = nameOf(target.id) + ' (pravé tl.)';
  else if (target && target.id === B.FURN) tl.textContent = G.furnName(target.x, target.y, target.z);
  else tl.textContent = '';
  if (target) {
    const bb = target.box, sz = [bb[1][0] - bb[0][0], bb[1][1] - bb[0][1], bb[1][2] - bb[0][2]];
    hiMesh.visible = true; hiMesh.position.set((bb[0][0] + bb[1][0]) / 2, (bb[0][1] + bb[1][1]) / 2, (bb[0][2] + bb[1][2]) / 2);
    hiMesh.scale.set((sz[0] + .006) / 1.004, (sz[1] + .006) / 1.004, (sz[2] + .006) / 1.004);
  } else hiMesh.visible = false;
  $('mine').style.display = 'none'; crackMesh.visible = false;
  if (mouseL) {
    if (entTarget) { if (atkCd <= 0) attack(); mine.active = false; mine.prog = 0; }
    else if (target && target.id !== B.BEDROCK && !(touchMode && G.lastPlace && G.lastPlace.x === target.x && G.lastPlace.y === target.y && G.lastPlace.z === target.z && performance.now() - G.lastPlace.at < 900)) {
      if (!mine.active || mine.x !== target.x || mine.y !== target.y || mine.z !== target.z) { mine.x = target.x; mine.y = target.y; mine.z = target.z; mine.prog = 0; mine.active = true; }
      const bl = BL[target.id];
      const ti = toolInfo();
      let time = 0;
      if (!player.creative && bl.hard > 0) {
        const lv = bl.tool ? ti[bl.tool] : 0;
        let mult = lv ? [1, 2, 4, 6, 8][lv] : (bl.tool === 'pick' ? .45 : 1);
        time = bl.hard * 1.15 / mult;
      }
      if (mineCd <= 0) {
        if (time <= 0) { breakBlock(target.x, target.y, target.z); mineCd = player.creative ? .18 : .1; swingHand(); mine.prog = 0; }
        else {
          mine.prog += dt / time;
          if (Math.floor(performance.now() / 220) % 2 === 0 && swing < .3) swingHand();
          if (Math.floor(mine.prog * 6) !== mine.lastSnd) { mine.lastSnd = Math.floor(mine.prog * 6); G.sfx('place'); }
          if (mine.prog >= 1) { breakBlock(target.x, target.y, target.z); mine.prog = 0; mineCd = .22; mine.active = false; }
          else { const bb = target.box; crackMesh.visible = true; crackMesh.position.set((bb[0][0] + bb[1][0]) / 2, (bb[0][1] + bb[1][1]) / 2, (bb[0][2] + bb[1][2]) / 2); crackMesh.scale.set((bb[1][0] - bb[0][0] + .008) / 1.006, (bb[1][1] - bb[0][1] + .008) / 1.006, (bb[1][2] - bb[0][2] + .008) / 1.006); crackMesh.material.map = crackTex[Math.min(9, Math.floor(mine.prog * 10))]; $('mine').style.display = 'block'; $('mine').firstChild.style.width = (mine.prog * 100) + '%'; }
        }
      }
    } else { mine.active = false; mine.prog = 0; }
  } else { mine.active = false; mine.prog = 0; }
  if (mouseR && useCd <= 0) useItem(false);
  if (bowing) {
    const s = inv[sel];
    if (!s || (s.id !== I.BOW && s.id !== I.CROSSBOW)) bowing = false;
    else { bowCharge += dt; const mx = s.id === I.BOW ? 1 : 1.1; $('mine').style.display = 'block'; $('mine').firstChild.style.width = Math.min(100, bowCharge / mx * 100) + '%'; }
  }
}

/* ---------- zranění a smrt ---------- */
G.hurtPlayer = function (amt, sx, sz, force) {
  if (!player.alive) return;
  if (player.inv > 0 && !force) return;
  if (!force) { const ap = armorPoints(); if (ap) amt = Math.max(1, Math.round(amt * (1 - Math.min(20, ap) * .04))); }
  player.inv = .55; player.hp -= amt; player.regen = 0;
  const dx = player.x - sx, dz = player.z - sz, d = Math.hypot(dx, dz) || 1;
  if (!force) { player.vx += dx / d * 5; player.vz += dz / d * 5; player.vy = Math.max(player.vy, 4); }
  const fl = $('flash'); fl.style.transition = 'none'; fl.style.opacity = .9; requestAnimationFrame(() => { fl.style.transition = 'opacity .5s'; fl.style.opacity = 0; });
  G.sfx('hurt'); renderHearts();
  if (player.hp <= 0) die();
};
function die() {
  player.alive = false; player.hp = 0; mouseL = mouseR = false;
  document.exitPointerLock();
  $('death').style.display = 'flex'; renderHearts();
}
$('bRespawn').onclick = () => {
  player.hp = player.maxhp; player.food = 20; player.alive = true; player.vx = player.vy = player.vz = 0; player.air = 10; player.inv = 2; player.peak = 0;
  placePlayer(spawnPt.x, spawnPt.z, spawnPt.bed ? spawnPt.y : undefined); $('death').style.display = 'none'; renderHearts(); lock();
  for (const e of G.entities) if (e.kind === 'mob' && e.hostile && Math.hypot(e.x - player.x, e.z - player.z) < 25) e.dead = true;
};
function findSurface(x, z) {
  const OK = [B.GRASS, B.SAND, B.SNOW, B.PATH, B.GRAVEL];
  for (let r = 0; r <= 48; r += 2) for (let a = 0; a < (r ? 12 : 1); a++) {
    const ang = a / 12 * 6.2832, cx = Math.floor(x + Math.cos(ang) * r), cz = Math.floor(z + Math.sin(ang) * r);
    if (!G.isLoaded(cx, cz)) continue;
    const top = G.topY(cx, cz), natural = W.heightAt(cx, cz);
    if (top < 1 || !OK.includes(getB(cx, top, cz))) continue;
    if (Math.abs(top - natural) > 1 || top <= W.SEA) continue; // ne jáma ani pláž pod vodou
    if (SOLID[getB(cx, top + 1, cz)] || SOLID[getB(cx, top + 2, cz)]) continue;
    // okolí nesmí být hluboká jáma (všech 4 sousedů max 2 bloky nad námi)
    let pit = false;
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (G.isLoaded(cx + dx, cz + dz) && G.topY(cx + dx, cz + dz) > top + 2) pit = true;
    if (pit) continue;
    return { x: cx + .5, z: cz + .5, y: top + 1 };
  }
  return null;
}
function placePlayer(x, z, by) {
  player.x = x; player.z = z;
  G.updateChunks(x, z, 60);
  if (by === undefined) { const f = findSurface(x, z); if (f) { player.x = f.x; player.z = f.z; by = f.y; } }
  const t = G.topY(Math.floor(x), Math.floor(z));
  player.y = (by !== undefined && G.isLoaded(Math.floor(x), Math.floor(z)) ? by : (t > 0 ? t + 1 : 100)) + .02; player.peak = player.y;
}

/* ---------- pohyb hráče ---------- */
function updatePlayer(dt) {
  const p = player;
  if (!G.isLoaded(Math.floor(p.x), Math.floor(p.z))) return;
  p.inv = Math.max(0, p.inv - dt);
  if (ridingH) {
    const h = ridingH;
    if (h.dead) ridingH = null;
    else if (keys.ShiftLeft) { h.rider = false; h.ctrl = null; p.x = h.x + 1; p.y = h.y; p.z = h.z; ridingH = null; p.vy = 0; msg('Sesedl jsi', 900); return; }
    else {
      const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
      let wx = -sy * f + cy * s, wz = -cy * f - sy * s; const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
      const sp = keys.ControlLeft ? 12 : 8;
      h.ctrl = { vx: wx * sp, vz: wz * sp, jump: !!keys.Space };
      p.x = h.x; p.y = h.y + 1.05; p.z = h.z; p.vx = p.vy = p.vz = 0; p.onGround = true; p.peak = p.y; p.fall = 0;
      return;
    }
  }
  if (riding) {
    const c = riding;
    if (c.dead) riding = null;
    else if (keys.ShiftLeft) { c.rider = false; c.input = 0; p.x = c.x; p.y = c.y + 1; p.z = c.z; riding = null; p.vy = 0; msg('Vystoupil jsi', 900); return; }
    else {
      const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
      if (f !== 0 && c.v < .4) { const lx = -Math.sin(p.yaw), lz = -Math.cos(p.yaw); if ((c.dx * lx + c.dz * lz) * f < 0) G.cartFlip(c); c.input = 1; }
      else c.input = f > 0 ? 1 : f < 0 ? -2.2 : 0;
      p.x = c.x; p.y = c.y + .22; p.z = c.z; p.vx = p.vy = p.vz = 0; p.onGround = true; p.peak = p.y; p.fall = 0;
      return;
    }
  }
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
  const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  const sprint = keys.ShiftLeft && f > 0 && !p.flying;
  const inW = G.inFluid(p, B.WATER, .5), headW = G.inFluid(p, B.WATER, 1.6), inL = G.inFluid(p, B.LAVA, .5) || G.inFluid(p, B.LAVA, .1);
  G.underwater = headW; G.inLava = G.inFluid(p, B.LAVA, 1.6);
  let speed = sprint ? 6.2 : 4.4;
  if (p.flying) { speed = keys.ShiftLeft && !keys.Space ? 12 : 12; if (keys.ControlLeft) speed = 22; }
  if (inW || inL) speed *= p.flying ? 1 : .6;
  const k = Math.min(1, dt * (p.flying ? 7 : p.onGround ? 12 : 3.2));
  p.vx += (wx * speed - p.vx) * k; p.vz += (wz * speed - p.vz) * k;
  if (p.flying) {
    const ty = ((keys.Space ? 1 : 0) - (keys.ShiftLeft ? 1 : 0)) * 9;
    p.vy += (ty - p.vy) * Math.min(1, dt * 8);
  } else if (W.isLadder(getB(Math.floor(p.x), Math.floor(p.y + .3), Math.floor(p.z))) || W.isLadder(getB(Math.floor(p.x), Math.floor(p.y + 1.2), Math.floor(p.z)))) {
    p.vy = (keys.Space || f > 0) ? 3.6 : keys.ShiftLeft ? -3.6 : 0;
    p.vx *= 1 - dt * 4; p.vz *= 1 - dt * 4; p.peak = p.y;
  } else if (inW || inL) {
    p.vy -= (inL ? 4 : 9) * dt;
    if (keys.Space) p.vy += (inL ? 12 : 26) * dt;
    // vylezení z vody na břeh: narazí-li na stěnu a drží skok, vyskočí nahoru
    if (keys.Space && (p.hitX || p.hitZ)) { p.vy = Math.max(p.vy, inL ? 6.5 : 8.2); const wl2 = Math.hypot(wx, wz); if (wl2 > 0) { p.vx += wx * 2; p.vz += wz * 2; } }
    else if (keys.Space && p.onGround) p.vy = 8.6;
    if (p.vy > (inL ? 2.5 : 3.6) && !((p.hitX || p.hitZ) && keys.Space)) p.vy = inL ? 2.5 : 3.6;
    if (p.vy < -3.5) p.vy = -3.5;
    p.vx *= 1 - dt * 1.2; p.vz *= 1 - dt * 1.2;
  } else {
    p.vy -= 30 * dt; if (p.vy < -55) p.vy = -55;
    if (keys.Space && p.onGround) { p.vy = 9.3; p.onGround = false; }
  }
  const wasGround = p.onGround, vyBefore = p.vy;
  p.step = true;
  G.moveBody(p, dt);
  // pád
  if (p.flying || inW || inL) { p.peak = p.y; if (inW && vyBefore < -8) G.sfx('splash'); }
  else if (p.onGround) {
    if (!wasGround || p.peak - p.y > 0) {
      const fall = p.peak - p.y;
      if (fall > 3.2) { G.hurtPlayer(Math.floor(fall - 3), p.x, p.z, true); }
    }
    p.peak = p.y;
  } else if (p.y > p.peak) p.peak = p.y;
  if (p.onGround && p.flying && p.creative && keys.ShiftLeft && !keys.Space) p.flying = false; // přistání jen vědomě (Shift/Dolů), ne dotykem terénu při letu vpřed
  // dýchání a láva
  if (headW) { p.air -= dt; if (p.air < -0.1) { p.air = 0; G.hurtPlayer(2, p.x, p.z, true); p.air = 0; } }
  else p.air = Math.min(10, p.air + dt * 4);
  if (Math.abs(p.air - Math.round(p.air)) < dt) renderHearts();
  if (inL) { p.lavaT += dt; if (p.lavaT > .5) { p.lavaT = 0; G.hurtPlayer(4, p.x, p.z, true); } }
  if (p.alive && G.touchCactus(p)) G.hurtPlayer(1, p.x - p.vx, p.z - p.vz);
  // regenerace
  if (!p.creative && p.alive) {
    const mv = Math.hypot(p.vx, p.vz) > 1;
    p.foodT += dt * (mv ? (sprint ? 2.2 : 1) : .35);
    if (p.foodT > 28) { p.foodT = 0; if (p.food > 0) { p.food--; renderHearts(); } }
    if (p.food <= 0) { p.starveT += dt; if (p.starveT > 4) { p.starveT = 0; if (p.hp > 1) { p.hp--; G.sfx('hurt'); renderHearts(); } } } else p.starveT = 0;
  }
  if (p.hp < p.maxhp && p.alive && (p.creative || p.food >= 14)) { p.regen += dt; if (p.regen > 4) { p.regen = 3; p.hp = Math.min(p.maxhp, p.hp + 1); renderHearts(); } }
  // kroky
  const spd = Math.hypot(p.vx, p.vz);
  if (p.onGround && spd > 1) { p.stepD += spd * dt; p.bob += spd * dt * 1.7; if (p.stepD > 2.3) { p.stepD = 0; G.sfx('step'); } }
  // void
  if (p.y < -30) { p.hp = 0; die(); }
  $('water').style.display = headW ? 'block' : 'none';
  $('lavaov').style.display = G.inLava ? 'block' : 'none';
}

/* ---------- ukládání ---------- */
let saveWarned = false;
function save() {
  if (state === 'menu' || !curWorld || G.mp) return;
  try {
    const mods = {};
    for (const [k, v] of G.modsMap) mods[k] = v;
    const data = {
      seed: W.getSeed(), creative: player.creative, flying: !!player.flying, time: G.time, x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch,
      hp: player.hp, food: player.food, armor: player.armor, inv, sel, mods, spawn: spawnPt, R: G.R, chests: Object.fromEntries(G.chests), furnaces: Object.fromEntries(G.furnaces), extraBuilds: G.extraBuilds, furn: G.furnData(), furnDone: [...G.furnDone], memStore: G.memStore, rep: G.rep, family: G.family && Object.assign({}, G.family, { ent: undefined })
    };
    localStorage.setItem(WORLD_PFX + curWorld.id, JSON.stringify(data));
    const idx = readIndex(), m = idx.find(w => w.id === curWorld.id);
    if (m) { m.last = Date.now(); m.creative = !!player.creative; m.seed = data.seed; writeIndex(idx); }
    G.modsDirty = false; saveWarned = false;
  } catch (e) {
    console.warn('uložení selhalo', e);
    if (!saveWarned) { saveWarned = true; msg('Uložení selhalo – úložiště prohlížeče je plné. Smaž v nabídce některý starý svět.', 6000); }
  }
}
window.addEventListener('beforeunload', save);

/* ---------- start hry ---------- */
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }
const newSeed = () => { const t = $('seed').value.trim(); return t ? (/^-?\d+$/.test(t) ? parseInt(t, 10) | 0 : strHash(t)) : Math.floor(Math.random() * 2 ** 31); };
function startGame(creative, saved, meta) {
  G.audioInit();
  let seed;
  if (saved) seed = saved.seed; else if (meta && meta.seed !== undefined) seed = meta.seed; else seed = newSeed();
  if (!meta) { // nový svět (i při volání z konzole)
    const idx = readIndex(), id = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
    meta = { id, name: ($('wName').value.trim() || nextWorldName(idx)).slice(0, 28), creative: !!creative, seed, last: Date.now() };
    idx.push(meta); writeIndex(idx);
  }
  curWorld = { id: meta.id, name: meta.name };
  $('pWorld').textContent = meta.name;
  G.R = parseInt($('dist').value, 10);
  try { localStorage.setItem('perlicky_dist', $('dist').value); localStorage.setItem('perlicky_gfx2', $('gfx').value); } catch (e) {}
  G.setGfx($('gfx').value); $('gfx').value = String(G.q); lowFps = 0;
  W.init(seed);
  G.weather.rain = 0; G.weather.target = 0; G.weather.timer = 90 + Math.random() * 120;
  G.extraBuilds = [];
  if (saved && saved.extraBuilds) for (const x of saved.extraBuilds) { const v = W.getVillage(Math.floor(x.vx / W.REG), Math.floor(x.vz / W.REG)); if (v && v.x === x.vx && v.z === x.vz) { v.builds.push(x.bd); v.added = (v.added || 0) + 1; G.extraBuilds.push(x); } }
  G.clearWorld(); G.resetEntities(); G.fluidClear(); G.resetSocial();
  if (saved) { G.memStore = saved.memStore || {}; G.rep = saved.rep || { g: 0, v: {} }; G.family = saved.family || null; if (G.family) G.family.ent = null; }
  G.chests.clear(); G.furnaces.clear(); G.rsClear(); G.furnClear(); riding = null; ridingH = null;
  if (saved) { for (const k in saved.mods) G.modsMap.set(+k, saved.mods[k]); if (saved.chests) for (const k in saved.chests) G.chests.set(k, saved.chests[k]); if (saved.furnaces) for (const k in saved.furnaces) G.furnaces.set(k, saved.furnaces[k]); G.furnLoad(saved.furn); for (const k of saved.furnDone || []) G.furnDone.add(k); G.rsRebuild(); }
  inv.fill(null); player.armor = [null, null, null, null];
  Object.assign(player, { vx: 0, vy: 0, vz: 0, alive: true, creative, flying: false, air: 10, inv: 1, shake: 0, regen: 0 });
  if (saved) {
    saved.inv.forEach((s, i) => inv[i] = s); sel = saved.sel || 0; player.hp = saved.hp; player.food = saved.food === undefined ? 20 : saved.food; player.armor = saved.armor || [null, null, null, null]; G.time = saved.time;
    spawnPt = saved.spawn; player.yaw = saved.yaw; player.pitch = saved.pitch;
    player.x = saved.x; player.y = saved.y; player.z = saved.z;
    if (saved.flying && creative) player.flying = true;
  } else {
    const sp = W.findSpawn(); spawnPt = { x: sp.x, y: sp.y, z: sp.z };
    player.hp = 20; player.food = 20; G.time = .27; sel = 0; player.yaw = Math.random() * 6.28; player.pitch = 0; player.x = sp.x; player.z = sp.z; player.y = sp.y + 30;
    if (!creative) { inv[0] = { id: I.SWORD_W, count: 1 }; inv[1] = { id: I.PICK_W, count: 1 }; inv[2] = { id: I.BREAD, count: 4 }; inv[3] = { id: B.TORCH, count: 6 }; }
    else {
      [I.PICK_D, I.AXE_D, I.SHOVEL_D, I.SWORD_D, I.BOW, B.GRASS, B.STONE, B.PLANKS, B.TORCH].forEach((id, i) => inv[i] = { id, count: id >= 100 ? 1 : 64 });
      [I.A_DIA_H, I.A_DIA_C, I.A_DIA_L, I.A_DIA_B].forEach((id, i) => { inv[13 + i] = { id, count: 1 }; });
      inv[9] = { id: I.ARROW, count: 64 }; inv[10] = { id: I.BREAD, count: 64 }; inv[11] = { id: B.GLASS, count: 64 }; inv[12] = { id: B.LOG, count: 64 };
    }
  }
  $('menu').style.display = 'none'; $('loading').style.display = 'flex';
  state = 'loading';
  loadWait = { saved: !!saved, t0: performance.now() };
}
let loadWait = null;
function finishLoading() {
  if (!loadWait.saved) placePlayer(spawnPt.x, spawnPt.z);
  else if (!G.isLoaded(Math.floor(player.x), Math.floor(player.z))) placePlayer(player.x, player.z);
  else { const t = G.topY(Math.floor(player.x), Math.floor(player.z)); if (player.y < t - 2) player.y = t + 1.1; }
  player.peak = player.y;
  $('loading').style.display = 'none'; $('hud').style.display = 'block';
  state = 'play'; handId = -2; refreshUI();
  paused = true; $('pause').style.display = 'flex'; $('bResume').textContent = 'Klikni pro start';
  setTimeout(() => $('bResume').textContent = 'Pokračovat', 500);
  G.spawnAnimalsNow(10);
  msg(player.creative ? 'Kreativní režim – dvojklik mezerník = létání' : 'Najdi vesnici, obchoduj s vesničany a prozkoumej svět!', 4000);
  loadWait = null;
}

/* ---------- nabídka světů ---------- */
const nextWorldName = (idx) => { let n = idx.length + 1; while (idx.some(w => w.name === 'Svět ' + n)) n++; return 'Svět ' + n; };
function ago(t) {
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (m < 1) return 'právě teď'; if (m < 60) return 'před ' + m + ' min';
  const h = Math.floor(m / 60); if (h < 24) return 'před ' + h + ' hod';
  const d = Math.floor(h / 24); return d === 1 ? 'včera' : d < 31 ? 'před ' + d + ' dny' : new Date(t).toLocaleDateString('cs-CZ');
}
function playWorld(w) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(WORLD_PFX + w.id)); } catch (e) { alert('Uložená hra je poškozená.'); return; }
  startGame(d ? !!d.creative : !!w.creative, d || null, w);
}
G.showView = (v) => showView(v);
function showView(v) { $('pWorlds').style.display = v === 'list' ? 'flex' : 'none'; $('pNew').style.display = v === 'new' ? 'flex' : 'none'; }
function renderWorlds() {
  const box = $('wlist'), idx = readIndex().sort((a, b) => (b.last || 0) - (a.last || 0));
  box.textContent = '';
  if (!idx.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Zatím tu není žádný svět. Vytvoř si první!'; box.appendChild(e); return; }
  idx.forEach((w, i) => {
    const row = document.createElement('div'); row.className = 'world' + (w.creative ? ' cre' : '');
    const ico = document.createElement('div'); ico.className = 'ico';
    const inf = document.createElement('div'); inf.className = 'inf';
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = w.name;
    const mt = document.createElement('div'); mt.className = 'mt'; mt.textContent = (w.creative ? 'Kreativní' : 'Přežití') + ' · seed ' + w.seed + ' · ' + ago(w.last || 0) + (i === 0 ? ' · poslední' : '');
    inf.append(nm, mt);
    const acts = document.createElement('div'); acts.className = 'acts';
    const bP = document.createElement('button'); bP.className = 'b sm'; bP.textContent = 'Hrát'; bP.onclick = () => playWorld(w);
    const bR = document.createElement('button'); bR.className = 'b sm'; bR.textContent = '✎'; bR.title = 'Přejmenovat';
    const bD = document.createElement('button'); bD.className = 'b sm del'; bD.textContent = '🗑'; bD.title = 'Smazat';
    bR.onclick = () => {
      const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 28; inp.value = w.name;
      nm.textContent = ''; nm.appendChild(inp); inp.focus(); inp.select();
      let done = false;
      const fin = (ok) => { if (done) return; done = true; if (ok) { const v = inp.value.trim(); if (v) { const ix = readIndex(), m = ix.find(x => x.id === w.id); if (m) { m.name = v.slice(0, 28); writeIndex(ix); } } } renderWorlds(); };
      inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); };
      inp.onblur = () => fin(true);
    };
    let t = 0;
    bD.onclick = () => {
      if (!bD.classList.contains('sure')) { bD.classList.add('sure'); bD.textContent = 'Opravdu?'; t = setTimeout(() => { bD.classList.remove('sure'); bD.textContent = '🗑'; }, 3000); return; }
      clearTimeout(t); try { localStorage.removeItem(WORLD_PFX + w.id); } catch (e) {}
      writeIndex(readIndex().filter(x => x.id !== w.id)); renderWorlds();
    };
    acts.append(bP, bR, bD); row.append(ico, inf, acts); box.appendChild(row);
  });
}
let newCreative = false;
function setMode(c) {
  newCreative = c; $('mSurv').classList.toggle('on', !c); $('mCre').classList.toggle('on', c);
  $('modeDesc').textContent = c ? 'Neomezené bloky, létání a žádné ohrožení. Ideální na stavění.' : 'Těž suroviny, vyráběj, obchoduj s vesničany a přežij noc i nájezdy.';
}
$('mSurv').onclick = () => setMode(false); $('mCre').onclick = () => setMode(true);
$('bNew').onclick = () => { $('wName').value = ''; $('seed').value = ''; $('wName').placeholder = nextWorldName(readIndex()); setMode(false); showView('new'); $('wName').focus(); };
$('bBack').onclick = () => showView('list');
$('bCreate').onclick = () => startGame(newCreative, null);
$('wName').onkeydown = $('seed').onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') $('bCreate').click(); };
try { const gv = localStorage.getItem('perlicky_gfx2'); if (gv === '0' || gv === '1' || gv === '2') $('gfx').value = gv; else if (touchMode) $('gfx').value = '1'; } catch (e) {}
try { const dv = localStorage.getItem('perlicky_dist'); if (dv && [...$('dist').options].some(o => o.value === dv)) $('dist').value = dv; } catch (e) {}
/* ---------- ozdoby úvodní obrazovky ---------- */
(function menuDecor() {
  const logo = $('logo'), txt = logo.textContent; logo.textContent = '';
  [...txt].forEach((ch, i) => { const sp = document.createElement('span'); sp.textContent = ch; sp.style.animationDelay = (i * .18) + 's'; logo.appendChild(sp); });
  const sky = $('sky'), R = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 7; i++) { const c = document.createElement('div'); c.className = 'cloud'; c.style.top = R(3, 40) + '%'; c.style.animationDuration = R(60, 130) + 's'; c.style.animationDelay = -R(0, 130) + 's'; c.style.transform = 'scale(' + R(.7, 1.6) + ')'; sky.appendChild(c); }
  // blokové kopce (SVG, 3 vrstvy)
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 64 20'); svg.setAttribute('preserveAspectRatio', 'none');
  [['#7fc15a', 9, 6], ['#63a845', 12, 5], ['#4f8a35', 16, 3]].forEach(([col, base, amp], L) => {
    let h = base, ph = Math.random() * 6;
    for (let x = 0; x < 64; x++) {
      h = base + Math.round(Math.sin(x * .21 + ph + L) * amp * .6 + Math.sin(x * .07 + ph * 2) * amp * .5);
      const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', 20 - h); r.setAttribute('width', 1.02); r.setAttribute('height', h); r.setAttribute('fill', col); svg.appendChild(r);
    }
  });
  sky.appendChild(svg);
  for (let i = 0; i < 16; i++) { const p = document.createElement('div'), z = R(9, 34); p.className = 'pearl'; p.style.cssText = `width:${z}px;height:${z}px;left:${R(2, 96)}%;top:${R(6, 88)}%;--d:${R(3, 6)}s;--dl:${-R(0, 6)}s;opacity:${R(.55, .95)}`; sky.appendChild(p); }
})();
/* ---------- 3D pozadí menu: pomalý přelet nad vesnicí při západu slunce ---------- */
const MENU_SEED = 4242, MENU_C = { x: -502, z: -509, gy: 70 };
let menuBg = null;
function startMenuBg() {
  try {
    G.setGfx($('gfx').value); G.R = 5;
    W.init(MENU_SEED); G.extraBuilds = [];
    G.clearWorld(); G.resetEntities(); G.fluidClear(); G.chests.clear(); G.furnaces.clear(); G.rsClear(); G.furnClear();
    G.weather.rain = 0; G.weather.target = 0; G.weather.timer = 1e6;
    G.time = .70;
    menuBg = { on: true, ang: Math.random() * 6.28, t: 0, ready: false };
    document.getElementById('menu').classList.remove('bg3d');
  } catch (e) { menuBg = null; }
}
function menuFrame(dt) {
  const b = menuBg; b.t += dt; b.ang += dt * .045;
  const cx = MENU_C.x, cz = MENU_C.z, r = 48 + Math.sin(b.t * .07) * 7, y = MENU_C.gy + 12 + Math.sin(b.t * .11) * 2;
  const px = cx + Math.cos(b.ang) * r, pz = cz + Math.sin(b.ang) * r;
  G.updateChunks(px, pz, b.ready ? 4 : 12);
  const [d, t] = G.pendingChunks(px, pz);
  if (!b.ready && d >= t * .85) { b.ready = true; document.getElementById('menu').classList.add('bg3d'); }
  camera.position.set(px, y, pz);
  const tx = cx, ty = MENU_C.gy + 13, tz = cz, dx = tx - px, dz = tz - pz;
  camera.rotation.y = Math.atan2(-dx, -dz) + (innerWidth > innerHeight ? .52 : .3); camera.rotation.x = Math.atan2(ty - y, Math.hypot(dx, dz));
  G.time = .70 + Math.sin(b.t * .02) * .015;
  G.updateSky(dt, camera.position);
  if (b.ready) G.render();
}
G.startMenuBg = startMenuBg;
$('gfx').addEventListener('change', () => { try { G.setGfx($('gfx').value); } catch (e) {} });
function showMenu() { renderWorlds(); showView('list'); }
showMenu();
startMenuBg();
if (!readIndex().length) $('bNew').click();

/* ---------- HUD ---------- */
const BIOME_NAMES = ['Oceán', 'Pláž', 'Pláně', 'Les', 'Poušť', 'Zasněžená krajina', 'Hory'];
let fpsAcc = 0, fpsN = 0, fps = 0, lowFps = 0;
function updateWeather(dt) {
  const w = G.weather;
  if (G.mp) w.timer = 999; // počasí řídí server
  w.timer -= dt;
  if (w.timer <= 0) {
    if (w.target > 0) { w.target = 0; w.thunder = false; w.timer = 150 + rand() * 240; }
    else { w.target = .65 + rand() * .35; w.thunder = rand() < .35; w.timer = 110 + rand() * 200; w.nextBolt = 6 + rand() * 12; if (!G.snowing) msg(w.thunder ? 'Začíná bouřka…' : 'Začíná pršet…', 2200); }
  }
  w.rain += (w.target - w.rain) * Math.min(1, dt * .22);
  if (w.rain < .01 && w.target === 0) w.rain = 0;
  if (w.thunder && w.rain > .5) {
    w.nextBolt -= dt;
    if (w.nextBolt <= 0) {
      w.nextBolt = 9 + rand() * 24;
      const a = rand() * 6.28, d = 20 + rand() * 55, bx = player.x + Math.cos(a) * d, bz = player.z + Math.sin(a) * d;
      G.lightning(bx, bz);
      setTimeout(() => { G.sfx('thunder', bx, G.topY(Math.floor(bx), Math.floor(bz)), bz); G.sfx('thunder'); }, 150 + d * 12);
      for (const e of G.entities) if (e.kind === 'mob' && Math.hypot(e.x - bx, e.z - bz) < 3.5) G.damageEntity(e, 12, 0, 0);
      if (Math.hypot(player.x - bx, player.z - bz) < 3) G.hurtPlayer(8, bx, bz, true);
    }
  }
  const sheltered = G.skyExposed(Math.floor(player.x), Math.floor(player.y + 1.7), Math.floor(player.z)) ? 1 : .25;
  G.setRainVolume(w.rain * sheltered * (G.snowing ? .15 : 1));
}
function updateHud(dt) {
  const R = G.raid, re = $('raid');
  if (R) {
    re.style.display = 'block';
    re.firstChild.textContent = R.state === 'wave' ? `Nájezd – vlna ${R.wave}/${R.waves} · nepřátel: ${R.list.length}` : `Nájezd – ${R.wave ? 'další vlna se blíží…' : 'nepřátelé se blíží…'}`;
    re.lastChild.firstChild.style.width = (R.state === 'wave' ? Math.min(100, R.list.length / Math.max(1, R.waveTotal) * 100) : 100) + '%';
  } else re.style.display = 'none';
  const hr = Math.floor(G.time * 24), mn = Math.floor((G.time * 24 - hr) * 60);
  $('info').textContent = `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')} ${G.weather.rain > .3 ? (G.snowing ? '❄' : (G.weather.thunder ? '⛈' : '🌧')) : (G.dayFactor > .5 ? '☀' : '☾')}${player.creative ? ' · Kreativní' : ''}`;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > .5) {
    fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0;
    if (G.postOn && !paused && state === 'play') { lowFps = fps < 22 ? lowFps + 1 : 0; if (lowFps >= 8) { const nq = Math.max(0, G.q - 1); G.setGfx(nq); $('gfx').value = String(nq); lowFps = 0; try { localStorage.setItem('perlicky_gfx2', String(nq)); } catch (e) {} msg(nq ? 'Hra běžela pomalu, snížena kvalita grafiky (filmová).' : 'Hra běžela pomalu, přepnuto na rychlou grafiku.', 3500); } }
  }
  if (showDebug) {
    const c = G.getChunk(Math.floor(player.x / 16), Math.floor(player.z / 16));
    const bi = c ? BIOME_NAMES[c.biome[(Math.floor(player.z) & 15) * 16 + (Math.floor(player.x) & 15)]] : '?';
    let mobs = 0, vill = 0; for (const e of G.entities) if (e.kind === 'mob') { if (e.type === 'villager') vill++; else mobs++; }
    $('debug').textContent = `FPS ${fps}\nXYZ ${player.x.toFixed(1)} ${player.y.toFixed(1)} ${player.z.toFixed(1)}\nBiom: ${bi}\nChunků: ${G.chunks.size}  Příšer: ${mobs}  Vesničanů: ${vill}\nSeed: ${W.getSeed()}  Dohled: ${G.R}`;
  }
}

/* ---------- hlavní smyčka ---------- */
let last = performance.now(), saveT = 0, furT = 0;
let fovCur = 75;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'loading' && loadWait) {
    G.updateChunks(player.x, player.z, 40);
    const [d, t] = G.pendingChunks(player.x, player.z);
    $('loading').querySelector('i').style.width = (d / Math.max(1, t) * 100) + '%';
    $('loadTxt').textContent = `Generuji svět… ${d}/${t}`;
    if (d >= Math.min(t, 28) || performance.now() - loadWait.t0 > 25000) finishLoading();
    G.updateSky(0, camera.position); G.render();
    return;
  }
  if (state === 'play') {
    if (!paused || G.forceRun) { G.rsTick(dt); updateFurnaces(dt); G.furnUpdate(dt); G.furnVillages(dt); if (uiOpen === 'inv' && chestRef && chestRef.furnace) { furT += dt; if (furT > .5) { furT = 0; renderInv(); } } }
    const running = (!paused || G.forceRun) && !uiOpen && player.alive;
    G.updateChunks(player.x, player.z, running ? 5 : 8);
    if (running) {
      G.time = (G.time + dt / DAY_LEN) % 1;
      updateWeather(dt);
      updatePlayer(dt);
      updateInteraction(dt);
      G.updateEntities(dt); G.updateFluids();
      saveT += dt; if (saveT > 20) { saveT = 0; if (G.modsDirty || true) save(); }
    } else if (player.alive && !uiOpen) {
      // pauza – nic se neděje
    }
    if (G.net) G.net.tick(dt);
    // kamera
    const bob = player.onGround ? Math.sin(player.bob) * .035 * Math.min(1, Math.hypot(player.vx, player.vz) / 4) : 0;
    camera.position.set(player.x, player.y + 1.62 + bob, player.z);
    if (player.shake > 0) { player.shake -= dt; camera.position.x += (Math.random() - .5) * player.shake * .3; camera.position.y += (Math.random() - .5) * player.shake * .3; }
    camera.rotation.set(player.pitch, player.yaw, 0);
    const sprinting = keys.ShiftLeft && (keys.KeyW) && !uiOpen;
    const tf = sprinting ? 84 : 75;
    fovCur += (tf - fovCur) * Math.min(1, dt * 8);
    if (Math.abs(camera.fov - fovCur) > .05) { camera.fov = fovCur; camera.updateProjectionMatrix(); }
    // ruka
    const sw = swing;
    hand.position.set(0, -Math.sin(sw * Math.PI) * .12 + bob * .6, bowing ? Math.min(1, bowCharge) * .14 : 0);
    hand.rotation.set(-Math.sin(sw * Math.PI) * .7, 0, -Math.sin(sw * Math.PI) * .2);
    { const hs = inv[sel], em = hs && hs.id < 100 ? W.EMIT[hs.id] : 0; G.U.uHeld.value = em / 15; G.U.uPP.value.set(player.x, player.y, player.z); G.U.uTime.value = now / 1000; player.holding = hs ? hs.id : -1; }
    heldBlockMat.color.setScalar(.4 + .6 * G.dayFactor); armMat.color.setScalar(.4 + .6 * G.dayFactor);
    G.updateSky(dt, camera.position);
    G.updateWeatherVisuals(dt, camera.position); G.tickBolt(dt);
    updateHud(dt);
  } else {
    if (state === 'menu') { if (menuBg && menuBg.on) menuFrame(dt); return; } // bez pozadí se za menu nevykresluje
    G.updateSky(0, camera.position);
  }
  G.render();
}
// pozadí menu: pomalu se točící prázdná obloha
camera.position.set(0, 60, 0);
requestAnimationFrame(loop);


/* ---------- multiplayer: háčky (net.js je používá) ---------- */
(function () {
  const wrap = (fn, set) => function () { const o = G.pa; G.pa = true; try { return fn.apply(this, arguments); } finally { G.pa = o; } };
  breakBlock = wrap(breakBlock); useItem = wrap(useItem); checkGolem = wrap(checkGolem);
  const _ex = G.explode; if (_ex) G.explode = wrap(_ex);
  const _cu = closeUI;
  closeUI = function () { const cr = chestRef; _cu(); if (G.net && G.mp && cr && cr.arr && !cr.furnace) G.net.chest(cr.x, cr.y, cr.z, cr.arr); };
  G.closeUI = () => closeUI();
  G.mpUiOpen = () => !!uiOpen;
  G.mpSnap = () => ({ x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch, hp: player.hp, food: player.food, armor: player.armor, inv: inv.map(s => s ? { id: s.id, count: s.count } : null), sel, spawn: spawnPt, creative: player.creative, flying: !!player.flying });
  G.mpState = () => state; G.mpPlayer = player; G.mpHeld = () => { const h = inv[sel]; return h ? h.id : 0; };
  G.mpTp = (x, y, z) => { player.x = x; player.y = y; player.z = z; player.vx = player.vy = player.vz = 0; player.peak = y; };
  G.mpStart = function (info) {
    const meta = { id: 'mp', name: info.title, creative: info.creative, seed: info.seed, last: Date.now() };
    startGame(info.creative, null, meta);
    G.time = info.time;
    const d = info.saved;
    if (d && d.inv) {
      inv.fill(null); d.inv.forEach((s, i) => { inv[i] = s; }); sel = d.sel || 0;
      player.hp = d.hp > 0 ? d.hp : 20; player.food = d.food === undefined ? 20 : d.food; player.armor = d.armor || [null, null, null, null];
      if (d.spawn) spawnPt = d.spawn;
      player.yaw = d.yaw || 0; player.pitch = d.pitch || 0; player.x = d.x; player.y = d.y; player.z = d.z;
      if (d.flying && info.creative) player.flying = true;
      loadWait.saved = true; refreshUI();
    }
  };
})();
// hotové API pro ladění
G.raycast = raycast; G.setWeather = (rain, thunder) => { G.weather.target = rain; G.weather.thunder = !!thunder; G.weather.timer = 300; G.weather.nextBolt = 2; }; G.checkGolem = checkGolem; G.furnaceAt = furnaceAt; G.updateFurnaces = updateFurnaces; G.releaseBow = releaseBow; G.openChest = openChest; G.start = startGame; G.keys = keys; G.openTrade = openTrade; G.save = save;
})();
