import type { GameState as SaveState } from "../../data/types";

/**
 * THE CUM CRYSTALS. Drongus sealed Da Drongus Dungeon with six of them and gave one to each of his best boys:
 * the boss at the end of every main mission carries one.
 */
export const CRYSTAL_BOSSES = ["krandall", "hoard", "machine", "banhammer", "spectre", "krozno"] as const;
export const CRYSTALS_NEEDED = CRYSTAL_BOSSES.length;

/** Which story beat already means you've got a boss's crystal (so older saves aren't short). */
const EARNED_BY: Record<string, string> = { krandall: "ch1_clear", hoard: "ch2_clear", machine: "ch3_clear", banhammer: "ch4_clear", spectre: "ch5_clear", krozno: "kreltower_resolved" };

export function hasCrystal(s: SaveState, boss: string) {
  // Chapter 1's boss used to be the Salmon Sovereign
  return !!s.flags[`crystal_${boss}`] || !!s.flags[EARNED_BY[boss]] || (boss === "krandall" && !!s.flags.crystal_salmon);
}

export function crystalCount(s: SaveState) {
  return CRYSTAL_BOSSES.filter((b) => hasCrystal(s, b)).length;
}

export function carriesCrystal(boss: string) {
  return (CRYSTAL_BOSSES as readonly string[]).includes(boss);
}
