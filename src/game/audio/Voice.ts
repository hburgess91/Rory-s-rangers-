// Text-to-speech for dialogue, using the browser's built-in voices (Web Speech API).
// Each character gets a stable voice, pitch and rate. Stage directions stay silent.
import { G } from "../G";
import { speakable, voiceKey } from "./voiceKey";
import { synth } from "./Synth";

// ------------------------------------------------------------------ recorded lines (ElevenLabs, pre-generated)
// public/audio/voice/index.json maps a line's key to [bundle, offset, length, voice]; bundles are mp3 clips
// concatenated together, so a scene's lines arrive in one download. Lines without a recording fall back to TTS.
type RecEntry = [string, number, number, string];
let recIndex: Record<string, RecEntry> | null = null;
let recIndexP: Promise<void> | null = null;
const recBundles: Record<string, Promise<ArrayBuffer | null>> = {};
function loadRecIndex() {
  recIndexP ??= fetch("audio/voice/index.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then((j) => void (recIndex = j as Record<string, RecEntry>))
    .catch(() => void (recIndex = {}));
  return recIndexP;
}
function recBundle(b: string) {
  return (recBundles[b] ??= fetch(`audio/voice/${b}.bin`)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null));
}
if (typeof window !== "undefined") setTimeout(() => void loadRecIndex(), 1500);
let recToken = 0;
let recPending = false;
let recSrc: AudioBufferSourceNode | null = null;

interface Profile {
  pitch: number;
  rate: number;
  female?: boolean;
}

const PROFILES: Record<string, Profile> = {
  "POLSON'S MUM": { pitch: 1.05, rate: 0.95, female: true },
  DESTINY: { pitch: 1.3, rate: 1, female: true },
  CRYSTAL: { pitch: 1.15, rate: 0.95, female: true },
  "BIG DEREK": { pitch: 0.45, rate: 0.85 },
  "ESTATE SPOKESPERSON": { pitch: 0.8, rate: 0.85 },
  CHANCELLOR: { pitch: 1.15, rate: 1.1 },
  "DR. JAMESON": { pitch: 1.3, rate: 1.2 },
  "JEREMY CORBYN": { pitch: 0.85, rate: 0.9 },
  "COOKIE MONSTER": { pitch: 0.3, rate: 0.85 },
  "JUDGE KRELMOR": { pitch: 0.55, rate: 0.8 },
  "BARRY SNODGRASS": { pitch: 1.1, rate: 1.25 },
  "BENDY KRENDY": { pitch: 0.9, rate: 1 },
  VICAR: { pitch: 1.2, rate: 1 },
  "SUSAN NIPWOOD": { pitch: 1.6, rate: 0.6, female: true },
  MARY: { pitch: 1.2, rate: 1.05, female: true },
  JOHN: { pitch: 0.95, rate: 1 },
  PROSECUTOR: { pitch: 1, rate: 1, female: true },
  "JUROR NUMBER 2": { pitch: 0.7, rate: 0.75 },
  "MARGE PLUNKETT": { pitch: 1.35, rate: 1.15, female: true },
  "PRESIDENT HAN": { pitch: 0.9, rate: 1.1 },
  SQUID: { pitch: 1.1, rate: 0.85 },
  "PRIME MINISTER": { pitch: 0.95, rate: 1 },
  "RISHI SUNAK": { pitch: 1.15, rate: 1.05 },
  JOE: { pitch: 1.1, rate: 1.05 },
  DAVE: { pitch: 0.6, rate: 0.95 },
  SUE: { pitch: 0.9, rate: 1.1, female: true },
  "DAVID DICKINSON": { pitch: 0.8, rate: 0.9 },
  "DONALD TRUMP": { pitch: 0.75, rate: 0.95 },
  "JOE BIDEN": { pitch: 0.85, rate: 0.8 },
  "PROFESSOR GUTTRIDGE": { pitch: 0.75, rate: 0.9 },
  WOMAN: { pitch: 1.25, rate: 1, female: true },
  KAREN: { pitch: 1.2, rate: 1.2, female: true },
  DRONGUS: { pitch: 0.6, rate: 0.85 },
  FLENKY: { pitch: 1.15, rate: 1.15 },
  KREZMAR: { pitch: 0.95, rate: 1.05 },
  KREBLIS: { pitch: 0.85, rate: 1.0 },
  KREZWONK: { pitch: 0.7, rate: 0.8 },
  SCROMBUS: { pitch: 1.0, rate: 1.1 },
  KREBON: { pitch: 0.55, rate: 0.9 },
  CRONGUS: { pitch: 1.5, rate: 1.25 },
  GRONNY: { pitch: 0.75, rate: 0.85 },
  MIKEY: { pitch: 1.2, rate: 1.05 },
  PROCTUS: { pitch: 1.35, rate: 0.95 },
  POLSON: { pitch: 0.8, rate: 0.85 },
  EDEN: { pitch: 1.2, rate: 1.1, female: true },
  "BOGGOR CRANSTIL": { pitch: 0.5, rate: 0.75 },
  "SERGEANT SWIG": { pitch: 0.7, rate: 1.0 },
  MOLLOR: { pitch: 1.25, rate: 1.0, female: true },
  "THE CUDDLE CRONSTER": { pitch: 1.6, rate: 0.85 },
  "JENNY CUMMING": { pitch: 1.15, rate: 1.05, female: true },
  REPORTER: { pitch: 1.1, rate: 1.05, female: true },
  HOST: { pitch: 1.3, rate: 1.2, female: true },
  CHEERLEADERS: { pitch: 1.5, rate: 1.2, female: true },
  PEGGY: { pitch: 1.1, rate: 1.1, female: true },
  SHEZLEIGH: { pitch: 1.05, rate: 1.2, female: true },
  MADISON: { pitch: 1.35, rate: 1.1, female: true },
  SCRIMBLE: { pitch: 1.8, rate: 1.2 },
  PHEZON: { pitch: 1.9, rate: 1.2 },
  KROZNO: { pitch: 0.6, rate: 0.95 },
  "CAPTAIN STANLEY": { pitch: 0.75, rate: 1.05 },
  "RUSSELL BRAND": { pitch: 1.1, rate: 1.3 },
  "ALISTAIR SWAMP": { pitch: 0.4, rate: 0.8 },
};

