// Script export for the writer: the whole game's dialogue as four editable documents.
//
//   npx vite-node scripts/script-export.ts <outdir>
//
// Writes, into <outdir>:
//   1_main_story.md / .docx       the critical path, in play order (opening → Chapter 7 → the ending)
//   2_side_quests.md / .docx      optional and character side quests
//   3_drongus_statuses.md / .docx every Drongus status / ping / group-chat message
//   4_krezz_arms.md / .docx       everything that can happen in the Krezz Arms
//   coverage.txt                  content Lines that aren't in any document (and aren't deliberately left out)
//
// How it works. Content modules (src/content/**, src/data/dungeons.ts) are imported for real, so the text is exactly
// what the game shows (canon quotes resolved, Gabor's goat-speak applied). Every Line gets a short reference tag
// (file + export + path + index) so an edit can be found again in the source. Scene code (src/game/**) is read with
// the TypeScript parser: inline say()/dir()/ping() calls and { s, t } lines are pulled out of the named methods in
// source order (tagged file:line), and references to content exports are expanded in place.
//
// Play order is a hand-written map (doc1() below). Anything new that turns up in the story files (ch6/ch7/citadel/
// finale…) and isn't in the map is slotted in by export order, straight after the export that comes before it in
// its file, so a rerun after more writing still catches everything. The coverage check lists whatever is left.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { CHARACTERS } from "../src/data/characters";
import { DUNGEONS } from "../src/data/dungeons";
import { BAN_RULES } from "../src/game/systems/ban";
import { goat } from "../src/content/dsl";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "script-export"));
mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------------ content modules

const globbed = import.meta.glob("../src/content/**/*.ts", { eager: true }) as Record<string, Record<string, unknown>>;
/** abs path → module namespace */
const MODS = new Map<string, Record<string, unknown>>();
for (const [k, m] of Object.entries(globbed)) MODS.set(path.resolve(ROOT, "scripts", k), m);
MODS.set(path.join(ROOT, "src/data/dungeons.ts"), { DUNGEONS });
MODS.set(path.join(ROOT, "src/game/systems/ban.ts"), { BAN_RULES });

const rel = (abs: string) => path.relative(path.join(ROOT, "src"), abs).replace(/\\/g, "/");
const base = (abs: string) => path.basename(abs);
const modByName = (name: string): [string, Record<string, unknown>] => {
  for (const [abs, m] of MODS) if (rel(abs) === name || rel(abs) === `content/${name}` || base(abs) === name) return [abs, m];
  throw new Error(`no content module ${name}`);
};
const exp = (file: string, name: string): any => modByName(file)[1][name];

const CANON = (exp("canonQuotes.ts", "CANON") ?? {}) as Record<string, { speaker: string; text: string }>;
const EPISODES = new Map<string, any>(((exp("channels.ts", "ALL_EPISODES") ?? []) as any[]).map((e) => [e.id, e]));
const BOSS_TEXT = exp("bosses.ts", "BOSS_TEXT") as Record<string, any>;
const ARCS = exp("arcs.ts", "ARCS") as any[];
const CHAPTERS = exp("chapters.ts", "CHAPTERS") as any[];
const MEETINGS = exp("meetings/index.ts", "MEETINGS") as Record<string, any>;
const PLAYABLE = Object.values(CHARACTERS as Record<string, any>).filter((c) => c.playable).map((c) => c.id as string);

/** Source order of each module's exports (namespace objects list them alphabetically). */
const EXPORT_ORDER = new Map<string, string[]>();
for (const abs of MODS.keys()) {
  if (!existsSync(abs)) continue;
  const sf = ts.createSourceFile(abs, readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  for (const st of sf.statements) {
    if (ts.isVariableStatement(st) && st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
  }
  EXPORT_ORDER.set(abs, names);
}

// ------------------------------------------------------------------ the Line registry (for tags + coverage)

const isLine = (o: any): boolean => !!o && typeof o === "object" && !Array.isArray(o) && typeof o.s === "string" && ("t" in o || "canon" in o || "react" in o || "choice" in o || "tv" in o);
interface Reg {
  tag: string;
  depth: number;
  key: string; // abs::export
}
const REG = new Map<object, Reg>();
const SKIP_SEG = new Set(["steps", "step", "lines", "beats"]);
function segOf(v: any, i: number | string): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    if (typeof v.id === "string") return v.id;
    if (typeof v.n === "number") return String(v.n);
  }
  return String(i);
}
function register(v: any, abs: string, ex: string, segs: string[], seen: Set<object>) {
  if (!v || typeof v !== "object" || seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) {
    v.forEach((x, i) => {
      if (isLine(x)) {
        const tag = `${base(abs)} ${[ex, ...segs].join("/")}#${i}`;
        const depth = segs.length;
        const cur = REG.get(x);
        if (!cur || depth < cur.depth) REG.set(x, { tag, depth, key: `${abs}::${ex}` });
        register(x, abs, ex, [...segs, String(i)], seen);
      } else register(x, abs, ex, [...segs, segOf(x, i)], seen);
    });
    return;
  }
  if (isLine(v) && segs.length === 0) {
    const cur = REG.get(v);
    if (!cur || cur.depth > 0) REG.set(v, { tag: `${base(abs)} ${ex}`, depth: 0, key: `${abs}::${ex}` });
  }
  for (const [k, x] of Object.entries(v)) {
    if (k === "cond" || k === "set" || k === "variants") continue;
    register(x, abs, ex, SKIP_SEG.has(k) ? segs : [...segs, k], seen);
  }
}
{
  // index files (re-exports) last, so lines are tagged where they're written
  const order = [...MODS.keys()].sort((a, b) => Number(base(a) === "index.ts") - Number(base(b) === "index.ts"));
  for (const abs of order) for (const [ex, v] of Object.entries(MODS.get(abs)!)) register(v, abs, ex, [], new Set());
}

