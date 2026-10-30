import Phaser from "phaser";
import { G } from "../G";
import type { GameState } from "../../data/types";

/** Ranged weapons you find in dungeon crates. Ammo drops from enemies. */
export interface GunDef {
  id: string;
  name: string;
  blurb: string;
  tex: string;
  /** Base damage per pellet (scaled by the player's damage multipliers). */
  dmg: number;
  /** Milliseconds between shots. */
  cd: number;
  speed: number;
  pellets: number;
  spread: number;
  range: number;
  pierce?: number;
  /** Explosion radius on impact or at max range. */
  blast?: number;
  knock?: number;
  color: number;
  shotTex?: string;
  maxAmmo: number;
  /** Ammo in a crate / found box. */
  pickup: number;
  minChapter: number;
}

export const GUNS: Record<string, GunDef> = {
  pistol: {
    id: "pistol", name: "Wonk Pistol", blurb: "Hot pink. Smiley sticker. Legally a toy in three countries.",
    tex: "p_wpn_pistol", dmg: 12, cd: 230, speed: 600, pellets: 1, spread: 0.04, range: 420, color: 0xff6ec7, maxAmmo: 120, pickup: 30, minChapter: 1,
  },
  smg: {
    id: "smg", name: "Crobley Uzi", blurb: "Sprays like Gronny after a Fizzy Bongo.",
    tex: "p_wpn_smg", dmg: 6, cd: 85, speed: 640, pellets: 1, spread: 0.18, range: 360, color: 0xb6ff3b, maxAmmo: 260, pickup: 60, minChapter: 1,
  },
  shotgun: {
    id: "shotgun", name: "Bongo Boomstick", blurb: "Beer can duct-taped on for luck. The luck is the beer.",
    tex: "p_wpn_shotgun", dmg: 8, cd: 680, speed: 560, pellets: 6, spread: 0.55, range: 230, knock: 200, color: 0xffa94d, maxAmmo: 40, pickup: 10, minChapter: 2,
  },
  rail: {
    id: "rail", name: "Wiki Railgun", blurb: "[citation needed] goes straight through people.",
    tex: "p_wpn_rail", dmg: 42, cd: 850, speed: 1300, pellets: 1, spread: 0, range: 760, pierce: 99, knock: 160, color: 0x67e8f9, maxAmmo: 24, pickup: 6, minChapter: 3,
  },
  rocket: {
    id: "rocket", name: "The Marital Aid", blurb: "Fires pink rubber rockets. Vibrates on impact. Then explodes.",
    tex: "p_wpn_rocket", dmg: 34, cd: 1000, speed: 360, pellets: 1, spread: 0, range: 520, blast: 85, knock: 260, color: 0xffffff, shotTex: "fx_rocket", maxAmmo: 12, pickup: 3, minChapter: 4,
  },
};
export const GUN_ORDER = ["pistol", "smg", "shotgun", "rail", "rocket"];

export function ownedGuns(s: GameState = G.s): string[] {
  return GUN_ORDER.filter((id) => s.guns && id in s.guns);
}

export function currentGun(s: GameState = G.s): GunDef | null {
  return s.gun && s.guns && s.gun in s.guns ? GUNS[s.gun] : null;
}

/** Cycle fists -> each owned gun with ammo -> fists. Returns the new label. */
export function cycleGun(s: GameState = G.s): string {
  const list = [null, ...ownedGuns(s).filter((id) => (s.guns![id] ?? 0) > 0)];
  const i = list.indexOf(s.gun ?? null);
  s.gun = list[(i + 1) % list.length] ?? undefined;
  return s.gun ? GUNS[s.gun].name : "FISTS";
}

/** Give a gun the player doesn't have yet (or ammo if they have them all). */
export function rollCrate(s: GameState = G.s): { gun?: GunDef; ammoFor?: GunDef; amount: number } {
  s.guns = s.guns ?? {};
  const missing = GUN_ORDER.filter((id) => !(id in s.guns!) && GUNS[id].minChapter <= s.chapter);
  if (missing.length) {
    // first ever crate is always the pistol
    const id = !ownedGuns(s).length ? "pistol" : missing[Math.floor(Math.random() * missing.length)];
    const g = GUNS[id];
    s.guns[id] = g.pickup * 2;
    s.gun = id;
    return { gun: g, amount: g.pickup * 2 };
  }
  const a = giveAmmo(s, 2);
  return { ammoFor: a?.gun, amount: a?.amount ?? 0 };
}

/** Ammo for a random owned gun (biased to the one in hand). `mult` scales the amount. */
export function giveAmmo(s: GameState = G.s, mult = 1): { gun: GunDef; amount: number } | null {
  const owned = ownedGuns(s).filter((id) => s.guns![id] < GUNS[id].maxAmmo);
  if (!owned.length) return null;
  const id = s.gun && owned.includes(s.gun) && Math.random() < 0.6 ? s.gun : owned[Math.floor(Math.random() * owned.length)];
  const g = GUNS[id];
  const amount = Math.max(1, Math.round(g.pickup * mult));
  s.guns![id] = Math.min(g.maxAmmo, s.guns![id] + amount);
  return { gun: g, amount };
}

/** Scale an image so its longest side is `px` world pixels. */
export function fitTo(img: Phaser.GameObjects.Image, px: number) {
  const f = img.frame;
  img.setDisplaySize((f.width / Math.max(f.width, f.height)) * px, (f.height / Math.max(f.width, f.height)) * px);
  return img;
}
