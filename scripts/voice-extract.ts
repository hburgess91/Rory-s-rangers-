// Collects every spoken line in the game (dialogue, canon chat quotes, TV) for pre-recorded voices.
// Run: npx vite-node scripts/voice-extract.ts voice-lines.json
// Each entry: { k: key, s: speaker, t: spoken text (delivery tags kept), m: explicit mood ("" if none),
//               raw: the line as written (for auto-mood), file }. Lines written straight into scene code as
// say("SPEAKER", "literal") are picked up too (template strings with ${} can't be pre-recorded).
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { speakable, voiceKey } from "../src/game/audio/voiceKey";
import { CHARACTERS } from "../src/data/characters";
import { goat } from "../src/content/dsl";

const PLAYABLE = Object.values(CHARACTERS).filter((c: any) => c.playable).map((c: any) => c.id as string);

const mods = import.meta.glob("../src/content/**/*.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const out = new Map<string, { s: string; t: string; m: string; raw: string; file: string }>();
let CANON: Record<string, { speaker: string; text: string }> = {};
for (const [f, m] of Object.entries(mods)) if ((m as any).CANON) CANON = (m as any).CANON;

const SILENT = new Set(["NARRATOR", "ARCHIVE", "TAP"]);
function add(s: unknown, t: unknown, file: string, mood?: unknown) {
  if (typeof s !== "string" || typeof t !== "string" || !t.trim() || SILENT.has(s.toUpperCase())) return;
  if (!/[\p{L}\p{N}]/u.test(speakable(t))) return; // nothing to say ("...", emoji)
  const k = voiceKey(s, t);
  const m = typeof mood === "string" ? mood.trim() : "";
  const prev = out.get(k);
  if (!prev || (m && !prev.m)) out.set(k, { s, t: speakable(t, true), m, raw: t, file });
}
const seen = new WeakSet<object>();
function walk(o: unknown, file: string) {
  if (!o || typeof o !== "object" || seen.has(o as object)) return;
  seen.add(o as object);
  if (Array.isArray(o)) { for (const x of o) walk(x, file); return; }
  const r = o as Record<string, unknown>;
  if (typeof r.s === "string" && !r.dir) {
    let text = typeof r.t === "string" && r.t ? r.t : typeof r.canon === "string" && CANON[r.canon] ? CANON[r.canon].text : "";
    const speakers = r.s === "YOU" ? PLAYABLE : [r.s || (typeof r.canon === "string" ? CANON[r.canon]?.speaker : "")];
    for (const sp of speakers) if (sp && text) add(sp, text, file, r.mood);
    if (r.variants && typeof r.variants === "object") for (const [p, v] of Object.entries(r.variants as Record<string, string>)) add(r.s === "YOU" ? p : r.s, v, file, r.mood);
    if (r.role && PLAYABLE.includes(r.s as string)) {
      if (typeof r.proctus === "string") add("PROCTUS", r.proctus, file);
      else if (text) add("PROCTUS", `(reading the wrong cue card) "${text}"... is that right? It says ${(CHARACTERS as any)[r.s as string].name} on the back.`, file);
    }
  }
  if (r.type === "speaker" && typeof r.character === "string") add(r.character, r.text, file, r.mood);
  for (const v of Object.values(r)) walk(v, file);
}
for (const [f, m] of Object.entries(mods)) walk(m, f.replace("../src/content/", ""));

// Scene code: say("SPEAKER", "text" [, { mood: "..." }]) with literal strings only.
// speakers picked at run time: Night of Freedom's driver (SanMik, or Gabor when you're Mikey), the SanMikverse radio
const DYNAMIC: Record<string, string[]> = { "this.dancerName()": ["DESTINY", "CRYSTAL"], "this.driver": ["SANMIK", "GABOR THE GOAT"], "sanRadio()": ["SANMIK", "SANCHZ"] };
const CALL = /(?<![.\w])(?:say|adapt|ping)\(\s*("[A-Z0-9][A-Z0-9 .,'’!-]*"|this\.dancerName\(\)|this\.driver|sanRadio\(\))\s*,\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\$]|\\.)*`)\s*(,\s*\{[^}]*\})?\s*\)/g;
function unquote(lit: string) {
  const q = lit[0], body = lit.slice(1, -1);
  return body.replace(/\\(u\{?[0-9a-fA-F]+\}?|.)/g, (_m, e: string) =>
    e[0] === "u" ? String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ""), 16)) : e === "n" ? "\n" : e === "t" ? "\t" : e === q ? q : e);
}
function* files(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (p.endsWith(".ts")) yield p;
  }
}
const gameDir = new URL("../src/game", import.meta.url).pathname;
for (const p of files(gameDir)) {
  const src = readFileSync(p, "utf8");
  for (const m of src.matchAll(CALL)) {
    const who = m[1].startsWith('"') ? [m[1].slice(1, -1)] : DYNAMIC[m[1]] ?? [];
    const text = unquote(m[2]);
    const mood = m[3]?.match(/mood:\s*["']([^"']+)["']/)?.[1];
    for (const sp of who.flatMap((w) => (w === "YOU" ? PLAYABLE : [w]))) add(sp, text, "game/" + p.slice(gameDir.length + 1), mood);
  }
}
// Gabor the Goat in scene code: gabor("literal") is said in goat-speak (content/dsl.ts goat()).
const GABOR = /(?<![.\w])gabor\(\s*("(?:[^"\\\n]|\\.)*")\s*(,\s*\{[^}]*\})?\s*\)/g;
for (const p of files(gameDir)) {
  const src = readFileSync(p, "utf8");
  for (const m of src.matchAll(GABOR)) add("GABOR THE GOAT", goat(unquote(m[1])), "game/" + p.slice(gameDir.length + 1), m[2]?.match(/mood:\s*["']([^"']+)["']/)?.[1]);
}
const arr = [...out.entries()].map(([k, v]) => ({ k, ...v }));
writeFileSync(process.argv[2] ?? "voice-lines.json", JSON.stringify(arr, null, 0));
const by: Record<string, number> = {};
for (const l of arr) by[l.s] = (by[l.s] ?? 0) + l.t.length;
console.log(arr.length, "lines", arr.reduce((a, l) => a + l.t.length, 0), "chars");
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, v]) => `${k}:${v}`).join("  "));
