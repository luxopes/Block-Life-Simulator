/* Block Life Simulator – multiplayer klient
 * Stará se o připojení k serveru (WebSocket), synchronizaci bloků, truhel, nábytku, chat,
 * modely ostatních hráčů a admin příkazy. Hra beze serveru funguje beze změny. */
(function () {
'use strict';
const G = window.G, THREE = window.THREE, $ = (id) => document.getElementById(id);
if (!G || !$('pOnline')) return;

const LS = 'bls_online';
let ws = null, me = null, connecting = false, intentional = false;
const others = new Map();       // id -> {name, admin, grp, parts, x,y,z,yaw,pitch, tx,ty,tz,tyaw,tpitch, spd, phase, held}
let posT = 0, invT = 0, pingT = 0, srvLabel = '', maxPl = 4;
const stat = (t, bad) => { const e = $('oStat'); e.textContent = t || ''; e.style.color = bad ? '#ff8a7a' : ''; };
const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } };
const lsSet = (o) => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} };

/* ---------- menu ---------- */
function defaultServer() {
  if (window.BLS_SERVER) return window.BLS_SERVER;
  const q = new URLSearchParams(location.search).get('server'); if (q) return q;
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    // hra běží přímo ze serveru (doma / LAN) → stejný hostitel
    if (!/github\.io$|\.pages\.dev$|\.netlify\.app$/.test(location.hostname)) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  }
  return '';
}
function fillForm() {
  const s = lsGet();
  $('oSrv').value = s.srv || defaultServer(); $('oName').value = s.name || ''; $('oAdm').value = '';
  $('oPass').value = s.pass || '';
  if (window.BLS_SERVER && !s.srv) $('oSrv').value = window.BLS_SERVER;
  stat('');
}
$('bOnline').onclick = $('bOnline2').onclick = () => { $('pWorlds').style.display = 'none'; $('pNew').style.display = 'none'; $('pOnline').style.display = 'flex'; fillForm(); };
$('oBack').onclick = () => { if (connecting) closeWs(); $('pOnline').style.display = 'none'; G.showView('list'); };
['oSrv', 'oName', 'oAdm', 'oPass'].forEach((id) => { $(id).onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('oGo').click(); }; });
$('oGo').onclick = () => {
  if (connecting) return;
  let url = $('oSrv').value.trim(), name = $('oName').value.trim();
  if (!url) return stat('Zadej adresu serveru.', 1);
  if (!/^wss?:\/\//i.test(url)) url = (/^(localhost|127\.|192\.168\.|10\.)/.test(url) ? 'ws://' : 'wss://') + url.replace(/^https?:\/\//i, '');
  if (location.protocol === 'https:' && /^ws:\/\//i.test(url) && !/^ws:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)) return stat('Tahle stránka běží přes HTTPS, server proto musí mít adresu wss:// (viz README – tunel).', 1);
  if (!/^[A-Za-z0-9_\-ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž]{2,16}$/.test(name)) return stat('Jméno: 2–16 znaků (písmena, čísla, _ -).', 1);
  lsSet({ srv: url, name, pass: $('oPass').value });
  connect(url, name, $('oAdm').value, $('oPass').value);
};

function closeWs() { intentional = true; try { if (ws) ws.close(); } catch (e) {} ws = null; connecting = false; }
function connect(url, name, admin, pass) {
  connecting = true; intentional = false; stat('Připojuji…');
  let sock;
  try { sock = new WebSocket(url); } catch (e) { connecting = false; return stat('Neplatná adresa serveru.', 1); }
  ws = sock;
  let opened = false, denied = false, welcomed = false;
  const to = setTimeout(() => { if (!opened) { stat('Server neodpovídá.', 1); try { sock.close(); } catch (e) {} } }, 10000);
  sock.onopen = () => { opened = true; clearTimeout(to); send({ t: 'hello', name, admin: admin || undefined, pass: pass || undefined, v: 1 }); };
  sock.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.t === 'deny') { denied = true; stat(m.m || 'Server tě nepustil.', 1); return; }
    if (m.t === 'welcome') { welcomed = true; connecting = false; try { srvLabel = new URL(url.replace(/^ws/i, 'http')).host; } catch (e) { srvLabel = url; } onWelcome(m); return; }
    if (welcomed) onMsg(m);
  };
  sock.onclose = () => {
    clearTimeout(to);
    if (sock !== ws) return;
    connecting = false;
    if (!welcomed) { if (!denied && !intentional) stat(opened ? 'Spojení se serverem se přerušilo.' : 'Nepodařilo se připojit. Běží server a je adresa správně?', 1); return; }
    if (!intentional) { G.msg('Spojení se serverem bylo ztraceno.', 4000); leaveToMenu(); }
  };
  sock.onerror = () => {};
}
function leaveToMenu() {
  const b = $('bMenu'); if (b && b.onclick) b.onclick();
}
G.netLeave = function () {
  if (!G.mp) return;
  try { if (G.mpState() === 'play') send({ t: 'inv', d: G.mpSnap() }); } catch (e) {}
  closeWs();
  G.mp = false; G.net = null; G.chatOpen = false;
  clearOthers(); me = null;
  $('chatLog').style.display = 'none'; $('chatIn').style.display = 'none'; $('plist').style.display = 'none'; $('netBadge').style.display = 'none';
  document.body.classList.remove('mp');
  $('pOnline').style.display = 'none';
};

