import type { GameState } from "../../data/types";
import { PERSONAL_QUESTS, MINISTRY_QUESTS, type PersonalQuest, type PickupSpot, type MinistryQuest } from "../../content/quests";
import { evalCond } from "./conditions";
import { counter } from "./stats";
import { activeMods } from "../../data/historicalRevisions";

export function personalQuest(s: GameState): PersonalQuest | undefined {
  return PERSONAL_QUESTS.find((q) => q.player === s.player);
}

export const pickupFlag = (q: PersonalQuest, p: PickupSpot) => `qp_${q.id}_${p.id}`;

export function pickupsInDungeon(s: GameState, dungeon: string, room: number): { quest: PersonalQuest; spot: PickupSpot }[] {
  const q = personalQuest(s);
  if (!q || s.flags[`pq_done_${q.id}`]) return [];
  return q.pickups
    .filter((p) => "dungeon" in p.where && p.where.dungeon === dungeon && p.where.room === room)
    .filter((p) => !s.flags[pickupFlag(q, p)] && evalCond(p.cond, s))
    .map((spot) => ({ quest: q, spot }));
}

export function pickupsInHub(s: GameState): { quest: PersonalQuest; spot: PickupSpot; anchor: string }[] {
  const q = personalQuest(s);
  if (!q || s.flags[`pq_done_${q.id}`]) return [];
  return q.pickups
    .filter((p) => "hub" in p.where)
    .filter((p) => !s.flags[pickupFlag(q, p)] && evalCond(p.cond, s))
    .map((spot) => ({ quest: q, spot, anchor: (spot.where as { hub: string }).hub }));
}

export function collectPickup(s: GameState, q: PersonalQuest, p: PickupSpot) {
  s.flags[pickupFlag(q, p)] = true;
}

export function pickupsCollected(s: GameState, q: PersonalQuest): number {
  return q.pickups.filter((p) => s.flags[pickupFlag(q, p)]).length;
}

export function canTurnIn(s: GameState, at: string): PersonalQuest | undefined {
  const q = personalQuest(s);
  if (!q || s.flags[`pq_done_${q.id}`] || q.turnIn.at !== at) return undefined;
  return pickupsCollected(s, q) >= q.pickups.length ? q : undefined;
}

export function completePersonal(s: GameState, q: PersonalQuest): number {
  s.flags[`pq_done_${q.id}`] = true;
  const coins = Math.round(q.reward.coins * activeMods(s).questRewardMult);
  s.coins += coins;
  if (q.reward.upgrade) s.upgrades[q.reward.upgrade] = 1;
  return coins;
}

// ---- ministerial side quests

export function ministryQuestState(s: GameState, q: MinistryQuest): "locked" | "available" | "active" | "ready" | "done" {
  if (!s.flags.ministerial_quests) return "locked";
  if (q.ministry === "FLENKY" && !s.flags.ban_tribunal_open) return "locked";
  const st = s.flags[`mq_${q.id}`];
  if (st === "done") return "done";
  if (st === "active") return ministryProgress(s, q) >= q.target ? "ready" : "active";
  return "available";
}

export function ministryProgress(s: GameState, q: MinistryQuest): number {
  const base = typeof s.flags[`mqb_${q.id}`] === "number" ? (s.flags[`mqb_${q.id}`] as number) : 0;
  return Math.max(0, counter(s, q.counter) - base);
}

export function acceptMinistry(s: GameState, q: MinistryQuest) {
  s.flags[`mq_${q.id}`] = "active";
  s.flags[`mqb_${q.id}`] = counter(s, q.counter);
}

export function completeMinistry(s: GameState, q: MinistryQuest): number {
  s.flags[`mq_${q.id}`] = "done";
  const coins = Math.round(q.reward * activeMods(s).questRewardMult);
  s.coins += coins;
  return coins;
}

export function ministryQuestFor(npc: string, s: GameState): MinistryQuest | undefined {
  // The minister gives their own quest; Proctus gives the player's ministry's quest.
  const ministry = npc === "PROCTUS" ? s.player : npc;
  return MINISTRY_QUESTS.find((q) => q.ministry === ministry);
}

export { PERSONAL_QUESTS, MINISTRY_QUESTS };
