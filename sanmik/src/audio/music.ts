// Placeholder chiptune tracks, written as data for a tiny step sequencer.

export interface NoteEv { step: number; midi: number; len: number; ch: 'lead' | 'bass' | 'pad' | 'arp' }
export interface Track {
  bpm: number;
  steps: number; // 16th-note steps in the loop
  notes: NoteEv[];
  drums: Partial<Record<'kick' | 'snare' | 'hat' | 'clap', number[]>>;
  wave: { lead: OscillatorType; bass: OscillatorType; pad: OscillatorType; arp: OscillatorType };
  gain?: number;
}

const C4 = 60;

function pattern(str: string, len: number) {
  // 'x' = hit, '.' = rest. Repeated to fill len.
  const out: number[] = [];
  const s = str.replace(/\s/g, '');
  for (let i = 0; i < len; i++) if (s[i % s.length] === 'x') out.push(i);
  return out;
}

function melody(ch: NoteEv['ch'], line: string, base = C4): NoteEv[] {
  // tokens per 16th: semitone offset number, '-' rest, '=' hold previous
  const toks = line.trim().split(/\s+/);
  const out: NoteEv[] = [];
  let cur: NoteEv | null = null;
  toks.forEach((t, i) => {
    if (t === '=') { if (cur) cur.len++; return; }
    if (t === '-') { cur = null; return; }
    cur = { step: i, midi: base + Number(t), len: 1, ch };
    out.push(cur);
  });
  return out;
}

function arp(ch: NoteEv['ch'], chords: number[][], stepsPer: number, order: number[], base: number, every = 1): NoteEv[] {
  const out: NoteEv[] = [];
  chords.forEach((chord, ci) => {
    for (let s = 0; s < stepsPer; s += every) {
      const idx = order[(s / every) % order.length];
      if (idx < 0) continue;
      out.push({ step: ci * stepsPer + s, midi: base + chord[idx % chord.length] + (idx >= chord.length ? 12 : 0), len: every, ch });
    }
  });
  return out;
}

function bass(roots: number[], stepsPer: number, rhythm: string, base: number): NoteEv[] {
  const out: NoteEv[] = [];
  roots.forEach((r, ci) => {
    pattern(rhythm, stepsPer).forEach((s) => out.push({ step: ci * stepsPer + s, midi: base + r, len: 2, ch: 'bass' }));
  });
  return out;
}

function pads(chords: number[][], stepsPer: number, base: number): NoteEv[] {
  return chords.flatMap((c, ci) => c.map((n) => ({ step: ci * stepsPer, midi: base + n, len: stepsPer, ch: 'pad' as const })));
}

const maj = (r: number) => [r, r + 4, r + 7];
const min = (r: number) => [r, r + 3, r + 7];

