// Procedural placeholder sounds. Each generator returns raw mono samples.
// Real recordings listed in config/assets.ts replace these automatically.

type Gen = (sr: number, variant: number) => Float32Array;

class Biquad {
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  private b0 = 0; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  constructor(private sr: number, private type: 'lp' | 'hp' | 'bp', f: number, q: number) { this.set(f, q); }
  set(f: number, q: number) {
    const w = (2 * Math.PI * Math.min(f, this.sr * 0.45)) / this.sr;
    const cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    const a0 = 1 + alpha;
    if (this.type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
    else if (this.type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

function env(t: number, dur: number, a: number, r: number) {
  if (t < a) return t / a;
  if (t > dur - r) return Math.max(0, (dur - t) / r);
  return 1;
}

function normalize(out: Float32Array, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < out.length; i++) m = Math.max(m, Math.abs(out[i]));
  if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= peak / m;
  return out;
}

interface VoiceSpec {
  dur: number;
  pitch: (t: number) => number;
  formants: (t: number) => [number, number, number][]; // [freq, q, gain]
  noise?: (t: number) => number;
  noiseBand?: [number, number];
  jitter?: number;
  sub?: number; // subharmonic growl amount
  drive?: number;
  attack?: number;
  release?: number;
  seed?: number;
  lowpass?: number;
}

function voice(sr: number, v: VoiceSpec) {
  const n = Math.floor(v.dur * sr);
  const out = new Float32Array(n);
  const r = rand(v.seed ?? 7);
  const fs = v.formants(0).map(([f, q]) => new Biquad(sr, 'bp', f, q));
  const nb = new Biquad(sr, 'bp', v.noiseBand ? (v.noiseBand[0] + v.noiseBand[1]) / 2 : 1500, 1.2);
  const lp = new Biquad(sr, 'lp', v.lowpass ?? 7000, 0.7);
  let phase = 0, sphase = 0, jit = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i % 64 === 0) {
      const spec = v.formants(t);
      spec.forEach(([f, q], k) => fs[k].set(f, q));
      jit = (v.jitter ?? 0) * r();
    }
    const f0 = v.pitch(t) * (1 + jit);
    phase += f0 / sr; if (phase > 1) phase -= 1;
    sphase += f0 / 2 / sr; if (sphase > 1) sphase -= 1;
    let src = (2 * phase - 1) * 0.8 + (phase < 0.3 ? 0.5 : -0.2);
    if (v.sub) src += (v.sub ?? 0) * (sphase < 0.5 ? 1 : -1) * 0.6;
    const spec = v.formants(t);
    let s = 0;
    for (let k = 0; k < fs.length; k++) s += fs[k].run(src) * spec[k][2];
    const nz = v.noise ? v.noise(t) : 0;
    if (nz > 0) s += nb.run(r()) * nz * 3;
    s = lp.run(s);
    if (v.drive) s = Math.tanh(s * v.drive);
    out[i] = s * env(t, v.dur, v.attack ?? 0.02, v.release ?? 0.1);
  }
  return normalize(out, 0.85);
}

// Simple tone with pitch sweep.
function tone(sr: number, dur: number, f0: number, f1: number, wave: 'sq' | 'saw' | 'tri' | 'sin', opts: { vib?: number; vibRate?: number; noise?: number; a?: number; curve?: number; duty?: number; seed?: number } = {}) {
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const r = rand(opts.seed ?? 3);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    let f = f0 * Math.pow(f1 / f0, Math.pow(k, opts.curve ?? 1));
    if (opts.vib) f *= 1 + opts.vib * Math.sin(2 * Math.PI * (opts.vibRate ?? 8) * t);
    ph = (ph + f / sr) % 1;
    let s = 0;
    switch (wave) {
      case 'sq': s = ph < (opts.duty ?? 0.5) ? 0.6 : -0.6; break;
      case 'saw': s = 2 * ph - 1; break;
      case 'tri': s = 1 - 4 * Math.abs(ph - 0.5); break;
      case 'sin': s = Math.sin(2 * Math.PI * ph); break;
    }
    if (opts.noise) s = s * (1 - opts.noise) + r() * opts.noise;
    out[i] = s * env(t, dur, opts.a ?? 0.004, dur * 0.6);
  }
  return out;
}

function noise(sr: number, dur: number, type: 'lp' | 'hp' | 'bp', f0: number, f1: number, q = 0.8, seed = 5, decayPow = 1) {
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const r = rand(seed);
  const flt = new Biquad(sr, type, f0, q);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    if (i % 32 === 0) flt.set(lerp(f0, f1, k), q);
    out[i] = flt.run(r()) * Math.pow(1 - k, decayPow) * Math.min(1, i / (sr * 0.002));
  }
  return normalize(out, 0.8);
}

