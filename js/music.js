/* ===========================================================
   music.js – procedurální "good vibe" hudba (WebAudio, žádné soubory)
   Lo-fi smyčka: měkké elektrické piano, teplý bas, jemný šum vinylu a brush bubínek.
   Spouští se po prvním doteku/kliknutí; tlačítko ♪ v HUD a v pauze zapíná/vypíná.
   =========================================================== */
(function () {
'use strict';
let ac = null, master = null, started = false, on = true, nextT = 0, bar = 0, timer = 0, vol = 0.5;
try { const v = localStorage.getItem('perlicky_music'); if (v === '0') on = false; const w = parseFloat(localStorage.getItem('perlicky_vol')); if (w >= 0 && w <= 1) vol = w; } catch (e) {}
const BPM = 76, BEAT = 60 / BPM;
const mid = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Cmaj7 – Am7 – Dm7 – G7 (jemně slunečná smyčka) a variace Fmaj7 – Em7 – Dm7 – G7sus
const PROG = [
  [[60, 64, 67, 71], 48], [[57, 60, 64, 67], 45], [[62, 65, 69, 72], 50], [[59, 62, 65, 67], 43],
  [[65, 69, 72, 76], 41], [[59, 62, 67, 71], 40], [[62, 65, 69, 72], 50], [[60, 65, 67, 70], 43]
];
const MEL = [ // pentatonika C dur; [krok v osminách, nota, délka v osminách]
  [[0, 79, 3], [4, 76, 2], [6, 74, 2]], [[0, 72, 2], [3, 76, 3], [6, 79, 2]],
  [[0, 77, 3], [4, 74, 2], [6, 72, 2]], [[0, 74, 4], [5, 71, 3]],
  [[0, 81, 3], [4, 79, 2], [6, 76, 2]], [[0, 74, 2], [3, 79, 3], [6, 76, 2]],
  [[0, 77, 2], [3, 74, 3], [6, 69, 2]], [[0, 72, 6]]
];
function env(g, t, a, d, peak, end) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function epiano(t, note, dur, v) {
  const f = mid(note), g = ac.createGain(), o1 = ac.createOscillator(), o2 = ac.createOscillator(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
  o1.type = 'sine'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.005; g2.gain.value = 0.22;
  lp.type = 'lowpass'; lp.frequency.value = 2400;
  env(g, t, 0.008, dur, v);
  o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(dry); lp.connect(wet);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}
function bass(t, note, dur) {
  const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = mid(note); lp.type = 'lowpass'; lp.frequency.value = 420;
  env(g, t, 0.02, dur, 0.38); o.connect(lp); lp.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + 0.1);
}
let noiseBuf = null;
function noise(t, dur, freq, v, q) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 0.8; env(g, t, 0.003, dur, v);
  s.connect(f); f.connect(g); g.connect(dry); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function kick(t) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); env(g, t, 0.003, 0.22, 0.55);
  o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.3);
}
let dry, wet;
function build() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  ac = new AC(); master = ac.createGain(); master.gain.value = on ? vol * 0.55 : 0; master.connect(ac.destination); G._an = ac.createAnalyser(); G._an.fftSize = 2048; master.connect(G._an);
  dry = ac.createGain(); dry.connect(master);
  // jednoduchý reverb z impulzu šumu
  const conv = ac.createConvolver(), len = ac.sampleRate * 2.2, ib = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  conv.buffer = ib; wet = ac.createGain(); wet.gain.value = 0.42; wet.connect(conv); conv.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // šum vinylu
  const vs = ac.createBufferSource(); vs.buffer = noiseBuf; vs.loop = true; const vf = ac.createBiquadFilter(), vg = ac.createGain();
  vf.type = 'highpass'; vf.frequency.value = 3500; vg.gain.value = 0.012; vs.connect(vf); vf.connect(vg); vg.connect(master); vs.start();
  return true;
}
function schedule() {
  if (!ac) return;
  while (nextT < ac.currentTime + 1.2) {
    const t = nextT, i = bar % PROG.length, ch = PROG[i][0], bn = PROG[i][1], barLen = BEAT * 4, e8 = BEAT / 2;
    // akord – lehce arpeggiovaný, švihnutá synkopa
    ch.forEach((n, k) => epiano(t + k * 0.022, n, barLen * 0.9, 0.13));
    epiano(t + BEAT * 2.5, ch[2], BEAT * 1.4, 0.07);
    bass(t, bn, BEAT * 1.6); bass(t + BEAT * 2.5, bn, BEAT * 1.2); if (bar % 2) bass(t + BEAT * 3.5, bn + 7, BEAT * 0.6);
    // melodie – jen každý druhý takt, ať dýchá
    if (bar % 2 === 0 || bar % 8 === 5) for (const [st, n, ln] of MEL[i]) epiano(t + st * e8 + (Math.random() - 0.5) * 0.012, n, ln * e8, 0.1);
    // beat
    kick(t); kick(t + BEAT * 2.25); noise(t + BEAT, 0.16, 1800, 0.14, 0.7); noise(t + BEAT * 3, 0.16, 1800, 0.14, 0.7);
    for (let h = 0; h < 8; h++) noise(t + h * e8 + (h % 2 ? 0.018 : 0), 0.045, 7500, h % 2 ? 0.05 : 0.08, 1.2);
    nextT += barLen; bar++;
  }
}
G.musicStart = function () {
  if (started) { if (ac && ac.state === 'suspended') ac.resume(); return; }
  try { if (!build()) return; } catch (e) { return; }
  started = true; ac.resume && ac.resume(); nextT = ac.currentTime + 0.15; schedule();
  timer = setInterval(schedule, 400);
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (on) ac.resume(); });
};
G.musicSet = function (v) {
  on = !!v; try { localStorage.setItem('perlicky_music', on ? '1' : '0'); } catch (e) {}
  if (on) G.musicStart();
  if (master) master.gain.setTargetAtTime(on ? vol * 0.55 : 0, ac.currentTime, 0.15);
  document.querySelectorAll('.musicBtn').forEach(b => { b.textContent = on ? '♪ Hudba: zapnuta' : '♪ Hudba: vypnuta'; b.classList.toggle('off', !on); b.title = on ? 'Hudba zapnuta' : 'Hudba vypnuta'; });
};
G.musicOn = () => on;
G.musicVol = function (v) { vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('perlicky_vol', vol); } catch (e) {} if (master && on) master.gain.setTargetAtTime(vol * 0.55, ac.currentTime, 0.1); };
// spuštění po prvním gestu uživatele
const first = () => { if (on) G.musicStart(); else if (!started) { /* nespouštět */ } };
['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, first, { once: false, passive: true, capture: true }));
window.addEventListener('DOMContentLoaded', () => G.musicSet(on));
})();