/* ---------- vstup do světa ---------- */
function onWelcome(m) {
  $('pOnline').style.display = 'none';
  G.mp = true; G.net = api; me = { id: m.id, name: m.name, admin: !!m.admin }; maxPl = m.max || 4;
  document.body.classList.add('mp');
  clearOthers();
  G.mpStart({ title: 'Online · ' + srvLabel, creative: m.mode === 'creative', seed: m.seed, time: m.time, saved: m.saved });
  const e = m.edits || []; for (let i = 0; i + 3 < e.length; i += 4) applyEdit(e[i], e[i + 1], e[i + 2], e[i + 3]);
  for (const k in (m.chests || {})) G.chests.set(k, m.chests[k]);
  const fl = []; for (const k in (m.furn || {})) { const [x, y, z] = k.split(',').map(Number), v = m.furn[k]; fl.push({ x, y, z, t: v.t, r: v.r, txt: v.txt }); }
  if (fl.length) G.furnLoad(fl);
  G.weather.rain = m.rain || 0; G.weather.target = m.rain || 0; G.weather.thunder = !!m.thunder; G.weather.timer = 999;
  (m.players || []).forEach(addOther);
  $('chatLog').textContent = ''; $('chatLog').style.display = 'flex';
  chat({ sys: 1, m: m.motd || 'Vítej!' });
  chat({ sys: 1, m: 'T = chat, Tab = hráči, /help = příkazy.' + (me.admin ? ' Jsi admin.' : '') });
  badge();
}
function badge() {
  const b = $('netBadge'); if (!me) return;
  b.style.display = 'block'; b.textContent = '🌐 ' + srvLabel + ' · ' + (others.size + 1) + '/' + maxPl + (me.admin ? ' · admin' : '');
}

