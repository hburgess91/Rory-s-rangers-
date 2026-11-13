// Procedural WebAudio sound. Everything is synthesised: no copyrighted tracks, no files needed.
// To use real audio later, register a file in AUDIO_FILES and it will be preferred.

import { SFX_KEYS } from "./sfxList";

export const AUDIO_FILES: Record<string, string> = {
  // real sound effects (PixelLab), public/audio/sfx/<key>.mp3. "explode_1", "explode_2"… are takes of "explode".
  ...Object.fromEntries(SFX_KEYS.map((k) => [k, `audio/sfx/${k}.mp3`])),
  // e.g. mork_voice: "audio/mork_voice.ogg"  (drop the file in public/audio)
  /** Studio-audience laugh track (sitcom canned laughter). Played in varied slices by "laugh"/"biglaugh". */
  laugh_track: "audio/laugh_track.mp3",
  /** SanMik and SanChz, recorded: a run of YEEs and a run of YEGHs. */
  yee: "audio/yee.mp3",
  yegh: "audio/yegh.mp3",
};

/** Where each separate shout sits in those files: [start, length] in seconds. */
const SHOUTS: Record<string, [number, number][]> = {
  yee: [[0.9, 0.73], [2.25, 0.73], [4.69, 0.81], [6.17, 0.75], [7.44, 0.84], [8.73, 0.77], [9.94, 0.46], [11.06, 0.77], [12.2, 0.82], [13.33, 0.8], [14.62, 0.75], [15.98, 0.72], [17.33, 0.68], [18.59, 0.73]],
  yegh: [[0.7, 0.33], [1.2, 0.53], [2.81, 0.64], [4.32, 1.01], [6.46, 0.71], [8.19, 0.78], [9.99, 1.0], [11.24, 0.94], [12.5, 1.68]],
};

/** Recorded music (public/audio). Ids not listed here fall back to the synthesised tracks. */
export const MUSIC_FILES: Record<string, string> = {
  title: "audio/krel_world.mp3",
  hub: "audio/hub.mp3",
  klerble: "audio/klerble.mp3",
  home: "audio/home.mp3",
  pub: "audio/pub.mp3",
  meeting: "audio/pixel_quest.mp3",
  archive: "audio/pixel_quest.mp3",
  school: "audio/school.mp3",
  mansion: "audio/mansion.mp3",
  industrial: "audio/industrial.mp3",
  temple: "audio/temple.mp3",
  prison: "audio/prison.mp3",
  wiki: "audio/wiki.mp3",
  airport: "audio/airport.mp3",
  krel_tower_rap: "audio/krel_tower_rap.mp3",
  kreddle: "audio/kreddle.mp3",
  ominous: "audio/ominous.mp3",
  boss: "audio/boss1.mp3",
  boss_salmon: "audio/boss_salmon.mp3",
  boss_krandall: "audio/cranky_crandall_boss.mp3",
  crandle: "audio/crankey_crandle.mp3",
  crobley_factory: "audio/crobley_factory.mp3",
  boss_feedback: "audio/boss_feedback.mp3",
  boss_machine: "audio/boss_machine.mp3",
  boss_banhammer: "audio/boss_banhammer.mp3",
  boss_spectre: "audio/boss_spectre.mp3",
  boss_krozno: "audio/krel_tower_2.mp3",
  boss_brand: "audio/flenky.mp3",
  boss_troll: "audio/boss2.mp3",
  boss_flatmate: "audio/boss3.mp3",
  boss_rival: "audio/boss1.mp3",
  boss_cronster: "audio/hello_cuhnts.mp3",
  cronny: "audio/cronny.mp3",
  boss_arena: "audio/boss3.mp3",
  final: "audio/final.mp3",
  ending: "audio/ending.mp3",
  anthem: "audio/anthem.mp3",
  crazy: "audio/crazy_for_krelworld.mp3",
  bbp: "audio/bbp.mp3",
  twitcher: "audio/twitcher.mp3",
  crocodile: "audio/crocodile.mp3",
  flenky: "audio/flenky.mp3",
  sanmik: "audio/ggg8.mp3",
  boss_rik: "audio/ggg13.mp3",
  boss_jam: "audio/bpd_menace.mp3",
  boss_hoard: "audio/erotic_stockport.mp3",
  stockport: "audio/erotic_stockport.mp3",
  crystal: "audio/crystal_is_yours.mp3",
  techno_dance: "audio/techno_dance.mp3",
  norwich: "audio/norwich.mp3",
  crobley: "audio/crobley.mp3",
  majek_lampe: "audio/majek_lampe.mp3",
  mdmazing: "audio/mdmazing.mp3",
  beepbeep: "audio/beepbeep.mp3",
  viral: "audio/viral.mp3",
  sanmik_nation: "audio/sanmik_nation.mp3",
  drive: "audio/ggg4.mp3",
  night_of_freedom: "audio/night_of_freedom.mp3",
  ...Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`ggg${i + 1}`, `audio/ggg${i + 1}.mp3`])),
};

/** Songs that should play once rather than loop. */
const ONE_SHOT = new Set(["crystal", "viral", "crobley", "majek_lampe", "anthem", "bbp", "twitcher", "crocodile", ...Array.from({ length: 13 }, (_, i) => `ggg${i + 1}`)]);

type Wave = OscillatorType;

