'use strict';
/* Block Life Simulator – multiplayer server
 *  - až MAX_PLAYERS hráčů (výchozí 4), jeden nebo více adminů (heslo)
 *  - ukládá změny světa (bloky, truhly) i hráče do data/world.json
 *  - zároveň umí rozdávat hru (index.html + js/), takže doma stačí jediný proces
 *  Konfigurace přes proměnné prostředí nebo server/config.json (viz README).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

/* ---------- konfigurace ---------- */
let file = {};
try { file = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) {}
const cfg = {
  port: +(process.env.PORT || file.port || 8080),
  maxPlayers: +(process.env.MAX_PLAYERS || file.maxPlayers || 4),
  seed: process.env.SEED !== undefined ? process.env.SEED : file.seed,          // prázdné = náhodný při prvním startu
  mode: process.env.MODE || file.mode || 'creative',                              // creative | survival
  adminPassword: process.env.ADMIN_PASSWORD || file.adminPassword || '',          // prázdné = vygeneruje se a uloží do data/admin.txt
  serverPassword: process.env.SERVER_PASSWORD || file.serverPassword || '',       // volitelné heslo pro vstup
  motd: process.env.MOTD || file.motd || 'Vítej v Block Life Simulatoru!',
  serveStatic: (process.env.STATIC || (file.serveStatic === false ? '0' : '1')) !== '0',
  dataDir: process.env.DATA_DIR || file.dataDir || path.join(__dirname, 'data'),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || (file.allowedOrigins || []).join(',') || '').split(',').map(s => s.trim()).filter(Boolean)
};
fs.mkdirSync(cfg.dataDir, { recursive: true });

/* ---------- uložený stav ---------- */
const WORLD_FILE = path.join(cfg.dataDir, 'world.json'), BAN_FILE = path.join(cfg.dataDir, 'bans.json'), ADMIN_FILE = path.join(cfg.dataDir, 'admin.txt');
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const world = readJSON(WORLD_FILE, null) || {};
if (world.seed === undefined) {
  const s = cfg.seed;
  world.seed = (s === undefined || s === '') ? Math.floor(Math.random() * 2 ** 31) : (/^-?\d+$/.test(String(s)) ? parseInt(s, 10) | 0 : strHash(String(s)));
}
world.mode = world.mode || cfg.mode;
if (cfg.seed !== undefined && cfg.seed !== '' && !fs.existsSync(WORLD_FILE)) { /* seed se bere jen při prvním startu */ }
world.time = typeof world.time === 'number' ? world.time : .27;
world.edits = world.edits || {};     // "x,y,z" -> id
world.chests = world.chests || {};   // "x,y,z" -> pole 27 slotů
world.furn = world.furn || {};       // "x,y,z" -> {t,r,txt} (nábytek, cedule)
world.players = world.players || {}; // jméno -> uložený stav hráče
world.rain = 0; world.thunder = false;
let dirty = true;
let bans = readJSON(BAN_FILE, { names: [], ips: [] });
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

let adminPassword = cfg.adminPassword;
if (!adminPassword) {
  try { adminPassword = fs.readFileSync(ADMIN_FILE, 'utf8').trim(); } catch (e) {}
  if (!adminPassword) { adminPassword = crypto.randomBytes(5).toString('hex'); fs.writeFileSync(ADMIN_FILE, adminPassword + '\n'); }
}

function saveAll() {
  if (!dirty) return;
  try {
    const tmp = WORLD_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(world));
    fs.renameSync(tmp, WORLD_FILE);
    dirty = false;
  } catch (e) { console.error('Ukládání selhalo:', e.message); }
}
const saveBans = () => { try { fs.writeFileSync(BAN_FILE, JSON.stringify(bans)); } catch (e) {} };

/* ---------- HTTP (statické soubory hry) ---------- */
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ name: 'Block Life Simulator', players: clients.size, max: cfg.maxPlayers, mode: world.mode, motd: cfg.motd, password: !!cfg.serverPassword }));
    return;
  }
  if (!cfg.serveStatic) { res.writeHead(404); res.end('Not found'); return; }
  let u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/') u = '/index.html';
  const p = path.normalize(path.join(ROOT, u));
  const rel = path.relative(ROOT, p).split(path.sep);
  const ok = p.startsWith(ROOT + path.sep) && (rel.length === 1 && rel[0] === 'index.html' || rel[0] === 'js' && rel.length === 2);
  if (!ok) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

