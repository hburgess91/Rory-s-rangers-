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
  /** Only sold at the Central Bank (never in crates). Price in Krezzcoin. */
  shop?: number;
  /** Only won in Kreddle (never in crates or the bank). */
  kreddle?: boolean;
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
  // ---- Central Bank exclusives
  gatling: {
    id: "gatling", name: "The Gronny Gatling", blurb: "Fair enough. Fair enough. Fair enough. Fair enough.",
    tex: "p_wpn_smg", dmg: 5, cd: 45, speed: 680, pellets: 1, spread: 0.24, range: 380, color: 0xffd23f, maxAmmo: 600, pickup: 150, minChapter: 1, shop: 420,
  },
  sniper: {
    id: "sniper", name: "Polson's Long Lens", blurb: "Originally bought to look at his own house from the other side of town.",
    tex: "p_wpn_rail", dmg: 75, cd: 1100, speed: 1500, pellets: 1, spread: 0, range: 950, pierce: 3, knock: 220, color: 0xf5f5f5, maxAmmo: 24, pickup: 6, minChapter: 1, shop: 480,
  },
  flamer: {
    id: "flamer", name: "Fizzy Bongo Flamethrower", blurb: "It's a bongo. On fire. Pointed at people.",
    tex: "p_wpn_shotgun", dmg: 4, cd: 70, speed: 380, pellets: 4, spread: 0.5, range: 170, color: 0xff7a1a, maxAmmo: 320, pickup: 80, minChapter: 1, shop: 560,
  },
  bfk: {
    id: "bfk", name: "The BFK (Big Fucking Krezzer)", blurb: "Do not fire indoors. Everything in Krelworld is indoors.",
    tex: "p_wpn_rocket", dmg: 95, cd: 1600, speed: 300, pellets: 1, spread: 0, range: 560, blast: 150, knock: 420, color: 0xc084fc, shotTex: "fx_rocket", maxAmmo: 6, pickup: 2, minChapter: 1, shop: 900,
  },
  // ---- Kreddle prizes
  chainsaw: {
    id: "chainsaw", name: "The Kreddle Chainsaw", blurb: "Won on a claw machine. The claw machine is still scared of it.",
    tex: "p_wpn_chainsaw", dmg: 11, cd: 55, speed: 520, pellets: 1, spread: 0.5, range: 70, pierce: 4, knock: 40, color: 0xffa500, maxAmmo: 500, pickup: 120, minChapter: 1, kreddle: true,
  },
  kreddler: {
    id: "kreddler", name: "The Kreddler", blurb: "Gold-plated minigun. Paid for itself in one spin.",
    tex: "p_wpn_minigun", dmg: 6, cd: 32, speed: 720, pellets: 1, spread: 0.2, range: 420, color: 0xffd23f, maxAmmo: 900, pickup: 220, minChapter: 1, kreddle: true,
  },
  disco: {
    id: "disco", name: "Disco Ball Launcher", blurb: "Saturday night fever. Saturday night explosions.",
    tex: "p_wpn_disco", dmg: 40, cd: 900, speed: 340, pellets: 1, spread: 0, range: 520, blast: 120, knock: 300, color: 0xe5e7eb, maxAmmo: 14, pickup: 4, minChapter: 1, kreddle: true,
  },
  flush: {
    id: "flush", name: "The Royal Flush", blurb: "Five cards, all aces, all very sharp.",
    tex: "p_wpn_flush", dmg: 14, cd: 420, speed: 780, pellets: 5, spread: 0.6, range: 480, pierce: 3, color: 0xff3355, maxAmmo: 90, pickup: 25, minChapter: 1, kreddle: true,
  },
};

export const GUN_ORDER = ["pistol", "smg", "shotgun", "rail", "rocket", "gatling", "sniper", "flamer", "bfk", "chainsaw", "kreddler", "disco", "flush"];

