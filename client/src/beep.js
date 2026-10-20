// Loud success beep. No sound file needed: the sound is generated once in memory
// and played through a normal <audio> element (instant, and works on Chrome + Firefox).
// If that is ever blocked, it falls back to the Web Audio API.
// Open the browser console (F12) to see a warning if the browser refuses to play it.

function makeWavUrl() {
  const rate = 44100;
  const pulse = 0.12, gap = 0.06;                       // seconds
  const total = Math.floor(rate * (pulse * 2 + gap));
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, total * 2, true);
  const freq = 2000;                                    // pitch in Hz (higher = sharper)
  const amp = 1;                                     // volume: 0 to 1 (maximum is 1)
  for (let i = 0; i < total; i++) {
    const t = i / rate;
    const inPulse = t < pulse || (t >= pulse + gap && t < pulse * 2 + gap);
    const local = t < pulse ? t : t - pulse - gap;
    const fade = inPulse ? Math.min(1, (pulse - local) / 0.01) : 0;   // tiny fade-out, avoids a click
    const square = Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1;    // square wave = loudest
    v.setInt16(44 + i * 2, Math.round(square * amp * Math.max(0, fade) * 32767), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

let audio = null;
try {
  audio = new Audio(makeWavUrl());
  audio.preload = 'auto';
  audio.volume = 1;
  audio.load();
} catch (e) { console.warn('Beep: could not prepare audio', e); }

// ---- Web Audio fallback ----
const Ctx = window.AudioContext || window.webkitAudioContext;
let ctx = null;
const getCtx = () => (Ctx ? (ctx ||= new Ctx()) : null);

function webAudioBeep() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const t = c.currentTime + 0.01;
    [0, 0.18].forEach((d) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = 2000;
      gain.gain.value = 1;
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t + d); osc.stop(t + d + 0.12);
    });
  } catch (e) { console.warn('Beep (web audio) failed', e); }
}

// ---- Unlock sound on the first touch/click (browsers require this) ----
let unlocked = false;
function unlock() {
  if (unlocked) return;
  try {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
    if (audio) {
      audio.muted = true;
      const p = audio.play();
      const done = () => { audio.pause(); audio.currentTime = 0; audio.muted = false; unlocked = true; };
      if (p && p.then) p.then(done).catch(() => { audio.muted = false; }); else done();
    }
  } catch { /* ignore */ }
}
['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((e) =>
  document.addEventListener(e, unlock, { passive: true })
);

export function beep() {
  let played = false;
  if (audio) {
    try {
      audio.muted = false;
      audio.volume = 1;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) p.catch((e) => { console.warn('Beep blocked, using fallback:', e); webAudioBeep(); });
      played = true;
    } catch (e) { console.warn('Beep failed:', e); }
  }
  if (!played) webAudioBeep();
  try { navigator.vibrate?.(120); } catch { /* ignore */ }
}