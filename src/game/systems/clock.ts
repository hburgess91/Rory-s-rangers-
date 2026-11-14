// Krelford's own clock: a whole day every 9 minutes of play (4 min day, 1 min dusk, 3 min night, 1 min dawn).
// It starts at morning every time the game loads, so you always start in daylight.

export const DAY_S = 240;
export const DUSK_S = 60;
export const NIGHT_S = 180;
export const DAWN_S = 60;
export const CYCLE_S = DAY_S + DUSK_S + NIGHT_S + DAWN_S;

const t0 = typeof performance !== "undefined" ? performance.now() : 0;
/** A per-load seed so the weather differs from session to session. */
const seed = Math.floor(Math.random() * 100000);

export type Phase = "day" | "dusk" | "night" | "dawn";

export interface ClockState {
  phase: Phase;
  /** 0 = full daylight, 1 = full night */
  dark: number;
  /** 0..1..0 across dusk and dawn: how strongly to tint the sky orange/pink */
  twilight: number;
  /** which in-game day it is (0 = the day you loaded in on) */
  day: number;
}

export function clock(nowMs: number = typeof performance !== "undefined" ? performance.now() : 0): ClockState {
  const secs = Math.max(0, (nowMs - t0) / 1000);
  const day = Math.floor(secs / CYCLE_S);
  const t = secs % CYCLE_S;
  if (t < DAY_S) return { phase: "day", dark: 0, twilight: 0, day };
  if (t < DAY_S + DUSK_S) {
    const f = (t - DAY_S) / DUSK_S;
    return { phase: "dusk", dark: f, twilight: Math.sin(Math.PI * f), day };
  }
  if (t < DAY_S + DUSK_S + NIGHT_S) return { phase: "night", dark: 1, twilight: 0, day };
  const f = (t - DAY_S - DUSK_S - NIGHT_S) / DAWN_S;
  return { phase: "dawn", dark: 1 - f, twilight: Math.sin(Math.PI * f), day };
}

/** Today's weather (rolled once per in-game day). December snows. */
export function weatherFor(day: number, month = new Date().getMonth()): "rain" | "storm" | "snow" | null {
  const x = Math.sin((day + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  const roll = x - Math.floor(x);
  if (month === 11) return roll < 0.6 ? "snow" : null;
  return roll < 0.12 ? "storm" : roll < 0.32 ? "rain" : null;
}
