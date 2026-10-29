import type { GameState, ReactionChoice } from "../../data/types";

export interface ReactionEffect {
  resentmentDelta: number;
  buff?: "MORALE" | "CHUFFED" | "SNUBBED" | "SEEN_ZONED";
  toast: string;
}

/**
 * Reactions are political acts in Krelworld. They are not a morality system:
 * every choice is a little bit funny and a little bit consequential.
 */
export const REACTION_EFFECTS: Record<ReactionChoice, ReactionEffect> = {
  LIKE: { resentmentDelta: -2, buff: "CHUFFED", toast: "👍 Acknowledged. Somewhere, a Drongus exhales." },
  LOVE: { resentmentDelta: -1, buff: "MORALE", toast: "❤️ Love sent. Drongus suspects sarcasm." },
  LAUGH: { resentmentDelta: -3, buff: "MORALE", toast: "😂 A laugh! The content has landed!" },
  ANGRY: { resentmentDelta: 2, buff: "SNUBBED", toast: "😡 Angry react logged. A wiki page has been edited about you." },
  SEEN: { resentmentDelta: 4, buff: "SEEN_ZONED", toast: "Seen. Seen by you. Just seen." },
};

export function applyReaction(s: GameState, context: string, choice: ReactionChoice, aboutDrongus = true): ReactionEffect {
  const eff = REACTION_EFFECTS[choice];
  s.reactionsGiven[choice] = (s.reactionsGiven[choice] ?? 0) + 1;
  s.flags[`react_${context}`] = choice;
  if (aboutDrongus) {
    s.drongusResentment = Math.max(0, Math.min(100, s.drongusResentment + eff.resentmentDelta));
  }
  if (eff.buff) s.flags.buff = eff.buff;
  return eff;
}

/** Damage multiplier from the most recent reaction buff. */
export function reactionDamageMult(s: GameState): number {
  switch (s.flags.buff) {
    case "MORALE":
      return 1.1;
    case "CHUFFED":
      return 1.05;
    case "SNUBBED":
      return 1.15; // anger is a fuel
    case "SEEN_ZONED":
      return 0.95;
    default:
      return 1;
  }
}

/** How Drongus's mood reads to the player. Used by HUD flavour and the final boss. */
export function resentmentLabel(r: number): string {
  if (r < 10) return "Briefly Appreciated";
  if (r < 25) return "Mildly Ignored";
  if (r < 45) return "Left On Read";
  if (r < 65) return "Typing... (deleted)";
  if (r < 85) return "Wiki Edit War";
  return "LORE WITHDRAWN";
}
