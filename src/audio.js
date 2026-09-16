// WebAudio chiptune: synthesized SFX and a looping background melody. No audio files needed.

let ctx = null;
let master = null;
let musicGain = null;
let muted = false;
let musicTimer = null;

function ensure() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(master);
  return ctx;
}

/** Must be called from a user gesture once (browsers block autoplay). */
export function unlock() {
  ensure();
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
}
export function isMuted() { return muted; }

function tone({ freq, type = 'square', dur = 0.12, at = 0, vol = 0.4, slide = 0, dest }) {
  const c = ensure();
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(dest || master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  pickup() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, at: i * 0.06, dur: 0.14, vol: 0.3 })); },
  wrong()  { tone({ freq: 180, type: 'sawtooth', dur: 0.25, slide: -100, vol: 0.35 }); },
  tick()   { tone({ freq: 1200, dur: 0.04, vol: 0.15 }); },
  click()  { tone({ freq: 900, type: 'triangle', dur: 0.05, vol: 0.2 }); },
  win() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, at: i * 0.11, dur: 0.22, vol: 0.3 }));
  },
  lose() {
    [400, 350, 300, 200].forEach((f, i) => tone({ freq: f, type: 'sawtooth', at: i * 0.18, dur: 0.3, vol: 0.3 }));
  },
  alarm() { for (let i = 0; i < 4; i++) tone({ freq: i % 2 ? 660 : 880, at: i * 0.12, dur: 0.1, vol: 0.25 }); },
};

// ---------- Background melody ----------
const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G3: 196, A3: 220, F3: 175, E3: 165 };
// [note, beats]; a sneaky little tune in A minor.
const MELODY = [
  ['A4', 1], ['C5', 1], ['E5', 1], ['C5', 1], ['A4', 1], ['E4', 1], ['A4', 2],
  ['G4', 1], ['B4', 1], ['D5', 1], ['B4', 1], ['G4', 1], ['D4', 1], ['G4', 2],
  ['F4', 1], ['A4', 1], ['C5', 1], ['A4', 1], ['F4', 1], ['C4', 1], ['F4', 2],
  ['E4', 1], ['G4', 1], ['B4', 1], ['G4', 1], ['E4', 2], ['E5', 2],
];
const BASS = ['A3', 'G3', 'F3', 'E3'];
const BPM = 150;

export function startMusic() {
  if (musicTimer) return;
  const c = ensure();
  const beat = 60 / BPM;
  let step = 0;
  let bar = 0;
  let next = c.currentTime + 0.1;
  const schedule = () => {
    while (next < c.currentTime + 0.5) {
      const [note, beats] = MELODY[step];
      tone({ freq: N[note], type: 'square', at: next - c.currentTime, dur: beat * beats * 0.9, vol: 0.5, dest: musicGain });
      if (step % 8 === 0) {
        for (let b = 0; b < 8; b += 2) tone({ freq: N[BASS[bar % 4]], type: 'triangle', at: next - c.currentTime + b * beat, dur: beat * 1.5, vol: 0.6, dest: musicGain });
        bar++;
      }
      next += beat * beats;
      step = (step + 1) % MELODY.length;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, 200);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}
