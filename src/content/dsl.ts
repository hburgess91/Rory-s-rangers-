// Tiny helpers so dialogue content reads like a script.
import type { Line, ReactionChoice, SpeakerId } from "../data/types";
import { CANON } from "./archive/canonQuotes";

type Extra = Partial<Line>;

/** New game dialogue. */
export const say = (s: SpeakerId, t: string, extra: Extra = {}): Line => ({ s, t, tag: "new", ...extra });
/** A verbatim chat line from the canon registry. */
export const canon = (id: string, extra: Extra = {}): Line => {
  const c = CANON[id];
  if (!c) throw new Error(`Unknown canon line ${id}`);
  return { s: c.speaker, t: "", canon: id, tag: "canon", ...extra };
};
/** A chat line lightly reshaped for the scene. */
export const adapt = (s: SpeakerId, t: string, extra: Extra = {}): Line => ({ s, t, tag: "adapted", ...extra });
/** Stage direction. */
export const dir = (t: string, extra: Extra = {}): Line => ({ s: "NARRATOR", t, dir: true, ...extra });
/** Messenger notification pop. */
export const ping = (s: SpeakerId, t: string, extra: Extra = {}): Line => ({ s, t, notify: true, tag: "new", sfx: "notify", ...extra });
/** Reaction prompt beat. */
export const react = (
  message: string,
  context: string,
  outcomes: Partial<Record<ReactionChoice, Line[]>> = {},
  from: SpeakerId = "DRONGUS",
  options?: ReactionChoice[],
): Line => ({ s: "NARRATOR", t: "", react: { message, context, outcomes, from, options } });

/** Gabor the Goat tAaAlKs LiIiKE tHiIIiS. Deterministic, so it reads the same every time. */
export function goat(t: string): string {
  let i = 0;
  return t.replace(/[A-Za-z]/g, (ch) => {
    i++;
    const up = (i * 7 + (i >> 2)) % 3 === 0 || i % 5 === 0;
    const c = up ? ch.toUpperCase() : ch.toLowerCase();
    if ("aeiouAEIOU".includes(ch) && i % 3 !== 1) {
      const flip = c === c.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
      return i % 2 === 0 ? c + flip + c : c + flip;
    }
    return c;
  });
}

/** Gabor speaks. */
export const gabor = (t: string, extra: Extra = {}): Line => say("GABOR THE GOAT", goat(t), extra);
