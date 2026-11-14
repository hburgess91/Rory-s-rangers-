import type { GameState } from "../../data/types";

// Playing as Mikey ("Kreblar"). He can become SANMIK (his rapper alter ego) whenever he likes, and in the
// SanMikverse (Chapter 5) he IS SanMik the whole time. Logic only: no Phaser in here, so it can be unit-tested.

export const SANMIK_FLAG = "sanmik_form";

export function isMikey(s: GameState): boolean {
  return s.player === "MIKEY";
}

/** Chapter 5 is the SanMikverse: Mikey is SanMik for all of it (no changing back). */
export function sanmikForced(s: GameState): boolean {
  return isMikey(s) && s.chapter === 5;
}

/** Is the player SanMik right now? */
export function sanmikActive(s: GameState): boolean {
  return isMikey(s) && (sanmikForced(s) || !!s.flags[SANMIK_FLAG]);
}

/** Flip Mikey ⇄ SanMik (remembered in the save). Returns the new form, or null if it can't change right now. */
export function toggleSanmik(s: GameState): boolean | null {
  if (!isMikey(s) || sanmikForced(s)) return null;
  s.flags[SANMIK_FLAG] = !s.flags[SANMIK_FLAG];
  return !!s.flags[SANMIK_FLAG];
}

/** The player's sprite sheet key (`spr_SANMIK` while he's SanMik). */
export function playerSprKey(s: GameState): string {
  return sanmikActive(s) ? "spr_SANMIK" : `spr_${s.player}`;
}

/** Who's on screen as the player: "SANMIK" while he's SanMik, otherwise the player id. */
export function playerFace(s: GameState): string {
  return sanmikActive(s) ? "SANMIK" : s.player;
}

/**
 * The lad who chases you round town wanting to be shoved: Mikey, or Polson when you ARE Mikey.
 * Not in the Polson chapters (2: the Polson Towers intervention, 5: SanChz in the SanMikverse), when he's busy.
 */
export function pursuerId(s: GameState): "MIKEY" | "POLSON" | null {
  if (!isMikey(s)) return "MIKEY";
  if (s.chapter === 2 || s.chapter === 5 || s.flags.polson_dead) return null;
  return "POLSON";
}

/** The Kreddle Krunchers' victim outside Krelburger (Chapter 3): Mikey, or Polson when you're Mikey. */
export function kruncherVictim(s: GameState): "MIKEY" | "POLSON" {
  return isMikey(s) ? "POLSON" : "MIKEY";
}
