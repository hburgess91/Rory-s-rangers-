import Phaser from 'phaser';
import { GENERATORS, VARIANTS, DRUMS } from './synth';
import { TRACKS, Track } from './music';
import { AUDIO } from '../config/assets';
import { getSettings, onSettings } from '../core/settings';

// One global audio bus for the whole game. Scenes never create their own
// music players, so restarting a scene can never duplicate music.

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Bus {
  game!: Phaser.Game;
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private musicDuck!: GainNode;
  private sfxGain!: GainNode;
  private voiceGain!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private drumBufs = new Map<string, AudioBuffer>();
  private rr = new Map<string, number>();
  private active = new Map<string, number>();
  private globalActive = 0;

  // music state
  private baseTrack: string | null = null;
  private override: string | null = null;
  private playingTrack: string | null = null;
  private seqTimer: number | null = null;
  private seqStep = 0;
  private seqNextTime = 0;
  private seqOut: GainNode | null = null;
  private fileMusic: Phaser.Sound.BaseSound | null = null;

  // counters used by tests and the debug overlay
  stats = { voice: {} as Record<string, number>, sfx: 0, musicStarts: 0, liveSequencers: 0 };

  init(game: Phaser.Game) {
    this.game = game;
    const sm = game.sound as Phaser.Sound.WebAudioSoundManager;
    if (!('context' in sm) || !sm.context) return; // no WebAudio: stay silent
    this.ctx = sm.context;
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    comp.connect(this.master);
    this.musicGain = c.createGain();
    this.musicDuck = c.createGain();
    this.musicGain.connect(this.musicDuck).connect(comp);
    this.sfxGain = c.createGain();
    this.sfxGain.connect(comp);
    this.voiceGain = c.createGain();
    this.voiceGain.connect(comp);
    this.applyVolumes();
    onSettings(() => this.applyVolumes());

    const sr = c.sampleRate;
    for (const [id, gen] of Object.entries(GENERATORS)) {
      const variants = VARIANTS[id] ?? 1;
      for (let v = 0; v < variants; v++) this.buffers.set(variants > 1 ? `${id}#${v}` : id, this.toBuffer(gen(sr, v)));
    }
    for (const [id, gen] of Object.entries(DRUMS)) this.drumBufs.set(id, this.toBuffer(gen(sr, 0)));
  }

  private toBuffer(samples: Float32Array) {
    const b = this.ctx!.createBuffer(1, samples.length, this.ctx!.sampleRate);
    b.getChannelData(0).set(samples);
    return b;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = getSettings();
    this.musicGain.gain.value = s.musicVol * 0.5;
    this.sfxGain.gain.value = s.sfxVol * 0.7;
    this.voiceGain.gain.value = s.voiceVol;
  }

  unlock() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  /** Play a jump vocal or other voice line. Prefers supplied recordings. */
  voice(id: 'vo_yee' | 'vo_yeghhh' | 'vo_bear' | 'vo_bear_sob', opts: { rate?: number; vol?: number } = {}) {
    this.stats.voice[id] = (this.stats.voice[id] ?? 0) + 1;
    // supplied recordings: vo_yee_1..3 etc.
    const finals = AUDIO.filter((a) => a.status === 'final' && a.id.startsWith(id + '_') && this.game.cache.audio.exists(a.id));
    const n = (this.rr.get(id) ?? 0) + 1;
    this.rr.set(id, n);
    if (finals.length) {
      const pick = finals[n % finals.length];
      this.game.sound.play(pick.id, { volume: (opts.vol ?? 1) * getSettings().voiceVol, rate: opts.rate ?? 1 });
      this.duck();
      return;
    }
    const variants = VARIANTS[id] ?? 1;
    this.playBuffer(`${id}#${n % variants}`, this.voiceGain, opts.vol ?? 1, opts.rate ?? 1, 3);
    this.duck();
  }

  /** Distorted copy of a jump vocal (Gabor mocking you). Not counted as a jump vocal. */
  mock(id: 'vo_yee' | 'vo_yeghhh', rate = 0.6) {
    this.playBuffer(`${id}#0`, this.voiceGain, 0.8, rate, 2);
  }

  /** Short sound effect. Round-robins variants and caps simultaneous copies. */
  sfx(id: string, opts: { vol?: number; rate?: number; maxCopies?: number } = {}) {
    this.stats.sfx++;
    const variants = VARIANTS[id];
    let key = id;
    if (variants) {
      const n = (this.rr.get(id) ?? 0) + 1;
      this.rr.set(id, n);
      key = `${id}#${n % variants}`;
    }
    this.playBuffer(key, this.sfxGain, opts.vol ?? 1, opts.rate ?? 1, opts.maxCopies ?? 4);
  }

  private playBuffer(key: string, dest: GainNode | undefined, vol: number, rate: number, maxCopies: number) {
    if (!this.ctx || !dest) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    const base = key.split('#')[0];
    const n = this.active.get(base) ?? 0;
    if (n >= maxCopies || this.globalActive > 28) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(dest);
    this.active.set(base, n + 1);
    this.globalActive++;
    src.onended = () => {
      this.active.set(base, Math.max(0, (this.active.get(base) ?? 1) - 1));
      this.globalActive = Math.max(0, this.globalActive - 1);
      g.disconnect();
    };
    src.start();
  }

  private duck() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.musicDuck.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.45, t + 0.03);
    g.linearRampToValueAtTime(1, t + 0.6);
  }

  // ---------------- music ----------------

  /** Set the level/scene music. Calling it again with the same id does nothing. */
  music(id: string | null) {
    this.baseTrack = id;
    this.refreshMusic();
  }

  /** Temporarily replace the music (Delusion / Crunk). null restores the base track. */
  musicOverride(id: string | null) {
    this.override = id;
    this.refreshMusic();
  }

  get currentTrack() {
    return this.playingTrack;
  }

  private refreshMusic() {
    const want = this.override ?? this.baseTrack;
    if (want === this.playingTrack) return;
    this.stopMusicNow();
    this.playingTrack = want;
    if (!want) return;
    this.stats.musicStarts++;
    if (this.game.cache.audio.exists(want)) {
      this.fileMusic = this.game.sound.add(want, { loop: true, volume: getSettings().musicVol });
      this.fileMusic.play();
      return;
    }
    const track = TRACKS[want];
    if (!track || !this.ctx) return;
    this.startSequencer(track);
  }

  private stopMusicNow() {
    if (this.fileMusic) {
      this.fileMusic.stop();
      this.fileMusic.destroy();
      this.fileMusic = null;
    }
    if (this.seqTimer !== null) {
      clearInterval(this.seqTimer);
      this.seqTimer = null;
      this.stats.liveSequencers--;
    }
    if (this.seqOut && this.ctx) {
      const out = this.seqOut;
      const t = this.ctx.currentTime;
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.15);
      setTimeout(() => out.disconnect(), 400);
      this.seqOut = null;
    }
  }

  private startSequencer(track: Track) {
    const c = this.ctx!;
    this.seqOut = c.createGain();
    this.seqOut.gain.value = track.gain ?? 0.8;
    this.seqOut.connect(this.musicGain);
    this.seqStep = 0;
    this.seqNextTime = c.currentTime + 0.08;
    const stepDur = 60 / track.bpm / 4;
    const byStep = new Map<number, typeof track.notes>();
    for (const n of track.notes) {
      const arr = byStep.get(n.step) ?? [];
      arr.push(n);
      byStep.set(n.step, arr);
    }
    const out = this.seqOut;
    const tick = () => {
      // If the tab was hidden for a while, skip ahead rather than burst-scheduling.
      if (this.seqNextTime < c.currentTime - 0.2) this.seqNextTime = c.currentTime + 0.05;
      while (this.seqNextTime < c.currentTime + 0.15) {
        const s = this.seqStep % track.steps;
        const t = this.seqNextTime;
        for (const n of byStep.get(s) ?? []) this.note(out, track, n.ch, midiHz(n.midi), t, n.len * stepDur);
        for (const [drum, steps] of Object.entries(track.drums)) if (steps!.includes(s)) this.drum(out, drum, t);
        this.seqStep++;
        this.seqNextTime += stepDur;
      }
    };
    tick();
    this.seqTimer = window.setInterval(tick, 25);
    this.stats.liveSequencers++;
  }

  private note(out: GainNode, track: Track, ch: keyof Track['wave'], hz: number, t: number, dur: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = track.wave[ch];
    o.frequency.value = hz;
    const g = c.createGain();
    const peak = { lead: 0.16, bass: 0.26, pad: 0.06, arp: 0.08 }[ch];
    const rel = ch === 'pad' ? dur * 0.9 : Math.min(dur * 0.9, 0.25);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.setValueAtTime(peak * 0.8, t + Math.max(0.01, dur - rel));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => g.disconnect();
  }

  private drum(out: GainNode, id: string, t: number) {
    const buf = this.drumBufs.get(id);
    if (!buf) return;
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = id === 'hat' ? 0.25 : 0.6;
    src.connect(g).connect(out);
    src.start(t);
    src.onended = () => g.disconnect();
  }
}

export const AudioBus = new Bus();