const FEMALE_HINT = /female|woman|samantha|victoria|karen|moira|tessa|serena|kate|susan|hazel|libby|sonia|zira|fiona|martha|amy|emma|olivia|ava|allison|siri.*female/i;
const MALE_HINT = /\bmale\b|daniel|george|ryan|thomas|oliver|arthur|alex|fred|rishi|guy|david|mark|james/i;

let voicesCache: SpeechSynthesisVoice[] = [];
function voices() {
  if (!("speechSynthesis" in window)) return [];
  if (!voicesCache.length) {
    const all = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang) && !NOVELTY.test(v.name + " " + v.voiceURI));
    // British first, then other English
    voicesCache = [...all.filter((v) => /GB|UK/i.test(v.lang + v.name)), ...all.filter((v) => !/GB|UK/i.test(v.lang + v.name))];
  }
  return voicesCache;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => (voicesCache = []);
  // Browsers only let speech start from inside a real tap/click/keypress (Safari especially), and Chrome's
  // engine can sit "stuck" until it's paused and resumed. The game's own input runs a frame later, outside
  // the gesture, so prime it here, synchronously, on every real gesture.
  let primed = false;
  const prime = () => {
    const ss = window.speechSynthesis;
    try {
      if (!primed) {
        primed = true;
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        ss.speak(u);
      }
      if (ss.paused || (ss.pending && !ss.speaking)) {
        ss.pause();
        ss.resume();
      } else ss.resume();
    } catch {
      /* no speech here */
    }
  };
  for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, prime, { capture: true, passive: true });
}

// Apple's novelty voices that sing or laugh instead of talking.
const NOVELTY = /\b(Bad News|Good News|Bahh|Bells|Cellos|Organ|Pipe ?Organ|Jester|Hysterical|Deranged|Superstar)\b/i;

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function pickVoice(speaker: string, female: boolean) {
  const vs = voices();
  if (!vs.length) return null;
  const pool = vs.filter((v) => (female ? FEMALE_HINT.test(v.name) : !FEMALE_HINT.test(v.name) || MALE_HINT.test(v.name)));
  const list = pool.length ? pool : vs;
  return list[hash(speaker) % list.length];
}

export { speakable };

/** Split text into chunks of whole sentences (or clauses / words if needed), each at most `max` chars. */
export function chunkSpeech(text: string, max = 160): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  const push = (p: string) => {
    if ((cur + p).length <= max) { cur += p; return; }
    if (cur.trim()) out.push(cur.trim());
    cur = "";
    if (p.length <= max) { cur = p; return; }
    // a single over-long sentence: break on commas, then on words
    for (const w of p.split(/(?<=[,;:])\s+|\s+/)) {
      if ((cur + " " + w).trim().length > max && cur.trim()) { out.push(cur.trim()); cur = ""; }
      cur = (cur + " " + w).trim();
    }
  };
  for (const p of parts) push(p);
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : [text];
}