/* ---------- WebSocket ---------- */
const wss = new WebSocketServer({ server, maxPayload: 4 * 1024 * 1024 });
const clients = new Map(); // id -> c
let nextId = 1;
const NAME_RE = /^[A-Za-z0-9_\-ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž]{2,16}$/;

const send = (c, o) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); };
const broadcast = (o, except) => { const s = JSON.stringify(o); for (const c of clients.values()) if (c !== except && c.ws.readyState === 1) c.ws.send(s); };
const sys = (m, to) => { const o = { t: 'chat', sys: 1, m }; if (to) send(to, o); else broadcast(o); console.log('[sys]', m); };
const byName = (n) => { n = String(n || '').toLowerCase(); for (const c of clients.values()) if (c.name.toLowerCase() === n) return c; return null; };

wss.on('connection', (ws, req) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  if (cfg.allowedOrigins.length && req.headers.origin && !cfg.allowedOrigins.includes(req.headers.origin)) { ws.close(1008, 'origin'); return; }
  const c = { ws, ip, id: 0, name: '', admin: false, joined: false, pos: null, lastChat: [], editBudget: 400, lastEditRefill: Date.now() };
  let helloTimer = setTimeout(() => { if (!c.joined) ws.close(1008, 'timeout'); }, 8000);
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (!c.joined) { if (m.t === 'hello') { clearTimeout(helloTimer); onHello(c, m); } return; }
    onMessage(c, m);
  });
  ws.on('close', () => { clearTimeout(helloTimer); if (c.joined) leave(c); });
  ws.on('error', () => {});
});

function deny(c, r, text) { send(c, { t: 'deny', r, m: text }); setTimeout(() => c.ws.close(1000, r), 100); }

function onHello(c, m) {
  const name = String(m.name || '').trim();
  if (!NAME_RE.test(name)) return deny(c, 'name', 'Neplatné jméno (2–16 znaků: písmena, čísla, _ -).');
  if (bans.names.includes(name.toLowerCase()) || bans.ips.includes(c.ip)) return deny(c, 'ban', 'Jsi zabanovaný na tomto serveru.');
  if (cfg.serverPassword && m.pass !== cfg.serverPassword) return deny(c, 'pass', 'Špatné heslo serveru.');
  if (byName(name)) return deny(c, 'taken', 'Jméno už někdo používá.');
  if (clients.size >= cfg.maxPlayers) return deny(c, 'full', `Server je plný (${cfg.maxPlayers}/${cfg.maxPlayers}).`);
  c.name = name; c.id = nextId++;
  c.admin = !!(m.admin && safeEq(String(m.admin), adminPassword)); // admin jen s heslem (jména se dají podvrhnout)
  if (m.admin && !c.admin) send(c, { t: 'chat', sys: 1, m: 'Špatné admin heslo – vstupuješ jako běžný hráč.' });
  c.joined = true; clients.set(c.id, c);
  const edits = []; for (const k in world.edits) { const [x, y, z] = k.split(',').map(Number); edits.push(x, y, z, world.edits[k]); }
  send(c, {
    t: 'welcome', id: c.id, name, admin: c.admin, seed: world.seed, mode: world.mode, time: world.time, rain: world.rain, thunder: world.thunder, motd: cfg.motd, max: cfg.maxPlayers,
    edits, chests: world.chests, furn: world.furn, saved: world.players[name.toLowerCase()] || null,
    players: [...clients.values()].filter(o => o !== c).map(pub)
  });
  broadcast({ t: 'join', p: pub(c) }, c);
  sys(`${name} se připojil${c.admin ? ' (admin)' : ''}. Hráčů: ${clients.size}/${cfg.maxPlayers}`);
}
const pub = (c) => ({ id: c.id, name: c.name, admin: c.admin, pos: c.pos });
function safeEq(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); }

function leave(c) {
  clients.delete(c.id);
  if (c.lastInv) { world.players[c.name.toLowerCase()] = c.lastInv; dirty = true; }
  broadcast({ t: 'leave', id: c.id, name: c.name });
  sys(`${c.name} odešel. Hráčů: ${clients.size}/${cfg.maxPlayers}`);
  saveAll();
}