/** Content left out on purpose: TV shows, ambient barks, random NPC chatter, the canon quote registry. */
const EXCLUDED_FILES = [/content\/television\//, /dialogue\/ambient\.ts$/, /dialogue\/npc\.ts$/, /dialogue\/chatter\.ts$/, /archive\/canonQuotes\.ts$/, /archive\/grotesque/];
const EXCLUDED_EXPORTS = new Set(["kreddle.ts::LOCAL_CHAT", "kreddle.ts::SHOVES"]);
const isExcluded = (key: string) => {
  const [abs, ex] = key.split("::");
  return EXCLUDED_FILES.some((r) => r.test(rel(abs))) || EXCLUDED_EXPORTS.has(`${base(abs)}::${ex}`);
};

// ------------------------------------------------------------------ text helpers

const who = (s: string) => (s === "YOU" ? "YOU (the player)" : ((CHARACTERS as any)[s]?.name ?? s));
function esc(t: string): string {
  return String(t)
    .replace(/\r?\n/g, " / ")
    .replace(/\\/g, "\\\\")
    .replace(/([*_`[\]<>|])/g, "\\$1")
    .replace(/^(#|\+|-|=|\d+\.)/, "\\$1");
}
const code = (t: string) => "`" + t.replace(/`/g, "'") + "`";
function condTxt(c: any): string {
  if (!c || typeof c !== "object") return "";
  const names = (p: any) => (Array.isArray(p) ? p : [p]).map((x: string) => who(x)).join(" / ");
  const out: string[] = [];
  if (c.player) out.push(`only if playing ${names(c.player)}`);
  if (c.notPlayer) out.push(`not if playing ${names(c.notPlayer)}`);
  if (c.flag) out.push(`if ${c.flag}`);
  if (c.flagEq) out.push(`if ${c.flagEq[0]} = ${c.flagEq[1]}`);
  if (c.notFlag) out.push(`unless ${c.notFlag}`);
  if (c.chapter) out.push(`chapter ${c.chapter} only`);
  if (c.chapterAtLeast) out.push(`chapter ${c.chapterAtLeast}+`);
  if (c.chapterAtMost) out.push(`up to chapter ${c.chapterAtMost}`);
  if (c.revision) out.push(`if Krazy Fact "${c.revision}" is in the record`);
  if (c.notRevision) out.push(`unless Krazy Fact "${c.notRevision}" is in the record`);
  if (c.intoxAtLeast) out.push(`drunk ${c.intoxAtLeast}+`);
  if (c.intoxBelow) out.push(`drunk under ${c.intoxBelow}`);
  if (c.resentmentAtLeast) out.push(`Drongus resentment ${c.resentmentAtLeast}+`);
  if (c.ngPlus !== undefined) out.push(c.ngPlus ? "New Game+ only" : "not New Game+");
  if (c.any) out.push(`any of: ${c.any.map(condTxt).join(" OR ")}`);
  if (c.not) out.push(`NOT (${condTxt(c.not)})`);
  return out.join("; ");
}

// ------------------------------------------------------------------ documents

/** Something that renders as a line: a content Line (runtime) or one read out of scene code. */
interface AnyLine {
  s: string;
  t: string;
  dir?: boolean;
  notify?: boolean;
  canon?: string;
  cond?: any;
  role?: boolean;
  proctus?: string;
  variants?: Record<string, string>;
  choice?: { label: string; cond?: any; lines?: AnyLine[] }[];
  react?: { message: string; from?: string; outcomes?: Record<string, AnyLine[]> };
  tv?: string;
}
const EMOJI: Record<string, string> = { LIKE: "👍", LOVE: "❤️", LAUGH: "😂", ANGRY: "😡", SEEN: "Seen" };

class Doc {
  out: string[] = [];
  words = 0;
  /** abs::export → [first, last] output index */
  pos = new Map<string, [number, number]>();
  emitted: Set<object>;
  constructor(public name: string, emitted: Set<object>) {
    this.emitted = emitted;
  }
  para(md: string) {
    this.out.push(md, "");
  }
  h(level: number, text: string) {
    this.para(`${"#".repeat(level)} ${text.replace(/\n/g, " ")}`);
  }
  when(text: string) {
    this.para(`**When:** ${esc(text)}`);
  }
  note(text: string) {
    this.para(`*(${esc(text)})*`);
  }
  raw(md: string) {
    this.para(md);
  }
  private mark(o: object) {
    this.emitted.add(o);
    const r = REG.get(o);
    if (!r) return;
    const p = this.pos.get(r.key);
    const i = this.out.length;
    this.pos.set(r.key, p ? [p[0], i] : [i, i]);
  }
  /** Render one line (and anything hanging off it). `q` = blockquote depth. */
  line(l: AnyLine, tag: string, q = 0) {
    if (REG.has(l as object)) this.mark(l as object);
    const pre = "> ".repeat(q);
    let s = l.s;
    let t = l.t ?? "";
    if (l.canon && CANON[l.canon]) {
      s = s || CANON[l.canon].speaker;
      if (!t) t = CANON[l.canon].text;
    }
    const cond = condTxt(l.cond);
    const cpre = cond ? `*(${esc(cond)})* ` : "";
    const tg = tag ? " " + code(tag) : "";
    if (l.tv) {
      this.tv(l.tv, q, cpre);
    }
    if (t) {
      let body: string;
      if (l.dir) body = `*${esc(t)}*`;
      else if (l.notify) body = `[group chat] **${esc(who(s))}:** ${esc(t)}`;
      else body = `**${esc(who(s))}:** ${esc(t)}`;
      this.para(pre + cpre + body + tg);
    } else if (!l.tv && !l.react && !l.choice) return;
    if (l.role && PLAYABLE.includes(s)) {
      const alt = l.proctus ?? `(reading the wrong cue card) "${t}"... is that right? It says ${who(s)} on the back.`;
      this.para(`${"> ".repeat(q + 1)}*If you are playing ${esc(who(s))}, PROCTUS KRELMOR says it instead:* ${esc(alt)}`);
    }
    if (l.variants) for (const [p, v] of Object.entries(l.variants)) this.para(`${"> ".repeat(q + 1)}*As ${esc(who(p))}:* ${esc(v)}`);
    if (l.react) {
      const r = l.react;
      this.para(`${pre}${t ? "" : cpre}**REACTION PROMPT** (message from ${esc(who(r.from ?? "DRONGUS"))}): ${esc(r.message)}${t ? "" : tg}`);
      for (const [k, ls] of Object.entries(r.outcomes ?? {})) {
        this.para(`${"> ".repeat(q + 1)}*If you react ${EMOJI[k] ?? ""} ${k}:*`);
        for (const [i, x] of (ls ?? []).entries()) this.line(x, this.tagOf(x, `${tag}/${k}#${i}`), q + 1);
      }
    }
    if (l.choice) {
      this.para(`${pre}${t ? "" : cpre}**CHOICE:** ${l.choice.map((c) => `[${esc(c.label)}]`).join(" · ")}${t ? "" : tg}`);
      for (const c of l.choice) {
        if (!c.lines?.length && !c.cond) continue;
        this.para(`${"> ".repeat(q + 1)}*If you pick [${esc(c.label)}]${c.cond ? ` (${esc(condTxt(c.cond))})` : ""}:*`);
        for (const [i, x] of (c.lines ?? []).entries()) this.line(x, this.tagOf(x, `${tag}/choice#${i}`), q + 1);
      }
    }
  }
  tagOf(o: any, fallback: string) {
    return REG.get(o)?.tag ?? fallback;
  }
  /** Content lines (runtime objects): tags from the registry. */
  lines(ls: any[] | undefined, fallbackTag = "", q = 0) {
    for (const [i, l] of (ls ?? []).entries()) {
      if (Array.isArray(l)) this.lines(l, `${fallbackTag}[${i}]`, q);
      else if (isLine(l)) this.line(l, this.tagOf(l, `${fallbackTag}#${i}`), q);
    }
  }
  /** A content export by name (Line, Line[], Line[][], string[], Record of those). */
  exp(file: string, name: string, label?: string) {
    const [abs, m] = modByName(file);
    const v = m[name];
    const key = `${abs}::${name}`;
    if (v === undefined) return this.note(`missing export ${base(abs)} ${name} (renamed?)`);
    EMITTED_EXPORTS.add(key);
    this.value(v, `${base(abs)} ${name}`, key, label);
  }
  value(v: any, tag: string, key: string, label?: string) {
    const touch = () => {
      const p = this.pos.get(key);
      const i = this.out.length;
      this.pos.set(key, p ? [p[0], i] : [i, i]);
    };
    if (typeof v === "string") {
      this.para(`${label ? `*${esc(label)}:* ` : "*On screen:* "}${esc(v)} ${code(tag)}`);
      touch();
    } else if (isLine(v)) this.line(v, this.tagOf(v, tag));
    else if (Array.isArray(v)) {
      if (v.every((x) => typeof x === "string")) {
        this.para(`*${esc(label ?? "Shouts / on-screen text (one at a time, at random or in turn)")}:* ${v.map((x) => `“${esc(x)}”`).join(" · ")} ${code(tag)}`);
        touch();
      } else if (v.every((x) => Array.isArray(x))) {
        v.forEach((x, i) => {
          this.para(`*${esc(label ?? "Alternative")} ${i + 1} of ${v.length}:*`);
          this.lines(x, `${tag}[${i}]`);
        });
      } else this.lines(v, tag);
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (typeof x === "string") {
          this.para(`*${esc(label ?? "")}${label ? " · " : ""}${esc(who(k))}:* ${esc(x)} ${code(`${tag}.${k}`)}`);
          touch();
        } else {
          this.para(`*${esc(label ?? "")}${label ? " · " : ""}${esc(who(k))}:*`);
          this.value(x, `${tag}.${k}`, key);
        }
      }
    }
  }
  /** A KrelTV episode played as a story beat. */
  tv(id: string, q = 0, cpre = "") {
    const e = EPISODES.get(id);
    const pre = "> ".repeat(q);
    if (!e) return this.para(`${pre}${cpre}*📺 KrelTV broadcast "${esc(id)}" (episode not found)*`);
    this.para(`${pre}${cpre}**📺 KrelTV broadcast — ${esc(e.channel)} · ${esc(e.show)}: “${esc(e.title)}”**`);
    (e.beats as any[]).forEach((b, i) => {
      const tg = " " + code(`channels.ts ${id}#${i}`);
      if (b.type === "speaker") this.para(`${pre}**${esc(who(b.character))}:**${b.emotion ? ` *(${esc(b.emotion)})*` : ""} ${esc(b.text)}${tg}`);
      else if (b.type === "direction") this.para(`${pre}*${esc(b.action)}*${tg}`);
      else if (b.type === "titleCard") this.para(`${pre}*[on screen: ${esc(b.text)}]*${tg}`);
      else if (b.type === "shot") this.para(`${pre}*${esc(b.set)}*${tg}`);
      else if (b.type === "audience") this.para(`${pre}*[audience: ${b.cue}]*${tg}`);
    });
    this.para(`${pre}*(end of broadcast)*`);
  }
  /** Lines read out of scene code. */
  items(items: Item[], q = 0) {
    let ctx = "";
    for (const it of items) {
      if (it.ctx !== ctx) {
        if (it.ctx) this.para(`${"> ".repeat(q)}**[code branch: ${esc(it.ctx)}]**`);
        else if (ctx) this.para(`${"> ".repeat(q)}**[all branches]**`);
        ctx = it.ctx;
      }
      if (it.kind === "line") this.line(it.line, it.tag, q);
      else if (it.kind === "screen") this.para(`${"> ".repeat(q)}*[on screen: ${esc(it.text)}]* ${code(it.tag)}`);
      else if (it.kind === "ref") {
        EMITTED_EXPORTS.add(it.key);
        const [abs, ex] = it.key.split("::");
        this.value(it.value, `${base(abs)} ${ex}`, it.key);
      } else if (it.kind === "note") this.note(it.text);
    }
  }
  md() {
    return this.out.join("\n").replace(/\n{3,}/g, "\n\n");
  }
}
const EMITTED = new Set<object>();
const EMITTED_EXPORTS = new Set<string>();

// ------------------------------------------------------------------ reading scene code

type Item =
  | { kind: "line"; line: AnyLine; tag: string; ctx: string }
  | { kind: "screen"; text: string; tag: string; ctx: string }
  | { kind: "ref"; key: string; value: unknown; ctx: string }
  | { kind: "note"; text: string; ctx: string };

interface SceneFile {
  abs: string;
  sf: ts.SourceFile;
  imports: Map<string, { mod: string; name?: string }>;
  methods: Map<string, ts.Node>;
  consts: Map<string, ts.Expression>;
}
const SCENES = new Map<string, SceneFile>();
function walkFiles(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkFiles(path.join(d, e.name)) : e.name.endsWith(".ts") ? [path.join(d, e.name)] : []));
}
const GAME_FILES = walkFiles(path.join(ROOT, "src/game"));
function scene(name: string): SceneFile {
  const abs = GAME_FILES.find((f) => f.endsWith("/" + name) || rel(f) === name || rel(f) === `game/${name}`);
  if (!abs) throw new Error(`no scene file ${name}`);
  if (SCENES.has(abs)) return SCENES.get(abs)!;
  const sf = ts.createSourceFile(abs, readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true);
  const imports = new Map<string, { mod: string; name?: string }>();
  const methods = new Map<string, ts.Node>();
  const consts = new Map<string, ts.Expression>();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.importClause) {
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith(".")) continue;
      let mod = path.resolve(path.dirname(abs), spec);
      mod = existsSync(mod + ".ts") ? mod + ".ts" : path.join(mod, "index.ts");
      const nb = st.importClause.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) imports.set(nb.name.text, { mod });
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) imports.set(e.name.text, { mod, name: (e.propertyName ?? e.name).text });
    }
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) {
      if (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) methods.set(d.name.text, d.initializer);
      else consts.set(d.name.text, d.initializer);
    }
    if (ts.isFunctionDeclaration(st) && st.name) methods.set(st.name.text, st);
  }
  const visit = (n: ts.Node) => {
    if ((ts.isMethodDeclaration(n) || ts.isGetAccessor(n)) && n.name && ts.isIdentifier(n.name) && !methods.has(n.name.text)) methods.set(n.name.text, n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const f = { abs, sf, imports, methods, consts };
  SCENES.set(abs, f);
  return f;
}

const DSL = new Set(["say", "dir", "ping", "canon", "adapt", "gabor"]);
const SCREEN = new Set(["caption", "bigText", "shout", "bubble", "people", "floatShout", "kidBubble", "tweet", "subtitle", "screenSay", "bigTitle", "hit", "cue2", "say2", "floatText"]);
const NOEXPAND = new Set(["talk", "play", "wait", "tween", "caption", "bigText", "shout", "bubble", "people", "floatShout", "kidBubble", "tweet", "subtitle", "screenSay", "bigTitle", "toast", "floatText"]);
/** Big registries that are rendered structurally, never as an inline reference. */
const NOREF = new Set(["BOSS_TEXT", "MEETINGS", "ARCS", "CHAPTERS", "DUNGEONS", "CANON", "ALL_EPISODES", "PUB_CONVERSATIONS", "PUB_SNIPPETS", "NPC_TALK", "BARKS", "CHATTER", "PLAYER_BARKS", "DRONGUS_STATUSES", "DRONGUS_SEQUENCES", "PRIZES", "PRIZE", "DECOR", "DECOR_BY_ID", "KRUNCHERS", "CONSOLE_GAMES", "PERSONAL_QUESTS", "MINISTRY_QUESTS", "ARCHIVE", "ARCHIVE_BY_ID", "CHEESE_WITNESSES", "CHEESE_ACCUSATIONS", "DOMESTICS", "MORK_ROUNDS", "SONG_REPLIES", "CHAT_AFTER", "DREAMS", "KREL_TROPHIES", "GOLD_TOILET", "CHANNELS", "VIRAL_CHART", "BAN_RULES", "LOCAL_CHAT", "SHOVES", "INSULT", "CREDITS", "EPILOGUES", "ENDINGS", "RAID_ART"]);

function lit(n: ts.Node | undefined): any {
  if (!n) return undefined;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken) return -lit(n.operand);
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(lit);
  if (ts.isObjectLiteralExpression(n)) {
    const o: any = {};
    for (const p of n.properties) if (ts.isPropertyAssignment(p)) o[p.name.getText().replace(/^["']|["']$/g, "")] = lit(p.initializer);
    return o;
  }
  if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return lit(n.expression);
  return undefined;
}
const clean = (t: string, max = 90) => {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

function extract(sfName: string, what: { method?: string; constName?: string; match?: string; quiet?: boolean }, seenMethods = new Set<string>()): Item[] {
  const f = scene(sfName);
  const items: Item[] = [];
  const refs = new Set<string>();
  const lineNo = (n: ts.Node) => f.sf.getLineAndCharacterOfPosition(n.getStart(f.sf)).line + 1;
  const tag = (n: ts.Node) => `${base(f.abs)}:${lineNo(n)}`;
  let root: ts.Node | undefined;
  if (what.method) {
    root = f.methods.get(what.method);
    if (!root) {
      WARN.push(`scene method not found: ${sfName} ${what.method}`);
      return [];
    }
    seenMethods.add(`${f.abs}#${what.method}`);
  } else if (what.constName) root = f.consts.get(what.constName);
  if (!root) {
    WARN.push(`scene const not found: ${sfName} ${what.constName}`);
    return [];
  }
  if (what.match) {
    let best: ts.Node | undefined;
    const find = (n: ts.Node) => {
      if (ts.isCallExpression(n) && /talk|play/.test(n.expression.getText()) && n.getText().includes(what.match!)) if (!best || n.getWidth() < best.getWidth()) best = n;
      ts.forEachChild(n, find);
    };
    find(root);
    if (!best) {
      WARN.push(`scene match not found: ${sfName} ${what.method} "${what.match}"`);
      return [];
    }
    root = best;
  }
  const top = root;
  const ctxOf = (n: ts.Node): string => {
    let c: ts.Node = n;
    while (c.parent && c !== top) {
      const p: ts.Node = c.parent;
      if (ts.isIfStatement(p) && c !== p.expression) return `${c === p.thenStatement ? "if" : "else, i.e. not"} (${clean(p.expression.getText(), 70)})`;
      if (ts.isConditionalExpression(p) && c !== p.condition) return `${c === p.whenTrue ? "if" : "else, i.e. not"} (${clean(p.condition.getText(), 70)})`;
      if (ts.isCaseClause(p)) return `case ${clean(p.expression.getText(), 50)}`;
      c = p;
    }
    return "";
  };
  const resolveRef = (n: ts.Node): { key: string; value: unknown; name: string } | null => {
    let mod: string | undefined, name: string | undefined;
    if (ts.isIdentifier(n)) {
      const im = f.imports.get(n.text);
      if (im?.name) [mod, name] = [im.mod, im.name];
    } else if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
      const im = f.imports.get(n.expression.text);
      if (im && !im.name) [mod, name] = [im.mod, n.name.text];
    }
    if (!mod || !name || !MODS.has(mod)) return null;
    const value = MODS.get(mod)![name];
    if (value === undefined) return null;
    return { key: `${mod}::${name}`, value, name };
  };
  const strOf = (n: ts.Node): string | undefined => {
    const r = resolveRef(n);
    if (r && typeof r.value === "string") return r.value;
    if (ts.isIdentifier(n) && f.consts.has(n.text)) {
      const v = lit(f.consts.get(n.text));
      if (typeof v === "string") return v;
    }
    return undefined;
  };
  const txt = (n: ts.Node | undefined): string => {
    if (!n) return "";
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isTemplateExpression(n)) return n.head.text + n.templateSpans.map((s) => txt(s.expression) + s.literal.text).join("");
    if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n)) return txt(n.expression);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) return txt(n.left) + txt(n.right);
    if (ts.isConditionalExpression(n)) return `[if ${clean(n.condition.getText(), 50)}: ${txt(n.whenTrue)} | otherwise: ${txt(n.whenFalse)}]`;
    if (ts.isElementAccessExpression(n) && ts.isArrayLiteralExpression(n.expression)) return `[one of: ${n.expression.elements.map((e) => txt(e)).join(" / ")}]`;
    const s = strOf(n);
    if (s !== undefined) return s;
    return `{${clean(n.getText(), 40)}}`;
  };
  const spk = (n: ts.Node | undefined): string => {
    if (!n) return "";
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    const t = n.getText();
    if (/(^|\.)player$|^me$|^this\.me$|^p$|^you$/.test(t)) return "YOU";
    const s = strOf(n);
    if (s !== undefined) return s;
    return `{${clean(t, 30)}}`;
  };
  const objLine = (o: ts.ObjectLiteralExpression): AnyLine | null => {
    const props = new Map<string, ts.Expression>();
    for (const p of o.properties) if (ts.isPropertyAssignment(p)) props.set(p.name.getText().replace(/^["']|["']$/g, ""), p.initializer);
    if (!props.has("s") || !(props.has("t") || props.has("choice") || props.has("react") || props.has("tv"))) return null;
    const l: AnyLine = { s: spk(props.get("s")), t: props.has("t") ? txt(props.get("t")) : "" };
    for (const k of ["dir", "notify", "cond", "role", "proctus", "variants", "tv", "canon"] as const) if (props.has(k)) (l as any)[k] = lit(props.get(k));
    const ch = props.get("choice");
    if (ch && ts.isArrayLiteralExpression(ch)) {
      l.choice = ch.elements.map((e) => {
        if (!ts.isObjectLiteralExpression(e)) return { label: `{${clean(e.getText(), 40)}}` };
        const lp = e.properties.find((p) => p.name?.getText() === "label") as ts.PropertyAssignment | undefined;
        const ln = e.properties.find((p) => p.name?.getText() === "lines") as ts.PropertyAssignment | undefined;
        const cd = e.properties.find((p) => p.name?.getText() === "cond") as ts.PropertyAssignment | undefined;
        return { label: lp ? txt(lp.initializer) : "?", cond: cd ? lit(cd.initializer) : undefined, lines: ln ? sub(ln.initializer) : undefined };
      });
    } else if (ch) l.choice = [{ label: `{${clean(ch.getText(), 60)}}` }];
    const re = props.get("react");
    if (re && ts.isObjectLiteralExpression(re)) {
      const rp = new Map<string, ts.Expression>();
      for (const p of re.properties) if (ts.isPropertyAssignment(p)) rp.set(p.name.getText(), p.initializer);
      const outcomes: Record<string, AnyLine[]> = {};
      const oc = rp.get("outcomes");
      if (oc && ts.isObjectLiteralExpression(oc)) for (const p of oc.properties) if (ts.isPropertyAssignment(p)) outcomes[p.name.getText()] = sub(p.initializer);
      l.react = { message: txt(rp.get("message")), from: rp.has("from") ? spk(rp.get("from")) : undefined, outcomes };
    }
    return l;
  };
  /** Lines inside a nested expression (choice/react outcomes): flat, no refs. */
  const sub = (n: ts.Node): AnyLine[] => {
    const out: AnyLine[] = [];
    const v = (x: ts.Node) => {
      const l = ts.isCallExpression(x) ? dslLine(x) : ts.isObjectLiteralExpression(x) ? objLine(x) : null;
      if (l) return void out.push(l);
      ts.forEachChild(x, v);
    };
    v(n);
    return out;
  };
  const dslLine = (c: ts.CallExpression): AnyLine | null => {
    const callee = c.expression;
    const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
    const thisCall = ts.isPropertyAccessExpression(callee) && callee.expression.kind === ts.SyntaxKind.ThisKeyword;
    if (thisCall && name === "cue") return { s: "NARRATOR", t: txt(c.arguments[0]), dir: c.arguments[1] ? lit(c.arguments[1]) !== false : true };
    if (!DSL.has(name) || thisCall) return null;
    const a = c.arguments;
    let l: AnyLine;
    if (name === "dir") l = { s: "NARRATOR", t: txt(a[0]), dir: true, ...(lit(a[1]) ?? {}) };
    else if (name === "canon") {
      const id = lit(a[0]);
      l = { s: CANON[id]?.speaker ?? "?", t: CANON[id]?.text ?? `{canon ${id}}`, ...(lit(a[1]) ?? {}) };
    } else {
      const t = txt(a[1]);
      l = { s: spk(a[0]), t: name === "gabor" ? goat(t) : t, ...(lit(a[2]) ?? {}) };
      if (name === "gabor") l.s = "GABOR THE GOAT";
      if (name === "ping") l.notify = true;
    }
    return l;
  };
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const l = dslLine(n);
      if (l) {
        items.push({ kind: "line", line: l, tag: tag(n), ctx: ctxOf(n) });
        return;
      }
      const callee = n.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
      if (SCREEN.has(name)) {
        for (const a of n.arguments) {
          if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) continue;
          const s = ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a) || ts.isTemplateExpression(a) || ts.isBinaryExpression(a) || ts.isConditionalExpression(a) || (ts.isElementAccessExpression(a) && ts.isArrayLiteralExpression(a.expression)) ? txt(a) : strOf(a);
          if (s && /[A-Za-z]{2}/.test(s) && !/^#[0-9a-f]{3,8}$/i.test(s) && !/^[a-z0-9_]+$/.test(s)) {
            items.push({ kind: "screen", text: s, tag: tag(n), ctx: ctxOf(n) });
            break;
          }
        }
        // a screen-text helper may still be handed a callback with lines in it
        for (const a of n.arguments) if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) visit(a);
        return;
      }
      ts.forEachChild(n, visit);
      // this.someMethod(): the scene runs it right here
      const local = (ts.isPropertyAccessExpression(callee) && callee.expression.kind === ts.SyntaxKind.ThisKeyword) || ts.isIdentifier(callee);
      if (!what.quiet && local && f.methods.has(name) && !NOEXPAND.has(name) && !seenMethods.has(`${f.abs}#${name}`)) {
        const sub2 = extract(sfName, { method: name }, seenMethods);
        const ctx = ctxOf(n);
        for (const it of sub2) items.push({ ...it, ctx: it.ctx || ctx });
      }
      return;
    }
    if (ts.isObjectLiteralExpression(n)) {
      const l = objLine(n);
      if (l) {
        items.push({ kind: "line", line: l, tag: tag(n), ctx: ctxOf(n) });
        return;
      }
    }
    if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) {
      const r = resolveRef(n);
      if (r) {
        if (!NOREF.has(r.name) && !refs.has(r.key) && typeof r.value !== "string" && lineish(r.value)) {
          refs.add(r.key);
          items.push({ kind: "ref", key: r.key, value: r.value, ctx: ctxOf(n) });
        }
        return;
      }
      if (!what.quiet && ts.isIdentifier(n) && f.consts.has(n.text) && !refs.has(`${f.abs}::${n.text}`) && n.parent && !ts.isVariableDeclaration(n.parent)) {
        refs.add(`${f.abs}::${n.text}`);
        const sub2 = extract(sfName, { constName: n.text }, seenMethods);
        const ctx = ctxOf(n);
        for (const it of sub2) items.push({ ...it, ctx: it.ctx || ctx });
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(root);
  if (!what.quiet) for (const it of items) if (it.kind === "line" || it.kind === "screen") SCENE_PLACED.add(it.tag);
  return items;
}
const SCENE_PLACED = new Set<string>();
const WARN: string[] = [];
function lineish(v: any): boolean {
  if (isLine(v)) return true;
  if (Array.isArray(v)) return v.length > 0 && v.every((x) => isLine(x) || typeof x === "string" || (Array.isArray(x) && x.every(isLine)));
  if (v && typeof v === "object") return Object.values(v).length > 0 && Object.values(v).every((x) => typeof x === "string" || (Array.isArray(x) && x.every(isLine)));
  return false;
}

// ------------------------------------------------------------------ structural renderers

/** Vignette id → VignetteScene method, read from its `run` table. */
const VIG = (() => {
  const f = scene("VignetteScene.ts");
  const m = new Map<string, string>();
  const visit = (n: ts.Node) => {
    if (ts.isPropertyAssignment(n) && ts.isArrowFunction(n.initializer)) {
      const b = n.initializer.body;
      const call = ts.isCallExpression(b) ? b : undefined;
      if (call && ts.isPropertyAccessExpression(call.expression) && call.expression.expression.kind === ts.SyntaxKind.ThisKeyword) m.set(n.name.getText().replace(/"/g, ""), call.expression.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(f.methods.get("create")!);
  return m;
})();
const MINIGAME: Record<string, string[]> = {
  facebook: ["fbTroll"],
  modulator: ["fbTroll"],
  gig: ["gig", "gigWatch"],
  crocodile: ["crocodile", "crocRelease"],
};
/** Bosses whose win leads straight into a vignette (DungeonScene.onBossDefeated). */
const AFTER_BOSS_VIG: Record<string, string> = { flatmate: "flatmate", rival: "rival", rik: "sanmik_finale", reinhardt: "crobley_boom" };

function vignette(d: Doc, id: string, heading?: { level: number; text: string }) {
  const m = VIG.get(id);
  if (heading) d.h(heading.level, heading.text);
  if (!m) return d.note(`vignette "${id}" has no scene method`);
  VIG_PLACED.add(id);
  d.items(extract("VignetteScene.ts", { method: m }));
}
const VIG_PLACED = new Set<string>();

function minigame(d: Doc, mode: string) {
  for (const m of MINIGAME[mode] ?? [mode]) {
    if (mode === "drive") d.items(extract("DriveScene.ts", { method: "create" }), 0), d.items(extract("DriveScene.ts", { method: "crash" })), d.items(extract("DriveScene.ts", { method: "drawbridge" }));
    else if (mode === "beepbeep") d.items(extract("BeepBeepScene.ts", { method: "create" })), d.items(extract("BeepBeepScene.ts", { method: "finish" }));
    else if (scene("MinigameScene.ts").methods.has(m)) d.items(extract("MinigameScene.ts", { method: m }));
  }
}

function boss(d: Doc, id: string, level: number) {
  const b = BOSS_TEXT[id];
  if (!b) return d.note(`boss ${id}: no BOSS_TEXT`);
  BOSS_PLACED.add(id);
  d.h(level, `Boss: ${b.name} — ${b.title}`);
  EMITTED_EXPORTS.add(`${modByName("bosses.ts")[0]}::BOSS_TEXT`);
  d.lines(b.intro, `bosses.ts BOSS_TEXT/${id}/intro`);
  if (b.taunts?.length) d.para(`*In-fight taunts (shown as the boss changes phase):* ${b.taunts.map((x: string) => `“${esc(x)}”`).join(" · ")} ${code(`bosses.ts BOSS_TEXT/${id}/taunts`)}`);
  if (b.outro?.length) {
    d.para("*After the fight:*");
    d.lines(b.outro, `bosses.ts BOSS_TEXT/${id}/outro`);
  }
}
const BOSS_PLACED = new Set<string>();

/** Room events that hand over to scene code. */
const ROOM_EVENT: Record<string, [string, string][]> = {
  anthem: [["Citadel.ts", "anthem"]],
  drongus1: [["Citadel.ts", "drongusMeet"]],
  stairs: [["Citadel.ts", "stairs"]],
  drongus2: [["Citadel.ts", "office"]],
  colon: [["DungeonScene.ts", "colonFinale"]],
};
const PROP_SCENE: Record<string, [string, string][]> = {
  mollor: [["DungeonScene.ts", "rescueMollor"]],
  bertha: [["DungeonScene.ts", "inspectBertha"]],
  wonking_machine: [["DungeonScene.ts", "useWonkingMachine"]],
  crystal_wall: [["DungeonScene.ts", "takeRikCrystal"]],
};

function dungeon(d: Doc, id: string, level: number, opts: { title?: string } = {}) {
  const dg = (DUNGEONS as any)[id];
  if (!dg) return d.note(`dungeon ${id} not found`);
  DUNGEON_PLACED.add(id);
  EMITTED_EXPORTS.add(`${path.join(ROOT, "src/data/dungeons.ts")}::DUNGEONS`);
  if (opts.title !== "") d.h(level, opts.title ?? `${dg.name}`);
  (dg.rooms as any[]).forEach((r, ri) => {
    d.h(level + 1, `Room ${ri + 1}: ${r.name}`);
    const tg = `dungeons.ts ${id}/${ri}`;
    d.lines(r.enterLines, `${tg}/enterLines`);
    if (r.rule) {
      const rule = (BAN_RULES as any[]).find((b) => b.id === r.rule);
      d.para(`[group chat] **${esc(who("DRONGUS"))}:** ${esc(rule?.decree ?? "NEW RULE.")} ${code(`ban.ts BAN_RULES/${r.rule}`)}`);
    }
    if (r.pa?.length) {
      d.para("*Over the tannoy:*");
      d.lines(r.pa, `${tg}/pa`);
    }
    for (const [pi, p] of (r.props ?? []).entries()) {
      if (p.lines?.length) {
        d.para(`*Optional — press E on ${esc(p.label ?? p.speaker ?? p.kind)}${p.cond ? ` (${esc(condTxt(p.cond))})` : ""}:*`);
        d.lines(p.lines, `${tg}/props/${pi}`);
      }
      for (const [sf, m] of PROP_SCENE[p.kind] ?? []) {
        d.para(`*${esc(p.label ?? p.kind)}:*`);
        d.items(extract(sf, { method: m }));
      }
      if (p.action && !ACTION_DONE.has(p.action)) {
        ACTION_DONE.add(p.action);
        if (p.action === "donut") d.items(extract("DungeonScene.ts", { method: "donutScene" }));
      }
    }
    for (const [sf, m] of ROOM_EVENT[r.event] ?? []) d.items(extract(sf, { method: m }));
    if (r.miniBoss) {
      if (r.miniBoss.pa?.length) {
        d.para("*Part way through, over the tannoy:*");
        d.lines(r.miniBoss.pa, `${tg}/miniBoss/pa`);
      }
      boss(d, r.miniBoss.id, level + 2);
    }
    if (r.boss) boss(d, r.boss, level + 2);
    for (const br of r.bossRush ?? []) boss(d, br.boss, level + 2);
    if (r.event === "drongus2") d.items(extract("Citadel.ts", { method: "officeAfter" }));
    if (r.event === "roof") roof(d, level + 1);
    if (r.boss === "rik") d.items(extract("DungeonScene.ts", { method: "shrinkRay" }));
    if (r.boss === "reinhardt") d.items(extract("DungeonScene.ts", { method: "reinhardtDeath" })), d.items(extract("DungeonScene.ts", { method: "fuelTankFinale" }));
    for (const t of r.then ?? []) {
      d.h(level + 2, `Then: ${t === "drive" ? "the drive" : t === "beepbeep" ? "Beep Beep" : `minigame (${t})`}`);
      minigame(d, t);
      if (t === "norwich") d.items(extract("MinigameScene.ts", { constName: "NORWICH_AFTER" }));
    }
  });
}
const DUNGEON_PLACED = new Set<string>();
const ACTION_DONE = new Set<string>();

function roof(d: Doc, level: number) {
  d.h(level + 1, "The roof fight (RoofArena)");
  d.items(extract("RoofArena.ts", { method: "start" }));
  d.h(level + 1, "Cutscene: the transformation (RoofCutscene)");
  d.items(extract("RoofCutscene.ts", { method: "transform" }));
  d.h(level + 1, "Back on the roof: freeing the lads");
  d.items(extract("RoofArena.ts", { method: "free" }));
  d.items(extract("RoofArena.ts", { method: "allFree" }));
  d.items(extract("RoofArena.ts", { method: "update" }));
  d.h(level + 1, "Cutscene: the group krezz (RoofCutscene)");
  d.items(extract("RoofCutscene.ts", { method: "krezz" }));
}

function meeting(d: Doc, id: string, level: number, when?: string) {
  const m = MEETINGS[id];
  if (!m) return d.note(`meeting ${id} not found`);
  MEETING_PLACED.add(id);
  d.h(level, `Meeting: ${m.title}${m.subtitle ? ` — ${m.subtitle}` : ""}`);
  if (when) d.when(when);
  if (m.agenda?.length) d.para(`*Agenda:* ${m.agenda.map((a: string) => esc(a)).join(" · ")}`);
  d.lines(m.beats, `${id}`);
}
const MEETING_PLACED = new Set<string>();

const AT_NAME: Record<string, string> = {
  TOWN_HALL: "the Town Hall",
  ARCHIVE: "the Archive / FGM War Room",
  PUB: "the Krezz Arms",
  HOME: "home",
  POLICE: "Krelford Constabulary",
  GYM: "Krunch Gym",
  UNIVERSITY: "Krelford University",
  BOOTH: "the Booth",
  OLD_FLAT: "the old flat",
  ABANDONED: "the abandoned building",
  FIXER_UPPER: "the fixer-upper",
  POLSON_ROAD: "Polson Towers (Polson Road)",
  AIRPORT: "Krelford International",
  PORTAL: "the portal at the west edge of town",
  BOGGOR_HOUSE: "Boggor's house",
  FIELD: "out in Krelford",
  BAN_TRIBUNAL: "the Ban Tribunal",
  BANK: "the bank",
};

function arc(d: Doc, id: string, level: number, opts: { skipSteps?: string[]; note?: string } = {}) {
  const a = ARCS.find((x) => x.id === id);
  if (!a) return d.note(`arc ${id} not found`);
  ARC_PLACED.add(id);
  d.h(level, `${a.player === "ALL" ? "Side quest" : `${who(a.player)}'s story`}: ${a.title}`);
  if (opts.note) d.when(opts.note);
  d.para(`*Quest log:* ${esc(a.blurb)}`);
  for (const st of a.steps) {
    if (opts.skipSteps?.includes(st.id)) continue;
    const k = st.step;
    d.h(level + 1, `${st.text}`);
    d.para(`**When:** ${esc(`at ${AT_NAME[st.at] ?? st.at}${st.auto ? " (plays straight on from the step before)" : ""}`)}`);
    const tg = `arcs.ts ARCS/${a.id}/${st.id}`;
    switch (k.kind) {
      case "dialogue":
        d.lines(k.lines, tg);
        if (k.pay) d.para(`*Toast: ${esc(k.pay.title)} — ${esc(k.pay.text)}*`);
        break;
      case "pay":
        d.lines(k.intro, tg);
        d.para(`*CHOICE: [Pay ${k.cost}] · [Not now]   (if you can't afford it: "You need ${k.cost} Krezzcoin. You have N. Go kill some smolts.")*`);
        d.lines(k.success, tg);
        break;
      case "quiz":
        d.lines(k.intro, tg);
        k.questions.forEach((q: any, i: number) => {
          d.para(`**QUIZ ${i + 1}:** ${esc(q.q)} ${code(`${tg}/questions#${i}`)}`);
          d.para(`> *Options:* ${q.options.map((o: string, j: number) => `[${esc(o)}]${j === q.correct ? " ✓" : ""}`).join(" · ")}`);
          d.para(`> *Wrong answer:* ${esc(q.wrong)}`);
        });
        d.para(`*Pass (${k.need}+ right):*`);
        d.lines(k.success, tg);
        d.para("*Fail:*");
        d.lines(k.fail, tg);
        break;
      case "arena":
        d.lines(k.intro, tg);
        if (k.drugs) d.para("*(Press D to take drugs: a trip into the arena.)*");
        dungeon(d, k.dungeon, level + 2);
        {
          const bossId = ((DUNGEONS as any)[k.dungeon]?.rooms ?? []).map((r: any) => r.boss).filter(Boolean).pop();
          if (bossId && AFTER_BOSS_VIG[bossId]) vignette(d, AFTER_BOSS_VIG[bossId], { level: level + 2, text: "Afterwards (cutscene)" });
        }
        break;
      case "minigame":
        d.lines(k.intro, tg);
        minigame(d, k.mode);
        if (k.success?.length) d.para("*Win:*"), d.lines(k.success, tg);
        if (k.fail?.length) d.para("*Lose:*"), d.lines(k.fail, tg);
        break;
      case "vignette":
        d.lines(k.intro, tg);
        vignette(d, k.id);
        break;
      case "collect":
        d.para(`*Collect: ${esc(k.label)} — ${k.spots.map((s: any) => esc(s.name)).join(" · ")}*`);
        d.para("*On each pickup:*");
        d.lines(k.pickup, tg);
        break;
      case "shove":
        d.lines(k.intro, tg);
        d.items(extract("HubScene.ts", { method: "runBrawl" }));
        d.para("*When they leave:*");
        d.lines(k.leave, tg);
        d.lines(k.after, tg);
        break;
      case "auto":
        if (k.id === "kruncher_invasion") {
          d.items(extract("HubScene.ts", { method: "krunchersInvade" }));
          vignette(d, "kruncher_mikey", { level: level + 2, text: "Cutscene: Mikey and the Krunchers" });
          d.h(level + 2, "Then, at home");
          d.exp("krunchers.ts", "KR_HOME");
        } else d.note(`auto scene ${k.id}`);
        break;
    }
  }
  d.para(`*Reward: +${a.reward.coins} Krezzcoin. ${esc(a.reward.desc)}*`);
}
const ARC_PLACED = new Set<string>();

// ------------------------------------------------------------------ DOCUMENT 1: the main story

function doc1(): Doc {
  const d = new Doc("1_main_story", EMITTED);
  d.h(1, "KRELWORLD — Main Story Script");
  d.para("*The critical path in play order: the new-game opening, Chapters 1 to 7, the finale and the endings. Includes the side quests and KrelTV broadcasts the game makes you do. Character stories and optional quests are in document 2; Drongus's statuses in document 3; the Krezz Arms in document 4.*");
  d.para("*How to read it: SPEAKER: line. Stage directions are in italics. [group chat] lines pop up as messages. YOU (the player) is whoever you picked; per-character versions are listed under a line. Lines marked (only if…/not if…) play for some characters only. [code branch: …] marks lines that only play on one path through a scene. The grey tag after each line says where it lives in the code.*");

  // ---------- the opening
  d.h(2, "Opening: A New Game");
  d.h(3, "Title screen");
  d.when("The very first screen, then the title menu and character select.");
  d.items(extract("EnterScene.ts", { method: "create" }));
  d.h(3, "Home: Welcome to Krelworld");
  d.when("New game. You start at home.");
  d.items(extract("HomeScene.ts", { method: "welcome" }));
  d.h(3, "KrelTV (compulsory): A Message From Our Neighbours");
  d.when("You have to watch the telly before you can leave the house.");
  d.items(extract("HomeScene.ts", { method: "leave", match: "watch some relaxing TV" }));
  d.tv("klerble_welcome");
  d.items(extract("HomeScene.ts", { method: "create", match: "That was relaxing" }));
  d.h(3, "Out of the door: Krelford from the air");
  d.when("First time out of the house: the camera tours the town.");
  d.items(extract("HubScene.ts", { method: "flyover" }));
  meeting(d, "lore_appreciation_inquiry", 3, "Town Hall, first visit.");

  // ---------- chapter 1
  const chHead = (n: number) => {
    const c = CHAPTERS[n - 1];
    d.h(2, `Chapter ${n}: ${c.title}`);
    d.para(`*${esc(c.subtitle)}*`);
    d.para(`*Objectives, in order:* ${c.steps.map((s: any) => esc(s.text)).join(" → ")}`);
  };
  const chIntro = (n: number, when: string) => {
    const c = CHAPTERS[n - 1];
    d.h(3, `Chapter ${n} intro`);
    d.when(when);
    d.lines(c.intro, `chapters.ts CHAPTERS/${n}/intro`);
    d.h(4, "Then, depending on who you're playing");
    for (const p of PLAYABLE) {
      d.para(`*Playing ${esc(who(p))}:*`);
      d.lines(c.playerScene[p], `chapters.ts CHAPTERS/${n}/playerScene/${p}`);
    }
  };
  const chOutro = (n: number) => {
    const c = CHAPTERS[n - 1];
    d.h(3, `Chapter ${n} outro: back at the Town Hall`);
    d.when("Walk into the Town Hall after the dungeon. Afterwards a Krazy Fact is entered into the record (a pop-up), and the next chapter starts.");
    d.lines(c.outro, `chapters.ts CHAPTERS/${n}/outro`);
  };
  const ownStory = () => d.para("*(Required before this dungeon: your own character's story — see document 2, \"Character stories\".)*");

  chHead(1);
  chIntro(1, "Straight after the Lore Appreciation Inquiry: the Great Silence, in the group chat.");
  meeting(d, "emergency_reaction_session", 3, "Straight on from the Great Silence.");
  d.h(3, "Da Drongus Dungeon rises");
  d.when("Back out in Krelford after the emergency session.");
  d.items(extract("HubScene.ts", { method: "riseTower" }));
  d.h(3, "The Historical Archive: The Founding");
  d.when("First visit to the Archive. You can watch the founding, or skip it.");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "Welcome to the Krelworld Historical Archive" }));
  meeting(d, "founding_cabinet", 4, "If you pick 'Yes. Play the founding.'");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "The founding has been filed" }));
  d.h(3, "Dungeon: Wildern Academy");
  d.when("The Wildern door, once the Archive's done.");
  dungeon(d, "wildern", 4, { title: "" });
  d.h(3, "The Tap flows again");
  d.when("Back in Krelford after Wildern.");
  d.items(extract("HubScene.ts", { method: "tapFlows" }));
  d.h(3, "Wildern has to go: the bombs");
  d.when("Plant the four bombs round Wildern.");
  d.items(extract("HubScene.ts", { method: "blowWildern" }));
  meeting(d, "krazy_fact_emergency", 3, "Report back to the Town Hall. Then Chapter 2 starts.");

  // ---------- chapter 2
  chHead(2);
  chIntro(2, "Back in Krelford as Chapter 2 begins.");
  meeting(d, "fragmar_briefing", 3, "The FGM War Room, under the Archive.");
  ownStory();
  d.h(3, "Dungeon: Polson Towers");
  d.when("Polson Road. The router is under the hoard.");
  dungeon(d, "polson_towers", 4, { title: "" });
  chOutro(2);

  // ---------- chapter 3
  chHead(3);
  chIntro(3, "Back in Krelford as Chapter 3 begins.");
  arc(d, "arc_krunchers", 3, { note: "Required. Starts by itself as you arrive in town in Chapter 3." });
  meeting(d, "cronster_briefing", 3, "KRELMERGENCY at the Town Hall.");
  arc(d, "arc_polson_fit", 3, { note: "Required before the Chapter 3 dungeon (opens once Polson Towers is cleared)." });
  arc(d, "arc_crocodile", 3, { note: "Required before the Chapter 3 dungeon (available from Chapter 2)." });
  ownStory();
  d.h(3, "Dungeon: The Ministry of Boner Control");
  dungeon(d, "ministry", 4, { title: "" });
  chOutro(3);

  // ---------- chapter 4
  chHead(4);
  chIntro(4, "Back in Krelford as Chapter 4 begins.");
  d.h(3, "KrelTV: the Crobley story");
  d.when("Go home: the telly's already on.");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "Every channel is showing the same thing" }));
  vignette(d, "crobley_news");
  meeting(d, "crobley_briefing", 3, "The FGM War Room, under the Archive.");
  d.h(3, "Sergeant Swig's press conference");
  d.when("Krelford Constabulary.");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "The Constabulary briefing room is packed" }));
  vignette(d, "crobley_presser");
  arc(d, "arc_pudding_spy", 3, { note: "Required before the Chapter 4 dungeon (available from Chapter 2; not for Lil' Crongus, who has his own version in document 2)." });
  arc(d, "arc_hotel_chaz", 3, { note: "Required before the Chapter 4 dungeon (available from Chapter 3)." });
  d.h(3, "Dungeon: The Crobley Factory");
  d.when("The gate on the east edge of town.");
  dungeon(d, "crobley_factory", 4, { title: "" });
  vignette(d, "crobley_boom", { level: 4, text: "Afterwards: the factory goes up" });
  chOutro(4);

  // ---------- chapter 5
  chHead(5);
  chIntro(5, "Back in Krelford as Chapter 5 begins.");
  meeting(d, "krebon_question", 3, "Town Hall.");
  arc(d, "arc_50p", 3, { note: "Opens in Chapter 5; required before the Chapter 6 dungeon." });
  d.h(3, "The magic lamp");
  d.when("The Krezz Arms back room, once the Krebon Question is done.");
  vignette(d, "sanmik_lampe");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "SanMik's magic lamp is on the bar" }));
  d.h(3, "Dungeon: The SanMikverse");
  dungeon(d, "arena_sanmik", 4, { title: "" });
  d.h(3, "Dungeon: Inside Uncle Rik");
  dungeon(d, "rik_colon", 4, { title: "" });
  vignette(d, "sanmik_finale", { level: 4, text: "Afterwards: back from Catford" });
  chOutro(5);

  // ---------- chapter 6
  chHead(6);
  d.h(3, "Last chance");
  d.when("Arriving in Krelford at the start of Chapter 6, then at the Town Hall: Chapter 6 only starts when you say so.");
  d.exp("ch6prompt.ts", "KR6_LAST_CHANCE");
  d.items(extract("HubScene.ts", { method: "chapter6TownHall", match: "Begin Chapter 6 now" }));
  chIntro(6, "After you choose 'Begin Chapter 6'.");
  arc(d, "arc_klerble", 3, { note: "The main Chapter 6 story (a required side quest): the War Room, then the airport." });
  d.h(3, "Dungeon: Flight KR-069");
  dungeon(d, "airport", 4, { title: "" });
  vignette(d, "plane_escape", { level: 4, text: "If you win: the plane escape (and the Kreddle Express)" });
  vignette(d, "kreltower_fall", { level: 4, text: "If the timer runs out: the Krel Tower falls" });
  d.h(3, "The Krel Tower plaque");
  d.when("Walking past the Krel Tower site afterwards.");
  d.items(extract("HubScene.ts", { method: "kreltowerPlaque" }));
  d.h(3, "The revenge meeting");
  d.when("KRELMERGENCY at the Town Hall: the Krel Tower is gone.");
  vignette(d, "revenge_meeting");
  d.items(extract("HubScene.ts", { method: "chapter6TownHall", match: "Kreddle's THAT way" }));
  d.h(3, "The raid on Kreddle");
  d.when("Over the Kreddle Bridge (far west). Lines are listed in the order they're written; the raid's shouts and signs pop up during the fighting.");
  d.items(extract("Raid.ts", { method: "intro" }));
  d.items(extract("Raid.ts", { method: "broadcast" }));
  d.items(extract("Raid.ts", { method: "standoff" }));
  d.items(extract("Raid.ts", { method: "krunchersDead" }));
  d.items(extract("Raid.ts", { method: "plantNuke" }));
  for (const n of EXPORT_ORDER.get(modByName("raid.ts")[0]) ?? []) if (!EMITTED_EXPORTS.has(`${modByName("raid.ts")[0]}::${n}`)) d.exp("raid.ts", n);
  d.h(3, "The Krunch Protocol");
  d.when("The nuke is armed: get back to the Town Hall.");
  vignette(d, "krunch_protocol");
  d.items(extract("HubScene.ts", { method: "krunchBombing" }));
  d.h(3, "The Town Hall party");
  d.when("Straight on: the party under the bombs. Then Chapter 7.");
  vignette(d, "townhall_party");

  // ---------- chapter 7
  chHead(7);
  d.h(3, "The Lair: at the top of Da Drongus Dungeon");
  d.when("Chapter 7 opens at the top of Da Drongus Dungeon, before you get there.");
  d.items(extract("LairScene.ts", { method: "run" }));
  d.h(3, "Aftermath: the morning after");
  d.when("Krelford wakes up in the rubble of the Town Hall.");
  d.items(extract("HubScene.ts", { method: "aftermath" }));
  d.h(3, "The lads go in");
  d.when("The Citadel door, with all six crystals.");
  d.items(extract("HubScene.ts", { method: "ladsGoIn" }));
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "DA DRONGUS DUNGEON. The door is a slab" }));
  d.h(3, "Dungeon: Da Drongus Dungeon");
  dungeon(d, "citadel", 4, { title: "" });

  d.h(2, "The Finale: Krelford");
  d.h(3, "Landing");
  d.when("Da Drongus Dungeon has come down. Back in Krelford.");
  d.items(extract("HubScene.ts", { method: "finaleKrelford" }));
  d.items(extract("HubScene.ts", { method: "finaleLanding" }));
  d.h(3, "The rumble");
  d.items(extract("HubScene.ts", { method: "finaleRumble" }));
  d.h(3, "The Concept emerges");
  d.items(extract("FinaleScene.ts", { method: "emerge" }));
  d.h(3, "The fight in what's left of Krelford");
  d.items(extract("KrelfordFinale.ts", { method: "start" }));
  d.items(extract("KrelfordFinale.ts", { method: "heal" }));
  d.items(extract("KrelfordFinale.ts", { method: "meetGoku" }));
  d.items(extract("KrelfordFinale.ts", { method: "inject" }));
  d.items(extract("KrelfordFinale.ts", { method: "transform" }));
  d.items(extract("FinaleScene.ts", { method: "transform" }));
  d.items(extract("KrelfordFinale.ts", { method: "phase2" }));
  d.items(extract("KrelfordFinale.ts", { method: "finalHeal" }));
  d.h(3, "The spirit bomb");
  d.items(extract("FinaleScene.ts", { method: "spirit" }));
  d.h(3, "Dawn");
  d.when("The morning after: the lads come round, Drongus comes round, and the race for the logs.");
  d.items(extract("HubScene.ts", { method: "finaleDawn" }));

  d.h(2, "The Ending");
  d.when("The last choice: how do you react?");
  d.exp("endings.ts", "FINAL_PROMPT");
  d.items(extract("EndingScene.ts", { method: "create" }));
  const ENDINGS = exp("endings.ts", "ENDINGS") as Record<string, any>;
  EMITTED_EXPORTS.add(`${modByName("endings.ts")[0]}::ENDINGS`);
  for (const [k, e] of Object.entries(ENDINGS)) {
    d.h(3, `Ending: ${e.title} (react ${EMOJI[k] ?? ""} ${k})`);
    d.lines(e.lines, `endings.ts ENDINGS/${k}`);
  }
  d.items(extract("EndingScene.ts", { method: "showEnding" }));
  d.items(extract("EndingScene.ts", { method: "deleteTheChat" }));
  d.h(3, "Epilogues (one per character)");
  d.exp("endings.ts", "EPILOGUES");
  d.h(3, "Credits");
  d.exp("endings.ts", "CREDITS", "Credits");
  d.exp("endings.ts", "SEQUEL_CARD", "Sequel card");

  return d;
}