interface Track {
  bpm: number;
  root: number; // midi
  scale: number[];
  bass: number[]; // scale degrees, -1 rest
  lead: number[];
  leadWave: Wave;
  bassWave: Wave;
  drums: boolean;
  swing?: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYG = [0, 1, 3, 5, 7, 8, 10];

const TRACKS: Record<string, Track> = {
  title: { bpm: 112, root: 50, scale: MAJOR, bass: [0, -1, 0, 4, 3, -1, 3, 4, 5, -1, 5, 4, 3, -1, 1, 4], lead: [7, 9, 11, 9, 7, -1, 4, 5, 7, -1, 7, 9, 8, 7, 4, -1], leadWave: "square", bassWave: "triangle", drums: true },
  hub: { bpm: 100, root: 53, scale: MAJOR, bass: [0, -1, 4, -1, 5, -1, 3, -1, 0, -1, 4, -1, 1, -1, 4, -1], lead: [4, -1, 5, 7, -1, 7, 5, 4, 2, -1, 4, -1, 2, 1, 0, -1], leadWave: "triangle", bassWave: "triangle", drums: true, swing: 0.1 },
  pub: { bpm: 92, root: 55, scale: MAJOR, bass: [0, 4, 2, 4, 3, 5, 4, 5, 0, 4, 2, 4, 4, 6, 5, 4], lead: [7, 7, 9, 7, 5, 4, 2, -1, 4, 4, 5, 4, 2, 1, 0, -1], leadWave: "sawtooth", bassWave: "square", drums: true, swing: 0.2 },
  meeting: { bpm: 84, root: 48, scale: DORIAN, bass: [0, -1, -1, -1, 3, -1, -1, -1, 4, -1, -1, -1, 2, -1, -1, -1], lead: [-1, 4, -1, 5, -1, 4, -1, 2, -1, 4, -1, 6, -1, 5, -1, -1], leadWave: "triangle", bassWave: "sine", drums: false },
  school: { bpm: 128, root: 45, scale: MINOR, bass: [0, 0, 7, 0, 5, 0, 3, 4, 0, 0, 7, 0, 6, 5, 4, 3], lead: [7, -1, 8, 7, 5, -1, 3, -1, 4, 5, 7, -1, 10, 8, 7, -1], leadWave: "square", bassWave: "sawtooth", drums: true },
  mansion: { bpm: 116, root: 47, scale: PHRYG, bass: [0, -1, 1, 0, -1, 3, 1, 0, 0, -1, 1, 0, 4, 3, 1, -1], lead: [7, 8, 7, 5, 4, -1, 5, 4, 3, 1, 0, -1, 8, 7, 8, -1], leadWave: "square", bassWave: "triangle", drums: true, swing: 0.15 },
  industrial: { bpm: 136, root: 43, scale: MINOR, bass: [0, 0, 0, 3, 0, 0, 5, 4, 0, 0, 0, 3, 7, 6, 5, 3], lead: [-1, 7, -1, 7, -1, 10, -1, 8, -1, 7, -1, 5, 3, 5, 7, -1], leadWave: "sawtooth", bassWave: "square", drums: true },
  temple: { bpm: 104, root: 46, scale: PHRYG, bass: [0, -1, 0, -1, 1, -1, 0, -1, 0, -1, 0, -1, 4, 3, 1, -1], lead: [7, 8, 10, 8, 7, -1, 7, 5, 4, 5, 7, -1, 8, 7, 5, -1], leadWave: "square", bassWave: "sawtooth", drums: true },
  prison: { bpm: 96, root: 44, scale: MINOR, bass: [0, -1, -1, 0, 5, -1, -1, 4, 3, -1, -1, 3, 4, -1, 5, -1], lead: [7, -1, 6, -1, 5, -1, 3, -1, 2, -1, 3, 5, 4, -1, -1, -1], leadWave: "triangle", bassWave: "sawtooth", drums: true },
  wiki: { bpm: 140, root: 48, scale: DORIAN, bass: [0, 7, 0, 7, 3, 10, 3, 10, 4, 11, 4, 11, 5, 12, 5, 4], lead: [14, 12, 11, 9, 7, 9, 11, 12, 14, -1, 16, 14, 12, -1, 11, -1], leadWave: "square", bassWave: "square", drums: true },
  boss: { bpm: 150, root: 45, scale: MINOR, bass: [0, 0, 12, 0, 0, 10, 0, 8, 0, 0, 12, 0, 7, 8, 10, 12], lead: [7, 7, 8, 7, 10, -1, 8, 7, 5, 5, 7, 5, 3, -1, 2, -1], leadWave: "sawtooth", bassWave: "square", drums: true },
  final: { bpm: 158, root: 50, scale: PHRYG, bass: [0, 0, 1, 0, 0, 3, 0, 1, 0, 0, 1, 0, 7, 6, 5, 3], lead: [14, -1, 13, 12, 10, -1, 12, 13, 14, 15, 14, 12, 10, 8, 7, -1], leadWave: "sawtooth", bassWave: "sawtooth", drums: true },
  news: { bpm: 120, root: 52, scale: MAJOR, bass: [0, -1, 0, -1, 4, -1, 4, -1, 5, -1, 5, -1, 4, -1, -1, -1], lead: [7, 7, 7, -1, 11, -1, 9, -1, 7, -1, 4, -1, 7, -1, -1, -1], leadWave: "square", bassWave: "triangle", drums: true },
  sport: { bpm: 138, root: 55, scale: MAJOR, bass: [0, 4, 0, 4, 3, 5, 3, 5, 4, 6, 4, 6, 4, 4, 4, -1], lead: [7, 9, 11, 12, 11, 9, 7, -1, 7, 9, 11, 12, 14, -1, 12, -1], leadWave: "square", bassWave: "square", drums: true },
  shopping: { bpm: 110, root: 57, scale: MAJOR, bass: [0, -1, 4, -1, 5, -1, 4, -1, 3, -1, 4, -1, 1, -1, 4, -1], lead: [9, 11, 12, -1, 11, 9, 7, -1, 9, 7, 4, -1, 7, -1, -1, -1], leadWave: "triangle", bassWave: "sine", drums: true, swing: 0.15 },
  doc: { bpm: 72, root: 45, scale: DORIAN, bass: [0, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, 4, -1, -1, -1], lead: [7, -1, -1, 9, -1, -1, 10, -1, 9, -1, -1, 7, -1, -1, -1, -1], leadWave: "sine", bassWave: "sine", drums: false },
  punk: { bpm: 176, root: 52, scale: MAJOR, bass: [0, 0, 0, 0, 4, 4, 4, 4, 5, 5, 5, 5, 3, 3, 4, 4], lead: [7, 7, 9, 7, 11, 11, 9, 7, 12, 12, 11, 9, 7, -1, 7, -1], leadWave: "sawtooth", bassWave: "sawtooth", drums: true },
  tcc_theme: { bpm: 118, root: 53, scale: MAJOR, bass: [0, -1, 4, -1, 5, -1, 4, -1, 3, -1, 2, -1, 1, -1, 4, -1], lead: [7, 9, 7, 4, 5, -1, 7, -1, 9, 11, 12, 11, 9, -1, 7, -1], leadWave: "square", bassWave: "triangle", drums: true, swing: 0.2 },
  ominous: { bpm: 60, root: 38, scale: PHRYG, bass: [0, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1, 1, -1, -1, -1], lead: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1], leadWave: "sine", bassWave: "sawtooth", drums: false },
  ending: { bpm: 90, root: 53, scale: MAJOR, bass: [0, -1, 4, -1, 5, -1, 3, -1, 0, -1, 4, -1, 3, -1, 4, -1], lead: [4, 5, 7, -1, 9, 7, 5, -1, 4, 2, 4, -1, 5, 4, 2, 0], leadWave: "triangle", bassWave: "sine", drums: false },
};

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Synth {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicGain!: GainNode;
  sfxGain!: GainNode;
  private noise!: AudioBuffer;
  private track: Track | null = null;
  private trackId = "";
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private vol = { master: 0.8, music: 0.5, sfx: 0.8 };
  private files: Record<string, AudioBuffer> = {};
  private el: HTMLAudioElement | null = null;
  private elId = "";

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC() as AudioContext;
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.loadFiles();
      if (this.trackId) this.music(this.trackId, true);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => undefined);
    if (this.el && this.el.paused && this.elId) this.el.play().catch(() => undefined);
  }

  private async loadFiles() {
    await Promise.all(
      Object.entries(AUDIO_FILES).map(async ([id, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          this.files[id] = await this.ctx!.decodeAudioData(buf);
        } catch {
          /* missing file: fall back to synth */
        }
      }),
    );
    for (const [ch, w] of Object.entries(this.loopWant)) if (w.id) this.loopOn(ch, w.id, w.vol);
  }

  // ------------------------------------------------------------ ambience: a quiet looping bed under the music

  private loops: Record<string, { id: string; src: AudioBufferSourceNode; gain: GainNode } | null> = {};
  private loopWant: Record<string, { id: string | null; vol: number }> = {};

  /** Loop the recorded ambience "amb_<id>" (town, pub, casino, dungeon...), or stop it with null. Crossfades. */
  ambience(id: string | null) {
    this.loopOn("amb", id, 0.45);
  }

  /** A weather layer over the ambience (amb_rain, amb_storm, amb_snow), or null to stop it. */
  weatherSound(id: string | null) {
    this.loopOn("wx", id, 0.55);
  }

  private loopOn(ch: string, id: string | null, vol: number) {
    this.loopWant[ch] = { id, vol };
    if (!this.ctx) return;
    if (this.loops[ch]?.id === id) return;
    const t = this.ctx.currentTime;
    const old = this.loops[ch];
    if (old) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + 0.8);
      old.src.stop(t + 0.85);
      this.loops[ch] = null;
    }
    const buf = id ? this.files[`amb_${id}`] : null;
    if (!id || !buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 1.2);
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t, Math.random() * Math.max(0, buf.duration - 1));
    this.loops[ch] = { id, src, gain };
  }

  /** A recorded take of this sound (one of id, id_1, id_2…), or null to synthesise it. */
  private take(id: string): AudioBuffer | null {
    const opts: AudioBuffer[] = [];
    if (this.files[id]) opts.push(this.files[id]);
    for (let i = 1; i <= 5; i++) if (this.files[`${id}_${i}`]) opts.push(this.files[`${id}_${i}`]);
    if (!opts.length) return null;
    // don't play the same take twice in a row
    let b = opts[Math.floor(Math.random() * opts.length)];
    if (opts.length > 1 && b === this.lastTake[id]) b = opts[(opts.indexOf(b) + 1) % opts.length];
    this.lastTake[id] = b;
    return b;
  }
  private lastTake: Record<string, AudioBuffer> = {};
  /** When each sound last started (so a shotgun of hits doesn't stack 30 copies). */
  private lastPlayed: Record<string, number> = {};

  setVolumes(v: { master: number; music: number; sfx: number }) {
    this.vol = v;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.musicGain.gain.value = this.vol.music * 0.35;
    if (this.el) this.el.volume = Math.min(1, this.vol.master * this.vol.music);
    this.sfxGain.gain.value = this.vol.sfx * 0.6;
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, when = 0, slide = 0, dest?: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /**
   * A crude synthesised human noise: a buzzy voice source through two vowel formants, with a pitch glide and wobble.
   * "mmm" (closed, nasal hum), "oh" (open moan), "grunt" (short, low, breathy).
   */
  voice(kind: "mmm" | "oh" | "grunt", vol = 0.5, pitch = 1, when = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const dur = kind === "grunt" ? 0.22 + Math.random() * 0.12 : 0.7 + Math.random() * 0.7;
    const f0 = (kind === "grunt" ? 95 : kind === "oh" ? 135 : 115) * pitch * (0.92 + Math.random() * 0.16);
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0 * (kind === "grunt" ? 1.25 : 0.92), t);
    if (kind === "grunt") o.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + dur);
    else {
      // rises then sags: mmmMMMmm
      o.frequency.linearRampToValueAtTime(f0 * 1.18, t + dur * 0.45);
      o.frequency.linearRampToValueAtTime(f0 * 0.85, t + dur);
    }
    // wobble
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 5 + Math.random() * 2;
    lg.gain.value = f0 * 0.025;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const forms: [number, number, number][] =
      kind === "mmm" ? [[260, 6, 1], [1000, 8, 0.12], [2300, 10, 0.05]] : kind === "oh" ? [[480, 7, 1], [850, 8, 0.6], [2500, 12, 0.08]] : [[560, 4, 1], [1150, 5, 0.5]];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + (kind === "grunt" ? 0.02 : 0.12));
    out.gain.setValueAtTime(vol, t + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [fq, q, amp] of forms) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = fq;
      bp.Q.value = q;
      const ga = ctx.createGain();
      ga.gain.value = amp * 3;
      o.connect(bp);
      bp.connect(ga);
      ga.connect(out);
    }
    out.connect(this.sfxGain);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
    // breath
    if (kind !== "mmm") this.burst(dur * 0.6, vol * (kind === "grunt" ? 0.5 : 0.18), when, kind === "grunt" ? 700 : 1400, undefined, 0.6);
  }

  // ------------------------------------------------------------ the gun kit: punchy, layered, a bit gritty

  private crunchNode: WaveShaperNode | null = null;
  /** A soft-clipping bus that gives gunshots some grit. */
  private crunch(): AudioNode {
    if (!this.ctx) return this.sfxGain;
    if (!this.crunchNode) {
      const ws = this.ctx.createWaveShaper();
      const n = 1024;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 3.2) / Math.tanh(3.2);
      }
      ws.curve = curve;
      ws.connect(this.sfxGain);
      this.crunchNode = ws;
    }
    return this.crunchNode;
  }

  /** The crack of a shot: noise through a low-pass that snaps shut. */
  private crack(dur: number, vol: number, from = 7000, to = 600, when = 0, dest?: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest ?? this.crunch());
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** The punch underneath: a sine that drops in pitch. */
  private thump(f0: number, f1: number, dur: number, vol: number, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.crunch());
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** A whoosh: noise through a band-pass that sweeps. */
  private whoosh(dur: number, vol: number, from: number, to: number, when = 0, q = 1.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /**
   * THE KREZZ LASER: a charge, a zap, then a fat wobbling beam for `dur` seconds that fades out.
   */
  laser(dur = 1.6) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    // the zap
    this.tone(2400, 0.18, "sawtooth", 0.22, 0, 0.12);
    this.crack(0.15, 0.4, 9000, 1500);
    // the beam: two detuned saws and a sine an octave up, through a sweeping filter, with a wobble
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.32, t + 0.08);
    out.gain.setValueAtTime(0.32, t + Math.max(0.1, dur - 0.35));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 6;
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.25);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    f.connect(out);
    out.connect(this.sfxGain);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 11;
    lg.gain.value = 9;
    lfo.connect(lg);
    for (const [fq, type, v] of [[196, "sawtooth", 0.5], [199, "sawtooth", 0.5], [392, "sine", 0.6]] as [number, OscillatorType, number][]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(fq, t);
      lg.connect(o.frequency);
      g.gain.value = v;
      o.connect(g);
      g.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    // and a crackle all the way along
    for (let k = 0.1; k < dur - 0.2; k += 0.18 + Math.random() * 0.1) this.burst(0.06, 0.08, k, 5000 + Math.random() * 2000, undefined, 3);
  }

  /** The charge-up before you krezz. */
  charge() {
    this.tone(140, 0.7, "sawtooth", 0.14, 0, 6);
    this.tone(70, 0.7, "sine", 0.25, 0, 3);
    this.whoosh(0.7, 0.18, 300, 3000);
  }

  private burst(dur: number, vol: number, when = 0, filterFreq = 2000, dest?: AudioNode, q = 0.7) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filterFreq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest ?? this.sfxGain);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  /** Play part of a loaded recording with a fade-out. */
  /** One YEE (or YEGH), picked at random. */
  shout(id: "yee" | "yegh", vol = 0.9) {
    const buf = this.files[id];
    const segs = SHOUTS[id];
    if (!this.ctx || !buf || !segs) return false;
    const [off, len] = segs[Math.floor(Math.random() * segs.length)];
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = 0.95 + Math.random() * 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + Math.max(0.03, len - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(t, off, len + 0.05);
    return true;
  }

  clip(id: string, offset: number, dur: number, vol = 1, rate = 1) {
    const buf = this.files[id];
    if (!this.ctx || !buf) return false;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const len = Math.min(dur, buf.duration - offset);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    g.gain.setValueAtTime(vol, t + Math.max(0.1, len - 0.9));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(t, offset, len + 0.05);
    return true;
  }

  /** One buzzy fart segment: a filtered sawtooth fluttered by a square LFO. */
  private fartSeg(when: number, dur: number, f0: number, f1: number, flutter: number, vol: number, cutoff = 900) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.setValueAtTime(flutter, t);
    lfo.frequency.linearRampToValueAtTime(flutter * (0.6 + Math.random() * 0.8), t + dur);
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    lfo.connect(depth);
    depth.connect(am.gain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(am);
    am.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  /** A wet little tick per mash, rising in pitch with the gauge. */
  wonkTick(g: number) {
    if (!this.ctx) return;
    this.burst(0.05, 0.22, 0, 900 + g * 1800, undefined, 2.5);
    this.tone(180 + g * 420, 0.05, "sine", 0.12, 0, 1.2);
  }

  /** Farts by potency: the higher the level, the longer and more ridiculous. */
  fart(level: number) {
    if (!this.ctx) return;
    // recorded farts for the real ones (beans, cabbage, IBS); the fairy keeps her synth squeak
    const rec = level === 2 ? this.files.fart_2 : level === 3 ? this.files.fart_1 : level >= 4 ? this.files.fart_3 : null;
    if (rec) {
      const s = this.ctx.createBufferSource();
      s.buffer = rec;
      s.playbackRate.value = level >= 4 ? 0.8 : 0.95 + Math.random() * 0.1;
      s.connect(this.sfxGain);
      s.start();
      if (level < 4) return;
    }
    const S = (w: number, d: number, a: number, b: number, fl: number, v: number, c?: number) => this.fartSeg(w, d, a, b, fl, v, c);
    const wet = (w: number, v = 0.5) => this.burst(0.12 + Math.random() * 0.1, v, w, 380 + Math.random() * 200, undefined, 1.2);
    if (level <= 1) {
      // fairy: a tiny high squeak and a twinkle
      S(0, 0.22, 420, 560, 48, 0.22, 1600);
      this.tone(2093, 0.12, "sine", 0.08, 0.2);
      this.tone(2637, 0.15, "sine", 0.07, 0.28);
    } else if (level === 2) {
      // baked beans: poot poot poooot
      S(0, 0.16, 170, 150, 30, 0.35);
      S(0.24, 0.17, 160, 140, 32, 0.35);
      S(0.5, 0.5, 150, 90, 24, 0.4);
    } else if (level === 3) {
      // cabbage: one long wobbling rip with a squeaky tail
      S(0, 0.5, 130, 100, 20, 0.42);
      S(0.45, 0.7, 110, 80, 16, 0.45, 700);
      S(1.1, 0.5, 95, 70, 26, 0.4, 650);
      wet(0.9, 0.3);
      S(1.65, 0.22, 380, 620, 40, 0.28, 1800);
    } else {
      // IBS: gut gurgles during the wind-up, then a three-second catastrophe
      for (let i = 0; i < 7; i++) this.tone(60 + Math.random() * 60, 0.18, "sine", 0.25, i * 0.18, 1.6);
      for (let i = 0; i < 5; i++) this.tone(180 + Math.random() * 120, 0.08, "sine", 0.12, 0.2 + i * 0.22, 2.5);
      const t0 = 1.5;
      S(t0, 0.9, 120, 70, 14, 0.6, 800);
      S(t0 + 0.85, 1.0, 95, 50, 11, 0.6, 600);
      S(t0 + 1.8, 0.9, 80, 45, 18, 0.55, 600);
      this.burst(1.2, 0.5, t0, 300, undefined, 0.5);
      for (let i = 0; i < 9; i++) wet(t0 + 0.3 + Math.random() * 2.6, 0.45);
      S(t0 + 2.75, 0.14, 300, 420, 40, 0.3, 1600);
      S(t0 + 2.95, 0.14, 360, 500, 40, 0.3, 1600);
      S(t0 + 3.15, 0.2, 420, 700, 44, 0.3, 1800);
      S(t0 + 3.7, 0.12, 520, 560, 50, 0.18, 2000);
    }
  }

  play(id: string) {
    if (!this.ctx) return;
    // canned laughter: a random slice of the real laugh track (the big one plays most of it)
    if (id === "laugh" && this.clip("laugh_track", Math.random() * 1.6, 2.8 + Math.random() * 0.8, 1.1, 0.96 + Math.random() * 0.08)) return;
    if (id === "biglaugh" && this.clip("laugh_track", 0, 6.4, 1.3)) return;
    const rec = this.take(id);
    if (rec) {
      const now = this.ctx.currentTime;
      // the same sound within 35ms is one sound
      if (now - (this.lastPlayed[id] ?? -1) < 0.035) return;
      this.lastPlayed[id] = now;
      const s = this.ctx.createBufferSource();
      s.buffer = rec;
      // a touch of pitch wobble so repeats don't sound copy-pasted
      s.playbackRate.value = 0.94 + Math.random() * 0.12;
      s.connect(this.sfxGain);
      s.start();
      return;
    }
    switch (id) {
      case "hit":
        this.burst(0.08, 0.5, 0, 1800);
        this.tone(180, 0.08, "square", 0.25, 0, 0.5);
        break;
      case "crit":
        this.burst(0.12, 0.6, 0, 3000);
        this.tone(520, 0.15, "square", 0.3, 0, 0.4);
        break;
      case "hurt":
        this.tone(220, 0.2, "sawtooth", 0.35, 0, 0.4);
        this.burst(0.15, 0.3, 0, 600);
        break;
      case "swing":
        this.burst(0.07, 0.25, 0, 4000, undefined, 2);
        break;
      case "shoot":
        this.tone(880, 0.06, "square", 0.12, 0, 0.5);
        break;
      case "pfft":
        this.tone(95 + Math.random() * 40, 0.09, "sawtooth", 0.14, 0, 0.55);
        this.burst(0.08, 0.12, 0, 260, undefined, 2);
        break;
      case "fart":
        this.tone(70, 0.5, "sawtooth", 0.35, 0, 0.6);
        this.burst(0.45, 0.25, 0.02, 180, undefined, 2);
        break;
      case "burp":
        this.tone(110, 0.35, "sawtooth", 0.3, 0, 0.8);
        this.burst(0.3, 0.15, 0, 400, undefined, 1.5);
        break;
      case "splash":
        this.burst(0.6, 0.5, 0, 1200, undefined, 0.4);
        break;
      case "flush":
        this.burst(1.4, 0.35, 0, 700, undefined, 0.5);
        this.burst(0.8, 0.2, 0.5, 300, undefined, 0.5);
        break;
      case "trombone":
        this.tone(392, 0.32, "sawtooth", 0.16, 0);
        this.tone(370, 0.32, "sawtooth", 0.16, 0.34);
        this.tone(349, 0.32, "sawtooth", 0.16, 0.68);
        this.tone(330, 0.9, "sawtooth", 0.16, 1.02, 0.92);
        break;
      case "jet":
        this.tone(200, 1.3, "sawtooth", 0.18, 0, 3.5);
        this.burst(1.5, 0.45, 0, 2500, undefined, 0.6);
        this.burst(0.25, 0.5, 0.05, 600, undefined, 1.2);
        break;
      case "splat":
        this.burst(0.16, 0.45, 0, 420, undefined, 1.4);
        break;
      case "harmonica":
        this.tone(392, 0.5, "square", 0.08, 0.1, 0.94);
        this.tone(466, 0.4, "square", 0.06, 0.1, 0.94);
        break;
      case "punch":
        this.tone(95, 0.11, "sine", 0.55, 0, 0.45);
        this.burst(0.07, 0.55, 0, 1200, undefined, 0.8);
        break;
      case "punch_big":
        this.tone(70, 0.2, "sine", 0.7, 0, 0.4);
        this.burst(0.14, 0.7, 0, 900, undefined, 0.7);
        this.burst(0.05, 0.4, 0, 4500, undefined, 1);
        break;
      case "swing2":
        this.burst(0.08, 0.28, 0, 5200, undefined, 2.2);
        break;
      case "swing3":
        this.burst(0.13, 0.35, 0, 2600, undefined, 1.6);
        break;
      case "fart_ready":
        this.tone(700, 0.07, "square", 0.12);
        this.tone(1050, 0.1, "square", 0.12, 0.08);
        break;
      case "gun_pistol":
        this.crack(0.13, 0.55, 7000, 700);
        this.thump(190 * (0.95 + Math.random() * 0.1), 55, 0.11, 0.6);
        this.tone(1900, 0.012, "square", 0.12);
        break;
      case "gun_smg":
        this.crack(0.07, 0.38, 6500, 900);
        this.thump(230 * (0.92 + Math.random() * 0.16), 80, 0.06, 0.4);
        break;
      case "gun_shotgun":
        this.crack(0.38, 0.85, 5000, 220);
        this.thump(130, 38, 0.32, 0.9);
        // chk-chk
        this.burst(0.03, 0.25, 0.3, 2500, undefined, 4);
        this.burst(0.04, 0.3, 0.38, 1800, undefined, 4);
        break;
      case "gun_rail":
        this.tone(500, 0.07, "sawtooth", 0.12, 0, 5);
        this.tone(2800, 0.4, "sawtooth", 0.2, 0.06, 0.08);
        this.crack(0.3, 0.4, 12000, 3000, 0.06);
        this.thump(160, 40, 0.25, 0.5, 0.06);
        break;
      case "gun_gatling":
        this.crack(0.06, 0.35, 5500, 1200);
        this.burst(0.05, 0.18, 0, 2600, undefined, 4);
        this.thump(260 * (0.9 + Math.random() * 0.2), 90, 0.05, 0.35);
        break;
      case "gun_sniper":
        this.crack(0.45, 0.9, 9000, 300);
        this.thump(100, 28, 0.4, 0.9);
        // the echo off the far wall
        this.crack(0.35, 0.22, 2500, 200, 0.22);
        break;
      case "gun_flamer":
        this.whoosh(0.2, 0.3, 700, 300 + Math.random() * 200, 0, 0.8);
        this.burst(0.12, 0.1, 0, 4000, undefined, 2);
        break;
      case "gun_bfk":
        this.thump(85, 22, 0.7, 1);
        this.crack(0.6, 0.9, 4000, 120);
        this.burst(0.9, 0.35, 0.05, 260, undefined, 0.6);
        break;
      case "gun_chainsaw":
        // a rev that, fired fast, blurs into a snarl
        this.tone(68 + Math.random() * 14, 0.08, "sawtooth", 0.2, 0, 1.25);
        this.burst(0.07, 0.16, 0, 1400, undefined, 2.5);
        break;
      case "gun_kreddler":
        this.crack(0.05, 0.32, 7000, 1400);
        this.thump(300 * (0.9 + Math.random() * 0.2), 110, 0.045, 0.3);
        this.tone(420, 0.05, "triangle", 0.05);
        break;
      case "gun_disco":
        this.whoosh(0.3, 0.3, 400, 2400);
        this.thump(220, 80, 0.15, 0.5);
        [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.12, "sine", 0.1, 0.05 + i * 0.05));
        break;
      case "gun_flush":
        for (let i = 0; i < 3; i++) this.burst(0.035, 0.28, i * 0.025, 4200, undefined, 2.5);
        this.tone(900, 0.06, "triangle", 0.12, 0, 2);
        break;
      case "lob":
        this.whoosh(0.35, 0.3, 300, 1800);
        this.thump(180, 60, 0.18, 0.6);
        break;
      case "explode":
      case "boom":
        this.burst(0.5, 0.7, 0, 300, undefined, 0.5);
        this.tone(90, 0.4, "sine", 0.5, 0, 0.3);
        break;
      case "dodge":
        this.burst(0.12, 0.2, 0, 2500, undefined, 3);
        break;
      case "perfect":
        this.tone(1200, 0.08, "sine", 0.25);
        this.tone(1800, 0.12, "sine", 0.2, 0.06);
        break;
      case "notify":
        this.tone(988, 0.09, "sine", 0.35);
        this.tone(1319, 0.14, "sine", 0.3, 0.08);
        break;
      case "pop":
        this.tone(600, 0.06, "sine", 0.4, 0, 2);
        break;
      case "wonk":
        this.tone(200, 0.4, "sawtooth", 0.18, 0, 3);
        break;
      case "burst":
        this.tone(110, 1.0, "sawtooth", 0.4, 0, 4);
        this.burst(0.8, 0.6, 0.05, 500);
        this.tone(55, 1.2, "sine", 0.5, 0, 0.5);
        break;
      case "bongo":
        this.burst(0.06, 0.5, 0, 5000, undefined, 4);
        this.burst(0.5, 0.15, 0.05, 7000, undefined, 1);
        break;
      case "gulp":
      case "tap":
        this.tone(300, 0.1, "sine", 0.3, 0, 0.6);
        this.tone(250, 0.1, "sine", 0.3, 0.12, 0.6);
        this.tone(320, 0.1, "sine", 0.3, 0.24, 0.6);
        break;
      case "tap_fail":
        this.tone(140, 0.6, "sawtooth", 0.3, 0, 0.3);
        this.burst(0.4, 0.3, 0.1, 400);
        break;
      case "banhammer":
        this.tone(70, 0.8, "square", 0.5, 0, 0.4);
        this.burst(0.6, 0.8, 0, 200);
        break;
      case "laugh":
        for (let i = 0; i < 9; i++) this.burst(0.11, 0.18 + Math.random() * 0.1, i * 0.13 + Math.random() * 0.03, 900 + Math.random() * 600, undefined, 1.5);
        for (let i = 0; i < 6; i++) this.burst(0.1, 0.12, 0.06 + i * 0.17, 1400 + Math.random() * 500, undefined, 1.5);
        break;
      case "cheer":
        this.burst(1.6, 0.25, 0, 1200, undefined, 0.3);
        for (let i = 0; i < 10; i++) this.burst(0.15, 0.15, Math.random() * 1.2, 2000 + Math.random() * 1500, undefined, 2);
        break;
      case "whistle":
        this.tone(1500, 0.25, "sine", 0.2, 0, 1.6);
        this.tone(2400, 0.35, "sine", 0.2, 0.3, 0.5);
        break;
      case "gasp":
        this.burst(0.4, 0.3, 0, 1600, undefined, 0.8);
        break;
      case "smash":
        this.burst(0.25, 0.8, 0, 2500, undefined, 0.3);
        break;
      case "ding":
        this.tone(1568, 0.4, "sine", 0.3);
        break;
      case "slurp":
        this.tone(400, 0.3, "sawtooth", 0.1, 0, 0.3);
        this.burst(0.3, 0.2, 0, 900, undefined, 2);
        break;
      case "alarm":
        for (let i = 0; i < 4; i++) {
          this.tone(880, 0.2, "square", 0.2, i * 0.4);
          this.tone(660, 0.2, "square", 0.2, i * 0.4 + 0.2);
        }
        break;
      case "archive":
        this.tone(440, 0.3, "triangle", 0.2);
        this.tone(554, 0.3, "triangle", 0.2, 0.15);
        this.tone(659, 0.5, "triangle", 0.2, 0.3);
        break;
      case "leave":
        this.tone(660, 0.15, "sine", 0.3);
        this.tone(440, 0.3, "sine", 0.3, 0.15);
        break;
      case "coin":
        this.tone(1320, 0.05, "square", 0.12);
        this.tone(1760, 0.08, "square", 0.12, 0.05);
        break;
      case "pickup":
        this.tone(660, 0.1, "triangle", 0.25);
        this.tone(990, 0.15, "triangle", 0.25, 0.08);
        break;
      case "door":
        this.tone(160, 0.3, "triangle", 0.3, 0, 0.7);
        break;
      case "select":
        this.tone(740, 0.05, "square", 0.12);
        break;
      case "type":
        this.tone(500 + Math.random() * 300, 0.025, "square", 0.04);
        break;
      case "mork":
        for (let i = 0; i < 5; i++) this.tone(70 + Math.random() * 40, 0.18, "sawtooth", 0.25, i * 0.15, 0.8);
        break;
      case "death":
        this.tone(300, 0.6, "square", 0.3, 0, 0.2);
        break;
      case "roar":
        this.tone(80, 1.0, "sawtooth", 0.5, 0, 0.6);
        this.burst(0.9, 0.5, 0, 350);
        break;
      case "telegraph":
        this.tone(1000, 0.08, "square", 0.1);
        break;
      case "tannoy":
        // the PA chime: ding-dong, a little hiss of the mic opening
        this.tone(659, 0.45, "triangle", 0.28);
        this.tone(523, 0.7, "triangle", 0.28, 0.42);
        this.burst(0.5, 0.06, 0.9, 2400);
        break;
      case "step_echo":
        // a footstep in a big empty stone room, and its echoes
        this.tone(95, 0.09, "triangle", 0.22, 0, 0.6);
        this.burst(0.05, 0.12, 0, 900);
        this.tone(95, 0.09, "triangle", 0.09, 0.19, 0.6);
        this.burst(0.05, 0.05, 0.19, 700);
        this.tone(95, 0.09, "triangle", 0.04, 0.38, 0.6);
        this.burst(0.05, 0.02, 0.38, 500);
        break;
      case "thunder":
        // distant thunder: a long low rumble
        this.burst(2.4, 0.5, 0, 180, undefined, 0.5);
        this.burst(1.6, 0.35, 0.3, 320, undefined, 0.5);
        this.tone(48, 2.2, "sine", 0.25, 0.1, 0.7);
        break;
      case "drone":
        // a low, ominous drone (the final stairs)
        this.tone(55, 7.5, "sawtooth", 0.06, 0, 0.98);
        this.tone(82.4, 7.5, "sine", 0.1, 0, 1);
        this.tone(58.3, 7.5, "triangle", 0.07, 0.5, 1);
        break;
      case "ai_deny":
        // the AI says NO: a harsh double buzzer
        this.tone(130, 0.28, "sawtooth", 0.4);
        this.tone(138, 0.28, "square", 0.3);
        this.tone(130, 0.45, "sawtooth", 0.4, 0.34);
        this.tone(138, 0.45, "square", 0.3, 0.34);
        break;
      case "decree":
        this.tone(392, 0.15, "square", 0.25);
        this.tone(523, 0.15, "square", 0.25, 0.15);
        this.tone(784, 0.3, "square", 0.25, 0.3);
        break;
      default:
        this.tone(440, 0.05, "square", 0.1);
    }
  }

  /** Is a recorded song currently playing? */
  /** Position and length (seconds) of the recorded track that's playing, if known. */
  fileProgress(): { t: number; d: number; ended: boolean } {
    const e = this.el;
    if (!e) return { t: 0, d: 0, ended: true };
    return { t: e.currentTime, d: Number.isFinite(e.duration) ? e.duration : 0, ended: e.ended };
  }

  /** The <audio> element playing the current recorded track (for songs that drive a minigame clock). */
  musicEl(): HTMLAudioElement | null {
    return this.el;
  }

  playingFile(): string {
    return this.el && !this.el.paused ? this.elId : "";
  }

  private playFile(id: string, force: boolean, startFrac = 0) {
    // same song under another name (e.g. a dungeon track that carries on into its boss): keep playing
    if (!force && this.el && !this.el.ended && MUSIC_FILES[this.elId] === MUSIC_FILES[id]) {
      this.elId = id;
      return;
    }
    this.stopFile();
    const el = new Audio(MUSIC_FILES[id]);
    if (startFrac > 0) el.addEventListener("loadedmetadata", () => (el.currentTime = el.duration * startFrac), { once: true });
    el.loop = !ONE_SHOT.has(id);
    // fade in (the old track fades out underneath)
    el.volume = 0;
    this.ramp(el, Math.min(1, this.vol.master * this.vol.music), 450);
    this.el = el;
    this.elId = id;
    el.play().catch(() => {
      // browsers block sound until the first tap/click/key: start it the moment one happens
      const go = () => {
        for (const ev of ["pointerdown", "keydown", "touchend"]) window.removeEventListener(ev, go, true);
        if (this.el === el && el.paused) el.play().catch(() => undefined);
      };
      for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, go, true);
    });
  }

  private stopFile() {
    const old = this.el;
    if (old) {
      // a quick fade rather than a hard cut
      this.ramp(old, 0, 350, () => {
        old.pause();
        old.src = "";
      });
    }
    this.el = null;
    this.elId = "";
  }

  /** Slide an <audio> element's volume to `to` over `ms`. */
  private ramp(el: HTMLAudioElement, to: number, ms: number, done?: () => void) {
    const from = el.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      // a newer volume setting wins over a fade-in in progress
      if (el === this.el && to > 0 && k >= 1) el.volume = Math.min(1, this.vol.master * this.vol.music);
      else el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    requestAnimationFrame(step);
  }

  music(id: string, force = false, startFrac = 0) {
    if (MUSIC_FILES[id]) {
      this.trackId = "";
      this.track = null;
      this.playFile(id, force, startFrac);
      return;
    }
    this.stopFile();
    if (!force && id === this.trackId && this.timer !== null) return;
    this.trackId = id;
    this.track = TRACKS[id] ?? null;
    this.step = 0;
    if (!this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.05;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 60);
  }

  stopMusic() {
    this.stopFile();
    this.trackId = "";
    this.track = null;
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    const tr = this.track;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const i = this.step % 16;
      const swing = i % 2 === 1 ? (tr.swing ?? 0) * stepDur : 0;
      const t = this.nextTime + swing - this.ctx.currentTime;
      const bar = Math.floor(this.step / 16) % 4;
      const b = tr.bass[i];
      if (b >= 0) this.tone(midi(tr.root - 12 + this.deg(tr, b)), stepDur * 1.6, tr.bassWave, 0.22, Math.max(0, t), 0, this.musicGain);
      const l = tr.lead[(i + (bar === 3 ? 8 : 0)) % 16];
      if (l >= 0) this.tone(midi(tr.root + 12 + this.deg(tr, l + (bar === 2 ? 2 : 0))), stepDur * 0.9, tr.leadWave, 0.09, Math.max(0, t), 0, this.musicGain);
      if (tr.drums) {
        if (i % 4 === 0) this.tone(110, 0.12, "sine", 0.35, Math.max(0, t), 0.35, this.musicGain);
        if (i % 8 === 4) this.burst(0.1, 0.18, Math.max(0, t), 1800, this.musicGain, 0.8);
        if (i % 2 === 0) this.burst(0.03, 0.05, Math.max(0, t), 8000, this.musicGain, 1);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private deg(tr: Track, d: number): number {
    const n = tr.scale.length;
    const oct = Math.floor(d / n);
    return tr.scale[((d % n) + n) % n] + oct * 12;
  }
}

export const synth = new Synth();
