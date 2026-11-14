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
import { extractCode } from "./voice-extract-code";

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
// data tables with dialogue in them (dungeon entry lines and PA announcements, etc.)
const data = import.meta.glob("../src/data/**/*.ts", { eager: true }) as Record<string, Record<string, unknown>>;
for (const [f, m] of Object.entries(data)) walk(m, f.replace("../src/", ""));

// Game code (src/game): say/adapt/ping(speaker, text) calls, voice.say(...) and { s, t } literals, with speakers and
// texts chosen at run time expanded to every value they can take (scripts/voice-extract-code.ts).
const LADS = PLAYABLE.filter((id) => id !== "MIKEY");
const ROOT = new URL("..", import.meta.url).pathname;
const CAST = JSON.parse(readFileSync(join(ROOT, "scripts/voice-cast.json"), "utf8"));
const HELD = new Set<string>([...CAST.hold, ...Object.entries(CAST.doubles ?? {}).filter(([k, v]) => k !== "_doc" && CAST.hold.includes(v)).map(([k]) => k)]);
const C = (rel: string) => mods[`../src/content/${rel}`] as any;
const { BARKS } = C("dialogue/ambient.ts");
const { MINISTRY_QUESTS } = C("quests.ts");
const { KRUNCHERS, KRUNCHER_BOAST } = C("kreddle.ts");
const name = (id: string) => (CHARACTERS as any)[id]?.name ?? id;
const SQUEEZERS = ["SHEZLEIGH", "BIG SUE", "DESTINY", "CRYSTAL"]; // HubScene setupSqueezers + the Club dancers (Mollor: DungeonScene)
const code = extractCode(
  ROOT,
  {
    PLAYABLE,
    LADS,
    extra: {
      "squeeze.ts:who.name": [...SQUEEZERS, "MOLLOR"],
      "Beatup.ts:lead.id": ["KREZMAR", "SCROMBUS", "KREBON", "KREZWONK"], // INSTIGATORS
      "Beatup.ts:m.id": ["KREZMAR", "SCROMBUS", "KREBON", "KREZWONK"],
      "Beatup.ts:this.mates[0].id": ["KREZMAR", "SCROMBUS", "KREBON", "KREZWONK"],
      "Beatup.ts:v.id": ["MIKEY", "CRONGUS", "FLENKY"], // VICTIMS
      "PubScene.ts:crowdIds[0]": LADS, // a shuffle of the lads who aren't you
      "PubScene.ts:crowdIds[1]": LADS,
      "KreddleScene.ts:n.name": KRUNCHERS.map((k: any) => k.name),
    },
    pairs: {
      // the minister gives his own quest; Proctus covers the player's ministry
      "HubScene.ts:n.id|`Ministry business. ${mq.title}: ${mq.desc}`": MINISTRY_QUESTS.flatMap((q: any) => [q.ministry, "PROCTUS"].map((g) => [g, `Ministry business. ${q.title}: ${q.desc}`])),
      "HubScene.ts:n.id|`${mq.title}: done. The ministry is grateful. Mildly. Here's your Krezzcoin.`": MINISTRY_QUESTS.flatMap((q: any) => [q.ministry, "PROCTUS"].map((g) => [g, `${q.title}: done. The ministry is grateful. Mildly. Here's your Krezzcoin.`])),
      // talking to a townsperson with nothing to say: one of his barks
      "HubScene.ts:n.id|b[Math.floor(Math.random() * b.length)].t": Object.entries(BARKS as Record<string, { t: string }[]>).flatMap(([id, bs]) => bs.map((b) => [id, b.t] as [string, string])),
      "KreddleScene.ts:n.name|n.jab ?? \"We hate you!\"": KRUNCHERS.map((k: any) => [k.name, k.jab]),
      "squeeze.ts:who.name|offer": [...SQUEEZERS.map((w) => [w, "Fancy a squeeze, love?"] as [string, string]), ["MOLLOR", "Want a cuddle?"]],
    },
    ignore: new Set([
      "Beatup.ts:this.victim!.id|line", // the whines: content/beatup.ts (each victim's own)
      "DungeonScene.ts:l.s|l.t", // dungeon talkers: src/data/dungeons.ts
      "Citadel.ts:who|text", // STAIRS_ECHOES (content/citadel)
      "RoofArena.ts:b.id|line.t", // FREED (content/finaleRoof)
      "TVScene.ts:b.character|b.text", // TV episodes (content/television)
      "narrative.ts:speaker|text",
      "DialogueBox.ts:String(l.s === \"YOU\" ? s.player : l.s)|l.t",
      "DialogueBox.ts:queue[i].s|REGISTER_JIBES[Math.floor(Math.random() * REGISTER_JIBES.length)]",
      "DialogueBox.ts:String(rl.s)|rl.t",
    ]),
    quiet: new Set([...SILENT, ...HELD]),
  },
  // texts known only at run time but from a small set
  { "Beatup.ts:v.name": ["Mikey", "Luke", "Jenko"], "VignetteScene.ts:leaker": PLAYABLE.filter((p) => p !== "CRONGUS").map(name) },
);
for (const l of code.lines) add(l.s, l.t, l.file, l.mood);
if (code.unresolved.length) {
  console.log(`${code.unresolved.length} game-code lines can't be pre-recorded (speaker or text only known at run time):`);
  for (const u of code.unresolved) console.log(`  ${u.file}:${u.line} ${u.what}: ${u.expr}`);
}
function* files(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (p.endsWith(".ts")) yield p;
  }
}
function unquote(lit: string) {
  const q = lit[0], body = lit.slice(1, -1);
  return body.replace(/\\(u\{?[0-9a-fA-F]+\}?|.)/g, (_m, e: string) =>
    e[0] === "u" ? String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ""), 16)) : e === "n" ? "\n" : e === "t" ? "\t" : e === q ? q : e);
}
const gameDir = new URL("../src/game", import.meta.url).pathname;
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