/** Story files: anything not in the play-order map is slotted in after its neighbour in the file. */
const AUTOFILL = ["ch6.ts", "ch7.ts", "citadel.ts", "finaleRoof.ts", "finaleKrelford.ts", "ch7aftermath.ts", "ch6prompt.ts", "raid.ts", "krunchers.ts", "endings.ts", "chapters.ts"];

function autofill(d: Doc) {
  const inserts = new Map<number, string[]>();
  const tail: string[] = [];
  for (const f of AUTOFILL) {
    const [abs, m] = modByName(f);
    const names = EXPORT_ORDER.get(abs) ?? [];
    for (const [i, n] of names.entries()) {
      const key = `${abs}::${n}`;
      const v = m[n];
      if (!lineish(v) && !(typeof v === "string")) continue;
      const missing = unplacedLines(v).length > 0 || (!EMITTED_EXPORTS.has(key) && !containsLines(v));
      if (!missing) continue;
      // after the nearest earlier export that made it into the document
      let at = -1;
      for (let j = i - 1; j >= 0 && at < 0; j--) at = d.pos.get(`${abs}::${names[j]}`)?.[1] ?? -1;
      if (at < 0) for (let j = i + 1; j < names.length && at < 0; j++) at = (d.pos.get(`${abs}::${names[j]}`)?.[0] ?? 0) - 1;
      const t = new Doc(d.name, EMITTED);
      t.para(`*(Not yet in the exporter's play-order map: placed by its position in ${base(abs)}, after the export before it.)*`);
      t.exp(f, n);
      AUTOFILLED.push(`${base(abs)} ${n}`);
      if (at < 0) tail.push(...t.out);
      else inserts.set(at, [...(inserts.get(at) ?? []), ...t.out]);
    }
  }
  if (!inserts.size && !tail.length) return;
  const out: string[] = [];
  d.out.forEach((l, i) => {
    out.push(l);
    if (inserts.has(i)) out.push("", ...inserts.get(i)!);
  });
  if (tail.length) out.push("", "## Unplaced story lines", "", ...tail);
  d.out = out;
}
const AUTOFILLED: string[] = [];
function allLines(v: any, acc: object[] = [], seen = new Set<object>()): object[] {
  if (!v || typeof v !== "object" || seen.has(v)) return acc;
  seen.add(v);
  if (isLine(v)) acc.push(v);
  for (const x of Array.isArray(v) ? v : Object.values(v)) allLines(x, acc, seen);
  return acc;
}
const containsLines = (v: any) => allLines(v).length > 0;
const unplacedLines = (v: any) => allLines(v).filter((l) => !EMITTED.has(l));

