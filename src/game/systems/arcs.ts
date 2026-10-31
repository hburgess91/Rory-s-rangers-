import type { GameState } from "../../data/types";
import { ARCS, arcFor, arcsFor, type Arc, type ArcStep } from "../../content/arcs";
import { DUNGEONS } from "../../data/dungeons";

export const stepFlag = (a: Arc, st: ArcStep) => `arcstep_${a.id}_${st.id}`;
export const spotFlag = (a: Arc, st: ArcStep, i: number) => `arcspot_${a.id}_${st.id}_${i}`;

/** Is this step finished? Arena steps finish from the arena flag; collect steps when every item is picked up. */
export function stepDone(s: GameState, a: Arc, st: ArcStep): boolean {
  if (s.flags[stepFlag(a, st)]) return true;
  if (st.step.kind === "arena") {
    const f = DUNGEONS[st.step.dungeon]?.arenaFlag;
    return !!(f && s.flags[f]);
  }
  if (st.step.kind === "collect") return st.step.spots.every((_, i) => s.flags[spotFlag(a, st, i)]);
  return false;
}

export function arcAvailable(s: GameState, a?: Arc): boolean {
  if (!s.flags.met_emergency) return false;
  if (a?.requires && !s.flags[a.requires] && !(a.minChapter && s.chapter > a.minChapter)) return false;
  return !a || s.chapter >= (a.minChapter ?? 1);
}

function stepOf(s: GameState, a: Arc): { arc: Arc; step: ArcStep; index: number } | null {
  if (!arcAvailable(s, a) || s.flags[`${a.id}_done`]) return null;
  const index = a.steps.findIndex((st) => !stepDone(s, a, st));
  if (index < 0) return null;
  return { arc: a, step: a.steps[index], index };
}

/** Current step of every open story for this player. */
export function currentArcSteps(s: GameState) {
  return arcsFor(s.player)
    .map((a) => stepOf(s, a))
    .filter((x): x is { arc: Arc; step: ArcStep; index: number } => !!x);
}

/** The player's own story's current step (first open story if they have none). */
export function currentArcStep(s: GameState) {
  return currentArcSteps(s)[0] ?? null;
}

export function arcStepAt(s: GameState, at: string) {
  return currentArcSteps(s).find((c) => c.step.at === at) ?? null;
}

export function completeStep(s: GameState, a: Arc, st: ArcStep) {
  s.flags[stepFlag(a, st)] = true;
}

/** Pay out every story whose steps are all done. Returns the reward text (once per story). */
export function maybeFinishArc(s: GameState): string | null {
  const out: string[] = [];
  for (const a of arcsFor(s.player)) {
    if (s.flags[`${a.id}_done`]) continue;
    if (!a.steps.every((st) => stepDone(s, a, st))) continue;
    s.flags[`${a.id}_done`] = true;
    s.coins += a.reward.coins;
    out.push(`${a.title} complete: +${a.reward.coins} Krezzcoin. ${a.reward.desc}`);
  }
  return out.length ? out.join(" ") : null;
}

export { ARCS, arcFor, arcsFor };

/** The chapter whose dungeon a side quest must be finished before. Krebon's story (which swaps your character) is never required. */
const DUE: Record<string, number> = {
  arc_wake_polson: 2,
  arc_boggor: 3,
  arc_polson_fit: 3,
  arc_crocodile: 3,
  arc_koeman: 3,
  arc_cronster: 4,
  arc_pudding_spy: 4,
  arc_hotel_chaz: 4,
  arc_kreblis_news: 4,
  arc_flenky_sigma: 4,
  arc_vegas: 5, arc_sanmik: 5,
  arc_50p: 6,
};
export function arcDue(a: Arc): number | null {
  if (a.id === "arc_krebon") return null;
  if (DUE[a.id]) return DUE[a.id];
  return a.player === "ALL" ? Math.max(2, a.minChapter ?? 2) : 2;
}

/** Side quests that must be done before this chapter's dungeon opens, with where each one is up to. */
export function requiredArcSteps(s: GameState) {
  return currentArcSteps(s).filter((c) => {
    const d = arcDue(c.arc);
    return d !== null && d <= s.chapter;
  });
}
