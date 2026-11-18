// All sound is synthesised in the browser: short shaped tones, no files and no network. The
// context is created lazily on the first key or click, because browsers only allow audio to
// start from a gesture. Muting simply closes the master gain.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(context.destination);
    } catch {
      context = null;
      master = null;
    }
    return context;
  }

  function unlock() {
    const current = ensure();
    if (current && current.state === 'suspended') current.resume().catch(() => {});
  }

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  function tone(from, to, duration, shape, volume, delay) {
    const current = ensure();
    if (!current || muted) return;
    const start = current.currentTime + (delay || 0);
    const end = start + duration;
    const osc = current.createOscillator();
    const gain = current.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(Math.max(20, from), start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.03);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.32;
    if (!muted) unlock();
  }

  return {
    unlock,
    toggleMute,
    isMuted() {
      return muted;
    },
    shoot() {
      tone(860, 1330, 0.055, 'triangle', 0.09, 0);
    },
    hit() {
      tone(250, 118, 0.065, 'sawtooth', 0.1, 0);
    },
    pickup() {
      tone(620, 930, 0.08, 'sine', 0.15, 0);
      tone(930, 1240, 0.1, 'sine', 0.11, 0.06);
    },
    death() {
      tone(215, 62, 0.24, 'sawtooth', 0.12, 0);
    },
    hurt() {
      tone(128, 48, 0.32, 'sawtooth', 0.2, 0);
      tone(72, 40, 0.4, 'sine', 0.16, 0.02);
    },
    burst() {
      tone(240, 980, 0.26, 'triangle', 0.17, 0);
      tone(120, 400, 0.3, 'sine', 0.12, 0.01);
    },
    wave() {
      tone(440, 660, 0.12, 'square', 0.07, 0);
      tone(660, 880, 0.14, 'square', 0.07, 0.12);
    },
    cleared() {
      tone(540, 760, 0.12, 'triangle', 0.1, 0);
      tone(760, 1080, 0.16, 'triangle', 0.1, 0.11);
    },
    victory() {
      tone(523, 523, 0.16, 'triangle', 0.12, 0);
      tone(659, 659, 0.16, 'triangle', 0.12, 0.14);
      tone(784, 784, 0.18, 'triangle', 0.12, 0.28);
      tone(1046, 1300, 0.5, 'sine', 0.14, 0.44);
    },
    defeat() {
      tone(330, 300, 0.22, 'triangle', 0.13, 0);
      tone(247, 220, 0.24, 'triangle', 0.13, 0.2);
      tone(165, 92, 0.6, 'sawtooth', 0.12, 0.42);
    },
  };
}