// ------------------------------------------------------------------ DOCUMENT 2: side quests

function doc2(): Doc {
  const d = new Doc("2_side_quests", EMITTED);
  d.h(1, "KRELWORLD — Side Quests Script");
  d.para("*Optional side quests and the character stories (each playable character has their own, which they must finish before their Chapter 2 dungeon). Grouped by quest. Shared required quests are in document 1, in the chapter they're due.*");

  d.h(2, "Character stories");
  for (const p of PLAYABLE) {
    const own = ARCS.filter((a) => a.player === p);
    if (!own.length) continue;
    d.h(2, `${who(p)}`);
    for (const a of own) arc(d, a.id, 3, { note: a.id === "arc_krebon" ? "Optional. Ends with Krebon going home to Wahooga: you carry on as someone else." : `Only when playing ${who(p)}${a.minChapter ? `, from Chapter ${a.minChapter}` : ""}. Required before the Chapter ${a.id === "arc_kreblis_news" || a.id === "arc_flenky_sigma" ? 4 : 2} dungeon.` });
    if (p === "CRONGUS") d.para("*(Lulon's version of the pudding scene and the pudding raid are the same cutscenes as \"Some Sick Shit\" in document 1, Chapter 4 — VignetteScene pudding / puddingRaid. The lines that change for Lulon are marked with code branches there.)*");
    const pq = (exp("quests.ts", "PERSONAL_QUESTS") as any[]).filter((q) => q.player === p);
    for (const q of pq) {
      d.h(3, `Personal quest: ${q.title}`);
      d.para(`*Quest log:* ${esc(q.blurb)}`);
      d.para(`*Pickups:* ${q.pickups.map((s: any) => esc(s.label)).join(" · ")}`);
      d.when(`Hand in at ${AT_NAME[q.turnIn.at] ?? q.turnIn.at} (${q.turnIn.text}).`);
      d.lines(q.turnIn.lines, `quests.ts PERSONAL_QUESTS/${q.id}/turnIn`);
      d.para(`*Reward: +${q.reward.coins} Krezzcoin. ${esc(q.reward.desc)}*`);
    }
  }
  EMITTED_EXPORTS.add(`${modByName("quests.ts")[0]}::PERSONAL_QUESTS`);

  d.h(2, "Optional shared side quests");
  for (const a of ARCS) if (!ARC_PLACED.has(a.id) && a.player === "ALL") arc(d, a.id, 3, { note: a.id === "arc_boggor" ? "Optional." : `Shared side quest${a.minChapter ? ` from Chapter ${a.minChapter}` : ""}.` });

  d.h(2, "Ministerial side quests (quest log only)");
  d.when("Unlocked by the Founding; given by each minister (or by Proctus when you hold the ministry).");
  for (const q of exp("quests.ts", "MINISTRY_QUESTS") as any[]) d.para(`**${esc(who(q.ministry))} — ${esc(q.title)}:** ${esc(q.desc)} *(reward ${q.reward})* ${code(`quests.ts MINISTRY_QUESTS/${q.id}`)}`);
  EMITTED_EXPORTS.add(`${modByName("quests.ts")[0]}::MINISTRY_QUESTS`);

  d.h(2, "Around the house");
  d.when("Things you can look at and do at home.");
  d.h(3, "Dreams (sleeping in your bed)");
  d.items(extract("HomeScene.ts", { method: "dream" }));
  d.exp("home.ts", "DREAMS", "Dream");
  d.h(3, "The group chat on your laptop (what everyone's saying after each chapter)");
  for (const [k, v] of Object.entries(exp("home.ts", "CHAT_AFTER") as Record<string, any[]>)) {
    d.para(`*After Chapter ${k}${k === "0" ? " (i.e. before Chapter 1 is done)" : ""}:*`);
    v.forEach((m, i) => d.para(`[group chat] **${esc(who(m.s))}:** ${esc(m.t)} ${code(`home.ts CHAT_AFTER/${k}#${i}`)}`));
    allLines(v).forEach((o) => EMITTED.add(o));
  }
  EMITTED_EXPORTS.add(`${modByName("home.ts")[0]}::CHAT_AFTER`);
  d.h(3, "Furniture, the fridge, the toilet and the rest");
  for (const dc of exp("home.ts", "DECOR") as any[]) if (dc.look) d.para(`*${esc(dc.name)} (look):* ${esc(dc.look)} ${code(`home.ts DECOR/${dc.id}`)}`);
  d.exp("home.ts", "GOLD_TOILET", "Sitting on the solid gold toilet (one at random)");
  d.exp("home.ts", "KREL_TROPHIES", "Trophy cabinet");
  for (const m of ["openFridge", "homeSlot", "drawDecor", "create", "kreddleTip"]) d.items(extract("HomeScene.ts", { method: m }));
  d.items(extract("HomeScene.ts", { method: "arrive" }));

  d.h(2, "Kreddle (optional visits over the bridge)");
  d.when("Kreddle, over the Kreddle Bridge (far west). The first time you talk to a local:");
  d.exp("kreddle.ts", "WELCOME_SPEECH");
  for (const m of ["arrive", "leave", "talkTo"]) d.items(extract("KreddleScene.ts", { method: m }));
  d.exp("kreddle.ts", "KRUNCHER_BOAST", "Kruncher boast");

  d.h(2, "The Booth: Bully Mikey");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "The Booth." }));
  minigame(d, "bully");

  d.h(2, "Exile (getting banned) and the Ban Tribunal");
  d.items(extract("ExileScene.ts", { method: "create" }));
  d.items(extract("MenuScene.ts", { method: "officer" }));

  d.h(2, "The Historical Archive (optional browsing)");
  d.when("The Archive's exhibits: each has the official version and the original record, replayed.");
  for (const a of exp("historicalScenes.ts", "ARCHIVE") as any[]) {
    d.h(3, `${a.title} (${a.date})`);
    d.para(`*Official version:* ${esc(a.official)}`);
    d.lines(a.original, `historicalScenes.ts ARCHIVE/${a.id}/original`);
    if (a.footnote) d.para(`*Footnote:* ${esc(a.footnote)}`);
    if (a.drongusAnnotation) d.para(`*Drongus's annotation:* ${esc(a.drongusAnnotation)}`);
  }
  EMITTED_EXPORTS.add(`${modByName("historicalScenes.ts")[0]}::ARCHIVE`);
  return d;
}

