/* ===========================================================
   world.js – bloky, šum, generování terénu, jeskyní, stromů a vesnic
   (čistá logika bez závislosti na prohlížeči, jde testovat v Node)
   =========================================================== */
(function (root) {
'use strict';
const W = {};
const CH = 16, H = 128, SEA = 62, OFF = 32;
W.CH = CH; W.H = H; W.SEA = SEA;

/* ---------- ID bloků ---------- */
const B = {
  AIR:0, GRASS:1, DIRT:2, STONE:3, COBBLE:4, SAND:5, LOG:6, LEAVES:7, PLANKS:8, WATER:9,
  SNOW:10, BEDROCK:11, COAL_ORE:12, IRON_ORE:13, GRAVEL:14, GLASS:15, SANDSTONE:16, TORCH:17,
  TALLGRASS:18, FLOWER_R:19, FLOWER_Y:20, GLOWSTONE:21, LAVA:22, CACTUS:23, BRICKS:24, PATH:25,
  FARM:26, WHEAT:27,
  DOOR_B0:28, DOOR_T0:29, DOOR_B1:30, DOOR_T1:31, DOOR_BO0:32, DOOR_TO0:33, DOOR_BO1:34, DOOR_TO1:35,
  BED_F0:36, BED_F1:37, BED_F2:38, BED_F3:39, BED_H0:40, BED_H1:41, BED_H2:42, BED_H3:43,
  CHEST0:44, CHEST1:45, CHEST2:46, CHEST3:47, LADDER0:48, LADDER1:49, LADDER2:50, LADDER3:51,
  SLAB_P:52, SLAB_C:53, WOOL:54, HAY:55,
  WF1:56, WF2:57, WF3:58, WF4:59, WF5:60, WF6:61, WF7:62, LF1:63, LF2:64, LF3:65, OBSIDIAN:66,
  GRANITE:67, DIORITE:68, ANDESITE:69, DEEPSLATE:70, GOLD_ORE:71, DIAMOND_ORE:72, STONE_BRICKS:73,
  IRON_BLOCK:74, PUMPKIN:75, FURNACE:76, GOLD_BLOCK:77, DIAMOND_BLOCK:78, EMERALD_BLOCK:79,
  RAIL:80, DUST_OFF:81, DUST_ON:82, RS_BLOCK:83, LAMP_OFF:84, LAMP_ON:85, RS_ORE:86, LEVER0:87, TNT:97, FENCE:98, FURN:99,
  BELL:129, ASPHALT:145, LINE_X:146, LINE_Z:147, CONCRETE:148, CONCRETE_D:149, MGLASS:166, STEEL:167, PANEL:168, SIDEWALK:169
};
W.B = B;
/* ID předmětů (ne bloků) */
const I = { F_TABLE:195, F_CHAIR:196, F_SOFA:197, F_SHELF:198, F_WARD:199, F_LAMP:248, F_PLANT:249, F_COUNTER:250, F_SWING:251, F_SLIDE:252, F_SEESAW:253, F_SANDBOX:254, F_SIGN:255, STICK:100, COAL:101, IRON:102, WHEAT_ITEM:103, BREAD:104, APPLE:105,
  BEEF:106, PORK:107, CHICKEN:108,
  SWORD_W:110, SWORD_S:111, SWORD_I:112, PICK_W:113, PICK_S:114, PICK_I:115,
  DOOR:116, BED:117, LADDER:118, STEAK:119, PORKCHOP:120, CHICKEN_C:121,
  GOLD:123, MINECART:180, REDSTONE:181, FLINT_STEEL:182, RABBIT:183, RABBIT_C:184, EGG_HORSE:190, EGG_RABBIT:191, EGG_WOLF:192, EGG_VINDICATOR:193, EGG_RAVAGER:194, EMERALD:128, EGG_GOLEM:170, EGG_COW:171, EGG_PIG:172, EGG_SHEEP:173, EGG_CHICKEN:174, EGG_VILLAGER:175, EGG_PILLAGER:176, EGG_EVIL:177, LEATHER:127, A_LEA_H:162, A_LEA_C:163, A_LEA_L:164, A_LEA_B:165, DIAMOND:124, RAW_IRON:125, RAW_GOLD:126, BOW:140, CROSSBOW:141, ARROW:142, FEATHER:143, STRING:144,
  A_IRON_H:150, A_IRON_C:151, A_IRON_L:152, A_IRON_B:153, A_GOLD_H:154, A_GOLD_C:155, A_GOLD_L:156, A_GOLD_B:157, A_DIA_H:158, A_DIA_C:159, A_DIA_L:160, A_DIA_B:161,
  AXE_W:130, AXE_S:131, AXE_I:132, AXE_D:133, SHOVEL_W:134, SHOVEL_S:135, SHOVEL_I:136, SHOVEL_D:137, SWORD_D:138, PICK_D:139 };
W.I = I;

/* tiles v atlasu */
const T = { GRASS_TOP:0, GRASS_SIDE:1, DIRT:2, STONE:3, COBBLE:4, SAND:5, LOG_SIDE:6, LOG_TOP:7, LEAVES:8,
  PLANKS:9, WATER:10, SNOW:11, SNOW_SIDE:12, BEDROCK:13, COAL:14, IRON:15, GRAVEL:16, GLASS:17,
  SANDSTONE:18, TORCH:19, TALLGRASS:20, FLOWER_R:21, FLOWER_Y:22, GLOWSTONE:23, LAVA:24,
  CACTUS_SIDE:25, CACTUS_TOP:26, BRICKS:27, PATH_TOP:28, FARM_TOP:29, WHEAT:30,
  DOOR_LOW:33, DOOR_UP:34, BED_HEAD:35, BED_FOOT:36, BED_SIDE:37, CHEST_TOP:38, CHEST_SIDE:39, CHEST_FRONT:40, LADDER:41, WOOL:42, HAY_SIDE:43, HAY_TOP:44, OBSIDIAN:45,
  GRANITE:46, DIORITE:47, ANDESITE:48, DEEPSLATE:49, GOLD_ORE:50, DIAMOND_ORE:51, STONE_BRICKS:52,
  IRON_BLOCK:53, PUMPKIN_TOP:54, PUMPKIN_FACE:55, FURNACE_FRONT:56, FURNACE_TOP:57, GOLD_BLOCK:58, DIAMOND_BLOCK:59, EMERALD_BLOCK:60,
  RAIL_S:61, RAIL_C:62, DUST:63, RS_BLOCK:64, LAMP_OFF:65, LAMP_ON:66, RS_ORE:67, LEVER:68, TNT_SIDE:69, TNT_TOP:70, PUMPKIN_SIDE:71,
  ASPHALT:72, LINE_X:73, LINE_Z:74, CONCRETE:75, CONCRETE_D:76, MGLASS:77, STEEL:78, PANEL:79, SIDEWALK:80 };
W.T = T;

/* vlastnosti: [jméno, top, bottom, side, flags] */
const BL = new Array(256).fill(null);
function def(id, name, top, bot, side, o) {
  BL[id] = Object.assign({ id, name, top, bot, side, solid: true, occ: true, trans: false, cross: false,
    emit: 0, hard: 1, tool: null, target: true }, o || {});
}
def(B.AIR, 'Vzduch', 0, 0, 0, { solid: false, occ: false, target: false });
def(B.GRASS, 'Tráva', T.GRASS_TOP, T.DIRT, T.GRASS_SIDE, { hard: .6 });
def(B.DIRT, 'Hlína', T.DIRT, T.DIRT, T.DIRT, { hard: .5 });
def(B.STONE, 'Kámen', T.STONE, T.STONE, T.STONE, { hard: 2.4, tool: 'pick' });
def(B.COBBLE, 'Dlažba', T.COBBLE, T.COBBLE, T.COBBLE, { hard: 2.4, tool: 'pick' });
def(B.SAND, 'Písek', T.SAND, T.SAND, T.SAND, { hard: .5 });
def(B.LOG, 'Dřevo', T.LOG_TOP, T.LOG_TOP, T.LOG_SIDE, { hard: 2 });
def(B.LEAVES, 'Listí', T.LEAVES, T.LEAVES, T.LEAVES, { hard: .2, occ: false });
def(B.PLANKS, 'Prkna', T.PLANKS, T.PLANKS, T.PLANKS, { hard: 1.5 });
def(B.WATER, 'Voda', T.WATER, T.WATER, T.WATER, { solid: false, occ: false, trans: true, target: false, hard: 99 });
def(B.SNOW, 'Sníh', T.SNOW, T.SNOW, T.SNOW, { hard: .3 });
def(B.BEDROCK, 'Podloží', T.BEDROCK, T.BEDROCK, T.BEDROCK, { hard: -1 });
def(B.COAL_ORE, 'Uhelná ruda', T.COAL, T.COAL, T.COAL, { hard: 3.2, tool: 'pick' });
def(B.IRON_ORE, 'Železná ruda', T.IRON, T.IRON, T.IRON, { hard: 3.8, tool: 'pick' });
def(B.GRAVEL, 'Štěrk', T.GRAVEL, T.GRAVEL, T.GRAVEL, { hard: .6 });
def(B.GLASS, 'Sklo', T.GLASS, T.GLASS, T.GLASS, { hard: .3, occ: false, trans: true });
def(B.SANDSTONE, 'Pískovec', T.SANDSTONE, T.SANDSTONE, T.SANDSTONE, { hard: 1.6, tool: 'pick' });
def(B.TORCH, 'Pochodeň', T.TORCH, T.TORCH, T.TORCH, { solid: false, occ: false, cross: true, emit: 14, hard: 0 });
def(B.TALLGRASS, 'Vysoká tráva', T.TALLGRASS, T.TALLGRASS, T.TALLGRASS, { solid: false, occ: false, cross: true, hard: 0 });
def(B.FLOWER_R, 'Červená květina', T.FLOWER_R, T.FLOWER_R, T.FLOWER_R, { solid: false, occ: false, cross: true, hard: 0 });
def(B.FLOWER_Y, 'Žlutá květina', T.FLOWER_Y, T.FLOWER_Y, T.FLOWER_Y, { solid: false, occ: false, cross: true, hard: 0 });
def(B.GLOWSTONE, 'Svítící kámen', T.GLOWSTONE, T.GLOWSTONE, T.GLOWSTONE, { hard: .5, emit: 15 });
def(B.LAVA, 'Láva', T.LAVA, T.LAVA, T.LAVA, { solid: false, occ: false, emit: 15, target: false, hard: 99 });
def(B.CACTUS, 'Kaktus', T.CACTUS_TOP, T.CACTUS_TOP, T.CACTUS_SIDE, { hard: .5, occ: false });
def(B.BRICKS, 'Cihly', T.BRICKS, T.BRICKS, T.BRICKS, { hard: 2.2, tool: 'pick' });
def(B.ASPHALT, 'Asfalt', T.ASPHALT, T.ASPHALT, T.ASPHALT, { hard: 2, tool: 'pick' });
def(B.LINE_X, 'Asfalt s čárou', T.LINE_X, T.ASPHALT, T.ASPHALT, { hard: 2, tool: 'pick' });
def(B.LINE_Z, 'Asfalt s čárou', T.LINE_Z, T.ASPHALT, T.ASPHALT, { hard: 2, tool: 'pick' });
def(B.CONCRETE, 'Beton', T.CONCRETE, T.CONCRETE, T.CONCRETE, { hard: 2.4, tool: 'pick' });
def(B.CONCRETE_D, 'Tmavý beton', T.CONCRETE_D, T.CONCRETE_D, T.CONCRETE_D, { hard: 2.4, tool: 'pick' });
def(B.MGLASS, 'Tónované sklo', T.MGLASS, T.MGLASS, T.MGLASS, { hard: .4, occ: false, trans: true });
def(B.STEEL, 'Ocel', T.STEEL, T.STEEL, T.STEEL, { hard: 3.2, tool: 'pick' });
def(B.PANEL, 'Bílý panel', T.PANEL, T.PANEL, T.PANEL, { hard: 1.8, tool: 'pick' });
def(B.SIDEWALK, 'Chodník', T.SIDEWALK, T.SIDEWALK, T.SIDEWALK, { hard: 2, tool: 'pick' });
def(B.BELL, 'Zvon', T.GOLD_BLOCK, T.GOLD_BLOCK, T.GOLD_BLOCK, { custom: 'bell', occ: false, hard: 3, tool: 'pick' });
/* rampy (šikmé bloky pro auta a pěší): směr 0 = +x nahoru, 1 = +z, 2 = -x, 3 = -z */
const RAMP_IDS = [[185, 186, 187, 188], [178, 179, 109, 122]], RAMP_NAMES = ['Asfaltová rampa', 'Betonová rampa'], RAMP_MATS = [B.ASPHALT, B.CONCRETE];
const RAMP_OF = new Map();
RAMP_IDS.forEach((arr, k) => arr.forEach((id, d) => { RAMP_OF.set(id, [k, d]); const b = BL[RAMP_MATS[k]]; def(id, RAMP_NAMES[k], b.top, b.bot, b.side, { custom: 'ramp', occ: false, hard: b.hard, tool: 'pick' }); }));
W.RAMP_IDS = RAMP_IDS;
W.isRamp = (id) => RAMP_OF.has(id);
W.rampDir = (id) => RAMP_OF.get(id)[1];
W.rampBase = (id) => RAMP_IDS[RAMP_OF.get(id)[0]][0];
W.rampH = (d, lx, lz) => d === 0 ? lx : d === 1 ? lz : d === 2 ? 1 - lx : 1 - lz;
W.NB = new Set([B.BELL, B.ASPHALT, B.LINE_X, B.LINE_Z, B.CONCRETE, B.CONCRETE_D, B.MGLASS, B.STEEL, B.PANEL, B.SIDEWALK, ...RAMP_OF.keys()]);
W.isNB = (id) => W.NB.has(id);
def(B.PATH, 'Cesta', T.PATH_TOP, T.DIRT, T.DIRT, { hard: .5 });
def(B.FARM, 'Pole', T.FARM_TOP, T.DIRT, T.DIRT, { hard: .5 });
def(B.WHEAT, 'Pšenice', T.WHEAT, T.WHEAT, T.WHEAT, { solid: false, occ: false, cross: true, hard: 0 });
const D = (id, name, t, o) => def(id, name, t, t, t, o);
for (let ax = 0; ax < 2; ax++) for (let top = 0; top < 2; top++) for (let op = 0; op < 2; op++) {
  const id = 28 + op * 4 + ax * 2 + top;
  def(id, 'Dveře', top ? T.DOOR_UP : T.DOOR_LOW, top ? T.DOOR_UP : T.DOOR_LOW, top ? T.DOOR_UP : T.DOOR_LOW, { custom: 'door', occ: false, solid: !op, hard: 1.5 });
}
for (let d = 0; d < 4; d++) {
  def(36 + d, 'Postel', T.BED_FOOT, T.PLANKS, T.BED_SIDE, { custom: 'bed', occ: false, hard: .3, hgt: .5625 });
  def(40 + d, 'Postel', T.BED_HEAD, T.PLANKS, T.BED_SIDE, { custom: 'bed', occ: false, hard: .3, hgt: .5625 });
  def(44 + d, 'Truhla', T.CHEST_TOP, T.CHEST_TOP, T.CHEST_SIDE, { custom: 'chest', occ: false, hard: 1.8, hgt: .875 });
  def(48 + d, 'Žebřík', T.LADDER, T.LADDER, T.LADDER, { custom: 'ladder', occ: false, solid: false, hard: .4 });
}
def(B.SLAB_P, 'Dřevěná deska', T.PLANKS, T.PLANKS, T.PLANKS, { custom: 'slab', occ: false, hard: 1.5, hgt: .5 });
def(B.SLAB_C, 'Kamenná deska', T.COBBLE, T.COBBLE, T.COBBLE, { custom: 'slab', occ: false, hard: 2.4, hgt: .5, tool: 'pick' });
def(B.WOOL, 'Vlna', T.WOOL, T.WOOL, T.WOOL, { hard: .4 });
def(B.HAY, 'Balík sena', T.HAY_TOP, T.HAY_TOP, T.HAY_SIDE, { hard: .4 });
for (let n = 1; n <= 7; n++) def(55 + n, 'Voda', T.WATER, T.WATER, T.WATER, { solid: false, occ: false, trans: true, target: false, hard: 99 });
for (let n = 1; n <= 3; n++) def(62 + n, 'Láva', T.LAVA, T.LAVA, T.LAVA, { solid: false, occ: false, emit: 14, target: false, hard: 99 });
def(B.OBSIDIAN, 'Obsidián', T.OBSIDIAN, T.OBSIDIAN, T.OBSIDIAN, { hard: 9, tool: 'pick' });
const SD = (id, name, t, hard) => def(id, name, t, t, t, { hard, tool: 'pick' });
SD(B.GRANITE, 'Žula', T.GRANITE, 2.4); SD(B.DIORITE, 'Diorit', T.DIORITE, 2.4); SD(B.ANDESITE, 'Andezit', T.ANDESITE, 2.4);
SD(B.DEEPSLATE, 'Břidlice', T.DEEPSLATE, 3.2); SD(B.GOLD_ORE, 'Zlatá ruda', T.GOLD_ORE, 4); SD(B.DIAMOND_ORE, 'Diamantová ruda', T.DIAMOND_ORE, 5); SD(B.STONE_BRICKS, 'Kamenné cihly', T.STONE_BRICKS, 2.4);
def(B.IRON_BLOCK, 'Železný blok', T.IRON_BLOCK, T.IRON_BLOCK, T.IRON_BLOCK, { hard: 5, tool: 'pick' });
def(B.GOLD_BLOCK, 'Zlatý blok', T.GOLD_BLOCK, T.GOLD_BLOCK, T.GOLD_BLOCK, { hard: 4, tool: 'pick' });
def(B.DIAMOND_BLOCK, 'Diamantový blok', T.DIAMOND_BLOCK, T.DIAMOND_BLOCK, T.DIAMOND_BLOCK, { hard: 5, tool: 'pick' });
def(B.EMERALD_BLOCK, 'Smaragdový blok', T.EMERALD_BLOCK, T.EMERALD_BLOCK, T.EMERALD_BLOCK, { hard: 5, tool: 'pick' });
def(B.RAIL, 'Kolej', T.RAIL_S, T.RAIL_S, T.RAIL_S, { custom: 'rail', occ: false, solid: false, hard: .3, flat: true });
def(B.DUST_OFF, 'Redstone', T.DUST, T.DUST, T.DUST, { custom: 'dust', occ: false, solid: false, hard: 0, flat: true });
def(B.DUST_ON, 'Redstone', T.DUST, T.DUST, T.DUST, { custom: 'dust', occ: false, solid: false, hard: 0, flat: true });
def(B.RS_BLOCK, 'Redstonový blok', T.RS_BLOCK, T.RS_BLOCK, T.RS_BLOCK, { hard: 3, tool: 'pick' });
def(B.LAMP_OFF, 'Redstonová lampa', T.LAMP_OFF, T.LAMP_OFF, T.LAMP_OFF, { hard: .5 });
def(B.LAMP_ON, 'Redstonová lampa', T.LAMP_ON, T.LAMP_ON, T.LAMP_ON, { hard: .5, emit: 15 });
def(B.RS_ORE, 'Redstonová ruda', T.RS_ORE, T.RS_ORE, T.RS_ORE, { hard: 4, tool: 'pick' });
for (let k = 0; k < 10; k++) def(87 + k, 'Páčka', T.LEVER, T.LEVER, T.LEVER, { custom: 'lever', occ: false, solid: false, hard: .2, flat: true });
def(B.FENCE, 'Plot', T.PLANKS, T.PLANKS, T.PLANKS, { custom: 'fence', occ: false, hard: 1.5, tool: 'axe' });
def(B.FURN, 'Nábytek', 120, 120, 120, { trans: true, occ: false, hard: 1.2, tool: 'axe' }); // neviditelná kolize, model kreslí furniture.js
def(B.TNT, 'TNT', T.TNT_TOP, T.TNT_TOP, T.TNT_SIDE, { hard: 0 });
def(B.PUMPKIN, 'Dýně', T.PUMPKIN_TOP, T.PUMPKIN_TOP, T.PUMPKIN_SIDE, { hard: 1 });
def(B.FURNACE, 'Pec', T.FURNACE_TOP, T.FURNACE_TOP, T.FURNACE_FRONT, { hard: 3.5, tool: 'pick' });
for (const id of [B.PUMPKIN]) BL[id].tool = 'axe';
for (const id of [B.LOG, B.PLANKS, B.SLAB_P, 44, 45, 46, 47, 48, 49, 50, 51, 28, 29, 30, 31, 32, 33, 34, 35]) BL[id].tool = 'axe';
for (const id of [B.GRASS, B.DIRT, B.SAND, B.GRAVEL, B.SNOW, B.PATH, B.FARM]) BL[id].tool = 'shovel';
W.isWater = (id) => id === 9 || (id >= 56 && id <= 62);
W.isLava = (id) => id === 22 || (id >= 63 && id <= 65);
W.levelOf = (id) => id === 9 || id === 22 ? 0 : id >= 63 ? id - 62 : id - 55;
W.BL = BL;
/* ---------- schody: 6 materiálů × 4 směry (id 210–233; směr = strana, kam schody stoupají) ---------- */
const STAIR0 = 224, STAIR_MATS = [B.PLANKS, B.COBBLE, B.STONE_BRICKS, B.BRICKS, B.SANDSTONE, B.DEEPSLATE];
const STAIR_NAMES = ['Dřevěné schody', 'Kamenné schody', 'Schody z kamenných cihel', 'Cihlové schody', 'Pískovcové schody', 'Břidlicové schody'];
STAIR_MATS.forEach((m, k) => { const b = BL[m]; for (let d = 0; d < 4; d++) def(STAIR0 + k * 4 + d, STAIR_NAMES[k], b.top, b.bot, b.side, { custom: 'stair', occ: false, hard: b.hard, tool: b.tool }); });
W.STAIR0 = STAIR0; W.STAIR_MATS = STAIR_MATS;
W.isStair = (id) => id >= STAIR0 && id < STAIR0 + 24;
W.stairDir = (id) => (id - STAIR0) & 3;
W.stairBase = (id) => STAIR0 + (((id - STAIR0) >> 2) << 2);
W.stairMat = (id) => STAIR_MATS[(id - STAIR0) >> 2];
W.stairIdFor = (matBlock) => { const k = STAIR_MATS.indexOf(matBlock); return k < 0 ? STAIR0 + 8 : STAIR0 + k * 4; };
/** hrany bloku schodů v lokálních souřadnicích: [[x0,y0,z0,x1,y1,z1], ...] */
const DV4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
/** boxy schodů podle sousedů (rohové schody): nb(dx,dz) vrací id sousedního bloku ve stejné výšce */
W.stairBoxesAt = (dir, nb) => {
  const [hx, hz] = DV4[dir], low = [0, 0, 0, 1, .5, 1];
  const q = (qx, qz) => [qx * .5, .5, qz * .5, qx * .5 + .5, 1, qz * .5 + .5];
  const half = (d) => d === 0 ? [.5, .5, 0, 1, 1, 1] : d === 1 ? [0, .5, .5, 1, 1, 1] : d === 2 ? [0, .5, 0, .5, 1, 1] : [0, .5, 0, 1, 1, .5];
  let n = nb(hx, hz);
  if (W.isStair(n)) { const d2 = W.stairDir(n); if ((d2 & 1) !== (dir & 1)) { // vnější roh
    const qx = dir === 0 ? 1 : dir === 2 ? 0 : (d2 === 0 ? 1 : 0), qz = dir === 1 ? 1 : dir === 3 ? 0 : (d2 === 1 ? 1 : 0);
    return [low, q(qx, qz)];
  } }
  n = nb(-hx, -hz);
  if (W.isStair(n)) { const d2 = W.stairDir(n); if ((d2 & 1) !== (dir & 1)) { // vnitřní roh
    let qx, qz;
    if (dir === 0 || dir === 2) { qx = dir === 0 ? 0 : 1; qz = d2 === 1 ? 1 : 0; } else { qz = dir === 1 ? 0 : 1; qx = d2 === 0 ? 1 : 0; }
    return [low, half(dir), q(qx, qz)];
  } }
  return [low, half(dir)];
};
W.stairBoxes = (dir) => [[0, 0, 0, 1, .5, 1], dir === 0 ? [.5, .5, 0, 1, 1, 1] : dir === 1 ? [0, .5, .5, 1, 1, 1] : dir === 2 ? [0, .5, 0, .5, 1, 1] : [0, .5, 0, 1, 1, .5]];
const HGT = new Float32Array(256).fill(1);
for (let i = 0; i < 256; i++) if (BL[i] && BL[i].hgt) HGT[i] = BL[i].hgt;
W.HGT = HGT;
W.isDoor = (id) => id >= 28 && id <= 35;
W.isBed = (id) => id >= 36 && id <= 43;
W.isChest = (id) => id >= 44 && id <= 47;
W.isLadder = (id) => id >= 48 && id <= 51;

// rychlé tabulky
const SOLID = new Uint8Array(256), OCC = new Uint8Array(256), EMIT = new Uint8Array(256);
for (let i = 0; i < 256; i++) if (BL[i]) { SOLID[i] = BL[i].solid ? 1 : 0; OCC[i] = BL[i].occ ? 1 : 0; EMIT[i] = BL[i].emit; }
W.SOLID = SOLID; W.OCC = OCC; W.EMIT = EMIT;

/* ---------- náhodná čísla a šum ---------- */
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
W.mulberry = mulberry;
function hash3(x, y, z, s) {
  let h = (s | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
W.hash3 = hash3;

class Noise {
  constructor(seed) {
    const r = mulberry(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  n2(x, y) {
    const p = this.p;
    const X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y;
    const xi = X & 255, yi = Y & 255;
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
    const a = p[xi] + yi, b = p[xi + 1] + yi;
    return lerp(v,
      lerp(u, g2(p[a], x, y), g2(p[b], x - 1, y)),
      lerp(u, g2(p[a + 1], x, y - 1), g2(p[b + 1], x - 1, y - 1)));
  }
  n3(x, y, z) {
    const p = this.p;
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z;
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10), w = z * z * z * (z * (z * 6 - 15) + 10);
    const A = p[xi] + yi, AA = p[A] + zi, AB = p[A + 1] + zi, Bb = p[xi + 1] + yi, BA = p[Bb] + zi, BB = p[Bb + 1] + zi;
    return lerp(w,
      lerp(v, lerp(u, g3(p[AA], x, y, z), g3(p[BA], x - 1, y, z)), lerp(u, g3(p[AB], x, y - 1, z), g3(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, g3(p[AA + 1], x, y, z - 1), g3(p[BA + 1], x - 1, y, z - 1)), lerp(u, g3(p[AB + 1], x, y - 1, z - 1), g3(p[BB + 1], x - 1, y - 1, z - 1))));
  }
}
function lerp(t, a, b) { return a + t * (b - a); }
const G2 = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
function g2(h, x, y) { const i = (h & 7) * 2; return G2[i] * x + G2[i + 1] * y; }
function g3(h, x, y, z) {
  h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function fbm2(n, x, y, oct) {
  let a = 1, f = 1, s = 0, t = 0;
  for (let i = 0; i < oct; i++) { s += n.n2(x * f, y * f) * a; t += a; a *= .5; f *= 2; }
  return s / t;
}

/* ---------- inicializace světa ---------- */
let seed = 1, nCont, nEro, nPv, nRidge, nTemp, nHum, nC1, nC2, nC3, nRiv, SEED_TREE = 7;
W.init = function (s) {
  seed = s | 0;
  const r = mulberry(seed);
  const mk = () => new Noise((r() * 4294967296) | 0);
  nCont = mk(); nEro = mk(); nPv = mk(); nRidge = mk(); nTemp = mk(); nHum = mk(); nC1 = mk(); nC2 = mk(); nC3 = mk(); nRiv = mk();
  villageCache.clear(); ROAD_PROF.clear();
};
W.getSeed = () => seed;

/* biomy */
const BI = { OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, SNOW: 5, MOUNTAIN: 6 };
W.BI = BI;

/* vrací (výška << 4) | biom */
function terrain(x, z) {
  const cont = fbm2(nCont, x / 700, z / 700, 3) * 1.5;
  const ero = Math.min(1, Math.max(0, fbm2(nEro, x / 400, z / 400, 2) * 1.6 + .5));
  const pv = fbm2(nPv, x / 80, z / 80, 4);
  const rid = 1 - Math.abs(fbm2(nRidge, x / 260, z / 260, 3) * 1.8);
  const mk = Math.min(1, Math.max(0, (cont - .12) / .3));
  const mount = mk * mk * (rid > 0 ? rid * rid : 0) * 52 * (.45 + ero * .55);
  let base = (cont < 0 ? 37 + cont * 42 : 37 + cont * 26) + OFF;
  let h = base + pv * (3 + 9 * ero) * (cont < -.05 ? .4 : 1) + mount;
  // řeky: úzké koryto podél nuly šumu, v horách se ztrácí
  if (h > SEA - 2 && cont > -.02) {
    const rv = Math.abs(fbm2(nRiv, x / 300, z / 300, 2));
    if (rv < .022) {
      let rf = 1 - rv / .022;
      rf *= Math.min(1, Math.max(0, 1 - (h - SEA - 5) / 16));
      const t = Math.min(1, rf / .6), k = t * t * (3 - 2 * t);
      h = h * (1 - k) + (SEA - 2) * k;
    }
  }
  h = Math.round(h);
  if (h < 3) h = 3; if (h > H - 10) h = H - 10;
  const temp = fbm2(nTemp, x / 500, z / 500, 2) * 1.8;
  const hum = fbm2(nHum, x / 420, z / 420, 2) * 1.8;
  let b;
  if (h <= SEA) b = BI.OCEAN;
  else if (h <= SEA + 2 && cont < .12) b = BI.BEACH;
  else if (h > 66 + OFF) b = BI.MOUNTAIN;
  else if (temp > .2 && hum < .15) b = BI.DESERT;
  else if (temp < -.22) b = BI.SNOW;
  else if (hum > .02) b = BI.FOREST;
  else b = BI.PLAINS;
  return (h << 4) | b;
}
W.terrain = (x, z) => terrain(x, z);
W.heightAt = (x, z) => terrain(x, z) >> 4;

/* ---------- vesnice ---------- */
const REG = 192;
const villageCache = new Map();
W.REG = REG;

function getVillage(rx, rz) {
  const key = rx + ',' + rz;
  if (villageCache.has(key)) return villageCache.get(key);
  let v = null;
  const rnd = mulberry(Math.imul(rx, 73856093) ^ Math.imul(rz, 19349663) ^ seed ^ 0x5bd1e995);
  if (rnd() < .88) {
    for (let at = 0; at < 8 && !v; at++) {
      const vx = rx * REG + 56 + Math.floor(rnd() * (REG - 112));
      const vz = rz * REG + 56 + Math.floor(rnd() * (REG - 112));
      const t = terrain(vx, vz), h = t >> 4, bi = t & 15;
      if (h <= SEA + 2) continue;
      if (bi !== BI.PLAINS && bi !== BI.DESERT && bi !== BI.SNOW && bi !== BI.FOREST) continue;
      let mn = h, mx = h, bad = false;
      for (const [dx, dz] of [[20, 0], [-20, 0], [0, 20], [0, -20], [14, 14], [-14, -14], [14, -14], [-14, 14]]) {
        const hh = terrain(vx + dx, vz + dz) >> 4;
        if (hh <= SEA + 1) bad = true;
        mn = Math.min(mn, hh); mx = Math.max(mx, hh);
      }
      if (bad || mx - mn > 9) continue;
      if (hash3(vx, 7, vz, seed ^ 0x7041) < .45 && townFlat(vx, vz)) v = buildTownPlan(vx, vz, h, bi, mulberry(Math.imul(vx, 2654435761) ^ Math.imul(vz, 40503) ^ seed));
      else v = buildVillagePlan(vx, vz, h, bi, rnd);
    }
  }
  villageCache.set(key, v);
  return v;
}
W.getVillage = getVillage;

/* ---------- města: pravidelná síť ulic, náměstí, různé druhy domů ---------- */
const TOWN_S = [-36, -18, 0, 18, 36], TOWN_RL = 54;
function townFlat(vx, vz) {
  const h0 = terrain(vx, vz) >> 4;
  let mn = h0, mx = h0;
  for (let dx = -50; dx <= 50; dx += 25) for (let dz = -50; dz <= 50; dz += 25) {
    const t = terrain(vx + dx, vz + dz), h = t >> 4, bi = t & 15;
    if (h <= SEA || bi === BI.MOUNTAIN) return false;
    mn = Math.min(mn, h); mx = Math.max(mx, h);
  }
  return mx - mn <= 10;
}
function lotBuild(v, rects, rnd, type, ox, oz) {
  const vx = v.x, vz = v.z, gy0 = v.gy;
  const cx = vx + ox, cz = vz + oz;
  let door;
  if (Math.abs(ox) >= Math.abs(oz)) door = ox > 0 ? 'W' : 'E'; else door = oz > 0 ? 'N' : 'S';
  const [sx, sz] = dimsOf(type, door, rnd);
  let x0, z0;
  if (door === 'W') { x0 = cx - 5; z0 = cz - (sz >> 1); }
  else if (door === 'E') { x0 = cx + 6 - sx; z0 = cz - (sz >> 1); }
  else if (door === 'N') { z0 = cz - 5; x0 = cx - (sx >> 1); }
  else { z0 = cz + 6 - sz; x0 = cx - (sx >> 1); }
  const h = terrain(x0 + (sx >> 1), z0 + (sz >> 1)) >> 4;
  if (h <= SEA + 1 || Math.abs(h - gy0) > 6) return null;
  let mn = h, mx = h;
  for (const [ax, az] of [[x0, z0], [x0 + sx - 1, z0], [x0, z0 + sz - 1], [x0 + sx - 1, z0 + sz - 1]]) {
    const hh = terrain(ax, az) >> 4; mn = Math.min(mn, hh); mx = Math.max(mx, hh);
  }
  if (mx - mn > 4 || mn <= SEA) return null;
  const gy = Math.max(h, mn + 1);
  const bd = { type, x0, z0, sx, sz, gy, door, town: true };
  bd.doorX = door === 'W' ? x0 : door === 'E' ? x0 + sx - 1 : x0 + (sx >> 1);
  bd.doorZ = door === 'N' ? z0 : door === 'S' ? z0 + sz - 1 : z0 + (sz >> 1);
  const fr = frameOf(bd);
  const di = fr.wv(fr.La >> 1, 1), dout = fr.wv(fr.La >> 1, -1);
  bd.out = { x: dout[0] + .5, z: dout[1] + .5 }; bd.in = { x: di[0] + .5, z: di[1] + .5 };
  bd.cx = x0 + sx / 2; bd.cz = z0 + sz / 2;
  bd.floors = type === 'large' ? 2 : type === 'tall' ? Math.max(3, Math.min(4 + Math.floor(rnd() * 3), Math.floor((H - 8 - gy) / 4))) : 1;
  if (['house', 'large', 'tall', 'station', 'clinic', 'police'].includes(type)) bd.modern = true;
  if (type === 'house' || type === 'large' || type === 'tall') { const bh = fr.wv(2, fr.Lb - 2); bd.bed = { x: bh[0] + .5, z: bh[1] + .5 }; }
  return bd;
}
function buildTownPlan(vx, vz, gy0, biome, rnd) {
  const v = { x: vx, z: vz, gy: gy0, biome, builds: [], extras: [], R: 58, town: true };
  const desert = biome === BI.DESERT, snow = biome === BI.SNOW;
  const P = (wall, corner, roof) => ({ wall, corner, floor: B.PLANKS, roof, base: B.COBBLE });
  v.pals = desert ? [P(B.SANDSTONE, B.SANDSTONE, B.SANDSTONE), P(B.SANDSTONE, B.LOG, B.PLANKS), P(B.SANDSTONE, B.STONE_BRICKS, B.BRICKS), P(B.WOOL, B.LOG, B.SANDSTONE)]
    : snow ? [P(B.PLANKS, B.LOG, B.SNOW), P(B.COBBLE, B.LOG, B.SNOW), P(B.WOOL, B.LOG, B.DEEPSLATE), P(B.STONE_BRICKS, B.LOG, B.PLANKS)]
    : [P(B.PLANKS, B.LOG, B.COBBLE), P(B.PLANKS, B.LOG, B.BRICKS), P(B.WOOL, B.LOG, B.BRICKS), P(B.WOOL, B.LOG, B.DEEPSLATE), P(B.STONE_BRICKS, B.LOG, B.PLANKS), P(B.BRICKS, B.STONE_BRICKS, B.COBBLE), P(B.PLANKS, B.LOG, B.PLANKS), P(B.COBBLE, B.LOG, B.DEEPSLATE)];
  v.pal = v.pals[0];
  const CEN = [-45, -27, -9, 9, 27, 45];
  const cells = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    if ((i === 2 || i === 3) && (j === 2 || j === 3)) continue;
    cells.push({ i, j, ox: CEN[i], oz: CEN[j], ring: Math.max(Math.abs(i - 2.5), Math.abs(j - 2.5)), near: (Math.abs(i - 2.5) <= .5 && Math.abs(j - 2.5) === 1.5) || (Math.abs(j - 2.5) <= .5 && Math.abs(i - 2.5) === 1.5) });
  }
  for (let k = cells.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [cells[k], cells[r]] = [cells[r], cells[k]]; }
  const near = cells.filter(c => c.near), far = cells.filter(c => !c.near && c.ring >= 2.5);
  const assign = new Map();
  if (near[0]) assign.set(near[0], 'church');
  if (near[1]) assign.set(near[1], 'market');
  if (near[2]) assign.set(near[2], 'tall');
  if (far[0]) assign.set(far[0], 'tower');
  if (cells.find(c => !assign.has(c) && c.ring >= 1.5)) assign.set(cells.find(c => !assign.has(c) && c.ring >= 1.5), 'smithy');
  const extra = ['playground', 'station', 'clinic', 'police', 'playground'];
  for (const t of extra) { const c = cells.find(c => !assign.has(c) && c.ring >= 1.5); if (c) assign.set(c, t); }
  let farms = 0, pens = 0;
  const rects = [];
  for (const c of cells) {
    let type = assign.get(c);
    if (!type) {
      const r = rnd();
      if (c.ring >= 2.5 && r < .22 && farms < 3) { type = 'farm'; farms++; }
      else if (c.ring >= 2.5 && r < .34 && pens < 2) { type = 'pen'; pens++; }
      else type = r < .40 ? 'house' : r < .62 ? 'large' : r < .82 ? 'tall' : r < .92 ? 'garden' : 'house';
    }
    const bd = lotBuild(v, rects, rnd, type, c.ox, c.oz);
    if (!bd) continue;
    bd.pal = v.pals[Math.floor(rnd() * v.pals.length)];
    if (type === 'church') bd.pal = v.pals[0];
    if (type === 'station') bd.pal = P(B.BRICKS, B.STONE_BRICKS, B.DEEPSLATE);
    if (type === 'clinic') bd.pal = P(B.WOOL, B.STONE_BRICKS, B.BRICKS);
    if (type === 'police') bd.pal = P(B.STONE_BRICKS, B.LOG, B.DEEPSLATE);
    { const MODS = [{ wall: B.PANEL, corner: B.CONCRETE_D, roof: B.CONCRETE_D }, { wall: B.CONCRETE, corner: B.STEEL, roof: B.CONCRETE_D }, { wall: B.CONCRETE_D, corner: B.CONCRETE, roof: B.CONCRETE }, { wall: B.PANEL, corner: B.STEEL, roof: B.CONCRETE }];
      bd.mod = type === 'station' ? { wall: B.PANEL, corner: B.BRICKS, roof: B.CONCRETE_D } : type === 'clinic' ? { wall: B.PANEL, corner: B.CONCRETE, roof: B.CONCRETE } : type === 'police' ? { wall: B.CONCRETE_D, corner: B.STEEL, roof: B.CONCRETE_D } : MODS[Math.floor(rnd() * 4)]; }
    v.builds.push(bd);
  }
  v.builds.sort((a, b) => (a.cx - vx) ** 2 + (a.cz - vz) ** 2 - (b.cx - vx) ** 2 - (b.cz - vz) ** 2);
  v.lamps = [[4, 3], [-4, -3], [-3, 4], [3, -4]];
  return v;
}

const TYPE_SEQ = ['house', 'garden', 'farm', 'large', 'smithy', 'garden', 'pen', 'church', 'house', 'market', 'garden', 'large', 'tower', 'house', 'garden', 'farm', 'house', 'garden', 'large', 'garden'];
function dirOf(dx, dz) { return dx === 1 ? 0 : dz === 1 ? 1 : dx === -1 ? 2 : 3; }
/* lokální souřadnice budovy: a = do strany, b = hloubka od dveří */
function frameOf(bd) {
  const { x0, z0, sx, sz, door } = bd;
  const NS = door === 'N' || door === 'S';
  const La = NS ? sx : sz, Lb = NS ? sz : sx;
  const wv = (a, b) => door === 'N' ? [x0 + a, z0 + b] : door === 'S' ? [x0 + a, z0 + sz - 1 - b] : door === 'W' ? [x0 + b, z0 + a] : [x0 + sx - 1 - b, z0 + a];
  const p0 = wv(0, 0), pa = wv(1, 0), pb = wv(0, 1);
  return { La, Lb, wv, dirA: dirOf(pa[0] - p0[0], pa[1] - p0[1]), dirB: dirOf(pb[0] - p0[0], pb[1] - p0[1]) };
}
W.frameOf = frameOf;
/* rozměry podle typu a směru dveří */
function dimsOf(type, door, rnd) {
  const NS = door === 'N' || door === 'S';
  const fix = (La, Lb) => NS ? [La, Lb] : [Lb, La];
  if (type === 'house') return [5 + 2 * Math.floor(rnd() * 2), 5 + 2 * Math.floor(rnd() * 2)];
  if (type === 'large') return [7, 7 + 2 * Math.floor(rnd() * 2)];
  if (type === 'tall') return [7, 7];
  if (type === 'station') return [9, 7];
  if (type === 'clinic') return [7, 9];
  if (type === 'police') return [7, 7];
  if (type === 'playground') return fix(11, 9);
  if (type === 'farm') { const a = rnd() < .5 ? 9 : 7; return [a, a === 9 ? 7 : 9]; }
  if (type === 'smithy') return [7, 7];
  if (type === 'pen') return [9, 7];
  if (type === 'church') return fix(7, 11);
  if (type === 'market') return fix(11, 5);
  if (type === 'tower') return [5, 5];
  return rnd() < .5 ? [7, 7] : [9, 9]; // garden
}

const rectOf = (bd) => ({ x0: bd.x0 - 2, z0: bd.z0 - 2, x1: bd.x0 + bd.sx + 1, z1: bd.z0 + bd.sz + 1 });
function tryBuild(v, rects, rnd, type, dmin, dmax) {
  const vx = v.x, vz = v.z, gy0 = v.gy;
  const ang = rnd() * Math.PI * 2, dist = dmin + rnd() * (dmax - dmin);
  const dx = Math.round(Math.cos(ang) * dist), dz = Math.round(Math.sin(ang) * dist);
  let door;
  if (Math.abs(dz) < Math.abs(dx)) door = dz > 0 ? 'N' : 'S'; else door = dx > 0 ? 'W' : 'E';
  const [sx, sz] = dimsOf(type, door, rnd);
  const x0 = vx + dx - (sx >> 1), z0 = vz + dz - (sz >> 1);
  const rc = { x0: x0 - 2, z0: z0 - 2, x1: x0 + sx + 1, z1: z0 + sz + 1 };
  if (rc.x0 <= vx + 2 && rc.x1 >= vx - 2) { if (Math.abs(dz) < sz / 2 + 4) return null; }
  if (rc.z0 <= vz + 2 && rc.z1 >= vz - 2) { if (Math.abs(dx) < sx / 2 + 4) return null; }
  if (Math.abs(dx) < 8 && Math.abs(dz) < 8) return null; // náměstí
  for (const o of rects) if (rc.x0 < o.x1 && rc.x1 > o.x0 && rc.z0 < o.z1 && rc.z1 > o.z0) return null;
  const cxw = x0 + (sx >> 1), czw = z0 + (sz >> 1);
  const h = terrain(cxw, czw) >> 4;
  if (h <= SEA + 1 || Math.abs(h - gy0) > 5) return null;
  let mn = h, mx = h;
  for (const [ax, az] of [[x0, z0], [x0 + sx - 1, z0], [x0, z0 + sz - 1], [x0 + sx - 1, z0 + sz - 1]]) {
    const hh = terrain(ax, az) >> 4; mn = Math.min(mn, hh); mx = Math.max(mx, hh);
  }
  if (mx - mn > 4 || mn <= SEA) return null;
  rects.push(rc);
  const gy = Math.max(h, mn + 1);
  const bd = { type, x0, z0, sx, sz, gy, door };
  bd.doorX = door === 'W' ? x0 : door === 'E' ? x0 + sx - 1 : x0 + (sx >> 1);
  bd.doorZ = door === 'N' ? z0 : door === 'S' ? z0 + sz - 1 : z0 + (sz >> 1);
  const fr = frameOf(bd);
  const di = fr.wv(fr.La >> 1, 1), dout = fr.wv(fr.La >> 1, -1);
  bd.out = { x: dout[0] + .5, z: dout[1] + .5 }; bd.in = { x: di[0] + .5, z: di[1] + .5 };
  bd.cx = x0 + sx / 2; bd.cz = z0 + sz / 2;
  bd.floors = type === 'large' ? 2 : 1;
  if (type === 'house' || type === 'large') { const bh = fr.wv(2, fr.Lb - 2); bd.bed = { x: bh[0] + .5, z: bh[1] + .5 }; }
  return bd;
}
function buildVillagePlan(vx, vz, gy0, biome, rnd) {
  const v = { x: vx, z: vz, gy: gy0, biome, builds: [], extras: [], R: 58 };
  const desert = biome === BI.DESERT, snow = biome === BI.SNOW;
  v.pal = {
    wall: desert ? B.SANDSTONE : B.PLANKS,
    corner: desert ? B.SANDSTONE : B.LOG,
    floor: desert ? B.SANDSTONE : B.PLANKS,
    roof: desert ? B.SANDSTONE : (snow ? B.SNOW : [B.COBBLE, B.PLANKS, B.BRICKS][Math.floor(rnd() * 3)]),
    base: B.COBBLE
  };
  const rects = [];
  const want = 11 + Math.floor(rnd() * 6);
  for (let at = 0; at < 160 && v.builds.length < want; at++) {
    let type = TYPE_SEQ[v.builds.length % TYPE_SEQ.length];
    if (v.builds.length > 5 && rnd() < .25) type = rnd() < .6 ? 'house' : 'large';
    const bd = tryBuild(v, rects, rnd, type, 12, 46);
    if (bd) v.builds.push(bd);
  }
  v.lamps = [[4, 3], [-4, -3], [-3, 4], [3, -4]];
  return v;
}
/* stavitelé: nový dům a plán stavby */
W.planExtraBuild = function (v) {
  const rects = v.builds.concat(v.extras || []).map(rectOf);
  const types = ['house', 'garden', 'large', 'house', 'garden', 'large', 'garden'];
  for (let at = 0; at < 90; at++) { const bd = tryBuild(v, rects, Math.random, types[Math.floor(Math.random() * types.length)], 12, 46); if (bd) return bd; }
  return null;
};

function villageForColumn(wx, wz) { return getVillage(Math.floor(wx / REG), Math.floor(wz / REG)); }
function nearVillage(wx, wz, m) {
  const v = villageForColumn(wx, wz);
  if (!v) return false;
  return Math.abs(wx - v.x) <= v.R + m && Math.abs(wz - v.z) <= v.R + m;
}
W.nearVillage = nearVillage;
W.villagesInChunk = function (cx, cz) {
  const out = [];
  const x0 = cx * 16, z0 = cz * 16;
  const rxa = Math.floor((x0 - 60) / REG), rxb = Math.floor((x0 + 76) / REG);
  const rza = Math.floor((z0 - 60) / REG), rzb = Math.floor((z0 + 76) / REG);
  for (let rx = rxa; rx <= rxb; rx++) for (let rz = rza; rz <= rzb; rz++) {
    const v = getVillage(rx, rz);
    if (v) out.push(v);
  }
  return out;
};

/* pomocníci */
function pyramid(put, inChunk, x0, z0, x1, z1, y, mat) {
  while (x0 <= x1 && z0 <= z1) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (inChunk(x, z)) put(x, y, z, mat);
    x0++; z0++; x1--; z1--; y++;
  }
}
/* valbová střecha ze schodů: obvod = schody stoupající dovnitř, vnitřek plné bloky */
function stairRoof(put, inChunk, x0, z0, x1, z1, y, matIdx, fullRidge) {
  const solid = STAIR_MATS[matIdx], st = STAIR0 + matIdx * 4;
  while (x0 <= x1 && z0 <= z1) {
    const thin = x0 === x1 || z0 === z1;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (!inChunk(x, z)) continue;
      if (thin) { put(x, y, z, fullRidge ? solid : solid === B.PLANKS ? B.SLAB_P : B.SLAB_C); continue; }
      const ex0 = x === x0, ex1 = x === x1, ez0 = z === z0, ez1 = z === z1;
      if (ex0) put(x, y, z, st + 0);
      else if (ex1) put(x, y, z, st + 2);
      else if (ez0) put(x, y, z, st + 1);
      else if (ez1) put(x, y, z, st + 3);
      else put(x, y, z, solid);
    }
    x0++; z0++; x1--; z1--; y++;
  }
}
const roofMat = (id) => id === B.PLANKS ? 0 : id === B.COBBLE ? 1 : id === B.BRICKS ? 3 : id === B.SANDSTONE ? 4 : id === B.DEEPSLATE ? 5 : 2;
function toolkit(bd, put, inChunk) {
  const fr = frameOf(bd), gy = bd.gy;
  const P = (a, b, yy, id) => { const [x, z] = fr.wv(a, b); if (inChunk(x, z)) put(x, gy + yy, z, id); };
  const box = (a0, b0, a1, b1) => { const p = fr.wv(a0, b0), q = fr.wv(a1, b1); return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; };
  return { fr, P, box, gy };
}
const intoRoomDir = (fr) => dirOf(-(fr.wv(0, 1)[0] - fr.wv(0, 0)[0]), -(fr.wv(0, 1)[1] - fr.wv(0, 0)[1]));

function paintBuild(bd, pal, put, inChunk) {
  if (bd.pal) pal = bd.pal;
  const colH = (x, z) => terrain(x, z) >> 4;
  const { x0, z0, sx, sz, gy } = bd;
  for (let x = x0 - 1; x <= x0 + sx; x++) for (let z = z0 - 1; z <= z0 + sz; z++) {
    if (!inChunk(x, z)) continue;
    const h = colH(x, z);
    const edge = x < x0 || x >= x0 + sx || z < z0 || z >= z0 + sz;
    for (let y = gy + 1; y <= gy + Math.max(18, 4 * (bd.floors || 1) + 6); y++) put(x, y, z, B.AIR);
    if (h > gy) for (let y = gy + 1; y <= h; y++) put(x, y, z, B.AIR);
    for (let y = h; y < gy; y++) put(x, y, z, (edge ? B.DIRT : pal.base));
    if (edge) put(x, gy, z, (bd.type === 'farm' || bd.type === 'pen' || bd.type === 'market' || bd.type === 'playground') ? B.PATH : B.GRASS);
  }
  switch (bd.type) {
    case 'farm': paintFarm(bd, put, inChunk); break;
    case 'smithy': paintSmithy(bd, pal, put, inChunk); break;
    case 'pen': paintPen(bd, put, inChunk); break;
    case 'church': paintChurch(bd, pal, put, inChunk); break;
    case 'tower': paintTower(bd, pal, put, inChunk); break;
    case 'market': paintMarket(bd, pal, put, inChunk); break;
    case 'garden': paintGarden(bd, put, inChunk); break;
    case 'playground': paintPlayground(bd, pal, put, inChunk); break;
    default: bd.modern ? paintModern(bd, put, inChunk) : paintHouse(bd, pal, put, inChunk);
  }
}

/** pouliční lampa na vesnici: kamenný sokl, sloup, lucerna v kovové kleci a stříška */
function villageLamp(put, inChunk, x, z, h) {
  put(x, h + 1, z, B.COBBLE);
  for (let y = h + 2; y <= h + 4; y++) put(x, y, z, B.FENCE);
  put(x, h + 5, z, B.GLOWSTONE);
  put(x, h + 6, z, B.SLAB_C);
}
/* vykreslení vesnice do chunku; put(wx,wy,wz,id) ignoruje souřadnice mimo chunk */
function paintVillage(v, x0c, z0c, put, inChunk, full) {
  const pal = v.pal;
  const colH = (x, z) => terrain(x, z) >> 4;
  const RL = 52;
  if (v.town) paintTownGround(v, x0c, z0c, put, inChunk, full);
  if (!v.town) for (let x = v.x - RL; x <= v.x + RL; x++) for (let dz = -1; dz <= 0; dz++) pathAt(x, v.z + dz);
  if (!v.town) for (let z = v.z - RL; z <= v.z + RL; z++) for (let dx = -1; dx <= 0; dx++) pathAt(v.x + dx, z);
  function pathAt(x, z) {
    if (!inChunk(x, z)) return;
    const h = colH(x, z);
    if (h <= SEA) return;
    put(x, h, z, B.PATH); put(x, h + 1, z, B.AIR);
  }
  // náměstí kolem studny
  if (!v.town) for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) continue;
    if (dx === -1 || dx === 0 || dz === -1 || dz === 0) continue;
    const x = v.x + dx, z = v.z + dz;
    if (!inChunk(x, z)) continue;
    const h = colH(x, z); if (h <= SEA) continue;
    put(x, h, z, hash3(x, 3, z, seed + 5) < .4 ? B.COBBLE : B.STONE_BRICKS);
    for (let y = h + 1; y <= h + 4; y++) put(x, y, z, B.AIR);
    if (Math.abs(dx) === 5 && Math.abs(dz) === 3) put(x, h + 1, z, B.SLAB_P);
    if (Math.abs(dz) === 5 && Math.abs(dx) === 3) put(x, h + 1, z, B.SLAB_P);
    if (Math.abs(dx) === 5 && Math.abs(dz) === 5) { put(x, h + 1, z, B.FENCE); put(x, h + 2, z, B.FENCE); put(x, h + 3, z, B.TORCH); }
  }
  { // studna
    const gy = v.gy;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const x = v.x + dx, z = v.z + dz;
      if (!inChunk(x, z)) continue;
      const h = colH(x, z);
      for (let y = h + 1; y <= gy + 7; y++) put(x, y, z, B.AIR);
      for (let y = Math.min(h, gy) + 1; y < gy; y++) put(x, y, z, B.COBBLE);
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) {
        if (dx === 0 && dz === 0) { put(x, gy, z, B.WATER); put(x, gy - 1, z, B.WATER); }
        else { put(x, gy, z, B.COBBLE); put(x, gy + 1, z, B.COBBLE); }
      } else put(x, gy, z, B.PATH);
    }
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = v.x + dx, z = v.z + dz;
      if (!inChunk(x, z)) continue;
      put(x, gy + 2, z, B.LOG); put(x, gy + 3, z, B.LOG);
    }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const x = v.x + dx, z = v.z + dz; if (inChunk(x, z)) put(x, gy + 4, z, B.SLAB_P); }
    if (inChunk(v.x, v.z)) { put(v.x, gy + 3, v.z, B.BELL); put(v.x, gy + 5, v.z, B.TORCH); }
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (inChunk(v.x + dx, v.z + dz)) put(v.x + dx, gy + 4, v.z + dz, B.PLANKS);
  }
  // lampy podél cest
  if (!v.town) for (const t of [9, 18, 27, 36, 45]) {
    for (const [lx, lz] of [[v.x + t, v.z - 2], [v.x - t, v.z + 1], [v.x - 2, v.z + t], [v.x + 1, v.z - t]]) {
      if (!inChunk(lx, lz)) continue;
      const h = colH(lx, lz); if (h <= SEA) continue;
      villageLamp(put, inChunk, lx, lz, h);
    }
  }
  for (const [dx, dz] of v.lamps) {
    const x = v.x + dx, z = v.z + dz;
    if (!inChunk(x, z)) continue;
    const h = colH(x, z);
    villageLamp(put, inChunk, x, z, h);
  }
  for (const bd of v.builds) paintBuild(bd, pal, put, inChunk);
}
/* ulice, chodníky, náměstí, lampy a stromy ve městě */
function paintTownGround(v, x0c, z0c, put, inChunk, full) {
  const colH = (x, z) => terrain(x, z) >> 4;
  const ax = full ? v.x - 58 : x0c, bx = full ? v.x + 58 : x0c + 15, az = full ? v.z - 58 : z0c, bz = full ? v.z + 58 : z0c + 15;
  const near = (r) => Math.max(-36, Math.min(36, Math.round(r / 18) * 18));
  for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) {
    const rx = x - v.x, rz = z - v.z;
    if (Math.abs(rx) > TOWN_RL + 2 || Math.abs(rz) > TOWN_RL + 2) continue;
    const h = colH(x, z);
    const dz = Math.abs(rz - near(rz)), dx = Math.abs(rx - near(rx));
    const inX = Math.abs(rx) <= TOWN_RL, inZ = Math.abs(rz) <= TOWN_RL;
    const xRoad = dz <= 1 && inX, zRoad = dx <= 1 && inZ;
    if (h <= SEA) { // řeka v ulici → moderní most
      if (!((dz <= 2 && inX) || (dx <= 2 && inZ))) continue;
      const alongX = dz <= 2 && inX;
      let hL = 0, hR = 0;
      for (let k = 1; k <= 48 && !(hL && hR); k++) {
        if (!hL) { const q = alongX ? colH(x - k, z) : colH(x, z - k); if (q > SEA) hL = q; }
        if (!hR) { const q = alongX ? colH(x + k, z) : colH(x, z + k); if (q > SEA) hR = q; }
      }
      const deck = Math.max(SEA + 1, hL && hR ? Math.round((hL + hR) / 2) : (hL || hR || SEA + 1));
      const side = alongX ? dz : dx, ai = alongX ? rx : rz;
      if (side <= 1) {
        const line = side === 0 && !(alongX ? zRoad : xRoad);
        put(x, deck, z, line ? (alongX ? B.LINE_X : B.LINE_Z) : B.ASPHALT);
        if (side === 0 && ((ai % 6) + 6) % 6 === 0) for (let y = h; y < deck; y++) put(x, y, z, B.CONCRETE_D);
        for (let y = deck + 1; y <= deck + 5; y++) put(x, y, z, B.AIR);
      } else { put(x, deck, z, B.STEEL); put(x, deck + 1, z, B.FENCE); for (let y = deck + 2; y <= deck + 5; y++) put(x, y, z, B.AIR); }
      continue;
    }
    let mat = 0;
    if (xRoad || zRoad) {
      mat = B.ASPHALT;
      if (dz === 0 && inX && !zRoad) mat = B.LINE_X; else if (dx === 0 && inZ && !xRoad) mat = B.LINE_Z;
    } else if ((dz === 2 && inX) || (dx === 2 && inZ)) mat = B.SIDEWALK;
    if (Math.abs(rx) <= 14 && Math.abs(rz) <= 14) mat = ((x >> 1) + (z >> 1)) & 1 ? B.SIDEWALK : B.CONCRETE;
    if (!mat) continue;
    put(x, h, z, mat);
    for (let y = h + 1; y <= h + 5; y++) put(x, y, z, B.AIR);
  }
  const lamp = (x, z) => { if (!inChunk(x, z)) return; const h = colH(x, z); if (h <= SEA) return; for (let y = h + 1; y <= h + 3; y++) put(x, y, z, B.STEEL); put(x, h + 4, z, B.GLOWSTONE); };
  // lampy na rozích křižovatek
  for (const sx of TOWN_S) for (const sz of TOWN_S) {
    if (Math.abs(sx) <= 18 && Math.abs(sz) <= 18) { if (Math.abs(sx) <= 18 && Math.abs(sz) <= 18 && !(Math.abs(sx) === 18 && Math.abs(sz) === 18)) continue; }
    for (const [ox, oz] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) lamp(v.x + sx + ox, v.z + sz + oz);
  }
  // náměstí: lampy, záhony a stromy
  for (const [ox, oz] of [[13, 0], [-13, 0], [0, 13], [0, -13], [13, 13], [-13, 13], [13, -13], [-13, -13]]) lamp(v.x + ox, v.z + oz);
  for (const sgx of [-1, 1]) for (const sgz of [-1, 1]) {
    const cx = v.x + sgx * 10, cz = v.z + sgz * 10;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const x = cx + dx, z = cz + dz;
      if (!inChunk(x, z)) continue;
      const h = colH(x, z); if (h <= SEA) continue;
      const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      put(x, h, z, edge ? B.CONCRETE_D : B.GRASS);
      put(x, h + 1, z, edge ? B.SLAB_C : ((dx + dz) & 1 ? B.FLOWER_R : B.FLOWER_Y));
    }
    const h = colH(cx, cz);
    if (h > SEA) {
      for (let y = 1; y <= 4; y++) if (inChunk(cx, cz)) put(cx, h + y, cz, B.LOG);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 6; dy++) {
        const r = Math.abs(dx) + Math.abs(dz) + (dy - 3) * 1;
        if (r > 3 + (dy === 6 ? -2 : 0)) continue;
        if (dx === 0 && dz === 0 && dy < 5) continue;
        if (inChunk(cx + dx, cz + dz)) put(cx + dx, h + dy + 1, cz + dz, B.LEAVES);
      }
    }
  }
  // lavičky u ulic: schody otočené k chodníku, vždy v polovině bloku mezi křižovatkami
  for (const s of TOWN_S) for (const t of [-45, -27, 27, 45]) {
    for (const [x, z, d] of [[v.x + t + 3, v.z + s + 2, 1], [v.x + s + 2, v.z + t + 3, 0]]) {
      if (!inChunk(x, z)) continue; const h = colH(x, z); if (h <= SEA) continue;
      put(x, h + 1, z, STAIR0 + 0 * 4 + d);
    }
  }
}
/* dětské hřiště: pískové hřiště s plotem; herní prvky (nábytek) se doplní za běhu */
W.playPositions = function (bd) {
  const fr = frameOf(bd), La = fr.La, Lb = fr.Lb;
  const at = (t, a, b, r) => { const [x, z] = fr.wv(a, b); return { t, x, z, y: bd.gy + 1, r: r | 0 }; };
  return [at('swing', 2, 2, 1), at('swing', 4, 2, 1), at('slide', La - 3, 2, 2), at('seesaw', 3, Lb - 3, 0), at('sandbox', La - 3, Lb - 3, 0), at('sandbox', La - 5, Lb - 3, 0)];
};
function paintPlayground(bd, pal, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd;
  const fr = frameOf(bd), doorA = fr.La >> 1;
  for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++) {
    const x = x0 + i, z = z0 + k;
    if (!inChunk(x, z)) continue;
    const edge = i === 0 || k === 0 || i === sx - 1 || k === sz - 1;
    put(x, gy, z, edge ? B.STONE_BRICKS : ((i + k) % 5 === 0 ? B.GRASS : B.SAND));
    for (let y = gy + 1; y <= gy + 6; y++) put(x, y, z, B.AIR);
    if (edge) {
      // branka ve středu strany u ulice
      let gate = false;
      for (let a = doorA - 1; a <= doorA + 1; a++) { const [gx, gz] = fr.wv(a, 0); if (gx === x && gz === z) gate = true; }
      if (!gate) put(x, gy + 1, z, B.FENCE);
      else put(x, gy, z, B.PATH);
    }
  }
  const P = (a, b, y, id) => { const [x, z] = fr.wv(a, b); if (inChunk(x, z)) put(x, gy + y, z, id); };
  for (const [a, b] of [[1, fr.Lb - 2], [fr.La - 2, fr.Lb - 2]]) { // stromky v rozích
    for (let y = 1; y <= 3; y++) P(a, b, y, B.LOG);
    for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) { P(a + da, b + db, 4, B.LEAVES); if (!da || !db) P(a + da, b + db, 5, B.LEAVES); }
  }
  for (let a = 1; a <= fr.La - 2; a += 2) P(a, fr.Lb - 1, 2, hash3(a, bd.x0, bd.z0, seed) < .5 ? B.FLOWER_R : B.FLOWER_Y);
  P(1, 1, 1, B.STAIR0 + dirOf(1, 0)); P(1, 3, 1, B.STAIR0 + dirOf(1, 0));
}
function doorBlocks(bd, put, inChunk, x, z, y) {
  if (!inChunk(x, z)) return;
  const ax = (bd.door === 'N' || bd.door === 'S') ? 0 : 1;
  put(x, y, z, B.DOOR_B0 + ax * 2); put(x, y + 1, z, B.DOOR_T0 + ax * 2);
}
function paintFarm(bd, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd;
  const alongX = sx >= sz;
  for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++) {
    const x = x0 + i, z = z0 + k;
    if (!inChunk(x, z)) continue;
    const edge = i === 0 || k === 0 || i === sx - 1 || k === sz - 1;
    const mid = alongX ? (k === sz >> 1) : (i === sx >> 1);
    if (edge) {
      const corner = (i === 0 || i === sx - 1) && (k === 0 || k === sz - 1);
      put(x, gy, z, B.LOG);
      const gate = (x === bd.doorX && z === bd.doorZ);
      if (corner) { put(x, gy + 1, z, B.LOG); put(x, gy + 2, z, B.TORCH); }
      else if (!gate) put(x, gy + 1, z, B.FENCE);
      continue;
    }
    if (mid) { put(x, gy, z, B.WATER); continue; }
    put(x, gy, z, B.FARM); put(x, gy + 1, z, hash3(x, 5, z, seed + 77) < .025 ? B.PUMPKIN : B.WHEAT);
  }
}
function paintSmithy(bd, pal, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd;
  const { fr, P } = toolkit(bd, put, inChunk);
  for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++) {
    const x = x0 + i, z = z0 + k;
    if (!inChunk(x, z)) continue;
    put(x, gy, z, B.COBBLE);
    const edgeX = i === 0 || i === sx - 1, edgeZ = k === 0 || k === sz - 1;
    if (edgeX && edgeZ) for (let y = 1; y <= 4; y++) put(x, gy + y, z, B.LOG);
  }
  for (let a = 0; a < fr.La; a++) for (let b = 0; b < fr.Lb; b++) {
    const [x, z] = fr.wv(a, b);
    if (!inChunk(x, z)) continue;
    const back = b === fr.Lb - 1, side = (a === 0 || a === fr.La - 1);
    if (back || side) {
      const corner = (a === 0 || a === fr.La - 1) && (b === 0 || b === fr.Lb - 1);
      if (!corner) for (let y = 1; y <= 3; y++) put(x, gy + y, z, (y === 2 && !back && b > 0 && b < fr.Lb - 1 && b % 2 === 1) ? B.GLASS : B.COBBLE);
    }
  }
  stairRoof(put, inChunk, x0 - 1, z0 - 1, x0 + sx, z0 + sz, gy + 5, 1);
  P(1, fr.Lb - 2, 1, B.FURNACE); P(1, fr.Lb - 2, 2, B.COBBLE); P(1, fr.Lb - 2, 3, B.GLOWSTONE);
  P(2, fr.Lb - 2, 1, B.COBBLE); P(2, fr.Lb - 2, 2, B.SLAB_C);
  P(fr.La - 2, fr.Lb - 2, 1, B.CHEST0 + intoRoomDir(fr));
  P(1, 1, 1, B.TORCH); P(fr.La - 2, 1, 1, B.TORCH);
  P(fr.La >> 1, fr.Lb - 2, 1, B.HAY);
  // komín přes střechu
  for (let y = 1; y <= 8; y++) P(fr.La - 2, fr.Lb - 1, y, B.COBBLE);
}
function paintPen(bd, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd;
  const ax = (bd.door === 'N' || bd.door === 'S') ? 0 : 1;
  for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++) {
    const x = x0 + i, z = z0 + k;
    if (!inChunk(x, z)) continue;
    const edge = i === 0 || k === 0 || i === sx - 1 || k === sz - 1;
    put(x, gy, z, B.GRASS);
    if (edge) {
      const isDoor = (x === bd.doorX && z === bd.doorZ);
      const corner = (i === 0 || i === sx - 1) && (k === 0 || k === sz - 1);
      if (isDoor) { put(x, gy, z, B.PATH); put(x, gy + 1, z, B.DOOR_B0 + ax * 2); put(x, gy + 2, z, B.DOOR_T0 + ax * 2); }
      else { put(x, gy + 1, z, corner ? B.LOG : B.PLANKS); put(x, gy + 2, z, corner ? B.LOG : B.PLANKS); put(x, gy + 3, z, corner ? B.LOG : B.FENCE); if (corner) put(x, gy + 4, z, B.TORCH); }
    }
  }
  const fr = frameOf(bd);
  const [hx, hz] = fr.wv(1, fr.Lb - 2); if (inChunk(hx, hz)) put(hx, gy + 1, hz, B.HAY);
  const [hx2, hz2] = fr.wv(fr.La - 2, fr.Lb - 2); if (inChunk(hx2, hz2)) put(hx2, gy + 1, hz2, B.HAY);
}
function paintModern(bd, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd, m = bd.mod || { wall: B.CONCRETE, corner: B.CONCRETE_D, roof: B.CONCRETE_D };
  const fr = frameOf(bd), floors = bd.floors, wallH = 3 + 4 * (floors - 1);
  const doorI = bd.doorX - x0, doorK = bd.doorZ - z0, style = (x0 + z0 + sx) & 1;
  for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++) {
    const x = x0 + i, z = z0 + k;
    if (!inChunk(x, z)) continue;
    const edgeX = i === 0 || i === sx - 1, edgeZ = k === 0 || k === sz - 1;
    put(x, gy, z, B.CONCRETE);
    if (edgeX || edgeZ) {
      const corner = edgeX && edgeZ, isDoor = (i === doorI && k === doorK);
      const along = edgeZ ? i : k, lenA = edgeZ ? sx : sz;
      for (let y = gy + 1; y <= gy + wallH; y++) {
        if (isDoor && y <= gy + 2) continue;
        if (corner) { put(x, y, z, m.corner); continue; }
        const row = y - gy, band = row >= 2 && (row % 4 === 2 || row % 4 === 3);
        const glass = band && !isDoor && along > 0 && along < lenA - 1 && (style === 0 || along % 2 === 1);
        put(x, y, z, glass ? B.MGLASS : (row % 4 === 0 ? m.corner : m.wall));
      }
    } else {
      for (let y = gy + 1; y <= gy + wallH; y++) put(x, y, z, B.AIR);
      for (let f = 1; f < floors; f++) put(x, gy + 4 * f, z, B.CONCRETE);
    }
  }
  doorBlocks(bd, put, inChunk, bd.doorX, bd.doorZ, gy + 1);
  for (let x = x0 - 1; x <= x0 + sx; x++) for (let z = z0 - 1; z <= z0 + sz; z++) {
    if (!inChunk(x, z)) continue;
    put(x, gy + wallH + 1, z, m.roof);
    if (x === x0 - 1 || x === x0 + sx || z === z0 - 1 || z === z0 + sz) put(x, gy + wallH + 2, z, m.corner);
  }
  { // ocelový přístřešek nad dveřmi
    const o = bd.door === 'N' ? [0, -1] : bd.door === 'S' ? [0, 1] : bd.door === 'W' ? [-1, 0] : [1, 0];
    const ax = bd.doorX + o[0], az = bd.doorZ + o[1];
    if (inChunk(ax, az)) put(ax, gy + 3, az, B.STEEL);
  }
  const P = (a, b, yy, id) => { const [x, z] = fr.wv(a, b); if (inChunk(x, z)) put(x, gy + yy, z, id); };
  const intoRoom = intoRoomDir(fr), La = fr.La, Lb = fr.Lb;
  if (bd.bed) for (let fl = 0; fl < floors; fl++) {
    const yb = 1 + fl * 4;
    P(1, Lb - 2, yb, B.BED_F0 + fr.dirA); P(2, Lb - 2, yb, B.BED_H0 + fr.dirA);
    P(La - 2, Lb - 2, yb, B.CHEST0 + intoRoom);
    P(1, 1, yb, B.TORCH);
    if (fl >= 1) P(La - 2, Lb - 2, yb + 1, B.TORCH);
  }
  if (floors >= 2) { for (let yy = 1; yy <= wallH - 1; yy++) P(La - 2, 1, yy, B.LADDER0 + intoRoom); P(La - 2, 1, wallH, B.TORCH); }
  else { P(La - 2, 1, 1, B.PLANKS); P(La - 2, 1, 2, B.TORCH); }
  P(La >> 1, -1, 0, B.SIDEWALK);
  P(1, -1, 1, B.FLOWER_R); P(2, -1, 1, B.FLOWER_Y);
}
function paintHouse(bd, pal, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd;
  const fr = frameOf(bd);
  const floors = bd.floors, wallH = 3 + 4 * (floors - 1);
  const doorI = bd.doorX - x0, doorK = bd.doorZ - z0;
  for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++) {
    const x = x0 + i, z = z0 + k;
    if (!inChunk(x, z)) continue;
    const edgeX = i === 0 || i === sx - 1, edgeZ = k === 0 || k === sz - 1;
    put(x, gy, z, pal.floor);
    if (edgeX || edgeZ) {
      const corner = edgeX && edgeZ;
      const isDoor = (i === doorI && k === doorK);
      for (let y = gy + 1; y <= gy + wallH; y++) {
        if (isDoor && y <= gy + 2) continue;
        if (corner) { put(x, y, z, pal.corner); continue; }
        const row = y - gy;
        const winRow = row % 4 === 2;
        const win = winRow && !isDoor && ((edgeZ && i % 2 === 0 && i > 0 && i < sx - 1) || (edgeX && k % 2 === 0 && k > 0 && k < sz - 1));
        put(x, y, z, win ? B.GLASS : (row === 1 && pal.wall === B.PLANKS ? B.COBBLE : (floors >= 2 && row % 4 === 0 && row < wallH ? pal.corner : pal.wall)));
        if (win) { // truhlík s květinami pod oknem
          const ox = edgeX ? (i === 0 ? -1 : 1) : 0, oz = edgeZ ? (k === 0 ? -1 : 1) : 0;
          if (y === gy + 2 && !(edgeX && edgeZ)) put(x + ox, gy + 1, z + oz, (i + k) % 2 ? B.FLOWER_R : B.FLOWER_Y);
        }
      }
    } else {
      for (let y = gy + 1; y <= gy + wallH; y++) put(x, y, z, B.AIR);
      for (let f = 1; f < floors; f++) put(x, gy + 4 * f, z, pal.floor);
    }
  }
  doorBlocks(bd, put, inChunk, bd.doorX, bd.doorZ, gy + 1);
  { // stříška nad dveřmi ze schodů
    const o = bd.door === 'N' ? [0, -1] : bd.door === 'S' ? [0, 1] : bd.door === 'W' ? [-1, 0] : [1, 0];
    const ax = bd.doorX + o[0], az = bd.doorZ + o[1];
    if (inChunk(ax, az)) put(ax, gy + 3, az, STAIR0 + 0 + dirOf(-o[0], -o[1]));
  }
  stairRoof(put, inChunk, x0 - 1, z0 - 1, x0 + sx, z0 + sz, gy + wallH + 1, roofMat(pal.roof));
  const P = (a, b, yy, id) => { const [x, z] = fr.wv(a, b); if (inChunk(x, z)) put(x, gy + yy, z, id); };
  const intoRoom = intoRoomDir(fr);
  const La = fr.La, Lb = fr.Lb;
  for (let fl = 0; fl < floors; fl++) {
    const yb = 1 + fl * 4;
    P(1, Lb - 2, yb, B.BED_F0 + fr.dirA); P(2, Lb - 2, yb, B.BED_H0 + fr.dirA);
    P(La - 2, Lb - 2, yb, B.CHEST0 + intoRoom);
    P(1, 1, yb, B.TORCH);
    if (fl >= 1) P(La - 2, Lb - 2, yb + 1, B.TORCH);
  }
  if (floors >= 2) { for (let yy = 1; yy <= wallH - 1; yy++) P(La - 2, 1, yy, B.LADDER0 + intoRoom); P(La - 2, 1, wallH, B.TORCH); }
  else { P(La - 2, 1, 1, B.PLANKS); P(La - 2, 1, 2, B.TORCH); }
  // vnější výzdoba: komín, květiny, rohožka a lucerna
  for (let y = 1; y <= wallH + 3; y++) P(1, Lb, y, B.COBBLE);
  P(La >> 1, -1, 0, B.PATH);
  P(1, -1, 1, B.FLOWER_R); P(2, -1, 1, B.FLOWER_Y);
  if (La >= 5) { P(La - 2, -1, 1, B.FENCE); P(La - 2, -1, 2, B.FENCE); P(La - 2, -1, 3, B.TORCH); }
}
function paintChurch(bd, pal, put, inChunk) {
  const { x0, z0, sx, sz, gy } = bd;
  const { fr, P, box } = toolkit(bd, put, inChunk);
  const WALL = B.STONE_BRICKS, TW = 14;
  // podlaha – šachovnice, uprostřed červený koberec z cihel
  for (let a = 0; a < 7; a++) for (let b = 0; b < 11; b++) {
    const nave = b <= 6, tower = b >= 6 && a >= 1 && a <= 5;
    if (!nave && !tower) { P(a, b, 0, B.GRASS); continue; }
    P(a, b, 0, (a === 3 && b >= 1 && b <= 5) ? B.BRICKS : ((a + b) % 2 ? WALL : B.COBBLE));
  }
  // zdi lodi (výška 6) s vysokými okny a sloupy
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) {
    const edge = a === 0 || a === 6 || b === 0 || b === 6;
    if (!edge) { for (let y = 1; y <= 7; y++) P(a, b, y, B.AIR); continue; }
    const corner = (a === 0 || a === 6) && (b === 0 || b === 6);
    const pillar = !corner && (((a === 0 || a === 6) && (b === 1 || b === 3 || b === 5)) || (b === 0 && (a === 1 || a === 5)));
    for (let y = 1; y <= 6; y++) {
      const win = y >= 2 && y <= 5 && !corner && (a === 0 || a === 6) && (b === 2 || b === 4);
      P(a, b, y, (corner || pillar) ? B.LOG : win ? B.GLASS : WALL);
    }
    if (!corner && ((a === 0 || a === 6) && (b === 2 || b === 4)) ) { P(a, b, 6, WALL); P(a, b, 5, B.GLASS); } // hrotitý nadpraží
  }
  // opěrné pilíře venku (v ochranném prstenci)
  for (const b of [1, 3, 5]) for (let y = 1; y <= 4; y++) { P(-1, b, y, y === 4 ? B.SLAB_C : B.COBBLE); P(7, b, y, y === 4 ? B.SLAB_C : B.COBBLE); }
  // věž 5x5, výška 14
  for (let a = 1; a <= 5; a++) for (let b = 6; b <= 10; b++) {
    const edge = a === 1 || a === 5 || b === 10 || b === 6;
    if (!edge) { for (let y = 1; y <= TW; y++) P(a, b, y, B.AIR); continue; }
    const corner = (a === 1 || a === 5) && (b === 6 || b === 10);
    for (let y = 1; y <= TW; y++) {
      const arch = y >= 9 && y <= 12 && !corner && ((a === 3 && (b === 6 || b === 10)) || (b === 8 && (a === 1 || a === 5)));
      const slit = y >= 3 && y <= 4 && !corner && (a === 3 || b === 8);
      P(a, b, y, corner ? B.LOG : arch ? B.AIR : slit ? B.GLASS : WALL);
    }
  }
  // zavřít loď od věže jen průchodem a otevřít vnější okna zvonice
  P(3, 6, 1, B.AIR); P(3, 6, 2, B.AIR); P(3, 6, 3, B.AIR);
  for (const [a, b] of [[3, 6], [3, 10]]) for (let y = 9; y <= 12; y++) P(a, b, y, B.AIR);
  doorBlocks(bd, put, inChunk, bd.doorX, bd.doorZ, gy + 1);
  P(3, 0, 3, WALL); P(2, 0, 3, WALL); P(4, 0, 3, WALL); // nadpraží vchodu
  P(3, 0, 4, B.GLOWSTONE);
  // střecha lodi a špičatý jehlan věže se zlatým křížem
  let bx = box(0, 0, 6, 6); stairRoof(put, inChunk, bx[0] - 1, bx[1] - 1, bx[2] + 1, bx[3] + 1, gy + 7, 5, true);
  bx = box(1, 6, 5, 10);
  stairRoof(put, inChunk, bx[0] - 1, bx[1] - 1, bx[2] + 1, bx[3] + 1, gy + TW + 1, 5, true);
  // zlatý latinský kříž přímo na vrcholu věže (bez dřevěného sloupku)
  for (let y = TW + 5; y <= TW + 10; y++) P(3, 8, y, B.GOLD_BLOCK);
  P(2, 8, TW + 9, B.GOLD_BLOCK); P(4, 8, TW + 9, B.GOLD_BLOCK);
  // zvon a plošina, žebřík
  for (let a = 2; a <= 4; a++) for (let b = 7; b <= 9; b++) if (!(a === 3 && b === 9)) P(a, b, 8, B.PLANKS);
  for (let y = 1; y <= 8; y++) P(3, 9, y, B.LADDER0 + fr.dirB);
  P(3, 9, 9, B.AIR);
  for (let y = 9; y <= 13; y++) P(3, 9, y, B.LADDER0 + fr.dirB);
  for (let a = 2; a <= 4; a++) for (let b = 7; b <= 9; b++) if (!(a === 3 && b === 9)) P(a, b, 13, B.PLANKS);
  P(3, 8, 12, B.FENCE); P(3, 8, 11, B.GOLD_BLOCK); // zvon
  P(2, 8, 12, B.TORCH); P(4, 8, 12, B.TORCH);
  // loď: lavice po stranách, sloupy s pochodněmi, oltář vlevo, kazatelna vpravo
  for (const a of [1, 2, 4, 5]) for (const b of [1, 2, 3]) P(a, b, 1, B.SLAB_P);
  for (const b of [2, 4]) { P(1, b, 3, B.TORCH); P(5, b, 3, B.TORCH); }
  P(1, 5, 1, B.STONE_BRICKS); P(2, 5, 1, B.STONE_BRICKS); P(1, 5, 2, B.SLAB_C); P(2, 5, 2, B.SLAB_C);
  P(1, 4, 1, B.TORCH); P(2, 4, 1, B.TORCH);
  P(1, 5, 3, B.GOLD_BLOCK); P(1, 5, 4, B.GOLD_BLOCK); P(1, 5, 5, B.GOLD_BLOCK); P(0, 5, 4, B.GOLD_BLOCK); P(2, 5, 4, B.GOLD_BLOCK);
  P(5, 5, 1, B.CHEST0 + dirOf(-(fr.wv(0, 1)[0] - fr.wv(0, 0)[0]), -(fr.wv(0, 1)[1] - fr.wv(0, 0)[1])));
  P(5, 5, 2, B.TORCH); P(4, 5, 1, B.STONE_BRICKS); P(4, 5, 2, B.SLAB_C);
  // lustr nad uličkou
  P(3, 3, 6, B.FENCE); P(3, 3, 5, B.FENCE); P(3, 3, 4, B.GLOWSTONE);
  // schody a květiny před kostelem
  P(3, -1, 0, B.PATH); P(2, -1, 0, B.PATH); P(4, -1, 0, B.PATH);
  P(1, -1, 1, B.FLOWER_R); P(5, -1, 1, B.FLOWER_Y); P(1, -1, 0, B.GRASS);
}
function paintTower(bd, pal, put, inChunk) {
  const { fr, P } = toolkit(bd, put, inChunk);
  const WALL = B.STONE_BRICKS;
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
    const edge = a === 0 || a === 4 || b === 0 || b === 4;
    P(a, b, 0, B.COBBLE);
    if (!edge) { for (let y = 1; y <= 10; y++) P(a, b, y, B.AIR); continue; }
    const corner = (a === 0 || a === 4) && (b === 0 || b === 4);
    for (let y = 1; y <= 9; y++) {
      const slit = (y === 4 || y === 7) && !corner && (a === 2 || b === 2) && !(b === 0 && a === 2);
      P(a, b, y, corner ? B.LOG : slit ? B.GLASS : WALL);
    }
    // cimbuří
    P(a, b, 10, ((a + b) % 2 === 0) ? WALL : B.AIR);
    if (corner) { P(a, b, 10, B.FENCE); P(a, b, 11, B.TORCH); }
  }
  doorBlocks(bd, put, inChunk, bd.doorX, bd.doorZ, bd.gy + 1);
  for (let y = 1; y <= 9; y++) P(2, 3, y, B.LADDER0 + fr.dirB);
  for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) if (!(a === 2 && b === 3)) P(a, b, 9, B.PLANKS);
  P(1, 1, 1, B.TORCH); P(3, 1, 5, B.TORCH);
  P(1, 3, 10, B.CHEST0 + dirOf(-(fr.wv(0, 1)[0] - fr.wv(0, 0)[0]), -(fr.wv(0, 1)[1] - fr.wv(0, 0)[1])));
  P(2, -1, 0, B.PATH);
}
function paintMarket(bd, pal, put, inChunk) {
  const { fr, P } = toolkit(bd, put, inChunk);
  const goods = [B.CHEST0, B.HAY, B.PUMPKIN];
  for (let a = 0; a < fr.La; a++) for (let b = 0; b < fr.Lb; b++) P(a, b, 0, B.PATH);
  for (let s = 0; s < 3; s++) {
    const a0 = s * 4 - (s === 0 ? 0 : 0) + 0; // stánky 3 široké se stěnami 1 blok mezi
    const aa = [0, 4, 8][s];
    for (const [pa, pb] of [[aa, 1], [aa + 2, 1], [aa, 3], [aa + 2, 3]]) for (let y = 1; y <= 3; y++) P(pa, pb, y, B.LOG);
    for (let a = aa; a <= aa + 2; a++) for (let b = 1; b <= 3; b++) P(a, b, 4, s % 2 === 0 ? B.WOOL : B.SLAB_P);
    P(aa + 1, 1, 1, B.PLANKS); P(aa + 1, 1, 2, B.TORCH);
    P(aa + 1, 3, 1, s === 0 ? B.CHEST0 + intoRoomDir(fr) : goods[s]);
    if (s === 1) P(aa + 1, 2, 1, B.PLANKS);
  }
}
function paintGarden(bd, put, inChunk) {
  const { fr, P } = toolkit(bd, put, inChunk);
  const La = fr.La, Lb = fr.Lb, cx = La >> 1, cz = Lb >> 1, big = La >= 9;
  for (let a = 0; a < La; a++) for (let b = 0; b < Lb; b++) {
    const edge = a === 0 || a === La - 1 || b === 0 || b === Lb - 1;
    P(a, b, 0, B.GRASS);
    const gate = (a === cx && b === 0);
    if (edge) { if (!gate) P(a, b, 1, B.FENCE); continue; }
    // květinové záhony po řadách, mezi nimi trávník
    const r = hash3(bd.x0 + a * 7, 9, bd.z0 + b * 13, seed + 91);
    const row = (b % 2 === 1) && (a % 3 !== 0);
    P(a, b, 1, row ? (r < .4 ? B.FLOWER_R : r < .75 ? B.FLOWER_Y : B.TALLGRASS) : (r < .12 ? B.FLOWER_R : r < .24 ? B.FLOWER_Y : r < .4 ? B.TALLGRASS : B.AIR));
  }
  // cestička od branky k rybníčku
  for (let b = 0; b < cz - (big ? 2 : 1); b++) { P(cx, b, 0, B.PATH); P(cx, b, 1, B.AIR); }
  // rybníček
  const pr = big ? 1 : 0;
  for (let a = cx - pr; a <= cx + pr; a++) for (let b = cz - pr; b <= cz + pr; b++) { P(a, b, 0, B.WATER); P(a, b, 1, B.AIR); }
  for (let a = cx - pr - 1; a <= cx + pr + 1; a++) for (let b = cz - pr - 1; b <= cz + pr + 1; b++) {
    if (a >= cx - pr && a <= cx + pr && b >= cz - pr && b <= cz + pr) continue;
    P(a, b, 0, B.COBBLE); P(a, b, 1, B.AIR);
  }
  // lavičky
  P(cx - pr - 2, cz, 1, B.SLAB_P); P(cx + pr + 2, cz, 1, B.SLAB_P);
  P(cx - pr - 2, cz + 1, 1, B.SLAB_P); P(cx + pr + 2, cz + 1, 1, B.SLAB_P);
  // stromy v zadních rozích
  for (const a of [1, La - 2]) {
    for (let y = 1; y <= 4; y++) P(a, Lb - 2, y, B.LOG);
    for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) for (let y = 3; y <= 5; y++) { if (!(da === 0 && db === 0 && y < 5)) P(a + da, Lb - 2 + db, y, B.LEAVES); }
  }
  // živý plot a lampy
  if (big) for (let a = 3; a <= La - 4; a++) { P(a, Lb - 2, 1, B.LEAVES); P(a, Lb - 2, 2, B.LEAVES); }
  for (const a of [1, La - 2]) { for (let y = 1; y <= 3; y++) P(a, 1, y, B.FENCE); P(a, 1, 4, B.GLOWSTONE); }
}

