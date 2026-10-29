import type { Cond, GameState, PlayableId } from "../../data/types";

const asList = (p: PlayableId | PlayableId[]) => (Array.isArray(p) ? p : [p]);

export function evalCond(c: Cond | undefined, s: GameState): boolean {
  if (!c) return true;
  if (c.flag !== undefined && !s.flags[c.flag]) return false;
  if (c.flagEq !== undefined && s.flags[c.flagEq[0]] !== c.flagEq[1]) return false;
  if (c.notFlag !== undefined && s.flags[c.notFlag]) return false;
  if (c.chapter !== undefined && s.chapter !== c.chapter) return false;
  if (c.chapterAtLeast !== undefined && s.chapter < c.chapterAtLeast) return false;
  if (c.chapterAtMost !== undefined && s.chapter > c.chapterAtMost) return false;
  if (c.player !== undefined && !asList(c.player).includes(s.player)) return false;
  if (c.notPlayer !== undefined && asList(c.notPlayer).includes(s.player)) return false;
  if (c.revision !== undefined && !s.revisions.includes(c.revision)) return false;
  if (c.notRevision !== undefined && s.revisions.includes(c.notRevision)) return false;
  if (c.intoxAtLeast !== undefined && s.intoxication < c.intoxAtLeast) return false;
  if (c.intoxBelow !== undefined && s.intoxication >= c.intoxBelow) return false;
  if (c.resentmentAtLeast !== undefined && s.drongusResentment < c.resentmentAtLeast) return false;
  if (c.ngPlus !== undefined && (s.ngPlus > 0) !== c.ngPlus) return false;
  if (c.any !== undefined && !c.any.some((x) => evalCond(x, s))) return false;
  if (c.not !== undefined && evalCond(c.not, s)) return false;
  return true;
}

/** Pick a random element among those whose condition holds. */
export function pickWhere<T extends { cond?: Cond }>(items: T[], s: GameState, rnd: () => number = Math.random): T | undefined {
  const ok = items.filter((i) => evalCond(i.cond, s));
  if (!ok.length) return undefined;
  return ok[Math.floor(rnd() * ok.length)];
}
