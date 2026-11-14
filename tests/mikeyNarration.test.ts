import { describe, expect, it } from "vitest";
import type { Cond, PlayableId } from "../src/data/types";
import { PLAYABLE_IDS } from "../src/data/types";
import { arcsFor } from "../src/content/arcs";

// Playing as Mikey, the narrator calls him "you". Any stage direction that names Mikey must say what it says
// when YOU are Mikey (a `variants.MIKEY`, or a cond that keeps it away from him), unless it's one of the few
// listed below that are meant to stay third-person (the Archive, the epilogue cards, other lads' own scenes).

const MODULES = import.meta.glob(["../src/content/**/*.ts", "../src/data/dungeons.ts"], { eager: true }) as Record<string, Record<string, unknown>>;

const MIKEY_NAME = /\bMikey\b/;

/** Can the player be Mikey when this cond holds? (Conservative: only player / notPlayer are looked at.) */
function mikeyCan(c: Cond | undefined): boolean {
  if (!c) return true;
  const list = (p: PlayableId | PlayableId[]) => (Array.isArray(p) ? p : [p]);
  if (c.player !== undefined && !list(c.player).includes("MIKEY")) return false;
  if (c.notPlayer !== undefined && list(c.notPlayer).includes("MIKEY")) return false;
  return true;
}

interface Hit { where: string; t: string }

function walk(o: unknown, where: string, out: Hit[], seen: Set<unknown>) {
  if (!o || typeof o !== "object" || seen.has(o)) return;
  seen.add(o);
  if (Array.isArray(o)) {
    o.forEach((x, i) => walk(x, `${where}[${i}]`, out, seen));
    return;
  }
  const r = o as Record<string, unknown>;
  // stories that are another lad's, or hidden from Mikey, never play as Mikey
  if (typeof r.player === "string" && r.player !== "ALL" && r.player !== "MIKEY" && Array.isArray(r.steps)) return;
  if (r.notPlayer === "MIKEY" && Array.isArray(r.steps)) return;
  if (typeof r.t === "string" && typeof r.s === "string") {
    if (!mikeyCan(r.cond as Cond | undefined)) return;
    const narr = r.dir === true || r.s === "NARRATOR";
    const v = r.variants as Record<string, string> | undefined;
    if (narr && MIKEY_NAME.test(r.t) && !(v && v.MIKEY !== undefined)) out.push({ where, t: r.t });
  }
  for (const [k, v] of Object.entries(r)) {
    // per-player blocks (playerScene.FLENKY etc.) only play for that player
    if ((PLAYABLE_IDS as readonly string[]).includes(k) && k !== "MIKEY") continue;
    if (k === "cond" || k === "variants") continue;
    walk(v, `${where}.${k}`, out, seen);
  }
}

describe("playing as Mikey, the narrator says 'you'", () => {
  it("no stage direction names Mikey when you're Mikey", () => {
    const hits: Hit[] = [];
    const seen = new Set<unknown>();
    for (const [file, mod] of Object.entries(MODULES)) {
      if (/archive\/|television\/|krunchers\.ts|beatup\.ts|endings\.ts/.test(file)) continue;
      for (const [name, v] of Object.entries(mod)) {
        // arcs: only what Mikey can actually get
        if (name === "ARCS") walk(arcsFor("MIKEY"), `${file}:arcsFor(MIKEY)`, hits, seen);
        else walk(v, `${file}:${name}`, hits, seen);
      }
    }
    expect(hits.map((h) => `${h.where}: ${h.t}`)).toEqual([]);
  });

  it("Mikey's quest objectives don't call him Mikey", () => {
    const bad: string[] = [];
    for (const a of arcsFor("MIKEY")) {
      for (const st of a.steps) {
        if (MIKEY_NAME.test(st.text)) bad.push(`${a.id}/${st.id}: ${st.text}`);
        if (st.step.kind === "quiz") for (const q of st.step.questions) if (MIKEY_NAME.test(q.q)) bad.push(`${a.id}/${st.id}: ${q.q}`);
      }
      if (MIKEY_NAME.test(a.reward.desc)) bad.push(`${a.id}: ${a.reward.desc}`);
    }
    expect(bad).toEqual([]);
  });
});
