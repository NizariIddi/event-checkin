// Loud success beep made with the Web Audio API (no sound file needed).
// Shared by the whole app: the audio is unlocked on the user's first touch.
const Ctx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

const getCtx = () => {
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
};

const unlock = () => {
  try {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
  } catch {}
};

['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((e) =>
  document.addEventListener(e, unlock, { passive: true })
);

export function beep() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();

    // Compressor lets us push the volume to the maximum without crackling
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 12;
    comp.connect(c.destination);

    // Two quick pulses: square wave at ~2 kHz is loud and cuts through noise
    const pulse = (start, dur) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = 2000;               // pitch in Hz (higher = sharper)
      gain.gain.setValueAtTime(1, start);       // volume: 0 to 1 (1 = maximum)
      gain.gain.setValueAtTime(1, start + dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, start + dur);
      osc.connect(gain);
      gain.connect(comp);
      osc.start(start);
      osc.stop(start + dur);
    };

    const t = c.currentTime + 0.005;
    pulse(t, 0.12);
    pulse(t + 0.18, 0.12);
  } catch {}

  try { navigator.vibrate?.(120); } catch {}
}