/**
 * Playing as Mikey in SanMik form: Mikey's lines come out SanMik-flavoured on screen. His spelling
 * goes ("u", "ure", "wiv"), and roughly half his lines pick up a YEE, a bit of a song, or an
 * unprovoked "u fucking CUNTZ". The voice still reads the original line; the YEEs get a real
 * yee clip each.
 *
 * Everything is picked from a hash of the line, so the same line always comes out the same way.
 */

export interface SanmikLine {
  text: string;
  /** Yee clips to play before the line is read (0 = none). */
  leadYees: number;
  /** Yee clips to play once the line has been read (0 = none). */
  tailYees: number;
}

const LEAD: { t: string; yees: number }[] = [
  { t: "YEEE. ", yees: 1 },
  { t: "YEE YEE. ", yees: 2 },
  { t: "YEEEEEE! ", yees: 1 },
  { t: "Yo yo yo, SanMik in tha building. ", yees: 0 },
  { t: "Big up all da manz. ", yees: 0 },
  { t: "Brap brap. ", yees: 0 },
];

const TAIL: { t: string; yees: number }[] = [
  { t: " YEEE!", yees: 1 },
  { t: " YEE YEE YEE!", yees: 3 },
  { t: " u fucking CUNTZ", yees: 0 },
  { t: " yeee am horney", yees: 1 },
  { t: " Everyone knows I'm solid.", yees: 0 },
  { t: " No cunt touches me. YEE.", yees: 1 },
  { t: " Catford Fox Crew!", yees: 0 },
  { t: " Go and suck ure nans.", yees: 0 },
  { t: " PEENER 4EVA", yees: 0 },
  { t: " I'll fucking sherk u.", yees: 0 },
  { t: " ♪ Wank til u spunk ♪", yees: 0 },
  { t: " ♪ Deep in ure ass ♪", yees: 0 },
  { t: " ♪ Peener colarder, yeah ♪", yees: 0 },
  { t: " ♪ In tha hot tub, in tha hot tub ♪", yees: 0 },
  { t: " ♪ I don't need yhu ♪", yees: 0 },
  { t: " ♪ Viva reggaeton ♪ YEE", yees: 1 },
  { t: " ♪ Fragrant bitch ♪", yees: 0 },
  { t: " ♪ Gettin crunk wiv SanChz ♪", yees: 0 },
  { t: " ♪ Happy birthday u cunt ♪", yees: 0 },
];

/** SanMik's spelling. Whole words only, and the case is kept (YOU -> U, You -> U, you -> u). */
const SPELL: [RegExp, string][] = [
  [/\byou're\b/gi, "ur"],
  [/\byour\b/gi, "ure"],
  [/\byou\b/gi, "u"],
  [/\bwith\b/gi, "wiv"],
  [/\bthe\b/gi, "tha"],
  [/\bthat\b/gi, "dat"],
  [/\bplease\b/gi, "plz"],
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function matchCase(word: string, rep: string): string {
  if (word === word.toUpperCase() && /[A-Z]/.test(word)) return rep.toUpperCase();
  if (word[0] === word[0].toUpperCase() && /[A-Z]/.test(word[0])) return rep[0].toUpperCase() + rep.slice(1);
  return rep;
}

function respell(text: string): string {
  let out = text;
  for (const [re, rep] of SPELL) out = out.replace(re, (w) => matchCase(w, rep));
  return out;
}

/** Turn one of Mikey's lines into SanMik's. `text` is what would have been shown (tags already stripped). */
export function sanmikify(text: string): SanmikLine {
  const t = text.trim();
  if (!t) return { text, leadYees: 0, tailYees: 0 };
  const h = hash(t);
  let out = respell(t);
  let leadYees = 0;
  let tailYees = 0;
  const roll = h % 100;
  if (roll < 22) {
    const l = LEAD[(h >>> 8) % LEAD.length];
    out = l.t + out;
    leadYees = l.yees;
  } else if (roll < 58) {
    const tl = TAIL[(h >>> 8) % TAIL.length];
    // a line ending in "…" or "—" is cut off mid-thought: don't bolt anything on
    if (!/[…—-]$/.test(out)) {
      out = out + tl.t;
      tailYees = tl.yees;
    }
  } else if (roll < 64) {
    // the full SanMik: both ends
    const l = LEAD[(h >>> 8) % 3];
    const tl = TAIL[(h >>> 16) % 2];
    out = l.t + out + tl.t;
    leadYees = l.yees;
    tailYees = tl.yees;
  }
  return { text: out, leadYees, tailYees };
}