/** The utterances being spoken right now (kept so the browser doesn't drop them). */
let live: SpeechSynthesisUtterance[] = [];

export const voice = {
  enabled() {
    return G.meta.settings.voices !== false;
  },
  stop() {
    recToken++;
    recPending = false;
    if (recSrc) {
      try {
        recSrc.stop();
      } catch {
        /* already stopped */
      }
      recSrc = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  },
  /** True while a line (or any of its chunks) is still being read out. */
  busy() {
    if (!this.enabled()) return false;
    if (recPending || recSrc) return true;
    return "speechSynthesis" in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
  },
  /** Start downloading the recordings for lines that are about to be said. */
  prefetch(lines: { s: string; t: string }[]) {
    void loadRecIndex().then(() => {
      for (const l of lines) {
        const e = recIndex?.[voiceKey(l.s, l.t)];
        if (e) void recBundle(e[0]);
      }
    });
  },
  /** Speak a line as `speaker`: the recording if there is one, otherwise the browser's voice. Cancels whatever was being said. */
  say(speaker: string, text: string) {
    if (!this.enabled()) return;
    this.stop();
    const my = recToken;
    const key = voiceKey(speaker, text);
    const go = () => {
      if (my !== recToken) return;
      const e = recIndex?.[key];
      const ctx = synth.ctx;
      if (!e || !ctx) return this.tts(speaker, text);
      recPending = true;
      void recBundle(e[0]).then(async (buf) => {
        if (my !== recToken) return;
        if (!buf) {
          recPending = false;
          return this.tts(speaker, text);
        }
        let audio: AudioBuffer;
        try {
          audio = await ctx.decodeAudioData(buf.slice(e[1], e[1] + e[2]));
        } catch {
          recPending = false;
          return this.tts(speaker, text);
        }
        if (my !== recToken) return;
        const src = ctx.createBufferSource();
        src.buffer = audio;
        // the speed setting was tuned for robot voices (default 1.5x): recordings only nudge a little either way
        src.playbackRate.value = Math.max(0.85, Math.min(1.25, 1 + ((G.meta.settings.voiceSpeed ?? 1.5) - 1.5) * 0.3));
        const g = ctx.createGain();
        g.gain.value = (G.meta.settings.voiceVolume ?? 0.8) * (G.meta.settings.master ?? 1) * 1.4;
        src.connect(g).connect(ctx.destination);
        src.onended = () => {
          if (recSrc === src) recSrc = null;
        };
        recSrc = src;
        recPending = false;
        src.start();
      });
    };
    if (recIndex) go();
    else void loadRecIndex().then(go);
  },
  /** The browser's built-in text-to-speech. */
  tts(speaker: string, text: string) {
    if (!("speechSynthesis" in window)) return;
    const t = speakable(text);
    if (!t) return;
    const prof = PROFILES[speaker.toUpperCase()] ?? { pitch: 0.8 + (hash(speaker) % 9) / 15, rate: 0.95 + (hash(speaker + "r") % 5) / 20 };
    const v = pickVoice(speaker, !!prof.female);
    const ss = window.speechSynthesis;
    // Browsers silently cut off long utterances (~15s on Chrome), so read long passages as a queue of short chunks.
    const queue = chunkSpeech(t).map((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (v) u.voice = v;
      u.lang = v?.lang ?? "en-GB";
      u.pitch = Math.max(0, Math.min(2, prof.pitch));
      u.rate = Math.max(0.5, Math.min(2, prof.rate * (G.meta.settings.voiceSpeed ?? 1.5)));
      u.volume = (G.meta.settings.voiceVolume ?? 0.8) * (G.meta.settings.master ?? 1);
      return u;
    });
    // Chrome bin utterances that get garbage-collected mid-speech: hold on to them
    live = queue;
    const go = () => {
      // Chrome sometimes leaves the speech engine stuck "paused" (e.g. after a tab switch)
      ss.resume();
      for (const u of queue) ss.speak(u);
    };
    if (ss.speaking || ss.pending) {
      ss.cancel();
      // speaking straight after cancel() gets dropped in Chrome: give it a moment
      setTimeout(go, 80);
    } else go();
    // watchdog: lines queued but nothing coming out means the engine's stuck; a pause/resume unsticks it
    setTimeout(() => {
      if (live === queue && ss.pending && !ss.speaking) {
        ss.pause();
        ss.resume();
      }
    }, 400);
  },
};