/** Strongest first: what you get handed when you walk into a room or run dry. */
export const GUN_POWER = ["bfk", "disco", "kreddler", "rocket", "gatling", "flush", "chainsaw", "sniper", "rail", "flamer", "shotgun", "smg", "pistol"];

/** The infinite starter every character always has (when no gun is in hand). */
export const FART_BLASTER = { name: "Fart Blaster", dmg: 10, cd: 240, speed: 540, range: 400 };

/** The most powerful owned gun that still has ammo, or null (Fart Blaster). */
export function bestLoadedGun(s: GameState = G.s, except?: string): string | null {
  for (const id of GUN_POWER) if (id !== except && s.guns && id in s.guns && (s.guns[id] ?? 0) > 0) return id;
  return null;
}

/** Arm the best gun you have ammo for. Returns its id (or null for the Fart Blaster). */
export function equipBest(s: GameState = G.s): string | null {
  const id = bestLoadedGun(s);
  s.gun = id ?? undefined;
  return id;
}

/** Max ammo after the Bigger Pockets perk. */
export function gunMax(g: GunDef, s: GameState = G.s): number {
  return Math.round(g.maxAmmo * (1 + 0.25 * (s.upgrades?.pk_ammo ?? 0)));
}

export function ownedGuns(s: GameState = G.s): string[] {
  return GUN_ORDER.filter((id) => s.guns && id in s.guns);
}

export function currentGun(s: GameState = G.s): GunDef | null {
  return s.gun && s.guns && s.gun in s.guns ? GUNS[s.gun] : null;
}

/** Out of ammo in `from`: the strongest other gun that still has ammo, or null. */
export function nextLoadedGun(s: GameState = G.s, from?: string): string | null {
  return bestLoadedGun(s, from);
}

/** Cycle strongest loaded gun -> ... -> weakest -> Fart Blaster -> strongest. Returns the new label. */
export function cycleGun(s: GameState = G.s): string {
  const list: (string | null)[] = [...GUN_POWER.filter((id) => s.guns && id in s.guns && (s.guns[id] ?? 0) > 0), null];
  const i = list.indexOf(s.gun ?? null);
  s.gun = list[(i + 1) % list.length] ?? undefined;
  return s.gun ? GUNS[s.gun].name : FART_BLASTER.name;
}

/** Give a gun the player doesn't have yet (or ammo if they have them all). */
export function rollCrate(s: GameState = G.s): { gun?: GunDef; ammoFor?: GunDef; amount: number } {
  s.guns = s.guns ?? {};
  const missing = GUN_ORDER.filter((id) => !(id in s.guns!) && !GUNS[id].shop && !GUNS[id].kreddle && GUNS[id].minChapter <= s.chapter);
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
  const owned = ownedGuns(s).filter((id) => s.guns![id] < gunMax(GUNS[id], s));
  if (!owned.length) return null;
  // goes to whatever is emptiest (so a dry favourite gets fed), with a nudge towards the one in hand
  const frac = (id: string) => s.guns![id] / gunMax(GUNS[id], s) - (id === s.gun ? 0.15 : 0);
  const id = [...owned].sort((a, b) => frac(a) - frac(b))[0];
  const g = GUNS[id];
  const amount = Math.max(1, Math.round(g.pickup * mult));
  const wasEmpty = (s.guns![id] ?? 0) <= 0;
  s.guns![id] = Math.min(gunMax(g, s), s.guns![id] + amount);
  // picked up ammo for something better than what's in hand: arm it
  if (wasEmpty || !s.gun) {
    const cur = s.gun ? GUN_POWER.indexOf(s.gun) : 99;
    if (GUN_POWER.indexOf(id) < cur) s.gun = id;
  }
  return { gun: g, amount };
}

/** Scale an image so its longest side is `px` world pixels. */
export function fitTo(img: Phaser.GameObjects.Image, px: number) {
  const f = img.frame;
  img.setDisplaySize((f.width / Math.max(f.width, f.height)) * px, (f.height / Math.max(f.width, f.height)) * px);
  return img;
}
