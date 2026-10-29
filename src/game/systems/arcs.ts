import type { GameState } from "../../data/types";
import { ARCS, arcFor, type Arc, type ArcStep } from "../../content/arcs";
import { DUNGEONS } from "../../data/dungeons";

export const stepFlag = (a: Arc, st: ArcStep) => `arcstep_${a.id}_${st.id}`;

/** Is this step finished? Arena steps finish when their arena flag is set by the fight. */
export function stepDone(s: GameState, a: Arc, st: ArcStep): boolean {
  if (s.flags[stepFlag(a, st)]) return true;
  if (st.step.kind === "arena") {
    const f = DUNGEONS[st.step.dungeon]?.arenaFlag;
    return !!(f && s.flags[f]);
  }
  return false;
}

export function arcAvailable(s: GameState): boolean {
  return !!s.flags.met_emergency;
}

export function currentArcStep(s: GameState): { arc: Arc; step: ArcStep; index: number } | null {
  const a = arcFor(s.player);
  if (!a || !arcAvailable(s) || s.flags[`${a.id}_done`]) return null;
  const index = a.steps.findIndex((st) => !stepDone(s, a, st));
  if (index < 0) return null;
  return { arc: a, step: a.steps[index], index };
}

export function arcStepAt(s: GameState, at: string) {
  const c = currentArcStep(s);
  return c && c.step.at === at ? c : null;
}

export function completeStep(s: GameState, a: Arc, st: ArcStep) {
  s.flags[stepFlag(a, st)] = true;
}

/** If every step is done, pay out and mark the arc complete. Returns the reward text once. */
export function maybeFinishArc(s: GameState): string | null {
  const a = arcFor(s.player);
  if (!a || s.flags[`${a.id}_done`]) return null;
  if (!a.steps.every((st) => stepDone(s, a, st))) return null;
  s.flags[`${a.id}_done`] = true;
  s.coins += a.reward.coins;
  return `${a.title} complete: +${a.reward.coins} Krezzcoin. ${a.reward.desc}`;
}

export { ARCS, arcFor };
