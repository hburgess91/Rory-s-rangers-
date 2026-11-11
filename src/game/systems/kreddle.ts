import type { GameState } from "../../data/types";
import { PRIZES, PRIZE, type Prize } from "../../content/kreddle";
import { GUNS, gunMax } from "../combat/Guns";

/** Upgrade level for a Kreddle prize key (0 if you've not won it). */
export function kd(s: GameState, key: string): number {
  return s.upgrades?.[key] ?? 0;
}

/** Extra violence is on when you've won it and haven't switched it off. */
export function extraViolence(s: GameState): boolean {
  return kd(s, "kd_violence") > 0 && !s.flags.kd_violence_off;
}

/** Can this prize still do something for you? (Guns can always be won again: it's a refill.) */
export function prizeOpen(s: GameState, p: Prize): boolean {
  if (p.gun) return true;
  return kd(s, p.key!) < (p.max ?? 1);
}

/** A random prize, leaning towards things you don't have yet. */
export function rollPrize(s: GameState, rnd: () => number = Math.random): Prize {
  const pool = PRIZES.filter((p) => prizeOpen(s, p));
  const weight = (p: Prize) => (p.gun ? (s.guns && p.gun in s.guns ? 0.4 : 1.4) : 1);
  const total = pool.reduce((a, p) => a + weight(p), 0);
  let r = rnd() * total;
  for (const p of pool) {
    r -= weight(p);
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

/** Hand over a prize. Returns the line to show. */
export function awardPrize(s: GameState, id: string): string {
  const p = PRIZE[id];
  if (!p) return "";
  if (p.gun) {
    s.guns = s.guns ?? {};
    const had = p.gun in s.guns;
    s.guns[p.gun] = gunMax(GUNS[p.gun], s);
    s.gun = p.gun;
    return had ? `${p.name}: already yours, so it's a full refill.` : `${p.name}: ${p.desc}`;
  }
  const key = p.key!;
  if (!prizeOpen(s, p)) {
    s.coins += 150;
    return `${p.name}: you've maxed it, so the House gives you 150 Krezzcoin instead. Grudgingly.`;
  }
  s.upgrades[key] = kd(s, key) + 1;
  const lvl = s.upgrades[key];
  return `${p.name}${(p.max ?? 1) > 1 ? ` (level ${lvl}/${p.max})` : ""}: ${p.desc}`;
}

// ---- KROKENS: Kreddle's prize tickets, won at the machines, spent at the Prize Counter

export function krokens(s: GameState): number {
  return (s.flags.krokens as number) ?? 0;
}

export function addKrokens(s: GameState, n: number) {
  s.flags.krokens = Math.max(0, krokens(s) + n);
}

/** What a prize costs at the Prize Counter. Guns you already own are just a cheap refill. */
export function krokenPrice(s: GameState, p: Prize): number {
  if (p.gun) return s.guns && p.gun in s.guns ? 10 : 40;
  const base: Record<string, number> = { krezz: 20, gas: 20, violence: 30, gold: 25, tracer: 15, jackpot: 30, super_time: 30, super_aura: 35, armor: 30, krezzlong: 25, sperm: 40, hp: 25, lucky: 20, dice: 30, slotfart: 25 };
  return (base[p.id] ?? 25) + 5 * kd(s, p.key!);
}