const NOREPAIR = (id) => id === 0 || (BL[id] && (BL[id].cross)) || W.isWater(id) || W.isLava(id) || W.isDoor(id) || W.isBed(id) || W.isChest(id) || id === B.FURNACE || id === B.TNT || id === B.FARM || id === B.DUST_OFF || id === B.DUST_ON;
W.villageBlueprint = function (v) {
  const m = new Map();
  const put = (x, y, z, id) => { if (y >= 0 && y < H) m.set(x + ',' + y + ',' + z, id); };
  paintVillage(v, 0, 0, put, () => true, true);
  const out = [];
  for (const [k, id] of m) if (!NOREPAIR(id)) { const p = k.split(','); out.push([+p[0], +p[1], +p[2], id]); }
  return out;
};
W.buildingBlueprint = function (bd, v) {
  const m = new Map();
  const put = (x, y, z, id) => { if (y >= 0 && y < H) m.set(x + ',' + y + ',' + z, id); };
  paintBuild(bd, v.pal, put, () => true);
  const out = [];
  for (const [k, id] of m) { const p = k.split(','); out.push([+p[0], +p[1], +p[2], id]); }
  return out;
};
/* ---------- stromy ---------- */
function treeAt(wx, wz) {
  const r = hash3(wx, 0, wz, seed + SEED_TREE);
  if (r > .05) return null;
  const t = terrain(wx, wz), h = t >> 4, b = t & 15;
  if (h <= SEA + 1 || h >= H - 16) return null;
  let p = 0, type = 'oak';
  if (b === BI.FOREST) p = .045;
  else if (b === BI.PLAINS) p = .004;
  else if (b === BI.SNOW) { p = .02; type = 'spruce'; }
  else if (b === BI.MOUNTAIN && h < 56 + OFF) { p = .025; type = 'spruce'; }
  else if (b === BI.DESERT) { p = .006; type = 'cactus'; }
  if (r >= p) return null;
  if (nearVillage(wx, wz, 4)) return null;
  const r2 = hash3(wx, 1, wz, seed + 99);
  return { h, type, r2, b };
}

