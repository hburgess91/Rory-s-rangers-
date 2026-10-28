// All gameplay numbers live here so they can be tuned without touching systems.
// Units: logical pixels (640x360 view), seconds unless the name ends in Ms.

export const VIEW = { W: 640, H: 360 } as const;

export const MOVE = {
  maxSpeed: 205,
  accel: 2000,
  decel: 2600,
  airControl: 0.8,
  jumpHeight: 80, // full-hold jump apex height (level steps should stay <= 68px)
  apexTime: 0.4, // seconds to reach apex
  fallGravityMult: 1.25, // heavier on the way down -> ~0.76s total airtime
  jumpCutMult: 0.45, // vy multiplier when jump released early
  maxFall: 540,
  coyoteMs: 100,
  bufferMs: 120,
  dropThroughMs: 260,
  hitbox: { w: 16, h: 42 },
  crouchHitboxH: 28,
} as const;

// Derived jump physics: g = 2H/t^2, v0 = 2H/t
export const JUMP_GRAVITY = (2 * MOVE.jumpHeight) / (MOVE.apexTime * MOVE.apexTime);
export const JUMP_VELOCITY = (2 * MOVE.jumpHeight) / MOVE.apexTime;

export const HEALTH = {
  normalHp: 4,
  invulnMs: 900,
  knockbackX: 150,
  knockbackY: -170,
  hitStopMs: 55,
  retryDelayMs: 1300,
} as const;

export const SPECIAL = {
  max: 100,
  durationMs: 8000,
  gainPerKill: 8,
  gainPerHit: 0.9,
  gainPerMeleeHit: 1.6,
  gainPerParry: 12,
  poseGain: 6,
} as const;

export interface GunSpec {
  id: string;
  label: string;
  cooldownMs: number;
  damage: number;
  speed: number;
  spreadDeg: number;
  pellets: number;
  lifeMs: number;
  ammo: number; // -1 = infinite
  texture: string;
  hitbox: number;
  pierce?: boolean;
}

export const SANMIK = {
  mik: { id: 'mik', label: 'MIK BLAST', cooldownMs: 165, damage: 10, speed: 430, spreadDeg: 0, pellets: 1, lifeMs: 520, ammo: -1, texture: 'p_mikwave', hitbox: 10 } as GunSpec,
  mikChargeMs: 900,
  mikCharged: { damage: 70, speed: 300, lifeMs: 900, hitbox: 30 },
  shotgun: { id: 'shotgun', label: 'SHOTGUN', cooldownMs: 520, damage: 11, speed: 520, spreadDeg: 22, pellets: 6, lifeMs: 300, ammo: 18, texture: 'p_pellet', hitbox: 6 } as GunSpec,
  uzi: { id: 'uzi', label: 'UZI', cooldownMs: 70, damage: 6, speed: 560, spreadDeg: 7, pellets: 1, lifeMs: 480, ammo: 160, texture: 'p_bullet', hitbox: 5 } as GunSpec,
  melee: { damage: 18, activeMs: 120, recoverMs: 120, range: 30, height: 26, comboWindowMs: 300 },
  chainsaw: { durationMs: 10000, damage: 7, tickMs: 60, range: 34 },
  bat: { durationMs: 14000, damage: 30, range: 36 },
  pose: { durationMs: 450, cooldownMs: 1200 },
  delusion: { damageMult: 1.6, fireRateMult: 1.6 },
} as const;

export const SANCHZ = {
  doughnut: { id: 'doughnut', label: 'JAM DOUGHNUT', cooldownMs: 210, damage: 13, speed: 330, lift: -170, gravity: 520, lifeMs: 1600, texture: 'p_doughnut', hitbox: 9 },
  bean: { id: 'bean', label: 'BEAN BOMB', cooldownMs: 600, damage: 22, speed: 260, lift: -240, gravity: 620, lifeMs: 2000, ammo: 10, cloudMs: 1400, cloudDps: 40, cloudR: 34 },
  sausage: { id: 'sausage', label: 'SAUSAGE ROLL', cooldownMs: 380, damage: 16, speed: 300, lifeMs: 2600, ammo: 14 },
  strike: [
    { damage: 16, activeMs: 110, recoverMs: 110, range: 38, height: 16, yOff: -30 },
    { damage: 16, activeMs: 120, recoverMs: 110, range: 36, height: 20, yOff: -10 },
    { damage: 28, activeMs: 140, recoverMs: 220, range: 42, height: 32, yOff: -26 },
  ],
  comboWindowMs: 320,
  guard: { windowMs: 240, cooldownMs: 420 },
  fart: { cooldownMs: 2600, durationMs: 1800, dps: 34, radius: 30 },
  sticky: { durationMs: 2000, slow: 0.45, bossBonus: 1.2 },
  crunk: { meleeRangeMult: 1.5, tempoMult: 1.45, trailEveryMs: 160, trailDps: 26 },
} as const;

export const PICKUPS = {
  fastFoodSlipMs: 2600,
  sockArmour: 1,
} as const;

export const BEGOUR = {
  hp: 3000,
  phaseAt: [0.66, 0.33] as const, // fraction of HP remaining where the next phase starts
  contactDamage: 1,
  recoverMs: 650, // gap between attacks in phase 1
  recoverMsP2: 520,
  recoverMsP3: 600,
  slideSpeed: 280,
  heartSpeed: 150,
  beeSpeed: 165,
  tearSpeed: 250,
  pawHp: 110,
  hugCloseMs: 10500,
  // phase-3 hug paws: hitbox must stay well under MOVE.jumpHeight so they can be jumped
  pawScale: 0.5,
  pawHitW: 40,
  pawHitH: 46,
} as const;

export const SCORE = {
  kill: 100,
  bossPhase: 2500,
  bossKill: 10000,
  noHitBonus: 5000,
} as const;
