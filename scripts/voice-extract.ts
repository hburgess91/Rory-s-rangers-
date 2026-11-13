// Collects every spoken line in the game (dialogue, canon chat quotes, TV) for pre-recorded voices.
// Run: npx vite-node scripts/voice-extract.ts > voice-lines.json
import { writeFileSync } from "node:fs";
import { speakable, voiceKey } from "../src/game/audio/voiceKey";
import { CHARACTERS } from "../src/data/characters";

const PLAYABLE = Object.values(CHARACTERS).filter((c: any) => c.playable).map((c: any) => c.id as string);

const mods = import.meta.glob("../src/content/**/*.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const out = new Map<string, { s: string; t: string; file: string }>();
let CANON: Record<string, { speaker: string; text: string }> = {};
for (const [f, m] of Object.entries(mods)) if ((m as any).CANON) CANON = (m as any).CANON;

const SILENT = new Set(["NARRATOR", "ARCHIVE", "TAP"]);
function add(s: unknown, t: unknown, file: string) {
  if (typeof s !== "string" || typeof t !== "string" || !t.trim() || SILENT.has(s.toUpperCase())) return;
  const sp = speakable(t);
  if (!sp) return;
  const k = voiceKey(s, t);
  if (!out.has(k)) out.set(k, { s, t: sp, file });
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
    for (const sp of speakers) if (sp && text) add(sp, text, file);
    if (r.variants && typeof r.variants === "object") for (const [p, v] of Object.entries(r.variants as Record<string, string>)) add(r.s === "YOU" ? p : r.s, v, file);
    if (r.role && PLAYABLE.includes(r.s as string)) {
      if (typeof r.proctus === "string") add("PROCTUS", r.proctus, file);
      else if (text) add("PROCTUS", `(reading the wrong cue card) "${text}"... is that right? It says ${(CHARACTERS as any)[r.s as string].name} on the back.`, file);
    }
  }
  if (r.type === "speaker" && typeof r.character === "string") add(r.character, r.text, file);
  for (const v of Object.values(r)) walk(v, file);
}
for (const [f, m] of Object.entries(mods)) walk(m, f.replace("../src/content/", ""));
const arr = [...out.entries()].map(([k, v]) => ({ k, ...v }));
writeFileSync(process.argv[2] ?? "voice-lines.json", JSON.stringify(arr, null, 0));
const by: Record<string, number> = {};
for (const l of arr) by[l.s] = (by[l.s] ?? 0) + l.t.length;
console.log(arr.length, "lines", arr.reduce((a, l) => a + l.t.length, 0), "chars");
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, v]) => `${k}:${v}`).join("  "));