/* ---------- generování chunku ---------- */
const CN = 5 * 5 * 33;
const caveA = new Float32Array(CN), caveB = new Float32Array(CN), caveC = new Float32Array(CN);


/* ---------- profil cesty: vyrovnání terénu a mosty přes vodu a propasti ---------- */
const ROAD_PROF = new Map();
function roadProfile(key, axisX, c, lo, hi) {
  let p = ROAD_PROF.get(key); if (p) return p;
  const n = hi - lo + 1, h = new Int16Array(n), P = new Int16Array(n), gap = new Uint8Array(n), W_ = 28;
  for (let i = 0; i < n; i++) h[i] = terrain(axisX ? lo + i : c, axisX ? c : lo + i) >> 4;
  const lmax = new Int16Array(n), rmax = new Int16Array(n);
  for (let i = 0; i < n; i++) { let m = -1; for (let k = Math.max(0, i - W_); k <= i; k++) if (h[k] > m) m = h[k]; lmax[i] = m; m = -1; for (let k = i; k <= Math.min(n - 1, i + W_); k++) if (h[k] > m) m = h[k]; rmax[i] = m; }
  for (let i = 0; i < n; i++) gap[i] = (h[i] < SEA || Math.min(lmax[i], rmax[i]) - h[i] > 3) ? 1 : 0;
  for (let i = 0; i < n; i++) P[i] = h[i];
  for (let i = 0; i < n; ) {
    if (!gap[i]) { i++; continue; }
    let j = i; while (j + 1 < n && gap[j + 1]) j++;
    const left = i > 0 ? h[i - 1] : (j + 1 < n ? h[j + 1] : SEA + 1), right = j + 1 < n ? h[j + 1] : left;
    for (let k = i; k <= j; k++) P[k] = Math.max(SEA + 1, Math.round(left + (right - left) * (k - i + 1) / (j - i + 2)));
    i = j + 1;
  }
  for (let i = 1; i < n; i++) P[i] = Math.max(P[i - 1] - 1, Math.min(P[i - 1] + 1, P[i]));
  for (let i = n - 2; i >= 0; i--) P[i] = Math.max(P[i + 1] - 1, Math.min(P[i + 1] + 1, P[i]));
  // úsek, kde se profil po vyrovnání dostal vysoko nad terén (>3), je také most
  for (let i = 0; i < n; i++) if (P[i] - h[i] > 3) gap[i] = 1;
  p = { lo, h, P, gap }; ROAD_PROF.set(key, p); return p;
}
/** rampa na konci schodu profilu: o blok vyšší soused → šikmý blok stoupající tím směrem (jen u mostů a nájezdů) */
function rampFor(prof, ai, Y, alongX, off, land) {
  const P = prof.P, g = prof.gap;
  for (const k of [ai + 1, ai - 1]) {
    if (k < 0 || k >= P.length || P[k] !== Y + 1) continue;
    if (land && !g[ai] && !g[k]) { if (!(g[k + (k - ai)] || g[ai - (k - ai)])) continue; }
    const d = alongX ? (k > ai ? 0 : 2) : (k > ai ? 1 : 3);
    return W.RAMP_IDS[0][d];
  }
  return 0;
}
W._roadProfile = roadProfile;
W.genChunk = function (cx, cz, modsObj) {
  const data = new Uint8Array(CH * CH * H);
  const biome = new Uint8Array(256);
  const hmap = new Uint8Array(256);
  const x0 = cx * CH, z0 = cz * CH;
  const IDX = (x, y, z) => (y * CH + z) * CH + x;

  // jeskynní pole na hrubé mřížce
  for (let gx = 0; gx < 5; gx++) for (let gz = 0; gz < 5; gz++) for (let gy = 0; gy < 33; gy++) {
    const i = (gx * 5 + gz) * 33 + gy;
    const wx = x0 + gx * 4, wz = z0 + gz * 4, wy = gy * 4;
    caveA[i] = nC1.n3(wx * .022, wy * .03, wz * .022);
    caveB[i] = nC2.n3(wx * .022 + 50, wy * .03, wz * .022 + 50);
    caveC[i] = nC3.n3(wx * .012, wy * .02, wz * .012);
  }
  function cave(lx, y, lz, h, nearTop) {
    const gx = lx >> 2, gz = lz >> 2, gy = y >> 2;
    const fx = (lx & 3) / 4, fz = (lz & 3) / 4, fy = (y & 3) / 4;
    let a = 0, b = 0, c = 0;
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) {
      const w = (dx ? fx : 1 - fx) * (dz ? fz : 1 - fz) * (dy ? fy : 1 - fy);
      const i = ((gx + dx) * 5 + gz + dz) * 33 + gy + dy;
      a += caveA[i] * w; b += caveB[i] * w; c += caveC[i] * w;
    }
    if (a * a + b * b < .016) return true;
    if (y < 66 && c > .40 && y > 3 && !nearTop) return true;
    return false;
  }

  for (let lz = 0; lz < CH; lz++) for (let lx = 0; lx < CH; lx++) {
    const wx = x0 + lx, wz = z0 + lz;
    const t = terrain(wx, wz), h = t >> 4, bi = t & 15;
    const c = lz * CH + lx;
    biome[c] = bi; hmap[c] = h;
    let top, sub, subD, deep = B.STONE, deepD = 0;
    switch (bi) {
      case BI.OCEAN: top = h > SEA - 4 ? B.SAND : (hash3(wx >> 3, 0, wz >> 3, seed) < .4 ? B.GRAVEL : B.DIRT); sub = B.SAND; subD = h > SEA - 4 ? 3 : 2; if (top === B.DIRT) sub = B.DIRT; break;
      case BI.BEACH: top = B.SAND; sub = B.SAND; subD = 3; deep = B.SANDSTONE; deepD = 3; break;
      case BI.DESERT: top = B.SAND; sub = B.SAND; subD = 4; deep = B.SANDSTONE; deepD = 5; break;
      case BI.SNOW: top = B.SNOW; sub = B.DIRT; subD = 3; break;
      case BI.MOUNTAIN: top = h > 78 + OFF ? B.SNOW : (h < 56 + OFF ? B.GRASS : B.STONE); sub = top === B.GRASS ? B.DIRT : B.STONE; subD = 3; break;
      default: top = B.GRASS; sub = B.DIRT; subD = 3;
    }
    const col = (y) => IDX(lx, y, lz);
    for (let y = 0; y <= h; y++) {
      let id;
      if (y === 0) id = B.BEDROCK;
      else if (y === h) id = top;
      else if (y >= h - subD) id = sub;
      else if (y >= h - subD - deepD) id = deep;
      else {
        id = B.STONE;
        if (y < 34) id = B.DEEPSLATE;
        else if (y < 110) { const rk = hash3(wx >> 3, y >> 3, wz >> 3, seed + 8); if (rk < .1) id = B.GRANITE; else if (rk < .2) id = B.DIORITE; else if (rk < .3) id = B.ANDESITE; }
        // rudy – shluky 2x2x2
        const r = hash3(wx >> 1, y >> 1, wz >> 1, seed + 5);
        if (r < .02 && y < 100) { if (hash3(wx, y, wz, seed + 6) < .7) id = B.COAL_ORE; }
        else if (y < 40 && r > 1 - .0035 * (1 + (40 - y) / 12)) { if (hash3(wx, y, wz, seed + 7) < .65) id = B.IRON_ORE; }
        else if (y < 26 && r > .9845 && r <= .9866) { if (hash3(wx, y, wz, seed + 12) < .7) id = B.GOLD_ORE; }
        else if (y < 16 && r > .9805 && r <= .9822) { if (hash3(wx, y, wz, seed + 13) < .7) id = B.DIAMOND_ORE; }
        else if (y < 20 && r > .9755 && r <= .9792) { if (hash3(wx, y, wz, seed + 14) < .7) id = B.RS_ORE; }
        else if (r > .96 && r <= .975 && y < 70) { id = B.GRAVEL; }
        if (y >= h - 4 && (id === B.COAL_ORE || id === B.IRON_ORE || id === B.GOLD_ORE || id === B.DIAMOND_ORE || id === B.RS_ORE)) id = B.STONE; // rudy nikdy u povrchu
      }
      data[col(y)] = id;
    }
    // jeskyně
    if (h > 6 && !nearVillage(wx, wz, 4)) { // pod vesnicemi žádné jeskyně
      let maxY = h > SEA + 1 ? h : h - 3;
      if (treeAt(wx, wz)) maxY = h - 3;
      for (let y = 2; y <= maxY; y++) {
        if (cave(lx, y, lz, h, y > h - 3)) {
          data[col(y)] = y <= 12 ? B.LAVA : B.AIR;
        }
      }
      // kdyby nad jeskyní zůstala hlína bez trávy
      if (data[col(h)] === B.AIR && h > SEA && data[col(h - 1)] === B.DIRT) data[col(h - 1)] = B.GRASS;
    }
    for (let y = h + 1; y <= SEA; y++) data[col(y)] = B.WATER;
    // sníh v oceánu -> nic; ledu není
  }

  // dekorace: tráva, květiny
  for (let lz = 0; lz < CH; lz++) for (let lx = 0; lx < CH; lx++) {
    const c = lz * CH + lx, h = hmap[c], bi = biome[c];
    if (h <= SEA || h >= H - 3) continue;
    if (data[IDX(lx, h, lz)] !== B.GRASS) continue;
    if (data[IDX(lx, h + 1, lz)] !== B.AIR) continue;
    const r = hash3(x0 + lx, 3, z0 + lz, seed + 21);
    let id = 0;
    if (bi === BI.PLAINS) id = r < .12 ? B.TALLGRASS : r < .135 ? B.FLOWER_R : r < .15 ? B.FLOWER_Y : r > .99985 ? B.PUMPKIN : 0;
    else if (bi === BI.FOREST) id = r < .07 ? B.TALLGRASS : r < .075 ? B.FLOWER_R : 0;
    else if (bi === BI.MOUNTAIN) id = r < .04 ? B.TALLGRASS : 0;
    if (id) data[IDX(lx, h + 1, lz)] = id;
  }
  // stromy a kaktusy
  const put = (wx, wy, wz, id, soft) => {
    const lx = wx - x0, lz = wz - z0;
    if (lx < 0 || lz < 0 || lx >= CH || lz >= CH || wy < 0 || wy >= H) return;
    const i = IDX(lx, wy, lz);
    if (soft) { const o = data[i]; if (o !== B.AIR && o !== B.TALLGRASS && o !== B.FLOWER_R && o !== B.FLOWER_Y) return; }
    data[i] = id;
  };
  for (let wx = x0 - 3; wx < x0 + CH + 3; wx++) for (let wz = z0 - 3; wz < z0 + CH + 3; wz++) {
    const tr = treeAt(wx, wz);
    if (!tr) continue;
    const { h, type, r2 } = tr;
    if (type === 'cactus') {
      const hh = 1 + Math.floor(r2 * 3);
      for (let k = 1; k <= hh; k++) put(wx, h + k, wz, B.CACTUS, true);
    } else if (type === 'oak') {
      const th = 4 + Math.floor(r2 * 3);
      for (let k = 1; k <= th; k++) put(wx, h + k, wz, B.LOG, false);
      for (let dy = th - 2; dy <= th + 1; dy++) {
        const r = dy >= th ? 1 : 2;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r) {
            if (r === 2 && hash3(wx + dx, dy, wz + dz, seed + 31) < .5) continue;
            if (dy === th + 1) continue;
          }
          if (dx === 0 && dz === 0 && dy <= th) continue;
          put(wx + dx, h + dy, wz + dz, B.LEAVES, true);
        }
      }
    } else { // smrk
      const th = 5 + Math.floor(r2 * 4);
      for (let k = 1; k <= th; k++) put(wx, h + k, wz, B.LOG, false);
      put(wx, h + th + 1, wz, B.LEAVES, true);
      for (let k = 0; k < th - 2; k++) {
        const y = h + th - k, r = 1 + (k % 2);
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > r + (r === 2 ? 0 : 0)) continue;
          if (dx === 0 && dz === 0) continue;
          put(wx + dx, y, wz + dz, B.LEAVES, true);
        }
      }
    }
  }

  // vesnice
  const vs = W.villagesInChunk(cx, cz);
  const inChunk = (x, z) => x >= x0 && x < x0 + CH && z >= z0 && z < z0 + CH;
  const putV = (wx, wy, wz, id) => put(wx, wy, wz, id, false);
  for (const v of vs) {
    if (Math.abs(v.x - (x0 + 8)) > v.R + 20 || Math.abs(v.z - (z0 + 8)) > v.R + 20) continue;
    paintVillage(v, x0, z0, putV, inChunk);
  }

  // cesty mezi sídly (L-spoj mezi sousedními regiony): vyrovnaný profil, náspy, zářezy a mosty přes vodu a propasti
  {
    const rxc = Math.floor(x0 / REG), rzc = Math.floor(z0 / REG);
    const inVill = (v, x, z) => Math.abs(x - v.x) <= 55 && Math.abs(z - v.z) <= 55;
    for (let rx = rxc - 1; rx <= rxc + 1; rx++) for (let rz = rzc - 1; rz <= rzc + 1; rz++) {
      const A = getVillage(rx, rz); if (!A) continue;
      for (const [bx, bz] of [[rx + 1, rz], [rx, rz + 1]]) {
        const Bv = getVillage(bx, bz); if (!Bv) continue;
        const xa = Math.min(A.x, Bv.x), xb = Math.max(A.x, Bv.x), za = Math.min(A.z, Bv.z), zb = Math.max(A.z, Bv.z);
        if (x0 > xb + 3 || x0 + CH < xa - 3 || z0 > zb + 3 || z0 + CH < za - 3) continue;
        const profH = roadProfile('H' + A.x + ',' + A.z + ',' + xa + ',' + xb, true, A.z, xa, xb);
        const profV = roadProfile('V' + Bv.x + ',' + Bv.z + ',' + za + ',' + zb, false, Bv.x, za, zb);
        for (let lz = 0; lz < CH; lz++) for (let lx = 0; lx < CH; lx++) {
          const wx = x0 + lx, wz = z0 + lz;
          let off = -9, lampSide = false, prof = null, ai = 0, alongX = false;
          const dzH = wz - A.z, dxV = wx - Bv.x;
          if (Math.abs(dzH) <= 2 && wx >= xa && wx <= xb) { off = Math.abs(dzH); lampSide = (wx - A.x) % 24 === 0 && dzH === 2; prof = profH; ai = wx - xa; alongX = true; }
          else if (Math.abs(dxV) <= 2 && wz >= za && wz <= zb) { off = Math.abs(dxV); lampSide = (wz - Bv.z) % 24 === 0 && dxV === 2; prof = profV; ai = wz - za; }
          if (off < 0 || off > 2) continue;
          const t = terrain(wx, wz), h = t >> 4, gap = prof.gap[ai], Y = prof.P[ai];
          if (!gap && (inVill(A, wx, wz) || inVill(Bv, wx, wz))) continue; // v sídle jen mosty, cesty si dělá samo
          if ((t & 15) === BI.MOUNTAIN && !gap) continue;
          if (gap) { // most
            if (off <= 1) {
              put(wx, Y, wz, off === 0 ? (alongX ? B.LINE_X : B.LINE_Z) : B.ASPHALT);
              if (off === 0 && ai % 6 === 0) for (let y = Math.max(1, h); y < Y; y++) put(wx, y, wz, B.CONCRETE_D);
              for (let y = Y + 1; y <= Y + 4; y++) put(wx, y, wz, B.AIR);
              const rp = rampFor(prof, ai, Y, alongX, off); if (rp) put(wx, Y + 1, wz, rp);
            } else {
              put(wx, Y, wz, B.STEEL); put(wx, Y + 1, wz, B.FENCE);
              if (lampSide) { for (let y = Y + 2; y <= Y + 3; y++) put(wx, y, wz, B.STEEL); put(wx, Y + 4, wz, B.GLOWSTONE); }
              else for (let y = Y + 2; y <= Y + 4; y++) put(wx, y, wz, B.AIR);
            }
            continue;
          }
          if (off === 2) {
            if (lampSide && h > SEA) { for (let y = Y + 1; y <= Y + 3; y++) put(wx, y, wz, B.FENCE); put(wx, Y + 4, wz, B.GLOWSTONE); }
            continue;
          }
          // náspy a zářezy: cesta vždy leží na vyrovnaném profilu
          if (Y > h) for (let y = h + 1; y < Y; y++) put(wx, y, wz, B.DIRT);
          put(wx, Y, wz, hash3(wx, 4, wz, seed + 6) < .18 ? B.COBBLE : B.PATH);
          for (let y = Y + 1; y <= Math.max(Y + 3, h + 1); y++) put(wx, y, wz, B.AIR);
          if (off <= 1) { const rp = rampFor(prof, ai, Y, alongX, off, true); if (rp) put(wx, Y + 1, wz, rp); }
        }
      }
    }
  }
  // vodopády: pramen na hraně útesu, voda padá do tůňky
  for (let lz = 2; lz < CH - 2; lz++) for (let lx = 2; lx < CH - 2; lx++) {
    const wx = x0 + lx, wz = z0 + lz, h = hmap[lz * CH + lx];
    if (h < SEA + 6 || h > SEA + 70) continue;
    if (hash3(wx, 13, wz, seed + 78) > .06) continue;
    if (nearVillage(wx, wz, 8)) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nh = hmap[(lz + dz) * CH + lx + dx];
      if (nh > h - 4 || nh <= SEA) continue;
      if (hmap[(lz + dz * 2) * CH + lx + dx * 2] > nh + 2) continue;
      if (data[IDX(lx, h, lz)] === B.AIR) continue;
      put(wx, h, wz, B.WATER);
      put(wx - dx, h, wz - dz, B.STONE); // zadní opěra, ať voda neteče zpět
      for (let y = nh + 1; y <= h; y++) put(wx + dx, y, wz + dz, 56);
      for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) { const px = wx + dx * 2 + a2, pz = wz + dz * 2 + b2; if (!(a2 === 0 && b2 === 0 && false)) put(px, nh, pz, B.WATER); }
      put(wx + dx, nh, wz + dz, B.WATER);
      break;
    }
  }

  // úpravy hráče
  if (modsObj) for (const k in modsObj) data[k | 0] = modsObj[k];

  // mapa nejvyšších pevných bloků (pro spawn a spálení)
  for (let lz = 0; lz < CH; lz++) for (let lx = 0; lx < CH; lx++) {
    let y = H - 1;
    while (y > 0 && (SOLID[data[IDX(lx, y, lz)]] === 0 && data[IDX(lx, y, lz)] !== B.WATER)) y--;
    hmap[lz * CH + lx] = y;
  }
  return { cx, cz, data, biome, hmap };
};