// ------------------------------------------------------------------ DOCUMENT 3: Drongus

function doc3(): Doc {
  const d = new Doc("3_drongus_statuses", EMITTED);
  d.h(1, "KRELWORLD — Drongus Statuses & Messages");
  d.h(2, "Old Facebook statuses");
  d.when("These pop up in the corner of the screen out in Krelford (from the Emergency Reaction Session on), one at a time from a shuffled deck — the starred ones are dealt twice as often. The same list feeds the laptop's 'On this day in YEAR' message at home, and the dream where Drongus stands at the end of your bed reading one out.");
  const sts = exp("drongusStatuses.ts", "DRONGUS_STATUSES") as any[];
  EMITTED_EXPORTS.add(`${modByName("drongusStatuses.ts")[0]}::DRONGUS_STATUSES`);
  let y = "";
  sts.forEach((s, i) => {
    if (s.y !== y) d.h(3, (y = s.y));
    d.para(`${s.top ? "★ " : ""}**${esc(who("DRONGUS"))}** ${esc(s.t)} ${code(`drongusStatuses.ts #${i}`)}`);
  });
  d.h(3, "How they're framed");
  d.items(extract("UIScene.ts", { method: "create" }));
  d.items(extract("HomeScene.ts", { method: "dream" }));
  d.items(extract("HomeScene.ts", { method: "laptopPanel" }));

  d.h(2, "Drongus's messages (notification pop-ups)");
  d.when("Messenger toasts that fire at set moments. Each fires once per playthrough unless marked 'every time'.");
  const TRIG: Record<string, string> = {
    hub: "arriving in Krelford",
    enter_dungeon: "entering a dungeon",
    boss_defeated: "beating a chapter boss",
    pub: "walking into the Krezz Arms",
    tv: "putting KrelTV on",
    tv_tcc: "watching Thick Cumming Cock episode 7",
    archive: "browsing the Archive",
    banned: "getting banned",
    krazy_fact: "a Krazy Fact being entered into the record",
    idle: "standing about in Krelford",
    react_SEEN: "leaving something on Seen",
    react_LAUGH: "reacting 😂",
    low_hp: "low health in a fight",
  };
  for (const s of exp("drongusMessages.ts", "DRONGUS_SEQUENCES") as any[]) {
    const c = condTxt(s.cond);
    d.h(3, `${s.id}: on ${TRIG[s.trigger] ?? s.trigger}${c ? ` (${c})` : ""}${s.repeat ? " — every time" : ""}`);
    s.messages.forEach((m: string, i: number) => d.para(`[group chat] **${esc(who("DRONGUS"))}:** ${esc(m)} ${code(`drongusMessages.ts ${s.id}#${i}`)}`));
  }
  EMITTED_EXPORTS.add(`${modByName("drongusMessages.ts")[0]}::DRONGUS_SEQUENCES`);

  d.h(2, "When you finally react to his song (the laptop at home)");
  d.when("Each time you react to THE KREZZING HOUR on the laptop, the next set of replies (the last one repeats).");
  (exp("home.ts", "SONG_REPLIES") as string[][]).forEach((set, i) => {
    d.para(`*Reaction ${i + 1}${i === 5 ? "+" : ""}:*`);
    set.forEach((m, j) => d.para(`[group chat] **${esc(who("DRONGUS"))}:** ${esc(m)} ${code(`home.ts SONG_REPLIES[${i}]#${j}`)}`));
  });
  EMITTED_EXPORTS.add(`${modByName("home.ts")[0]}::SONG_REPLIES`);

  d.h(2, "New rules (dungeon rooms with a Drongus rule)");
  for (const r of BAN_RULES as any[]) d.para(`[group chat] **${esc(who("DRONGUS"))}:** ${esc(r.decree)} ${code(`ban.ts BAN_RULES/${r.id}`)}`);

  d.h(2, "Boss-fight banners and fake songs (the old final fight)");
  d.exp("bosses.ts", "DRONGUS_PHASES", "Phase banner");
  d.exp("bosses.ts", "FAKE_SONGS", "Fake songs (hazards demanding reactions)");
  d.para("*(Every other Drongus group-chat message in the story — chapter intros/outros, cutscenes — is in document 1 in its place.)*");
  return d;
}

// ------------------------------------------------------------------ DOCUMENT 4: the Krezz Arms

function doc4(): Doc {
  const d = new Doc("4_krezz_arms", EMITTED);
  d.h(1, "KRELWORLD — The Krezz Arms");
  d.when("Everything that can happen in the pub. Sit at a table to overhear one of the table conversations (picked at random from the ones whose conditions hold; the people at the table have to be in town). Lines marked 'drunk 25+/50+/75+' only play when you've had enough Fizzy Bongos to hear them.");
  d.h(2, "Walking in");
  d.items(extract("HubScene.ts", { method: "enterBuilding", match: "SanMik's magic lamp is on the bar" }));
  d.items(extract("PubScene.ts", { method: "barred" }));
  d.h(2, "Table conversations");
  for (const c of exp("pub.ts", "PUB_CONVERSATIONS") as any[]) {
    d.h(3, c.title);
    const cond = condTxt(c.cond);
    d.para(`*At the table: ${c.seats.map((s: string) => esc(who(s))).join(", ")}${cond ? `. Only ${esc(cond)}` : ""}${c.unlocksArchive ? `. Unlocks Archive exhibit ${esc(c.unlocksArchive)}` : ""}.*`);
    d.lines(c.lines, `pub.ts ${c.id}`);
  }
  EMITTED_EXPORTS.add(`${modByName("pub.ts")[0]}::PUB_CONVERSATIONS`);
  d.h(2, "Short snippets (Kreblis at the bar)");
  for (const c of exp("pub.ts", "PUB_SNIPPETS") as any[]) {
    d.h(3, c.title ?? c.id);
    d.lines(c.lines, `pub.ts ${c.id}`);
  }
  EMITTED_EXPORTS.add(`${modByName("pub.ts")[0]}::PUB_SNIPPETS`);
  d.h(2, "The jukebox");
  d.items(extract("PubScene.ts", { method: "jukebox" }));
  d.h(2, "Pub fight");
  d.items(extract("PubScene.ts", { method: "brawl" }));
  d.h(2, "Nick the menu (Krebon's quest)");
  d.items(extract("PubScene.ts", { method: "readMenu" }));
  for (const m of ["create", "showMenu", "sit", "drink", "toggleTv", "leave"]) if (scene("PubScene.ts").methods.has(m)) d.items(extract("PubScene.ts", { method: m }));
  d.h(2, "Back room: SanMik & SanChz live");
  for (const m of [...scene("VenueScene.ts").methods.keys()]) d.items(extract("VenueScene.ts", { method: m }));
  d.h(2, "Through the curtain: The Wonky Pole");
  d.items(extract("ClubScene.ts", { constName: undefined, method: "create" }));
  for (const m of ["hitDerek", "thrownOut", "privateDance", "wonkOff", "climax"]) d.items(extract("ClubScene.ts", { method: m }));
  for (const [k, v] of scene("ClubScene.ts").consts) if (/Line|say\(|dir\(/.test(v.getText())) d.items(extract("ClubScene.ts", { constName: k }));
  d.h(2, "Drongus, when you walk in");
  const seq = (exp("drongusMessages.ts", "DRONGUS_SEQUENCES") as any[]).find((s) => s.id === "d_pub");
  seq?.messages.forEach((m: string, i: number) => d.para(`[group chat] **${esc(who("DRONGUS"))}:** ${esc(m)} ${code(`drongusMessages.ts d_pub#${i}`)}`));
  d.h(2, "Story and side-quest scenes set in the Krezz Arms (cross-references)");
  const refs: string[] = [];
  for (const a of ARCS) for (const st of a.steps) if (st.at === "PUB") refs.push(`${a.player === "ALL" ? "Side quest" : `${who(a.player)}'s story`} “${a.title}” — ${st.text} (${["arc_krunchers", "arc_polson_fit", "arc_crocodile", "arc_pudding_spy", "arc_hotel_chaz", "arc_50p", "arc_klerble"].includes(a.id) ? "document 1" : "document 2"})`);
  refs.push("Chapter 5: SanMik's magic lamp in the back room (document 1)");
  for (const r of refs) d.para(`- ${esc(r)}`);
  return d;
}

// ------------------------------------------------------------------ appendix: content the game never reaches

function unreachable(d: Doc) {
  d.h(2, "Appendix: written but not currently reachable");
  d.para("*Nothing in the current code plays these (no trigger found). Kept here so they can be edited or cut. Worth double-checking before relying on it.*");
  for (const id of Object.keys(MEETINGS)) if (!MEETING_PLACED.has(id)) meeting(d, id, 3, "No door or flag leads here in the current code.");
  if (!MEETING_PLACED.has("final_reading")) {
    /* covered above */
  }
  d.h(3, "Chapter 7 intro (skipped: the aftermath scene sets the flag that would play it)");
  d.lines(CHAPTERS[6].intro, "chapters.ts CHAPTERS/7/intro");
  for (const p of PLAYABLE) {
    d.para(`*Playing ${esc(who(p))}:*`);
    d.lines(CHAPTERS[6].playerScene[p], `chapters.ts CHAPTERS/7/playerScene/${p}`);
  }
  for (const [id, m] of VIG) if (!VIG_PLACED.has(id)) {
    if (["pudding", "pudding_raid"].includes(id) && ARC_PLACED.has("arc_crongus")) continue;
    if (id === "kreltower_saved") continue;
    vignette(d, id, { level: 3, text: `Cutscene "${id}" (VignetteScene ${m})` });
  }
  const bossesLeft = Object.keys(BOSS_TEXT).filter((b) => !BOSS_PLACED.has(b));
  if (bossesLeft.length) {
    d.h(3, "Boss text with no dungeon room");
    for (const b of bossesLeft) boss(d, b, 4);
  }
  for (const id of Object.keys(DUNGEONS)) if (!DUNGEON_PLACED.has(id) && (DUNGEONS as any)[id].rooms.some((r: any) => r.enterLines?.length || r.props?.some((p: any) => p.lines?.length))) {
    d.h(3, `Dungeon "${id}" (not reached from the story)`);
    dungeon(d, id, 4, { title: "" });
  }
  d.h(3, "Polson & Eden: Cheesegate and the Mork Voice (no dungeon room uses these events)");
  d.exp("polsonEden.ts", "DOMESTICS");
  for (const w of exp("polsonEden.ts", "CHEESE_WITNESSES") as any[]) {
    d.h(4, `Witness: ${w.name ?? w.id}`);
    for (const [k, ls] of Object.entries(w.testimony ?? {})) {
      d.para(`*Testimony (${esc(k)}):*`);
      d.lines(ls as any[], `polsonEden.ts CHEESE_WITNESSES/${w.id}/${k}`);
    }
  }
  for (const a of exp("polsonEden.ts", "CHEESE_ACCUSATIONS") as any[]) {
    d.para(`*Accuse: ${esc(a.label)}${a.correct ? " (correct)" : ""}*`);
    d.lines(a.outcome, `polsonEden.ts CHEESE_ACCUSATIONS/${a.id}`);
  }
  for (const [i, r] of (exp("polsonEden.ts", "MORK_ROUNDS") as any[]).entries()) {
    d.para(`*Mork round ${i + 1}:* ${esc(JSON.stringify({ ...r, lines: undefined, success: undefined, fail: undefined }).slice(0, 300))}`);
    d.value(r, `polsonEden.ts MORK_ROUNDS#${i}`, `${modByName("polsonEden.ts")[0]}::MORK_ROUNDS`);
  }
  for (const n of ["CHEESE_WITNESSES", "CHEESE_ACCUSATIONS", "MORK_ROUNDS"]) EMITTED_EXPORTS.add(`${modByName("polsonEden.ts")[0]}::${n}`);
  for (const m of ["questionWitness", "accuse", "morkVoice", "fragmarPrime", "restoreNetwork"]) {
    d.h(3, `Dungeon scene code: ${m} (its trigger isn't used by any room)`);
    d.items(extract("DungeonScene.ts", { method: m }));
  }
  d.h(3, "The Krazy Fact scene (KrazyFactScene; nothing sets krazy_fact_ready)");
  d.items(extract("KrazyFactScene.ts", { method: "finish" }));
}

// ------------------------------------------------------------------ build

const d1 = doc1();
const d2 = doc2();
const d3 = doc3();
const d4 = doc4();
unreachable(d1);
autofill(d1);


const docs = [d1, d2, d3, d4];
const wc = (md: string) =>
  md
    .replace(/`[^`]*`/g, "")
    .replace(/[#*>\\]/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

// ------------------------------------------------------------------ coverage

const cov: string[] = [];
{
  const byKey = new Map<string, number>();
  for (const [o, r] of REG) {
    if (EMITTED.has(o) || isExcluded(r.key)) continue;
    byKey.set(r.key, (byKey.get(r.key) ?? 0) + 1);
  }
  // string-array / string exports that nothing placed
  const strays: string[] = [];
  for (const [abs, m] of MODS) {
    for (const [n, v] of Object.entries(m)) {
      const key = `${abs}::${n}`;
      if (isExcluded(key) || EMITTED_EXPORTS.has(key) || containsLines(v)) continue;
      if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string")) strays.push(`${rel(abs)} ${n} (${v.length} strings)`);
    }
  }
  cov.push("CONTENT LINES NOT IN ANY DOCUMENT (excluding TV shows, ambient barks, NPC chatter, Kreddle street chat):");
  if (!byKey.size) cov.push("  none");
  for (const [k, n] of [...byKey].sort()) {
    const [abs, ex] = k.split("::");
    cov.push(`  ${rel(abs)} ${ex}: ${n} line(s)`);
    for (const [o, r] of REG) if (r.key === k && !EMITTED.has(o)) cov.push(`      ${r.tag}  ${clean(String((o as any).t || (o as any).canon || ""), 80)}`);
  }
  cov.push("", "STRING LISTS (shouts/signs/captions) NOT IN ANY DOCUMENT:");
  cov.push(...(strays.length ? strays.map((s) => "  " + s) : ["  none"]));
  cov.push("", "AUTO-PLACED BY FILE ORDER (new exports not yet in the play-order map):");
  cov.push(...(AUTOFILLED.length ? AUTOFILLED.map((s) => "  " + s) : ["  none"]));
  // scene code with inline lines that no document used
  const sceneLeft: string[] = [];
  for (const abs of GAME_FILES) {
    const f = scene(rel(abs).replace(/^game\//, ""));
    for (const [name] of f.methods) {
      let n = 0;
      const its = (() => {
        const before = WARN.length;
        const x = extractQuiet(f, name);
        WARN.length = before;
        return x;
      })();
      for (const it of its) if ((it.kind === "line" || it.kind === "screen") && !SCENE_PLACED.has(it.tag)) n++;
      if (n) sceneLeft.push(`  ${rel(abs)} ${name}(): ${n}`);
    }
  }
  cov.push("", "SCENE CODE WITH INLINE TEXT NOT IN ANY DOCUMENT (mostly town flavour / barks / UI — for information):");
  cov.push(...(sceneLeft.length ? sceneLeft : ["  none"]));
  cov.push("", "WARNINGS:");
  cov.push(...(WARN.length ? [...new Set(WARN)].map((w) => "  " + w) : ["  none"]));
}
function extractQuiet(f: SceneFile, name: string): Item[] {
  // a non-expanding read of one method, just for the coverage list
  return extract(rel(f.abs).replace(/^game\//, ""), { method: name, quiet: true });
}

// ------------------------------------------------------------------ write

for (const d of docs) writeFileSync(path.join(OUT, `${d.name}.md`), d.md());
writeFileSync(path.join(OUT, "coverage.txt"), cov.join("\n") + "\n");

/** Word: pandoc with a reference doc whose code style is small grey text (the reference tags). */
function docx() {
  try {
    execFileSync("pandoc", ["--version"], { stdio: "ignore" });
  } catch {
    console.warn("pandoc not found: skipping .docx");
    return;
  }
  const ref = path.join(OUT, ".reference.docx");
  try {
    execFileSync("pandoc", ["-o", ref, "--print-default-data-file", "reference.docx"]);
    const py = `
import sys
from docx import Document
from docx.shared import Pt, RGBColor
d = Document(sys.argv[1])
names = [s.name for s in d.styles]
for n in ("Verbatim Char", "Source Code"):
    if n in names:
        st = d.styles[n]
        st.font.size = Pt(7)
        st.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
        st.font.name = "Calibri"
if "Block Text" in names:
    st = d.styles["Block Text"]
    st.font.size = Pt(10)
    st.font.color.rgb = RGBColor(0x44, 0x44, 0x55)
d.save(sys.argv[1])
`;
    execFileSync("python3", ["-I", "-c", py, ref], { stdio: "pipe" });
  } catch (e) {
    console.warn("couldn't style the reference doc (python-docx missing?); tags will use pandoc's default code style");
  }
  for (const d of docs) {
    execFileSync("pandoc", [path.join(OUT, `${d.name}.md`), "-f", "markdown-smart", "-o", path.join(OUT, `${d.name}.docx`), ...(existsSync(ref) ? ["--reference-doc", ref] : [])]);
  }
}
docx();

console.log(`Script export → ${OUT}`);
for (const d of docs) console.log(`  ${d.name}: ${wc(d.md()).toLocaleString()} words`);
console.log(`  coverage.txt: ${cov.filter((l) => l.startsWith("      ")).length} unplaced content line(s); ${AUTOFILLED.length} auto-placed export(s)`);
if (WARN.length) console.log(`  ${new Set(WARN).size} warning(s): see coverage.txt`);