const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
function onMessage(c, m) {
  switch (m.t) {
    case 'pos':
      if (num(m.x, -3e7, 3e7) && num(m.y, -64, 400) && num(m.z, -3e7, 3e7)) c.pos = { x: m.x, y: m.y, z: m.z, yaw: +m.yaw || 0, pitch: +m.pitch || 0, a: +m.a || 0, h: m.h | 0, f: m.f ? 1 : 0, s: m.s ? 1 : 0 };
      break;
    case 'edit': {
      const now = Date.now(); c.editBudget = Math.min(400, c.editBudget + (now - c.lastEditRefill) * 0.4); c.lastEditRefill = now;
      if (c.editBudget < 1) return;
      if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || !Number.isInteger(m.z) || !Number.isInteger(m.id)) return;
      if (m.y < 0 || m.y > 127 || m.id < 0 || m.id > 255 || Math.abs(m.x) > 3e7 || Math.abs(m.z) > 3e7) return;
      c.editBudget--;
      world.edits[m.x + ',' + m.y + ',' + m.z] = m.id; dirty = true;
      broadcast({ t: 'edit', x: m.x, y: m.y, z: m.z, id: m.id }, c);
      break;
    }
    case 'furn': {
      if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || !Number.isInteger(m.z) || Math.abs(m.x) > 3e7 || Math.abs(m.z) > 3e7 || m.y < 0 || m.y > 127) return;
      const k = m.x + ',' + m.y + ',' + m.z;
      if (m.op === 'p' && (typeof m.ty === 'string' && m.ty.length < 24)) world.furn[k] = { t: m.ty, r: m.r | 0, txt: typeof m.txt === 'string' ? m.txt.slice(0, 120) : undefined };
      else if (m.op === 'r') { delete world.furn[k]; delete world.chests[k]; }
      else if (m.op === 't' && world.furn[k]) world.furn[k].txt = String(m.txt || '').slice(0, 120);
      else return;
      dirty = true; broadcast({ t: 'furn', op: m.op, x: m.x, y: m.y, z: m.z, ty: m.ty, r: m.r, txt: m.txt }, c);
      break;
    }
    case 'chest': {
      if (typeof m.k !== 'string' || m.k.length > 40 || !Array.isArray(m.a) || m.a.length !== 27) return;
      world.chests[m.k] = m.a; dirty = true;
      broadcast({ t: 'chest', k: m.k, a: m.a }, c);
      break;
    }
    case 'inv':
      if (m.d && typeof m.d === 'object') { c.lastInv = m.d; world.players[c.name.toLowerCase()] = m.d; dirty = true; }
      break;
    case 'chat': {
      let s = String(m.m || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
      if (!s) return;
      const now = Date.now(); c.lastChat = c.lastChat.filter(t => now - t < 6000);
      if (c.lastChat.length >= 6) return send(c, { t: 'chat', sys: 1, m: 'Zpomal, píšeš moc rychle.' });
      c.lastChat.push(now);
      if (s[0] === '/') return command(c, s.slice(1), false);
      if (c.muted) return send(c, { t: 'chat', sys: 1, m: 'Jsi umlčený.' });
      broadcast({ t: 'chat', from: c.name, admin: c.admin, m: s }); console.log(`<${c.name}> ${s}`);
      break;
    }
    case 'ping': send(c, { t: 'pong', n: m.n }); break;
  }
}