/* hledání místa pro start */
W.findSpawn = function () {
  for (let r = 0; r < 600; r += 8) {
    for (let a = 0; a < (r === 0 ? 1 : 12); a++) {
      const ang = a / 12 * Math.PI * 2;
      const x = Math.round(Math.cos(ang) * r), z = Math.round(Math.sin(ang) * r);
      const t = terrain(x, z), h = t >> 4, b = t & 15;
      if (h > SEA + 2 && (b === BI.PLAINS || b === BI.FOREST || b === BI.DESERT || b === BI.SNOW)) return { x: x + .5, z: z + .5, y: h + 1 };
    }
  }
  return { x: .5, z: .5, y: 40 };
};

W.EGG_MATS = [B.IRON_BLOCK, B.GOLD_BLOCK, B.DIAMOND_BLOCK, B.EMERALD_BLOCK, B.COBBLE, B.STONE_BRICKS, B.PLANKS, B.OBSIDIAN, B.SNOW, B.SANDSTONE, B.BRICKS, B.HAY, B.WOOL, B.GLOWSTONE, B.GRANITE, B.DEEPSLATE, B.DIRT, B.GLASS, B.SAND, B.GRAVEL, B.LOG, B.GRASS, B.CACTUS, B.TNT];
if (typeof module !== 'undefined' && module.exports) module.exports = W; else root.W = W;
})(typeof window !== 'undefined' ? window : globalThis);