function mix(...parts: [Float32Array, number, number?][]) {
  // [samples, gain, offsetSamples]
  let len = 0;
  for (const [s, , o = 0] of parts) len = Math.max(len, s.length + o);
  const out = new Float32Array(len);
  for (const [s, g, o = 0] of parts) for (let i = 0; i < s.length; i++) out[i + o] += s[i] * g;
  return out;
}

function seq(sr: number, notes: [number, number][], wave: 'sq' | 'tri' | 'saw' | 'sin', noteDur: number, duty = 0.5) {
  // notes: [freq, startSec]
  return mix(...notes.map(([f, s]) => [tone(sr, noteDur, f, f, wave, { duty }), 0.5, Math.floor(s * sr)] as [Float32Array, number, number]));
}

const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12); // semitones from C4

export const GENERATORS: Record<string, Gen> = {
  // ---- the two most important sounds in the game ----
  vo_yee: (sr, v) => {
    const k = [1, 1.06, 0.95][v % 3];
    const dur = [0.5, 0.44, 0.56][v % 3];
    return voice(sr, {
      dur, seed: 11 + v,
      pitch: (t) => k * (t < 0.1 ? lerp(470, 780, t / 0.1) : lerp(780, 690, (t - 0.1) / (dur - 0.1))) * (1 + 0.025 * Math.sin(2 * Math.PI * 7 * t)),
      formants: (t) => [[lerp(380, 290, t * 8), 7, 1.2], [lerp(2000, 2500, t * 6), 11, 1.6], [3150, 12, 1.0], [260, 4, 0.6]],
      noise: (t) => (t < 0.05 ? 0.25 : 0.03), noiseBand: [3000, 6000], jitter: 0.004, drive: 1.6, attack: 0.012, release: 0.14,
    });
  },
  vo_yeghhh: (sr, v) => {
    const k = [1, 0.92, 1.08][v % 3];
    const dur = [0.68, 0.6, 0.74][v % 3];
    return voice(sr, {
      dur, seed: 23 + v,
      pitch: (t) => k * lerp(118, 82, t / dur),
      formants: (t) => [[lerp(560, 640, t * 2), 5, 1.4], [lerp(1750, 1150, t * 2), 7, 1.1], [2500, 8, 0.6], [140, 3, 0.8]],
      noise: (t) => lerp(0.08, 0.75, (t - 0.18) / 0.35), noiseBand: [900, 2600], jitter: 0.09, sub: 0.55, drive: 3.2, attack: 0.02, release: 0.16, lowpass: 3200,
    });
  },
  vo_bear: (sr, v) => {
    const dur = 0.7 + (v % 3) * 0.12;
    return voice(sr, {
      dur, seed: 41 + v,
      pitch: (t) => 200 + 70 * Math.sin(2 * Math.PI * (3 + v) * t) + (t > dur * 0.6 ? 40 : 0),
      formants: (t) => { const syl = Math.floor(t * 7) % 2; return [[syl ? 480 : 650, 6, 1.3], [syl ? 850 : 1100, 8, 1], [2400, 9, 0.3]]; },
      jitter: 0.01, drive: 1.3, release: 0.15,
    });
  },
  vo_bear_sob: (sr, v) => voice(sr, {
    dur: 0.9, seed: 51 + v,
    pitch: (t) => 260 - 120 * t + 30 * Math.sin(2 * Math.PI * 9 * t),
    formants: () => [[700, 6, 1.2], [1100, 8, 1], [2600, 10, 0.4]],
    noise: (t) => 0.15 + 0.2 * Math.max(0, Math.sin(2 * Math.PI * 4 * t)), noiseBand: [1500, 3000], jitter: 0.04, drive: 1.6,
  }),

  // ---- weapons ----
  sfx_mik: (sr) => mix([tone(sr, 0.08, 900, 1600, 'sq', { duty: 0.3 }), 0.5], [noise(sr, 0.05, 'hp', 3000, 5000), 0.15]),
  sfx_charge: (sr) => tone(sr, 0.6, 250, 1200, 'sq', { vib: 0.05, vibRate: 30, duty: 0.25 }),
  sfx_yee_blast: (sr) => mix([GENERATORS.vo_yee(sr, 1), 0.7], [noise(sr, 0.35, 'bp', 2000, 400, 1.5), 0.6], [tone(sr, 0.3, 500, 120, 'saw'), 0.4]),
  sfx_shotgun: (sr) => mix([noise(sr, 0.3, 'lp', 3000, 300, 0.7, 9, 2), 0.9], [tone(sr, 0.15, 120, 40, 'sin'), 0.8]),
  sfx_uzi: (sr) => mix([noise(sr, 0.05, 'bp', 2500, 1200, 1.2, 12, 2), 0.7], [tone(sr, 0.04, 260, 120, 'sq'), 0.3]),
  sfx_chainsaw: (sr) => tone(sr, 0.3, 95, 105, 'saw', { vib: 0.15, vibRate: 40, noise: 0.3 }),
  sfx_bat: (sr) => mix([noise(sr, 0.12, 'bp', 800, 2500, 1.5), 0.6], [tone(sr, 0.12, 220, 110, 'tri'), 0.6]),
  sfx_swing: (sr) => noise(sr, 0.13, 'bp', 600, 2600, 2, 4),
  sfx_throw: (sr) => noise(sr, 0.1, 'bp', 1200, 3000, 2.5, 6),
  sfx_hit: (sr) => mix([noise(sr, 0.07, 'lp', 2500, 600, 0.7, 2, 2), 0.7], [tone(sr, 0.07, 190, 90, 'sq'), 0.4]),
  sfx_melee_hit: (sr) => mix([noise(sr, 0.1, 'lp', 1800, 300, 0.8, 8, 2), 0.8], [tone(sr, 0.1, 140, 60, 'sin'), 0.9]),
  sfx_splat: (sr) => mix([noise(sr, 0.18, 'lp', 1500, 200, 1.2, 15, 1.5), 0.8], [tone(sr, 0.12, 300, 80, 'sin'), 0.4]),
  sfx_parry: (sr) => mix([tone(sr, 0.25, 1900, 1800, 'sin'), 0.6], [tone(sr, 0.25, 2850, 2800, 'sin'), 0.3], [noise(sr, 0.04, 'hp', 4000, 6000), 0.3]),
  sfx_reflect: (sr) => tone(sr, 0.12, 1200, 2200, 'sq', { duty: 0.2 }),
  sfx_enemy_die: (sr) => mix([noise(sr, 0.2, 'lp', 3000, 200, 0.7, 31, 1.5), 0.6], [tone(sr, 0.22, 700, 90, 'sq', { duty: 0.3 }), 0.4]),
  sfx_explode: (sr) => mix([noise(sr, 0.7, 'lp', 2000, 80, 0.7, 33, 1.6), 1], [tone(sr, 0.5, 90, 30, 'sin'), 0.9]),
  sfx_hurt: (sr) => tone(sr, 0.28, 330, 120, 'saw', { vib: 0.08, vibRate: 25 }),
  sfx_land: (sr) => mix([noise(sr, 0.05, 'lp', 600, 200, 0.7, 3, 2), 0.6], [tone(sr, 0.05, 90, 50, 'sin'), 0.6]),
  sfx_pickup: (sr) => seq(sr, [[N(12), 0], [N(16), 0.05], [N(19), 0.1], [N(24), 0.15]], 'sq', 0.09, 0.25),
  sfx_heal: (sr) => seq(sr, [[N(7), 0], [N(12), 0.06], [N(16), 0.12], [N(19), 0.18], [N(24), 0.24]], 'tri', 0.12),
  sfx_ammo: (sr) => seq(sr, [[N(5), 0], [N(10), 0.05]], 'sq', 0.08, 0.5),
  sfx_ready: (sr) => seq(sr, [[N(19), 0], [N(24), 0.08], [N(31), 0.16]], 'sin', 0.2),
  sfx_checkpoint: (sr) => seq(sr, [[N(12), 0], [N(19), 0.08], [N(24), 0.16], [N(28), 0.24]], 'tri', 0.15),
  sfx_fart: (sr, v) => {
    const dur = 0.45 + (v % 4) * 0.12;
    const base = [70, 95, 58, 120][v % 4];
    return mix([tone(sr, dur, base * 1.3, base, 'sq', { vib: 0.25, vibRate: 13 + v * 5, duty: 0.18, noise: 0.25, seed: v + 1 }), 0.8], [noise(sr, dur, 'lp', 500, 200, 1, 40 + v, 0.7), 0.4]);
  },
  sfx_burst: (sr) => mix([GENERATORS.sfx_fart(sr, 2), 0.6], [noise(sr, 0.25, 'lp', 2500, 300, 0.7, 77, 2), 0.7]),
  sfx_cheer: (sr) => {
    const n = noise(sr, 1.6, 'bp', 1200, 1800, 0.6, 61, 0.6);
    const r = rand(5);
    for (let i = 0; i < n.length; i++) n[i] *= 0.6 + 0.4 * Math.sin(i / sr * 11 + r() * 0.2);
    return mix([n, 0.8], [GENERATORS.vo_yee(sr, 2), 0.2, Math.floor(sr * 0.2)]);
  },
  sfx_fanfare: (sr) => seq(sr, [[N(7), 0], [N(7), 0.12], [N(7), 0.24], [N(12), 0.36], [N(16), 0.6], [N(19), 0.8]], 'saw', 0.22),
  sfx_flop: (sr) => seq(sr, [[N(4), 0], [N(3), 0.25], [N(2), 0.5], [N(1), 0.75]], 'saw', 0.3),
  sfx_rave: (sr) => mix([seq(sr, [[N(0), 0], [N(3), 0], [N(7), 0], [N(0), 0.18], [N(3), 0.18], [N(7), 0.18]], 'saw', 0.15), 0.7], [noise(sr, 0.4, 'hp', 2000, 8000, 0.7, 4), 0.2]),
  sfx_slam: (sr) => mix([noise(sr, 0.6, 'lp', 900, 60, 0.7, 88, 1.4), 1], [tone(sr, 0.5, 70, 28, 'sin'), 1]),
  sfx_warn: (sr) => seq(sr, [[880, 0], [660, 0.12]], 'sq', 0.1, 0.5),
  sfx_boing: (sr) => tone(sr, 0.2, 260, 620, 'sin', { vib: 0.2, vibRate: 18 }),
  sfx_plip: (sr) => tone(sr, 0.06, 1300, 500, 'sin'),
  sfx_whoosh: (sr) => noise(sr, 0.5, 'bp', 300, 1800, 1.2, 14, 0.8),
  sfx_shatter: (sr) => mix([noise(sr, 0.4, 'hp', 3000, 7000, 0.7, 70, 1.4), 0.7], [seq(sr, [[N(36), 0], [N(31), 0.05], [N(40), 0.1]], 'sin', 0.12), 0.4]),
  sfx_sparkle: (sr) => seq(sr, [[N(24), 0], [N(31), 0.05], [N(28), 0.1], [N(36), 0.15], [N(33), 0.2], [N(40), 0.25]], 'sin', 0.12),
  sfx_ui_move: (sr) => tone(sr, 0.04, 600, 700, 'sq', { duty: 0.25 }),
  sfx_ui_select: (sr) => seq(sr, [[N(12), 0], [N(19), 0.05]], 'sq', 0.08, 0.25),
  sfx_ui_back: (sr) => seq(sr, [[N(7), 0], [N(0), 0.05]], 'sq', 0.08, 0.25),
  sfx_death: (sr) => seq(sr, [[N(7), 0], [N(6), 0.15], [N(5), 0.3], [N(-12), 0.45]], 'sq', 0.25, 0.4),
  sfx_victory: (sr) => seq(sr, [[N(0), 0], [N(4), 0.1], [N(7), 0.2], [N(12), 0.3], [N(7), 0.45], [N(12), 0.55], [N(16), 0.65], [N(19), 0.75]], 'sq', 0.2, 0.3),
  sfx_stamp: (sr) => mix([noise(sr, 0.15, 'lp', 1500, 200, 0.7, 5, 2), 0.9], [tone(sr, 0.15, 110, 50, 'sin'), 1]),
  sfx_phone: (sr) => mix([tone(sr, 0.4, 440, 440, 'sin'), 0.4], [tone(sr, 0.4, 480, 480, 'sin'), 0.4], [tone(sr, 0.4, 440, 440, 'sin'), 0.4, Math.floor(sr * 0.5)], [tone(sr, 0.4, 480, 480, 'sin'), 0.4, Math.floor(sr * 0.5)]),
};

// How many variants each generated sound has (picked round-robin to avoid repetition).
export const VARIANTS: Record<string, number> = { vo_yee: 3, vo_yeghhh: 3, vo_bear: 3, vo_bear_sob: 2, sfx_fart: 4 };

// ---- drum hits for the music sequencer ----
export const DRUMS: Record<string, Gen> = {
  kick: (sr) => mix([tone(sr, 0.18, 150, 40, 'sin', { curve: 0.4 }), 1]),
  snare: (sr) => mix([noise(sr, 0.16, 'bp', 2200, 1600, 0.8, 9, 1.5), 0.8], [tone(sr, 0.08, 220, 160, 'tri'), 0.4]),
  hat: (sr) => noise(sr, 0.04, 'hp', 7000, 8000, 0.7, 4, 2),
  clap: (sr) => mix([noise(sr, 0.03, 'bp', 1500, 1500, 1, 1, 1), 0.7], [noise(sr, 0.03, 'bp', 1500, 1500, 1, 2, 1), 0.7, Math.floor(sr * 0.012)], [noise(sr, 0.12, 'bp', 1400, 1200, 1, 3, 1.5), 0.8, Math.floor(sr * 0.024)]),
};