export const TRACKS: Record<string, Track> = {
  mus_title: {
    bpm: 94, steps: 64, gain: 0.9,
    wave: { lead: 'square', bass: 'triangle', pad: 'sawtooth', arp: 'square' },
    notes: [
      ...bass([0, 0, -4, -2], 16, 'x..x..x...x.x...', 36),
      ...melody('lead', '12 = - 12 15 - 12 - 10 = = - 7 = - - 12 = - 12 15 - 17 - 15 = 12 = 10 = - - 8 = - 8 12 - 8 - 7 = = - 5 = - - 10 = - 10 14 - 15 - 17 = = = 15 = - -', 60),
    ],
    drums: { kick: pattern('x.....x...x.....', 64), snare: pattern('....x.......x...', 64), hat: pattern('x.x.x.x.x.x.x.xx', 64) },
  },
  mus_intro: {
    bpm: 66, steps: 64, gain: 0.8,
    wave: { lead: 'triangle', bass: 'triangle', pad: 'triangle', arp: 'sine' },
    notes: [...pads([min(9), maj(5), maj(0), maj(7)], 16, 48), ...arp('arp', [min(9), maj(5), maj(0), maj(7)], 16, [0, 1, 2, 3, 2, 1], 60, 2)],
    drums: {},
  },
  mus_tesko: {
    bpm: 112, steps: 64, gain: 0.75,
    wave: { lead: 'sine', bass: 'triangle', pad: 'triangle', arp: 'sine' },
    notes: [
      ...bass([2, 7, 0, 9], 16, 'x..x..x.x..x..x.', 36),
      ...arp('arp', [[2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [9, 12, 16, 19]], 16, [0, -1, 2, -1, 1, 3, -1, 2], 60, 2),
      ...melody('lead', '- - - - 14 = 12 = 9 = = = - - - - - - - - 11 = 14 = 17 = = = - - - - - - - - 12 = 11 = 7 = = = - - - - - - - - 16 = 14 = 12 = = = = = = =', 60),
    ],
    drums: { kick: pattern('x.......x.......', 64), hat: pattern('..x...x...x...x.', 64), snare: pattern('...x..x....x..x.', 64) },
  },
  mus_forest: {
    bpm: 128, steps: 64, gain: 0.8,
    wave: { lead: 'square', bass: 'triangle', pad: 'triangle', arp: 'triangle' },
    notes: [
      ...bass([0, 5, 7, 0], 16, 'x...x...x...x.x.', 36),
      ...arp('arp', [maj(0), maj(5), maj(7), maj(0)], 16, [0, 1, 2, 3], 72, 2),
      ...melody('lead', '7 = 9 = 12 = = = 9 = 7 = 4 = = = 5 = 9 = 12 = = = 14 = 12 = 9 = = = 7 = 11 = 14 = = = 11 = 7 = 5 = = = 4 = 7 = 12 = = = = = = = - - - -', 60),
    ],
    drums: { kick: pattern('x...x...x...x...', 64), snare: pattern('....x.......x...', 64), hat: pattern('..x...x...x...x.', 64) },
  },
  mus_begour: {
    bpm: 146, steps: 64, gain: 0.85,
    wave: { lead: 'square', bass: 'sawtooth', pad: 'triangle', arp: 'square' },
    notes: [
      ...bass([0, 0, 8, 10], 16, 'x.xx.xx.x.xx.x.x', 36),
      ...arp('arp', [maj(0), maj(0), maj(8), maj(10)], 16, [0, 1, 2, 1], 72, 1),
      ...melody('lead', '12 = = 16 = = 19 = 17 = 16 = 14 = 12 = 12 = = 16 = = 19 = 24 = = = 19 = = = 20 = = 19 = = 15 = 12 = = = 15 = = = 22 = = 19 = = 17 = 14 = = = 10 = = =', 60),
    ],
    drums: { kick: pattern('x...x...x...x..x', 64), snare: pattern('....x.......x...', 64), hat: pattern('xxxxxxxxxxxxxxxx', 64) },
  },
  mus_delusion: {
    bpm: 100, steps: 32, gain: 1,
    wave: { lead: 'sawtooth', bass: 'sawtooth', pad: 'sawtooth', arp: 'square' },
    notes: [...pads([maj(0), maj(7)], 16, 60), ...bass([0, 7], 16, 'x..x..x.x..x..x.', 36), ...melody('lead', '24 = = 24 = = 24 = 28 = = = 31 = = = 26 = = 26 = = 26 = 29 = = = 31 = 33 =', 60)],
    drums: { kick: pattern('x...x...x...x...', 32), clap: pattern('....x.......x...', 32), hat: pattern('x.x.x.x.x.x.x.x.', 32) },
  },
  mus_crunk: {
    bpm: 150, steps: 32, gain: 0.9,
    wave: { lead: 'sawtooth', bass: 'square', pad: 'sawtooth', arp: 'sawtooth' },
    notes: [...bass([0, 0, 3, 5], 8, 'x.x.x.xx', 36), ...arp('arp', [min(0), min(0), min(3), min(5)], 8, [0, 1, 2, 3, 2, 1, 0, 2], 72, 1)],
    drums: { kick: pattern('x...x...x...x...', 32), clap: pattern('....x.......x...', 32), hat: pattern('..x...x...x...x.', 32) },
  },
  mus_gym: {
    bpm: 120, steps: 32, gain: 0.6,
    wave: { lead: 'square', bass: 'triangle', pad: 'triangle', arp: 'square' },
    notes: [...bass([0, 5], 16, 'x...x...x...x.x.', 36), ...arp('arp', [maj(0), maj(5)], 16, [0, 1, 2, 1], 72, 2)],
    drums: { kick: pattern('x...x...x...x...', 32), hat: pattern('..x...x...x...x.', 32) },
  },
  mus_results: {
    bpm: 88, steps: 64, gain: 0.8,
    wave: { lead: 'square', bass: 'triangle', pad: 'triangle', arp: 'triangle' },
    notes: [
      ...pads([maj(5), maj(7), min(4), min(9)], 16, 48),
      ...melody('lead', '12 = = = 9 = 7 = 5 = = = - - - - 14 = = = 12 = 11 = 7 = = = - - - - 11 = = = 7 = 4 = 11 = = = 12 = = = 9 = = = = = = = - - - - - - - -', 60),
    ],
    drums: { kick: pattern('x.......x.......', 64), snare: pattern('........x.......', 64) },
  },
};