/* ---------- příkazy (chat nebo konzole) ---------- */
const HELP_USER = '/list, /me <text>, /login <heslo> (admin)';
const HELP_ADMIN = '/kick <jmeno> [duvod], /ban <jmeno>, /unban <jmeno>, /bans, /time day|noon|sunset|night|midnight|0-1, /weather clear|rain|storm, /tp <jmeno> [cil], /tphere <jmeno>, /say <text>, /mute <jmeno>, /unmute <jmeno>, /op <jmeno>, /deop <jmeno>, /seed, /save, /stop';
function command(c, line, isConsole) {
  const [cmd0, ...args] = line.trim().split(/\s+/); const cmd = (cmd0 || '').toLowerCase();
  const out = (m) => isConsole ? console.log(m) : send(c, { t: 'chat', sys: 1, m });
  const admin = isConsole || c.admin;
  const need = () => { if (!admin) { out('Tohle smí jen admin.'); return false; } return true; };
  const target = (n) => { const t = byName(n); if (!t) out('Hráč „' + n + '“ není online.'); return t; };
  switch (cmd) {
    case 'help': case '?': out('Příkazy: ' + HELP_USER + (admin ? ' | admin: ' + HELP_ADMIN : '')); break;
    case 'list': out(`Online ${clients.size}/${cfg.maxPlayers}: ` + [...clients.values()].map(o => o.name + (o.admin ? '*' : '')).join(', ')); break;
    case 'me': { const s = args.join(' '); if (s && c) broadcast({ t: 'chat', sys: 1, m: `* ${c.name} ${s}` }); break; }
    case 'login': {
      if (isConsole) break;
      if (args[0] && safeEq(args[0], adminPassword)) { c.admin = true; send(c, { t: 'admin', on: true }); out('Jsi admin. /help pro příkazy.'); sys(`${c.name} je teď admin.`); }
      else out('Špatné heslo.');
      break;
    }
    case 'kick': { if (!need()) break; const t = target(args[0]); if (!t) break; const why = args.slice(1).join(' ') || 'Vyhozen adminem'; send(t, { t: 'kick', r: why }); sys(`${t.name} byl vyhozen (${why}).`); setTimeout(() => t.ws.close(1000, 'kick'), 150); break; }
    case 'ban': { if (!need()) break; const n = (args[0] || '').toLowerCase(); if (!n) { out('Použití: /ban <jmeno>'); break; } if (!bans.names.includes(n)) bans.names.push(n); const t = byName(n); if (t) { if (!bans.ips.includes(t.ip) && !/^(::1|127\.|::ffff:127\.)/.test(t.ip)) bans.ips.push(t.ip); send(t, { t: 'kick', r: 'Zabanován.' }); setTimeout(() => t.ws.close(1000, 'ban'), 150); } saveBans(); sys(`${args[0]} byl zabanován.`); break; }
    case 'unban': { if (!need()) break; const n = (args[0] || '').toLowerCase(); bans.names = bans.names.filter(x => x !== n); saveBans(); out(`Ban pro ${args[0]} zrušen (IP bany viz /bans a data/bans.json).`); break; }
    case 'bans': if (need()) out('Bany: ' + (bans.names.join(', ') || '(žádné)') + ' | IP: ' + bans.ips.length); break;
    case 'time': {
      if (!need()) break;
      const map = { day: .30, morning: .27, noon: .5, sunset: .75, evening: .72, night: .9, midnight: 0 };
      let v = map[(args[0] || '').toLowerCase()]; if (v === undefined) { const f = parseFloat(args[0]); if (isFinite(f) && f >= 0 && f <= 1) v = f; }
      if (v === undefined) { out('Použití: /time day|noon|sunset|night|midnight|0-1'); break; }
      world.time = v; dirty = true; broadcast({ t: 'time', v, hard: 1 }); sys('Čas nastaven.'); break;
    }
    case 'weather': {
      if (!need()) break; const w = (args[0] || '').toLowerCase();
      if (w === 'clear') { world.rain = 0; world.thunder = false; } else if (w === 'rain') { world.rain = .8; world.thunder = false; } else if (w === 'storm' || w === 'thunder') { world.rain = 1; world.thunder = true; } else { out('Použití: /weather clear|rain|storm'); break; }
      broadcast({ t: 'weather', rain: world.rain, thunder: world.thunder }); weatherT = 240; sys('Počasí změněno.'); break;
    }
    case 'tp': {
      if (!need() || isConsole) { if (isConsole) out('Příkaz /tp jen z hry.'); break; }
      const a = target(args[0]); if (!a) break;
      const b = args[1] ? target(args[1]) : c; if (!b) break;
      if (!b.pos) { out('Cíl ještě nemá polohu.'); break; }
      send(a, { t: 'tp', x: b.pos.x + 1, y: b.pos.y + .5, z: b.pos.z }); out(`Teleportován ${a.name} k ${b.name}.`); break;
    }
    case 'tphere': { if (!need() || isConsole) break; const a = target(args[0]); if (!a || !c.pos) break; send(a, { t: 'tp', x: c.pos.x + 1, y: c.pos.y + .5, z: c.pos.z }); break; }
    case 'say': if (need()) broadcast({ t: 'chat', sys: 1, m: '[Server] ' + args.join(' ') }); break;
    case 'mute': { if (!need()) break; const t = target(args[0]); if (t) { t.muted = true; out(t.name + ' umlčen.'); } break; }
    case 'unmute': { if (!need()) break; const t = target(args[0]); if (t) { t.muted = false; out(t.name + ' může zase psát.'); } break; }
    case 'op': { if (!need()) break; const t = target(args[0]); if (t) { t.admin = true; send(t, { t: 'admin', on: true }); sys(t.name + ' je teď admin.'); } break; }
    case 'deop': { if (!need()) break; const n = (args[0] || '').toLowerCase(); const t = byName(n); if (t) { t.admin = false; send(t, { t: 'admin', on: false }); } sys(args[0] + ' už není admin.'); break; }
    case 'seed': if (need()) out('Seed: ' + world.seed); break;
    case 'save': if (need()) { dirty = true; saveAll(); out('Uloženo.'); } break;
    case 'stop': if (need()) { out('Server se vypíná…'); shutdown(); } break;
    default: out('Neznámý příkaz. /help');
  }
}
if (process.stdin.isTTY || process.env.CONSOLE_STDIN === '1') {
  require('readline').createInterface({ input: process.stdin }).on('line', (l) => { l = l.trim(); if (l) command(null, l.replace(/^\//, ''), true); });
}

/* ---------- smyčky: pozice, čas, počasí, ukládání ---------- */
let last = Date.now(), weatherT = 120 + Math.random() * 200, timeT = 0;
setInterval(() => {
  if (clients.size === 0) { last = Date.now(); return; }
  const p = [];
  for (const c of clients.values()) if (c.pos) p.push([c.id, +c.pos.x.toFixed(2), +c.pos.y.toFixed(2), +c.pos.z.toFixed(2), +c.pos.yaw.toFixed(2), +c.pos.pitch.toFixed(2), +c.pos.a.toFixed(2), c.pos.h, c.pos.f, c.pos.s]);
  if (p.length > 1 || (p.length === 1 && clients.size > 1)) {
    for (const c of clients.values()) { const others = p.filter(r => r[0] !== c.id); if (others.length) send(c, { t: 'pos', p: others }); }
  }
}, 66);
setInterval(() => {
  const now = Date.now(), dt = (now - last) / 1000; last = now;
  if (clients.size) {
    world.time = (world.time + dt / 720) % 1; dirty = true; timeT -= dt;
    if (timeT <= 0) { timeT = 3; broadcast({ t: 'time', v: world.time }); }
    weatherT -= dt;
    if (weatherT <= 0) {
      if (world.rain > 0) { world.rain = 0; world.thunder = false; weatherT = 150 + Math.random() * 240; }
      else { world.rain = .65 + Math.random() * .35; world.thunder = Math.random() < .35; weatherT = 110 + Math.random() * 200; }
      broadcast({ t: 'weather', rain: world.rain, thunder: world.thunder });
    }
  }
}, 250);
setInterval(saveAll, 30000);

function shutdown() { saveAll(); saveBans(); for (const c of clients.values()) try { c.ws.close(1001, 'stop'); } catch (e) {} setTimeout(() => process.exit(0), 300); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

server.listen(cfg.port, () => {
  console.log('==============================================');
  console.log(' Block Life Simulator – server běží');
  console.log(` Port: ${cfg.port}   Hráčů max: ${cfg.maxPlayers}   Režim: ${world.mode}   Seed: ${world.seed}`);
  console.log(` Admin heslo: ${adminPassword}   ${cfg.serverPassword ? '(server je chráněný heslem)' : '(vstup bez hesla)'}`);
  console.log(` Hra přes tento server: ${cfg.serveStatic ? 'http://localhost:' + cfg.port + '/' : 'vypnuto'}`);
  console.log(' Konzole: help, list, kick <jmeno>, ban <jmeno>, say <text>, time ..., stop');
  console.log('==============================================');
});