/* ---------- bloky ---------- */
function applyEdit(x, y, z, id) {
  const pa = G.pa; G.pa = false;
  try {
    if (!G.setBlock(x, y, z, id) && !G.isLoaded(x, z) && y >= 0 && y < 128) {
      const k = G.ckey(x >> 4, z >> 4); let mm = G.modsMap.get(k); if (!mm) { mm = {}; G.modsMap.set(k, mm); }
      mm[(y * 16 + (z & 15)) * 16 + (x & 15)] = id;
    }
  } finally { G.pa = pa; }
}
// odesílání vlastních úprav (jen to, co udělal hráč nebo jeho výbuch)
const _sb = G.setBlock;
G.setBlock = function (x, y, z, id) { const r = _sb.call(this, x, y, z, id); if (r && G.mp && G.pa) send({ t: 'edit', x, y, z, id }); return r; };
const _fp = G.furnPlace, _fr = G.furnRemove, _ss = G.signSet;
G.furnPlace = function (x, y, z, type, rot, txt) { const r = _fp.apply(this, arguments); if (r && G.mp && G.pa) send({ t: 'furn', op: 'p', x, y, z, ty: type, r: rot | 0, txt }); return r; };
G.furnRemove = function (x, y, z) {
  const b = G.mp && G.pa ? G.furnBase(x, y, z) : null;
  const r = _fr.apply(this, arguments);
  if (b) send({ t: 'furn', op: 'r', x: b.x, y: b.y, z: b.z });
  return r;
};
G.signSet = function (rec, txt) { _ss.apply(this, arguments); if (G.mp && rec) send({ t: 'furn', op: 't', x: rec.x, y: rec.y, z: rec.z, txt }); };
function remoteFurn(m) {
  const pa = G.pa; G.pa = false;
  try {
    if (m.op === 'p') G.furnPlace(m.x, m.y, m.z, m.ty, m.r, m.txt);
    else if (m.op === 'r') G.furnRemove(m.x, m.y, m.z);
    else if (m.op === 't') { const rec = G.furnBase(m.x, m.y, m.z); if (rec) _ss.call(G, rec, m.txt); }
  } finally { G.pa = pa; }
}

/* ---------- zprávy ze serveru ---------- */
function onMsg(m) {
  switch (m.t) {
    case 'edit': applyEdit(m.x, m.y, m.z, m.id); break;
    case 'furn': remoteFurn(m); break;
    case 'chest': G.chests.set(m.k, m.a); break;
    case 'pos': for (const r of m.p) { const o = others.get(r[0]); if (o) setTarget(o, r); } break;
    case 'join': addOther(m.p); chat({ sys: 1, m: m.p.name + ' se připojil.' }); badge(); break;
    case 'leave': { removeOther(m.id); badge(); break; }
    case 'chat': chat(m); break;
    case 'time': G.time = m.v; break;
    case 'weather': G.setWeather(m.rain, m.thunder); G.weather.timer = 999; break;
    case 'tp': G.mpTp(m.x, m.y, m.z); G.msg('Teleportován', 1500); break;
    case 'admin': me.admin = !!m.on; badge(); break;
    case 'kick': G.msg('Byl jsi vyhozen: ' + (m.r || ''), 6000); intentional = true; setTimeout(leaveToMenu, 50); break;
    case 'pong': break;
  }
}

