import type { GameState } from "../../data/types";
import { CHARACTERS } from "../../data/characters";
import { activeMods } from "../../data/historicalRevisions";
import { reactionDamageMult } from "./reactions";

export const GENERIC_UPGRADES = [
  { id: "hp", name: "MAX HP: Vintage Pussy Juice Constitution", desc: "+15 max HP per level", max: 8 },
  { id: "dmg", name: "Resting Wonk Hand", desc: "+8% damage", max: 5 },
  { id: "krezz", name: "Extra Virgin Krezz Tank", desc: "+20 max Krezz", max: 3 },
  { id: "bottles", name: "Bottle Belt", desc: "+1 pussy juice bottle capacity", max: 3 },
] as const;

export function upgradeCost(s: GameState, level: number, base = 80): number {
  const raw = base + level * 70;
  return Math.round(s.player === "KREZMAR" ? raw * 0.9 : raw);
}

export function maxHp(s: GameState): number {
  const def = CHARACTERS[s.player];
  let hp = (def.maxHp ?? 100) + (s.upgrades.hp ?? 0) * 15 + activeMods(s).maxHpDelta;
  if (s.flags.pq_done_pq_krezwonk) hp += 25;
  if (s.flags.pq_done_pq_gronny) hp += 30;
  if (s.upgrades.gr1) hp += 30;
  if (s.ngPlus > 0) hp += 10;
  if (s.flags.arc_gronny_done) hp += 20;
  if (s.flags.arc_krezwonk_done) hp += 15;
  if (s.flags.arc_kreblis_done) hp += 25;
  if (s.flags.arc_cronster_done) hp += 15;
  return Math.max(30, hp);
}

export function maxKrezz(s: GameState): number {
  return 100 + (s.upgrades.krezz ?? 0) * 20;
}

export function maxBottles(s: GameState): number {
  return 3 + (s.upgrades.bottles ?? 0);
}

export function damageMult(s: GameState): number {
  let m = 1 + (s.upgrades.dmg ?? 0) * 0.08;
  m *= activeMods(s).playerDamageMult;
  m *= reactionDamageMult(s);
  if (s.flags.arc_flenky_done) m *= 1.1;
  if (s.flags.arc_krezwonk_done) m *= 1.08;
  return m;
}

/** Enemy scaling: chapters get harder; New Krez+ harder again. */
export function enemyHpMult(s: GameState): number {
  return (1 + (s.chapter - 1) * 0.22) * (s.ngPlus > 0 ? 1.45 : 1);
}

export function enemyDamageMult(s: GameState): number {
  return (1 + (s.chapter - 1) * 0.13) * (s.ngPlus > 0 ? 1.3 : 1) * activeMods(s).enemyDamageMult;
}

export function intoxLabel(v: number): string {
  if (v < 10) return "Sober";
  if (v < 30) return "Tipsy";
  if (v < 55) return "Merry";
  if (v < 80) return "Steaming";
  return "Absolutely Krezzed";
}

export function bump(s: GameState, counter: string, by = 1) {
  const cur = typeof s.flags[`cnt_${counter}`] === "number" ? (s.flags[`cnt_${counter}`] as number) : 0;
  s.flags[`cnt_${counter}`] = cur + by;
}

export function counter(s: GameState, key: string): number {
  const v = s.flags[`cnt_${key}`];
  return typeof v === "number" ? v : 0;
}