/* ---------- ostatní hráči ---------- */
function hue(name) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0; return Math.abs(h) % 360; }
function nameTag(name, admin) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const g = c.getContext('2d'); g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(250, g.measureText(name).width + 18);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(128 - w / 2, 4, w, 40);
  g.fillStyle = admin ? '#ffb03c' : '#ffffff'; g.fillText(name, 128, 25, 236);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: false }));
  sp.scale.set(1.8, .34, 1); sp.position.y = 2.35; return sp;
}
function box(w, h, d, color, px, py, pz, pivotY) {
  const geo = new THREE.BoxGeometry(w, h, d); if (pivotY) geo.translate(0, -pivotY, 0);
  const mat = new THREE.MeshBasicMaterial({ color }); mat.userData.base = new THREE.Color(color);
  const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); return m;
}
function addOther(p) {
  if (others.has(p.id)) removeOther(p.id);
  const h = hue(p.name), shirt = new THREE.Color().setHSL(h / 360, .55, .45).getHex(), skin = 0xe0b48e;
  const grp = new THREE.Group();
  const head = box(.5, .5, .5, skin, 0, 1.75, 0), body = box(.5, .75, .25, shirt, 0, 1.125, 0);
  const aL = box(.22, .72, .22, shirt, -.37, 1.5, 0, .33), aR = box(.22, .72, .22, shirt, .37, 1.5, 0, .33);
  const lL = box(.24, .75, .24, 0x35406a, -.13, .75, 0, .375), lR = box(.24, .75, .24, 0x35406a, .13, .75, 0, .375);
  const hair = box(.52, .16, .52, new THREE.Color().setHSL(((h + 40) % 360) / 360, .4, .22).getHex(), 0, 2.02, 0);
  const eL = box(.1, .08, .02, 0x222222, -.12, 1.78, -.26), eR = box(.1, .08, .02, 0x222222, .12, 1.78, -.26);
  // hlava s vlasy a očima se otáčí společně (pivot ve středu hlavy)
  const hg = new THREE.Group(); hg.position.set(0, 1.75, 0);
  for (const m of [head, hair, eL, eR]) { m.position.y -= 1.75; hg.add(m); }
  grp.add(hg, body, aL, aR, lL, lR);
  const tag = nameTag(p.name, p.admin); grp.add(tag);
  grp.visible = false;
  G.scene.add(grp);
  const o = { id: p.id, name: p.name, admin: !!p.admin, grp, hg, aL, aR, lL, lR, tag, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, tx: 0, ty: 0, tz: 0, tyaw: 0, tpitch: 0, spd: 0, phase: 0, seen: false };
  others.set(p.id, o);
  if (p.pos) setTarget(o, [p.id, p.pos.x, p.pos.y, p.pos.z, p.pos.yaw, p.pos.pitch, p.pos.a, p.pos.h, p.pos.f, p.pos.s]);
}
function setTarget(o, r) {
  o.tx = r[1]; o.ty = r[2]; o.tz = r[3]; o.tyaw = r[4]; o.tpitch = r[5]; o.spd = r[6];
  if (!o.seen) { o.seen = true; o.x = o.tx; o.y = o.ty; o.z = o.tz; o.yaw = o.tyaw; o.pitch = o.tpitch; o.grp.visible = true; }
}
function removeOther(id) {
  const o = others.get(id); if (!o) return;
  G.scene.remove(o.grp);
  o.grp.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); } });
  others.delete(id);
}
function clearOthers() { for (const id of [...others.keys()]) removeOther(id); }
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function updateOthers(dt) {
  const k = 1 - Math.exp(-dt * 12), light = .4 + .6 * (G.dayFactor === undefined ? 1 : G.dayFactor);
  for (const o of others.values()) {
    if (!o.seen) continue;
    const px = o.x, pz = o.z;
    o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.z += (o.tz - o.z) * k;
    o.yaw += angDiff(o.yaw, o.tyaw) * k; o.pitch += (o.tpitch - o.pitch) * k;
    const sp = Math.hypot(o.x - px, o.z - pz) / Math.max(dt, 1e-3);
    o.phase += sp * dt * 1.6;
    const amp = Math.min(1, sp / 3.5) * .85, s = Math.sin(o.phase) * amp;
    o.lL.rotation.x = s; o.lR.rotation.x = -s; o.aL.rotation.x = -s; o.aR.rotation.x = s;
    o.grp.position.set(o.x, o.y, o.z); o.grp.rotation.y = o.yaw; o.hg.rotation.x = o.pitch * .8;
    o.tag.visible = Math.hypot(o.x - G.mpPlayer.x, o.z - G.mpPlayer.z) < 70;
    o.grp.traverse((n) => { if (n.material && n.material.userData.base) n.material.color.copy(n.material.userData.base).multiplyScalar(light); });
  }
}

/* ---------- chat ---------- */
const log = $('chatLog'), inp = $('chatIn');
function chat(m) {
  const d = document.createElement('div');
  if (m.sys) { d.className = 'sys'; d.textContent = m.m; }
  else { const b = document.createElement('b'); if (m.admin) b.className = 'adm'; b.textContent = m.from; d.appendChild(b); d.appendChild(document.createTextNode(': ' + m.m)); }
  d.dataset.t = String(performance.now());
  log.appendChild(d); while (log.childNodes.length > 60) log.removeChild(log.firstChild);
  refreshChat();
}
function refreshChat() {
  const now = performance.now();
  for (const d of log.childNodes) d.classList.toggle('old', now - (+d.dataset.t) > 9000);
  log.classList.toggle('open', G.chatOpen);
}
function openChat(pre) {
  if (!G.mp || G.mpState() !== 'play' || G.chatOpen || G.mpUiOpen()) return;
  G.chatOpen = true; for (const k in G.keys) G.keys[k] = false;
  try { document.exitPointerLock(); } catch (e) {}
  inp.style.display = 'block'; inp.value = pre || ''; refreshChat();
  setTimeout(() => inp.focus(), 0);
}
function closeChat(sendIt) {
  const v = inp.value.trim();
  inp.blur(); inp.style.display = 'none'; inp.value = ''; G.chatOpen = false; refreshChat();
  if (sendIt && v) send({ t: 'chat', m: v });
  const gl = $('gl'); try { const p = gl.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
inp.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); closeChat(true); } else if (e.key === 'Escape') { e.preventDefault(); closeChat(false); }
});
inp.addEventListener('keyup', (e) => e.stopPropagation());
window.addEventListener('keydown', (e) => {
  if (!G.mp || e.target === inp) return;
  if (e.code === 'Tab') { e.preventDefault(); showPlist(true); return; }
  if (e.repeat || G.mpState() !== 'play') return;
  if (e.code === 'KeyT' || e.code === 'Enter') { e.preventDefault(); openChat(); }
  else if (e.code === 'Slash') { e.preventDefault(); openChat('/'); }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Tab') showPlist(false); });
$('tChat').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); openChat(); }, { passive: false });
function showPlist(on) {
  const p = $('plist');
  if (!on || !me) { p.style.display = 'none'; return; }
  p.textContent = '';
  const h = document.createElement('h4'); h.textContent = srvLabel + ' · ' + (others.size + 1) + '/' + maxPl; p.appendChild(h);
  const rows = [{ name: me.name, admin: me.admin, me: 1 }, ...[...others.values()]];
  for (const r of rows) {
    const d = document.createElement('div'); const a = document.createElement('span'), b = document.createElement('span');
    a.textContent = r.name + (r.me ? ' (ty)' : ''); if (r.admin) a.style.color = '#ffb03c'; b.textContent = r.admin ? 'admin' : '';
    d.appendChild(a); d.appendChild(b); p.appendChild(d);
  }
  p.style.display = 'block';
}

/* ---------- API pro hru ---------- */
let chatFade = 0;
const api = {
  chest(x, y, z, arr) { send({ t: 'chest', k: x + ',' + y + ',' + z, a: arr.map((s) => (s ? { id: s.id, count: s.count } : null)) }); },
  tick(dt) {
    if (!G.mp) return;
    updateOthers(dt);
    chatFade += dt; if (chatFade > .5) { chatFade = 0; refreshChat(); }
    if (G.mpState() !== 'play') return;
    const p = G.mpPlayer;
    posT += dt; invT += dt; pingT += dt;
    if (posT >= .08) {
      posT = 0;
      send({ t: 'pos', x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), pitch: +p.pitch.toFixed(2), a: +Math.hypot(p.vx, p.vz).toFixed(1), h: G.mpHeld(), f: p.flying ? 1 : 0 });
    }
    if (invT > 6) { invT = 0; send({ t: 'inv', d: G.mpSnap() }); }
    if (pingT > 20) { pingT = 0; send({ t: 'ping', n: 1 }); }
  }
};
window.addEventListener('beforeunload', () => { if (G.mp) { try { send({ t: 'inv', d: G.mpSnap() }); } catch (e) {} } });
G.netApi = api;
G.netDbg = () => ({ me, others: [...others.values()].map((o) => ({ n: o.name, x: o.x, y: o.y, z: o.z, seen: o.seen, vis: o.grp.visible })) });
})();
